import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PulseUser(Base):
    __tablename__ = 'pulse_users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default='viewer')
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class PulseSession(Base):
    __tablename__ = 'pulse_sessions'
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('pulse_users.id'))
    csrf: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class PulseLoginBudget(Base):
    __tablename__ = 'pulse_login_budgets'
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    used: Mapped[int] = mapped_column(Integer, default=0)


class PulseAudit(Base):
    __tablename__ = 'pulse_audit'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
