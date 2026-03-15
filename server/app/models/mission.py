import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Float, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base
import enum


class MissionType(str, enum.Enum):
    EVENT = "EVENT"
    KONTEN = "KONTEN"
    ENGAGEMENT = "ENGAGEMENT"
    EDUKASI = "EDUKASI"
    AKSI = "AKSI"


class MissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    TERBUKA = "TERBUKA"
    SIAGA = "SIAGA"
    PRIORITAS = "PRIORITAS"
    SELESAI = "SELESAI"


class JoinStatus(str, enum.Enum):
    TERDAFTAR = "TERDAFTAR"
    SUBMITTED = "SUBMITTED"
    REVIEW = "REVIEW"
    SELESAI = "SELESAI"


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[MissionType] = mapped_column(SAEnum(MissionType))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    xp_reward: Mapped[int] = mapped_column(Integer, default=200)
    bonus_xp: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[MissionStatus] = mapped_column(SAEnum(MissionStatus), default=MissionStatus.TERBUKA)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    kodam_scope: Mapped[str | None] = mapped_column(String(36), nullable=True)  # null = all kodam

    # Type-specific config (JSON blob for flexibility)
    type_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # EVENT: {location, eventDate, capacity, checkInMethod, lat, lng}
    # KONTEN: {format, duration, platforms, hashtags, guidelines}
    # ENGAGEMENT: {requiredActions, targetPosts}
    # EDUKASI: {materialType, channels, minGroups, minGroupSize}
    # AKSI: {actionType, target, unit, area, method}

    # Template captions
    template_captions: Mapped[list | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    joins = relationship("MissionJoin", back_populates="mission")


class MissionJoin(Base):
    __tablename__ = "mission_joins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    mission_id: Mapped[str] = mapped_column(String(36), ForeignKey("missions.id"))
    status: Mapped[JoinStatus] = mapped_column(SAEnum(JoinStatus), default=JoinStatus.TERDAFTAR)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="mission_joins")
    mission = relationship("Mission", back_populates="joins")
    submission = relationship("Submission", back_populates="join", uselist=False)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    join_id: Mapped[str] = mapped_column(String(36), ForeignKey("mission_joins.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    caption: Mapped[str] = mapped_column(Text, default="")
    platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    post_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # AI review
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    brief_match: Mapped[float | None] = mapped_column(Float, nullable=True)
    brief_checks: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Admin review
    admin_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    reviewed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    join = relationship("MissionJoin", back_populates="submission")
    user = relationship("User", back_populates="submissions")
