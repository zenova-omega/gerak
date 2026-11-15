"""Public Threads posts through the paid search.

Every search word is read to its last page, the key in a header only. Each row carries its likes, replies and
reposts. Running out of credits is told apart from a refused key, and what was read until then is kept. When the key
is saved the collect button uses this lane, and the sources page says so without naming the supplier.
"""
from datetime import datetime

import httpx
import pytest
from sqlalchemy import select

from app.models.pulse import PulseCrawlRun, SourceItem, WatchTopic
from app.services.ingest.socialcrawl import fetch_socialcrawl_threads_items

QUERY = '(penyadapan OR disadap) AND (presiden OR Prabowo)'
SINCE = datetime(2026, 11, 8)
KEY = 'sc_test-key'


def row(code, text, when='2026-11-12T03:00:00.000Z', user='warga', likes=5, replies=2, reposts=1, views=None):
    return {'post': {'id': code, 'url': f'https://www.threads.com/@{user}/post/{code}',
                     'content': {'text': text, 'media_urls': None}, 'author': {'username': user, 'display_name': 'Warga', 'verified': False},
                     'engagement': {'views': views, 'likes': likes, 'comments': replies, 'shares': reposts, 'saves': None},
                     'published_at': when, 'ext': {}}, 'computed': {}}


WHO = {'author_username': 'warga', 'author_name': 'Warga', 'author_verified': False}


def test_a_post_keeps_who_wrote_it_and_what_it_carries_under_the_names_other_sources_use():
    from app.services.ingest.socialcrawl import _item
    full = row('AAA', 'Penyadapan presiden #sadap')
    full['post'].update(id='4014283548416779642', ext={'author_id': '75250251127', 'hashtags': ['sadap'], 'quote_count': 4, 'topic_tag': 'Politik', 'reshare_count': 3})
    full['post']['author'].update(avatar_url='https://scontent.cdninstagram.com/v/a.jpg?oe=6AFEE18B', verified=True, display_name='  Warga   Kota ')
    full['post']['content'].update(media_urls=['https://scontent.cdninstagram.com/v/1.jpg', 'https://scontent.cdninstagram.com/v/2.jpg'], thumbnail_url=None)
    item = _item(full)
    assert item['author'] == 'warga' and item['published_at'] == datetime(2026, 11, 12, 3)
    assert {'author_username': 'warga', 'author_name': 'Warga Kota', 'author_verified': True, 'author_id': '75250251127',
            'provider_post_id': '4014283548416779642', 'profile_image_url': 'https://scontent.cdninstagram.com/v/a.jpg?oe=6AFEE18B',
            'media_url': 'https://scontent.cdninstagram.com/v/1.jpg', 'media_type': 'carousel', 'hashtags': ['sadap'], 'quotes': 4,
            'topic_tag': 'Politik'}.items() <= item['metrics'].items()
    assert 'author_location' not in item['metrics'], 'the source reports no place, so none is claimed'
    odd = row('BBB', 'Penyadapan presiden', user='warga')
    odd['post']['author'].update(username='bad name!', avatar_url='javascript:alert(1)')
    assert _item(odd)['author'] is None and 'profile_image_url' not in _item(odd)['metrics']


def answer(rows, used=1, left=90):
    return httpx.Response(200, json={'success': True, 'data': {'items': rows}, 'credits_used': used, 'credits_remaining': left})


def api(answers):
    seen = []

    def respond(request):
        seen.append(request)
        return answers(request) if callable(answers) else answers.get(request.url.params.get('query'), answer([]))
    return httpx.AsyncClient(transport=httpx.MockTransport(respond)), seen


@pytest.mark.asyncio
async def test_each_search_word_costs_one_window_and_matching_posts_keep_their_numbers():
    client, seen = api({
        'penyadapan': answer([row('AAA', 'Dugaan penyadapan terhadap Presiden', likes=1259, replies=10, reposts=98),
                              row('BBB', 'Penyadapan di kantor swasta'),                                   # not about the president
                              row('OLD', 'Penyadapan presiden tahun lalu', when='2026-10-01T00:00:00.000Z'),
                              {'post': {'url': 'https://example.com/x', 'content': {'text': 'penyadapan presiden'}}},
                              'not a row'], left=91),
        'disadap': answer([row('AAA', 'Dugaan penyadapan terhadap Presiden'), row('CCC', 'Prabowo disadap?', when='2026-11-13T01:00:00.000Z', likes=0, views=40)], left=90),
    })
    items, stats = await fetch_socialcrawl_threads_items(QUERY, KEY, since=SINCE, client=client)
    assert [item['url'] for item in items] == ['https://www.threads.com/@warga/post/CCC', 'https://www.threads.com/@warga/post/AAA'], 'newest first, each post once'
    assert items[1] == {'source': 'threads', 'platform': 'threads', 'url': 'https://www.threads.com/@warga/post/AAA', 'title': None,
                        'text': 'Dugaan penyadapan terhadap Presiden', 'author': 'warga', 'published_at': datetime(2026, 11, 12, 3),
                        'metrics': {'likes': 1259, 'comments': 10, 'shares': 98, 'engagement': 1367, **WHO}}
    assert items[0]['metrics'] == {'likes': 0, 'comments': 2, 'shares': 1, 'views': 40, 'engagement': 3, **WHO}, 'a number the source did not give is left out'
    assert stats == {'searches': 2, 'calls': 2, 'read': 7, 'matched': 2, 'stopped': None, 'credits': 2, 'credits_remaining': 90, 'skipped': 0}
    for request in seen:
        assert request.headers['x-api-key'] == KEY and KEY not in str(request.url)
        assert dict(request.url.params) == {'query': request.url.params['query'], 'limit': '45', 'expand': 'false', 'start_date': '2026-11-08'}


@pytest.mark.asyncio
@pytest.mark.parametrize('status,reason', [(401, 'token'), (402, 'credits'), (403, 'permission'), (429, 'quota')])
async def test_a_refusal_stops_the_run_names_its_reason_and_keeps_what_was_read(status, reason):
    def respond(request):
        if request.url.params['query'] == 'penyadapan':
            return answer([row('AAA', 'Penyadapan presiden')], left=1)
        return httpx.Response(status, json={'success': False, 'error': {'type': 'X', 'message': 'no'}, 'credits_remaining': 0})
    client, seen = api(respond)
    items, stats = await fetch_socialcrawl_threads_items(QUERY + ' OR sadap', KEY, client=client)
    assert len(seen) == 2, 'nothing is asked after a refusal'
    assert len(items) == 1 and stats['stopped'] == reason and stats['credits'] == 1 and stats['credits_remaining'] == 0


@pytest.mark.asyncio
async def test_a_passing_error_skips_one_word_a_dead_line_stops_and_an_empty_query_asks_nothing():
    def respond(request):
        word = request.url.params['query']
        if word == 'satu':
            return httpx.Response(502, text='<html>bad gateway</html>')
        if word == 'dua':
            raise httpx.ReadTimeout('slow')
        if word == 'tiga':
            return answer([row('AAA', 'tiga')])
        raise httpx.ConnectError('down')
    client, seen = api(respond)
    items, stats = await fetch_socialcrawl_threads_items('satu OR dua OR tiga', KEY, client=client)
    assert len(items) == 1 and stats['stopped'] is None and stats['skipped'] == 1, 'one word without an answer does not end the run'
    client, seen = api(respond)
    items, stats = await fetch_socialcrawl_threads_items('tiga OR empat OR lima OR enam', KEY, client=client)
    assert len(items) == 1 and stats['stopped'] == 'network' and len(seen) == 3, 'two words in a row without an answer is a dead line'
    client, seen = api(respond)
    assert (await fetch_socialcrawl_threads_items('dua', KEY, client=client))[1]['stopped'] == 'network', 'no word answered'
    client, seen = api({})
    assert await fetch_socialcrawl_threads_items('NOT jakarta', KEY, client=client) == ([], {'searches': 0, 'calls': 0, 'read': 0, 'matched': 0, 'stopped': None, 'credits': 0, 'credits_remaining': None, 'skipped': 0})
    assert seen == []


@pytest.mark.asyncio
async def test_every_word_is_read_to_its_last_page_and_no_word_is_left_out():
    words = [f'kata{n}' for n in range(20)]              # more words than any earlier cap
    pages = {None: ('c1', [row('P1', 'kata0 satu')]), 'c1': ('c2', [row('P2', 'kata0 dua')]), 'c2': (None, [row('P3', 'kata0 tiga')])}

    def respond(request):
        if request.url.params['query'] != 'kata0':
            return answer([])
        following, rows = pages[request.url.params.get('cursor')]
        return httpx.Response(200, json={'success': True, 'data': {'items': rows}, 'credits_used': 1, 'credits_remaining': 50,
                                         'pagination': {'has_more': following is not None, 'next_cursor': following}})
    client, seen = api(respond)
    items, stats = await fetch_socialcrawl_threads_items(' OR '.join(words), KEY, since=SINCE, client=client)
    assert sorted(item['url'][-2:] for item in items) == ['P1', 'P2', 'P3']
    assert [request.url.params.get('cursor') for request in seen[:3]] == [None, 'c1', 'c2'] and seen[1].url.params['start_date'] == '2026-11-08'
    assert stats['searches'] == 20 and stats['calls'] == 22 and stats['credits'] == 22


@pytest.mark.asyncio
async def test_a_source_that_never_says_no_more_cannot_keep_charging():
    def same_cursor(request):
        return httpx.Response(200, json={'data': {'items': [row('P1', 'penyadapan presiden')]}, 'credits_used': 1, 'pagination': {'has_more': True, 'next_cursor': 'again'}})
    client, seen = api(same_cursor)
    await fetch_socialcrawl_threads_items('penyadapan', KEY, client=client)
    assert len(seen) == 2, 'a cursor seen before ends the word'

    def empty_pages(request):
        return httpx.Response(200, json={'data': {'items': []}, 'credits_used': 0, 'pagination': {'has_more': True, 'next_cursor': 'c' + str(len(seen))}})
    client, seen = api(empty_pages)
    await fetch_socialcrawl_threads_items('penyadapan', KEY, client=client)
    assert len(seen) == 1, 'an empty page ends the word'


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.mark.asyncio
async def test_with_the_key_saved_collecting_uses_the_public_search_and_the_sources_page_says_so(client, admin_token, db, monkeypatch):
    from app.routers import pulse_sources as routes
    from app.services import pulse_sources as service

    async def nothing():
        return None
    monkeypatch.setattr(db, 'commit', nothing)            # tests share one database file
    for module in (routes, service):
        original = module.credential
        monkeypatch.setattr(module, 'credential', lambda settings, name, original=original: KEY if name == 'SOCIALCRAWL_API_KEY' else 'threads-token' if name == 'THREADS_ACCESS_TOKEN' else original(settings, name))

    async def never(*args, **kwargs):
        raise AssertionError('the official search must not be asked when the public search is on')
    asked = []

    async def found(query, key, *, since=None, client=None):
        asked.append((query, key))
        return ([{'source': 'threads', 'platform': 'threads', 'url': 'https://www.threads.com/@warga/post/AAA', 'title': None,
                  'text': 'Dugaan penyadapan terhadap Presiden', 'author': 'warga', 'published_at': datetime(2026, 11, 12, 3),
                  'metrics': {'likes': 9, 'comments': 2, 'shares': 1, 'engagement': 12}}],
                {'searches': 2, 'calls': 2, 'read': 30, 'matched': 1, 'stopped': None, 'credits': 2, 'credits_remaining': 88})
    monkeypatch.setattr(routes, 'fetch_threads_items', never)
    monkeypatch.setattr(routes, 'fetch_socialcrawl_threads_items', found)
    topic = WatchTopic(label='Penyadapan', query=QUERY)
    db.add(topic)
    await db.flush()
    result = await client.post('/api/admin/pulse/sources/threads/collect', json={'topic_id': topic.id}, headers=auth(admin_token))
    assert result.status_code == 200, result.text
    assert {'status': 'succeeded', 'fetched': 1, 'ingested': 1, 'error': None, 'credits': 2, 'credits_remaining': 88}.items() <= result.json().items()
    assert asked == [(QUERY, KEY)]
    stored = (await db.scalars(select(SourceItem).where(SourceItem.topic_id == topic.id))).one()
    assert stored.platform == 'threads' and stored.metrics['likes'] == 9
    run = (await db.scalars(select(PulseCrawlRun).where(PulseCrawlRun.topic_id == topic.id))).one()
    assert run.providers['threads']['credits'] == 2
    page = await client.get('/api/admin/pulse/sources', params={'topic_id': topic.id}, headers=auth(admin_token))
    line = next(source for source in page.json()['sources'] if source['platform'] == 'threads')
    assert line['configured'] is True and line['public_search'] is True and line['keyword_collection_available'] is True
    assert line['search_credits_remaining'] == 88 and line['fields']['likes'] == 1 and line['last_attempt']['credits'] == 2
    assert 'socialcrawl' not in page.text.lower(), 'who supplies the search is not told to the browser'


# ── Collected by itself ─────────────────────────────────────────────────────────────────────────────────────────────

class Settings:
    def __init__(self, key=KEY, minutes=120):
        self.SOCIALCRAWL_API_KEY, self.PULSE_THREADS_AUTO_MINUTES = key, minutes


def test_the_automatic_lane_is_off_without_a_key_or_with_the_interval_at_zero():
    from app.services.pulse_threads_auto import minutes_between_runs
    assert minutes_between_runs(Settings()) == 120
    assert minutes_between_runs(Settings(key='')) == 0 and minutes_between_runs(Settings(minutes=0)) == 0


@pytest.mark.asyncio
async def test_every_monitored_project_comes_due_and_a_run_is_stored_and_recorded(db):
    from app.models.pulse_monitor import MonitorSchedule
    from app.services import pulse_threads_auto as auto
    now = datetime.utcnow()
    monitored, fresh, idle = (WatchTopic(label=label, query=QUERY) for label in ('Dipantau', 'Baru dicari', 'Tidak dipantau'))
    db.add_all([monitored, fresh, idle])
    await db.flush()
    db.add_all([MonitorSchedule(topic_id=monitored.id, provider='rss', enabled=True), MonitorSchedule(topic_id=fresh.id, provider='rss', enabled=True),
                MonitorSchedule(topic_id=idle.id, provider='rss', enabled=False)])
    db.add(PulseCrawlRun(topic_id=fresh.id, manual=True, started_at=now, providers={'threads': {'status': 'success'}}))
    db.add(PulseCrawlRun(topic_id=monitored.id, manual=True, started_at=now, providers={'rss': {'status': 'ok'}}))    # not a Threads run
    await db.flush()
    due = {topic_id: (query, days) for topic_id, query, days in await auto.due_projects(db, now, 120)}
    assert monitored.id in due and due[monitored.id] == (QUERY, 7), 'a monitored project never searched is due, over its day range'
    assert fresh.id not in due and idle.id not in due
    from datetime import timedelta
    assert fresh.id in {row[0] for row in await auto.due_projects(db, now + timedelta(minutes=121), 120)}, 'due again once the interval has passed'

    item = {'source': 'threads', 'platform': 'threads', 'url': 'https://www.threads.com/@warga/post/AUTO1', 'title': None, 'text': 'Penyadapan presiden',
            'author': 'warga', 'published_at': datetime(2026, 11, 12, 3), 'metrics': {'likes': 3, 'author_username': 'warga'}}
    stats = {'searches': 2, 'calls': 2, 'read': 9, 'matched': 1, 'stopped': None, 'credits': 2, 'credits_remaining': 70}
    assert await auto.store_run(db, monitored.id, [item], stats, now, now) == 1
    run = (await db.scalars(select(PulseCrawlRun).where(PulseCrawlRun.topic_id == monitored.id, PulseCrawlRun.manual.is_(False)))).one()
    assert run.providers['threads'] == {'status': 'success', 'fetched': 1, 'ingested': 1, 'error': None, 'searches': 2, 'read': 9,
                                        'public_search': True, 'credits': 2, 'credits_remaining': 70}
    assert monitored.id not in {row[0] for row in await auto.due_projects(db, now, 120)}, 'the run just recorded counts'


@pytest.mark.asyncio
async def test_a_round_stops_at_a_refusal_and_asks_nothing_while_the_lane_is_off(monkeypatch):
    from contextlib import asynccontextmanager
    from app.services import pulse_threads_auto as auto
    asked, stored = [], []

    @asynccontextmanager
    async def factory():
        class Session:
            async def commit(self):
                return None
        yield Session()

    async def due(db, now, minutes):
        return [('a', 'satu', 7), ('b', 'dua', 7), ('c', 'tiga', 7)]

    async def fetch(query, key, *, since=None, client=None):
        asked.append(query)
        return [], {'searches': 1, 'calls': 1, 'read': 0, 'matched': 0, 'stopped': 'credits' if query == 'dua' else None, 'credits': 0, 'credits_remaining': 0}

    async def store(db, topic_id, items, stats, started, now):
        stored.append(topic_id)
        return 0
    monkeypatch.setattr(auto, 'due_projects', due)
    monkeypatch.setattr(auto, 'fetch_socialcrawl_threads_items', fetch)
    monkeypatch.setattr(auto, 'store_run', store)
    assert await auto.collect_due(factory, Settings(minutes=0)) == [] and asked == []
    done = await auto.collect_due(factory, Settings())
    assert asked == ['satu', 'dua'] and stored == ['a', 'b'] and [topic_id for topic_id, _ in done] == ['a', 'b'], 'the refused run is recorded, the next project is not asked'
