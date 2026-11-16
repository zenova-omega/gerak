"""What Beranda reads: the latest stored refresh of the radar, never a new one.

Rows are written straight into the database. Every test runs against the one session the app is given and commits
nothing, because the routes read "the newest run" of the whole table.
"""
from datetime import datetime, timedelta

import pytest

from app.models.pulse import WatchTopic
from app.models.pulse_monitor import WorkerPolicy
from app.models.pulse_radar import RadarIssue, RadarRun
from app.services.pulse_radar import PROVIDER, latest

API = '/api/admin/pulse'


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture(autouse=True)
def nothing_is_committed(db, monkeypatch):
    async def keep():
        await db.flush()
    monkeypatch.setattr(db, 'commit', keep)


@pytest.fixture
def now():
    return datetime.utcnow().replace(microsecond=0)


def run(db, started, state='ok', **values):
    values.setdefault('missing', [])
    row = RadarRun(started_at=started, finished_at=started + timedelta(seconds=40), state=state, provinces_read=['ID-JK', 'ID-JI'],
                   raw={'news': [], 'youtube': [], 'search': []}, usage={'signals': {'news': 3}, 'seconds': 12.5}, **values)
    db.add(row)
    return row


def issue(db, of, key, rank, title, scope='national', first_seen=None, **values):
    row = RadarIssue(run_id=of.id, key=key, scope=scope, rank=rank, title=title, category=values.pop('category', 'politik'), reason='Ramai di berita.', score=1.5,
                     platforms=values.pop('platforms', {'news': {'count': 5}}), regions=values.pop('regions', []), evidence=values.pop('evidence', []),
                     query=values.pop('query', {'q': title.lower(), 'required': '', 'excluded': ''}), first_seen_at=first_seen or of.started_at - timedelta(days=2), **values)
    db.add(row)
    return row


async def read(client, admin_token, path='/radar'):
    response = await client.get(API + path, headers=auth(admin_token))
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio
async def test_the_latest_composed_run_is_returned_with_everything_the_page_filters_on(client, db, admin_token, now):
    older = run(db, now - timedelta(minutes=40))
    newer = run(db, now - timedelta(minutes=10), state='partial', missing=['ID-PA'], brief='Dua isu menonjol [1][2].')
    await db.flush()
    issue(db, older, 'k-old', 1, 'Isu lama')
    issue(db, newer, 'k-b', 2, 'Harga beras naik', category='ekonomi', platforms={'news': {'count': 50}})
    issue(db, newer, 'k-a', 1, 'Laga Jepang lawan Brasil', category='olahraga', platforms={'news': {'count': 5}, 'search': {'searches': 5000}},
          regions=[{'code': 'ID-BA', 'searches': 5000}],
          evidence=[{'platform': 'news', 'title': 'Laga di Malang', 'url': 'https://news.example/a', 'source': 'Kompas', 'figure': 4},
                    {'platform': 'search', 'title': 'jepang vs brasil', 'url': None, 'source': None, 'figure': 5000}])
    issue(db, newer, 'k-l', 3, 'Polda Jawa Timur', scope='local', regions=[{'code': 'ID-JI', 'searches': 200}])
    await db.flush()
    data = await read(client, admin_token)
    assert data['state'] == 'partial' and data['updated_at'] == newer.started_at.isoformat() and data['daily_at'] == '08:00' and 'interval_minutes' not in data
    assert data['missing'] == ['ID-PA'] and data['provinces_read'] == ['ID-JK', 'ID-JI'] and data['brief'] == 'Dua isu menonjol [1][2].'
    assert data['running'] is False and data['enabled'] is False and data['raw'] is None
    assert data['signals'] == {'news': 3}, 'how many signals the refresh read, per platform'
    assert data['last_attempt'] == {'state': 'partial', 'at': newer.started_at.isoformat()}
    assert [(row['key'], row['rank'], row['scope']) for row in data['issues']] == [('k-a', 1, 'national'), ('k-b', 2, 'national'), ('k-l', 3, 'local')]
    first = data['issues'][0]
    assert first == {'key': 'k-a', 'scope': 'national', 'rank': 1, 'title': 'Laga Jepang lawan Brasil', 'category': 'olahraga', 'reason': 'Ramai di berita.',
                     'platforms': {'news': {'count': 5}, 'search': {'searches': 5000}}, 'regions': [{'code': 'ID-BA', 'searches': 5000}], 'image': None,
                     'evidence_titles': ['Laga di Malang'], 'query': {'q': 'laga jepang lawan brasil', 'required': '', 'excluded': ''}, 'movement': None, 'project': None}


@pytest.mark.asyncio
async def test_a_failed_compose_keeps_the_last_composed_run(client, db, admin_token, now):
    composed = run(db, now - timedelta(minutes=20))
    run(db, now - timedelta(minutes=5), state='raw')
    run(db, now - timedelta(minutes=2), state='failed')
    await db.flush()
    issue(db, composed, 'k-a', 1, 'Isu A')
    await db.flush()
    data = await read(client, admin_token)
    assert data['state'] == 'ok' and [row['title'] for row in data['issues']] == ['Isu A'] and data['updated_at'] == composed.started_at.isoformat()
    assert data['last_attempt'] == {'state': 'failed', 'at': (now - timedelta(minutes=2)).isoformat()}, 'the newest attempt is told even when its list is not the one shown'


MORNING = datetime(2026, 11, 15, 1, 0)      # 08.00 WIB, when the day's refresh is due


@pytest.mark.asyncio
async def test_a_list_is_current_all_day_and_stale_once_the_next_morning_s_refresh_is_an_hour_late(db):
    shown = run(db, MORNING - timedelta(days=1) + timedelta(minutes=3))      # yesterday 08.03 WIB
    await db.flush()
    issue(db, shown, 'k-a', 1, 'Isu A')
    await db.flush()
    assert (await latest(db, MORNING - timedelta(minutes=1)))['state'] == 'ok', 'yesterday\'s list is the list of the day until 08.00'
    assert (await latest(db, MORNING + timedelta(minutes=59)))['state'] == 'ok', 'the day\'s refresh takes minutes and may be on its way'
    assert (await latest(db, MORNING + timedelta(minutes=61)))['state'] == 'stale'
    shown.started_at = MORNING + timedelta(minutes=3)
    await db.flush()
    assert (await latest(db, MORNING + timedelta(hours=23, minutes=59)))['state'] == 'ok', 'a list made this morning is not old in the evening'
    assert (await latest(db, MORNING + timedelta(days=1, minutes=61)))['state'] == 'stale'


@pytest.mark.asyncio
async def test_the_page_is_told_when_the_radar_refreshes_and_when_it_next_will(db):
    for moment, coming in ((MORNING - timedelta(minutes=1), MORNING), (MORNING, MORNING + timedelta(days=1)), (MORNING + timedelta(hours=5), MORNING + timedelta(days=1))):
        data = await latest(db, moment)
        assert data['daily_at'] == '08:00' and data['next_at'] == coming, moment


@pytest.mark.asyncio
async def test_after_six_hours_without_a_composed_run_the_raw_lists_are_returned(client, db, admin_token, now):
    composed = run(db, now - timedelta(hours=7))
    raw = run(db, now - timedelta(minutes=10), state='raw', missing=['youtube'])
    raw.raw = {'news': [{'title': 'Judul berita', 'url': 'https://news.example/a', 'source': 'Kompas', 'figure': 4}], 'youtube': [],
               'search': [{'title': 'bahan bakar', 'url': None, 'source': None, 'figure': 1000}]}
    await db.flush()
    issue(db, composed, 'k-a', 1, 'Isu A')
    await db.flush()
    data = await read(client, admin_token)
    assert data['state'] == 'raw' and data['issues'] == [] and data['brief'] is None and data['missing'] == ['youtube']
    assert data['raw']['search'] == [{'title': 'bahan bakar', 'url': None, 'source': None, 'figure': 1000}] and data['updated_at'] == raw.started_at.isoformat()
    raw.started_at = now - timedelta(hours=8)      # the raw lists are older than the composed list: the composed list is still the newest thing known
    await db.flush()
    data = await read(client, admin_token)
    assert data['state'] != 'raw' and [row['title'] for row in data['issues']] == ['Isu A'] and data['updated_at'] == composed.started_at.isoformat()


@pytest.mark.asyncio
async def test_no_run_at_all_is_empty_not_an_error(client, admin_token):
    data = await read(client, admin_token)
    assert data['state'] == 'empty' and data['issues'] == [] and data['updated_at'] is None and data['raw'] is None and data['signals'] == {}
    assert data['last_attempt'] is None


@pytest.mark.asyncio
async def test_attempts_that_all_failed_are_not_a_radar_that_never_ran(client, db, admin_token, now):
    run(db, now - timedelta(minutes=40), state='failed')
    run(db, now - timedelta(minutes=5), state='failed', missing=['news', 'search', 'youtube'])
    await db.flush()
    data = await read(client, admin_token)
    assert data['state'] == 'empty' and data['last_attempt'] == {'state': 'failed', 'at': (now - timedelta(minutes=5)).isoformat()}
    assert data['missing'] == ['news', 'search', 'youtube'], 'what the last attempt could not read'


@pytest.mark.asyncio
async def test_reading_writes_nothing_once_the_switch_exists(client, admin_token, monkeypatch):
    await read(client, admin_token)         # the first read creates the switch row

    async def refuse(db):
        raise AssertionError('a read tried to write the switch row again')
    monkeypatch.setattr('app.services.pulse_radar.ensure_policy', refuse)
    assert (await read(client, admin_token))['enabled'] is False


@pytest.mark.asyncio
async def test_movement_compares_with_the_list_of_a_day_earlier_and_needs_two_places(client, db, admin_token, now):
    shown = run(db, now - timedelta(minutes=10))
    recent = run(db, shown.started_at - timedelta(hours=3))        # the button pressed earlier today: too close to say anything about a day
    earlier = run(db, shown.started_at - timedelta(days=1, minutes=5))
    await db.flush()
    issue(db, shown, 'k-a', 1, 'A')
    issue(db, shown, 'k-c', 2, 'C')
    issue(db, shown, 'k-d', 3, 'D')
    issue(db, shown, 'k-b', 4, 'B')
    issue(db, shown, 'k-e', 5, 'E')
    issue(db, shown, 'k-l', 6, 'Lokal', scope='local', first_seen=shown.started_at - timedelta(hours=1))
    issue(db, recent, 'k-a', 3, 'A')
    issue(db, recent, 'k-c', 2, 'C')        # on today's earlier list, not on yesterday's: new since yesterday
    for key, rank in (('k-e', 1), ('k-x', 2), ('k-b', 3), ('k-d', 4), ('k-a', 5)):
        issue(db, earlier, key, rank, key)
    await db.flush()
    moves = {row['key']: row['movement'] for row in (await read(client, admin_token))['issues']}
    assert moves == {'k-a': {'kind': 'up', 'places': 4}, 'k-c': {'kind': 'new', 'places': 0}, 'k-d': None, 'k-b': None,
                     'k-e': {'kind': 'down', 'places': 4}, 'k-l': None}


@pytest.mark.asyncio
async def test_an_issue_a_project_covers_names_that_project(client, db, admin_token, now):
    topic = WatchTopic(label='Isu Pengunduran Diri Gibran', query='Gibran AND (mundur OR "mengundurkan diri" OR resign) OR gibranmundur')
    db.add(topic)
    shown = run(db, now - timedelta(minutes=10))
    await db.flush()
    issue(db, shown, 'k-g', 1, 'Pengunduran diri Wapres Gibran', query={'q': 'gibran mundur, wapres mundur', 'required': '', 'excluded': ''})
    issue(db, shown, 'k-b', 2, 'Harga beras naik')
    await db.flush()
    rows = (await read(client, admin_token))['issues']
    assert rows[0]['project'] == {'id': topic.id, 'label': 'Isu Pengunduran Diri Gibran'} and rows[1]['project'] is None


@pytest.mark.asyncio
async def test_without_a_list_of_a_day_earlier_nothing_is_called_new(client, db, admin_token, now):
    shown = run(db, now - timedelta(minutes=10))
    await db.flush()
    issue(db, shown, 'k-a', 1, 'A', first_seen=shown.started_at)
    await db.flush()
    assert (await read(client, admin_token))['issues'][0]['movement'] is None, 'with no earlier list there is nothing to be new against'
    hour = run(db, shown.started_at - timedelta(hours=1))
    await db.flush()
    issue(db, hour, 'k-z', 1, 'Z')
    await db.flush()
    assert (await read(client, admin_token))['issues'][0]['movement'] is None, 'a list of an hour earlier says nothing about a day'
    yesterday = run(db, shown.started_at - timedelta(hours=23))
    await db.flush()
    issue(db, yesterday, 'k-z', 1, 'Z')
    await db.flush()
    assert (await read(client, admin_token))['issues'][0]['movement'] == {'kind': 'new', 'places': 0}


def keys(value):
    if isinstance(value, dict):
        return set(value) | {key for item in value.values() for key in keys(item)}
    if isinstance(value, list):
        return {key for item in value for key in keys(item)}
    return set()


@pytest.mark.asyncio
async def test_nothing_about_the_engine_or_the_supplier_leaves_and_public_titles_are_untouched(client, db, admin_token, now):
    shown = run(db, now - timedelta(minutes=10))
    await db.flush()
    issue(db, shown, 'k-g', 1, 'Grok diblokir di Indonesia', evidence=[{'platform': 'news', 'title': 'Kominfo blokir Grok milik xAI', 'url': 'https://news.example/g', 'source': 'Tempo', 'figure': 2}])
    await db.flush()
    data = await read(client, admin_token)
    detail = await read(client, admin_token, '/radar/issues/k-g')
    assert not keys(data) & {'model', 'method', 'usage', 'engine', 'provider', 'raw_answer', 'score', 'run_id'}
    assert not keys(detail) & {'model', 'method', 'usage', 'engine', 'provider', 'raw_answer', 'score', 'run_id'}
    assert data['issues'][0]['title'] == 'Grok diblokir di Indonesia' and data['issues'][0]['evidence_titles'] == ['Kominfo blokir Grok milik xAI']
    assert detail['title'] == 'Grok diblokir di Indonesia'
    assert detail['evidence'] == [{'platform': 'news', 'title': 'Kominfo blokir Grok milik xAI', 'url': 'https://news.example/g', 'source': 'Tempo', 'figure': 2}]
    assert (await client.get(API + '/radar/issues/k-none', headers=auth(admin_token))).status_code == 404


@pytest.fixture
def refreshes(monkeypatch):
    """Stand in for the refresh itself: record that one was started, read and write nothing."""
    started = []

    async def fake(session_factory, settings=None, **options):
        started.append(options)
        return {'state': 'ok', 'run_id': 'r'}
    monkeypatch.setattr('app.routers.pulse_radar.refresh', fake)
    return started


@pytest.mark.asyncio
async def test_reading_never_starts_a_refresh_and_a_viewer_cannot_start_one(client, db, admin_token, refreshes):
    from app.services.pulse_identity import provision_user
    await read(client, admin_token)
    assert (await client.get(API + '/radar/issues/k-none', headers=auth(admin_token))).status_code == 404
    assert refreshes == []
    started = await client.post(API + '/radar/refresh', headers=auth(admin_token))
    assert started.status_code == 200 and started.json() == {'state': 'started'} and refreshes == [{'force': True, 'fresh_x': True}]
    await provision_user(db, 'radar-viewer@example.com', 'Viewer', 'initial long password', 'viewer')
    client.base_url = 'https://localhost'      # sign-in is only accepted on the installation's own address
    origin = {'Origin': 'http://localhost:5173'}
    login = await client.post('/api/pulse/auth/login', headers=origin, json={'email': 'radar-viewer@example.com', 'password': 'initial long password'})
    assert login.status_code == 200, login.text
    client.cookies.set('pulse_session', login.cookies.get('pulse_session'))
    origin['X-Pulse-CSRF'] = login.json()['csrf_token']
    assert (await client.get(API + '/radar')).status_code == 200
    assert (await client.post(API + '/radar/refresh', headers=origin)).status_code == 403 and len(refreshes) == 1


@pytest.mark.asyncio
async def test_a_refresh_in_progress_answers_409_and_shows_as_running(client, db, admin_token, now, refreshes):
    db.add(WorkerPolicy(provider=PROVIDER, daily_limit=0, lease_token='held', lease_until=now + timedelta(minutes=5)))
    await db.flush()
    busy = await client.post(API + '/radar/refresh', headers=auth(admin_token))
    assert busy.status_code == 409 and busy.json()['detail'] == 'Pembaruan sedang berjalan.' and refreshes == []
    assert (await read(client, admin_token))['running'] is True


@pytest.mark.asyncio
async def test_the_radar_switch_is_listed_in_monitor_and_can_be_turned_on_and_off(client, admin_token):
    listed = (await client.get(API + '/monitor', headers=auth(admin_token))).json()['workers']
    assert [worker for worker in listed if worker['provider'] == 'radar'][0]['daily_limit'] == 0, 'off until someone turns it on'
    on = await client.put(API + '/monitor/workers/radar', headers=auth(admin_token), json={'daily_limit': -1})
    assert on.status_code == 200 and on.json()['daily_limit'] == -1
    worker = [worker for worker in (await client.get(API + '/monitor', headers=auth(admin_token))).json()['workers'] if worker['provider'] == 'radar'][0]
    assert worker['unlimited'] is True and (await read(client, admin_token))['enabled'] is True
    off = await client.put(API + '/monitor/workers/radar', headers=auth(admin_token), json={'daily_limit': 0})
    assert off.status_code == 200 and (await read(client, admin_token))['enabled'] is False


@pytest.mark.asyncio
async def test_the_paid_social_switch_is_listed_in_monitor_off_and_turning_it_on_does_not_start_the_radar(client, admin_token):
    listed = (await client.get(API + '/monitor', headers=auth(admin_token))).json()['workers']
    assert [worker for worker in listed if worker['provider'] == 'radar_social'][0]['daily_limit'] == 0, 'paid, so off until someone turns it on'
    on = await client.put(API + '/monitor/workers/radar_social', headers=auth(admin_token), json={'daily_limit': -1})
    assert on.status_code == 200 and on.json() == {'provider': 'radar_social', 'daily_limit': -1}
    assert (await read(client, admin_token))['enabled'] is False
    assert (await read(client, admin_token))['x_searched_at'] is None


@pytest.mark.asyncio
async def test_social_figures_and_sampled_posts_reach_the_page_without_what_the_server_keeps_for_itself(client, db, admin_token, now):
    shown = run(db, now - timedelta(minutes=10))
    shown.usage = {'signals': {'news': 3, 'x': 2}, 'seconds': 12.5, 'discovery': {'at': now.isoformat(), 'signals': []}, 'sampled': {'k-x': {'x': now.isoformat()}}}
    await db.flush()
    evidence = [{'platform': 'news', 'title': 'Harga BBM naik di Medan', 'url': 'https://news.example/b', 'source': 'Tempo', 'figure': 2},
                {'platform': 'x', 'title': 'Antre BBM sejak subuh', 'url': 'https://x.com/i/status/33333', 'source': 'warga_medan', 'figure': 80},
                {'platform': 'tiktok', 'title': 'Antrean di SPBU', 'url': 'https://www.tiktok.com/@warga/video/44444', 'source': 'warga', 'figure': 900}]
    issue(db, shown, 'k-x', 1, 'Antrean BBM', platforms={'news': {'count': 5}, 'x': {'count': 625}, 'tiktok': {'found': 20, 'capped': True}}, evidence=evidence)
    await db.flush()
    response = await client.get(API + '/radar', headers=auth(admin_token))
    data, detail = response.json(), await read(client, admin_token, '/radar/issues/k-x')
    assert data['signals'] == {'news': 3, 'x': 2}
    assert data['x_searched_at'] == now.isoformat(), 'the issues from X can be a day older than the list: the page is told when X was searched'
    assert data['issues'][0]['platforms'] == {'news': {'count': 5}, 'x': {'count': 625}, 'tiktok': {'found': 20, 'capped': True}}
    assert data['issues'][0]['evidence_titles'] == ['Harga BBM naik di Medan'], 'a place is read from headlines, not from sampled posts'
    assert detail['evidence'] == evidence
    assert not (keys(data) | keys(detail)) & {'model', 'method', 'usage', 'engine', 'provider', 'raw_answer', 'score', 'run_id', 'discovery', 'sampled'}
    assert 'sampled' not in response.text and 'discovery' not in response.text


@pytest.mark.asyncio
async def test_an_issues_picture_reaches_the_page_only_when_it_is_from_a_host_the_lists_use(client, db, admin_token, now):
    shown = run(db, now - timedelta(minutes=10))
    await db.flush()
    good = {'url': 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg', 'source': 'Kanal Bola', 'kind': 'video'}
    issue(db, shown, 'k-a', 1, 'Dengan gambar', image=good)
    issue(db, shown, 'k-b', 2, 'Tautan lain', image={'url': 'https://evil.example/a.png', 'source': 'x', 'kind': 'photo'})
    issue(db, shown, 'k-c', 3, 'Bentuk aneh', image='bukan peta')
    issue(db, shown, 'k-d', 4, 'Tanpa gambar')
    await db.flush()
    data = await read(client, admin_token)
    assert [row['image'] for row in data['issues']] == [good, None, None, None]
    assert (await read(client, admin_token, '/radar/issues/k-a'))['image'] == good
