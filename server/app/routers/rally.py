from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.user import User
from ..models.rally import EngagementRally, RallyAck
from ..middleware.auth import get_current_user

router = APIRouter()


def _rally_public(r: EngagementRally) -> dict:
    return {
        "id": r.id, "title": r.title, "post_url": r.post_url,
        "talking_points": r.talking_points, "target": r.target, "status": r.status,
    }


@router.get("/active")
async def active_rallies(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rallies = (await db.execute(
        select(EngagementRally).where(EngagementRally.status == "open").order_by(EngagementRally.created_at.desc())
    )).scalars().all()
    acked = set((await db.execute(
        select(RallyAck.rally_id).where(RallyAck.user_id == user.id)
    )).scalars().all())
    return [_rally_public(r) for r in rallies if r.id not in acked]


@router.post("/{rally_id}/ack")
async def ack_rally(rally_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Self-report that the member engaged (their own like/comment). Consent-based, no automation."""
    rally = (await db.execute(select(EngagementRally).where(EngagementRally.id == rally_id))).scalar_one_or_none()
    if not rally:
        raise HTTPException(status_code=404, detail="Ajakan tidak ditemukan")
    existing = (await db.execute(
        select(RallyAck).where(RallyAck.rally_id == rally_id, RallyAck.user_id == user.id)
    )).scalar_one_or_none()
    if existing:
        return {"acked": True, "already": True}
    db.add(RallyAck(rally_id=rally_id, user_id=user.id))
    await db.flush()
    return {"acked": True, "already": False}
