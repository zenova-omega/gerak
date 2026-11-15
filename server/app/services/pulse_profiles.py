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
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select, update
from ..models.pulse import SourceItem
from ..models.pulse_monitor import MonitorSchedule, WorkerPolicy, WorkerUsage
from ..models.pulse_profiles import PulseAccountProfile
import re

import httpx
from urllib.parse import parse_qs, quote, urlsplit
from .ingest.site_icon import fetch_image, fetch_site_icon, public_site
from .ingest.xpoz import XpozToolError, fetch_xpoz_instagram_user, fetch_xpoz_profiles, fetch_xpoz_profiles_by_username, fetch_xpoz_tiktok_user, is_rate_limit, open_session
from .pulse_comments import STOP_STATUSES, YOUTUBE_PAGES, comment_target, fetch_all_comments
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


COMMENT_PLATFORMS = ('x', 'instagram', 'tiktok')   # their comment lists carry no picture: the commenter is looked up
COMMENT_PHOTO_POSTS = 3                            # YouTube posts whose stored comments get their pictures, per step


def commenter_key(platform, author):
    """How a commenter is recognised, or None when the name cannot be an account. X commenters are known by handle
    only, so they are kept under "u:handle", apart from post accounts, which are kept under their account id."""
    name = author.strip().lstrip('@').casefold() if isinstance(author, str) else ''
    if platform == 'x':
        return 'u:' + name if re.fullmatch(r'[a-z0-9_]{1,15}', name) else None
    return profile_key(platform, name, {}) if platform in ('instagram', 'tiktok') else None


def _shared(accounts, commenters, size):
    """One batch of a lane that serves post accounts and commenters: accounts first, half each when both wait, and
    either takes what the other leaves."""
    first = accounts[:size - size // 2 if commenters else size]
    second = commenters[:size - len(first)]
    return first + second + accounts[len(first):len(first) + size - len(first) - len(second)]


_no_pictures = set()      # posts whose comments were read again and carried no picture at all, in this process
_unanswered = {}          # (lane, account) -> single-account lookups that ended without an answer, in this process


def _untried_first(lane, accounts):
    """The same order, with accounts whose lookup got no answer moved behind the ones not yet tried."""
    return sorted(accounts, key=lambda account: _unanswered.get((lane, account), 0))


async def comment_photo_targets(db, limit=COMMENT_PHOTO_POSTS):
    """YouTube posts of monitored projects whose stored comments have no pictures yet and were not asked for them,
    busiest first: [{item_id, video, pages}]. The pictures come with the comments, so reading them again costs one
    quota unit a page and no supplier credit. For comments stored before pictures were kept (15 Nov 2026)."""
    topics = sorted(set((await db.execute(select(MonitorSchedule.topic_id).where(MonitorSchedule.enabled.is_(True)))).scalars()))
    if not topics:
        return []
    snapshot = SourceItem.metrics['comment_snapshot']
    rows = (await db.execute(select(SourceItem).where(
        SourceItem.topic_id.in_(topics), SourceItem.platform == 'youtube', snapshot['status'].as_string() == 'success',
        snapshot['photos_at'].as_string().is_(None)))).scalars().all()
    targets = []
    for row in sorted(rows, key=lambda item: -len(item.metrics['comment_snapshot'].get('items') or [])):
        items, target = row.metrics['comment_snapshot'].get('items') or [], comment_target(row)
        if row.id not in _no_pictures and target and items and any(not item.get('profile_image_url') for item in items if isinstance(item, dict)):
            targets.append({'item_id': row.id, 'video': target[1], 'pages': min(YOUTUBE_PAGES, -(-len(items) // 100))})
            if len(targets) >= limit:
                break
    return targets


async def merge_comment_photos(db, item_id, photos, now):
    """Add pictures to the stored comments of one post, by comment id, and note that it was asked. The row is read
    fresh and only this one key is added: the comments, their order and everything else stay as they are.
    Returns how many comments got a picture."""
    row = await db.get(SourceItem, item_id, populate_existing=True)
    snapshot = (row.metrics or {}).get('comment_snapshot') if row is not None else None
    if not isinstance(snapshot, dict):
        return 0
    filled, items = 0, []
    for item in snapshot.get('items') or []:
        picture = photos.get(item.get('id')) if isinstance(item, dict) and not item.get('profile_image_url') else None
        filled += bool(picture)
        items.append({**item, 'profile_image_url': picture} if picture else item)
    row.metrics = {**row.metrics, 'comment_snapshot': {**snapshot, 'items': items, 'photos_at': now.replace(tzinfo=timezone.utc).isoformat()}}
    await db.flush()
    return filled


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
    await _attach_commenters(db, posts)


async def _attach_commenters(db, posts):
    """Give each stored comment on X, Instagram and TikTok the picture known for its author, as `profile_image_url`: the key
    a YouTube comment carries its own picture under. The comments that were read are not changed in place: a post
    gets a new list."""
    wanted = {}
    for post in posts:
        snapshot = (post.get('metrics') or {}).get('comment_snapshot')
        if post.get('platform') in COMMENT_PLATFORMS and isinstance(snapshot, dict):
            for item in snapshot.get('items') or []:
                key = commenter_key(post['platform'], item.get('author')) if isinstance(item, dict) and not item.get('profile_image_url') else None
                if key:
                    wanted.setdefault(post['platform'], set()).add(key)
    pictures = {}
    for platform, keys in wanted.items():
        keys = sorted(keys)
        for start in range(0, len(keys), 500):
            for row in (await db.execute(select(PulseAccountProfile.key, PulseAccountProfile.photo_url, PulseAccountProfile.photo_type, PulseAccountProfile.checked_at).where(
                    PulseAccountProfile.platform == platform, PulseAccountProfile.key.in_(keys[start:start + 500])))).all():
                picture = photo_path(platform, row.key, row.checked_at) if row.photo_type else row.photo_url
                if picture:
                    pictures[(platform, row.key)] = picture
    if not pictures:
        return
    for post in posts:
        snapshot = (post.get('metrics') or {}).get('comment_snapshot')
        if post.get('platform') in COMMENT_PLATFORMS and isinstance(snapshot, dict) and snapshot.get('items'):
            found = [pictures.get((post['platform'], commenter_key(post['platform'], item.get('author')))) if isinstance(item, dict) and not item.get('profile_image_url') else None
                     for item in snapshot['items']]
            if any(found):
                post['metrics']['comment_snapshot'] = {**snapshot, 'items': [{**item, 'profile_image_url': picture} if picture else item for item, picture in zip(snapshot['items'], found)]}


async def waiting_accounts(db, now):
    """Accounts of monitored projects without a fresh profile, per platform, busiest first.

    News entries are (key, site); a publisher whose site the feed has not named yet cannot be looked up.
    """
    topics = sorted(set((await db.execute(select(MonitorSchedule.topic_id).where(MonitorSchedule.enabled.is_(True)))).scalars()))
    waiting = {'x': [], 'youtube': [], 'news': [], 'instagram': [], 'instagram_lookup': [], 'tiktok_lookup': [],
               'x_commenters': [], 'instagram_commenters': [], 'tiktok_commenters': []}
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
    # Commenters: their comment lists carry no picture, so each is looked up once, the most-liked comments first.
    # Someone who also posts in a project is left out on X: the picture comes with the account of their posts.
    posters = {author.strip().lstrip('@').casefold() for author in (await db.execute(select(SourceItem.author).where(
        SourceItem.topic_id.in_(topics), SourceItem.platform == 'x', SourceItem.author.isnot(None)).distinct())).scalars() if isinstance(author, str)}
    liked = {platform: {} for platform in COMMENT_PLATFORMS}
    snapshot = SourceItem.metrics['comment_snapshot']
    for platform, items in (await db.execute(select(SourceItem.platform, snapshot['items']).where(
            SourceItem.topic_id.in_(topics), SourceItem.platform.in_(COMMENT_PLATFORMS), snapshot['status'].as_string() == 'success'))).all():
        for item in items if isinstance(items, list) else []:
            key = commenter_key(platform, item.get('author')) if isinstance(item, dict) else None
            if key:
                likes = item.get('likes') if isinstance(item.get('likes'), int) else 0
                liked[platform][key] = max(liked[platform].get(key, 0), likes)
    for platform in COMMENT_PLATFORMS:
        for key in sorted(liked[platform], key=lambda name: (-liked[platform][name], name)):
            row = known.get((platform, key))
            if row is not None and (row.photo_type or (row.checked_at is not None and row.checked_at >= stale)):
                continue
            name = key[2:] if platform == 'x' else key
            if platform == 'x' and name in posters:
                continue
            if name not in waiting[platform + '_lookup' if platform != 'x' else 'x_commenters']:
                waiting[platform + '_commenters'].append(name)
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
    plan = {'x': [], 'x_commenters': [], 'youtube': [], 'news': [], 'instagram': [], 'instagram_lookup': [], 'tiktok_lookup': [], 'comment_photos': [],
            'usage_id': usage_id, 'x_usage_id': x_usage_id, 'ig_usage_id': ig_usage_id, 'tt_usage_id': tt_usage_id}
    if room > 0:
        plan['instagram'] = waiting['instagram'][:IG_BATCH]
    # The paid lanes serve post accounts and commenters alike: a batch is shared between them.
    if ig_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['instagram_lookup'] = _shared(_untried_first('instagram_lookup', waiting['instagram_lookup']), _untried_first('instagram_lookup', waiting['instagram_commenters']),
                                           min(IG_LOOKUP_BATCH, ig_room))
    if tt_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['tiktok_lookup'] = _shared(_untried_first('tiktok_lookup', waiting['tiktok_lookup']), _untried_first('tiktok_lookup', waiting['tiktok_commenters']),
                                        min(TT_LOOKUP_BATCH, tt_room))
    if x_room > 0 and _secret(settings, 'XPOZ_API_KEY'):
        plan['x'] = [key for key in waiting['x'] if key.isdigit()][:X_BATCH]
        if x_room > bool(plan['x']):
            plan['x_commenters'] = waiting['x_commenters'][:X_BATCH]      # a call of its own: these are asked by handle
    if room > 0 and _secret(settings, 'YOUTUBE_API_KEY'):
        plan['comment_photos'] = await comment_photo_targets(db, COMMENT_PHOTO_POSTS)
    if room > 0 and _secret(settings, 'YOUTUBE_API_KEY'):
        plan['youtube'] = waiting['youtube'][:YOUTUBE_BATCH]
    plan['news'] = waiting['news'][:max(0, min(NEWS_BATCH, room - bool(plan['youtube'])))]
    planned = (plan['x'] or plan['x_commenters'] or plan['youtube'] or plan['news'] or plan['instagram'] or plan['instagram_lookup']
               or plan['tiktok_lookup'] or plan['comment_photos'])
    return {'status': 'planned' if planned else 'nothing_waiting', **plan}


async def run_lookups(plan, settings):
    """The network part of a step. No database session is open while this runs."""
    found, stopped = {'x': None, 'x_commenters': None, 'youtube': None, 'news': {}, 'instagram': {}, 'instagram_lookup': {}, 'tiktok_lookup': {}, 'comment_photos': {},
                      'failures': []}, []

    def failed(lane, error):
        found['failures'].append((lane, type(error).__name__))
        return failure_reason(error)

    for name, lookup in (('x', fetch_xpoz_profiles), ('x_commenters', fetch_xpoz_profiles_by_username)):
        if plan.get(name) and not stopped:      # a failed call is not followed by a second paid one in the same step
            try:
                found[name] = await lookup(plan[name], _secret(settings, 'XPOZ_API_KEY'))
            except Exception as exc:
                stopped.append(failed(name, exc))
    if plan['youtube']:
        try:
            found['youtube'] = await fetch_youtube_channels(plan['youtube'], _secret(settings, 'YOUTUBE_API_KEY'))
        except Exception:
            stopped.append('provider_error')
    for key, address in plan['news']:
        found['news'][key] = (await fetch_site_icon(address), address)
    for key, url in plan.get('instagram', []):
        found['instagram'][key] = await fetch_image(url)
    singles = [(name, lookup, key) for name, lookup in (('instagram_lookup', fetch_xpoz_instagram_user), ('tiktok_lookup', fetch_xpoz_tiktok_user))
               for key in plan.get(name, [])]
    if singles and 'rate_limited' not in stopped:
        secret, ended, misses = _secret(settings, 'XPOZ_API_KEY'), set(), {}
        try:
            # One session for the whole batch: a session of its own for every account spent three of the supplier's
            # requests an account, and a step of ten went over its request limit.
            async with open_session(secret) as client:
                for name, lookup, key in singles:
                    if name in ended:
                        continue
                    try:
                        profile = await lookup(key, secret, client)
                    except Exception as exc:
                        reason = failed(name, exc)
                        if reason == 'rate_limited':
                            stopped.append(reason)      # nobody's fault and not charged: the step ends here and is taken up again in minutes
                            break
                        if reason != 'unreachable':
                            stopped.append(reason)
                            ended.add(name)             # refused: do not pay for the rest of this lane's batch
                            continue
                        # No answer for this one account: the supplier can take longer than we wait when it has to
                        # look for an account. Not a refusal, so the batch carries on and the account is tried last
                        # next time. Two in a row look like the supplier being unreachable, and end the lane's batch.
                        _unanswered[(name, key)] = _unanswered.get((name, key), 0) + 1
                        misses[name] = misses.get(name, 0) + 1
                        if misses[name] == 2:
                            stopped.append('unreachable')
                            ended.add(name)
                        continue
                    misses[name] = 0
                    found[name][key] = (profile, await fetch_image(profile['photo_url']) if profile.get('photo_url') else None)
        except Exception as exc:      # the session itself could not be opened
            stopped.append(failed('session', exc))
    for target in plan.get('comment_photos', []):
        # Free: the comments of a video are read again only for the pictures beside them.
        answer = await fetch_all_comments(target['video'], _secret(settings, 'YOUTUBE_API_KEY'), target['pages'])
        if answer['status'] in STOP_STATUSES or answer['status'] == 'provider_error':
            break      # out of quota or unreachable: the post is asked again another day
        photos = {item['id']: item['profile_image_url'] for item in answer['items'] if item.get('profile_image_url')}
        if photos or not answer['items']:
            found['comment_photos'][target['item_id']] = photos
        else:
            _no_pictures.add(target['item_id'])      # comments came back without any picture: not marked as done, not asked again by this process
    return found, stopped


async def store_lookups(db, plan, found, stopped, now):
    """Write what the lookups returned and charge the two policies. A refused batch stores nothing, so it is asked again."""
    done = {'x': 0, 'youtube': 0, 'news': 0, 'instagram': 0, 'tiktok': 0}
    for platform in ('x', 'youtube'):
        if found[platform] is not None:
            for key in plan[platform]:
                await _store(db, platform, key, now, **found[platform].get(key, {}))
            done[platform] = len(plan[platform])
    if found.get('x_commenters') is not None:
        for name in plan['x_commenters']:
            # Paid: recorded even when the account was not found, so the same handle is not bought again every step.
            await _store(db, 'x', 'u:' + name, now, **found['x_commenters'].get(name, {}))
        done['x'] += len(plan['x_commenters'])
    comment_photos = 0
    for item_id, photos in found.get('comment_photos', {}).items():
        comment_photos += await merge_comment_photos(db, item_id, photos, now)
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
    lookups = bool(plan['youtube']) + len(plan['news']) + len(plan.get('instagram', [])) + len(found.get('comment_photos', {}))
    x_lookups = int(found['x'] is not None and bool(plan['x'])) + int(found.get('x_commenters') is not None and bool(plan.get('x_commenters')))
    paid = ((plan['x_usage_id'], x_lookups), (plan.get('ig_usage_id'), len(found.get('instagram_lookup', {}))), (plan.get('tt_usage_id'), len(found.get('tiktok_lookup', {}))))
    for row_id, count in ((plan['usage_id'], lookups),) + paid:
        if row_id and count:
            await db.execute(update(WorkerUsage).where(WorkerUsage.id == row_id).values(used=WorkerUsage.used + count))
    return {'status': 'provider_stopped' if stopped and not any(done.values()) and not comment_photos else 'collected', 'accounts': done,
            'comment_photos': comment_photos, 'lookups': lookups, 'x_lookups': x_lookups, 'stopped': stopped,
            'failures': found.get('failures', [])}


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
RATE_PAUSE, REFUSED_PAUSE = 180, 1800
SHORT_WAITS = ('rate_limited', 'unreachable')      # clear by themselves within minutes


def failure_reason(error):
    """Our name for a failed supplier call. A refusal (credentials, plan, quota) is not asked again for half an hour;
    the request limit and a network failure (a connection that does not open or an answer that does not come, seen
    15 Nov 2026 after the machine woke from sleep) clear by themselves."""
    if is_rate_limit(error):
        return 'rate_limited'
    if isinstance(error, XpozToolError):
        return str(error)
    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        return 'authentication_failed' if code == 401 else 'access_or_quota_restricted' if code in (402, 403) else 'unreachable' if code >= 500 else 'provider_error'
    if isinstance(error, (httpx.TransportError, TimeoutError, OSError)):
        return 'unreachable'
    return 'provider_error'


def stop_notice(result):
    """The log line for a stopped step: how long the job waits, why, and which lookup ended how (class names only:
    the supplier's own words never reach a log)."""
    stopped = result['stopped']
    where = '; '.join(f'{lane}: {kind}' for lane, kind in result.get('failures') or [])
    return f"waiting {pause_seconds(stopped)} s after {sorted(set(stopped))}" + (f' ({where})' if where else '')


def pause_seconds(stopped):
    """How long the job waits after a step that was stopped. The supplier's request limit clears by itself within
    minutes, and so does a network failure; a refusal (quota, plan, credentials) is not asked again for half an hour."""
    if not stopped:
        return 0
    return RATE_PAUSE if all(reason in SHORT_WAITS for reason in stopped) else REFUSED_PAUSE


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
            # Wait before asking again instead of repeating the failure every tick. Only our own names for the reason
            # are written: the supplier's words never reach a log.
            _paused_until = datetime.utcnow().timestamp() + pause_seconds(result['stopped'])
            logger.warning('Pulse profiles: %s', stop_notice(result))
    except Exception as exc:
        logger.error('Pulse profile lookup failed internally (%s); the next tick retries', type(exc).__name__)
