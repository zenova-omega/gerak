from sqlalchemy import String, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PulseProjectSettings(Base):
    """Per-project settings that are not part of the query itself (how far back to collect, last run)."""
    __tablename__ = 'pulse_project_settings'
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey('watch_topics.id'), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
