from datetime import datetime, timedelta
import pytest
from sqlalchemy import select
from app.models.pulse import WatchTopic, SourceItem
from app.services.pulse import ingest_items
from app.services import pulse_monitor as monitor

NOW = datetime(2026, 11, 11, 1)

@pytest.mark.asyncio
async def test_social_schedules_share_xpoz_lane_budget_and_block(db):
    _, first = await configured(db, provider='xpoz', limit=2)
    first.provider='instagram'
    db.add(monitor.MonitorSchedule(id='tt-schedule',topic_id=first.topic_id,provider='tiktok',enabled=True,next_run_at=NOW))
    await db.flush(); await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'xpoz',NOW)
    assert job is not None, 'Xpoz worker must claim Instagram/TikTok jobs'
    assert job.provider in ('instagram','tiktok')
    assert await monitor.claim_job(db,'xpoz',NOW) is None
    await monitor.finish_job(db,job,{'items':[]},NOW)
    second=await monitor.claim_job(db,'xpoz',NOW)
    assert second is not None and second.provider!=job.provider
    await monitor.finish_job(db,second,{'error':'rate_limited'},NOW)
    policy=await db.get(monitor.WorkerPolicy,'xpoz',populate_existing=True)
    assert policy.blocked_reason=='rate_limited' and policy.lease_token is None
    assert (await db.get(monitor.WorkerUsage,'xpoz:2026-11-11')).used==2
    assert await db.get(monitor.WorkerPolicy,'instagram') is None

@pytest.mark.asyncio
async def test_social_schedule_api_uses_existing_global_budget(db,client,admin_token):
    topic,_=await configured(db,provider='xpoz',limit=4)
    h={'Authorization':f'Bearer {admin_token}'}
    response=await client.put(f'/api/admin/pulse/monitor/topics/{topic.id}/instagram',headers=h,json={'enabled':True,'interval_minutes':1440})
    assert response.status_code==200
    assert response.json()['enabled'] is True
    assert (await db.get(monitor.WorkerPolicy,'xpoz')).daily_limit==4

@pytest.mark.asyncio
async def test_attribution_counts_retries_and_manual_social_in_same_cap(db,client,admin_token):
    from app.services.pulse_sources import reserve_collection, finish_collection, CollectionBlocked
    now=datetime.utcnow()
    topic,schedule=await configured(db,provider='xpoz',limit=3)
    schedule.provider='instagram'; schedule.next_run_at=now
    await db.flush(); await monitor.enqueue_due(db,now)
    job=await monitor.claim_job(db,'xpoz',now)
    await monitor.finish_job(db,job,{'error':'timeout'},now)
    job=await monitor.claim_job(db,'xpoz',now+timedelta(minutes=2))
    await monitor.finish_job(db,job,{'items':[]},now+timedelta(minutes=2))
    manual=await reserve_collection(db,topic.id,'tiktok',now+timedelta(minutes=3))
    await finish_collection(db,manual,{'items':[]},now+timedelta(minutes=3))
    with pytest.raises(CollectionBlocked,match='daily_limit'):
        await reserve_collection(db,topic.id,'instagram',now+timedelta(minutes=4))
    await db.flush()
    h={'Authorization':f'Bearer {admin_token}'}
    state=(await client.get('/api/admin/pulse/monitor?topic_id=another-topic',headers=h)).json()
    assert sum(r['used'] for r in state['quota_breakdown'])==3
    assert {(r['platform'],r['mode'],r['used']) for r in state['quota_breakdown']}=={('instagram','automatic',2),('tiktok','manual',1)}
    assert state['quota_unattributed']['xpoz']==0
    # Coverage must show the automatic Instagram attempt separately from manual TikTok.
    from app.services.pulse_sources import coverage
    from app.config import get_settings
    sources=(await coverage(db,get_settings(),topic.id))['sources']
    ig=next(s for s in sources if s['platform']=='instagram')
    assert ig['recurring_enabled'] and ig['last_attempt']['status']=='succeeded'
    assert not next(s for s in sources if s['platform']=='x')['recurring_enabled']

@pytest.mark.asyncio
async def test_fetch_social_uses_xpoz_credentials_and_bounded_limit(monkeypatch):
    from types import SimpleNamespace
    from app.services.ingest import xpoz
    calls=[]
    async def fake(query,key,platform,limit):
        calls.append((query,key,platform,limit)); return []
    monkeypatch.setattr(xpoz,'fetch_xpoz_social_items',fake)
    settings=SimpleNamespace(XPOZ_API_KEY='test-key')
    assert await monitor.fetch_provider('instagram','Gibran',settings)=={'items':[]}
    assert await monitor.fetch_provider('tiktok','Gibran',settings)=={'items':[]}
    assert calls==[('Gibran','test-key','instagram',300),('Gibran','test-key','tiktok',300)]  # one call returns up to 300 rows

@pytest.mark.asyncio
async def test_raw_snapshots_append_without_carrying_missing_metrics(db):
    assert hasattr(monitor, 'MetricSnapshot')
    topic=WatchTopic(id='snapshot-test',label='T',query='T'); db.add(topic); await db.flush()
    raw={'source':'xpoz','platform':'x','url':'https://x.com/i/status/1','author':'A','text':'Example','metrics':{'likes':10,'views':100}}
    await ingest_items(db,topic,[raw])
    await ingest_items(db,topic,[{**raw,'metrics':{'likes':12}}])
    rows=(await db.execute(select(monitor.MetricSnapshot).order_by(monitor.MetricSnapshot.observed_at))).scalars().all()
    assert len(rows)==2
    assert rows[0].metrics['views']==100
    assert rows[1].metrics['likes']==12
    assert rows[1].metrics['views'] is None

async def configured(db, provider='rss', limit=2):
    await monitor.ensure_policies(db)
    topic=WatchTopic(id='queued-topic',label='Test',query='test',is_active=False)
    db.add(topic); await db.flush()
    policy=await db.get(monitor.WorkerPolicy,provider); policy.daily_limit=limit
    schedule=monitor.MonitorSchedule(id='schedule',topic_id=topic.id,provider=provider,enabled=True,interval_minutes=30,next_run_at=NOW)
    db.add(schedule); await db.flush()
    return topic,schedule

@pytest.mark.asyncio
async def test_enqueue_idempotent_claim_exclusive_and_quota_reserved(db):
    assert hasattr(monitor,'enqueue_due')
    _,schedule=await configured(db)
    await monitor.enqueue_due(db,NOW); await monitor.enqueue_due(db,NOW)
    jobs=(await db.execute(select(monitor.CrawlJob))).scalars().all()
    assert len(jobs)==1
    job=await monitor.claim_job(db,'rss',NOW)
    assert job.status=='running' and job.attempts==1
    assert await monitor.claim_job(db,'rss',NOW) is None
    usage=(await db.execute(select(monitor.WorkerUsage))).scalar_one()
    assert usage.used==1
    assert schedule.next_run_at==NOW+timedelta(minutes=30)

@pytest.mark.asyncio
async def test_zero_budget_and_disabled_schedule_do_not_run(db):
    assert hasattr(monitor,'claim_job')
    _,schedule=await configured(db,limit=0)
    await monitor.enqueue_due(db,NOW)
    assert await monitor.claim_job(db,'rss',NOW) is None
    policy=await db.get(monitor.WorkerPolicy,'rss'); policy.daily_limit=2
    schedule.enabled=False; await db.flush()
    assert await monitor.claim_job(db,'rss',NOW) is None

@pytest.mark.asyncio
async def test_expired_lease_is_interrupted_not_replayed_free(db):
    assert hasattr(monitor,'recover_expired')
    await configured(db)
    await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'rss',NOW)
    await monitor.recover_expired(db,NOW+timedelta(minutes=4))
    await db.refresh(job)
    assert job.status=='interrupted'
    assert (await db.execute(select(monitor.WorkerUsage))).scalar_one().used==1

@pytest.mark.asyncio
async def test_retry_consumes_new_reservation_and_stops_at_limit(db):
    assert hasattr(monitor,'finish_job')
    await configured(db,limit=1); await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'rss',NOW)
    await monitor.finish_job(db,job,{'error':'timeout'},NOW)
    assert job.status=='retry'
    assert job.available_at>NOW
    assert await monitor.claim_job(db,'rss',NOW+timedelta(minutes=10)) is None

@pytest.mark.asyncio
async def test_first_run_and_old_backfill_do_not_alert(db):
    assert hasattr(monitor,'finish_job')
    topic,schedule=await configured(db); await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'rss',NOW)
    rows=[{'source':'rss','platform':'news','url':f'https://example.com/{i}','author':f'A{i}','title':'Same viral headline sample','text':'Same viral headline sample','published_at':NOW-timedelta(minutes=10)} for i in range(6)]
    await monitor.finish_job(db,job,{'items':rows},NOW)
    assert not (await db.execute(select(monitor.PulseAlert))).scalars().all()
    schedule.next_run_at=NOW+timedelta(minutes=31); await db.flush()
    await monitor.enqueue_due(db,NOW+timedelta(minutes=31)); job=await monitor.claim_job(db,'rss',NOW+timedelta(minutes=31))
    old=[{**r,'url':r['url']+'old','published_at':NOW-timedelta(days=3)} for r in rows]
    await monitor.finish_job(db,job,{'items':old},NOW+timedelta(minutes=31))
    assert not (await db.execute(select(monitor.PulseAlert))).scalars().all()

@pytest.mark.asyncio
async def test_recent_multi_author_issue_alert_has_evidence_and_dedup(db):
    assert hasattr(monitor,'finish_job')
    topic,schedule=await configured(db); schedule.baseline_at=NOW-timedelta(hours=1)
    await monitor.enqueue_due(db,NOW); job=await monitor.claim_job(db,'rss',NOW)
    rows=[{'source':'rss','platform':'news','url':f'https://example.com/recent/{i}','author':f'A{i}','title':'Shared headline covering an important recent event','text':'Shared headline covering an important recent event','published_at':NOW-timedelta(minutes=5)} for i in range(6)]
    await monitor.finish_job(db,job,{'items':rows},NOW)
    alerts=(await db.execute(select(monitor.PulseAlert))).scalars().all()
    assert len(alerts)==1 and alerts[0].topic_id==topic.id
    assert alerts[0].issue_id is not None and len(alerts[0].evidence_ids)==6
    assert alerts[0].kind=='recent_cluster'
    assert alerts[0].window_start==NOW-timedelta(minutes=30)

@pytest.mark.asyncio
async def test_monitor_api_admin_validation_and_empty_state(client,admin_token,user_token):
    response=await client.get('/api/admin/pulse/monitor')
    assert response.status_code in (401,403)
    assert (await client.get('/api/admin/pulse/monitor',headers={'Authorization':f'Bearer {user_token}'})).status_code==403
    h={'Authorization':f'Bearer {admin_token}'}
    state=await client.get('/api/admin/pulse/monitor',headers=h)
    assert state.status_code==200 and len(state.json()['workers'])==3
    # -1 is the "no daily cap" mode; anything below it is invalid.
    bad=await client.put('/api/admin/pulse/monitor/workers/xpoz',json={'daily_limit':-2},headers=h)
    assert bad.status_code==422

@pytest.mark.asyncio
async def test_alert_analysis_is_issue_and_window_scoped_and_ack_persists(db,client,admin_token):
    from app.models.pulse import Issue
    from app.models.pulse_monitor import PulseAlert
    h={'Authorization':f'Bearer {admin_token}'}
    topic=WatchTopic(id='scope-topic',label='Scope',query='scope');db.add(topic);await db.flush()
    issue=Issue(id='scope-issue',topic_id=topic.id,title='Target');other=Issue(id='other-issue',topic_id=topic.id,title='Other')
    db.add_all([issue,other]);await db.flush()
    for id,issue_id,published in [('inside',issue.id,NOW),('outside',issue.id,NOW-timedelta(days=1)),('unrelated',other.id,NOW)]:
        db.add(SourceItem(id=id,topic_id=topic.id,issue_id=issue_id,source='rss',url='https://example.com/'+id,published_at=published))
    alert=PulseAlert(id='alert-scope',dedup_key='scope',topic_id=topic.id,issue_id=issue.id,kind='recent_cluster',title='Target',window_start=NOW-timedelta(minutes=30),window_end=NOW,evidence_ids=['inside'])
    db.add(alert);await db.flush()
    response=await client.get('/api/admin/pulse/monitor/alerts/alert-scope/analysis',headers=h)
    assert response.status_code==200
    assert [p['id'] for p in response.json()['posts']]==['inside']
    first=await client.post('/api/admin/pulse/monitor/alerts/alert-scope/ack',headers=h)
    second=await client.post('/api/admin/pulse/monitor/alerts/alert-scope/ack',headers=h)
    assert first.json()['acknowledged_at']==second.json()['acknowledged_at']
    assert (await client.get('/api/admin/pulse/monitor',headers=h)).json()['unread']==0

@pytest.mark.asyncio
async def test_topic_deletion_cleans_monitor_children(db,client,admin_token):
    topic,_=await configured(db);await monitor.enqueue_due(db,NOW)
    await ingest_items(db,topic,[{'source':'rss','url':'https://example.com/delete','text':'remove'}])
    response=await client.delete('/api/admin/pulse/topics/'+topic.id,headers={'Authorization':f'Bearer {admin_token}'})
    assert response.status_code==200
    assert not (await db.execute(select(monitor.MetricSnapshot))).scalars().all()
    assert not (await db.execute(select(monitor.CrawlJob))).scalars().all()

@pytest.mark.asyncio
async def test_concurrent_dispatch_reserves_once_across_sessions(tmp_path):
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
    from app.database import Base
    engine=create_async_engine('sqlite+aiosqlite:///'+str(tmp_path/'queue.db'))
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    factory=async_sessionmaker(engine,expire_on_commit=False)
    async with factory() as db:
        await configured(db,limit=1);await monitor.enqueue_due(db,NOW);await db.commit()
    async def attempt():
        async with factory() as db:
            job=await monitor.claim_job(db,'rss',NOW);await db.commit();return job.id if job else None
    results=await asyncio.gather(attempt(),attempt())
    assert sum(r is not None for r in results)==1
    async with factory() as db:
        assert (await db.execute(select(monitor.WorkerUsage))).scalar_one().used==1
    await engine.dispose()

@pytest.mark.asyncio
async def test_restricted_provider_blocks_lane_and_records_failure_alert(db):
    await configured(db);await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'rss',NOW)
    await monitor.finish_job(db,job,{'error':'rate_limited'},NOW)
    assert job.status=='failed'
    assert (await db.get(monitor.WorkerPolicy,'rss')).blocked_reason=='rate_limited'
    assert (await db.execute(select(monitor.PulseAlert))).scalar_one().kind=='collection_error'

@pytest.mark.asyncio
async def test_pause_cancels_queued_job_and_schedule_requires_budget(client,db,admin_token):
    topic,schedule=await configured(db);await monitor.enqueue_due(db,NOW)
    h={'Authorization':f'Bearer {admin_token}'}
    response=await client.put('/api/admin/pulse/monitor/topics/'+topic.id+'/rss',json={'enabled':False,'interval_minutes':60},headers=h)
    assert response.status_code==200
    assert (await db.execute(select(monitor.CrawlJob))).scalar_one().status=='cancelled'
    await client.put('/api/admin/pulse/monitor/workers/xpoz',json={'daily_limit':0},headers=h)
    response=await client.put('/api/admin/pulse/monitor/topics/'+topic.id+'/xpoz',json={'enabled':True,'interval_minutes':60},headers=h)
    assert response.status_code==409

@pytest.mark.asyncio
async def test_retries_stop_after_three_charged_attempts(db):
    await configured(db,limit=10); await monitor.enqueue_due(db,NOW)
    for attempt in range(3):
        at=NOW+timedelta(minutes=10*attempt)
        job=await monitor.claim_job(db,'rss',at)
        assert job.attempts==attempt+1
        await monitor.finish_job(db,job,{'error':'timeout'},at)
    assert job.status=='failed'
    assert await monitor.claim_job(db,'rss',NOW+timedelta(hours=1)) is None
    assert (await db.execute(select(monitor.WorkerUsage))).scalar_one().used==3

@pytest.mark.asyncio
async def test_stale_owner_cannot_finish_expired_job(db):
    topic,_=await configured(db);await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'rss',NOW)
    assert await monitor.finish_job(db,job,{'items':[{'source':'rss','url':'https://example.com/stale'}]},NOW+timedelta(minutes=4)) is False
    assert not (await db.execute(select(SourceItem))).scalars().all()

@pytest.mark.asyncio
async def test_later_run_does_not_repeat_same_alert(db):
    topic,schedule=await configured(db,limit=3);schedule.baseline_at=NOW-timedelta(hours=1)
    rows=[{'source':'rss','platform':'news','url':f'https://example.com/dedup/{i}','author':f'A{i}','title':'One shared headline with enough unique words','text':'One shared headline with enough unique words','published_at':NOW} for i in range(6)]
    await monitor.enqueue_due(db,NOW);job=await monitor.claim_job(db,'rss',NOW)
    await monitor.finish_job(db,job,{'items':rows},NOW)
    schedule.next_run_at=NOW+timedelta(minutes=1);await db.flush()
    await monitor.enqueue_due(db,NOW+timedelta(minutes=1));job=await monitor.claim_job(db,'rss',NOW+timedelta(minutes=1))
    await monitor.finish_job(db,job,{'items':[dict(rows[0],url='https://example.com/new-copy')]},NOW+timedelta(minutes=1))
    assert len((await db.execute(select(monitor.PulseAlert))).scalars().all())==1

@pytest.mark.asyncio
async def test_recent_but_prebaseline_backfill_cannot_trigger_alert(db):
    _,schedule=await configured(db,limit=3)
    rows=[{'source':'rss','platform':'news','url':f'https://example.com/baseline/{i}','author':f'A{i}','title':'One shared headline with enough unique words','text':'One shared headline with enough unique words','published_at':NOW-timedelta(minutes=10)} for i in range(5)]
    await monitor.enqueue_due(db,NOW);job=await monitor.claim_job(db,'rss',NOW)
    await monitor.finish_job(db,job,{'items':rows},NOW)
    schedule.next_run_at=NOW+timedelta(minutes=5);await db.flush()
    await monitor.enqueue_due(db,NOW+timedelta(minutes=5));job=await monitor.claim_job(db,'rss',NOW+timedelta(minutes=5))
    await monitor.finish_job(db,job,{'items':[dict(rows[0],url='https://example.com/late',author='late')]},NOW+timedelta(minutes=5))
    assert not (await db.execute(select(monitor.PulseAlert))).scalars().all()

@pytest.mark.asyncio
async def test_inbox_filters_before_limit_and_paginates(db,client,admin_token):
    from app.models.pulse_monitor import PulseAlert
    for topic_id in ['quiet','busy']: db.add(WatchTopic(id=topic_id,label=topic_id,query=topic_id))
    await db.flush()
    for i in range(105):
        db.add(PulseAlert(id=f'inbox-{i}',dedup_key=f'inbox-{i}',topic_id='quiet' if i==0 else 'busy',kind='collection_error',title=str(i),created_at=NOW+timedelta(seconds=i),window_start=NOW,window_end=NOW))
    await db.flush();h={'Authorization':f'Bearer {admin_token}'}
    scoped=(await client.get('/api/admin/pulse/monitor',params={'topic_id':'quiet'},headers=h)).json()
    assert [a['id'] for a in scoped['alerts']]==['inbox-0']
    page=(await client.get('/api/admin/pulse/monitor',params={'topic_id':'busy','alert_offset':100},headers=h)).json()
    assert len(page['alerts'])==4 and page['alert_total']==104

@pytest.mark.asyncio
async def test_concurrent_ingest_same_url_preserves_one_item_and_all_snapshots(tmp_path):
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
    from app.database import Base
    from app.models.pulse import Issue
    engine=create_async_engine('sqlite+aiosqlite:///'+str(tmp_path/'ingestion.db'))
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    factory=async_sessionmaker(engine,expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='same-topic',label='Same',query='same'));await db.commit()
    barrier=asyncio.Event();ready=0
    async def ingest():
        nonlocal ready
        async with factory() as db:
            topic=await db.get(WatchTopic,'same-topic');ready+=1
            if ready==2:barrier.set()
            await barrier.wait()
            await ingest_items(db,topic,[{'source':'rss','url':'https://example.com/same','title':'Same post content','metrics':{'likes':10}}]);await db.commit()
    await asyncio.gather(ingest(),ingest())
    async with factory() as db:
        items=(await db.execute(select(SourceItem))).scalars().all()
        assert len(items)==1
        assert len((await db.execute(select(monitor.MetricSnapshot))).scalars().all())==2
        issue=(await db.execute(select(Issue))).scalar_one()
        assert issue.item_count==1 and issue.engagement_total==10
        await ingest_items(db,await db.get(WatchTopic,'same-topic'),[{'source':'rss','url':'https://example.com/same','metrics':{'likes':15}}])
        assert issue.engagement_total==15
    await engine.dispose()

@pytest.mark.asyncio
async def test_ingestion_reports_only_its_actual_inserted_ids(db):
    topic,_=await configured(db)
    raw={'source':'rss','url':'https://example.com/exact-ids','title':'Actual insert'}
    ids=set()
    await ingest_items(db,topic,[raw],created_ids=ids)
    item=(await db.execute(select(SourceItem))).scalar_one()
    assert ids=={item.id}
    refreshed=set()
    await ingest_items(db,topic,[raw],created_ids=refreshed)
    assert refreshed==set()
    await ingest_items(db,topic,[],created_ids=refreshed)
    assert refreshed==set()

@pytest.mark.asyncio
async def test_unlimited_lane_has_no_daily_cap_but_waits_between_requests(db):
    _,schedule=await configured(db,limit=monitor.UNLIMITED)
    gap=monitor.MIN_GAP_SECONDS['rss']
    await monitor.enqueue_due(db,NOW)
    first=await monitor.claim_job(db,'rss',NOW)
    assert first.status=='running'
    await monitor.finish_job(db,first,{'items':[]},NOW)
    # Far past any finite cap: usage alone must never stop an unlimited lane.
    usage=(await db.execute(select(monitor.WorkerUsage))).scalar_one(); usage.used=10_000; await db.flush()
    db.add(monitor.CrawlJob(schedule_id=schedule.id,topic_id=schedule.topic_id,provider='rss',available_at=NOW)); await db.flush()
    assert await monitor.claim_job(db,'rss',NOW+timedelta(seconds=gap-1)) is None
    queued=(await db.execute(select(monitor.CrawlJob).where(monitor.CrawlJob.status=='queued'))).scalars().all()
    assert len(queued)==1  # paused, not dropped
    second=await monitor.claim_job(db,'rss',NOW+timedelta(seconds=gap))
    assert second is not None and second.status=='running'
    assert usage.used==10_001 or (await db.get(monitor.WorkerUsage,usage.id,populate_existing=True)).used==10_001

@pytest.mark.asyncio
async def test_unlimited_lane_still_stops_when_provider_blocks(db):
    await configured(db,limit=monitor.UNLIMITED)
    await monitor.enqueue_due(db,NOW)
    job=await monitor.claim_job(db,'rss',NOW)
    await monitor.finish_job(db,job,{'error':'rate_limited'},NOW)
    policy=await db.get(monitor.WorkerPolicy,'rss',populate_existing=True)
    assert policy.blocked_reason=='rate_limited'
    assert await monitor.claim_job(db,'rss',NOW+timedelta(hours=1)) is None

@pytest.mark.asyncio
async def test_worker_api_accepts_unlimited_and_reports_pause(client,admin_token):
    headers={'Authorization':f'Bearer {admin_token}'}
    assert (await client.put('/api/admin/pulse/monitor/workers/xpoz',json={'daily_limit':-2},headers=headers)).status_code==422
    response=await client.put('/api/admin/pulse/monitor/workers/xpoz',json={'daily_limit':-1},headers=headers)
    assert response.status_code==200
    worker=next(w for w in (await client.get('/api/admin/pulse/monitor',headers=headers)).json()['workers'] if w['provider']=='xpoz')
    assert worker['unlimited'] is True and worker['min_gap_seconds']==monitor.MIN_GAP_SECONDS['xpoz']
