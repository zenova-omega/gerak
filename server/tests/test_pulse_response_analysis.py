import importlib
import json
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.database import Base
from app.models.pulse import WatchTopic, SourceItem
from app.models.pulse_sentiment import SentimentLane


@pytest.fixture
async def store(tmp_path):
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/response.db')
    # Import only once implementation exists so RED is an explicit missing-feature assertion.
    try:
        importlib.import_module('app.models.pulse_response_analysis')
    except ModuleNotFoundError:
        pass
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='t', label='Usulan kenaikan pajak', query='pajak'))
        await db.flush()
        db.add(SourceItem(id='p', topic_id='t', source='xpoz', platform='x', url='https://x/p',
                          text='Saya menolak kenaikan pajak', published_at=datetime(2026,11,9,17),
                          metrics={'likes':12, 'comment_snapshot':{'items':[
                              {'id':'c','text':'Bagus, saya setuju kenaikan pajak'},
                              {'id':'empty','text':None}]}}))
        await db.commit()
    yield factory
    await engine.dispose()


def service():
    assert importlib.util.find_spec('app.services.pulse_response_analysis'), 'durable response analysis service missing'
    return importlib.import_module('app.services.pulse_response_analysis')


class LocalAI:
    model = 'installed-test-model'

    async def generate_text(self, content, **kwargs):
        return json.dumps({'target_is_issue':True,'sentiment':{'label':'positive','confidence':0.9,'reason':'Nada positif'},
                           'stance':{'label':'supports','confidence':0.9,'reason':'Persetujuan eksplisit'}})


async def test_available_comments_first_separate_and_durable_no_metrics_loss(store):
    s = service()
    assert await s.run_one(store, LocalAI()) == 'done'
    async with store() as db:
        data = await s.results(db, 't')
        assert data['posts'][0]['stance'] is None
        comments = data['posts'][0]['comments']
        assert comments[0]['sentiment']['label'] == 'positive'
        assert comments[0]['stance']['label'] == 'supports'
        assert comments[1]['status'] == 'skipped'
        assert comments[1]['sentiment'] is None
        assert data['progress']['comments']['total'] == 2
        assert (await db.get(SourceItem,'p')).metrics['likes'] == 12
    assert await s.run_one(store, LocalAI()) == 'done'
    async with store() as db:
        assert (await s.results(db,'t'))['posts'][0]['stance']['label'] == 'supports'


async def test_hash_invalidation_and_wib_filter(store):
    s = service()
    await s.run_one(store, LocalAI())
    async with store() as db:
        before = (await s.results(db,'t'))['posts'][0]['comments'][0]
        topic = await db.get(WatchTopic,'t'); topic.label = 'GERAK'
        await db.commit()
        data = await s.results(db,'t', from_date='2026-11-10', to_date='2026-11-10', platform='x')
        comment = data['posts'][0]['comments'][0]
        assert not comment['fresh'] and comment['stance'] is None
        assert comment['content_target_hash'] != before['content_target_hash']
        assert data['target'] == 'GERAK'
        assert (await s.results(db,'t',to_date='2026-11-09'))['posts'] == []
        assert (await s.results(db,'t',platform='youtube'))['posts'] == []
    await s.run_one(store, LocalAI())
    await s.run_one(store, LocalAI())
    async with store() as db:
        stance = (await s.results(db,'t'))['posts'][0]['comments'][0]['stance']
        assert stance['label'] == 'unclear' and stance['review_needed'] is False   # no side to take is an answer, not a doubt


async def test_shared_lane_and_fencing(store):
    s = service()
    async with store() as db:
        db.add(SentimentLane(id='local',lease_token='other',lease_until=datetime.utcnow()+timedelta(seconds=150)))
        await db.commit()
    assert await s.run_one(store, LocalAI()) == 'idle'
    async with store() as db:
        await db.execute(update(SentimentLane).values(lease_until=None))
        await db.commit()
    class Stolen(LocalAI):
        async def generate_text(self,*args,**kwargs):
            async with store() as db:
                await db.execute(update(SentimentLane).values(lease_token='replacement'))
                await db.commit()
            return await super().generate_text(*args,**kwargs)
    assert await s.run_one(store, Stolen()) == 'expired'
    async with store() as db:
        assert (await s.results(db,'t'))['posts'][0]['comments'][0]['sentiment'] is None


async def test_invalid_output_bounded_retries_never_neutral(store):
    s = service()
    class Bad(LocalAI):
        async def generate_text(self,*args,**kwargs): return '{}'
    model = importlib.import_module('app.models.pulse_response_analysis').ResponseAnalysisJob
    for _ in range(6):
        assert await s.run_one(store, Bad()) == 'failed'
        async with store() as db:
            # Skip the back-off of jobs still waiting. A job that has given up keeps its time: only a real rest
            # (pulse_analysis_retry) returns it to the queue, so within one rest period the attempts stay bounded.
            await db.execute(update(model).where(model.status=='pending').values(available_at=datetime(2000,1,1)))
            await db.commit()
    assert await s.run_one(store, Bad()) == 'idle'
    async with store() as db:
        data = await s.results(db,'t')
        assert data['progress']['comments']['failed'] == 1
        assert data['posts'][0]['comments'][0]['sentiment'] is None


async def test_authenticated_read_contract_and_disabled_tick(store, monkeypatch):
    from fastapi import FastAPI
    from httpx import AsyncClient, ASGITransport
    from app.database import get_db
    from app.middleware.auth import create_access_token
    from app.models import User
    from app.config import get_settings
    router = importlib.import_module('app.routers.pulse_response_analysis').router
    app = FastAPI()
    app.include_router(router,prefix='/api/admin/pulse/response-analysis')
    async def override():
        async with store() as db: yield db
    app.dependency_overrides[get_db]=override
    async with store() as db:
        db.add(User(id='admin',nrp='response-admin',name='Admin',password_hash='unused',role='admin',account_type='prajurit'))
        await db.commit()
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        url='/api/admin/pulse/response-analysis?topic_id=t'
        assert (await client.get(url)).status_code in (401,403)
        headers={'Authorization':f'Bearer {create_access_token("admin","admin")}'}
        response=await client.get(url,headers=headers)
        assert response.status_code==200
        data=response.json()
        assert data['progress']['pending']==2
        assert data['progress']['skipped']==1
        assert data['posts'][0]['stance'] is None
        assert (await client.get(url+'&from=2026-11-12&to=2026-11-10',headers=headers)).status_code==422
        assert (await client.get(url+'&from=bad',headers=headers)).status_code==422
    monkeypatch.setattr(get_settings(),'AI_PROVIDER','claude')
    assert await service().response_tick()=='disabled'


async def test_change_during_inference_is_not_published(store):
    s=service()
    class Edited(LocalAI):
        async def generate_text(self,*args,**kwargs):
            async with store() as db:
                post=await db.get(SourceItem,'p')
                post.metrics={**post.metrics,'comment_snapshot':{'items':[{'id':'c','text':'Saya menolak'}]}}
                await db.commit()
            return await super().generate_text(*args,**kwargs)
    assert await s.run_one(store,Edited())=='stale'
    async with store() as db:
        comment=(await s.results(db,'t'))['posts'][0]['comments'][0]
        assert comment['sentiment'] is None and not comment['fresh']


async def test_expired_job_recovered_and_removed_comment_not_counted(store):
    s=service()
    async with store() as db:
        picked=await s.claim(db,datetime.utcnow())
        await db.commit()
    model=importlib.import_module('app.models.pulse_response_analysis').ResponseAnalysisJob
    async with store() as db:
        await db.execute(update(SentimentLane).values(lease_until=datetime(2000,1,1)))
        await db.execute(update(model).where(model.id==picked[0]).values(lease_until=datetime(2000,1,1)))
        await db.commit()
    assert await s.run_one(store,LocalAI())=='done'
    assert await s.run_one(store,LocalAI())=='done'
    async with store() as db:
        item=await db.get(SourceItem,'p'); item.metrics={'likes':12}
        await db.commit()
        data=await s.results(db,'t')
        assert data['coverage']['available_comments']==0
        assert data['posts'][0]['comments']==[]


@pytest.mark.parametrize('flag',[None, 'false', 0])
async def test_incomplete_target_validation_rejected(flag):
    s=service()
    data=json.loads(await LocalAI().generate_text('text'))
    if flag is None: data.pop('target_is_issue')
    else: data['target_is_issue']=flag
    with pytest.raises(ValueError):
        s.parse_result(json.dumps(data),'comment','Usulan kenaikan pajak')


async def test_discovery_pages_rotate_and_reads_do_not_enqueue(store):
    s=service()
    models=importlib.import_module('app.models.pulse_response_analysis')
    async with store() as db:
        for index in range(3):
            db.add(SourceItem(id=f'p{index}',topic_id='t',source='rss',url=f'https://news/{index}',text='Berita'))
        await db.commit()
        await s.results(db,'t')
        assert (await db.execute(select(models.ResponseAnalysisJob))).scalars().all()==[]
        assert (await db.execute(select(models.ResponseAnalysisCursor))).scalars().all()==[]
        await s.enqueue_missing(db,limit=2)
        assert (await db.get(models.ResponseAnalysisCursor,'local')).offset==2
        await db.commit()
    async with store() as db:
        await s.enqueue_missing(db,limit=2)
        await s.enqueue_missing(db,limit=2)
        assert (await db.get(models.ResponseAnalysisCursor,'local')).offset==0
        jobs=(await db.execute(select(models.ResponseAnalysisJob))).scalars().all()
        assert len(jobs)==6
        await db.commit()


def test_response_dates_are_whole_days_of_the_installation_zone(monkeypatch):
    from app.services import pulse_measures
    from app.services.pulse_response_analysis import date_bound
    monkeypatch.setattr(pulse_measures, 'zone', lambda: (540, 'WIT'))
    assert date_bound('2026-11-11') == datetime(2026, 11, 10, 15)
    assert date_bound('2026-11-11', True) == datetime(2026, 11, 11, 15), 'the end is the next local midnight, exclusive'
    assert date_bound(None) is None
