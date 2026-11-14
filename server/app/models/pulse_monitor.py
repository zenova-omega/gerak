import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

def uid():
    return str(uuid.uuid4())

class WorkerPolicy(Base):
    __tablename__ = 'pulse_worker_policies'
    provider: Mapped[str] = mapped_column(String(20), primary_key=True)
    daily_limit: Mapped[int] = mapped_column(Integer, default=0)
    blocked_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)

class WorkerUsage(Base):
    __tablename__ = 'pulse_worker_usage'
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    provider: Mapped[str] = mapped_column(String(20), index=True)
    day: Mapped[str] = mapped_column(String(10))
    used: Mapped[int] = mapped_column(Integer, default=0)

class MonitorSchedule(Base):
    __tablename__ = 'pulse_monitor_schedules'
    __table_args__ = (UniqueConstraint('topic_id','provider'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    topic_id: Mapped[str] = mapped_column(ForeignKey('watch_topics.id'), index=True)
    provider: Mapped[str] = mapped_column(String(20))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    next_run_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    baseline_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class QuotaReservation(Base):
    """Attribution only; WorkerUsage remains the authoritative atomic cap."""
    __tablename__ = 'pulse_quota_reservations'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    provider: Mapped[str] = mapped_column(String(20), index=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey('watch_topics.id'), index=True)
    platform: Mapped[str] = mapped_column(String(20))
    mode: Mapped[str] = mapped_column(String(20))
    day: Mapped[str] = mapped_column(String(10), index=True)
    reserved_at: Mapped[datetime] = mapped_column(DateTime)

class CrawlJob(Base):
    __tablename__ = 'pulse_crawl_jobs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    schedule_id: Mapped[str] = mapped_column(ForeignKey('pulse_monitor_schedules.id'), index=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey('watch_topics.id'), index=True)
    provider: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(24), default='queued', index=True)
    available_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

class MetricSnapshot(Base):
    __tablename__ = 'pulse_metric_snapshots'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    item_id: Mapped[str] = mapped_column(ForeignKey('source_items.id'), index=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey('watch_topics.id'), index=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)

class PulseAlert(Base):
    __tablename__ = 'pulse_alerts'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dedup_key: Mapped[str] = mapped_column(String(200), unique=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey('watch_topics.id'), index=True)
    issue_id: Mapped[str | None] = mapped_column(ForeignKey('issues.id'), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    window_start: Mapped[datetime] = mapped_column(DateTime)
    window_end: Mapped[datetime] = mapped_column(DateTime)
    evidence_ids: Mapped[list] = mapped_column(JSON, default=list)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
