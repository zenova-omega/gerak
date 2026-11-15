"""Threads through the platform's official API.

The API searches one word or phrase at a time, so a project's keyword query is split into the words to ask for and
checked on our side against every post that comes back. What a token may do is read from the platform, not assumed:
a token without the search permission is told apart from an expired one and from a spent allowance. The token travels
in a header or a request body, never in an address.
"""
from datetime import datetime, timezone

import httpx
import pytest
from sqlalchemy import select

from app.models.pulse import PulseCrawlRun, SourceItem, WatchTopic
from app.models.pulse_sources import SourceAccount
from app.services.ingest.query_match import search_words

QUERY = '(penyadapan OR disadap OR sadap) AND (presiden OR Prabowo) OR penyadapanpresiden'
SINCE = datetime(2026, 11, 8)
TOKEN = 'threads-test-token'


# ── Which words to search for ───────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize('query,expected', [
    (QUERY, ['penyadapan', 'disadap', 'sadap', 'penyadapanpresiden']),       # of words joined by AND, the first group is asked for
    ('Gibran AND (mundur OR "mengundurkan diri")', ['gibran']),
    ('("cawapres" OR "wapres" OR "calonwakil")', ['cawapres', 'wapres', 'calonwakil']),
    ('"harga beras" OR sembako OR sembako', ['harga beras', 'sembako']),       # a phrase stays whole, a repeat is asked once
    ('harga beras', ['harga']),
    ('banjir NOT jakarta', ['banjir']),
    ('NOT jakarta AND banjir', ['banjir']),                                   # an exclusion cannot be searched for
    ('NOT jakarta', []),
    ('(((', []),
    ('', []),
])
def test_a_projects_query_is_split_into_the_words_a_search_is_asked_for(query, expected):
    assert search_words(query) == expected


# ── Searching ───────────────────────────────────────────────────────────────────────────────────────────────────────

def post(code, text, when='2026-11-12T03:00:00+0000', user='warga', link=None):
    return {'id': code, 'text': text, 'media_type': 'TEXT_POST', 'permalink': link or f'https://www.threads.net/@{user}/post/{code}',
            'timestamp': when, 'username': user, 'has_replies': False, 'is_quote_post': False, 'is_reply': False}


def api(answers):
    """A stand-in for the API: `answers` maps a search word to a response, or is one function of the request."""
    seen = []

    def respond(request):
        seen.append(request)
        if callable(answers):
            return answers(request)
        return answers.get(request.url.params.get('q'), httpx.Response(200, json={'data': []}))
    return httpx.AsyncClient(transport=httpx.MockTransport(respond)), seen


@pytest.mark.asyncio
async def test_every_search_word_is_asked_once_and_only_posts_that_match_the_project_are_kept():
    from app.services.ingest.threads import fetch_threads_items
    client, seen = api({
        'penyadapan': httpx.Response(200, json={'data': [
            post('AAA', 'Dugaan penyadapan terhadap Presiden terbongkar'),
            post('BBB', 'Penyadapan telepon artis ibu kota'),                               # the second group is missing
            post('CCC', 'Penyadapan presiden pekan lalu', when='2026-11-01T03:00:00+0000'),  # before the window
            post('DDD', 'Penyadapan presiden', link='https://evil.test/@warga/post/DDD'),    # not a link to the platform
            post('EEE', None)]}),                                                            # a picture without words
        'sadap': httpx.Response(200, json={'data': [
            post('AAA', 'Dugaan penyadapan terhadap Presiden terbongkar'),                  # found by two words: stored once
            post('FFF', 'Ponsel Prabowo diduga disadap', when='2026-11-13T09:30:00+0000', user='kabar.kota')]}),
    })
    async with client:
        items, stats = await fetch_threads_items(QUERY, TOKEN, since=SINCE, client=client)
    assert [request.url.params['q'] for request in seen] == ['penyadapan', 'disadap', 'sadap', 'penyadapanpresiden']
    first = seen[0]
    assert first.url.path == '/v1.0/keyword_search' and first.url.host == 'graph.threads.net'
    assert first.headers['authorization'] == f'Bearer {TOKEN}' and TOKEN not in str(first.url)
    assert first.url.params['search_type'] == 'RECENT' and first.url.params['limit'] == '100'
    assert first.url.params['since'] == '1794096000'                                         # 8 Nov 2026 00:00 UTC
    assert [item['url'] for item in items] == ['https://www.threads.net/@kabar.kota/post/FFF', 'https://www.threads.net/@warga/post/AAA']
    assert items[0] == {'source': 'threads', 'platform': 'threads', 'url': 'https://www.threads.net/@kabar.kota/post/FFF', 'title': None,
                        'text': 'Ponsel Prabowo diduga disadap', 'author': 'kabar.kota', 'published_at': datetime(2026, 11, 13, 9, 30), 'metrics': {}}
    assert stats == {'searches': 4, 'calls': 4, 'read': 7, 'matched': 2, 'stopped': None}


@pytest.mark.asyncio
async def test_a_token_without_the_search_permission_stops_at_the_first_call():
    from app.services.ingest.threads import fetch_threads_items
    client, seen = api(lambda request: httpx.Response(403, json={'error': {'code': 10, 'type': 'THApiException', 'message': 'Application does not have permission for this action'}}))
    async with client:
        items, stats = await fetch_threads_items(QUERY, TOKEN, since=SINCE, client=client)
    assert items == [] and len(seen) == 1
    assert stats['stopped'] == 'permission' and stats['calls'] == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('answer,reason', [
    (httpx.Response(401, json={'error': {'code': 190, 'message': f'expired {TOKEN}'}}), 'token'),
    (httpx.Response(400, json={'error': {'code': 190}}), 'token'),
    (httpx.Response(429, json={'error': {'code': 4}}), 'quota'),
    (httpx.Response(400, json={'error': {'code': 613}}), 'quota'),
])
async def test_an_expired_token_and_a_spent_allowance_are_told_apart_and_keep_what_was_read(answer, reason):
    from app.services.ingest.threads import fetch_threads_items
    client, seen = api({'penyadapan': httpx.Response(200, json={'data': [post('AAA', 'Penyadapan presiden hari ini')]}), 'disadap': answer})
    async with client:
        items, stats = await fetch_threads_items(QUERY, TOKEN, since=SINCE, client=client)
    assert [item['url'] for item in items] == ['https://www.threads.net/@warga/post/AAA']
    assert stats['stopped'] == reason and len(seen) == 2, 'no further word is asked once the platform refuses'
    assert TOKEN not in str(stats)


@pytest.mark.asyncio
async def test_a_passing_error_skips_one_word_and_a_dead_line_stops_without_showing_the_token():
    from app.services.ingest.threads import fetch_threads_items
    client, seen = api({'penyadapan': httpx.Response(500, json={'error': {'code': 2}}),
                        'disadap': httpx.Response(200, json={'data': [post('AAA', 'Presiden disadap')]})})
    async with client:
        items, stats = await fetch_threads_items(QUERY, TOKEN, since=SINCE, client=client)
    assert len(items) == 1 and stats['stopped'] is None and len(seen) == 4

    def dead(request):
        raise httpx.ConnectError(f'secret {TOKEN}', request=request)
    client, _ = api(dead)
    async with client:
        items, stats = await fetch_threads_items(QUERY, TOKEN, since=SINCE, client=client)
    assert items == [] and stats['stopped'] == 'network' and TOKEN not in str(stats)


@pytest.mark.asyncio
async def test_a_query_with_nothing_to_search_for_asks_nothing():
    from app.services.ingest.threads import fetch_threads_items
    client, seen = api({})
    async with client:
        items, stats = await fetch_threads_items('NOT jakarta', TOKEN, since=SINCE, client=client)
    assert items == [] and seen == [] and stats['searches'] == 0


# ── What the token may do ───────────────────────────────────────────────────────────────────────────────────────────

def connection(scopes, expires=1799999999, debug=None):
    def respond(request):
        assert request.headers['authorization'] == f'Bearer {TOKEN}' and TOKEN not in str(request.url)
        if request.url.path == '/v1.0/me':
            return httpx.Response(200, json={'id': '1', 'username': 'zenova.tech.group'})
        if request.url.path == '/v1.0/debug_token':
            assert request.method == 'POST' and f'input_token={TOKEN}' in request.content.decode()
            return debug or httpx.Response(200, json={'data': {'is_valid': True, 'scopes': scopes, 'expires_at': expires, 'application': 'Pulse'}})
        if request.url.path == '/v1.0/me/threads':
            return httpx.Response(200, json={'data': []})
        return httpx.Response(404, json={'error': {'code': 100}})
    return httpx.AsyncClient(transport=httpx.MockTransport(respond))


@pytest.mark.asyncio
async def test_the_connection_check_reads_what_the_token_may_do_and_until_when():
    from app.services.threads_connection import check_connection
    async with connection(['threads_basic', 'threads_keyword_search', 'not a scope!']) as client:
        result = await check_connection(TOKEN, client=client)
    assert result['connected'] is True and result['permissions_verified'] is True
    assert result['permissions'] == ['threads_basic', 'threads_keyword_search']
    assert result['search_permission'] is True
    assert result['expires_at'] == '2027-01-15T07:59:59'
    assert TOKEN not in str(result)
    # The token the app dashboard hands out by default: it can post and reply, but not search.
    async with connection(['threads_basic', 'threads_content_publish', 'threads_manage_replies']) as client:
        result = await check_connection(TOKEN, client=client)
    assert result['search_permission'] is False


@pytest.mark.asyncio
async def test_permissions_that_could_not_be_read_are_unknown_not_refused():
    from app.services.threads_connection import check_connection
    async with connection([], debug=httpx.Response(500, json={'error': {'code': 100}})) as client:
        result = await check_connection(TOKEN, client=client)
    assert result['connected'] is True and result['permissions_verified'] is False
    assert result['search_permission'] is None and result['permissions'] == [] and result['expires_at'] is None


# ── On the sources page, and one collection for a project ───────────────────────────────────────────────────────────

def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture
def token_set(monkeypatch):
    from app.routers import pulse_sources as routes
    from app.services import pulse_sources as service
    for module in (routes, service):
        original = module.credential
        monkeypatch.setattr(module, 'credential', lambda settings, name, original=original: TOKEN if name == 'THREADS_ACCESS_TOKEN' else original(settings, name))


async def threads_row(client, admin_token, topic_id=None):
    answer = await client.get('/api/admin/pulse/sources', params={'topic_id': topic_id} if topic_id else {}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    return next(row for row in answer.json()['sources'] if row['platform'] == 'threads')


@pytest.mark.asyncio
async def test_the_sources_page_says_whether_the_token_can_search(client, admin_token, db, token_set):
    account = await db.get(SourceAccount, 'threads')
    if account is None:
        account = SourceAccount(provider='threads')
        db.add(account)
    account.detail, account.checked_at = {'connected': True, 'username': 'zenova.tech.group', 'permissions': ['threads_basic'], 'search_permission': False}, datetime.utcnow()
    await db.flush()
    row = await threads_row(client, admin_token)
    assert row['configured'] is True and row['keyword_collection_available'] is False and row['recurring_enabled'] is False
    account.detail = {**account.detail, 'permissions': ['threads_basic', 'threads_keyword_search'], 'search_permission': True}
    await db.flush()
    assert (await threads_row(client, admin_token))['keyword_collection_available'] is True


@pytest.mark.asyncio
async def test_collecting_for_a_project_stores_the_matching_posts_and_records_the_attempt(client, admin_token, db, token_set, monkeypatch):
    from app.routers import pulse_sources as routes

    async def nothing():
        return None
    monkeypatch.setattr(db, 'commit', nothing)            # tests share one database file
    topic = WatchTopic(label='Penyadapan', query=QUERY)
    db.add(topic)
    await db.flush()
    asked = []

    async def found(query, token, *, since=None, client=None):
        asked.append((query, token, since))
        return ([{'source': 'threads', 'platform': 'threads', 'url': 'https://www.threads.net/@warga/post/AAA', 'title': None,
                  'text': 'Dugaan penyadapan terhadap Presiden', 'author': 'warga', 'published_at': datetime(2026, 11, 12, 3), 'metrics': {}}],
                {'searches': 4, 'calls': 4, 'read': 6, 'matched': 1, 'stopped': None})
    monkeypatch.setattr(routes, 'fetch_threads_items', found)
    answer = await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': topic.id}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert {'status': 'succeeded', 'fetched': 1, 'ingested': 1, 'error': None}.items() <= answer.json().items()
    assert asked[0][0] == QUERY and asked[0][1] == TOKEN and 6 < (datetime.utcnow() - asked[0][2]).days + 1 <= 8, 'the project\'s last seven days'
    stored = (await db.scalars(select(SourceItem).where(SourceItem.topic_id == topic.id))).all()
    assert [(row.platform, row.source, row.author, row.url) for row in stored] == [('threads', 'threads', 'warga', 'https://www.threads.net/@warga/post/AAA')]
    run = (await db.scalars(select(PulseCrawlRun).where(PulseCrawlRun.topic_id == topic.id))).one()
    assert run.manual is True and run.ingested == 1 and run.finished_at is not None
    assert run.providers == {'threads': {'status': 'success', 'fetched': 1, 'ingested': 1, 'error': None, 'searches': 4, 'read': 6}}
    row = await threads_row(client, admin_token, topic.id)
    assert row['stored_posts'] == 1 and row['last_attempt']['status'] == 'succeeded' and row['last_success_at'] is not None
    # Asking again brings nothing new: the post is already stored.
    again = await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': topic.id}, headers=auth(admin_token))
    assert {'status': 'succeeded', 'fetched': 1, 'ingested': 0}.items() <= again.json().items()


@pytest.mark.asyncio
@pytest.mark.parametrize('stopped', ['permission', 'token', 'quota', 'network'])
async def test_a_refused_collection_is_recorded_as_failed_with_its_reason(client, admin_token, db, token_set, monkeypatch, stopped):
    from app.routers import pulse_sources as routes

    async def nothing():
        return None
    monkeypatch.setattr(db, 'commit', nothing)
    topic = WatchTopic(label='Penyadapan', query=QUERY)
    db.add(topic)
    await db.flush()

    async def refused(query, token, *, since=None, client=None):
        return [], {'searches': 4, 'calls': 1, 'read': 0, 'matched': 0, 'stopped': stopped}
    monkeypatch.setattr(routes, 'fetch_threads_items', refused)
    answer = await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': topic.id}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert {'status': 'failed', 'fetched': 0, 'ingested': 0, 'error': stopped}.items() <= answer.json().items()
    row = await threads_row(client, admin_token, topic.id)
    assert row['last_attempt']['status'] == 'failed' and row['last_attempt']['error'] == stopped and row['last_success_at'] is None


@pytest.mark.asyncio
async def test_without_a_token_nothing_is_asked_and_an_unknown_project_is_refused(client, admin_token, db, monkeypatch):
    from app.routers import pulse_sources as routes

    async def nothing():
        return None
    monkeypatch.setattr(db, 'commit', nothing)
    monkeypatch.setattr(routes, 'credential', lambda settings, name: '')

    async def never(*args, **kwargs):
        raise AssertionError('the platform must not be asked without a token')
    monkeypatch.setattr(routes, 'fetch_threads_items', never)
    topic = WatchTopic(label='Penyadapan', query=QUERY)
    db.add(topic)
    await db.flush()
    answer = await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': topic.id}, headers=auth(admin_token))
    assert {'status': 'failed', 'error': 'not_configured'}.items() <= answer.json().items()
    assert (await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': 'no-such-project'}, headers=auth(admin_token))).status_code == 404
    assert (await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': topic.id})).status_code == 403


# ── Saving a token without anyone reading it ────────────────────────────────────────────────────────────────────────

def test_saving_a_value_replaces_its_old_line_and_leaves_every_other_line_alone(tmp_path):
    from app.pulse_threads_token import write_env
    env = tmp_path / '.env'
    env.write_text('AI_PROVIDER=grok\nTHREADS_ACCESS_TOKEN=old-one\nXAI_MODEL=x\nTHREADS_ACCESS_TOKEN=older\n')
    env.chmod(0o600)
    write_env(env, 'THREADS_ACCESS_TOKEN', 'new-one')
    assert env.read_text() == 'AI_PROVIDER=grok\nTHREADS_ACCESS_TOKEN=new-one\nXAI_MODEL=x\n'
    assert env.stat().st_mode & 0o777 == 0o600
    bare = tmp_path / 'bare.env'
    bare.write_text('AI_PROVIDER=grok')                       # no line of its own yet, and no final line break
    write_env(bare, 'THREADS_ACCESS_TOKEN', 'new-one')
    assert bare.read_text() == 'AI_PROVIDER=grok\nTHREADS_ACCESS_TOKEN=new-one\n'


def token_api(scopes, expires, exchange=None):
    calls = []

    def respond(request):
        body = request.content.decode()
        calls.append((request.url.path, body))
        assert 'long-lived-token-0123456789' not in str(request.url) and 'short-lived-token-0123456789' not in str(request.url) and 'app-secret' not in str(request.url)
        if request.url.path == '/v1.0/debug_token':
            long = 'input_token=long-lived-token-0123456789' in body
            return httpx.Response(200, json={'data': {'is_valid': True, 'application': 'Pulse', 'scopes': scopes,
                                                      'expires_at': 1799999999 if long else expires}})
        if request.url.path == '/access_token':
            return exchange or httpx.Response(200, json={'access_token': 'long-lived-token-0123456789', 'token_type': 'bearer', 'expires_in': 5184000})
        return httpx.Response(404)
    return httpx.AsyncClient(transport=httpx.MockTransport(respond)), calls


@pytest.mark.asyncio
async def test_a_token_is_saved_with_a_report_of_what_it_may_do_and_never_shown(tmp_path):
    from app.pulse_threads_token import store
    env = tmp_path / '.env'
    env.write_text('THREADS_ACCESS_TOKEN=old-one\n')
    now = datetime(2026, 11, 15, 1)
    client, calls = token_api(['threads_basic', 'threads_keyword_search'], expires=1799999999)
    async with client:
        report = await store('  long-lived-token-0123456789\n', env, secret='', client=client, now=now)
    assert env.read_text() == 'THREADS_ACCESS_TOKEN=long-lived-token-0123456789\n'
    assert report == {'saved': True, 'application': 'Pulse', 'permissions': ['threads_basic', 'threads_keyword_search'], 'search_permission': True,
                      'expires_at': '2027-01-15T07:59:59', 'exchanged': False, 'note': None}
    assert [path for path, _ in calls] == ['/v1.0/debug_token'], 'a token that already lasts is not exchanged'


@pytest.mark.asyncio
async def test_a_short_lived_token_is_swapped_for_a_long_one_when_the_app_secret_is_set(tmp_path):
    from app.pulse_threads_token import store
    env = tmp_path / '.env'
    env.write_text('')
    now = datetime(2026, 11, 15, 1)
    soon = int(datetime(2026, 11, 15, 2, tzinfo=timezone.utc).timestamp())     # one hour from `now`
    client, calls = token_api(['threads_basic', 'threads_keyword_search'], expires=soon)
    async with client:
        report = await store('short-lived-token-0123456789', env, secret='app-secret', client=client, now=now)
    assert env.read_text() == 'THREADS_ACCESS_TOKEN=long-lived-token-0123456789\n'
    assert report['exchanged'] is True and report['expires_at'] == '2027-01-15T07:59:59' and 'long-lived-token-0123456789' not in str(report) and 'short-lived-token-0123456789' not in str(report)
    exchange = next(body for path, body in calls if path == '/access_token')
    assert 'grant_type=th_exchange_token' in exchange and 'client_secret=app-secret' in exchange and 'access_token=short-lived-token-0123456789' in exchange
    # Without the secret the short one is saved as it is, and the report says how long it lasts.
    env.write_text('')
    client, calls = token_api(['threads_basic', 'threads_keyword_search'], expires=soon)
    async with client:
        report = await store('short-lived-token-0123456789', env, secret='', client=client, now=now)
    assert env.read_text() == 'THREADS_ACCESS_TOKEN=short-lived-token-0123456789\n'
    assert report['exchanged'] is False and report['note'] == 'short_lived' and all(path != '/access_token' for path, _ in calls)
    # A refused exchange keeps the short one too.
    env.write_text('')
    client, calls = token_api(['threads_basic'], expires=soon, exchange=httpx.Response(400, json={'error': {'code': 100, 'message': 'Invalid parameter'}}))
    async with client:
        report = await store('short-lived-token-0123456789', env, secret='app-secret', client=client, now=now)
    assert env.read_text() == 'THREADS_ACCESS_TOKEN=short-lived-token-0123456789\n' and report['note'] == 'exchange_refused' and report['search_permission'] is False


@pytest.mark.asyncio
async def test_something_that_is_not_a_working_token_is_not_saved(tmp_path):
    from app.pulse_threads_token import store
    env = tmp_path / '.env'
    env.write_text('THREADS_ACCESS_TOKEN=old-one\n')
    refusing = httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(400, json={'error': {'code': 190, 'message': 'bad not-a-token-at-all-0123456789'}})))
    async with refusing:
        for pasted in ('', 'two words', 'not-a-token-at-all-0123456789'):
            report = await store(pasted, env, secret='', client=refusing, now=datetime(2026, 11, 15, 1))
            assert report['saved'] is False and 'not-a-token-at-all-0123456789' not in str(report)
    assert env.read_text() == 'THREADS_ACCESS_TOKEN=old-one\n'


@pytest.mark.asyncio
async def test_pasting_the_token_that_is_already_saved_is_said_plainly_and_changes_nothing(tmp_path):
    from app.pulse_threads_token import store
    env = tmp_path / '.env'
    env.write_text('AI_PROVIDER=grok\nTHREADS_ACCESS_TOKEN=long-lived-token-0123456789\n')
    before = env.stat().st_mtime_ns
    client, _ = token_api(['threads_basic', 'threads_content_publish'], expires=1799999999)
    async with client:
        report = await store('long-lived-token-0123456789\n', env, secret='', client=client, now=datetime(2026, 11, 15, 1))
    assert report['saved'] is True and report['note'] == 'same_as_saved' and report['search_permission'] is False
    assert env.read_text() == 'AI_PROVIDER=grok\nTHREADS_ACCESS_TOKEN=long-lived-token-0123456789\n' and env.stat().st_mtime_ns == before


@pytest.mark.asyncio
async def test_saving_the_app_secret_swaps_the_saved_short_lived_token_for_a_long_one(tmp_path):
    from app.pulse_threads_token import store_secret
    env = tmp_path / '.env'
    env.write_text('THREADS_ACCESS_TOKEN=short-lived-token-0123456789\n')
    now = datetime(2026, 11, 15, 1)
    soon = int(datetime(2026, 11, 15, 2, tzinfo=timezone.utc).timestamp())
    secret = '0123456789abcdef0123456789abcdef'
    client, calls = token_api(['threads_basic', 'threads_keyword_search'], expires=soon)
    async with client:
        report = await store_secret(f'  {secret}\n', env, client=client, now=now)
    assert env.read_text() == f'THREADS_ACCESS_TOKEN=long-lived-token-0123456789\nTHREADS_APP_SECRET={secret}\n'
    assert report['secret_saved'] is True and report['saved'] is True and report['exchanged'] is True and report['expires_at'] == '2027-01-15T07:59:59'
    assert secret not in str(report) and 'lived-token' not in str(report)
    exchange = next(body for path, body in calls if path == '/access_token')
    assert f'client_secret={secret}' in exchange and 'access_token=short-lived-token-0123456789' in exchange
    # A token that already lasts is left as it is.
    client, calls = token_api(['threads_basic', 'threads_keyword_search'], expires=soon)
    async with client:
        report = await store_secret(secret, env, client=client, now=now)
    assert report['secret_saved'] is True and report['exchanged'] is False and report['note'] == 'same_as_saved'
    assert all(path != '/access_token' for path, _ in calls)


@pytest.mark.asyncio
async def test_what_is_pasted_as_the_app_secret_must_look_like_one(tmp_path):
    from app.pulse_threads_token import store_secret
    env = tmp_path / '.env'
    env.write_text('AI_PROVIDER=grok\n')
    client, calls = token_api(['threads_basic'], expires=1799999999)
    async with client:
        for pasted in ('', 'two words 0123456789abcdef', 'TH' + 'A' * 196, 'short'):       # nothing, a sentence, a token by mistake, a fragment
            report = await store_secret(pasted, env, client=client, now=datetime(2026, 11, 15, 1))
            assert report == {'secret_saved': False, 'note': 'not_a_secret'}
        assert env.read_text() == 'AI_PROVIDER=grok\n' and calls == []
        # With no token saved yet, the secret is kept for the next token.
        report = await store_secret('0123456789abcdef0123456789abcdef', env, client=client, now=datetime(2026, 11, 15, 1))
    assert report == {'secret_saved': True, 'saved': False, 'note': 'no_token'}
    assert env.read_text() == 'AI_PROVIDER=grok\nTHREADS_APP_SECRET=0123456789abcdef0123456789abcdef\n'
