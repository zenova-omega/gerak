from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.user import User
from ..models.campaign import Campaign
from ..schemas import CampaignCreate, CampaignUpdate
from ..middleware.auth import require_admin

router = APIRouter()


def _dict(c: Campaign) -> dict:
    return {
        "id": c.id, "name": c.name, "objective": c.objective, "status": c.status,
        "pipeline": c.pipeline or {}, "source_issue_id": c.source_issue_id,
        "created_at": c.created_at,
    }


@router.get("")
async def list_campaigns(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return [_dict(c) for c in result.scalars().all()]


@router.post("")
async def create_campaign(req: CampaignCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    c = Campaign(name=req.name, objective=req.objective, source_issue_id=req.source_issue_id, created_by=admin.id)
    db.add(c)
    await db.flush()
    return _dict(c)


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    c = (await db.execute(select(Campaign).where(Campaign.id == campaign_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign tidak ditemukan")
    return _dict(c)


@router.put("/{campaign_id}")
async def update_campaign(campaign_id: str, req: CampaignUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    c = (await db.execute(select(Campaign).where(Campaign.id == campaign_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign tidak ditemukan")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    await db.flush()
    return _dict(c)


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    c = (await db.execute(select(Campaign).where(Campaign.id == campaign_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign tidak ditemukan")
    await db.delete(c)
    return {"deleted": campaign_id}
