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
        from datetime import datetime, timedelta
        from .pulse_sources import account_tick, ACCOUNT_SECONDS
        # First read shortly after start, so the balance on Sources is never days old after a restart.
        scheduler.add_job(account_tick, 'interval', seconds=ACCOUNT_SECONDS, id='pulse_account', replace_existing=True, max_instances=1, coalesce=True,
                          next_run_time=datetime.now() + timedelta(seconds=45))
        from .pulse_radar import radar_tick
        # Checks once a minute whether a refresh is due; the refresh itself runs every half hour while its switch is on.
        scheduler.add_job(radar_tick, 'interval', seconds=60, id='pulse_radar', replace_existing=True, max_instances=1, coalesce=True)
        from .pulse_threads_auto import threads_tick, TICK_SECONDS as THREADS_SECONDS
        # Checks every few minutes which projects are due; does nothing without the search key or with the interval at 0.
        scheduler.add_job(threads_tick, 'interval', seconds=THREADS_SECONDS, id='pulse_threads', replace_existing=True, max_instances=1, coalesce=True, misfire_grace_time=120,
                          next_run_time=datetime.now() + timedelta(seconds=90))
        from .pulse_retention import retention_tick
        # Once a day, and first ten minutes after a start: counted from the start alone, a server restarted every day
        # would never reach its turn. The run does nothing while PULSE_RETENTION_DAYS is 0.
        scheduler.add_job(retention_tick, 'interval', hours=24, id='pulse_retention', replace_existing=True, max_instances=1, coalesce=True,
                          next_run_time=datetime.now() + timedelta(minutes=10))
        scheduler.start()
