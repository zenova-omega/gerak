from datetime import datetime
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PulseAccountProfile(Base):
    """Public profile fields of one source account: picture and follower count.

    `key` is the provider's account id (X, YouTube) or the publisher name in lower case (news).
    `checked_at` empty means the account is known (a publisher and its site) but not looked up yet.
    """
    __tablename__ = 'pulse_account_profiles'
    platform: Mapped[str] = mapped_column(String(20), primary_key=True)
    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    photo_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    followers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    site_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
