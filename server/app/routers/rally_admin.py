from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models.user import User
from ..models.rally import EngagementRally, RallyAck
from ..schemas import RallyCreate
from ..middleware.auth import require_admin

router = APIRouter()


async def _ack_count(db: AsyncSession, rally_id: str) -> int:
    return (await db.execute(
        select(func.count()).select_from(RallyAck).where(RallyAck.rally_id == rally_id)
    )).scalar() or 0


def _rally_dict(r: EngagementRally, ack_count: int = 0) -> dict:
    return {
        "id": r.id, "title": r.title, "post_url": r.post_url,
        "talking_points": r.talking_points, "target": r.target, "status": r.status,
        "ack_count": ack_count, "created_at": r.created_at,
    }


@router.get("")
async def list_rallies(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    rallies = (await db.execute(select(EngagementRally).order_by(EngagementRally.created_at.desc()))).scalars().all()
    return [_rally_dict(r, await _ack_count(db, r.id)) for r in rallies]


@router.post("")
async def create_rally(req: RallyCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    rally = EngagementRally(
        title=req.title, post_url=req.post_url, talking_points=req.talking_points,
        target=req.target, created_by=admin.id,
    )
    db.add(rally)
    await db.flush()
    return _rally_dict(rally, 0)


@router.delete("/{rally_id}")
async def delete_rally(rally_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(EngagementRally).where(EngagementRally.id == rally_id))
    rally = result.scalar_one_or_none()
    if not rally:
        raise HTTPException(status_code=404, detail="Ajakan tidak ditemukan")
    await db.delete(rally)
    return {"deleted": rally_id}
