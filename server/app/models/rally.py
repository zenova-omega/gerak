import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class EngagementRally(Base):
    """A consent-based engagement reminder: admin points outlets at a post;
    each member chooses to like/comment themselves and self-reports. No automation."""
    __tablename__ = "engagement_rallies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(300))
    post_url: Mapped[str] = mapped_column(String(1000))
    talking_points: Mapped[str] = mapped_column(Text, default="")  # suggestions; each member writes their own
    target: Mapped[str] = mapped_column(String(200), default="Semua outlet")
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | closed
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RallyAck(Base):
    """Self-reported acknowledgement that a member engaged (their own action)."""
    __tablename__ = "rally_acks"
    __table_args__ = (UniqueConstraint("rally_id", "user_id", name="uq_rally_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rally_id: Mapped[str] = mapped_column(String(36), ForeignKey("engagement_rallies.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    acked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
