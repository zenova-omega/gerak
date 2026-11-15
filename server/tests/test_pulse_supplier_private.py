"""Who supplies the data is an operations detail. The browser knows the paid social lane only as "social".

Inside the server (database rows, workers, settings) the lane keeps its supplier's name. Every answer names it "social",
and the browser says "social" when it changes a limit, a schedule or a project's sources.
"""
from datetime import datetime

import httpx
import pytest

from app.models.pulse import Issue, PulseCrawlRun, SourceItem, WatchTopic
from app.models.pulse_monitor import CrawlJob, MonitorSchedule, PulseAlert, QuotaReservation, WorkerPolicy, WorkerUsage
from app.models.pulse_sources import SourceAccount

SUPPLIER = 'xpoz'


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture
async def lanes(db):
    """One project the way the workers leave it: every table that names a lane has a row for the paid social one."""
    from app.services.pulse_monitor import ensure_policies
    await ensure_policies(db)
    now = datetime.utcnow()
    day = now.date().isoformat()
    topic = WatchTopic(label='Kabar kota', query='kabar kota', sources=['rss', SUPPLIER, 'youtube'])
    db.add(topic)
    await db.flush()
    issue = Issue(topic_id=topic.id, title='Kabar kota')
    db.add(issue)
    await db.flush()
    item = SourceItem(topic_id=topic.id, issue_id=issue.id, source=SUPPLIER, platform='x', url='https://x.com/warga/status/1988001122334499',
                      author='warga', text='Kabar kota hari ini', published_at=datetime(2026, 11, 11, 2), metrics={'likes': 3})
    schedule = MonitorSchedule(topic_id=topic.id, provider=SUPPLIER, enabled=True, interval_minutes=120)
    db.add_all([item, schedule])
    await db.flush()
    db.add_all([
        CrawlJob(schedule_id=schedule.id, topic_id=topic.id, provider=SUPPLIER, status='queued'),
        QuotaReservation(provider=SUPPLIER, topic_id=topic.id, platform='instagram', mode='manual', day=day, reserved_at=now),
        PulseCrawlRun(topic_id=topic.id, manual=True, finished_at=now, ingested=1,
                      providers={'rss': {'status': 'success', 'ingested': 1}, SUPPLIER: {'status': 'manual_only', 'ingested': 0}}),
        # A failed collection raises an alert whose stored title starts with the lane.
        PulseAlert(dedup_key=f'failure:{topic.id}', topic_id=topic.id, kind='collection_error', title=f'{SUPPLIER}: rate_limited',
                   created_at=now, window_start=now, window_end=now, evidence_ids=[], detail={'job_id': 'j1', 'error': 'rate_limited'}),
    ])
    usage = await db.get(WorkerUsage, f'{SUPPLIER}:{day}')
    if usage is None:
        db.add(WorkerUsage(id=f'{SUPPLIER}:{day}', provider=SUPPLIER, day=day, used=3))
    else:
        usage.used = 3
    if await db.get(SourceAccount, SUPPLIER) is None:
        db.add(SourceAccount(provider=SUPPLIER, detail={'status': 'verified', 'tools': ['getTwitterPostsByKeywords'], 'credits_remaining': 100}))
    await db.flush()
    return topic, issue, item


READS = (
    ('/topics', lambda t: {}),
    ('/monitor', lambda t: {}),
    ('/monitor', lambda t: {'topic_id': t.id}),
    ('/sources', lambda t: {}),
    ('/sources', lambda t: {'topic_id': t.id}),
    ('/sources/balance', lambda t: {}),
    ('/issues/{issue}', lambda t: {}),
    ('/topics/{topic}/runs', lambda t: {}),
    ('/topics/{topic}/lookback', lambda t: {}),
    ('/topics/{topic}/comments/coverage', lambda t: {}),
    ('/analytics', lambda t: {'topic_id': t.id}),
)


@pytest.mark.asyncio
@pytest.mark.parametrize('path,params', READS, ids=[f'{index}:{path}' for index, (path, _) in enumerate(READS)])
async def test_no_page_of_data_names_the_supplier(client, admin_token, lanes, path, params):
    topic, issue, _ = lanes
    answer = await client.get('/api/admin/pulse' + path.format(topic=topic.id, issue=issue.id), params=params(topic), headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert SUPPLIER not in answer.text.lower()


@pytest.mark.asyncio
async def test_monitor_names_the_paid_lane_social_wherever_a_lane_is_named(client, admin_token, lanes):
    topic, _, _ = lanes
    data = (await client.get('/api/admin/pulse/monitor', params={'topic_id': topic.id}, headers=auth(admin_token))).json()
    worker = next(row for row in data['workers'] if row['provider'] == 'social')
    assert worker['used'] == 3
    assert [row['provider'] for row in data['schedules']] == ['social']
    assert 'social' in {row['provider'] for row in data['jobs']}
    assert {'provider': 'social', 'platform': 'instagram', 'mode': 'manual'}.items() <= next(row for row in data['quota_breakdown'] if row['topic_id'] == topic.id).items()
    assert 'social' in data['quota_unattributed']
    assert {'topic_id': topic.id, 'source': 'social', 'status': 'queued', 'count': 1}.items() <= next(row for row in data['quota_queue'] if row['topic_id'] == topic.id).items()
    assert next(row for row in data['alerts'] if row['kind'] == 'collection_error' and row['topic_id'] == topic.id)['title'] == 'social: rate_limited'


@pytest.mark.asyncio
async def test_sources_projects_runs_and_posts_use_the_same_name(client, admin_token, lanes):
    topic, issue, _ = lanes
    headers = auth(admin_token)
    sources = (await client.get('/api/admin/pulse/sources', params={'topic_id': topic.id}, headers=headers)).json()['sources']
    assert {row['platform']: row['provider'] for row in sources} == {'x': 'social', 'instagram': 'social', 'tiktok': 'social', 'youtube': 'youtube', 'news': 'rss', 'threads': 'threads'}
    assert next(row for row in sources if row['platform'] == 'x')['tool_available'] is True      # still worked out from the real lane
    listed = next(row for row in (await client.get('/api/admin/pulse/topics', headers=headers)).json() if row['id'] == topic.id)
    assert listed['sources'] == ['rss', 'social', 'youtube']
    runs = (await client.get(f'/api/admin/pulse/topics/{topic.id}/runs', headers=headers)).json()
    assert set(runs[0]['providers']) == {'rss', 'social'} and runs[0]['providers']['social']['status'] == 'manual_only'
    detail = (await client.get(f'/api/admin/pulse/issues/{issue.id}', headers=headers)).json()
    assert detail['source_items'][0]['source'] == 'social'


@pytest.mark.asyncio
async def test_a_limit_set_for_social_reaches_the_real_lane(client, admin_token, db, lanes):
    answer = await client.put('/api/admin/pulse/monitor/workers/social', json={'daily_limit': 7}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert answer.json()['provider'] == 'social' and answer.json()['daily_limit'] == 7
    policy = await db.get(WorkerPolicy, SUPPLIER, populate_existing=True)
    assert policy.daily_limit == 7


@pytest.mark.asyncio
async def test_a_schedule_set_for_social_reaches_the_real_lane(client, admin_token, db, lanes):
    topic, _, _ = lanes
    answer = await client.put(f'/api/admin/pulse/monitor/topics/{topic.id}/social', json={'enabled': False, 'interval_minutes': 240}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert answer.json()['provider'] == 'social' and answer.json()['interval_minutes'] == 240
    from sqlalchemy import select
    stored = (await db.execute(select(MonitorSchedule).where(MonitorSchedule.topic_id == topic.id))).scalars().all()
    assert [(row.provider, row.interval_minutes, row.enabled) for row in stored] == [(SUPPLIER, 240, False)]


@pytest.mark.asyncio
async def test_a_project_made_or_changed_with_social_keeps_the_real_lane(client, admin_token, db):
    headers = auth(admin_token)
    made = await client.post('/api/admin/pulse/topics', json={'label': 'Project sosial', 'query': 'sosial', 'sources': ['rss', 'social']}, headers=headers)
    assert made.status_code in (200, 201), made.text
    assert made.json()['sources'] == ['rss', 'social']
    topic = await db.get(WatchTopic, made.json()['id'], populate_existing=True)
    assert topic.sources == ['rss', SUPPLIER]
    changed = await client.put(f'/api/admin/pulse/topics/{topic.id}', json={'sources': ['social', 'youtube']}, headers=headers)
    assert changed.status_code == 200, changed.text
    assert changed.json()['sources'] == ['social', 'youtube']
    await db.refresh(topic)
    assert topic.sources == [SUPPLIER, 'youtube']


@pytest.mark.asyncio
async def test_a_new_project_reports_which_lanes_it_switched_on_by_their_public_names(client, admin_token, db, monkeypatch):
    from app.services import pulse_lookback
    from app.services.pulse_monitor import ensure_policies

    async def nothing(*args, **kwargs):
        return None
    monkeypatch.setattr(pulse_lookback, 'run', nothing)          # the background pull is not part of this test
    monkeypatch.setattr(db, 'commit', nothing)                    # tests share one database file
    await ensure_policies(db)
    policy = await db.get(WorkerPolicy, SUPPLIER)
    policy.daily_limit, policy.blocked_reason = -1, None
    topic = WatchTopic(label='Project baru', query='baru', sources=['rss', SUPPLIER])
    db.add(topic)
    await db.flush()
    answer = await client.post(f'/api/admin/pulse/topics/{topic.id}/start', json={'days': 7, 'platforms': ['x', 'instagram']}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert answer.json()['scheduled'] == ['social', 'instagram']
    from sqlalchemy import select
    assert sorted((await db.scalars(select(MonitorSchedule.provider).where(MonitorSchedule.topic_id == topic.id))).all()) == ['instagram', SUPPLIER]


def test_what_went_wrong_at_the_supplier_is_told_without_its_name():
    from app.services.ingest.xpoz import XpozToolError
    from app.services.pulse import _provider_error
    request = httpx.Request('POST', 'https://example.test')
    failures = [XpozToolError('plan_restricted'), XpozToolError('pending'),
                httpx.HTTPStatusError('402', request=request, response=httpx.Response(402, request=request)),
                httpx.HTTPStatusError('403', request=request, response=httpx.Response(403, request=request))]
    for failure in failures:
        told = _provider_error(failure, SUPPLIER)
        assert SUPPLIER not in str(told).lower(), told
        assert told['message']


def test_a_collection_result_is_keyed_by_public_lane_names():
    from app.services.pulse_public import lane_for_reader, lane_from_reader, lanes_for_reader
    stored = {'rss': {'status': 'success'}, SUPPLIER: {'status': 'manual_only', 'message': 'kept as written'}}
    assert lanes_for_reader(stored) == {'rss': {'status': 'success'}, 'social': {'status': 'manual_only', 'message': 'kept as written'}}
    assert set(stored) == {'rss', SUPPLIER}, 'the stored result is left as it was'
    assert lanes_for_reader(None) == {}
    # Only a whole id is a lane. Anything else, and anything that is not a string, passes through both ways.
    assert [lane_for_reader(value) for value in (SUPPLIER, 'rss', 'akun ' + SUPPLIER, None, 3)] == ['social', 'rss', 'akun ' + SUPPLIER, None, 3]
    assert [lane_from_reader(value) for value in ('social', SUPPLIER, 'youtube', None)] == [SUPPLIER, SUPPLIER, 'youtube', None]
