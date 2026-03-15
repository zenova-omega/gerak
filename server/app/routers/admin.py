from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models.user import User
from ..models.mission import Mission, MissionJoin, Submission, JoinStatus, MissionStatus
from ..models.xp import XPTransaction
from ..models.broadcast import Broadcast, SystemSetting
from ..schemas import SubmissionReview, BroadcastCreate, SettingUpdate
from ..middleware.auth import require_admin
from datetime import datetime

router = APIRouter()


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    active_users = (await db.execute(
        select(func.count()).where(User.is_active == True)
    )).scalar()
    total_missions = (await db.execute(select(func.count()).select_from(Mission))).scalar()
    active_missions = (await db.execute(
        select(func.count()).where(Mission.status.in_([MissionStatus.TERBUKA, MissionStatus.SIAGA, MissionStatus.PRIORITAS]))
    )).scalar()
    pending_reviews = (await db.execute(
        select(func.count()).where(Submission.admin_status == "pending")
    )).scalar()
    total_xp = (await db.execute(
        select(func.sum(XPTransaction.amount))
    )).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_missions": total_missions,
        "active_missions": active_missions,
        "pending_reviews": pending_reviews,
        "total_xp_distributed": total_xp,
    }


@router.get("/submissions")
async def list_submissions(
    status: str = Query("pending"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = (
        select(Submission, User, Mission)
        .join(User, Submission.user_id == User.id)
        .join(MissionJoin, Submission.join_id == MissionJoin.id)
        .join(Mission, MissionJoin.mission_id == Mission.id)
        .where(Submission.admin_status == status)
        .order_by(Submission.submitted_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    result = await db.execute(query)
    return [
        {
            "id": s.id, "ai_score": s.ai_score, "brief_match": s.brief_match,
            "brief_checks": s.brief_checks, "caption": s.caption,
            "media_url": s.media_url, "platform": s.platform,
            "admin_status": s.admin_status, "submitted_at": s.submitted_at,
            "user": {"id": u.id, "name": u.name, "nrp": u.nrp},
            "mission": {"id": m.id, "title": m.title, "type": m.type.value},
        }
        for s, u, m in result.all()
    ]


@router.put("/submissions/{submission_id}")
async def review_submission(
    submission_id: str,
    req: SubmissionReview,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submisi tidak ditemukan")

    sub.admin_status = req.status
    sub.reviewed_by = admin.id
    sub.reviewed_at = datetime.utcnow()

    if req.status == "approved":
        # Update join status to SELESAI
        join_result = await db.execute(select(MissionJoin).where(MissionJoin.id == sub.join_id))
        join = join_result.scalar_one()
        join.status = JoinStatus.SELESAI
        join.completed_at = datetime.utcnow()

        # Award XP
        mission_result = await db.execute(select(Mission).where(Mission.id == join.mission_id))
        mission = mission_result.scalar_one()

        xp_amount = mission.xp_reward
        xp_tx = XPTransaction(
            user_id=sub.user_id, amount=xp_amount,
            source="mission", mission_id=mission.id,
            description=f"Misi selesai: {mission.title}",
        )
        db.add(xp_tx)

        # Update user XP
        user_result = await db.execute(select(User).where(User.id == sub.user_id))
        user = user_result.scalar_one()
        user.xp += xp_amount

        # Check rank promotion
        rank_thresholds = [0, 1000, 5000, 15000, 50000]
        for i, threshold in enumerate(rank_thresholds):
            if user.xp >= threshold:
                user.rank = i

        # Update tier
        if user.xp >= 5000:
            user.tier = "Gold"
        elif user.xp >= 2000:
            user.tier = "Silver"

    return {"id": sub.id, "status": req.status}


@router.get("/agents")
async def list_agents(
    type: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(User)
    if type and type != "Semua":
        query = query.where(User.account_type == type.lower())
    if search:
        query = query.where(
            User.name.ilike(f"%{search}%") |
            User.nrp.ilike(f"%{search}%") |
            User.satuan.ilike(f"%{search}%")
        )
    query = query.order_by(User.xp.desc())

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)

    return {
        "items": [
            {
                "id": u.id, "nrp": u.nrp, "name": u.name,
                "account_type": u.account_type.value, "satuan": u.satuan,
                "rank": u.rank, "xp": u.xp, "tier": u.tier.value,
                "is_active": u.is_active, "created_at": u.created_at,
            }
            for u in result.scalars().all()
        ],
        "total": total, "page": page, "per_page": per_page,
    }


@router.post("/broadcast")
async def send_broadcast(req: BroadcastCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    # Count target audience
    query = select(func.count()).select_from(User).where(User.is_active == True)
    if req.target_type != "all":
        query = query.where(User.account_type == req.target_type)
    sent_count = (await db.execute(query)).scalar()

    broadcast = Broadcast(
        title=req.title, message=req.message,
        target_type=req.target_type, target_kodam=req.target_kodam,
        priority=req.priority, channel=req.channel,
        sent_by=admin.id, sent_count=sent_count,
    )
    db.add(broadcast)
    await db.flush()
    return {"id": broadcast.id, "sent_count": sent_count}


@router.get("/broadcast")
async def list_broadcasts(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Broadcast).order_by(Broadcast.sent_at.desc()).limit(50))
    return [
        {
            "id": b.id, "title": b.title, "target_type": b.target_type,
            "priority": b.priority, "channel": b.channel,
            "sent_count": b.sent_count, "read_count": b.read_count,
            "sent_at": b.sent_at,
        }
        for b in result.scalars().all()
    ]


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(SystemSetting))
    return {s.key: s.value for s in result.scalars().all()}


@router.put("/settings")
async def update_setting(req: SettingUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == req.key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = req.value
    else:
        db.add(SystemSetting(key=req.key, value=req.value))
    return {"key": req.key, "value": req.value}
