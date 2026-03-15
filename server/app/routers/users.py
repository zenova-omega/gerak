from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models.user import User, FamilyLink
from ..models.mission import MissionJoin
from ..schemas import UserResponse, FamilyAdd
from ..middleware.auth import get_current_user, hash_password
import uuid

router = APIRouter()


@router.get("/leaderboard")
async def leaderboard(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.xp.desc()).limit(limit)
    )
    users = result.scalars().all()
    return [
        {
            "rank": i + 1, "id": u.id, "name": u.name, "xp": u.xp,
            "tier": u.tier.value, "rank_level": u.rank,
            "is_me": u.id == user.id,
        }
        for i, u in enumerate(users)
    ]


@router.get("/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    # Mission stats
    total_missions = (await db.execute(
        select(func.count()).where(MissionJoin.user_id == u.id)
    )).scalar()
    completed = (await db.execute(
        select(func.count()).where(MissionJoin.user_id == u.id, MissionJoin.status == "SELESAI")
    )).scalar()

    return {
        "id": u.id, "nrp": u.nrp, "name": u.name,
        "role": u.role.value, "account_type": u.account_type.value,
        "satuan": u.satuan, "rank": u.rank, "xp": u.xp, "tier": u.tier.value,
        "avatar_url": u.avatar_url, "is_active": u.is_active,
        "total_missions": total_missions, "completed_missions": completed,
        "created_at": u.created_at,
    }


@router.get("/{user_id}/missions")
async def user_missions(
    user_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    from ..models.mission import Mission
    query = (
        select(MissionJoin, Mission)
        .join(Mission, MissionJoin.mission_id == Mission.id)
        .where(MissionJoin.user_id == user_id)
        .order_by(MissionJoin.joined_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "join_id": j.id, "status": j.status.value, "joined_at": j.joined_at,
            "mission": {"id": m.id, "type": m.type.value, "title": m.title, "xp_reward": m.xp_reward},
        }
        for j, m in rows
    ]


@router.get("/{user_id}/family")
async def get_family(user_id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    result = await db.execute(
        select(FamilyLink, User)
        .join(User, FamilyLink.member_id == User.id)
        .where(FamilyLink.prajurit_id == user_id)
    )
    return [
        {
            "id": link.id, "relation": link.relation,
            "member": {"id": u.id, "name": u.name, "xp": u.xp, "account_type": u.account_type.value},
        }
        for link, u in result.all()
    ]


@router.post("/{user_id}/family")
async def add_family(user_id: str, req: FamilyAdd, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    if current.id != user_id:
        raise HTTPException(status_code=403, detail="Hanya bisa menambah keluarga sendiri")

    # Create family member account
    member = User(
        nrp=req.nrp or f"FAM-{uuid.uuid4().hex[:8]}",
        name=req.name,
        password_hash=hash_password("sinar2026"),  # Default password
        role="keluarga",
        account_type=req.relation,
        satuan=current.satuan,
        kodam_id=current.kodam_id,
    )
    db.add(member)
    await db.flush()

    link = FamilyLink(prajurit_id=user_id, member_id=member.id, relation=req.relation)
    db.add(link)
    await db.flush()
    return {"id": link.id, "member_id": member.id, "name": req.name, "relation": req.relation}
