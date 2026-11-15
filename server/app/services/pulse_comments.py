"""Bounded, explicit comment snapshots.

YouTube comes from the Data API (up to three pages per video). X, Instagram and TikTok come from the
provider's comment tools (one call, up to 300 comments per post). Each post costs provider quota, so
collection is always a counted batch: on request from the Comments page, or the capped automatic
trickle in pulse_comments_auto.
"""
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs, urlencode
import httpx
from sqlalchemy import select
from ..models.pulse import SourceItem
from .ingest.common import count, observed_engagement
from .pulse_measures import interaction_sort_key, reported
from .ingest.xpoz import _public_image_url
from .pulse_network import timestamp


YOUTUBE_PAGES = 3
AUTO_TOP_POSTS = 100   # per project, kept complete by the automatic lane
STOP_STATUSES = ('quotaExceeded', 'dailyLimitExceeded', 'quota_stopped', 'authentication_failed',
                 'access_or_quota_restricted', 'plan_restricted', 'rate_limited', 'not_configured')


def _keep_picture(comment, snippet):
    """YouTube hands the commenter's picture in the same answer as the comment, at no extra quota. Only the link is
    kept, and only a plain public one; a comment without a picture stores no empty field."""
    picture = _public_image_url(snippet.get('authorProfileImageUrl'))
    if picture:
        comment['profile_image_url'] = picture
    return comment


async def fetch_all_comments(video_id, api_key, pages=YOUTUBE_PAGES):
    """Up to `pages` pages of 100 top-level comments, most relevant first. Stops at the first failed page."""
    if not re.fullmatch(r'[A-Za-z0-9_-]+', video_id):
        return {'status': 'invalid_video', 'items': []}
    comments, token, more = {}, None, False
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=False, headers={'X-Goog-Api-Key': api_key}) as client:
            for _ in range(pages):
                params = {'part': 'snippet', 'videoId': video_id, 'maxResults': 100, 'order': 'relevance', 'textFormat': 'plainText'}
                if token:
                    params['pageToken'] = token
                response = await client.get('https://www.googleapis.com/youtube/v3/commentThreads', params=params)
                payload = response.json()
                if response.is_error:
                    if comments:
                        more = True
                        break
                    error = payload.get('error') if isinstance(payload, dict) else None
                    errors = error.get('errors') if isinstance(error, dict) else None
                    reason = errors[0].get('reason') if isinstance(errors, list) and errors and isinstance(errors[0], dict) else None
                    allowed = {'quotaExceeded', 'dailyLimitExceeded', 'commentsDisabled', 'videoNotFound', 'forbidden', 'keyInvalid'}
                    return {'status': reason if reason in allowed else 'provider_error', 'items': []}
                if not isinstance(payload, dict) or not isinstance(payload.get('items'), list):
                    raise ValueError('invalid response')
                for row in payload['items'][:100]:
                    thread = row.get('snippet') or {}
                    top = thread.get('topLevelComment') or {}
                    s = top.get('snippet') or {}
                    if not isinstance(top.get('id'), str) or not isinstance(s.get('textDisplay'), str):
                        continue
                    date = timestamp(s.get('publishedAt'))
                    comments[top['id']] = {'id': top['id'], 'author': s.get('authorDisplayName') if isinstance(s.get('authorDisplayName'), str) else None,
                                           'text': s['textDisplay'], 'published_at': date.isoformat() if date else None,
                                           'likes': count(s['likeCount']) if s.get('likeCount') is not None else None,
                                           'replies': count(thread['totalReplyCount']) if thread.get('totalReplyCount') is not None else None,
                                           'url': 'https://www.youtube.com/watch?' + urlencode({'v': video_id, 'lc': top['id']})}
                    _keep_picture(comments[top['id']], s)
                token = payload.get('nextPageToken') if isinstance(payload.get('nextPageToken'), str) else None
                more = bool(token)
                if not token:
                    break
        return {'status': 'success', 'items': sorted(comments.values(), key=lambda c: -(c['likes'] if c['likes'] is not None else -1)), 'has_more': more}
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        return {'status': 'provider_error', 'items': []}


def comment_target(item):
    """(platform, provider post id) for a stored post whose comments can be requested, else None."""
    try:
        url = urlparse(item.url)
    except ValueError:
        return None
    if item.platform == 'youtube':
        video = parse_qs(url.query).get('v', [''])[0]
        return ('youtube', video) if url.hostname in ('youtube.com', 'www.youtube.com') and re.fullmatch(r'[A-Za-z0-9_-]+', video) else None
    if item.platform == 'x':
        match = re.search(r'/status/([0-9]+)', url.path or '')
        return ('x', match.group(1)) if match else None
    if item.platform == 'tiktok':
        match = re.search(r'/video/([0-9]+)', url.path or '')
        return ('tiktok', match.group(1)) if match else None
    if item.platform == 'instagram':
        # Instagram needs the provider's own id (media id + user id); it cannot be rebuilt from the link.
        post_id = (item.metrics or {}).get('provider_post_id')
        return ('instagram', post_id) if isinstance(post_id, str) and re.fullmatch(r'[0-9]+_[0-9]+', post_id) else None
    return None


def comment_rank(row):
    """Posts whose comments are worth reading first: a known comment count before an unknown one, largest first, then
    the shared interaction order. A count that is not reported is never read as 0 (interactions_v1)."""
    comments = reported((row.metrics or {}).get('comments'))
    return (comments is None, -(comments or 0)) + interaction_sort_key(observed_engagement(row.metrics), row.published_at, row.id)


def comment_coverage(rows):
    """How many stored posts can have comments, have them, or cannot be requested yet."""
    eligible = [row for row in rows if comment_target(row)]
    done = [row for row in eligible if ((row.metrics or {}).get('comment_snapshot') or {}).get('status') == 'success']
    waiting = [row for row in eligible if not (row.metrics or {}).get('comment_snapshot')]
    # The automatic lane keeps the most-commented posts complete; say how far that is.
    top = sorted((row for row in eligible if (row.metrics or {}).get('comments') != 0), key=comment_rank)[:AUTO_TOP_POSTS]
    auto_done = sum(1 for row in top if (row.metrics or {}).get('comment_snapshot'))
    return {'auto_target': len(top), 'auto_done': auto_done,
            'posts': len(rows), 'eligible': len(eligible), 'collected': len(done), 'waiting': len(waiting),
            'not_requestable': len(rows) - len(eligible),
            'comments': sum(len(((row.metrics or {}).get('comment_snapshot') or {}).get('items') or []) for row in rows)}


async def collect_project_comments(db, topic_id, settings, max_posts=10, top=None):
    """Fetch comments for the next posts that have none yet, most-commented first. One explicit, bounded batch.

    `top` limits the work to the project's `top` most-commented posts: once those have comments, nothing is pending."""
    from .ingest.common import credential
    from .ingest.xpoz import XpozToolError, fetch_xpoz_comments
    rows = (await db.execute(select(SourceItem).where(SourceItem.topic_id == topic_id))).scalars().all()
    ranked = sorted((row for row in rows if comment_target(row) and (row.metrics or {}).get('comments') != 0), key=comment_rank)
    pending = [row for row in (ranked[:top] if top else ranked) if not (row.metrics or {}).get('comment_snapshot')]
    keys = {'youtube': credential(settings, 'YOUTUBE_API_KEY'), 'xpoz': credential(settings, 'XPOZ_API_KEY')}
    results, stopped = [], set()
    for row in pending[:max_posts]:
        platform, post_id = comment_target(row)
        lane = 'youtube' if platform == 'youtube' else 'xpoz'
        if lane in stopped:
            continue
        if not keys[lane]:
            snapshot = {'status': 'not_configured', 'items': []}
        elif platform == 'youtube':
            snapshot = await fetch_all_comments(post_id, keys[lane])
        else:
            try:
                snapshot = {'status': 'success', **await fetch_xpoz_comments(platform, post_id, keys[lane], row.url)}
            except XpozToolError as exc:
                snapshot = {'status': exc.code, 'items': []}
            except Exception:
                snapshot = {'status': 'provider_error', 'items': []}
        if snapshot['status'] in STOP_STATUSES:
            stopped.add(lane)  # quota, plan or credential problem: stop this provider, keep the post for a later batch
            results.append({'post_id': row.id, 'platform': platform, 'status': snapshot['status'], 'count': 0})
            continue
        snapshot = {**snapshot, 'fetched_at': datetime.now(timezone.utc).isoformat(), 'order': 'relevance', 'limit': 300}
        row.metrics = {**(row.metrics or {}), 'comment_snapshot': snapshot}
        results.append({'post_id': row.id, 'platform': platform, 'status': snapshot['status'], 'count': len(snapshot.get('items', []))})
    await db.flush()
    return {'posts': results, 'comments': sum(r['count'] for r in results), 'stopped': sorted(stopped),
            'max_posts': max_posts, 'coverage': comment_coverage(rows)}


async def fetch_comments(video_id, api_key):
    if not re.fullmatch(r'[A-Za-z0-9_-]+', video_id):
        return {'status': 'invalid_video', 'items': []}
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=False, headers={'X-Goog-Api-Key': api_key}) as client:
            response = await client.get('https://www.googleapis.com/youtube/v3/commentThreads', params={
                'part': 'snippet', 'videoId': video_id, 'maxResults': 50, 'order': 'relevance', 'textFormat': 'plainText'})
        payload = response.json()
        if response.is_error:
            error = payload.get('error') if isinstance(payload, dict) else None
            errors = error.get('errors') if isinstance(error, dict) else None
            reason = errors[0].get('reason') if isinstance(errors, list) and errors and isinstance(errors[0], dict) else None
            allowed = {'quotaExceeded', 'dailyLimitExceeded', 'commentsDisabled', 'videoNotFound', 'forbidden', 'keyInvalid'}
            return {'status': reason if reason in allowed else 'provider_error', 'items': []}
        if not isinstance(payload, dict) or not isinstance(payload.get('items'), list):
            raise ValueError('invalid response')
        comments = {}
        for row in payload['items'][:50]:
            thread = row.get('snippet') or {}
            top = thread.get('topLevelComment') or {}
            s = top.get('snippet') or {}
            if not isinstance(top.get('id'), str) or not isinstance(s.get('textDisplay'), str):
                continue
            date = timestamp(s.get('publishedAt'))
            comments[top['id']] = {'id': top['id'], 'author': s.get('authorDisplayName') if isinstance(s.get('authorDisplayName'), str) else None,
                                   'text': s['textDisplay'], 'published_at': date.isoformat() if date else None,
                                   'likes': count(s['likeCount']) if s.get('likeCount') is not None else None,
                                   'replies': count(thread['totalReplyCount']) if thread.get('totalReplyCount') is not None else None,
                                   'url': 'https://www.youtube.com/watch?' + urlencode({'v': video_id, 'lc': top['id']})}
            _keep_picture(comments[top['id']], s)
        return {'status': 'success', 'items': sorted(comments.values(), key=lambda c: -(c['likes'] if c['likes'] is not None else -1)),
                'has_more': bool(payload.get('nextPageToken'))}
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        return {'status': 'provider_error', 'items': []}


async def collect_top_comments(db, topic_id, api_key):
    rows = (await db.execute(select(SourceItem).where(SourceItem.topic_id == topic_id, SourceItem.platform == 'youtube'))).scalars().all()
    rows.sort(key=lambda p: interaction_sort_key(observed_engagement(p.metrics), p.published_at, p.id))
    selected, seen = [], set()
    for row in rows:
        url = urlparse(row.url)
        video = parse_qs(url.query).get('v', [''])[0]
        if url.hostname not in ('youtube.com', 'www.youtube.com') or not re.fullmatch(r'[A-Za-z0-9_-]+', video) or video in seen:
            continue
        seen.add(video)
        selected.append((row, video))
        if len(selected) == 5:
            break
    results = []
    quota_stopped = False
    for row, video in selected:
        previous = (row.metrics or {}).get('comment_snapshot')
        if previous:
            snapshot = previous
            cached = True
        else:
            cached = False
            snapshot = {'status': 'quota_stopped', 'items': []} if quota_stopped else await fetch_comments(video, api_key) if api_key else {'status': 'not_configured', 'items': []}
            quota_stopped = snapshot['status'] in ('quotaExceeded', 'dailyLimitExceeded', 'quota_stopped')
            snapshot = {**snapshot, 'fetched_at': datetime.now(timezone.utc).isoformat(), 'order': 'relevance', 'limit': 50}
            row.metrics = {**(row.metrics or {}), 'comment_snapshot': snapshot}
        results.append({'post_id': row.id, 'author': row.author, 'title': row.title, 'status': snapshot['status'],
                        'count': len(snapshot.get('items', [])), 'cached': cached})
    await db.flush()
    return {'videos': results, 'comments': sum(r['count'] for r in results), 'max_videos': 5, 'max_comments_per_video': 50}
