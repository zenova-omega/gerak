from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class SentimentJob(Base):
    __tablename__ = 'pulse_sentiment_jobs'
    item_id: Mapped[str] = mapped_column(String(36), ForeignKey('source_items.id'), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default='pending', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str | None] = mapped_column(String(40), nullable=True)


class SentimentLane(Base):
    __tablename__ = 'pulse_sentiment_lane'
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    lease_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
