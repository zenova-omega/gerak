from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.user import User
from ..models.studio import ContentDraft
from ..schemas import CaptionRequest, MemeRequest, DraftCreate
from ..middleware.auth import require_admin
from ..services.studio import generate_captions, generate_meme

router = APIRouter()


@router.post("/captions")
async def captions(req: CaptionRequest, admin: User = Depends(require_admin)):
    n = max(1, min(req.n, 8))
    variants = await generate_captions(req.prompt, req.tone, n, req.custom)
    return {"tone": req.tone, "variants": variants}


@router.post("/meme")
async def meme(req: MemeRequest, admin: User = Depends(require_admin)):
    return await generate_meme(req.prompt, req.custom)


def _draft_dict(d: ContentDraft) -> dict:
    return {
        "id": d.id, "kind": d.kind, "prompt": d.prompt, "tone": d.tone,
        "payload": d.payload, "created_at": d.created_at,
    }


@router.get("/drafts")
async def list_drafts(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ContentDraft).order_by(ContentDraft.created_at.desc()).limit(100))
    return [_draft_dict(d) for d in result.scalars().all()]


@router.post("/drafts")
async def create_draft(req: DraftCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    draft = ContentDraft(kind=req.kind, prompt=req.prompt, tone=req.tone, payload=req.payload, created_by=admin.id)
    db.add(draft)
    await db.flush()
    return _draft_dict(draft)


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(ContentDraft).where(ContentDraft.id == draft_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft tidak ditemukan")
    await db.delete(draft)
    return {"deleted": draft_id}
