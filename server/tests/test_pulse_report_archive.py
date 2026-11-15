import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.database import Base, get_db
from app.models.pulse import WatchTopic, SourceItem
from app.pulse_main import app
from app.services.pulse_identity import provision_user, new_session

@pytest.fixture
async def archive_env(request):
    engine=create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory=async_sessionmaker(engine,expire_on_commit=False)
    async with factory() as db:
        db.add_all([WatchTopic(id='a',label='Project A',query='alpha'),WatchTopic(id='b',label='B',query='beta')])
        await db.flush()
        db.add(SourceItem(id='p',topic_id='a',source='rss',platform='news',url='https://example.test/p'))
        owner=await provision_user(db,'archive@example.test','Owner','secure archive password',getattr(request,'param','owner'))
        token,session=await new_session(db,owner)
        await db.commit()
    async def override():
        async with factory() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise
    app.dependency_overrides[get_db]=override
    async with AsyncClient(transport=ASGITransport(app),base_url='https://localhost') as client:
        client.cookies.set('pulse_session',token)
        yield client,{'Origin':'http://localhost:5173','X-Pulse-CSRF':session.csrf}
    app.dependency_overrides.pop(get_db,None)
    await engine.dispose()

def payload():
    return {'topic_id':'a','title':'Report A','snapshot':{'topic':{'id':'a','label':'Project A','query':'alpha'},'period':{'from':'2026-11-01','to':'2026-11-13'},'selectedPlatforms':['news'],'generatedAt':'2026-11-13T00:00:00Z','posts':[{'id':'p','platform':'news','published_at':'2026-11-02T00:00:00Z','text':'Original caption','metrics':{}}],'responseAnalysis':{'loaded':True,'error':False,'response':None}}}

@pytest.mark.asyncio
async def test_archive_survives_requests_and_is_project_scoped(archive_env):
    client,headers=archive_env
    created=await client.post('/api/admin/pulse/reports',headers=headers,json=payload())
    assert created.status_code==201,created.text
    ident=created.json()['id']
    listing=(await client.get('/api/admin/pulse/reports?topic_id=a')).json()
    assert listing['total']==1
    assert 'snapshot' not in listing['items'][0]
    saved=await client.get(f'/api/admin/pulse/reports/{ident}?topic_id=a')
    assert saved.json()['snapshot']['posts'][0]['text']=='Original caption'
    assert saved.json()['version']==1
    assert (await client.get(f'/api/admin/pulse/reports/{ident}?topic_id=b')).status_code==404
    assert (await client.put(f'/api/admin/pulse/reports/{ident}',headers=headers,json=payload())).status_code==405

@pytest.mark.asyncio
async def test_archive_requires_session_and_csrf(archive_env):
    client,_=archive_env
    assert (await client.post('/api/admin/pulse/reports',json=payload())).status_code==403
    client.cookies.clear()
    assert (await client.get('/api/admin/pulse/reports?topic_id=a')).status_code==401

@pytest.mark.asyncio
@pytest.mark.parametrize('case',['topic','foreign_post','scope','dates','incomplete'])
async def test_archive_rejects_invalid_scope(archive_env,case):
    client,headers=archive_env
    body=payload()
    if case=='topic':body['snapshot']['topic']['id']='b'
    if case=='foreign_post':body['snapshot']['posts'][0]['id']='missing'
    if case=='scope':body['snapshot']['selectedPlatforms']=['x']
    if case=='dates':body['snapshot']['period']['from']='2026-12-01'
    if case=='incomplete':body['snapshot']['responseAnalysis']['loaded']=False
    assert (await client.post('/api/admin/pulse/reports',headers=headers,json=body)).status_code==422

@pytest.mark.asyncio
@pytest.mark.parametrize('archive_env',['analyst','viewer'],indirect=True)
async def test_archive_role_access(archive_env,request):
    client,headers=archive_env
    response=await client.post('/api/admin/pulse/reports',headers=headers,json=payload())
    assert response.status_code==(201 if request.node.callspec.params['archive_env']=='analyst' else 403)

@pytest.mark.asyncio
@pytest.mark.parametrize('case',['comment_items','response_comments','response_id','period_filter'])
async def test_archive_rejects_malformed_nested_render_inputs(archive_env,case):
    client,headers=archive_env
    body=payload();s=body['snapshot']
    if case=='comment_items':s['posts'][0]['metrics']={'comment_snapshot':{'items':{}}}
    if case=='response_comments':s['responseAnalysis']['response']={'posts':[{'post_id':'p','comments':{}}]}
    if case=='response_id':s['responseAnalysis']['response']={'posts':[{'post_id':['p']}]}
    if case=='period_filter':s['period']['query']='silently hides every post'
    assert (await client.post('/api/admin/pulse/reports',headers=headers,json=body)).status_code==422

@pytest.mark.asyncio
async def test_archive_period_check_uses_days_of_the_installation_zone(archive_env,monkeypatch):
    from app.services import pulse_measures
    monkeypatch.setattr(pulse_measures,'zone',lambda:(540,'WIT'))
    client,headers=archive_env
    body=payload()
    body['snapshot']['posts'][0]['published_at']='2026-11-13T15:30:00Z'   # 00.30 WIT on 14 Nov, after the period
    assert (await client.post('/api/admin/pulse/reports',headers=headers,json=body)).status_code==422
    body['snapshot']['posts'][0]['published_at']='2026-11-13T14:30:00+0000'
    assert (await client.post('/api/admin/pulse/reports',headers=headers,json=body)).status_code==201
