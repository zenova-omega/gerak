"""Analyst annotations are separate from source data and machine sentiment."""
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PostReview(Base):
    __tablename__ = 'pulse_post_reviews'
    __table_args__ = (
        CheckConstraint("relevance IN ('relevant','irrelevant','unreviewed')"),
        CheckConstraint("manual_sentiment IS NULL OR manual_sentiment IN ('positive','neutral','negative')"),
    )
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey('watch_topics.id', ondelete='CASCADE'), primary_key=True)
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey('source_items.id', ondelete='CASCADE'), primary_key=True)
    relevance: Mapped[str] = mapped_column(String(16), default='unreviewed')
    manual_sentiment: Mapped[str | None] = mapped_column(String(16), nullable=True)
    review_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    analyst_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
