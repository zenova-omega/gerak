"""Profile pictures, follower counts and (for X) profile locations for the accounts already collected.

Most providers send a post without its author's picture. This worker looks each account up once
(X and YouTube in batches, a news publisher by its own site icon), stores the answer, and analytics
attaches it to that account's posts. Only monitored projects are looked up, busiest accounts first.
The X lookup also returns the location the owner wrote on the profile; the spread map draws it.

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
import re
from urllib.parse import parse_qs, quote, urlsplit
from .ingest.site_icon import fetch_image, fetch_site_icon, public_site
from .ingest.xpoz import XpozToolError, fetch_xpoz_instagram_user, fetch_xpoz_profiles, fetch_xpoz_tiktok_user
from .ingest.youtube import fetch_youtube_channels
from .pulse_monitor import UNLIMITED, insert_once

logger = logging.getLogger(__name__)
PROVIDER = 'profiles'
DEFAULT_DAILY_LIMIT = UNLIMITED   # free lookups, one per account and then remembered: the number of accounts bounds the work
X_PROVIDER = 'profiles_x'
# The paid photo lanes run without a daily cap, as the owner asked on 14 Nov 2026 ("pakai pencarian berbayar untuk semua
# akun, jangan di limit"). Each account is bought once: X about 2 credits, TikTok 5, Instagram 12. Monitor can cap or
# switch off any lane; an empty balance stops them and is announced in the app.
X_DEFAULT_DAILY_LIMIT = UNLIMITED
IG_PROVIDER = 'profiles_ig'
IG_DEFAULT_DAILY_LIMIT = UNLIMITED   # needed only for accounts whose picture links had died before the picture was saved
TT_PROVIDER = 'profiles_tt'
TT_DEFAULT_DAILY_LIMIT = UNLIMITED   # TikTok posts carry no picture, so every account needs one lookup
IG_BATCH, IG_LOOKUP_BATCH, TT_LOOKUP_BATCH = 8, 4, 6   # pictures saved from live links (free) and paid lookups, per step
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
    if platform in ('instagram', 'tiktok'):
        # The username: it is what the provider looks an account up by, and every post carries it.
        name = (metrics or {}).get('author_username') or author
        name = name.strip().lstrip('@').casefold() if isinstance(name, str) else ''
        return name if re.fullmatch(r'[a-z0-9_.]{1,%d}' % (30 if platform == 'instagram' else 24), name) else None
    return None


def link_expires(url):
    """When a signed picture link stops working (its `oe` value), or None when the link carries no such date."""
    try:
        value = parse_qs(urlsplit(url).query).get('oe', [None])[0] if isinstance(url, str) else None
        return datetime.utcfromtimestamp(int(value, 16)) if value else None
    except (ValueError, OverflowError, OSError):
        return None


def photo_path(platform, key, checked_at):
    """Where the app reads a stored picture, relative to the API base. `v` changes when the picture does."""
    return f"/admin/pulse/profiles/photo/{platform}/{quote(key, safe='')}?v={int(checked_at.timestamp()) if checked_at else 0}"


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
                    if row.photo_type:
                        # A picture kept here outlives the post's own link, and the browser asks nobody else for it.
                        metrics['profile_image_url'] = photo_path(platform, row.key, row.checked_at)
                    elif row.photo_url and not metrics.get('profile_image_url'):
                        metrics['profile_image_url'] = row.photo_url
                    if row.followers is not None and metrics.get('author_followers') is None:
                        metrics['author_followers'] = row.followers
                    if row.location_at is not None:
                        # What the owner wrote on the profile. An empty text means it was asked and there is none;
                        # no key at all means the account has not been asked yet.
                        metrics['author_location'] = row.location or ''


async def waiting_accounts(db, now):
    """Accounts of monitored projects without a fresh profile, per platform, busiest first.

    News entries are (key, site); a publisher whose site the feed has not named yet cannot be looked up.
    """
    topics = sorted(set((await db.execute(select(MonitorSchedule.topic_id).where(MonitorSchedule.enabled.is_(True)))).scalars()))
    waiting = {'x': [], 'youtube': [], 'news': [], 'instagram': [], 'instagram_lookup': [], 'tiktok_lookup': []}
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
        # An X account whose picture was looked up before profile locations were kept is asked once more.
        if row is None or row.checked_at is None or row.checked_at < stale or (platform == 'x' and row.location_at is None):
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
    # Instagram: a post's own picture link works for a few days. While it does, the picture is saved from it at no
    # cost; once every link of an account has died, only a paid lookup can bring the picture back.
    rows = (await db.execute(select(SourceItem.author, SourceItem.metrics['author_username'].as_string(), SourceItem.metrics['profile_image_url'].as_string())
                             .where(SourceItem.topic_id.in_(topics), SourceItem.platform == 'instagram').order_by(SourceItem.crawled_at.desc()))).all()
    live, dead = {}, []
    for author, username, url in rows:
        key = profile_key('instagram', author, {'author_username': username})
        row = known.get(('instagram', key))
        if not key or key in live or (row is not None and row.photo_type):
            continue
        expires = link_expires(url)
        tried = row is not None and row.photo_url == url   # this very link already failed to download: do not ask it again every step
        if url and not tried and (expires is None or expires > now + timedelta(minutes=10)):
            live[key] = url
        elif key not in dead:
            dead.append(key)
    waiting['instagram'] = list(live.items())
    asked = lambda key: (row := known.get(('instagram', key))) is not None and row.checked_at is not None and row.checked_at >= stale
    waiting['instagram_lookup'] = [key for key in dead if key not in live and not asked(key)]
    # TikTok posts carry no picture at all: every account needs one paid lookup, busiest accounts first.
    username = SourceItem.metrics['author_username'].as_string()
    rows = (await db.execute(select(SourceItem.author, username, func.count()).where(
        SourceItem.topic_id.in_(topics), SourceItem.platform == 'tiktok').group_by(SourceItem.author, username).order_by(func.count().desc()))).all()
    for author, name, _ in rows:
        key = profile_key('tiktok', author, {'author_username': name})
        row = known.get(('tiktok', key))
        if key and key not in waiting['tiktok_lookup'] and not (row is not None and (row.photo_type or (row.checked_at is not None and row.checked_at >= stale))):
            waiting['tiktok_lookup'].append(key)
    return waiting


async def _store(db, platform, key, now, *, photo_url=None, followers=None, site_url=None, photo=None, location=None, based_in=None):
    row = await db.get(PulseAccountProfile, (platform, key))
    if row is None:
        row = PulseAccountProfile(platform=platform, key=key)
        db.add(row)
    # A lookup that returns nothing keeps the picture already stored: a transient miss must not blank an account.
    row.photo_url = photo_url or row.photo_url
    row.followers = followers if followers is not None else row.followers
    row.site_url = site_url or row.site_url
    if photo:
        row.photo_type, row.photo_bytes = photo
    if platform == 'x':
        # The same lookup asks for the profile location. A text the owner removed since is kept until a refresh returns another.
        row.location, row.based_in, row.location_at = location or row.location, based_in or row.based_in, now
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
    ig_usage_id, ig_room = await _allowance(db, IG_PROVIDER, day)
    tt_usage_id, tt_room = await _allowance(db, TT_PROVIDER, day)
    if usage_id is None and x_usage_id is None and ig_usage_id is None and tt_usage_id is None:
        return {'status': 'off'}
    if room <= 0 and x_room <= 0 and ig_room <= 0 and tt_room <= 0:
        return {'status': 'daily_limit'}
    waiting = await waiting_accounts(db, now)
    plan = {'x': [], 'youtube': [], 'news': [], 'instagram': [], 'instagram_lookup': [], 'tiktok_lookup': [],
            'usage_id': usage_id, 'x_usage_id': x_usage_id, 'ig_usage_id': ig_usage_id, 'tt_usage_id': tt_usage_id}
    if room > 0:
        plan['instagram'] = waiting['instagram'][:IG_BATCH]
    if ig_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['instagram_lookup'] = waiting['instagram_lookup'][:min(IG_LOOKUP_BATCH, ig_room)]
    if tt_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['tiktok_lookup'] = waiting['tiktok_lookup'][:min(TT_LOOKUP_BATCH, tt_room)]
    if x_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['x'] = [key for key in waiting['x'] if key.isdigit()][:X_BATCH]
    if room > 0 and _secret(settings, 'YOUTUBE_API_KEY'):
        plan['youtube'] = waiting['youtube'][:YOUTUBE_BATCH]
    plan['news'] = waiting['news'][:max(0, min(NEWS_BATCH, room - bool(plan['youtube'])))]
    planned = plan['x'] or plan['youtube'] or plan['news'] or plan['instagram'] or plan['instagram_lookup'] or plan['tiktok_lookup']
    return {'status': 'planned' if planned else 'nothing_waiting', **plan}


async def run_lookups(plan, settings):
    """The network part of a step. No database session is open while this runs."""
    found, stopped = {'x': None, 'youtube': None, 'news': {}, 'instagram': {}, 'instagram_lookup': {}, 'tiktok_lookup': {}}, []
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
    for key, url in plan.get('instagram', []):
        found['instagram'][key] = await fetch_image(url)
    for name, lookup in (('instagram_lookup', fetch_xpoz_instagram_user), ('tiktok_lookup', fetch_xpoz_tiktok_user)):
        for key in plan.get(name, []):
            try:
                profile = await lookup(key, _secret(settings, 'XPOZ_API_KEY'))
            except XpozToolError as exc:
                stopped.append(str(exc))
                break   # refused: do not pay for the rest of the batch
            except Exception:
                stopped.append('provider_error')
                break
            found[name][key] = (profile, await fetch_image(profile['photo_url']) if profile.get('photo_url') else None)
    return found, stopped


async def store_lookups(db, plan, found, stopped, now):
    """Write what the lookups returned and charge the two policies. A refused batch stores nothing, so it is asked again."""
    done = {'x': 0, 'youtube': 0, 'news': 0, 'instagram': 0, 'tiktok': 0}
    for platform in ('x', 'youtube'):
        if found[platform] is not None:
            for key in plan[platform]:
                await _store(db, platform, key, now, **found[platform].get(key, {}))
            done[platform] = len(plan[platform])
    for key, (photo_url, address) in found['news'].items():
        await _store(db, 'news', key, now, photo_url=photo_url, site_url=address)
        done['news'] += 1
    links = dict(plan.get('instagram', []))
    for key, photo in found.get('instagram', {}).items():
        if photo:
            await _store(db, 'instagram', key, now, photo=photo)
            done['instagram'] += 1
        else:
            # Remember the link that failed, without marking the account as looked up: a newer link is still tried,
            # and the paid lookup may still be used for it.
            row = await db.get(PulseAccountProfile, ('instagram', key))
            if row is None:
                row = PulseAccountProfile(platform='instagram', key=key)
                db.add(row)
            row.photo_url = links.get(key) or row.photo_url
    for platform in ('instagram', 'tiktok'):
        for key, (profile, photo) in found.get(platform + '_lookup', {}).items():
            # Paid: recorded even when nothing came back, so the same account is not bought again every step.
            await _store(db, platform, key, now, photo_url=profile.get('photo_url'), followers=profile.get('followers'), photo=photo)
            done[platform] += bool(photo)
    lookups, x_lookups = bool(plan['youtube']) + len(plan['news']) + len(plan.get('instagram', [])), int(bool(plan['x']))
    paid = ((plan['x_usage_id'], x_lookups), (plan.get('ig_usage_id'), len(found.get('instagram_lookup', {}))), (plan.get('tt_usage_id'), len(found.get('tiktok_lookup', {}))))
    for row_id, count in ((plan['usage_id'], lookups),) + paid:
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
    await insert_once(db, WorkerPolicy, {'provider': IG_PROVIDER, 'daily_limit': IG_DEFAULT_DAILY_LIMIT})
    await insert_once(db, WorkerPolicy, {'provider': TT_PROVIDER, 'daily_limit': TT_DEFAULT_DAILY_LIMIT})


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
