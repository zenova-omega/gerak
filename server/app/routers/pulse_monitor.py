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
from ..services.pulse_monitor import ensure_policies, PROVIDERS, SCHEDULE_PROVIDERS, budget_provider, MIN_GAP_SECONDS
from ..services.pulse import pulse_analytics
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

def alert_dict(row):
    return {**row_dict(row,'id topic_id issue_id kind title created_at window_start window_end evidence_ids detail acknowledged_at acknowledged_by'),
            'workflow': workflow_dict(row)}

@router.get('')
async def state(topic_id:str|None=Query(None),alert_offset:int=Query(0,ge=0),db:AsyncSession=Depends(get_db)):
    from ..services.scheduler import scheduler
    await ensure_policies(db)
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
            'quota_breakdown':quota_rows,'quota_unattributed':unattributed,
            'quota_queue':[{'topic_id':t,'project':label,'source':p,'status':s,'count':n} for t,label,p,s,n in queued],
            'workers':[{**row_dict(p,'provider daily_limit blocked_reason lease_until'),'used':usage.get(p.provider,0),'unlimited':p.daily_limit<0,'min_gap_seconds':MIN_GAP_SECONDS.get(p.provider)} for p in policies],
            'schedules':[row_dict(s,'id topic_id provider enabled interval_minutes next_run_at baseline_at last_success_at') for s in schedules],
            'jobs':[row_dict(j,'id topic_id provider status attempts available_at created_at finished_at result') for j in jobs],
            'job_counts':counts,'alerts':[alert_dict(a) for a in alerts],'unread':unread,'alert_total':alert_total,'alert_offset':alert_offset,'alert_limit':50}

@router.put('/workers/{provider}')
async def configure_worker(provider:str,req:PolicyUpdate,db:AsyncSession=Depends(get_db)):
    if provider not in PROVIDERS:
        raise HTTPException(404,'Unknown provider')
    await ensure_policies(db)
    values={'daily_limit':req.daily_limit}
    if req.clear_block:
        values['blocked_reason']=None
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider==provider).values(**values))
    return {'provider':provider,**values}

@router.put('/topics/{topic_id}/{provider}')
async def configure_schedule(topic_id:str,provider:str,req:ScheduleUpdate,db:AsyncSession=Depends(get_db)):
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
    return row_dict(schedule,'id topic_id provider enabled interval_minutes next_run_at')

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
    starts=[v for v in [alert.window_start,datetime.combine(date_from,time.min)-timedelta(hours=7) if date_from else None] if v is not None]
    ends=[v for v in [alert.window_end,datetime.combine(date_to,time.max)-timedelta(hours=7) if date_to else None] if v is not None]
    data=await pulse_analytics(db,alert.topic_id,issue_id=alert.issue_id,start=max(starts) if starts else None,end=min(ends) if ends else None)
    return {**data,'alert':alert_dict(alert)}

@router.get('/items/{item_id}/snapshots')
async def metric_history(item_id:str,limit:int=Query(100,ge=1,le=200),db:AsyncSession=Depends(get_db)):
    item=await db.get(SourceItem,item_id)
    if item is None: raise HTTPException(404,'Post not found')
    rows=(await db.execute(select(MetricSnapshot).where(MetricSnapshot.item_id==item_id).order_by(MetricSnapshot.observed_at.desc(),MetricSnapshot.id).limit(limit))).scalars().all()
    return {'item_id':item_id,'title':item.title,'url':item.url,'snapshots':[row_dict(r,'id observed_at metrics') for r in reversed(rows)],'limit':limit}
