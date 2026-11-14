from datetime import datetime
from sqlalchemy import String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PulseSummary(Base):
    """The latest AI summary of a project, one per format. Regenerating replaces it."""
    __tablename__ = 'pulse_summaries'
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey('watch_topics.id'), primary_key=True)
    format: Mapped[str] = mapped_column(String(20), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    data: Mapped[dict] = mapped_column(JSON)
