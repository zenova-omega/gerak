import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base
import enum


class Role(str, enum.Enum):
    ADMIN = "admin"
    PRAJURIT = "prajurit"
    KELUARGA = "keluarga"


class AccountType(str, enum.Enum):
    PRAJURIT = "prajurit"
    SUAMI = "suami"
    ISTRI = "istri"
    ANAK = "anak"


class RankLevel(int, enum.Enum):
    PRAJURIT = 0
    KOPRAL = 1
    SERSAN = 2
    LETNAN = 3
    KAPTEN = 4


class Tier(str, enum.Enum):
    BRONZE = "Bronze"
    SILVER = "Silver"
    GOLD = "Gold"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nrp: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role), default=Role.PRAJURIT)
    account_type: Mapped[AccountType] = mapped_column(SAEnum(AccountType), default=AccountType.PRAJURIT)
    kodam_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("kodam.id"), nullable=True)
    satuan: Mapped[str] = mapped_column(String(100), default="")
    rank: Mapped[int] = mapped_column(Integer, default=0)  # RankLevel index
    xp: Mapped[int] = mapped_column(Integer, default=0)
    tier: Mapped[Tier] = mapped_column(SAEnum(Tier), default=Tier.BRONZE)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    submissions = relationship("Submission", back_populates="user")
    mission_joins = relationship("MissionJoin", back_populates="user")
    xp_transactions = relationship("XPTransaction", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")


class FamilyLink(Base):
    __tablename__ = "family_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prajurit_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    member_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    relation: Mapped[str] = mapped_column(String(20))  # suami, istri, anak
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
