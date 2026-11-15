"""Tanya AI conversations, kept for the person who asked and inside one project."""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref
from ..database import Base


class PulseChatConversation(Base):
    """One conversation. `turns` is a list of what the page showed, oldest first:
    {question, answer, sources, scope, answered_at}. Nothing about the engine that answered is kept here.

    `user_id` is the caller's id as a plain string: a PULSE user on the standalone server, a GERAK admin when embedded."""
    __tablename__ = 'pulse_chat_conversations'
    __table_args__ = (Index('ix_pulse_chat_owner', 'topic_id', 'user_id', 'updated_at'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey('watch_topics.id', ondelete='CASCADE'))
    user_id: Mapped[str] = mapped_column(String(36))
    title: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    turns: Mapped[list] = mapped_column(JSON, default=list)

    # Deleting a project deletes its conversations with it, like its posts and alerts (SQLite does not enforce the foreign key).
    topic = relationship('WatchTopic', backref=backref('chat_conversations', cascade='all, delete-orphan'))
