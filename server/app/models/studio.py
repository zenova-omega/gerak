import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class ContentDraft(Base):
    __tablename__ = "content_drafts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kind: Mapped[str] = mapped_column(String(20))  # caption | meme
    prompt: Mapped[str] = mapped_column(Text, default="")
    tone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {variants:[...]} or meme dict
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
