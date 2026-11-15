"""The issue radar: what was loud in Indonesia at each refresh, outside any project."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


def uid():
    return str(uuid.uuid4())


class RadarRun(Base):
    """One refresh. `state`: ok (composed, every list read), partial (composed, something missing), raw (lists read
    but not composed into issues), failed (nothing read). `raw` keeps the head of each list for the fallback view."""
    __tablename__ = 'pulse_radar_runs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    started_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    state: Mapped[str] = mapped_column(String(10))
    missing: Mapped[list] = mapped_column(JSON, default=list)
    provinces_read: Mapped[list] = mapped_column(JSON, default=list)
    brief: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    usage: Mapped[dict] = mapped_column(JSON, default=dict)


class RadarIssue(Base):
    """One issue of one refresh. `key` names the same story across refreshes. Figures, provinces and evidence are
    copied from the signals the issue was built on, so a row can always show where it came from."""
    __tablename__ = 'pulse_radar_issues'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    run_id: Mapped[str] = mapped_column(ForeignKey('pulse_radar_runs.id'), index=True)
    key: Mapped[str] = mapped_column(String(40), index=True)
    scope: Mapped[str] = mapped_column(String(10))
    rank: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(300), default='')
    score: Mapped[float] = mapped_column(Float, default=0)
    platforms: Mapped[dict] = mapped_column(JSON, default=dict)
    regions: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    query: Mapped[dict] = mapped_column(JSON, default=dict)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime)
