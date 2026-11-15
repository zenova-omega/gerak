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
            'running': topic_id in _running, 'last_run': data.get('lookback_run'), 'progress': read_progress(topic_id)}


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


# Sources that do not share a provider run side by side, so a new project fills within minutes instead of one source
# after another. X is the long one (a page of 100 posts at a time); Instagram and TikTok share its provider and follow
# each other.
LANES = (('news', 'youtube'), ('x',), ('instagram', 'tiktok', 'reddit'))
# Minutes. Instagram and TikTok run as often as X since 15 Nov 2026: one keyword search returns few rows there, so
# coverage comes from asking often. Each run is a paid search.
DEFAULT_INTERVALS = {'rss': 15, 'xpoz': 120, 'youtube': 180, 'instagram': 120, 'tiktok': 120, 'reddit': 360}
_progress: dict[str, dict] = {}


def read_progress(topic_id):
    """What the running (or last) pull of this project has collected so far, per platform; None before the first pull."""
    return _progress.get(topic_id)


async def enable_schedules(db, topic, providers, now):
    """Switch on recurring collection for a new project, so collection goes on after its first pull.
    A schedule someone already set is left alone, and a lane switched off or blocked in Monitor stays off.
    The first scheduled run comes one interval later: the first pull covers the present. Returns the providers switched on."""
    from ..models.pulse_monitor import WorkerPolicy
    from .pulse_monitor import SCHEDULE_PROVIDERS, budget_provider, ensure_policies
    await ensure_policies(db)
    switched = []
    for provider in dict.fromkeys(providers):
        if provider not in SCHEDULE_PROVIDERS:
            continue
        policy = await db.get(WorkerPolicy, budget_provider(provider))
        if policy is None or policy.daily_limit == 0 or policy.blocked_reason:
            continue
        existing = (await db.execute(select(MonitorSchedule).where(MonitorSchedule.topic_id == topic.id, MonitorSchedule.provider == provider))).scalar_one_or_none()
        if existing is None:
            minutes = DEFAULT_INTERVALS[provider]
            db.add(MonitorSchedule(topic_id=topic.id, provider=provider, enabled=True, interval_minutes=minutes, next_run_at=now + timedelta(minutes=minutes)))
            switched.append(provider)
    await db.flush()
    return switched


async def run(topic_id, days, session_factory, settings):
    """Pull the last `days` days for every source of the project: everything each source has, newest day first.
    One run per project at a time. Progress per platform can be read while it works (`read_progress`)."""
    if topic_id in _running:
        return
    _running.add(topic_id)
    started, results = datetime.utcnow(), {}
    try:
        end = started.date()
        start = end - timedelta(days=days - 1)
        async with session_factory() as db:
            topic = await db.get(WatchTopic, topic_id)
            platforms = await project_platforms(db, topic) if topic else []
        state = {'started_at': started.isoformat() + 'Z', 'finished': False,
                 'platforms': {platform: {'state': 'waiting', 'fetched': 0, 'ingested': 0, 'stopped': None} for platform in platforms}}
        _progress[topic_id] = state

        async def lane(names):
            for platform in names:
                if platform not in platforms:
                    continue
                row = state['platforms'][platform]
                row['state'] = 'running'
                try:
                    async with session_factory() as db:
                        topic = await db.get(WatchTopic, topic_id)
                        result = await backfill(db, topic, settings, platform, start, end, release=db.commit, newest_first=True,
                                                progress=lambda fetched, stored, row=row: row.update(fetched=fetched, ingested=stored))
                        await db.commit()
                    results[platform] = {'platform': platform, 'fetched': result['fetched'], 'ingested': result['ingested'], 'stopped': result['stopped']}
                except Exception:
                    logger.error('Pulse lookback failed for one platform; continuing with the next')
                    results[platform] = {'platform': platform, 'fetched': 0, 'ingested': 0, 'stopped': 'provider_error'}
                row.update(state='done', fetched=results[platform]['fetched'], ingested=results[platform]['ingested'], stopped=results[platform]['stopped'])

        for attempt in range(6):   # another crawl of this project may be running; wait for it
            try:
                async with topic_crawl_guard(topic_id):
                    await asyncio.gather(*(lane(names) for names in LANES))
                break
            except CrawlInProgress:
                await asyncio.sleep(10)
        else:
            for platform in platforms:
                results.setdefault(platform, {'platform': platform, 'fetched': 0, 'ingested': 0, 'stopped': 'busy'})
                state['platforms'][platform].update(state='done', stopped='busy')
    finally:
        _running.discard(topic_id)
        if topic_id in _progress:
            _progress[topic_id]['finished'] = True
        try:
            async with session_factory() as db:
                await _write(db, topic_id, lookback_run={'days': days, 'started_at': started.isoformat() + 'Z',
                                                         'finished_at': datetime.utcnow().isoformat() + 'Z',
                                                         'results': [results[platform] for platform in results]})
                await db.commit()
        except Exception:
            logger.error('Pulse lookback result could not be saved')


async def save(db, topic_id, days):
    if days not in CHOICES:
        raise ValueError('Pilih 7, 14, atau 30 hari.')
    await _write(db, topic_id, lookback_days=days)
