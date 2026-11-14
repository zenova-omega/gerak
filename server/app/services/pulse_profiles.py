"""Profile pictures and follower counts for the accounts already collected.

Most providers send a post without its author's picture. This worker looks each account up once
(X and YouTube in batches, a news publisher by its own site icon), stores the answer, and analytics
attaches it to that account's posts. Only monitored projects are looked up, busiest accounts first.

Two worker policies in Monitor cap the daily number of lookups (0 turns a lane off):
`profiles` for YouTube channels and publisher sites, which cost no provider credit, and
`profiles_x` for X accounts, which the provider charges for (measured: about 2 credits an account),
so that lane is off until someone switches it on.
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy import func, select, update
from ..models.pulse import SourceItem
from ..models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
from ..models.pulse_profiles import PulseAccountProfile
from .ingest.site_icon import fetch_site_icon, public_site
from .ingest.xpoz import XpozToolError, fetch_xpoz_profiles
from .ingest.youtube import fetch_youtube_channels
from .pulse_monitor import UNLIMITED, insert_once

logger = logging.getLogger(__name__)
PROVIDER = 'profiles'
DEFAULT_DAILY_LIMIT = 144   # lookups a day: one YouTube batch covers 50 channels, one site one publisher
X_PROVIDER = 'profiles_x'
X_DEFAULT_DAILY_LIMIT = 0   # off by default: every account costs provider credit
TICK_SECONDS = 90
REFRESH_DAYS = 30           # pictures and follower counts change slowly
X_BATCH, YOUTUBE_BATCH, NEWS_BATCH = 25, 50, 4   # a small X batch keeps one request near 50 credits


def profile_key(platform, author, metrics):
    """How an account is recognised across its posts, or None when the post does not identify one."""
    if platform in ('x', 'youtube'):
        value = (metrics or {}).get('author_id')
        return str(value)[:200] if value else None
    if platform == 'news':
        return author.strip().casefold()[:200] if isinstance(author, str) and author.strip() else None
    return None


async def attach_profiles(db, posts):
    """Add the stored picture and follower count to posts that do not carry their own."""
    wanted = {}
    for post in posts:
        key = profile_key(post.get('platform'), post.get('author'), post.get('metrics'))
        if key:
            wanted.setdefault((post['platform'], key), []).append(post)
    for platform in {platform for platform, _ in wanted}:
        keys = [key for p, key in wanted if p == platform]
        for start in range(0, len(keys), 500):
            rows = (await db.execute(select(PulseAccountProfile).where(
                PulseAccountProfile.platform == platform, PulseAccountProfile.key.in_(keys[start:start + 500])))).scalars()
            for row in rows:
                for post in wanted[(platform, row.key)]:
                    metrics = post['metrics']
                    if row.photo_url and not metrics.get('profile_image_url'):
                        metrics['profile_image_url'] = row.photo_url
                    if row.followers is not None and metrics.get('author_followers') is None:
                        metrics['author_followers'] = row.followers


async def waiting_accounts(db, now):
    """Accounts of monitored projects without a fresh profile, per platform, busiest first.

    News entries are (key, site); a publisher whose site the feed has not named yet cannot be looked up.
    """
    topics = sorted(set((await db.execute(select(MonitorSchedule.topic_id).where(MonitorSchedule.enabled.is_(True)))).scalars()))
    waiting = {'x': [], 'youtube': [], 'news': []}
    if not topics:
        return waiting
    known = {(row.platform, row.key): row for row in (await db.execute(select(PulseAccountProfile))).scalars()}
    stale = now - timedelta(days=REFRESH_DAYS)
    account = SourceItem.metrics['author_id'].as_string()
    rows = (await db.execute(select(SourceItem.platform, account, func.count()).where(
        SourceItem.topic_id.in_(topics), SourceItem.platform.in_(('x', 'youtube')), account.isnot(None))
        .group_by(SourceItem.platform, account).order_by(func.count().desc()))).all()
    for platform, key, _ in rows:
        key = str(key)[:200]
        row = known.get((platform, key))
        if row is None or row.checked_at is None or row.checked_at < stale:
            waiting[platform].append(key)
    site = func.max(SourceItem.metrics['source_url'].as_string())
    rows = (await db.execute(select(SourceItem.author, site, func.count()).where(
        SourceItem.topic_id.in_(topics), SourceItem.platform == 'news', SourceItem.author.isnot(None))
        .group_by(SourceItem.author).order_by(func.count().desc()))).all()
    seen = set()
    for author, source_url, _ in rows:
        key = profile_key('news', author, None)
        row = known.get(('news', key))
        address = public_site(source_url) or (row.site_url if row else None)
        if not key or key in seen or not address or (row is not None and row.checked_at is not None and row.checked_at >= stale):
            continue
        seen.add(key)
        waiting['news'].append((key, address))
    return waiting


async def _store(db, platform, key, now, *, photo_url=None, followers=None, site_url=None):
    row = await db.get(PulseAccountProfile, (platform, key))
    if row is None:
        row = PulseAccountProfile(platform=platform, key=key)
        db.add(row)
    # A lookup that returns nothing keeps the picture already stored: a transient miss must not blank an account.
    row.photo_url = photo_url or row.photo_url
    row.followers = followers if followers is not None else row.followers
    row.site_url = site_url or row.site_url
    row.checked_at = now


async def _allowance(db, provider, day):
    """(usage row id, lookups left today) for one lane; (None, 0) when the lane is switched off or blocked."""
    policy = await db.get(WorkerPolicy, provider, populate_existing=True)
    if policy.daily_limit == 0 or policy.blocked_reason:
        return None, 0
    usage_id = provider + ':' + day
    await insert_once(db, WorkerUsage, {'id': usage_id, 'provider': provider, 'day': day, 'used': 0})
    used = (await db.get(WorkerUsage, usage_id, populate_existing=True)).used
    return usage_id, (10 ** 6 if policy.daily_limit == UNLIMITED else policy.daily_limit - used)


def _secret(settings, name):
    value = getattr(settings, name, '')
    return value.get_secret_value() if hasattr(value, 'get_secret_value') else value


async def plan_lookups(db, settings, now):
    """What this step will look up, from the policies and the waiting list.

    Only reads and one cheap insert: the caller commits and closes the session right after, because
    the lookups that follow take up to a minute and SQLite has a single writer.
    """
    await ensure_profile_policy(db)
    day = now.date().isoformat()
    usage_id, room = await _allowance(db, PROVIDER, day)
    x_usage_id, x_room = await _allowance(db, X_PROVIDER, day)
    if usage_id is None and x_usage_id is None:
        return {'status': 'off'}
    if room <= 0 and x_room <= 0:
        return {'status': 'daily_limit'}
    waiting = await waiting_accounts(db, now)
    plan = {'x': [], 'youtube': [], 'news': [], 'usage_id': usage_id, 'x_usage_id': x_usage_id}
    if x_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['x'] = [key for key in waiting['x'] if key.isdigit()][:X_BATCH]
    if room > 0 and _secret(settings, 'YOUTUBE_API_KEY'):
        plan['youtube'] = waiting['youtube'][:YOUTUBE_BATCH]
    plan['news'] = waiting['news'][:max(0, min(NEWS_BATCH, room - bool(plan['youtube'])))]
    return {'status': 'planned' if plan['x'] or plan['youtube'] or plan['news'] else 'nothing_waiting', **plan}


async def run_lookups(plan, settings):
    """The network part of a step. No database session is open while this runs."""
    found, stopped = {'x': None, 'youtube': None, 'news': {}}, []
    if plan['x']:
        try:
            found['x'] = await fetch_xpoz_profiles(plan['x'], _secret(settings, 'XPOZ_API_KEY'))
        except XpozToolError as exc:
            stopped.append(str(exc))
        except Exception:
            stopped.append('provider_error')
    if plan['youtube']:
        try:
            found['youtube'] = await fetch_youtube_channels(plan['youtube'], _secret(settings, 'YOUTUBE_API_KEY'))
        except Exception:
            stopped.append('provider_error')
    for key, address in plan['news']:
        found['news'][key] = (await fetch_site_icon(address), address)
    return found, stopped


async def store_lookups(db, plan, found, stopped, now):
    """Write what the lookups returned and charge the two policies. A refused batch stores nothing, so it is asked again."""
    done = {'x': 0, 'youtube': 0, 'news': 0}
    for platform in ('x', 'youtube'):
        if found[platform] is not None:
            for key in plan[platform]:
                await _store(db, platform, key, now, **found[platform].get(key, {}))
            done[platform] = len(plan[platform])
    for key, (photo_url, address) in found['news'].items():
        await _store(db, 'news', key, now, photo_url=photo_url, site_url=address)
        done['news'] += 1
    lookups, x_lookups = bool(plan['youtube']) + len(plan['news']), int(bool(plan['x']))
    for row_id, count in ((plan['usage_id'], lookups), (plan['x_usage_id'], x_lookups)):
        if row_id and count:
            await db.execute(update(WorkerUsage).where(WorkerUsage.id == row_id).values(used=WorkerUsage.used + count))
    return {'status': 'provider_stopped' if stopped and not any(done.values()) else 'collected', 'accounts': done,
            'lookups': lookups, 'x_lookups': x_lookups, 'stopped': stopped}


async def collect_profiles(db, settings, now):
    """One bounded step on a single session: at most one X batch (if that lane is on), one YouTube batch and a few sites.

    For tests and one-off runs. The scheduler runs the same three phases in `profiles_tick`, with the
    session closed during the lookups.
    """
    plan = await plan_lookups(db, settings, now)
    if plan['status'] != 'planned':
        return {'status': plan['status']}
    found, stopped = await run_lookups(plan, settings)
    return await store_lookups(db, plan, found, stopped, now)


async def ensure_profile_policy(db):
    await insert_once(db, WorkerPolicy, {'provider': PROVIDER, 'daily_limit': DEFAULT_DAILY_LIMIT})
    await insert_once(db, WorkerPolicy, {'provider': X_PROVIDER, 'daily_limit': X_DEFAULT_DAILY_LIMIT})


_paused_until = 0.0


async def profiles_tick():
    global _paused_until
    from ..database import async_session
    from ..config import get_settings
    if datetime.utcnow().timestamp() < _paused_until:
        return
    settings = get_settings()
    try:
        async with async_session() as db:
            plan = await plan_lookups(db, settings, datetime.utcnow())
            await db.commit()
        if plan['status'] != 'planned':
            return
        found, stopped = await run_lookups(plan, settings)   # no session open: the database stays free for the other workers
        async with async_session() as db:
            result = await store_lookups(db, plan, found, stopped, datetime.utcnow())
            await db.commit()
        if result['status'] == 'collected':
            logger.info('Pulse profiles: %s', result['accounts'])
        if result['stopped']:
            # Quota, plan or credential problem: wait before asking again instead of repeating the failure every tick.
            _paused_until = datetime.utcnow().timestamp() + 1800
    except Exception:
        logger.error('Pulse profile lookup failed internally; the next tick retries')
