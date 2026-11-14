import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Float, Boolean, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class WatchTopic(Base):
    __tablename__ = "watch_topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    label: Mapped[str] = mapped_column(String(200))
    query: Mapped[str] = mapped_column(String(500))
    sources: Mapped[list | None] = mapped_column(JSON, default=lambda: ["rss"])
    browserless_targets: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    crawl_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    issues = relationship("Issue", back_populates="topic", cascade="all, delete-orphan")
    items = relationship("SourceItem", back_populates="topic", cascade="all, delete-orphan")
    crawl_runs = relationship("PulseCrawlRun", cascade="all, delete-orphan")
    monitor_jobs = relationship("CrawlJob", cascade="all, delete-orphan")
    monitor_schedules = relationship("MonitorSchedule", cascade="all, delete-orphan")
    metric_snapshots = relationship("MetricSnapshot", cascade="all, delete-orphan")
    alerts = relationship("PulseAlert", cascade="all, delete-orphan")
    seed = relationship("PulseProjectSeed", uselist=False, lazy="selectin", cascade="all, delete-orphan")


class PulseProjectSeed(Base):
    __tablename__ = "pulse_project_seeds"
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("watch_topics.id"), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class PulseCrawlRun(Base):
    __tablename__ = "pulse_crawl_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("watch_topics.id"))
    manual: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ingested: Mapped[int] = mapped_column(Integer, default=0)
    providers: Mapped[dict] = mapped_column(JSON, default=dict)


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("watch_topics.id"))
    title: Mapped[str] = mapped_column(String(500), default="")
    simhash: Mapped[str] = mapped_column(String(16), default="0000000000000000")
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    reach_total: Mapped[int] = mapped_column(Integer, default=0)
    engagement_total: Mapped[int] = mapped_column(Integer, default=0)
    platforms: Mapped[list | None] = mapped_column(JSON, default=lambda: [])
    sentiment: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic = relationship("WatchTopic", back_populates="issues")
    source_items = relationship("SourceItem", back_populates="issue")


class SourceItem(Base):
    __tablename__ = "source_items"
    __table_args__ = (Index('uq_pulse_topic_url', 'topic_id', 'url', unique=True),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("watch_topics.id"))
    issue_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("issues.id"), nullable=True)
    source: Mapped[str] = mapped_column(String(20))
    platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    url: Mapped[str] = mapped_column(String(1000))
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str | None] = mapped_column(String(200), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    simhash: Mapped[str] = mapped_column(String(16), default="0000000000000000")
    crawled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    topic = relationship("WatchTopic", back_populates="items")
    issue = relationship("Issue", back_populates="source_items")
    sentiment_job = relationship('SentimentJob', uselist=False, cascade='all, delete-orphan')
