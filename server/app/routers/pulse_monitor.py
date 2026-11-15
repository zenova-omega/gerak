from datetime import datetime, date, time, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services.pulse_identity import require_pulse_access as require_admin
from ..models.user import User
from ..models.pulse import WatchTopic, SourceItem
from ..models.pulse_monitor import WorkerPolicy, WorkerUsage, MonitorSchedule, CrawlJob, MetricSnapshot, PulseAlert, QuotaReservation
from ..services.pulse_public import lane_for_reader, lane_from_reader, lanes_for_reader
from ..services.pulse_monitor import ensure_policies, PROVIDERS, SCHEDULE_PROVIDERS, budget_provider, source_platform, MIN_GAP_SECONDS
from ..services.pulse import pulse_analytics
from ..services.pulse_measures import local_day, period_closed_bounds
from ..services.pulse_alert_workflow import workflow_dict, update_workflow

router=APIRouter(dependencies=[Depends(require_admin)])

class PolicyUpdate(BaseModel):
    # -1 = no local daily cap (paced by MIN_GAP_SECONDS instead); 0 = lane off.
    daily_limit: int = Field(ge=-1,le=144)
    clear_block: bool = False

class ScheduleUpdate(BaseModel):
    enabled: bool
    interval_minutes: int = Field(ge=5,le=1440)

class AlertWorkflowUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    status: Literal['new', 'reviewing', 'done']
    assignee: str | None = Field(default=None, max_length=120, strict=True)
    expected_revision: int = Field(ge=0, strict=True)

def row_dict(row,fields):
    return {key:getattr(row,key) for key in fields.split()}

def named(row):
    """A row that carries a lane in `provider`, with the lane named for a reader."""
    return {**row,'provider':lane_for_reader(row['provider'])}

def alert_dict(row):
    data={**row_dict(row,'id topic_id issue_id kind title created_at window_start window_end evidence_ids detail acknowledged_at acknowledged_by'),
          'workflow': workflow_dict(row)}
    if row.kind=='collection_error' and ': ' in (row.title or ''):
        # Stored as "<lane>: <error code>". The lane leaves under its public name; the record keeps the real one.
        lane,code=row.title.split(': ',1)
        data['title']=f'{lane_for_reader(lane)}: {code}'
    return data

# Monitor overview: the two windows a scheduled collection is counted in, and how a job's status reads to a person.
# A cancelled job was withdrawn when its schedule was paused, so it was never planned. Any other open status is waiting.
OVERVIEW_WINDOWS=(('day',timedelta(hours=24)),('week',timedelta(days=7)))
OVERVIEW_OUTCOME={'succeeded':'succeeded','failed':'failed','interrupted':'failed'}

async def collection_overview(db,topic_id,now):
    """Per source: stored posts and the publication dates they span, the last time one was collected, and how many of
    the collections scheduled in the last 24 hours and 7 days succeeded. Reads only; schedule keys become platforms."""
    rows={}
    def row(platform):
        return rows.setdefault(platform,{'platform':platform,'posts':0,'first_published_at':None,'last_published_at':None,
            'days_with_posts':0,'last_collected_at':None,
            'runs':{name:{'planned':0,'succeeded':0,'failed':0,'waiting':0} for name,_ in OVERVIEW_WINDOWS}})
    stored=select(SourceItem.platform,func.count(),func.min(SourceItem.published_at),func.max(SourceItem.published_at),
        func.max(SourceItem.crawled_at)).where(SourceItem.platform.is_not(None))
    # Days with posts are days of the installation's zone (day_v1), counted from each distinct publication time.
    stamps=select(SourceItem.platform,SourceItem.published_at).where(SourceItem.platform.is_not(None),SourceItem.published_at.is_not(None)).distinct()
    if topic_id:
        stored=stored.where(SourceItem.topic_id==topic_id)
        stamps=stamps.where(SourceItem.topic_id==topic_id)
    days={}
    for platform,published in (await db.execute(stamps)).all():
        days.setdefault(platform,set()).add(local_day(published))
    for platform,posts,first,last,collected in (await db.execute(stored.group_by(SourceItem.platform))).all():
        row(platform).update(posts=posts,first_published_at=first,last_published_at=last,days_with_posts=len(days.get(platform,())),last_collected_at=collected)
    for name,span in OVERVIEW_WINDOWS:
        planned=select(CrawlJob.provider,CrawlJob.status,func.count()).where(CrawlJob.created_at>=now-span,CrawlJob.status!='cancelled')
        if topic_id:
            planned=planned.where(CrawlJob.topic_id==topic_id)
        for provider,status,count in (await db.execute(planned.group_by(CrawlJob.provider,CrawlJob.status))).all():
            runs=row(source_platform(provider))['runs'][name]
            runs['planned']+=count
            runs[OVERVIEW_OUTCOME.get(status,'waiting')]+=count
    return {'since':{name:now-span for name,span in OVERVIEW_WINDOWS},'sources':sorted(rows.values(),key=lambda r:r['platform'])}

@router.get('')
async def state(topic_id:str|None=Query(None),alert_offset:int=Query(0,ge=0),db:AsyncSession=Depends(get_db)):
    from ..services.scheduler import scheduler
    from ..services.pulse_comments_auto import ensure_comment_policy
    from ..services.pulse_profiles import ensure_profile_policy
    from ..services.pulse_radar import ensure_policy as ensure_radar_policy
    await ensure_policies(db)
    await ensure_comment_policy(db)
    await ensure_profile_policy(db)
    await ensure_radar_policy(db)
    now=datetime.utcnow(); day=now.date().isoformat()
    policies=(await db.execute(select(WorkerPolicy).order_by(WorkerPolicy.provider))).scalars().all()
    usage={u.provider:u.used for u in (await db.execute(select(WorkerUsage).where(WorkerUsage.day==day))).scalars()}
    schedule_query=select(MonitorSchedule)
    job_query=select(CrawlJob)
    count_query=select(CrawlJob.status,func.count())
    alert_query=select(PulseAlert)
    if topic_id:
        schedule_query=schedule_query.where(MonitorSchedule.topic_id==topic_id)
        job_query=job_query.where(CrawlJob.topic_id==topic_id)
        count_query=count_query.where(CrawlJob.topic_id==topic_id)
        alert_query=alert_query.where(PulseAlert.topic_id==topic_id)
    # Apply project scope before pagination; quotas/worker usage remain global.
    schedules=(await db.execute(schedule_query)).scalars().all()
    jobs=(await db.execute(job_query.order_by(CrawlJob.created_at.desc(),CrawlJob.id).limit(50))).scalars().all()
    alert_total=await db.scalar(select(func.count()).select_from(alert_query.subquery()))
    alerts=(await db.execute(alert_query.order_by(PulseAlert.created_at.desc(),PulseAlert.id).offset(alert_offset).limit(50))).scalars().all()
    unread=await db.scalar(select(func.count()).select_from(alert_query.where(PulseAlert.acknowledged_at.is_(None)).subquery()))
    counts=dict((await db.execute(count_query.group_by(CrawlJob.status))).all())
    # Global attribution deliberately spans projects, like the shared caps above.
    breakdown=(await db.execute(select(QuotaReservation.provider,QuotaReservation.topic_id,WatchTopic.label,QuotaReservation.platform,QuotaReservation.mode,func.count())
        .join(WatchTopic,WatchTopic.id==QuotaReservation.topic_id).where(QuotaReservation.day==day)
        .group_by(QuotaReservation.provider,QuotaReservation.topic_id,WatchTopic.label,QuotaReservation.platform,QuotaReservation.mode))).all()
    quota_rows=[{'provider':p,'topic_id':t,'project':label,'platform':platform,'mode':mode,'used':count} for p,t,label,platform,mode,count in breakdown]
    unattributed={p.provider:max(0,usage.get(p.provider,0)-sum(r['used'] for r in quota_rows if r['provider']==p.provider)) for p in policies}
    queued=(await db.execute(select(CrawlJob.topic_id,WatchTopic.label,CrawlJob.provider,CrawlJob.status,func.count())
        .join(WatchTopic,WatchTopic.id==CrawlJob.topic_id).join(MonitorSchedule,MonitorSchedule.id==CrawlJob.schedule_id)
        .where(MonitorSchedule.enabled==True,CrawlJob.status.in_(['queued','retry','running']))
        .group_by(CrawlJob.topic_id,WatchTopic.label,CrawlJob.provider,CrawlJob.status))).all()
    return {'server_time':now,'quota_day_utc':day,'scheduler_running':scheduler.running,
            'quota_breakdown':[{**row,'provider':lane_for_reader(row['provider'])} for row in quota_rows],'quota_unattributed':lanes_for_reader(unattributed),
            'quota_queue':[{'topic_id':t,'project':label,'source':lane_for_reader(p),'status':s,'count':n} for t,label,p,s,n in queued],
            'workers':[{**named(row_dict(p,'provider daily_limit blocked_reason blocked_until lease_until')),'used':usage.get(p.provider,0),'unlimited':p.daily_limit<0,'min_gap_seconds':MIN_GAP_SECONDS.get(p.provider)} for p in policies],
            'schedules':[named(row_dict(s,'id topic_id provider enabled interval_minutes next_run_at baseline_at last_success_at')) for s in schedules],
            'jobs':[named(row_dict(j,'id topic_id provider status attempts available_at created_at finished_at result')) for j in jobs],
            'job_counts':counts,'alerts':[alert_dict(a) for a in alerts],'unread':unread,'alert_total':alert_total,'alert_offset':alert_offset,'alert_limit':50,
            'overview':await collection_overview(db,topic_id,now)}

@router.put('/workers/{provider}')
async def configure_worker(provider:str,req:PolicyUpdate,db:AsyncSession=Depends(get_db)):
    provider=lane_from_reader(provider)
    from ..services.pulse_comments_auto import PROVIDER as COMMENTS, ensure_comment_policy
    from ..services.pulse_profiles import PROVIDER as PROFILES, X_PROVIDER as PROFILES_X, IG_PROVIDER as PROFILES_IG, TT_PROVIDER as PROFILES_TT, ensure_profile_policy
    from ..services.pulse_radar import PROVIDER as RADAR, SOCIAL as RADAR_SOCIAL, ensure_policy as ensure_radar_policy
    if provider not in PROVIDERS and provider not in (COMMENTS, PROFILES, PROFILES_X, PROFILES_IG, PROFILES_TT, RADAR, RADAR_SOCIAL):
        raise HTTPException(404,'Unknown provider')
    await ensure_policies(db)
    await ensure_comment_policy(db)
    await ensure_profile_policy(db)
    await ensure_radar_policy(db)
    values={'daily_limit':req.daily_limit}
    if req.clear_block:
        values['blocked_reason']=None
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider==provider).values(**values))
    return {'provider':lane_for_reader(provider),**values}

@router.put('/topics/{topic_id}/{provider}')
async def configure_schedule(topic_id:str,provider:str,req:ScheduleUpdate,db:AsyncSession=Depends(get_db)):
    provider=lane_from_reader(provider)
    if provider not in SCHEDULE_PROVIDERS or await db.get(WatchTopic,topic_id) is None:
        raise HTTPException(404,'Topic/provider not found')
    await ensure_policies(db)
    policy=await db.get(WorkerPolicy,budget_provider(provider))
    if req.enabled and (policy.daily_limit==0 or policy.blocked_reason):
        raise HTTPException(409,'Set positive daily worker limit and resolve provider block before enabling')
    schedule=(await db.execute(select(MonitorSchedule).where(MonitorSchedule.topic_id==topic_id,MonitorSchedule.provider==provider))).scalar_one_or_none()
    if schedule is None:
        schedule=MonitorSchedule(topic_id=topic_id,provider=provider)
        db.add(schedule)
    schedule.enabled=req.enabled; schedule.interval_minutes=req.interval_minutes
    schedule.next_run_at=datetime.utcnow()
    await db.flush()
    if not req.enabled:
        await db.execute(update(CrawlJob).where(CrawlJob.schedule_id==schedule.id,CrawlJob.status.in_(['queued','retry']))
                         .values(status='cancelled',finished_at=datetime.utcnow()))
    return named(row_dict(schedule,'id topic_id provider enabled interval_minutes next_run_at'))

@router.put('/alerts/{alert_id}/workflow')
async def set_alert_workflow(alert_id: str, req: AlertWorkflowUpdate,
                             db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    alert = await update_workflow(db, alert_id, **req.model_dump(), actor=admin.id)
    return alert_dict(alert)

@router.post('/alerts/{alert_id}/ack')
async def acknowledge(alert_id:str,db:AsyncSession=Depends(get_db),admin:User=Depends(require_admin)):
    alert=await db.get(PulseAlert,alert_id)
    if alert is None: raise HTTPException(404,'Alert not found')
    await db.execute(update(PulseAlert).where(PulseAlert.id==alert_id,PulseAlert.acknowledged_at.is_(None))
                     .values(acknowledged_at=datetime.utcnow(),acknowledged_by=admin.id))
    await db.refresh(alert)
    return alert_dict(alert)

@router.get('/alerts/{alert_id}/analysis')
async def alert_analysis(alert_id:str,db:AsyncSession=Depends(get_db),date_from:date|None=Query(None,alias='from'),date_to:date|None=Query(None,alias='to')):
    alert=await db.get(PulseAlert,alert_id)
    if alert is None: raise HTTPException(404,'Alert not found')
    if not alert.issue_id:
        raise HTTPException(409,'Collection alerts have no issue spread; inspect worker status')
    if date_from and date_to and date_from>date_to:
        raise HTTPException(422,'Tanggal akhir harus sama atau setelah tanggal mulai.')
    first,last=period_closed_bounds(date_from,date_to)
    starts=[v for v in [alert.window_start,first] if v is not None]
    ends=[v for v in [alert.window_end,last] if v is not None]
    data=await pulse_analytics(db,alert.topic_id,issue_id=alert.issue_id,start=max(starts) if starts else None,end=min(ends) if ends else None)
    return {**data,'alert':alert_dict(alert)}

@router.get('/items/{item_id}/snapshots')
async def metric_history(item_id:str,limit:int=Query(100,ge=1,le=200),db:AsyncSession=Depends(get_db)):
    item=await db.get(SourceItem,item_id)
    if item is None: raise HTTPException(404,'Post not found')
    rows=(await db.execute(select(MetricSnapshot).where(MetricSnapshot.item_id==item_id).order_by(MetricSnapshot.observed_at.desc(),MetricSnapshot.id).limit(limit))).scalars().all()
    return {'item_id':item_id,'title':item.title,'url':item.url,'snapshots':[row_dict(r,'id observed_at metrics') for r in reversed(rows)],'limit':limit}
