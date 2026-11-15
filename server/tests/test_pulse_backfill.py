from datetime import date
import pytest
from app.models.pulse import WatchTopic, SourceItem
from sqlalchemy import select
from app.services import pulse_backfill as service


def test_windows_cover_the_range_once_and_stay_bounded():
    assert service.windows(date(2026, 11, 1), date(2026, 11, 1)) == [(date(2026, 11, 1), date(2026, 11, 1))]
    parts = service.windows(date(2026, 10, 1), date(2026, 10, 30))
    assert len(parts) <= service.MAX_WINDOWS and parts[0][0] == date(2026, 10, 1) and parts[-1][1] == date(2026, 10, 30)
    for (_, last), (first, _) in zip(parts, parts[1:]):
        assert (first - last).days == 1  # no gap, no overlap
    with pytest.raises(ValueError):
        service.windows(date(2026, 11, 2), date(2026, 11, 1))
    with pytest.raises(ValueError):
        service.windows(date(2026, 1, 1), date(2026, 12, 31))


def test_reddit_rows_are_normalised_and_adult_or_malformed_rows_dropped():
    from app.services.ingest.xpoz import normalize_social_posts
    rows = [{'id': '1ab2c3', 'title': 'Judul', 'selftext': 'Isi', 'permalink': '/r/indonesia/comments/1ab2c3/judul_posting/', 'postUrl': 'https://evil.example/x',
             'authorUsername': 'user_1', 'subredditName': 'indonesia', 'score': '9', 'commentsCount': '4', 'crosspostsCount': '1',
             'createdAtTimestamp': '2026-06-28T09:47:38.000Z', 'over18': 'None'},
            {'id': 'x', 'title': 'dewasa', 'permalink': '/r/a_b/comments/abcd/x/', 'over18': 'True'},
            {'id': 'y', 'title': 'tautan aneh', 'permalink': 'https://evil.example/r/x/comments/abcd/x/'}]
    items = normalize_social_posts('reddit', rows)
    assert len(items) == 1
    item = items[0]
    assert item['url'] == 'https://www.reddit.com/r/indonesia/comments/1ab2c3/judul_posting/' and item['platform'] == 'reddit'
    assert item['text'] == 'Judul' + chr(10) * 2 + 'Isi' and item['author'] == 'user_1' and item['published_at'].hour == 9
    assert item['metrics']['likes'] == 9 and item['metrics']['comments'] == 4 and item['metrics']['community'] == 'r/indonesia'
    assert 'provider_post_id' not in item['metrics']


@pytest.mark.asyncio
async def test_backfill_ingests_each_window_counts_usage_and_stops_when_blocked(db, monkeypatch):
    from app.config import get_settings
    from app.services.ingest import xpoz
    from app.models.pulse_monitor import WorkerUsage, QuotaReservation
    topic = WatchTopic(id='bf', label='b', query='contoh', is_active=False); db.add(topic); await db.flush()
    settings = get_settings()
    monkeypatch.setattr(settings, 'XPOZ_API_KEY', type(settings.XPOZ_API_KEY)('k'))
    seen = []

    async def fake(provider, query, key, first, last):
        seen.append((provider, first.isoformat(), last.isoformat()))
        if len(seen) == 3:
            raise xpoz.XpozToolError('rate_limited')
        return [{'source': 'xpoz', 'platform': 'x', 'url': f'https://x.com/i/status/{len(seen)}', 'text': 't', 'title': 't', 'author': 'a', 'published_at': None, 'metrics': {}}]
    monkeypatch.setattr(service, 'fetch_window', fake)
    result = await service.backfill(db, topic, settings, 'x', date(2026, 10, 1), date(2026, 10, 16), pause=0)
    assert [w['status'] for w in result['windows']] == ['success', 'success', 'rate_limited'] and result['stopped'] == 'rate_limited'
    assert result['fetched'] == 2 and result['ingested'] == 2 and seen[0] == ('xpoz', '2026-10-01', '2026-10-02')
    assert len((await db.execute(select(SourceItem).where(SourceItem.topic_id == 'bf'))).scalars().all()) == 2
    usage = (await db.execute(select(WorkerUsage).where(WorkerUsage.provider == 'xpoz'))).scalars().all()
    assert sum(u.used for u in usage) >= 3
    assert len((await db.execute(select(QuotaReservation).where(QuotaReservation.mode == 'backfill'))).scalars().all()) == 3
    monkeypatch.setattr(settings, 'XPOZ_API_KEY', type(settings.XPOZ_API_KEY)(''))
    assert (await service.backfill(db, topic, settings, 'tiktok', date(2026, 10, 1), date(2026, 10, 2)))['stopped'] == 'not_configured'


@pytest.mark.asyncio
async def test_the_database_is_released_before_each_provider_call_and_after_each_window(db, monkeypatch):
    """SQLite has one writer. Holding the transaction open while the provider answers locked every other worker and
    request out for the length of the pull: saving a project then failed with "database is locked"."""
    from app.config import get_settings
    topic = WatchTopic(id='bf-lock', label='b', query='contoh', is_active=False); db.add(topic); await db.flush()
    settings = get_settings()
    monkeypatch.setattr(settings, 'XPOZ_API_KEY', type(settings.XPOZ_API_KEY)('k'))
    events = []

    async def fake(provider, query, key, first, last):
        events.append('provider')
        return []

    async def release():
        events.append('release')
    monkeypatch.setattr(service, 'fetch_window', fake)
    result = await service.backfill(db, topic, settings, 'x', date(2026, 10, 1), date(2026, 10, 4), pause=0, release=release)
    assert len(result['windows']) == 4
    assert events == ['release', 'provider', 'release'] * 4       # nothing is held while the provider is asked


@pytest.mark.asyncio
async def test_a_window_stores_everything_the_source_returned_not_the_first_300(db, monkeypatch):
    from app.config import get_settings
    topic = WatchTopic(id='bf-all', label='b', query='contoh', is_active=False); db.add(topic); await db.flush()
    settings = get_settings()
    monkeypatch.setattr(settings, 'XPOZ_API_KEY', type(settings.XPOZ_API_KEY)('k'))
    asked, released = [], []

    async def fake(provider, query, key, first, last):
        asked.append(provider)
        return [{'source': 'xpoz', 'platform': 'x', 'url': f'https://x.com/i/status/{n}', 'text': f'isi berbeda nomor {n} ' * 3, 'title': 't', 'author': 'a', 'published_at': None, 'metrics': {}} for n in range(1, 451)]

    async def release():
        released.append(1)
    monkeypatch.setattr(service, 'fetch_window', fake)
    result = await service.backfill(db, topic, settings, 'x', date(2026, 10, 1), date(2026, 10, 1), pause=0, release=release)
    assert result['fetched'] == 450 and result['ingested'] == 450
    assert len((await db.execute(select(SourceItem).where(SourceItem.topic_id == 'bf-all'))).scalars().all()) == 450
    assert len(released) >= 4       # before the provider call, and between the batches that are stored


@pytest.mark.asyncio
async def test_the_archive_pull_asks_each_source_for_everything(monkeypatch):
    from app.services.ingest import xpoz, youtube
    seen = {}

    async def x_items(query, key, **options):
        seen['x'] = options
        return []

    async def social(query, key, platform, limit=5, **options):
        seen[platform] = options
        return []

    async def videos(query, key, **options):
        seen['youtube'] = options
        return []
    monkeypatch.setattr(xpoz, 'fetch_xpoz_stored_items', x_items)
    monkeypatch.setattr(xpoz, 'fetch_xpoz_social_items', social)
    monkeypatch.setattr(youtube, 'fetch_youtube_items', videos)
    for provider in ('xpoz', 'instagram', 'tiktok', 'youtube'):
        await service.fetch_window(provider, 'kata', 'k', date(2026, 11, 13), date(2026, 11, 13))
    assert seen['x'] == {'start': '2026-11-13', 'end': '2026-11-13', 'complete': True}
    assert seen['instagram']['complete'] is True and seen['tiktok']['complete'] is True
    assert seen['youtube']['pages'] is None                    # every page the API offers for the window
