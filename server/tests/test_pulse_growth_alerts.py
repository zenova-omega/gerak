"""Growth alert contracts: thresholds, worker-only trigger, and analyzable scope."""
from datetime import datetime, timedelta
import importlib

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.database import Base
from app.models.pulse import WatchTopic, Issue, SourceItem
from app.models.pulse_monitor import MetricSnapshot, PulseAlert, MonitorSchedule, CrawlJob
from app.services.pulse import ingest_items
from app.services.pulse_monitor import finish_job

NOW = datetime(2026, 11, 12, 12)
PUBLISHED = datetime(2026, 11, 9, 17)


@pytest.fixture
async def db():
    # Override the shared file-backed fixture; never touch another test runner's DB.
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        for topic in ('a', 'b'):
            session.add(WatchTopic(id=topic, label=topic, query=topic))
            session.add(Issue(id=f'issue-{topic}', topic_id=topic, title='Shared story'))
        await session.flush()
        yield session
    await engine.dispose()


async def item(db, name='post-a', topic='a', published=PUBLISHED):
    post = SourceItem(id=name, topic_id=topic, issue_id=f'issue-{topic}', source='xpoz',
                      platform='x', url=f'https://x.com/u/status/{name}', title='Growth evidence',
                      published_at=published, metrics={'likes': 999999})
    db.add(post)
    await db.flush()
    return post


async def observation(db, post, at, metrics, topic=None):
    row = MetricSnapshot(item_id=post.id, topic_id=topic or post.topic_id,
                         observed_at=at, metrics=metrics)
    db.add(row)
    await db.flush()
    return row


async def generate(db, topic, urls):
    service = importlib.import_module('app.services.pulse_growth_alerts')
    await service.create_growth_alerts(db, topic, urls, NOW)
    return (await db.scalars(select(PulseAlert).where(PulseAlert.kind == 'engagement_growth'))).all()


@pytest.mark.asyncio
@pytest.mark.parametrize('delta,hours,expected', [(100, 2, 1), (99, 1, 0), (100, 3, 0), (101, 2, 1)])
async def test_both_inclusive_thresholds_are_required(db, delta, hours, expected):
    post = await item(db)
    await observation(db, post, NOW - timedelta(hours=hours), {'likes': 0, 'comments': 0})
    await observation(db, post, NOW, {'likes': delta, 'comments': 0})
    alerts = await generate(db, 'a', [post.url])
    assert len(alerts) == expected
    if expected:
        assert alerts[0].detail['delta_engagement'] == delta
        assert alerts[0].detail['rate_per_hour'] == delta / hours
        assert alerts[0].detail['engagement_metrics'] == ['likes', 'comments']


@pytest.mark.asyncio
@pytest.mark.parametrize('before,after,hours', [
    (None, {'likes': 1000}, 1),
    ({'likes': 0}, {'likes': 1000}, 0),
    ({'likes': 0}, {'likes': 1000, 'comments': 1}, 1),
    ({'likes': 0, 'comments': 1}, {'likes': 1000}, 1),
    ({'likes': 10, 'comments': 0}, {'likes': 0, 'comments': 1000}, 1),
    ({'likes': 0, 'views': 100}, {'likes': 1000, 'views': 90}, 1),
    ({'likes': 0}, {'likes': None}, 1),
    ({'views': 0}, {'views': 1000}, 1),
])
async def test_unreliable_or_reset_observations_do_not_alert(db, before, after, hours):
    post = await item(db)
    if before is not None:
        await observation(db, post, NOW - timedelta(hours=hours), before)
    await observation(db, post, NOW, after)
    assert await generate(db, 'a', [post.url]) == []


@pytest.mark.asyncio
async def test_dedup_is_per_item_latest_observation_not_issue_or_time_bucket(db):
    post = await item(db)
    await observation(db, post, NOW - timedelta(hours=2), {'likes': 0})
    await observation(db, post, NOW, {'likes': 100})
    assert len(await generate(db, 'a', [post.url, post.url])) == 1
    assert len(await generate(db, 'a', [post.url])) == 1
    # Identical duplicate observations at one instant must not re-alert.
    await observation(db, post, NOW, {'likes': 100})
    assert len(await generate(db, 'a', [post.url])) == 1
    await observation(db, post, NOW + timedelta(hours=1), {'likes': 200})
    assert len(await generate(db, 'a', [post.url])) == 2


@pytest.mark.asyncio
async def test_only_latest_interval_and_touched_topic_posts_are_eligible(db):
    post = await item(db)
    other = await item(db, 'post-b', 'b')
    other.url = post.url
    untouched = await item(db, 'untouched')
    for row in (post, other, untouched):
        await observation(db, row, NOW - timedelta(hours=2), {'likes': 0})
        await observation(db, row, NOW - timedelta(hours=1), {'likes': 1000})
    await observation(db, post, NOW, {'likes': 1001})
    # A malformed cross-topic history row cannot replace the true latest interval.
    await observation(db, post, NOW + timedelta(minutes=1), {'likes': 10000}, topic='b')
    assert await generate(db, 'a', [post.url]) == []
    alerts = await generate(db, 'b', [post.url])
    assert len(alerts) == 1
    assert alerts[0].topic_id == 'b'
    assert alerts[0].evidence_ids == ['post-b']


@pytest.mark.asyncio
@pytest.mark.parametrize('invalid', ['publication', 'issue', 'foreign_issue'])
async def test_alert_requires_analyzable_publication_and_project_issue(db, invalid):
    post = await item(db)
    if invalid == 'publication':
        post.published_at = None
    else:
        post.issue_id = None if invalid == 'issue' else 'issue-b'
    await observation(db, post, NOW - timedelta(hours=1), {'likes': 0})
    await observation(db, post, NOW, {'likes': 1000})
    assert await generate(db, 'a', [post.url]) == []


@pytest.mark.asyncio
async def test_click_analysis_keeps_old_publication_evidence_and_project_scope(db, client, admin_token):
    post = await item(db)
    other = await item(db, 'other', 'b')
    other.url = post.url
    await item(db, 'outside-window', published=PUBLISHED + timedelta(seconds=1))
    first = await observation(db, post, NOW - timedelta(hours=2), {'likes': 0})
    last = await observation(db, post, NOW, {'likes': 100})
    alerts = await generate(db, 'a', [post.url])
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert.window_start == alert.window_end == PUBLISHED
    assert alert.evidence_ids == [post.id]
    assert alert.detail['snapshot_ids'] == [first.id, last.id]
    headers = {'Authorization': f'Bearer {admin_token}'}
    response = await client.get(f'/api/admin/pulse/monitor/alerts/{alert.id}/analysis', headers=headers)
    assert response.status_code == 200
    assert [row['id'] for row in response.json()['posts']] == [post.id]
    filtered = await client.get(f'/api/admin/pulse/monitor/alerts/{alert.id}/analysis', headers=headers,
                                params={'from': '2026-11-12', 'to': '2026-11-12'})
    assert filtered.status_code == 200 and filtered.json()['posts'] == []
    state = await client.get('/api/admin/pulse/monitor', headers=headers, params={'topic_id': 'b'})
    assert state.status_code == 200 and state.json()['alerts'] == []


@pytest.mark.asyncio
async def test_automatic_completion_alerts_updated_not_only_new_items(db):
    post = await item(db)
    now = datetime.utcnow()
    await observation(db, post, now - timedelta(hours=1), {'likes': 0})
    schedule = MonitorSchedule(id='growth-schedule', topic_id='a', provider='xpoz', enabled=True)
    db.add(schedule)
    await db.flush()
    job = CrawlJob(id='growth-job', schedule_id=schedule.id, topic_id='a', provider='xpoz',
                   status='running', lease_token='lease', lease_until=now + timedelta(minutes=3))
    db.add(job)
    await db.flush()
    raw = {'url': post.url, 'source': 'xpoz', 'platform': 'x', 'metrics': {'likes': 200}}
    assert await finish_job(db, job, {'items': [raw]}, now) is True
    alerts = (await db.scalars(select(PulseAlert).where(PulseAlert.kind == 'engagement_growth'))).all()
    assert len(alerts) == 1
    assert alerts[0].evidence_ids == [post.id]
    assert job.result['ingested'] == 0
    assert await finish_job(db, job, {'items': [raw]}, now) is False
    assert len((await db.scalars(select(PulseAlert))).all()) == 1


@pytest.mark.asyncio
async def test_manual_ingestion_alone_never_emits_growth_alert(db):
    post = await item(db)
    await observation(db, post, datetime.utcnow() - timedelta(hours=1), {'likes': 0})
    await ingest_items(db, await db.get(WatchTopic, 'a'), [
        {'url': post.url, 'source': 'xpoz', 'platform': 'x', 'metrics': {'likes': 1000}}])
    assert (await db.scalars(select(PulseAlert))).all() == []
