import pytest
from app.services.pulse_listening import spike_evidence, parse_sentiment


def test_spike_requires_volume_and_nonzero_baseline():
    assert spike_evidence(9, 1) is None
    assert spike_evidence(20, 0) is None
    assert spike_evidence(10, 4) is None
    assert spike_evidence(12, 4)['ratio'] == 3


def test_sentiment_rejects_invalid_instead_of_neutral():
    result = parse_sentiment('{"label":"negative","confidence":0.8,"reason":"Keluhan layanan"}')
    assert result['label'] == 'negative'
    for raw in ['invalid', '{"label":"neutral","confidence":2}', '{"label":"fake","confidence":0.7}']:
        with pytest.raises(ValueError):
            parse_sentiment(raw)


@pytest.mark.asyncio
async def test_search_requires_auth_and_literal_query(client, admin_token):
    headers = {'Authorization': f'Bearer {admin_token}'}
    assert (await client.get('/api/admin/pulse/search', params={'q': 'hello'})).status_code in (401, 403)
    assert (await client.get('/api/admin/pulse/search', params={'q': ' '}, headers=headers)).status_code == 422
    response = await client.get('/api/admin/pulse/search', params={'q': '%__no_such_post__%'}, headers=headers)
    assert response.status_code == 200
    assert response.json()['posts'] == []
    assert response.json()['scope'] == 'stored_only'


@pytest.mark.asyncio
async def test_ai_status_does_not_expose_credentials(client, admin_token, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), 'AI_PROVIDER', '')
    response = await client.get('/api/admin/pulse/sentiment/status', headers={'Authorization': f'Bearer {admin_token}'})
    assert response.json()['configured'] is False
    assert 'key' not in str(response.json()).lower()


@pytest.mark.asyncio
async def test_spike_baseline_evidence_cooldown_and_backfill(db):
    from datetime import datetime, timedelta
    from sqlalchemy import select
    from app.models.pulse import WatchTopic, Issue, SourceItem
    from app.models.pulse_monitor import PulseAlert
    from app.services.pulse_monitor import create_cluster_alerts
    now = datetime(2026, 11, 12, 10)
    topic = WatchTopic(id='spike-topic', label='Spike', query='Spike')
    db.add(topic)
    await db.flush()
    issue = Issue(id='spike-issue', topic_id=topic.id, title='Sample')
    db.add(issue)
    await db.flush()
    rows = []
    for i in range(16):
        old = i < 4
        row = SourceItem(id=f'spike-{i}', topic_id=topic.id, issue_id=issue.id,
                         source='rss', platform='news', author=f'Author{i}',
                         url=f'https://example.com/spike/{i}',
                         published_at=now-timedelta(minutes=45 if old else 10),
                         crawled_at=now-timedelta(minutes=40 if old else 1))
        db.add(row)
        rows.append(row)
    await db.flush()
    new_ids = [r.id for r in rows[4:]]
    # A recent first collection never qualifies as a baseline spike.
    await create_cluster_alerts(db, topic.id, new_ids, now, now-timedelta(minutes=20))
    assert not (await db.execute(select(PulseAlert).where(PulseAlert.kind=='volume_spike'))).scalars().all()
    await create_cluster_alerts(db, topic.id, new_ids, now, now-timedelta(hours=2))
    await create_cluster_alerts(db, topic.id, new_ids, now, now-timedelta(hours=2))
    alerts = (await db.execute(select(PulseAlert).where(PulseAlert.kind=='volume_spike'))).scalars().all()
    assert len(alerts) == 1
    assert alerts[0].detail['ratio'] == 3
    assert set(alerts[0].evidence_ids) == set(new_ids)
    assert len(alerts[0].detail['baseline_evidence_ids']) == 4


@pytest.mark.asyncio
async def test_real_sentiment_pipeline_caches_and_preserves_metrics(client, admin_token, db, monkeypatch):
    from app.models.pulse import WatchTopic, SourceItem
    from app.services import ai
    topic = WatchTopic(id='sentiment-topic', label='Sentiment', query='Test')
    db.add(topic)
    await db.flush()
    item = SourceItem(id='sentiment-post', topic_id=topic.id, source='rss', platform='news',
                      text='Pelayanan sangat mengecewakan', url='https://example.com/sentiment', metrics={'likes': 9})
    db.add(item)
    await db.flush()
    calls = []
    class Provider:
        async def generate_text(self, text, **kwargs):
            calls.append(text)
            return '{"label":"negative","confidence":0.8,"reason":"Keluhan pelayanan"}'
    monkeypatch.setattr(ai, 'get_ai_service', lambda: Provider())
    headers = {'Authorization': f'Bearer {admin_token}'}
    response = await client.post('/api/admin/pulse/items/sentiment-post/sentiment', headers=headers)
    assert response.status_code == 200
    assert response.json()['label'] == 'negative'
    assert response.json()['method'] == 'claude_post_v1'
    assert (await client.post('/api/admin/pulse/items/sentiment-post/sentiment', headers=headers)).status_code == 200
    assert len(calls) == 1
    await db.refresh(item)
    assert item.metrics['likes'] == 9
