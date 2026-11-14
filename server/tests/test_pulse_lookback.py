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
    async def fake(session, row, settings, platform, start, end):
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
