"""How far back a project collects when it is set up.

The regular collectors only ask for the newest posts, so a new project used to start with whatever was
posted that day. A project now has a lookback (7, 14 or 30 days): saving it pulls that range once per
source through the archive pull, in the background, and records what came back.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from ..models.pulse import WatchTopic
from ..models.pulse_monitor import MonitorSchedule
from ..models.pulse_settings import PulseProjectSettings
from .pulse_backfill import PLATFORMS, backfill
from .pulse_lock import CrawlInProgress, topic_crawl_guard

logger = logging.getLogger(__name__)
CHOICES = (7, 14, 30)
DEFAULT_DAYS = 7
SOURCE_PLATFORM = {provider: platform for platform, provider in PLATFORMS.items()}   # rss -> news, xpoz -> x
_running: set[str] = set()


async def read(db, topic_id):
    row = await db.get(PulseProjectSettings, topic_id)
    data = dict(row.data or {}) if row else {}
    return {'days': data.get('lookback_days') or DEFAULT_DAYS, 'choices': list(CHOICES),
            'running': topic_id in _running, 'last_run': data.get('lookback_run')}


async def _write(db, topic_id, **values):
    row = await db.get(PulseProjectSettings, topic_id)
    if row is None:
        row = PulseProjectSettings(topic_id=topic_id, data={})
        db.add(row)
    row.data = {**(row.data or {}), **values}
    await db.flush()


async def project_platforms(db, topic):
    providers = set(topic.sources or ['rss'])
    providers |= set((await db.scalars(select(MonitorSchedule.provider).where(MonitorSchedule.topic_id == topic.id, MonitorSchedule.enabled.is_(True)))).all())
    return [SOURCE_PLATFORM[provider] for provider in ('rss', 'xpoz', 'instagram', 'tiktok', 'youtube', 'reddit') if provider in providers]


async def run(topic_id, days, session_factory, settings):
    """Pull the last `days` days for every source of the project. One run per project at a time."""
    if topic_id in _running:
        return
    _running.add(topic_id)
    started, results = datetime.utcnow(), []
    try:
        end = started.date()
        start = end - timedelta(days=days - 1)
        async with session_factory() as db:
            topic = await db.get(WatchTopic, topic_id)
            platforms = await project_platforms(db, topic) if topic else []
        for platform in platforms:
            for attempt in range(6):   # another crawl of this project may be running; wait for it
                try:
                    async with topic_crawl_guard(topic_id):
                        async with session_factory() as db:
                            topic = await db.get(WatchTopic, topic_id)
                            result = await backfill(db, topic, settings, platform, start, end)
                            await db.commit()
                    results.append({'platform': platform, 'fetched': result['fetched'], 'ingested': result['ingested'], 'stopped': result['stopped']})
                    break
                except CrawlInProgress:
                    await asyncio.sleep(10)
                except Exception:
                    logger.error('Pulse lookback failed for one platform; continuing with the next')
                    results.append({'platform': platform, 'fetched': 0, 'ingested': 0, 'stopped': 'provider_error'})
                    break
            else:
                results.append({'platform': platform, 'fetched': 0, 'ingested': 0, 'stopped': 'busy'})
    finally:
        _running.discard(topic_id)
        try:
            async with session_factory() as db:
                await _write(db, topic_id, lookback_run={'days': days, 'started_at': started.isoformat() + 'Z',
                                                         'finished_at': datetime.utcnow().isoformat() + 'Z', 'results': results})
                await db.commit()
        except Exception:
            logger.error('Pulse lookback result could not be saved')


async def save(db, topic_id, days):
    if days not in CHOICES:
        raise ValueError('Pilih 7, 14, atau 30 hari.')
    await _write(db, topic_id, lookback_days=days)
