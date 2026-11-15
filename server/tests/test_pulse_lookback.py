from datetime import date, datetime
from types import SimpleNamespace
import pytest
from app.models.pulse import WatchTopic
from app.services import pulse_lookback as service


@pytest.mark.asyncio
async def test_lookback_defaults_to_seven_days_and_accepts_only_the_offered_ranges(db):
    topic = WatchTopic(label='Mundur', query='mundur', sources=['rss', 'xpoz'])
    db.add(topic)
    await db.flush()
    state = await service.read(db, topic.id)
    assert state['days'] == 7 and state['choices'] == [7, 14, 30] and state['last_run'] is None
    with pytest.raises(ValueError):
        await service.save(db, topic.id, 60)
    await service.save(db, topic.id, 30)
    assert (await service.read(db, topic.id))['days'] == 30
    assert await service.project_platforms(db, topic) == ['news', 'x']


@pytest.mark.asyncio
async def test_run_pulls_the_whole_range_for_each_source(db, monkeypatch):
    topic = WatchTopic(label='Mundur jalan', query='mundur', sources=['rss', 'youtube'])
    db.add(topic)
    await db.flush()
    calls = []
    async def fake(session, row, settings, platform, start, end, release=None, **options):
        assert release is not None, 'the pull must be able to let go of the database while the provider answers'
        calls.append((platform, (end - start).days + 1, end == datetime.utcnow().date()))
        return {'fetched': 5, 'ingested': 2, 'stopped': None}
    monkeypatch.setattr(service, 'backfill', fake)
    class Session:
        async def __aenter__(self): return db
        async def __aexit__(self, *args): return False
    async def no_commit(): return None
    monkeypatch.setattr(db, 'commit', no_commit)
    await service.run(topic.id, 14, lambda: Session(), SimpleNamespace())
    assert calls == [('news', 14, True), ('youtube', 14, True)]
    last = (await service.read(db, topic.id))['last_run']
    assert last['days'] == 14 and [r['platform'] for r in last['results']] == ['news', 'youtube'] and last['results'][0]['ingested'] == 2


@pytest.mark.asyncio
async def test_a_new_project_gets_recurring_collection_for_every_chosen_source(db):
    from sqlalchemy import select, update
    from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy
    from app.services.pulse_monitor import ensure_policies
    topic = WatchTopic(label='Project baru', query='baru', sources=['rss', 'xpoz', 'youtube'])
    db.add(topic)
    await db.flush()
    await ensure_policies(db)
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider.in_(('rss', 'xpoz'))).values(daily_limit=-1, blocked_reason=None))
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == 'youtube').values(daily_limit=0))        # switched off in Monitor
    now = datetime(2026, 11, 14, 10, 0)
    db.add(MonitorSchedule(topic_id=topic.id, provider='rss', enabled=False, interval_minutes=45, next_run_at=now))  # someone already decided this one
    await db.flush()
    switched = await service.enable_schedules(db, topic, ['rss', 'xpoz', 'youtube', 'instagram', 'tiktok', 'tidak-ada'], now)
    assert switched == ['xpoz', 'instagram', 'tiktok']
    rows = {row.provider: row for row in (await db.execute(select(MonitorSchedule).where(MonitorSchedule.topic_id == topic.id))).scalars()}
    assert (rows['rss'].enabled, rows['rss'].interval_minutes) == (False, 45)          # an existing choice is left alone
    assert 'youtube' not in rows                                                        # a lane that is switched off stays off
    assert (rows['xpoz'].enabled, rows['xpoz'].interval_minutes) == (True, 120)
    assert (rows['instagram'].interval_minutes, rows['tiktok'].interval_minutes) == (120, 120) and rows['tiktok'].enabled is True   # as often as X
    assert rows['xpoz'].next_run_at == datetime(2026, 11, 14, 12, 0)                    # the first pull covers now; the schedule takes over one interval later
    assert await service.project_platforms(db, topic) == ['news', 'x', 'instagram', 'tiktok', 'youtube']


@pytest.mark.asyncio
async def test_a_run_reports_progress_per_source_while_it_works(db, monkeypatch):
    topic = WatchTopic(label='Kemajuan', query='maju', sources=['rss', 'xpoz', 'youtube'])
    db.add(topic)
    await db.flush()
    seen = {}

    async def fake(session, row, settings, platform, start, end, release=None, newest_first=False, progress=None):
        seen[platform] = {'newest_first': newest_first, 'during': dict(service.read_progress(topic.id)['platforms'][platform])}
        progress(120, 80)
        seen[platform]['after_window'] = dict(service.read_progress(topic.id)['platforms'][platform])
        return {'fetched': 240, 'ingested': 150, 'stopped': None}
    monkeypatch.setattr(service, 'backfill', fake)

    class Session:
        async def __aenter__(self): return db
        async def __aexit__(self, *args): return False

    async def no_commit(): return None
    monkeypatch.setattr(db, 'commit', no_commit)
    await service.run(topic.id, 7, Session, SimpleNamespace())
    assert set(seen) == {'news', 'x', 'youtube'} and all(row['newest_first'] for row in seen.values())
    assert seen['x']['during']['state'] == 'running'
    assert (seen['x']['after_window']['fetched'], seen['x']['after_window']['ingested']) == (120, 80)
    final = (await service.read(db, topic.id))['progress']
    assert {name: row['state'] for name, row in final['platforms'].items()} == {'news': 'done', 'x': 'done', 'youtube': 'done'}
    assert final['platforms']['x']['fetched'] == 240 and final['finished'] is True


@pytest.mark.asyncio
async def test_the_archive_pull_can_start_with_the_newest_day_and_report_each_window(db, monkeypatch):
    from app.config import get_settings
    from app.services import pulse_backfill as archive
    topic = WatchTopic(id='bf-order', label='b', query='contoh', is_active=False)
    db.add(topic)
    await db.flush()
    settings = get_settings()
    monkeypatch.setattr(settings, 'XPOZ_API_KEY', type(settings.XPOZ_API_KEY)('k'))
    asked, reported = [], []

    async def fake(provider, query, key, first, last):
        asked.append(first.isoformat())
        return [{'source': 'xpoz', 'platform': 'x', 'url': f'https://x.com/i/status/{first.day}', 'text': f'isi hari {first.day} yang berbeda', 'title': 't', 'author': 'a', 'published_at': None, 'metrics': {}}]
    monkeypatch.setattr(archive, 'fetch_window', fake)
    await archive.backfill(db, topic, settings, 'x', date(2026, 11, 12), date(2026, 11, 14), pause=0, newest_first=True, progress=lambda fetched, stored: reported.append((fetched, stored)))
    assert asked == ['2026-11-14', '2026-11-13', '2026-11-12']
    assert reported == [(1, 1), (2, 2), (3, 3)]


@pytest.mark.asyncio
async def test_starting_a_project_switches_its_schedules_on_and_begins_the_complete_pull(client, admin_token, db, monkeypatch):
    from sqlalchemy import select, update
    from app.models.pulse_monitor import MonitorSchedule, WorkerPolicy
    from app.services.pulse_monitor import ensure_policies
    topic = WatchTopic(label='Mulai', query='mulai', sources=['rss', 'xpoz'])
    db.add(topic)
    await db.flush()
    await ensure_policies(db)
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider.in_(('rss', 'xpoz', 'youtube'))).values(daily_limit=-1, blocked_reason=None))
    started = []

    async def fake_run(topic_id, days, session_factory, settings):
        started.append((topic_id, days))
    monkeypatch.setattr(service, 'run', fake_run)

    async def no_commit(): return None
    monkeypatch.setattr(db, 'commit', no_commit)      # the route commits; the shared test database must stay clean
    headers = {'Authorization': f'Bearer {admin_token}'}
    answer = await client.post(f'/api/admin/pulse/topics/{topic.id}/start', json={'days': 14, 'platforms': ['news', 'x', 'instagram']}, headers=headers)
    assert answer.status_code == 200
    body = answer.json()
    assert body['days'] == 14 and body['running'] is True and body['scheduled'] == ['rss', 'social', 'instagram']   # lanes carry their public names
    import asyncio
    await asyncio.sleep(0)
    assert started == [(topic.id, 14)]
    rows = {row.provider: row.enabled for row in (await db.execute(select(MonitorSchedule).where(MonitorSchedule.topic_id == topic.id))).scalars()}
    assert rows == {'rss': True, 'xpoz': True, 'instagram': True}
    assert (await client.post(f'/api/admin/pulse/topics/{topic.id}/start', json={'days': 60}, headers=headers)).status_code == 422
    assert (await client.post('/api/admin/pulse/topics/tidak-ada/start', json={'days': 7}, headers=headers)).status_code == 404
