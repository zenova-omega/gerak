"""Offline source coverage and bounded social ingestion contracts."""
import json
from datetime import datetime
from types import SimpleNamespace
import httpx
import pytest
from sqlalchemy import select
from app.services.ingest import xpoz

@pytest.mark.asyncio
async def test_explicit_unlimited_manual_search_counts_usage_without_daily_cap(db):
    from app.services import pulse_sources as svc
    from app.models.pulse import WatchTopic
    from app.models.pulse_monitor import WorkerPolicy, WorkerUsage
    topic=WatchTopic(label='Quick',query='keyword');db.add(topic)
    db.add(WorkerPolicy(provider='xpoz',daily_limit=1));await db.flush()
    now=datetime.utcnow()
    first=await svc.reserve_collection(db,topic.id,'instagram',now)
    await svc.finish_collection(db,first,{'items':[]},now)
    second=await svc.reserve_collection(db,topic.id,'tiktok',now,unlimited=True)
    assert second.status=='running'
    assert (await db.get(WorkerUsage,'xpoz:'+now.date().isoformat())).used==2
    with pytest.raises(svc.CollectionBlocked,match='busy'):
        await svc.reserve_collection(db,topic.id,'instagram',now,unlimited=True)
    await svc.finish_collection(db,second,{'error':'quota_exceeded'},now)
    policy=await db.get(WorkerPolicy,'xpoz');policy.blocked_reason='provider_quota';await db.flush()
    with pytest.raises(svc.CollectionBlocked,match='worker_blocked'):
        await svc.reserve_collection(db,topic.id,'instagram',now,unlimited=True)


def test_social_normalization_keeps_missing_metrics_unknown():
    assert hasattr(xpoz, 'normalize_social_posts'), 'Instagram/TikTok normalization missing'
    rows = xpoz.normalize_social_posts('instagram', [{'id':'12', 'codeUrl':'https://www.instagram.com/p/ABC/', 'username':'editor', 'caption':'Isu', 'likeCount':0}])
    assert rows[0]['platform'] == 'instagram'
    assert rows[0]['metrics']['likes'] == 0
    assert 'views' not in rows[0]['metrics']
    assert rows[0]['published_at'] is None
    assert xpoz.normalize_social_posts('instagram', [{'id':'12','codeUrl':'https://evil.test/p/ABC'}]) == []
    assert xpoz.normalize_social_posts('tiktok', [{'id':'12','username':'a','isPrivate':'true'}]) == []
    tt = xpoz.normalize_social_posts('tiktok', [{'id':'123', 'username':'alice', 'description':'Isu', 'playCount':'900', 'forwardCount':2, 'commentCount':3}])[0]
    assert tt['url'] == 'https://www.tiktok.com/@alice/video/123'
    assert tt['metrics']['views'] == 900 and tt['metrics']['shares'] == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('platform,tool', [('instagram','getInstagramPostsByKeywords'),('tiktok','getTiktokPostsByKeywords')])
async def test_social_search_single_bounded_tool(monkeypatch, platform, tool):
    assert hasattr(xpoz, 'fetch_xpoz_social_items'), 'Social search missing'
    calls=[]
    async def respond(request):
        msg=json.loads(request.content); calls.append(msg)
        if msg['method']=='notifications/initialized': return httpx.Response(202)
        result={'protocolVersion':'2025-03-26'} if msg['method']=='initialize' else {'structuredContent':{'data':[]}}
        return httpx.Response(200,json={'jsonrpc':'2.0','id':msg['id'],'result':result})
    original=httpx.AsyncClient
    monkeypatch.setattr(httpx,'AsyncClient',lambda **kw: original(transport=httpx.MockTransport(respond),**kw))
    assert await xpoz.fetch_xpoz_social_items('isu','fake',platform,5) == []
    searches=[m for m in calls if m['method']=='tools/call']
    assert len(searches)==1 and searches[0]['params']['name']==tool
    args=searches[0]['params']['arguments']
    assert args['limit']==5 and args['forceLatest'] is False
    assert 'userPrompt' not in args


def test_account_snapshot_parses_compact_metadata_without_secrets():
    assert hasattr(xpoz,'account_snapshot'), 'Account metadata parser missing'
    text='status: success\ndata:\n  plan:\n    name: Free\n    features:\n      creditResetFrequency: never\n  billing: null\n  usage:\n    subscriptionCreditsRemaining: 488\n    extraCreditsRemaining: 0'
    result=xpoz.account_snapshot({'content':[{'type':'text','text':text}]}, ['getInstagramPostsByKeywords'])
    assert result['plan']=='Free' and result['credits_remaining']==488
    assert result['credit_reset_frequency']=='never'
    assert result['tools']==['getInstagramPostsByKeywords']


@pytest.mark.asyncio
async def test_sources_coverage_is_authenticated_and_read_only(client,admin_token):
    res=await client.get('/api/admin/pulse/sources',headers={'Authorization':f'Bearer {admin_token}'})
    assert res.status_code==200, 'Coverage route missing'
    assert {s['platform'] for s in res.json()['sources']}=={'x','instagram','tiktok','news','youtube','threads'}
    threads=next(s for s in res.json()['sources'] if s['platform']=='threads')
    assert threads['recurring_enabled'] is False
    assert threads['keyword_collection_available'] is False
    assert res.json()['account']['status']=='unknown'
    assert (await client.get('/api/admin/pulse/sources')).status_code==403


@pytest.mark.asyncio
async def test_shared_budget_reservation_and_success(db):
    from app.services import pulse_sources as svc
    from app.models.pulse import WatchTopic, SourceItem
    from app.models.pulse_monitor import WorkerPolicy, WorkerUsage
    t=WatchTopic(label='Sources',query='isu'); db.add(t)
    db.add(WorkerPolicy(provider='xpoz',daily_limit=1)); await db.flush()
    run=await svc.reserve_collection(db,t.id,'instagram',datetime.utcnow())
    assert run.status=='running'
    with pytest.raises(svc.CollectionBlocked,match='busy'):
        await svc.reserve_collection(db,t.id,'tiktok',datetime.utcnow())
    item={'source':'xpoz','platform':'instagram','url':'https://www.instagram.com/p/ABC/','text':'isu','metrics':{'likes':0}}
    await svc.finish_collection(db,run,{'items':[item]},datetime.utcnow())
    assert run.status=='succeeded' and run.ingested==1
    assert await db.scalar(select(SourceItem.id).where(SourceItem.platform=='instagram'))
    with pytest.raises(svc.CollectionBlocked,match='daily_limit'):
        await svc.reserve_collection(db,t.id,'tiktok',datetime.utcnow())
    usage=(await db.execute(select(WorkerUsage).where(WorkerUsage.provider=='xpoz'))).scalar_one()
    assert usage.used==1
    coverage=await svc.coverage(db,SimpleNamespace(XPOZ_API_KEY='fake',YOUTUBE_API_KEY=''),t.id)
    ig=next(s for s in coverage['sources'] if s['platform']=='instagram')
    assert ig['stored_posts']==1 and ig['fields']['likes']==1 and ig['fields']['views']==0
    assert ig['last_attempt']['status']=='succeeded' and not ig['recurring_enabled']


def test_social_dates_accept_documented_timestamp_and_date_fields():
    row={'id':'12','username':'editor','description':'issue','createdAtTimestamp':1735689600}
    assert xpoz.normalize_social_posts('tiktok',[row])[0]['published_at']==datetime(2025,1,1)
    row['createdAtTimestamp']=1735689600000
    assert xpoz.normalize_social_posts('tiktok',[row])[0]['published_at']==datetime(2025,1,1)
    row['createdAtTimestamp']='bad'
    row['createdAtDate']='2025-01-01T00:00:00Z'
    assert xpoz.normalize_social_posts('tiktok',[row])[0]['published_at']==datetime(2025,1,1)


@pytest.mark.asyncio
async def test_failed_collection_retains_reservation_and_fences_late_results(db):
    from app.services import pulse_sources as svc
    from app.models.pulse import WatchTopic,SourceItem
    from app.models.pulse_monitor import WorkerPolicy,WorkerUsage
    from datetime import timedelta
    t=WatchTopic(label='failure',query='issue'); db.add(t)
    db.add(WorkerPolicy(provider='xpoz',daily_limit=4)); await db.flush()
    now=datetime.utcnow()
    run=await svc.reserve_collection(db,t.id,'tiktok',now)
    await svc.finish_collection(db,run,{'error':'plan_restricted'},now)
    assert run.status=='failed'
    assert (await db.get(WorkerPolicy,'xpoz')).blocked_reason=='plan_restricted'
    with pytest.raises(svc.CollectionBlocked,match='worker_blocked'):
        await svc.reserve_collection(db,t.id,'instagram',now)
    policy=await db.get(WorkerPolicy,'xpoz'); policy.blocked_reason=None; await db.flush()
    late=await svc.reserve_collection(db,t.id,'instagram',now)
    await svc.finish_collection(db,late,{'items':[{'source':'xpoz','platform':'instagram','url':'https://www.instagram.com/p/late/'}]},now+timedelta(seconds=91))
    assert late.status=='interrupted'
    assert not await db.scalar(select(SourceItem.id).where(SourceItem.topic_id==t.id))
    assert (await db.get(WorkerUsage,'xpoz:'+now.date().isoformat())).used==2


@pytest.mark.asyncio
async def test_coverage_deduplicates_global_urls_and_scopes_topic(db):
    from app.services.pulse_sources import coverage
    from app.models.pulse import WatchTopic,SourceItem
    a=WatchTopic(label='a',query='a');b=WatchTopic(label='b',query='b');db.add_all([a,b]);await db.flush()
    db.add_all([SourceItem(topic_id=t.id,source='xpoz',platform='instagram',url='https://www.instagram.com/p/same/',text='topic',metrics={'likes':0}) for t in (a,b)])
    await db.flush()
    settings=SimpleNamespace(XPOZ_API_KEY='',YOUTUBE_API_KEY='')
    data=await coverage(db,settings)
    assert next(s for s in data['sources'] if s['platform']=='instagram')['stored_posts']==1
    data=await coverage(db,settings,a.id)
    assert next(s for s in data['sources'] if s['platform']=='instagram')['fields']['likes']==1


@pytest.mark.asyncio
async def test_account_check_failure_does_not_expose_secret(db,monkeypatch):
    from app.services import pulse_sources as svc
    async def fail(key): raise RuntimeError('SENSITIVE key and provider trace')
    monkeypatch.setattr(svc,'fetch_xpoz_account',fail)
    row=await svc.check_account(db,SimpleNamespace(XPOZ_API_KEY='private'))
    assert row.detail=={'status':'error','error':'provider_error'}


@pytest.mark.parametrize('payload,code', [({'code':401,'message':'Unauthorized'},'authentication_failed'),({'message':'Permission denied'},'access_or_quota_restricted'),({'message':'Rate limit exceeded'},'rate_limited')])
def test_explicit_mcp_denials_are_blocking(payload,code):
    with pytest.raises(xpoz.XpozToolError) as error:
        xpoz._tool_error(payload)
    assert error.value.code==code


@pytest.mark.asyncio
async def test_account_denial_blocks_scheduler_without_automatic_recovery(db,monkeypatch):
    from app.services import pulse_sources as svc
    from app.models.pulse_monitor import WorkerPolicy
    async def denied(key): raise xpoz.XpozToolError('authentication_failed')
    monkeypatch.setattr(svc,'fetch_xpoz_account',denied)
    await svc.check_account(db,SimpleNamespace(XPOZ_API_KEY='fake'))
    assert (await db.get(WorkerPolicy,'xpoz')).blocked_reason=='authentication_failed'


@pytest.mark.asyncio
async def test_ingestion_failure_is_recorded_and_releases_lane(db,monkeypatch):
    from app.services import pulse_sources as svc
    from app.models.pulse import WatchTopic
    from app.models.pulse_monitor import WorkerPolicy,WorkerUsage
    t=WatchTopic(label='failure',query='issue');db.add(t)
    db.add(WorkerPolicy(provider='xpoz',daily_limit=4));await db.flush()
    now=datetime.utcnow();run=await svc.reserve_collection(db,t.id,'instagram',now)
    async def fail(*args): raise ValueError('bad row SECRET')
    monkeypatch.setattr(svc,'ingest_items',fail)
    await svc.finish_collection(db,run,{'items':[{'url':'https://www.instagram.com/p/a/'}]},now)
    assert run.status=='failed' and run.error=='ingestion_failed'
    assert run.fetched==1 and run.ingested==0
    assert (await db.get(WorkerPolicy,'xpoz')).lease_token is None
    assert (await db.get(WorkerUsage,'xpoz:'+now.date().isoformat())).used==1


@pytest.mark.asyncio
async def test_undated_social_posts_never_get_fake_publication_timeline(db):
    from app.services.pulse import ingest_items,pulse_analytics
    from app.models.pulse import WatchTopic
    topic=WatchTopic(label='undated',query='issue');db.add(topic);await db.flush()
    await ingest_items(db,topic,[{'source':'xpoz','platform':'instagram','url':'https://www.instagram.com/p/undated/','text':'issue'}])
    result=await pulse_analytics(db,topic.id)
    assert result['total_mentions']==1 and result['timeline']==[]
