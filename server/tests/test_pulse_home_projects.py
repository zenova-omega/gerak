"""The project rows on Beranda: enough numbers to choose which project to open, read in a few grouped queries."""
from datetime import datetime, timedelta

import pytest

from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_monitor import MonitorSchedule, PulseAlert

API = '/api/admin/pulse/home/projects'


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture
def now():
    return datetime.utcnow().replace(microsecond=0)


def post(topic, index, published, tone=None):
    return SourceItem(topic_id=topic.id, source='rss', platform='news', url=f'https://news.example/{topic.id}/{index}', text='x', published_at=published,
                      metrics={'sentiment': {'label': tone}} if tone else {})


def alert(topic, index, now, acknowledged=None):
    return PulseAlert(dedup_key=f'{topic.id}:{index}', topic_id=topic.id, kind='spike', title='Lonjakan', window_start=now - timedelta(hours=2), window_end=now,
                      acknowledged_at=acknowledged)


async def rows(client, admin_token, *topics):
    response = await client.get(API, headers=auth(admin_token))
    assert response.status_code == 200, response.text
    mine = {topic.id for topic in topics}
    return [row for row in response.json() if row['id'] in mine]


@pytest.mark.asyncio
async def test_a_row_counts_the_last_day_against_the_day_before_and_unread_alerts(client, db, admin_token, now):
    topic = WatchTopic(label='Isu Penyadapan Presiden', query='penyadapan')
    db.add(topic)
    await db.flush()
    hours = [1, 5, 23, 25, 47, 80, None]            # three in the last day, two in the day before, one older, one without a date
    tones = ['positive', 'negative', 'negative', 'neutral', None, 'neutral', 'positive']    # the undated post is in no day, so its tone is not counted
    db.add_all([post(topic, index, now - timedelta(hours=value) if value is not None else None, tones[index]) for index, value in enumerate(hours)])
    db.add_all([alert(topic, 1, now), alert(topic, 2, now, acknowledged=now)])
    db.add_all([MonitorSchedule(topic_id=topic.id, provider='rss', enabled=True, last_success_at=now - timedelta(minutes=12)),
                MonitorSchedule(topic_id=topic.id, provider='youtube', enabled=False, last_success_at=now - timedelta(hours=9))])
    await db.flush()
    [row] = await rows(client, admin_token, topic)
    assert row == {'id': topic.id, 'label': 'Isu Penyadapan Presiden', 'collecting': True, 'posts_total': 7, 'posts_24h': 3, 'posts_prev_24h': 2,
                   'alerts_unread': 1, 'last_collected_at': (now - timedelta(minutes=12)).isoformat(), 'newest_post_at': (now - timedelta(hours=1)).isoformat(),
                   'series_7d': [0, 0, 0, 1, 0, 2, 3], 'sentiment_7d': {'positive': 1, 'neutral': 2, 'negative': 2, 'unknown': 1}}, \
        'seven steps of 24 hours, oldest first, so the last two are the figures above; tones of the posts in those seven days'


@pytest.mark.asyncio
async def test_a_project_with_every_schedule_off_is_not_collecting_and_sorts_last(client, db, admin_token, now):
    quiet, paused, busy = WatchTopic(label='Tenang', query='a'), WatchTopic(label='Dijeda', query='b'), WatchTopic(label='Ramai', query='c')
    db.add_all([quiet, paused, busy])
    await db.flush()
    db.add_all([MonitorSchedule(topic_id=quiet.id, provider='rss', enabled=True), MonitorSchedule(topic_id=busy.id, provider='rss', enabled=True),
                MonitorSchedule(topic_id=paused.id, provider='rss', enabled=False)])
    db.add_all([post(busy, index, now - timedelta(hours=2)) for index in range(4)] + [post(paused, index, now - timedelta(hours=2)) for index in range(9)])
    await db.flush()
    found = await rows(client, admin_token, quiet, paused, busy)
    assert [(row['label'], row['collecting'], row['posts_24h']) for row in found] == [('Ramai', True, 4), ('Tenang', True, 0), ('Dijeda', False, 9)]
    assert found[1]['last_collected_at'] is None and found[1]['newest_post_at'] is None and found[1]['alerts_unread'] == 0


@pytest.mark.asyncio
async def test_a_project_without_any_schedule_is_listed_as_not_collecting(client, db, admin_token):
    topic = WatchTopic(label='Baru dibuat', query='x')
    db.add(topic)
    await db.flush()
    [row] = await rows(client, admin_token, topic)
    assert row['collecting'] is False and row['posts_total'] == 0 and row['posts_24h'] == 0 and row['posts_prev_24h'] == 0
    assert row['series_7d'] == [0] * 7 and row['sentiment_7d'] == {'positive': 0, 'neutral': 0, 'negative': 0, 'unknown': 0}


@pytest.mark.asyncio
async def test_a_project_week_of_tone_reads_each_post_by_tone_share_v1_in_either_stored_form(client, db, admin_token, now):
    """Both stored label forms, in any letter case, give the same tone; any other label is "belum dianalisis"."""
    topic = WatchTopic(label='Dua bentuk label', query='bentuk')
    db.add(topic)
    await db.flush()
    stored = [{'sentiment': 'negative'}, {'sentiment': {'label': 'negative'}}, {'sentiment': {'label': ' Positive '}}, {'sentiment': 'NEUTRAL'},
              {'sentiment': {'label': 'mixed'}}, {'sentiment': None}, {}]
    db.add_all([SourceItem(topic_id=topic.id, source='rss', platform='news', url=f'https://news.example/{topic.id}/form{index}', text='x',
                           published_at=now - timedelta(hours=2), metrics=metrics) for index, metrics in enumerate(stored)])
    await db.flush()
    [row] = await rows(client, admin_token, topic)
    assert row['sentiment_7d'] == {'positive': 1, 'neutral': 1, 'negative': 2, 'unknown': 3}
