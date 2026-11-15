from datetime import datetime, timedelta

import pytest
from sqlalchemy import select
from app.services.pulse_listening import spike_evidence, parse_sentiment


def test_the_latest_window_is_a_spike_by_the_shared_rule_among_the_windows_before_it():
    # Posts of one conversation group per 30 minutes, oldest first; the last number is the window that just ended.
    assert spike_evidence([4, 4, 9]) is None, 'nine posts are under the alert\'s floor of ten'
    assert spike_evidence([8, 8, 11]) is None, 'under one and a half times the usual window'
    assert spike_evidence([4, 20]) is None, 'one earlier window is too little to know what is usual'
    assert spike_evidence([4, 4, 30, 12]) is None, 'the rise was earlier: the latest window did not rise'
    assert spike_evidence([4, 4, 12]) == {
        'rule': 'spike_v1', 'posts': 12, 'usual_posts': 4, 'ratio': 3, 'window_minutes': 30, 'baseline_windows': 2,
        'minimum_posts': 10, 'minimum_ratio': 1.5,
        'note': 'Volume posting teramati, bukan seluruh percakapan sosial. Perubahan cakupan crawl dapat memengaruhi hasil.'}
    assert spike_evidence([10, 12, 14, 16, 25])['ratio'] == 1.92, 'the ratio is against the usual window, to two decimals'
    silent = spike_evidence([0, 0, 0, 10])
    assert silent['usual_posts'] == 0 and silent['ratio'] is None, 'from silence to ten posts is a spike, and nothing is so many times zero'


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


# ── The volume alert: the latest 30 minutes of one conversation group against its windows of the last six hours ────
SPIKE_NOW = datetime(2026, 11, 12, 10)


async def spike_group(db, name):
    """A project with one conversation group and nothing in it yet."""
    from app.models.pulse import Issue, WatchTopic
    topic = WatchTopic(id=f'{name}-topic', label=name, query=name)
    db.add(topic)
    await db.flush()
    issue = Issue(id=f'{name}-issue', topic_id=topic.id, title='Sample')
    db.add(issue)
    await db.flush()
    return topic, issue


def group_posts(db, issue, label, count, *, minutes_ago, collected_minutes_ago, accounts=None):
    """`count` posts of the group published `minutes_ago` before SPIKE_NOW, each by its own account unless `accounts` says fewer."""
    from app.models.pulse import SourceItem
    rows = [SourceItem(id=f'{issue.id}-{label}-{index}', topic_id=issue.topic_id, issue_id=issue.id, source='rss', platform='news',
                       author=f'{label}-{index % (accounts or count)}', url=f'https://example.com/{issue.id}/{label}/{index}',
                       published_at=SPIKE_NOW - timedelta(minutes=minutes_ago), crawled_at=SPIKE_NOW - timedelta(minutes=collected_minutes_ago))
            for index in range(count)]
    db.add_all(rows)
    return [row.id for row in rows]


async def volume_alerts(db, topic):
    from app.models.pulse_monitor import PulseAlert
    return (await db.execute(select(PulseAlert).where(PulseAlert.topic_id == topic.id, PulseAlert.kind == 'volume_spike'))).scalars().all()


@pytest.mark.asyncio
async def test_a_volume_alert_needs_an_observed_hour_names_the_rule_and_is_not_repeated_within_two_hours(db):
    from app.services.pulse_monitor import create_cluster_alerts
    topic, issue = await spike_group(db, 'spike')
    earlier = [post for minutes in (45, 75, 105) for post in group_posts(db, issue, f'old{minutes}', 4, minutes_ago=minutes, collected_minutes_ago=minutes - 5)]
    new_ids = group_posts(db, issue, 'new', 12, minutes_ago=10, collected_minutes_ago=1)
    await db.flush()
    # A recent first collection never qualifies: nothing was observed before it, so nothing is known to be usual.
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(minutes=20))
    # One observed window before the latest is still too little: the rule needs two to say what is usual.
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(minutes=80))
    assert not await volume_alerts(db, topic)
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(hours=2))
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(hours=2))
    alerts = await volume_alerts(db, topic)
    assert len(alerts) == 1
    detail = alerts[0].detail
    assert {key: detail[key] for key in ('rule', 'posts', 'usual_posts', 'ratio', 'window_minutes', 'baseline_windows', 'authors')} == {
        'rule': 'spike_v1', 'posts': 12, 'usual_posts': 4, 'ratio': 3, 'window_minutes': 30, 'baseline_windows': 3, 'authors': 12}
    assert set(alerts[0].evidence_ids) == set(new_ids)
    assert set(detail['baseline_evidence_ids']) == set(earlier)
    assert (detail['baseline_start'], detail['baseline_end']) == ('2026-11-12T08:00:00', '2026-11-12T09:30:00')


@pytest.mark.asyncio
async def test_a_group_that_goes_from_silence_to_ten_posts_in_half_an_hour_alerts_and_states_no_ratio(db):
    from app.services.pulse_monitor import create_cluster_alerts
    topic, issue = await spike_group(db, 'silence')
    new_ids = group_posts(db, issue, 'new', 10, minutes_ago=10, collected_minutes_ago=1)
    await db.flush()
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(days=1))
    [alert] = await volume_alerts(db, topic)
    # Six hours are read: the latest window and the eleven before it, all of them empty.
    assert (alert.detail['posts'], alert.detail['usual_posts'], alert.detail['ratio'], alert.detail['baseline_windows']) == (10, 0, None, 11)
    assert alert.detail['baseline_evidence_ids'] == [] and alert.detail['baseline_start'] == '2026-11-12T04:00:00'


@pytest.mark.asyncio
async def test_a_steady_group_does_not_alert_when_its_earlier_posts_arrive_with_the_same_collection(db):
    """A source that is collected every few hours brings the whole stretch at once. The windows are read as they are
    stored now: a group that was just as busy all along did not rise, whenever its posts were collected."""
    from app.services.pulse_monitor import create_cluster_alerts
    topic, issue = await spike_group(db, 'steady')
    for window in range(1, 12):
        group_posts(db, issue, f'window{window}', 12, minutes_ago=30 * window + 10, collected_minutes_ago=1)
    new_ids = group_posts(db, issue, 'new', 12, minutes_ago=10, collected_minutes_ago=1)
    await db.flush()
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(days=1))
    assert not await volume_alerts(db, topic)


@pytest.mark.asyncio
async def test_a_rise_below_ten_posts_or_from_fewer_than_three_accounts_does_not_alert(db):
    from app.services.pulse_monitor import create_cluster_alerts
    topic, small = await spike_group(db, 'small')
    nine = group_posts(db, small, 'new', 9, minutes_ago=10, collected_minutes_ago=1)
    _, narrow = await spike_group(db, 'narrow')
    two_accounts = group_posts(db, narrow, 'new', 14, minutes_ago=10, collected_minutes_ago=1, accounts=2)
    await db.flush()
    await create_cluster_alerts(db, topic.id, nine, SPIKE_NOW, SPIKE_NOW - timedelta(days=1))
    await create_cluster_alerts(db, narrow.topic_id, two_accounts, SPIKE_NOW, SPIKE_NOW - timedelta(days=1))
    from app.models.pulse_monitor import PulseAlert
    stored = (await db.execute(select(PulseAlert.kind).where(PulseAlert.issue_id.in_([small.id, narrow.id]), PulseAlert.kind == 'volume_spike'))).all()
    assert stored == []


@pytest.mark.asyncio
async def test_only_windows_since_the_schedules_baseline_are_read_and_the_stored_baseline_ids_are_capped(db):
    from app.services.pulse_monitor import create_cluster_alerts
    topic, issue = await spike_group(db, 'bounded')
    # Busy before the schedule's first collection: that was never observed as a baseline, so it is not read.
    group_posts(db, issue, 'before', 60, minutes_ago=100, collected_minutes_ago=97)
    new_ids = group_posts(db, issue, 'new', 12, minutes_ago=10, collected_minutes_ago=1)
    await db.flush()
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(minutes=95))
    [alert] = await volume_alerts(db, topic)
    assert (alert.detail['baseline_windows'], alert.detail['usual_posts'], alert.detail['baseline_evidence_ids']) == (2, 0, [])

    topic, issue = await spike_group(db, 'capped')
    newest = group_posts(db, issue, 'window1', 20, minutes_ago=40, collected_minutes_ago=35)
    for window in range(2, 12):
        group_posts(db, issue, f'window{window}', 20, minutes_ago=30 * window + 10, collected_minutes_ago=30 * window + 5)
    new_ids = group_posts(db, issue, 'new', 40, minutes_ago=10, collected_minutes_ago=1)
    await db.flush()
    await create_cluster_alerts(db, topic.id, new_ids, SPIKE_NOW, SPIKE_NOW - timedelta(days=1))
    [alert] = await volume_alerts(db, topic)
    assert (alert.detail['posts'], alert.detail['usual_posts'], alert.detail['ratio']) == (40, 20, 2)
    kept = alert.detail['baseline_evidence_ids']
    assert len(kept) == 200 and set(newest) <= set(kept), 'of 220 baseline posts the 200 newest are kept'


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
    assert 'method' not in response.json() and 'model' not in response.json()   # the engine is not product surface
    assert (await client.post('/api/admin/pulse/items/sentiment-post/sentiment', headers=headers)).status_code == 200
    assert len(calls) == 1
    await db.refresh(item)
    assert item.metrics['likes'] == 9
    assert item.metrics['sentiment']['method'] == 'claude_post_v1'   # the record keeps it: that is what makes the second call free



def test_an_alert_judges_the_latest_window_even_when_three_earlier_windows_were_higher():
    """The chart marks at most three spikes on a line so the line stays readable. An alert asks one question, whether the
    window that just ended is a spike, and three higher windows earlier in the six hours do not make the answer no."""
    from app.services.pulse_listening import spike_evidence
    evidence = spike_evidence([1, 30, 1, 40, 1, 50, 1, 20])
    assert evidence is not None and (evidence['posts'], evidence['usual_posts'], evidence['ratio']) == (20, 1, 20)


@pytest.mark.asyncio
async def test_posts_that_carry_a_date_without_a_clock_are_in_no_half_hour_and_raise_no_alert(db):
    """A source that gives only a date is stored at midnight UTC. A collection that runs a few minutes after midnight
    would read all of them as posted in the last half hour. They cannot be placed in a half hour, so they are left out
    of the windows; posts with a real time at the same minutes still alert."""
    from app.models.pulse import SourceItem
    from app.models.pulse_monitor import PulseAlert
    from app.services.pulse_monitor import create_cluster_alerts
    midnight = datetime(2026, 11, 12, 0, 0, 0)
    now = midnight + timedelta(minutes=10)

    async def alerts_for(name, published):
        topic, issue = await spike_group(db, name)
        rows = [SourceItem(id=f'{issue.id}-{index}', topic_id=topic.id, issue_id=issue.id, source='xpoz', platform='tiktok', author=f'akun-{index}',
                           url=f'https://example.com/{issue.id}/{index}', published_at=published, crawled_at=now) for index in range(12)]
        db.add_all(rows)
        await db.flush()
        await create_cluster_alerts(db, topic.id, [row.id for row in rows], now, now - timedelta(days=1))
        return sorted(alert.kind for alert in (await db.execute(select(PulseAlert).where(PulseAlert.topic_id == topic.id))).scalars().all())

    assert await alerts_for('dateonly', midnight) == []
    assert await alerts_for('clocked', midnight + timedelta(minutes=5)) == ['recent_cluster', 'volume_spike']
