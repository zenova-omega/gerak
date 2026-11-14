from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..config import get_settings
from ..services.pulse_identity import require_pulse_access
from ..services import pulse_sources as service
from ..services.ingest.common import credential
from ..models.pulse import WatchTopic
from ..models.pulse_sources import SourceAccount
from ..services.ingest.xpoz import SOCIAL_TOOLS

router=APIRouter(dependencies=[Depends(require_pulse_access)])


class CollectionRequest(BaseModel):
    topic_id: str = Field(min_length=1,max_length=36)
    platform: Literal['instagram','tiktok']
    limit: int = Field(default=5,ge=1,le=300)
    unlimited: bool = Field(default=False,strict=True)


@router.get('')
async def sources(topic_id:str|None=None,db:AsyncSession=Depends(get_db)):
    if topic_id and await db.get(WatchTopic,topic_id) is None:
        raise HTTPException(404,'Topic not found')
    return await service.coverage(db,get_settings(),topic_id)


@router.post('/check')
async def check(db:AsyncSession=Depends(get_db)):
    await service.check_account(db,get_settings())
    return await service.coverage(db,get_settings())


@router.post('/threads/check')
async def check_threads(db:AsyncSession=Depends(get_db)):
    from ..services.threads_connection import check_connection
    detail=await check_connection(credential(get_settings(),'THREADS_ACCESS_TOKEN'))
    account=await db.get(SourceAccount,'threads')
    if account is None:
        account=SourceAccount(provider='threads'); db.add(account)
    account.detail=detail
    account.checked_at=datetime.utcnow()
    await db.flush()
    return {'checked_at':account.checked_at,**detail}


@router.post('/collect')
async def collect(req:CollectionRequest,db:AsyncSession=Depends(get_db)):
    settings=get_settings()
    if not credential(settings,'XPOZ_API_KEY'):
        raise HTTPException(409,'not_configured')
    account=await db.get(SourceAccount,'xpoz')
    if not account or account.detail.get('status')!='verified':
        raise HTTPException(409,'check_account_first')
    if SOCIAL_TOOLS[req.platform] not in account.detail.get('tools',[]):
        raise HTTPException(409,'tool_unavailable')
    topic=await db.get(WatchTopic,req.topic_id)
    if topic is None:
        raise HTTPException(404,'Topic not found')
    query=topic.query
    if not query.strip() or len(query)>250:
        raise HTTPException(422,'Xpoz query must contain 1–250 characters')
    try:
        run=await service.reserve_collection(db,req.topic_id,req.platform,datetime.utcnow(),unlimited=req.unlimited)
    except service.CollectionBlocked as exc:
        raise HTTPException(409,str(exc)) from None
    await db.commit()  # budget and provider lease durable before any paid search
    result=await service.fetch_collection(query,req.platform,req.limit,settings)
    await service.finish_collection(db,run,result,datetime.utcnow())
    await db.commit()
    return service.attempt_dict(run)
