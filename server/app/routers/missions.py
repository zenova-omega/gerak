from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import os, uuid
from ..database import get_db
from ..models.user import User
from ..models.mission import Mission, MissionJoin, Submission, JoinStatus
from ..models.xp import XPTransaction
from ..schemas import MissionCreate, MissionUpdate, SubmissionCreate, SubmissionReview
from ..middleware.auth import get_current_user, require_admin
from ..config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("")
async def list_missions(
    type: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Mission)
    if type:
        query = query.where(Mission.type == type)
    if status:
        query = query.where(Mission.status == status)
    query = query.order_by(Mission.created_at.desc())

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    missions = result.scalars().all()

    # Get join status for current user
    join_q = select(MissionJoin).where(
        MissionJoin.user_id == user.id,
        MissionJoin.mission_id.in_([m.id for m in missions])
    )
    joins = {j.mission_id: j.status.value for j in (await db.execute(join_q)).scalars().all()}

    items = []
    for m in missions:
        # Count participants
        pc = await db.execute(
            select(func.count()).where(MissionJoin.mission_id == m.id)
        )
        items.append({
            "id": m.id, "type": m.type.value, "title": m.title,
            "description": m.description, "xp_reward": m.xp_reward,
            "bonus_xp": m.bonus_xp, "deadline": m.deadline,
            "status": m.status.value, "image_url": m.image_url,
            "type_config": m.type_config,
            "participants": pc.scalar(),
            "my_status": joins.get(m.id),
            "created_at": m.created_at,
        })

    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}


@router.get("/{mission_id}")
async def get_mission(mission_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Misi tidak ditemukan")

    # Participant count
    pc = await db.execute(select(func.count()).where(MissionJoin.mission_id == m.id))
    # My join status
    jq = await db.execute(select(MissionJoin).where(MissionJoin.user_id == user.id, MissionJoin.mission_id == m.id))
    my_join = jq.scalar_one_or_none()

    return {
        "id": m.id, "type": m.type.value, "title": m.title,
        "description": m.description, "xp_reward": m.xp_reward,
        "bonus_xp": m.bonus_xp, "deadline": m.deadline,
        "status": m.status.value, "image_url": m.image_url,
        "type_config": m.type_config, "template_captions": m.template_captions,
        "participants": pc.scalar(),
        "my_status": my_join.status.value if my_join else None,
        "my_join_id": my_join.id if my_join else None,
        "created_at": m.created_at,
    }


@router.post("")
async def create_mission(req: MissionCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    mission = Mission(
        type=req.type, title=req.title, description=req.description,
        xp_reward=req.xp_reward, bonus_xp=req.bonus_xp, deadline=req.deadline,
        status=req.status, image_url=req.image_url, kodam_scope=req.kodam_scope,
        type_config=req.type_config, template_captions=req.template_captions,
        created_by=admin.id,
    )
    db.add(mission)
    await db.flush()
    await db.refresh(mission)
    return {"id": mission.id, "title": mission.title, "status": mission.status.value}


@router.put("/{mission_id}")
async def update_mission(mission_id: str, req: MissionUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi tidak ditemukan")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(mission, field, value)
    mission.updated_at = datetime.utcnow()
    return {"id": mission.id, "title": mission.title, "status": mission.status.value}


@router.delete("/{mission_id}")
async def delete_mission(mission_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi tidak ditemukan")
    await db.delete(mission)
    return {"deleted": True}


@router.post("/{mission_id}/join")
async def join_mission(mission_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # Check mission exists
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi tidak ditemukan")

    # Check not already joined
    existing = await db.execute(
        select(MissionJoin).where(MissionJoin.user_id == user.id, MissionJoin.mission_id == mission_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Sudah bergabung dengan misi ini")

    join = MissionJoin(user_id=user.id, mission_id=mission_id)
    db.add(join)
    await db.flush()
    return {"join_id": join.id, "status": join.status.value}


@router.post("/{mission_id}/submit")
async def submit_mission(
    mission_id: str,
    caption: str = "",
    platform: str | None = None,
    post_url: str | None = None,
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Find join
    result = await db.execute(
        select(MissionJoin).where(MissionJoin.user_id == user.id, MissionJoin.mission_id == mission_id)
    )
    join = result.scalar_one_or_none()
    if not join:
        raise HTTPException(status_code=400, detail="Belum bergabung dengan misi ini")
    if join.status not in (JoinStatus.TERDAFTAR, JoinStatus.SUBMITTED):
        raise HTTPException(status_code=400, detail="Misi sudah selesai/dalam review")

    # Handle file upload
    media_url = None
    if file:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        media_url = f"/uploads/{filename}"

    submission = Submission(
        join_id=join.id, user_id=user.id,
        media_url=media_url, caption=caption,
        platform=platform, post_url=post_url,
    )
    db.add(submission)

    join.status = JoinStatus.SUBMITTED
    join.submitted_at = datetime.utcnow()
    await db.flush()
    return {"submission_id": submission.id, "status": "SUBMITTED"}
