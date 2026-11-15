"""YouTube by channel: new videos of the channels a project already knows, without the keyword search.

The keyword search has its own small daily allowance (100 calls). Reading a channel's upload list and a batch of
video details comes out of the large shared one (one unit a call). So a scheduled run reads the uploads of the
project's known channels, keeps the videos that match the project's keywords, and still finds new videos on a day
when the search allowance is spent.
"""
from datetime import datetime, timedelta
from types import SimpleNamespace

import httpx
import pytest

from app.models.pulse import SourceItem, WatchTopic
from app.services.ingest.query_match import matches_query

QUERY = '(penyadapan OR disadap OR sadap) AND (presiden OR Prabowo) OR penyadapanpresiden'
CHANNEL_A, CHANNEL_B = 'UC' + 'a' * 22, 'UC' + 'b' * 22
SINCE = datetime(2026, 11, 8)


# ── Matching a project's keywords on our side ───────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize('text,expected', [
    ('Dugaan penyadapan terhadap Presiden terbongkar', True),
    ('Ponsel Prabowo diduga DISADAP', True),
    ('Penyadapan telepon artis ibu kota', False),              # the first group alone is not enough
    ('Presiden meresmikan bendungan', False),
    ('Tagar #penyadapanpresiden ramai', True),                 # the alternative after OR stands on its own
    ('', False),
])
def test_a_title_is_checked_against_the_projects_keywords_the_way_the_search_reads_them(text, expected):
    assert matches_query(QUERY, text) is expected


def test_phrases_exclusions_and_plain_lists_are_understood():
    gibran = 'Gibran AND (mundur OR "mengundurkan diri" OR "pengunduran diri" OR resign) OR gibranmundur'
    assert matches_query(gibran, 'Gibran resmi mengundurkan diri hari ini')
    assert not matches_query(gibran, 'Gibran menghadiri diri sendiri di acara pengunduran jadwal')
    assert matches_query('("cawapres" OR "wapres" OR "calonwakil")', 'Bursa cawapres menghangat')
    assert matches_query('banjir NOT jakarta', 'Banjir di Semarang') and not matches_query('banjir NOT jakarta', 'Banjir Jakarta meluas')
    assert matches_query('harga beras', 'Beras naik, harga cabai turun') and not matches_query('harga beras', 'harga cabai')   # words side by side: all of them
    assert not matches_query('(((', 'apa saja')                                                                          # a query that cannot be read matches nothing


# ── Reading the channels ────────────────────────────────────────────────────────────────────────────────────────────

def upload(video, title, published, description=''):
    return {'snippet': {'title': title, 'description': description, 'publishedAt': published},
            'contentDetails': {'videoId': video, 'videoPublishedAt': published}}


def detail(video, title, channel, published):
    return {'id': video, 'snippet': {'title': title, 'description': 'Uraian', 'channelId': channel, 'channelTitle': 'Kanal Berita', 'publishedAt': published},
            'statistics': {'likeCount': '12', 'commentCount': '3', 'viewCount': '450'}}


@pytest.fixture
def youtube(monkeypatch):
    """A stand-in for the API. `answers` maps a path to a function of the request; every request is recorded."""
    seen, answers = [], {}

    def respond(request):
        seen.append(request)
        handler = answers.get(request.url.path.rsplit('/', 1)[-1])
        return handler(request) if handler else httpx.Response(500)
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    return SimpleNamespace(seen=seen, answers=answers, paths=lambda: [request.url.path.rsplit('/', 1)[-1] for request in seen])


@pytest.mark.asyncio
async def test_new_matching_uploads_of_known_channels_are_collected_without_one_search_call(youtube):
    from app.services.ingest.youtube import fetch_youtube_channel_uploads

    def uploads(request):
        if request.url.params['playlistId'] == 'UU' + 'a' * 22:
            return httpx.Response(200, json={'items': [
                upload('vidNew00001', 'Penyadapan Presiden: fakta baru', '2026-11-12T03:00:00Z'),
                upload('vidOld00001', 'Penyadapan Presiden pekan lalu', '2026-11-01T03:00:00Z'),      # before the window
                upload('vidOther001', 'Resep rendang lebaran', '2026-11-12T04:00:00Z'),               # not about the project
                upload('vidKnown001', 'Prabowo disadap? Ini kata pakar', '2026-11-11T04:00:00Z')]})   # already stored
        return httpx.Response(404, json={'error': {'errors': [{'reason': 'playlistNotFound'}]}})
    youtube.answers['playlistItems'] = uploads
    youtube.answers['videos'] = lambda request: httpx.Response(200, json={'items': [detail('vidNew00001', 'Penyadapan Presiden: fakta baru', CHANNEL_A, '2026-11-12T03:00:00Z')]})
    items, stats = await fetch_youtube_channel_uploads([CHANNEL_A, CHANNEL_B, 'not a channel id'], QUERY, 'fake-key', since=SINCE,
                                                       known_urls={'https://www.youtube.com/watch?v=vidKnown001'})
    assert 'search' not in youtube.paths()
    assert sorted(youtube.paths()) == ['playlistItems', 'playlistItems', 'videos']
    assert youtube.seen[0].headers['x-goog-api-key'] == 'fake-key' and 'key' not in youtube.seen[0].url.params
    assert [request.url.params['id'] for request in youtube.seen if request.url.path.endswith('/videos')] == ['vidNew00001']
    assert len(items) == 1
    assert items[0]['url'] == 'https://www.youtube.com/watch?v=vidNew00001' and items[0]['platform'] == 'youtube' and items[0]['source'] == 'youtube'
    assert items[0]['metrics'] == {'likes': 12, 'comments': 3, 'views': 450, 'engagement': 15, 'author_id': CHANNEL_A}
    assert stats == {'channels': 2, 'read': 1, 'matched': 1, 'calls': 3, 'stopped': None}


@pytest.mark.asyncio
async def test_a_spent_daily_allowance_stops_the_sweep_and_keeps_what_was_read(youtube):
    from app.services.ingest.youtube import fetch_youtube_channel_uploads
    calls = []

    def uploads(request):
        calls.append(request.url.params['playlistId'])
        if len(calls) == 1:
            return httpx.Response(200, json={'items': [upload('vidNew00002', 'Sadap presiden', '2026-11-12T03:00:00Z')]})
        return httpx.Response(403, json={'error': {'errors': [{'reason': 'quotaExceeded'}]}})
    youtube.answers['playlistItems'] = uploads
    youtube.answers['videos'] = lambda request: httpx.Response(200, json={'items': [detail('vidNew00002', 'Sadap presiden', CHANNEL_A, '2026-11-12T03:00:00Z')]})
    items, stats = await fetch_youtube_channel_uploads([CHANNEL_A, CHANNEL_B, 'UC' + 'c' * 22], QUERY, 'fake-key', since=SINCE, parallel=1)
    assert [item['url'] for item in items] == ['https://www.youtube.com/watch?v=vidNew00002']
    assert stats['stopped'] == 'quota' and len(calls) == 2, 'no further channel is asked once the allowance is spent'


# ── The scheduled run ───────────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_scheduled_run_still_brings_videos_when_the_search_is_refused(youtube, monkeypatch):
    from app.services import pulse_monitor
    youtube.answers['search'] = lambda request: httpx.Response(429, json={'error': 'rateLimitExceeded'})
    youtube.answers['playlistItems'] = lambda request: httpx.Response(200, json={'items': [upload('vidNew00003', 'Presiden disadap', '2026-11-12T03:00:00Z')]})
    youtube.answers['videos'] = lambda request: httpx.Response(200, json={'items': [detail('vidNew00003', 'Presiden disadap', CHANNEL_A, '2026-11-12T03:00:00Z')]})
    settings = SimpleNamespace(YOUTUBE_API_KEY='fake-key', XPOZ_MODE='mcp_stored')
    monkeypatch.setattr(pulse_monitor, 'credential', lambda settings, name: 'fake-key')
    result = await pulse_monitor.fetch_provider('youtube', QUERY, settings, watch={'channels': [CHANNEL_A], 'since': SINCE, 'known_urls': set()})
    assert 'error' not in result
    assert [row['url'] for row in result['items']] == ['https://www.youtube.com/watch?v=vidNew00003']
    assert result['search'] == 'refused' and result['channels']['matched'] == 1
    # With no channel to read, a refused search is still a refused run.
    assert (await pulse_monitor.fetch_provider('youtube', QUERY, settings, watch={'channels': [], 'since': SINCE, 'known_urls': set()})).get('error') == 'rate_limited'


@pytest.mark.asyncio
async def test_the_channels_to_read_are_the_ones_that_posted_most_about_the_project(db):
    from app.services.pulse_monitor import youtube_watch
    topic = WatchTopic(label='Penyadapan', query=QUERY)
    other = WatchTopic(label='Lain', query='lain')
    db.add_all([topic, other])
    await db.flush()
    now = datetime(2026, 11, 14, 12)

    def video(index, channel, owner=None, platform='youtube'):
        return SourceItem(topic_id=(owner or topic).id, source='youtube', platform=platform, url=f'https://www.youtube.com/watch?v=known{(channel or "n")[-1]}{index:04d}',
                          author='Kanal', text='x', published_at=now - timedelta(days=1), metrics={'author_id': channel} if channel else {})
    db.add_all([video(1, CHANNEL_A), video(2, CHANNEL_A), video(3, CHANNEL_A), video(4, CHANNEL_B), video(5, 'UC' + 'z' * 22, owner=other),
                video(6, CHANNEL_B, platform='x'), video(7, '')])
    await db.flush()
    watch = await youtube_watch(db, topic.id, now, limit=1)
    assert watch['channels'] == [CHANNEL_A], 'most videos first, and only this project\'s YouTube channels'
    assert (await youtube_watch(db, topic.id, now))['channels'] == [CHANNEL_A, CHANNEL_B]
    assert len(watch['known_urls']) == 5 and watch['since'] == now - timedelta(days=7)      # every stored YouTube link of the project
