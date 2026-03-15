import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class XPTransaction(Base):
    __tablename__ = "xp_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    amount: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20))  # mission, bonus, reward, admin
    mission_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("missions.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="xp_transactions")


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(255), default="")
    rarity: Mapped[str] = mapped_column(String(20), default="common")  # common, rare, epic, legendary
    icon: Mapped[str] = mapped_column(String(50), default="star")
    criteria: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    badge_id: Mapped[str] = mapped_column(String(36), ForeignKey("badges.id"))
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge")


class ShopItem(Base):
    __tablename__ = "shop_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(255), default="")
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cost_xp: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, default=100)
    category: Mapped[str] = mapped_column(String(50), default="merchandise")
    is_active: Mapped[bool] = mapped_column(default=True)


class ShopOrder(Base):
    __tablename__ = "shop_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    item_id: Mapped[str] = mapped_column(String(36), ForeignKey("shop_items.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    total_xp: Mapped[int] = mapped_column(Integer)
    ordered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
