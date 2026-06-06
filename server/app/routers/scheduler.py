from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.scheduler import ConnectedAccount, ScheduledPost
from ..schemas import AccountCreate, ScheduledPostCreate, ScheduledPostUpdate
from ..middleware.auth import require_admin

router = APIRouter()


def _account_dict(a: ConnectedAccount) -> dict:
    return {"id": a.id, "label": a.label, "platform": a.platform, "handle": a.handle,
            "status": a.status, "created_at": a.created_at}


def _post_dict(p: ScheduledPost) -> dict:
    return {"id": p.id, "caption": p.caption, "media_url": p.media_url, "platforms": p.platforms or [],
            "scheduled_at": p.scheduled_at, "status": p.status, "published_at": p.published_at,
            "created_at": p.created_at}


# ── Connected accounts (mock "connect"; real OAuth deferred) ──
@router.get("/accounts")
async def list_accounts(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ConnectedAccount).order_by(ConnectedAccount.created_at.desc()))
    return [_account_dict(a) for a in result.scalars().all()]


@router.post("/accounts")
async def add_account(req: AccountCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    acc = ConnectedAccount(label=req.label, platform=req.platform, handle=req.handle, created_by=admin.id)
    db.add(acc)
    await db.flush()
    return _account_dict(acc)


@router.delete("/accounts/{account_id}")
async def remove_account(account_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ConnectedAccount).where(ConnectedAccount.id == account_id))
    acc = result.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    await db.delete(acc)
    return {"deleted": account_id}


# ── Scheduled posts ──
@router.get("/posts")
async def list_posts(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ScheduledPost).order_by(ScheduledPost.scheduled_at.desc().nullslast()))
    return [_post_dict(p) for p in result.scalars().all()]


@router.post("/posts")
async def create_post(req: ScheduledPostCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    post = ScheduledPost(caption=req.caption, media_url=req.media_url, platforms=req.platforms,
                         scheduled_at=req.scheduled_at, created_by=admin.id)
    db.add(post)
    await db.flush()
    return _post_dict(post)


@router.put("/posts/{post_id}")
async def update_post(post_id: str, req: ScheduledPostUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ScheduledPost).where(ScheduledPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post tidak ditemukan")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    await db.flush()
    return _post_dict(post)


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ScheduledPost).where(ScheduledPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post tidak ditemukan")
    await db.delete(post)
    return {"deleted": post_id}


@router.post("/posts/{post_id}/publish")
async def publish_post(post_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Mock publish (real platform APIs deferred to OAuth integration)."""
    result = await db.execute(select(ScheduledPost).where(ScheduledPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post tidak ditemukan")
    post.status = "published"
    post.published_at = datetime.utcnow()
    await db.flush()
    return _post_dict(post)
