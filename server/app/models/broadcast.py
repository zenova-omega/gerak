import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class Broadcast(Base):
    __tablename__ = "broadcasts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    target_type: Mapped[str] = mapped_column(String(50), default="all")  # all, prajurit, suami, istri, anak
    target_kodam: Mapped[str | None] = mapped_column(String(36), nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="normal")  # normal, urgent
    channel: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ["push", "in-app", "whatsapp"]
    sent_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    read_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Kodam(Base):
    __tablename__ = "kodam"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    city: Mapped[str] = mapped_column(String(100))
    lat: Mapped[float | None] = mapped_column(nullable=True)
    lng: Mapped[float | None] = mapped_column(nullable=True)
    region: Mapped[str] = mapped_column(String(50), default="")


class SystemSetting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
