"""Automatic comment collection for monitored projects.

Each monitored project keeps comments for its TOP_POSTS most-commented posts. Ticks run back to back
until that set is complete, then only pick up posts that newly enter it. Each post is one provider
request; the worker policy `comments` in Monitor can cap the daily count (default: no cap) or turn the
lane off with 0. Posts without a result stay for a later tick.
"""
import logging
from datetime import datetime
from sqlalchemy import select, update
from ..models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
from .pulse_comments import AUTO_TOP_POSTS, collect_project_comments
from .pulse_lock import CrawlInProgress, topic_crawl_guard
from .pulse_monitor import UNLIMITED, insert_once

logger = logging.getLogger(__name__)
PROVIDER = 'comments'
DEFAULT_DAILY_LIMIT = UNLIMITED   # the top-posts target bounds the work; Monitor can set a daily cap
TOP_POSTS = AUTO_TOP_POSTS        # per project, by comment count
BATCH = 10                        # posts per tick
TICK_SECONDS = 20                 # ticks never overlap, so a slow batch simply delays the next one


async def ensure_comment_policy(db):
    await insert_once(db, WorkerPolicy, {'provider': PROVIDER, 'daily_limit': DEFAULT_DAILY_LIMIT})


async def auto_collect(db, settings, now):
    """One bounded step. Returns what happened so the caller (and tests) can see why nothing ran."""
    # Rows are created only when missing: an insert, even one that changes nothing, takes SQLite's single
    # write lock, and this session stays open while the provider answers.
    policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
    if policy is None:
        await ensure_comment_policy(db)
        policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
    if policy.daily_limit == 0 or policy.blocked_reason:
        return {'status': 'off'}
    day = now.date().isoformat()
    usage_id = PROVIDER + ':' + day
    usage = await db.get(WorkerUsage, usage_id, populate_existing=True)
    if usage is None:
        await insert_once(db, WorkerUsage, {'id': usage_id, 'provider': PROVIDER, 'day': day, 'used': 0})
        usage = await db.get(WorkerUsage, usage_id, populate_existing=True)
    used = usage.used
    room = BATCH if policy.daily_limit == UNLIMITED else min(BATCH, policy.daily_limit - used)
    if room <= 0:
        return {'status': 'daily_limit'}
    topics = sorted(set((await db.execute(select(MonitorSchedule.topic_id).where(MonitorSchedule.enabled.is_(True)))).scalars()))
    if not topics:
        return {'status': 'no_monitored_project'}
    start = (int(now.timestamp()) // 60) % len(topics)   # take turns between projects, a minute each
    for topic_id in topics[start:] + topics[:start]:
        try:
            async with topic_crawl_guard(topic_id):
                result = await collect_project_comments(db, topic_id, settings, max_posts=room, top=TOP_POSTS)
        except CrawlInProgress:
            continue
        if result['posts']:
            await db.execute(update(WorkerUsage).where(WorkerUsage.id == usage_id).values(used=WorkerUsage.used + len(result['posts'])))
            return {'status': 'collected' if result['comments'] or not result['stopped'] else 'provider_stopped', 'topic_id': topic_id, 'posts': len(result['posts']),
                    'comments': result['comments'], 'stopped': result['stopped']}
    return {'status': 'nothing_waiting'}


_paused_until = 0.0


async def comments_tick():
    global _paused_until
    from ..database import async_session
    from ..config import get_settings
    if datetime.utcnow().timestamp() < _paused_until:
        return
    try:
        async with async_session() as db:
            result = await auto_collect(db, get_settings(), datetime.utcnow())
            await db.commit()
        if result['status'] == 'collected':
            logger.info('Pulse comments: %s posts, %s comments', result['posts'], result['comments'])
        elif result['status'] == 'provider_stopped':
            # Quota, plan or credential problem: wait before asking again instead of repeating the failure every tick.
            _paused_until = datetime.utcnow().timestamp() + 1800
        elif result['status'] in ('nothing_waiting', 'no_monitored_project', 'off'):
            # The top posts all have comments. Each check reads the whole project, so look again in ten minutes, not in twenty seconds.
            _paused_until = datetime.utcnow().timestamp() + 600
    except Exception:
        logger.error('Pulse comment collection failed internally; the next tick retries')
