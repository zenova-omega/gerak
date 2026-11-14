"""Source access evidence, coverage and manual collections sharing the Xpoz lane."""
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select, update, or_
from ..models.pulse import WatchTopic, SourceItem, PulseCrawlRun
from ..models.pulse_monitor import WorkerPolicy, WorkerUsage, MonitorSchedule, CrawlJob, QuotaReservation
from ..models.pulse_sources import SourceAccount, SourceCollection
from .pulse_monitor import ensure_policies, insert_once, gap_remaining
from .pulse import ingest_items, _provider_error
from .ingest.common import credential
from .ingest.xpoz import SOCIAL_TOOLS, fetch_xpoz_account, fetch_xpoz_social_items

BLOCKING_ERRORS = ('authentication_failed','access_or_quota_restricted','plan_restricted','rate_limited','pending')

class CollectionBlocked(Exception):
    pass


def attempt_dict(run):
    return {k:getattr(run,k) for k in ('status','error','fetched','ingested','started_at','finished_at')}


async def check_account(db, settings):
    key = credential(settings, 'XPOZ_API_KEY')
    try:
        detail = await fetch_xpoz_account(key) if key else {'status':'error','error':'not_configured'}
    except Exception as exc:
        detail = {'status':'error','error':_provider_error(exc,'xpoz')['error']}
    if detail.get('error') in BLOCKING_ERRORS:
        await ensure_policies(db)
        await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider=='xpoz').values(blocked_reason=detail['error']))
    account = await db.get(SourceAccount, 'xpoz')
    if account is None:
        account = SourceAccount(provider='xpoz'); db.add(account)
    account.checked_at = datetime.utcnow(); account.detail = detail
    await db.flush()
    return account


async def reserve_collection(db, topic_id, platform, now, *, unlimited=False):
    if platform not in SOCIAL_TOOLS:
        raise CollectionBlocked('unsupported')
    if await db.get(WatchTopic, topic_id) is None:
        raise CollectionBlocked('topic_not_found')
    await ensure_policies(db)
    policy = await db.get(WorkerPolicy, 'xpoz', populate_existing=True)
    if policy.blocked_reason:
        raise CollectionBlocked('worker_blocked:' + policy.blocked_reason)
    if policy.daily_limit < 0:
        # Lane has no daily cap: manual runs share its pause so two requests never go out back to back.
        unlimited = True
        if await gap_remaining(db, 'xpoz', now):
            raise CollectionBlocked('busy')
    token = str(uuid.uuid4()); until = now + timedelta(seconds=90)
    won = await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider=='xpoz',
        WorkerPolicy.blocked_reason.is_(None), True if unlimited else WorkerPolicy.daily_limit>0,
        or_(WorkerPolicy.lease_until.is_(None),WorkerPolicy.lease_until<=now))
        .values(lease_token=token,lease_until=until))
    if not won.rowcount:
        raise CollectionBlocked('daily_limit' if not unlimited and policy.daily_limit<=0 else 'busy')
    day = now.date().isoformat(); usage_id = 'xpoz:' + day
    await insert_once(db, WorkerUsage, {'id':usage_id,'provider':'xpoz','day':day,'used':0})
    reserved = await db.execute(update(WorkerUsage).where(WorkerUsage.id==usage_id,True if unlimited else WorkerUsage.used<policy.daily_limit)
                               .values(used=WorkerUsage.used+1))
    if not reserved.rowcount:
        await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider=='xpoz',WorkerPolicy.lease_token==token)
                         .values(lease_token=None,lease_until=None))
        raise CollectionBlocked('daily_limit')
    await db.execute(update(SourceCollection).where(SourceCollection.status=='running',SourceCollection.lease_until<now)
                     .values(status='interrupted',error='lease_expired',finished_at=now))
    run = SourceCollection(topic_id=topic_id,platform=platform,status='running',started_at=now,lease_token=token,lease_until=until)
    db.add(QuotaReservation(provider='xpoz',topic_id=topic_id,platform=platform,mode='manual',day=day,reserved_at=now))
    db.add(run); await db.flush()
    return run


async def fetch_collection(query, platform, limit, settings):
    try:
        return {'items':await fetch_xpoz_social_items(query,credential(settings,'XPOZ_API_KEY'),platform,limit)}
    except Exception as exc:
        return {'error':_provider_error(exc,'xpoz')['error']}


async def finish_collection(db, run, result, now):
    # Fenced completion: an expired or superseded lease cannot write source data.
    won = await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider=='xpoz',
        WorkerPolicy.lease_token==run.lease_token,WorkerPolicy.lease_until>=now).values(lease_until=now+timedelta(seconds=30)))
    if not won.rowcount or run.status!='running':
        if run.status=='running':
            run.status='interrupted'; run.error='lease_expired'; run.finished_at=now
        return
    if 'items' in result:
        topic = await db.get(WatchTopic,run.topic_id)
        if topic is None:
            run.status='failed'; run.error='topic_not_found'
        else:
            items = result['items'][:20]
            run.fetched = len(items)
            try:
                async with db.begin_nested():
                    created = await ingest_items(db,topic,items)
                run.ingested=created; run.status='succeeded' if items else 'empty'
            except Exception:
                run.status='failed'; run.error='ingestion_failed'; run.ingested=0
    else:
        run.error=result.get('error','provider_error')
        run.status='pending' if run.error=='pending' else 'failed'
        if run.error in BLOCKING_ERRORS:
            await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider=='xpoz',WorkerPolicy.lease_token==run.lease_token)
                             .values(blocked_reason=run.error))
    run.finished_at=now
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider=='xpoz',WorkerPolicy.lease_token==run.lease_token)
                     .values(lease_until=None,lease_token=None))
    await db.flush()


async def coverage(db, settings, topic_id=None):
    now=datetime.utcnow(); day=now.date().isoformat()
    account=await db.get(SourceAccount,'xpoz')
    detail=account.detail if account else {'status':'unknown'}
    policy=await db.get(WorkerPolicy,'xpoz')
    usage=await db.get(WorkerUsage,'xpoz:'+day)
    query=select(SourceItem).order_by(SourceItem.crawled_at.desc(),SourceItem.id)
    attempts=select(SourceCollection).order_by(SourceCollection.started_at.desc())
    schedules=select(MonitorSchedule)
    jobs=select(CrawlJob).order_by(CrawlJob.created_at.desc())
    runs=select(PulseCrawlRun).order_by(PulseCrawlRun.started_at.desc())
    if topic_id:
        query=query.where(SourceItem.topic_id==topic_id)
        attempts=attempts.where(SourceCollection.topic_id==topic_id)
        schedules=schedules.where(MonitorSchedule.topic_id==topic_id)
        jobs=jobs.where(CrawlJob.topic_id==topic_id)
        runs=runs.where(PulseCrawlRun.topic_id==topic_id)
    rows=(await db.execute(query)).scalars().all()
    collections=(await db.execute(attempts.limit(500))).scalars().all()
    schedule_rows=(await db.execute(schedules)).scalars().all()
    job_rows=(await db.execute(jobs.limit(500))).scalars().all()
    crawl_rows=(await db.execute(runs.limit(500))).scalars().all()
    sources=[]
    for platform,provider in [('x','xpoz'),('instagram','xpoz'),('tiktok','xpoz'),('youtube','youtube'),('news','rss')]:
        # Across topics, count each public URL once using its latest observation.
        seen=set(); posts=[]
        for p in rows:
            if p.platform==platform and p.url not in seen:
                seen.add(p.url); posts.append(p)
        field_counts={k:sum(bool(getattr(p,k)) for p in posts) for k in ('text','author','published_at')}
        field_counts.update({k:sum((p.metrics or {}).get(k) is not None for p in posts) for k in ('likes','comments','shares','views')})
        evidence=[]
        schedule_provider=platform if platform in SOCIAL_TOOLS else provider
        for j in job_rows:
            if j.provider==schedule_provider:
                r=j.result or {}
                evidence.append({'status':j.status,'error':r.get('error'),'fetched':r.get('fetched',0),'ingested':r.get('ingested',0),'started_at':j.created_at,'finished_at':j.finished_at})
        if platform in SOCIAL_TOOLS:
            for c in collections:
                if c.platform!=platform: continue
                a=attempt_dict(c)
                if a['status']=='running' and c.lease_until<now:
                    a.update(status='interrupted',error='lease_expired')
                evidence.append(a)
        else:
            for c in crawl_rows:
                r=(c.providers or {}).get(provider)
                if r and r.get('status') not in ('manual_only','disabled'):
                    status=r.get('status','unknown')
                    evidence.append({'status':'succeeded' if status in ('ok','success') else status,'error':r.get('error'), 'fetched':r.get('fetched',0),'ingested':r.get('ingested',0),'started_at':c.started_at,'finished_at':c.finished_at})
        evidence.sort(key=lambda a:a['started_at'],reverse=True)
        tool=SOCIAL_TOOLS.get(platform,'getTwitterPostsByKeywords')
        sources.append({'platform':platform,'provider':provider,
            'configured':provider=='rss' or bool(credential(settings,provider.upper()+'_API_KEY')),
            'tool_available':(tool in detail.get('tools',[])) if provider=='xpoz' and detail.get('status')=='verified' else None,
            'stored_posts':len(posts),'fields':field_counts,'last_attempt':evidence[0] if evidence else None,
            'last_success_at':next((a['finished_at'] for a in evidence if a['status'] in ('succeeded','empty')),None),
            'recurring_enabled':any(s.enabled and s.provider==schedule_provider for s in schedule_rows)})
    threads_account=await db.get(SourceAccount,'threads')
    threads_posts={p.url:p for p in rows if p.platform=='threads'}
    sources.append({'platform':'threads','provider':'threads',
        'configured':bool(credential(settings,'THREADS_ACCESS_TOKEN')),
        'stored_posts':len(threads_posts),'fields':{},'last_attempt':None,'last_success_at':None,
        'recurring_enabled':False,'keyword_collection_available':False,
        'connection':threads_account.detail if threads_account else None,
        'connection_checked_at':threads_account.checked_at if threads_account else None})
    return {'checked_at':account.checked_at if account else None,
        'account':{k:detail.get(k) for k in ('status','plan','credits_remaining','extra_credits_remaining','credit_reset_frequency','error')},
        'budget':{'daily_limit':policy.daily_limit if policy else 0,'used':usage.used if usage else 0,'day_utc':day,'blocked_reason':policy.blocked_reason if policy else None},
        'sources':sources,'topic_id':topic_id}
