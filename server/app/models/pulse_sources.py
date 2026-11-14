"""Additive audit records; external account secrets are never persisted here."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class SourceAccount(Base):
    __tablename__ = 'pulse_source_accounts'
    provider: Mapped[str] = mapped_column(String(20), primary_key=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)


class SourceCollection(Base):
    __tablename__ = 'pulse_source_collections'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), index=True)
    platform: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(24), default='running')
    error: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fetched: Mapped[int] = mapped_column(Integer, default=0)
    ingested: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lease_until: Mapped[datetime] = mapped_column(DateTime)
    lease_token: Mapped[str] = mapped_column(String(36))
