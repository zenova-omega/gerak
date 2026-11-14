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
        from .pulse_comments_auto import comments_tick, TICK_SECONDS
        scheduler.add_job(comments_tick, 'interval', seconds=TICK_SECONDS, id='pulse_comments', replace_existing=True, max_instances=1, coalesce=True)
        from .pulse_profiles import profiles_tick, TICK_SECONDS as PROFILE_SECONDS
        scheduler.add_job(profiles_tick, 'interval', seconds=PROFILE_SECONDS, id='pulse_profiles', replace_existing=True, max_instances=1, coalesce=True)
        scheduler.start()
