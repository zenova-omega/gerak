from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..config import get_settings
from ..models.user import User
from ..models.pulse import WatchTopic, Issue, SourceItem
from ..schemas import WatchTopicCreate, WatchTopicUpdate, N8nItem
from ..middleware.auth import require_admin
from ..services.pulse import crawl_topic, ingest_items, enrich_issue

router = APIRouter()


def _topic_dict(t: WatchTopic) -> dict:
    return {
        "id": t.id, "label": t.label, "query": t.query,
        "sources": t.sources, "browserless_targets": t.browserless_targets,
        "is_active": t.is_active, "crawl_interval_minutes": t.crawl_interval_minutes,
        "last_crawled_at": t.last_crawled_at, "created_at": t.created_at,
    }


def _issue_dict(i: Issue) -> dict:
    return {
        "id": i.id, "topic_id": i.topic_id, "title": i.title,
        "item_count": i.item_count, "score": i.score,
        "sentiment": i.sentiment, "summary": i.summary,
        "first_seen_at": i.first_seen_at, "last_seen_at": i.last_seen_at,
    }


@router.get("/topics")
async def list_topics(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).order_by(WatchTopic.created_at.desc()))
    return [_topic_dict(t) for t in result.scalars().all()]


@router.post("/topics")
async def create_topic(req: WatchTopicCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    topic = WatchTopic(
        label=req.label, query=req.query, sources=req.sources,
        browserless_targets=req.browserless_targets,
        crawl_interval_minutes=req.crawl_interval_minutes, created_by=admin.id,
    )
    db.add(topic)
    await db.flush()
    return _topic_dict(topic)


@router.put("/topics/{topic_id}")
async def update_topic(topic_id: str, req: WatchTopicUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).where(WatchTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic tidak ditemukan")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    await db.flush()
    return _topic_dict(topic)


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(WatchTopic).where(WatchTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic tidak ditemukan")
    await db.delete(topic)
    return {"deleted": topic_id}
