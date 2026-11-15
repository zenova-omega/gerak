"""Behavior tests: fabricated velocity, scope leaks, resets, and auth regressions."""
from datetime import datetime, timedelta
import importlib

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.database import Base, get_db
from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_monitor import MetricSnapshot


@pytest.fixture
async def growth_db():
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as db:
        db.add_all([WatchTopic(id='a', label='A', query='a'), WatchTopic(id='b', label='B', query='b')])
        await db.flush()
        yield db
    await engine.dispose()


async def post(db, name='p', topic='a', published=datetime(2026, 11, 9, 17), url=None):
    item = SourceItem(id=name, topic_id=topic, source='xpoz', platform='x',
                      url=url or f'https://x.com/u/status/{name}', published_at=published,
                      metrics={'likes': 999999})
    db.add(item)
    await db.flush()
    return item


async def snapshots(db, item, observations):
    for i, (hour, metrics) in enumerate(observations):
        db.add(MetricSnapshot(id=f'{item.id}-{i}', item_id=item.id, topic_id=item.topic_id,
                              observed_at=datetime(2026, 11, 12) + timedelta(hours=hour), metrics=metrics))
    await db.flush()


async def growth(db, **kwargs):
    return await importlib.import_module('app.services.pulse_growth').pulse_growth(db, **kwargs)


@pytest.mark.asyncio
async def test_latest_interval_acceleration_and_observed_start(growth_db):
    p = await post(growth_db)
    await snapshots(growth_db, p, [(0, {'likes': 0}), (2, {'likes': 10}), (6, {'likes': 50})])
    data = await growth(growth_db, topic_id='a')
    row = data['posts'][0]
    assert row['delta_engagement'] == 40
    assert row['elapsed_hours'] == 4
    assert row['rate_per_hour'] == 10
    assert row['acceleration_per_hour_squared'] == pytest.approx(5 / 3)
    assert row['first_observed_growth_at'] == '2026-11-12T02:00:00Z'
    assert row['metrics']['comments']['delta'] is None
    assert row['engagement_metrics'] == ['likes']
    assert data['availability']['posts_with_growth'] == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('observations,reason', [
    ([], 'no_snapshots'),
    ([(0, {'likes': 10})], 'insufficient_snapshots'),
    ([(0, {'likes': 10}), (0, {'likes': 20})], 'ambiguous_timestamp'),
    ([(0, {'likes': 10}), (2, {})], 'missing_metrics'),
    ([(0, {'likes': 10}), (2, {'likes': 20, 'comments': 3})], 'metric_coverage_changed'),
])
async def test_unreliable_history_never_fabricates_velocity(growth_db, observations, reason):
    p = await post(growth_db)
    await snapshots(growth_db, p, observations)
    row = (await growth(growth_db))['posts'][0]
    assert row['rate_per_hour'] is None
    assert row['acceleration_per_hour_squared'] is None
    assert row['availability']['reason'] == reason


@pytest.mark.asyncio
async def test_reset_in_any_engagement_component_blocks_positive_total(growth_db):
    p = await post(growth_db)
    await snapshots(growth_db, p, [(0, {'likes': 100, 'comments': 0}),
                                  (1, {'likes': 90, 'comments': 30})])
    row = (await growth(growth_db))['posts'][0]
    assert row['delta_engagement'] == 20
    assert row['metrics']['likes']['delta'] == -10
    assert row['reset_detected'] is True
    assert row['rate_per_hour'] is None
    assert row['first_observed_growth_at'] is None
    assert row['availability']['reason'] == 'counter_reset'


@pytest.mark.asyncio
async def test_zero_and_duplicate_identical_observations_are_preserved(growth_db):
    p = await post(growth_db)
    await snapshots(growth_db, p, [(0, {'likes': 0}), (0, {'likes': 0}), (1, {'likes': 0})])
    row = (await growth(growth_db))['posts'][0]
    assert row['delta_engagement'] == 0
    assert row['rate_per_hour'] == 0
    assert row['snapshot_count'] == 3
    assert row['distinct_observation_count'] == 2
    assert row['first_observed_growth_at'] is None


@pytest.mark.asyncio
async def test_topic_isolation_dedup_and_publication_not_observation_filter(growth_db):
    p = await post(growth_db)
    other = await post(growth_db, 'other', 'b', url=p.url)
    await snapshots(growth_db, p, [(0, {'likes': 1}), (1, {'likes': 3})])
    await snapshots(growth_db, other, [(0, {'likes': 100}), (1, {'likes': 900})])
    # A malformed foreign-topic snapshot must not contaminate the item history.
    growth_db.add(MetricSnapshot(item_id=p.id, topic_id='b', observed_at=datetime(2026, 11, 13), metrics={'likes': 9000}))
    await post(growth_db, 'before', published=datetime(2026, 11, 9, 16, 59, 59))
    await post(growth_db, 'after', published=datetime(2026, 11, 10, 17))
    await post(growth_db, 'unknown', published=None)
    await growth_db.flush()
    bounds = dict(start=datetime(2026, 11, 9, 17), end=datetime(2026, 11, 10, 16, 59, 59, 999999))
    scoped = await growth(growth_db, topic_id='a', **bounds)
    assert [r['id'] for r in scoped['posts']] == ['p']
    assert scoped['posts'][0]['delta_engagement'] == 2
    assert len((await growth(growth_db, **bounds))['posts']) == 1


@pytest.mark.asyncio
async def test_router_auth_validation_and_wib_period(growth_db):
    router = importlib.import_module('app.routers.pulse_growth').router
    from app.middleware.auth import create_access_token
    from app.models import User
    growth_db.add(User(id='admin-growth', nrp='GROWTH', name='Admin', password_hash='unused', role='admin', account_type='prajurit'))
    await post(growth_db)
    await post(growth_db, 'outside', published=datetime(2026, 11, 10, 17))
    await growth_db.flush()
    app = FastAPI()
    app.include_router(router, prefix='/admin/pulse')
    async def override_db():
        yield growth_db
    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.get('/admin/pulse/growth')).status_code == 403
        headers = {'Authorization': f'Bearer {create_access_token("admin-growth", "admin")}'}
        response = await client.get('/admin/pulse/growth', headers=headers, params={'topic_id': 'a', 'from': '2026-11-10', 'to': '2026-11-10'})
        assert response.status_code == 200
        assert [r['id'] for r in response.json()['posts']] == ['p']
        assert response.json()['period'] == {'from': '2026-11-10', 'to': '2026-11-10', 'timezone': 'Asia/Jakarta', 'basis': 'published_at'}
        for params in [{'from': 'bad'}, {'from': '2026-11-11', 'to': '2026-11-10'}]:
            assert (await client.get('/admin/pulse/growth', headers=headers, params=params)).status_code == 422
        assert (await client.get('/admin/pulse/growth', headers=headers, params={'topic_id': 'missing'})).status_code == 404


@pytest.mark.asyncio
async def test_router_period_follows_the_installation_zone(growth_db, monkeypatch):
    from app.services import pulse_measures
    monkeypatch.setattr(pulse_measures, 'zone', lambda: (540, 'WIT'))
    router = importlib.import_module('app.routers.pulse_growth').router
    from app.middleware.auth import create_access_token
    from app.models import User
    growth_db.add(User(id='admin-growth-zone', nrp='GROWTHZ', name='Admin', password_hash='unused', role='admin', account_type='prajurit'))
    await post(growth_db, 'first', published=datetime(2026, 11, 10, 15))       # 00:00 WIT on 11 Nov
    await post(growth_db, 'next-day', published=datetime(2026, 11, 11, 15))    # 00:00 WIT on 12 Nov
    app = FastAPI()
    app.include_router(router, prefix='/admin/pulse')
    async def override_db():
        yield growth_db
    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        headers = {'Authorization': f'Bearer {create_access_token("admin-growth-zone", "admin")}'}
        response = await client.get('/admin/pulse/growth', headers=headers, params={'topic_id': 'a', 'from': '2026-11-11', 'to': '2026-11-11'})
        assert [r['id'] for r in response.json()['posts']] == ['first']
