"""Additive response jobs; never store analysis inside SourceItem.metrics."""
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class ResponseAnalysisJob(Base):
    __tablename__ = 'pulse_response_analysis_jobs'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    post_id: Mapped[str] = mapped_column(String(36), index=True)
    subject_id: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(10), index=True)
    content_target_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str | None] = mapped_column(String(40), nullable=True)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Position of a comment in its post's stored list (0 = most liked): the most-liked comments are analysed first.
    comment_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ResponseAnalysisCursor(Base):
    __tablename__ = 'pulse_response_analysis_cursor'
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    offset: Mapped[int] = mapped_column(Integer, default=0)
    next_kind: Mapped[str] = mapped_column(String(10), default='comment')
