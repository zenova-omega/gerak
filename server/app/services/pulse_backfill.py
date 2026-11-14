"""Archive pull: fetch one platform for a past publication range, in bounded date windows.

A normal crawl brings the newest posts. This walks backwards through a range the analyst names,
one provider request per window, so older conversation can be filled in deliberately. Every
window is counted against the provider lane like any other request.
"""
import asyncio
from datetime import date, datetime, time, timedelta

from sqlalchemy import update

from ..models.pulse_monitor import QuotaReservation, WorkerUsage
from .ingest.common import credential
from .ingest.xpoz import PAGE_ROWS, XpozToolError
from .pulse import _provider_error, ingest_items
from .pulse_monitor import budget_provider, insert_once, source_platform

MAX_WINDOWS = 8
MAX_DAYS = 92
PLATFORMS = {'x': 'xpoz', 'instagram': 'instagram', 'tiktok': 'tiktok', 'reddit': 'reddit', 'news': 'rss', 'youtube': 'youtube'}
STOP = ('authentication_failed', 'access_or_quota_restricted', 'plan_restricted', 'rate_limited', 'not_configured', 'pending')


def windows(start: date, end: date, limit: int = MAX_WINDOWS):
    """Split an inclusive day range into at most `limit` consecutive windows of equal length."""
    days = (end - start).days + 1
    if days < 1 or days > MAX_DAYS:
        raise ValueError('Rentang tanggal harus 1 sampai 92 hari.')
    size = -(-days // limit)
    out, cursor = [], start
    while cursor <= end:
        last = min(end, cursor + timedelta(days=size - 1))
        out.append((cursor, last))
        cursor = last + timedelta(days=1)
    return out


async def fetch_window(provider, query, key, first: date, last: date):
    from .ingest.rss import fetch_rss_items
    from .ingest.xpoz import fetch_xpoz_social_items, fetch_xpoz_stored_items
    from .ingest.youtube import fetch_youtube_items
    a, b = first.isoformat(), last.isoformat()
    if provider == 'rss':
        # The feed's "before" is exclusive, so ask one day past the window's last day.
        return await fetch_rss_items(query, after=a, before=(last + timedelta(days=1)).isoformat())
    if provider == 'youtube':
        return await fetch_youtube_items(query, key, pages=1,
                                         published_after=datetime.combine(first, time.min).isoformat() + 'Z',
                                         published_before=datetime.combine(last + timedelta(days=1), time.min).isoformat() + 'Z')
    if provider == 'xpoz':
        return await fetch_xpoz_stored_items(query, key, start=a, end=b)
    return await fetch_xpoz_social_items(query, key, provider, limit=PAGE_ROWS, start=a, end=b)


async def backfill(db, topic, settings, platform, start: date, end: date, *, pause=1.0):
    if platform not in PLATFORMS:
        raise ValueError('Platform tidak didukung untuk tarik arsip.')
    provider = PLATFORMS[platform]
    lane = budget_provider(provider)
    key = credential(settings, lane.upper() + '_API_KEY') if lane != 'rss' else ''
    if lane != 'rss' and not key:
        return {'platform': platform, 'windows': [], 'fetched': 0, 'ingested': 0, 'stopped': 'not_configured'}
    results, stopped = [], None
    for index, (first, last) in enumerate(windows(start, end)):
        if index:
            await asyncio.sleep(pause)
        now = datetime.utcnow(); day = now.date().isoformat()
        # Counted like any other request so Monitor shows what the archive pull used.
        await insert_once(db, WorkerUsage, {'id': lane + ':' + day, 'provider': lane, 'day': day, 'used': 0})
        await db.execute(update(WorkerUsage).where(WorkerUsage.id == lane + ':' + day).values(used=WorkerUsage.used + 1))
        db.add(QuotaReservation(provider=lane, topic_id=topic.id, platform=source_platform(provider), mode='backfill', day=day, reserved_at=now))
        try:
            items = await fetch_window(provider, topic.query, key, first, last)
            async with db.begin_nested():
                created = await ingest_items(db, topic, items[:PAGE_ROWS])
            results.append({'from': first.isoformat(), 'to': last.isoformat(), 'status': 'success', 'fetched': len(items[:PAGE_ROWS]), 'ingested': created})
        except Exception as exc:
            code = exc.code if isinstance(exc, XpozToolError) else _provider_error(exc, provider).get('error', 'provider_error')
            results.append({'from': first.isoformat(), 'to': last.isoformat(), 'status': code, 'fetched': 0, 'ingested': 0})
            if code in STOP:
                stopped = code
                break
    await db.flush()
    return {'platform': platform, 'windows': results, 'fetched': sum(r['fetched'] for r in results),
            'ingested': sum(r['ingested'] for r in results), 'stopped': stopped}
