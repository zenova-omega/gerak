"""Database-backed bounded provider lanes; network calls never hold DB locks."""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select, update, or_, func
from ..models.pulse import WatchTopic, SourceItem, Issue
from ..models.pulse_monitor import WorkerPolicy, WorkerUsage, MonitorSchedule, CrawlJob, MetricSnapshot, PulseAlert, QuotaReservation
from .pulse import ingest_items, _provider_error
from .ingest.common import credential
from .ingest.xpoz import PAGE_ROWS

PROVIDERS = ('rss', 'xpoz', 'youtube')
SCHEDULE_PROVIDERS = ('rss', 'xpoz', 'youtube', 'instagram', 'tiktok', 'reddit')

def budget_provider(provider):
    return 'xpoz' if provider in ('instagram', 'tiktok', 'reddit') else provider

def source_platform(provider):
    return {'rss':'news','xpoz':'x'}.get(provider,provider)
# daily_limit == UNLIMITED removes the local daily cap for that lane. The provider's own quota
# still applies, so an unlimited lane is paced instead: one request, then a pause.
UNLIMITED = -1
# A new installation collects without a local allowance. Collection stops only when the provider refuses
# (see pulse_provider_block): an empty balance is announced in the app and lifts once it has been topped up.
# Monitor can still set a daily cap per lane, or 0 to switch one off.
DEFAULT_LIMITS = {'rss': UNLIMITED, 'xpoz': UNLIMITED, 'youtube': UNLIMITED}
# Pause between two requests of an unlimited lane, automatic or manual.
# xpoz: 2 min (up to 720/day across X, Instagram and TikTok). youtube: 15 min, because one search
# costs 100 of the default 10,000 daily API units (96 searches/day). rss: 1 min, no provider quota.
MIN_GAP_SECONDS = {'rss': 60, 'xpoz': 120, 'youtube': 900}


async def gap_remaining(db, provider, now):
    """Seconds an unlimited lane must still wait since its last reserved request; 0 when free."""
    last=await db.scalar(select(func.max(QuotaReservation.reserved_at)).where(QuotaReservation.provider==provider))
    if last is None:
        return 0
    return max(0, MIN_GAP_SECONDS[provider]-int((now-last).total_seconds()))
logger = logging.getLogger(__name__)


async def insert_once(db, model, values):
    dialect = db.bind.dialect.name
    if dialect == 'sqlite':
        from sqlalchemy.dialects.sqlite import insert
    elif dialect == 'postgresql':
        from sqlalchemy.dialects.postgresql import insert
    else:
        raise RuntimeError('Unsupported queue database')
    return await db.execute(insert(model).values(**values).on_conflict_do_nothing())


async def ensure_policies(db):
    for provider in PROVIDERS:
        await insert_once(db, WorkerPolicy, {'provider': provider, 'daily_limit': DEFAULT_LIMITS[provider]})


async def recover_expired(db, now):
    # Ambiguous after crash: request may have been charged. Never replay automatically.
    await db.execute(update(CrawlJob).where(CrawlJob.status=='running', CrawlJob.lease_until<now)
                     .values(status='interrupted', finished_at=now, result={'error':'lease_expired', 'message':'Request outcome unknown; reservation retained. Next scheduled run is separate.'}))


async def enqueue_due(db, now):
    await ensure_policies(db)
    from .pulse_provider_block import lift_expired
    await lift_expired(db, now)
    await recover_expired(db, now)
    schedules=(await db.execute(select(MonitorSchedule).where(MonitorSchedule.enabled==True, MonitorSchedule.next_run_at<=now))).scalars().all()
    for schedule in schedules:
        # Atomic schedule advance prevents duplicate enqueue across scheduler instances.
        due=schedule.next_run_at
        changed=await db.execute(update(MonitorSchedule).where(MonitorSchedule.id==schedule.id, MonitorSchedule.enabled==True, MonitorSchedule.next_run_at==due)
                                 .values(next_run_at=now+timedelta(minutes=schedule.interval_minutes)))
        if not changed.rowcount:
            continue
        pending=(await db.execute(select(CrawlJob.id).where(CrawlJob.schedule_id==schedule.id, CrawlJob.status.in_(['queued','retry','running'])).limit(1))).first()
        if pending:
            continue
        db.add(CrawlJob(schedule_id=schedule.id, topic_id=schedule.topic_id, provider=schedule.provider, available_at=now))
    await db.flush()


async def claim_job(db, provider, now):
    if provider not in PROVIDERS:
        return None
    await ensure_policies(db)
    token=str(uuid.uuid4())
    # A persistent provider-lane lease enforces concurrency=1 across processes.
    won=await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider==provider, WorkerPolicy.daily_limit!=0,
                         WorkerPolicy.blocked_reason.is_(None), or_(WorkerPolicy.lease_until.is_(None), WorkerPolicy.lease_until<=now))
                         .values(lease_until=now+timedelta(seconds=180), lease_token=token))
    if not won.rowcount:
        return None
    policy=await db.get(WorkerPolicy,provider, populate_existing=True)
    async def release():
        await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider==provider,WorkerPolicy.lease_token==token).values(lease_until=None,lease_token=None))
    job=(await db.execute(select(CrawlJob).join(MonitorSchedule,CrawlJob.schedule_id==MonitorSchedule.id)
                          .where(CrawlJob.provider.in_([p for p in SCHEDULE_PROVIDERS if budget_provider(p)==provider]),CrawlJob.status.in_(['queued','retry']),CrawlJob.available_at<=now,
                                 CrawlJob.attempts<3,MonitorSchedule.enabled==True)
                          .order_by(CrawlJob.available_at,CrawlJob.created_at,CrawlJob.id).limit(1))).scalar_one_or_none()
    if job is None:
        await release(); return None
    unlimited=policy.daily_limit==UNLIMITED
    if unlimited and await gap_remaining(db,provider,now):
        await release(); return None  # job stays queued; the next tick after the pause takes it
    day=now.date().isoformat(); usage_id=provider+':'+day
    await insert_once(db,WorkerUsage,{'id':usage_id,'provider':provider,'day':day,'used':0})
    reserved=await db.execute(update(WorkerUsage).where(WorkerUsage.id==usage_id,True if unlimited else WorkerUsage.used<policy.daily_limit).values(used=WorkerUsage.used+1))
    if not reserved.rowcount:
        await release(); return None
    db.add(QuotaReservation(provider=provider,topic_id=job.topic_id,platform=source_platform(job.provider),mode='automatic',day=day,reserved_at=now))
    # Policy row lock + enabled schedule filter above serialize each lane. CAS also fences job ownership.
    changed=await db.execute(update(CrawlJob).where(CrawlJob.id==job.id,CrawlJob.status.in_(['queued','retry']))
                             .values(status='running',attempts=CrawlJob.attempts+1,lease_token=token,lease_until=now+timedelta(seconds=180)))
    if not changed.rowcount:
        await release(); return None  # conservative reservation retained
    await db.refresh(job)
    return job


async def create_cluster_alerts(db, topic_id, new_ids, now, baseline_at):
    if not new_ids:
        return
    new_items=(await db.execute(select(SourceItem).where(SourceItem.id.in_(new_ids)))).scalars().all()
    start=max(now-timedelta(minutes=30),baseline_at)
    candidate_issues={p.issue_id for p in new_items if p.issue_id and p.published_at and start<p.published_at<=now}
    for issue_id in candidate_issues:
        rows=(await db.execute(select(SourceItem).where(SourceItem.issue_id==issue_id,SourceItem.published_at>start,SourceItem.published_at<=now))).scalars().all()
        authors={((p.platform or ''),p.author.strip().lower()) for p in rows if p.author}
        # Separate baseline-based signal from the legacy activity threshold.
        # Require a full observed hour, so first imports do not create spikes.
        if baseline_at <= now-timedelta(minutes=60) and len(authors) >= 3:
            from .pulse_listening import spike_evidence
            previous=(await db.execute(select(SourceItem).where(
                SourceItem.issue_id==issue_id, SourceItem.published_at>start-timedelta(minutes=30),
                SourceItem.published_at<=start, SourceItem.crawled_at<=start))).scalars().all()
            evidence=spike_evidence(len(rows), len(previous))
            existing=(await db.execute(select(PulseAlert.id).where(
                PulseAlert.issue_id==issue_id, PulseAlert.kind=='volume_spike',
                PulseAlert.created_at>=now-timedelta(hours=2)).limit(1))).first()
            if evidence and not existing:
                issue=await db.get(Issue,issue_id)
                await insert_once(db,PulseAlert,{
                    'id':str(uuid.uuid4()), 'dedup_key':f'spike:{issue_id}:{int(now.timestamp()//7200)}',
                    'topic_id':topic_id,'issue_id':issue_id,'kind':'volume_spike','title':issue.title[:500],
                    'created_at':now,'window_start':start,'window_end':now,
                    'evidence_ids':[p.id for p in rows],
                    'detail':{**evidence,'authors':len(authors),'baseline_start':(start-timedelta(minutes=30)).isoformat(),
                              'baseline_end':start.isoformat(),'baseline_evidence_ids':[p.id for p in previous]}})
        # A transparent threshold alert, not a calibrated virality/probability claim.
        if len(rows)<5 or len(authors)<3:
            continue
        recent=(await db.execute(select(PulseAlert.id).where(PulseAlert.issue_id==issue_id,PulseAlert.kind=='recent_cluster',PulseAlert.created_at>=now-timedelta(hours=2)).limit(1))).first()
        if recent:
            continue
        issue=await db.get(Issue,issue_id)
        bucket=int(now.timestamp()//7200)
        await insert_once(db,PulseAlert,{'id':str(uuid.uuid4()),'dedup_key':f'cluster:{issue_id}:{bucket}',
            'topic_id':topic_id,'issue_id':issue_id,'kind':'recent_cluster','title':issue.title[:500],
            'created_at':now,'window_start':start,'window_end':now,'evidence_ids':[p.id for p in rows],
            'detail':{'rule':'recent_cluster_v1','posts':len(rows),'authors':len(authors),'minimum_posts':5,'minimum_authors':3,'window_minutes':30,'note':'Ambang aktivitas baru; belum merupakan deteksi viral terkalibrasi.'}})


async def finish_job(db, job, result, now):
    token=job.lease_token
    claimed=await db.execute(update(CrawlJob).where(CrawlJob.id==job.id,CrawlJob.status=='running',CrawlJob.lease_token==token,CrawlJob.lease_until>=now).values(status='finishing'))
    if not claimed.rowcount:
        return False
    schedule=await db.get(MonitorSchedule,job.schedule_id)
    if 'items' in result:
        topic=await db.get(WatchTopic,job.topic_id)
        created_ids=set()
        created=await ingest_items(db,topic,result['items'][:PAGE_ROWS],created_ids=created_ids)
        from .pulse_growth_alerts import create_growth_alerts
        await create_growth_alerts(db,topic.id,[row.get('url') for row in result['items'][:PAGE_ROWS]],now)
        if schedule.baseline_at is not None:
            await create_cluster_alerts(db,topic.id,created_ids,now,schedule.baseline_at)
        else:
            schedule.baseline_at=now
        schedule.last_success_at=now
        job.status='succeeded'; job.finished_at=now
        job.result={'fetched':len(result['items'][:PAGE_ROWS]),'ingested':created,'snapshots':len(result['items'][:PAGE_ROWS])}
        if result.get('channels'):   # YouTube: what the channel sweep read, and whether the keyword search was refused
            job.result={**job.result,'search':result.get('search'),'channels':result['channels']}
    else:
        code=result.get('error','provider_error')
        retryable=code in ('timeout','transient_http')
        job.status='retry' if retryable and job.attempts<3 else 'failed'
        job.available_at=now+timedelta(seconds=60*2**(job.attempts-1))
        job.finished_at=None if job.status=='retry' else now
        job.result={'error':code,'message':'Provider attempt failed. Inspect state; no plan upgrades or fallback.'}
        from .pulse_provider_block import block_values
        blocked=block_values(code,now,budget_provider(job.provider))
        if blocked:
            await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider==budget_provider(job.provider)).values(**blocked))
        if job.status=='failed':
            await insert_once(db,PulseAlert,{'id':str(uuid.uuid4()),'dedup_key':f'failure:{job.id}',
                'topic_id':job.topic_id,'kind':'collection_error','title':f'{job.provider}: {code}',
                'created_at':now,'window_start':now,'window_end':now,'evidence_ids':[],'detail':{'job_id':job.id,'error':code}})
    job.lease_until=None
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider==budget_provider(job.provider),WorkerPolicy.lease_token==token).values(lease_until=None,lease_token=None))
    await db.flush()
    return True


CHANNELS_PER_RUN = 150      # YouTube channels read in one scheduled run: 150 units of the shared 10,000 a day
WATCH_DAYS = 7              # how far back a channel's uploads are taken; stored videos are skipped, so a repeat costs little


async def youtube_watch(db, topic_id, now, limit=CHANNELS_PER_RUN):
    """What a scheduled YouTube run reads besides the search: the channels that posted most about this project (then
    most recently), the links already stored, and the day the window starts."""
    from sqlalchemy import func
    channel = func.json_extract(SourceItem.metrics, '$.author_id')
    rows = (await db.execute(select(channel, func.count(), func.max(SourceItem.published_at))
        .where(SourceItem.topic_id == topic_id, SourceItem.platform == 'youtube', channel.is_not(None)).group_by(channel))).all()
    ranked = sorted(rows, key=lambda row: (-row[1], -(row[2].timestamp() if row[2] else 0), row[0]))
    known = (await db.scalars(select(SourceItem.url).where(SourceItem.topic_id == topic_id, SourceItem.platform == 'youtube'))).all()
    return {'channels': [row[0] for row in ranked[:limit]], 'known_urls': set(known), 'since': now - timedelta(days=WATCH_DAYS)}


async def fetch_youtube_with_channels(query, key, watch):
    """The keyword search, then the uploads of the known channels. The two draw on separate daily allowances, so a
    refused search does not fail the run as long as the channels could be read."""
    from .ingest.youtube import fetch_youtube_channel_uploads, fetch_youtube_items
    rows, refused = [], None
    try:
        rows = await fetch_youtube_items(query, key)
    except Exception as exc:
        refused = exc
    channels = (watch or {}).get('channels') or []
    if not channels:
        if refused:
            raise refused
        return {'items': rows}
    try:
        more, stats = await fetch_youtube_channel_uploads(channels, query, key, since=watch['since'],
                                                          known_urls=set(watch.get('known_urls') or ()) | {row['url'] for row in rows})
    except Exception:
        if refused:
            raise refused
        more, stats = [], {'channels': len(channels), 'read': 0, 'matched': 0, 'calls': 0, 'stopped': 'error'}
    if refused and not stats['read']:
        raise refused                      # neither way brought anything: report the search's refusal
    return {'items': more + rows, 'search': 'refused' if refused else 'ok', 'channels': stats}


async def fetch_provider(provider, query, settings, watch=None):
    from .ingest.rss import fetch_rss_items
    from .ingest.xpoz import fetch_xpoz_items, fetch_xpoz_stored_items, fetch_xpoz_social_items
    from .ingest.youtube import fetch_youtube_items
    key=credential(settings,budget_provider(provider).upper()+'_API_KEY') if provider!='rss' else ''
    if provider!='rss' and not key:
        return {'error':'not_configured'}
    try:
        async with asyncio.timeout(120):
            if provider=='rss':
                rows=await fetch_rss_items(query)
            elif provider=='youtube':
                found=await fetch_youtube_with_channels(query,key,watch)
                return {**found,'items':found['items'][:PAGE_ROWS]}
            elif provider=='xpoz':
                fn=fetch_xpoz_items if settings.XPOZ_MODE=='rest_live' else fetch_xpoz_stored_items
                rows=await fn(query,key)
            elif provider in ('instagram','tiktok','reddit'):
                rows=await fetch_xpoz_social_items(query,key,provider,limit=PAGE_ROWS)
            else:
                return {'error':'unsupported'}
        return {'items':rows[:PAGE_ROWS]}
    except Exception as exc:
        error=_provider_error(exc,provider)
        return {'error':'transient_http' if (error.get('http_status') or 0)>=500 else error.get('error','provider_error')}


async def run_lane(provider, session_factory, settings):
    async with session_factory() as db:
        job=await claim_job(db,provider,datetime.utcnow())
        if job is None:
            await db.commit(); return
        topic=await db.get(WatchTopic,job.topic_id)
        job_id,token,query,source=job.id,job.lease_token,topic.query,job.provider
        watch=await youtube_watch(db,topic.id,datetime.utcnow()) if source=='youtube' else None
        await db.commit()  # durable budget reservation BEFORE external request
    result=await fetch_provider(source,query,settings,watch=watch)
    async with session_factory() as db:
        job=await db.get(CrawlJob,job_id)
        if job and job.lease_token==token:
            await finish_job(db,job,result,datetime.utcnow())
        await db.commit()


async def monitor_tick():
    from ..database import async_session
    from ..config import get_settings
    async with async_session() as db:
        await enqueue_due(db,datetime.utcnow()); await db.commit()
    # Three logical workers. Sequential local dispatch keeps SQLite writes simple;
    # durable provider leases still protect against a second process dispatching.
    for provider in PROVIDERS:
        try:
            await run_lane(provider,async_session,get_settings())
        except Exception:
            logger.error('Pulse worker failed internally: %s; lease recovery will preserve reservation',provider)
