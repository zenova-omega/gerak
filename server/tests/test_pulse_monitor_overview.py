"""Monitor overview figures per source. GET only: no dispatch, no provider calls."""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_monitor import CrawlJob, MonitorSchedule, WorkerPolicy
from app.services.pulse_monitor import ensure_policies


async def get_overview(client, admin_token, **params):
    response = await client.get('/api/admin/pulse/monitor', params=params,
                                headers={'Authorization': f'Bearer {admin_token}'})
    assert response.status_code == 200
    return response.json()['overview']


def by_platform(overview):
    return {row['platform']: row for row in overview['sources']}


@pytest.fixture
async def collected(db):
    now = datetime.utcnow()
    for topic_id in ('overview-a', 'overview-b', 'overview-empty'):
        db.add(WatchTopic(id=topic_id, label=topic_id, query=topic_id))
    await db.flush()

    def post(topic, platform, name, published, crawled):
        db.add(SourceItem(id=f'{topic}-{name}', topic_id=topic, source='test', platform=platform,
                          url=f'https://example.test/{topic}/{name}', published_at=published, crawled_at=crawled))

    # Project A, news: three posts on two publication days. The newest one was collected an hour ago.
    post('overview-a', 'news', 'n1', datetime(2026, 11, 1, 2), now - timedelta(days=3))
    post('overview-a', 'news', 'n2', datetime(2026, 11, 1, 9), now - timedelta(days=2))
    post('overview-a', 'news', 'n3', datetime(2026, 11, 5, 0), now - timedelta(hours=1))
    # Project A, X: one post whose source gave no publication date.
    post('overview-a', 'x', 'x1', None, now - timedelta(hours=5))
    # A post without a platform belongs to no source row.
    post('overview-a', None, 'unknown', datetime(2026, 10, 1), now)
    # Project B must never leak into project A.
    for index in range(5):
        post('overview-b', 'news', f'b{index}', datetime(2026, 10, 20 + index, 3), now - timedelta(days=1))

    for suffix, topic, provider in (('a-rss', 'overview-a', 'rss'), ('a-x', 'overview-a', 'xpoz'), ('b-rss', 'overview-b', 'rss')):
        db.add(MonitorSchedule(id=f'overview-{suffix}', topic_id=topic, provider=provider, enabled=False))
    await db.flush()

    def job(schedule, topic, provider, name, status, age):
        db.add(CrawlJob(id=f'overview-job-{name}', schedule_id=f'overview-{schedule}', topic_id=topic,
                        provider=provider, status=status, created_at=now - age))

    job('a-rss', 'overview-a', 'rss', 'ok-recent', 'succeeded', timedelta(hours=1))
    job('a-rss', 'overview-a', 'rss', 'waiting', 'queued', timedelta(minutes=10))
    job('a-rss', 'overview-a', 'rss', 'cancelled', 'cancelled', timedelta(hours=1))   # paused by the owner: never planned
    job('a-rss', 'overview-a', 'rss', 'ok-old', 'succeeded', timedelta(days=2))
    job('a-rss', 'overview-a', 'rss', 'failed', 'failed', timedelta(days=3))
    job('a-rss', 'overview-a', 'rss', 'outside', 'succeeded', timedelta(days=9))      # older than both windows
    job('a-x', 'overview-a', 'xpoz', 'interrupted', 'interrupted', timedelta(hours=2))
    job('b-rss', 'overview-b', 'rss', 'other', 'succeeded', timedelta(hours=1))
    await db.flush()
    return now


@pytest.mark.asyncio
async def test_overview_gives_posts_span_and_share_of_scheduled_collections_per_source(client, admin_token, collected):
    overview = await get_overview(client, admin_token, topic_id='overview-a')
    rows = by_platform(overview)
    assert set(rows) == {'news', 'x'}, 'schedule keys are reported as the platform the reader knows'

    news = rows['news']
    assert news['posts'] == 3
    assert news['first_published_at'] == '2026-11-01T02:00:00'
    assert news['last_published_at'] == '2026-11-05T00:00:00'
    assert news['days_with_posts'] == 2
    assert datetime.fromisoformat(news['last_collected_at']) == collected - timedelta(hours=1)
    assert news['runs']['day'] == {'planned': 2, 'succeeded': 1, 'failed': 0, 'waiting': 1}
    assert news['runs']['week'] == {'planned': 4, 'succeeded': 2, 'failed': 1, 'waiting': 1}

    x = rows['x']
    assert x['posts'] == 1
    assert x['first_published_at'] is None and x['last_published_at'] is None
    assert x['days_with_posts'] == 0, 'an undated post must not invent a publication day'
    assert x['runs']['day'] == x['runs']['week'] == {'planned': 1, 'succeeded': 0, 'failed': 1, 'waiting': 0}

    since = overview['since']
    assert datetime.fromisoformat(since['week']) < datetime.fromisoformat(since['day'])


@pytest.mark.asyncio
async def test_overview_without_a_project_covers_every_project(client, admin_token, collected):
    rows = by_platform(await get_overview(client, admin_token))
    assert rows['news']['posts'] == 8
    assert rows['news']['first_published_at'] == '2026-10-20T03:00:00'
    assert rows['news']['runs']['day'] == {'planned': 3, 'succeeded': 2, 'failed': 0, 'waiting': 1}


@pytest.mark.asyncio
@pytest.mark.parametrize('topic_id', ['overview-empty', 'missing-project'])
async def test_overview_of_a_project_without_data_has_no_sources(client, admin_token, collected, topic_id):
    assert (await get_overview(client, admin_token, topic_id=topic_id))['sources'] == []


@pytest.mark.asyncio
async def test_overview_read_changes_no_schedule_job_or_limit(db, client, admin_token, collected):
    def state(rows):
        return sorted((row.id, row.status) for row in rows)
    before = state((await db.execute(select(CrawlJob))).scalars().all())
    await get_overview(client, admin_token, topic_id='overview-a')
    assert state((await db.execute(select(CrawlJob))).scalars().all()) == before
    assert all(not schedule.enabled for schedule in (await db.execute(select(MonitorSchedule))).scalars().all())
    assert all(policy.blocked_reason is None for policy in (await db.execute(select(WorkerPolicy))).scalars().all())


@pytest.mark.asyncio
async def test_a_stopped_source_says_whether_it_resumes_by_itself(db, client, admin_token):
    """A wait that ends by the clock carries its end time; a stop that needs a person carries none."""
    from sqlalchemy import update
    await ensure_policies(db)
    until = datetime(2026, 11, 14, 9, 30)
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == 'youtube').values(blocked_reason='rate_limited', blocked_until=until))
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == 'xpoz').values(blocked_reason='authentication_failed', blocked_until=None))
    response = await client.get('/api/admin/pulse/monitor', headers={'Authorization': f'Bearer {admin_token}'})
    workers = {worker['provider']: worker for worker in response.json()['workers']}
    assert workers['youtube']['blocked_until'] == '2026-11-14T09:30:00'
    assert workers['social']['blocked_reason'] == 'authentication_failed' and workers['social']['blocked_until'] is None
    assert workers['rss']['blocked_reason'] is None and workers['rss']['blocked_until'] is None


@pytest.mark.asyncio
async def test_days_with_posts_are_days_of_the_installation_zone(db, client, admin_token):
    """23:30 UTC is the next morning in WIB: two posts on one UTC date are two days with posts. A date-only post keeps
    the date its source gave."""
    db.add(WatchTopic(id='overview-zone', label='Zone', query='zone'))
    await db.flush()
    for name, published in [('day', datetime(2026, 11, 1, 10)), ('night', datetime(2026, 11, 1, 23, 30)),
                            ('date-only', datetime(2026, 11, 3))]:
        db.add(SourceItem(id=f'overview-zone-{name}', topic_id='overview-zone', source='test', platform='news',
                          url=f'https://example.test/zone/{name}', published_at=published, crawled_at=datetime.utcnow()))
    await db.flush()
    rows = by_platform(await get_overview(client, admin_token, topic_id='overview-zone'))
    assert rows['news']['days_with_posts'] == 3, '1 Nov (17.00 WIB), 2 Nov (06.30 WIB) and 3 Nov (the date-only post)'
