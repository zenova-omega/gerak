"""Pulse durable queue scheduler. Existing topic is_active no longer authorizes crawling."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .pulse_monitor import monitor_tick

scheduler = AsyncIOScheduler()

async def crawl_due_topics():
    await monitor_tick()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(crawl_due_topics, "interval", seconds=30, id="pulse_monitor", replace_existing=True, max_instances=1, coalesce=True)
        from .pulse_analysis_cycle import analysis_tick
        scheduler.add_job(analysis_tick, 'interval', seconds=10, id='pulse_sentiment', replace_existing=True, max_instances=1, coalesce=True)
        scheduler.start()
