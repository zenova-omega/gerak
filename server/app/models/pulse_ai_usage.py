from datetime import datetime
from sqlalchemy import DateTime, Integer, String, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class AIUsageDay(Base):
    """What the hosted model reported for one day, one lane of work and one model. Kept so spend survives a restart."""
    __tablename__ = 'pulse_ai_usage'
    id: Mapped[str] = mapped_column(String(100), primary_key=True)   # day|lane|model
    day: Mapped[str] = mapped_column(String(10), index=True)
    lane: Mapped[str] = mapped_column(String(30))
    model: Mapped[str] = mapped_column(String(60))
    calls: Mapped[int] = mapped_column(Integer, default=0)
    input_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    cached_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    output_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    reasoning_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_ticks: Mapped[int] = mapped_column(BigInteger, default=0)   # ten billion to the dollar


class AIBatch(Base):
    """One batch of posts sent to the hosted service's batch interface (20% cheaper, results within about a day)."""
    __tablename__ = 'pulse_ai_batches'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)      # the service's batch id
    state: Mapped[str] = mapped_column(String(10), default='open', index=True)     # open, done or closed (cancelled or expired)
    requests: Mapped[int] = mapped_column(Integer, default=0)
    collected: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
