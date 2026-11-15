from datetime import datetime
from sqlalchemy import String, DateTime, Integer, LargeBinary
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
    # The picture itself, for sources whose picture links stop working after a few days (Instagram). Loaded only when
    # asked for by column: `photo_type` alone says whether one is stored.
    photo_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    photo_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    # X only. `location` is the free text the owner wrote on the profile ("Jakarta Selatan", "Bumi"): a statement about
    # the account, never where a post was written. `based_in` is the country or region the platform itself names for the
    # account. `location_at` is when both were last asked; empty means not asked yet, also for an account whose picture
    # was looked up before locations were kept.
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    based_in: Mapped[str | None] = mapped_column(String(80), nullable=True)
    location_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
