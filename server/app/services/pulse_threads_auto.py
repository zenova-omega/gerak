"""Threads collected by itself: the full public search for every monitored project, every `PULSE_THREADS_AUTO_MINUTES`.

A project is monitored when it has at least one schedule switched on, so a project made tomorrow is picked up without
anyone adding it here. Each run is the complete search of the project's day range (every search word, every page) and
is paid per window of rows; the same post read again only refreshes its numbers. Nothing is capped locally: the worker
stops a round only when the source refuses, and asks again by itself on a later round, so collection resumes after a
top-up. Every run is recorded in the run log the Sources page reads.

No database session is open while the source is asked.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select

from ..models.pulse import PulseCrawlRun, WatchTopic
from ..models.pulse_monitor import MonitorSchedule
from .ingest.common import credential
from .ingest.socialcrawl import fetch_socialcrawl_threads_items

logger = logging.getLogger(__name__)
TICK_SECONDS = 300
HALTING = ('credits', 'token', 'permission', 'quota', 'network')    # the next project would be refused the same way


def minutes_between_runs(settings):
    """How often each project is searched, or 0 when the automatic lane is off (no key, or the setting at 0)."""
    minutes = getattr(settings, 'PULSE_THREADS_AUTO_MINUTES', 0)
    return minutes if credential(settings, 'SOCIALCRAWL_API_KEY') and isinstance(minutes, int) and minutes > 0 else 0


async def last_runs(db, topic_ids):
    """{project: when its latest Threads run started}, manual runs included."""
    if not topic_ids:
        return {}
    rows = await db.execute(select(PulseCrawlRun.topic_id, func.max(PulseCrawlRun.started_at))
                            .where(PulseCrawlRun.topic_id.in_(topic_ids), func.json_extract(PulseCrawlRun.providers, '$.threads').is_not(None))
                            .group_by(PulseCrawlRun.topic_id))
    return dict(rows.all())


async def due_projects(db, now, minutes):
    """Monitored projects whose last Threads run is at least `minutes` old, longest-waiting first: [(id, query, days)]."""
    from . import pulse_lookback
    monitored = (await db.scalars(select(MonitorSchedule.topic_id).where(MonitorSchedule.enabled.is_(True)).distinct())).all()
    last = await last_runs(db, monitored)
    waiting = sorted((topic_id for topic_id in monitored if last.get(topic_id) is None or last[topic_id] <= now - timedelta(minutes=minutes)),
                     key=lambda topic_id: (last.get(topic_id) is not None, last.get(topic_id), topic_id))
    due = []
    for topic_id in waiting:
        topic = await db.get(WatchTopic, topic_id)
        if topic is not None and (topic.query or '').strip():
            due.append((topic.id, topic.query, (await pulse_lookback.read(db, topic.id))['days']))
    return due


def outcome_of(stats, fetched, ingested):
    """One run as the run log keeps it."""
    return {'status': 'failed' if stats['stopped'] else 'success', 'fetched': fetched, 'ingested': ingested, 'error': stats['stopped'],
            'searches': stats['searches'], 'read': stats['read'], 'public_search': True, 'credits': stats.get('credits'),
            'credits_remaining': stats.get('credits_remaining')}


async def store_run(db, topic_id, items, stats, started, now):
    """Store what one run read and record the run. Returns the number of new posts; the caller commits."""
    from .pulse import ingest_items
    topic = await db.get(WatchTopic, topic_id)
    if topic is None:
        return 0
    ingested = await ingest_items(db, topic, items) if items else 0
    db.add(PulseCrawlRun(topic_id=topic.id, manual=False, started_at=started, finished_at=now, ingested=ingested,
                         providers={'threads': outcome_of(stats, len(items), ingested)}))
    await db.flush()
    return ingested


async def collect_due(session_factory, settings, now=None):
    """One round: every due project in turn. Returns [(project, stats)] for the projects asked."""
    minutes = minutes_between_runs(settings)
    if not minutes:
        return []
    key = credential(settings, 'SOCIALCRAWL_API_KEY')
    async with session_factory() as db:
        due = await due_projects(db, now or datetime.utcnow(), minutes)
    done = []
    for topic_id, query, days in due:
        started = datetime.utcnow()
        items, stats = await fetch_socialcrawl_threads_items(query, key, since=started - timedelta(days=days))
        async with session_factory() as db:
            await store_run(db, topic_id, items, stats, started, datetime.utcnow())
            await db.commit()
        done.append((topic_id, stats))
        if stats['stopped'] in HALTING:
            break
    return done


async def threads_tick():
    from ..config import get_settings
    from ..database import async_session
    try:
        for topic_id, stats in await collect_due(async_session, get_settings()):
            logger.info('Pulse Threads: project %s read %s, matched %s, credits %s, stopped %s',
                        topic_id, stats['read'], stats['matched'], stats.get('credits'), stats['stopped'])
    except Exception:
        logger.exception('Pulse Threads collection failed internally')
