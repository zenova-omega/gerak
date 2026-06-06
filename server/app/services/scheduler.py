"""Periodic Pulse crawl via APScheduler."""
from datetime import datetime
from sqlalchemy import select
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from ..database import async_session
from ..config import get_settings
from ..models.pulse import WatchTopic
from .pulse import crawl_topic

scheduler = AsyncIOScheduler()


async def crawl_due_topics():
    settings = get_settings()
    async with async_session() as db:
        topics = (await db.execute(
            select(WatchTopic).where(WatchTopic.is_active == True)  # noqa: E712
        )).scalars().all()
        now = datetime.utcnow()
        for topic in topics:
            due = (
                topic.last_crawled_at is None
                or (now - topic.last_crawled_at).total_seconds() >= topic.crawl_interval_minutes * 60
            )
            if due:
                try:
                    await crawl_topic(db, topic, settings)
                except Exception:
                    pass
        await db.commit()


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(crawl_due_topics, "interval", minutes=5, id="pulse_crawl", replace_existing=True)
        scheduler.start()
