"""The radar's signals: what the country is searching, reading and watching, read from public lists.

Nothing here reaches the network. A stand-in transport answers for the three sources, and each test says what a real
answer of that shape must turn into: one signal per story, video or search term, with the provinces a term is loud in.
"""
from types import SimpleNamespace

import httpx
import pytest

from app.services.pulse_radar_signals import PROVINCES, collect, parse_news, parse_trending, plain

SETTINGS = SimpleNamespace(YOUTUBE_API_KEY='fake-key')


def trending(*rows):
    """A trending-searches feed. A row is (term, traffic, [(news title, url, source), ...])."""
    items = ''.join(
        f'<item><title>{term}</title><ht:approx_traffic>{traffic}</ht:approx_traffic><description/>'
        + ''.join(f'<ht:news_item><ht:news_item_title>{title}</ht:news_item_title><ht:news_item_snippet/>'
                  f'<ht:news_item_url>{url}</ht:news_item_url><ht:news_item_source>{source}</ht:news_item_source></ht:news_item>'
                  for title, url, source in news)
        + '</item>' for term, traffic, news in rows)
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><rss xmlns:atom="http://www.w3.org/2005/Atom" '
            'xmlns:ht="https://trends.google.com/trending/rss" version="2.0"><channel><title>Daily Search Trends</title>'
            f'{items}</channel></rss>')


def news(*rows):
    """A top-stories feed. A row is (headline, link, publisher, [(related headline, link, publisher), ...])."""
    def entry(title, link, source, related):
        listed = ''.join(f'&lt;li&gt;&lt;a href="{url}"&gt;{name}&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;{who}&lt;/font&gt;&lt;/li&gt;'
                         for name, url, who in [(title, link, source), *related])
        return (f'<item><title>{title} - {source}</title><link>{link}</link><pubDate>Sun, 15 Nov 2026 00:02:02 GMT</pubDate>'
                f'<description>&lt;ol&gt;{listed}&lt;/ol&gt;</description><source url="https://{source.lower()}.example">{source}</source></item>')
    return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Berita utama</title>' + ''.join(entry(*row) for row in rows) + '</channel></rss>'


def videos(*rows):
    return {'items': [{'id': video, 'snippet': {'title': title, 'channelTitle': channel, 'categoryId': '25', 'publishedAt': '2026-11-12T03:00:00Z'},
                       'statistics': {'viewCount': str(views)}} for video, title, channel, views in rows]}


def transport(answers, seen=None):
    """Answers by the part of the address that names the list: a province code, 'ID', 'news', a news section or 'youtube'."""
    def respond(request):
        if seen is not None:
            seen.append(request)
        host, path, params = request.url.host, request.url.path, request.url.params
        if host == 'trends.google.com':
            name = params['geo']
        elif host == 'news.google.com':
            name = path.rsplit('/', 1)[-1] if '/topic/' in path else 'news'
        else:
            name = 'youtube'
        answer = answers.get(name, answers.get('*'))
        if answer is None:      # a list nobody filled in answers empty, the way a quiet province does
            if host == 'www.googleapis.com':
                return httpx.Response(200, json={'items': []})
            return httpx.Response(200, text=trending() if host == 'trends.google.com' else news())
        if isinstance(answer, int):
            return httpx.Response(answer, text='no')
        return httpx.Response(200, json=answer) if isinstance(answer, dict) else httpx.Response(200, text=answer)
    return httpx.MockTransport(respond)


async def gather(answers, seen=None, settings=SETTINGS):
    async with httpx.AsyncClient(transport=transport(answers, seen), follow_redirects=True) as client:
        return await collect(settings, client=client, pause=0)


def test_a_trending_feed_gives_terms_their_searches_and_news():
    rows = parse_trending(trending(('polda jawa timur', '200+', [('Judul berita', 'https://contoh.id/a', 'Contoh')]), ('bahan bakar', '1000+', [])))
    assert [(row['term'], row['searches']) for row in rows] == [('polda jawa timur', 200), ('bahan bakar', 1000)]
    assert rows[0]['news'] == [{'title': 'Judul berita', 'url': 'https://contoh.id/a', 'source': 'Contoh'}]


def test_a_news_feed_gives_each_story_its_publisher_and_the_other_coverage_of_it():
    rows = parse_news(news(('Pertemuan di Istana Bogor', 'https://news.example/a', 'detikNews',
                            [('Isi pertemuan dibuka', 'https://news.example/b', 'Kompas'), ('Ketum partai bicara', 'https://news.example/c', 'Tempo')])))
    assert rows[0]['title'] == 'Pertemuan di Istana Bogor' and rows[0]['source'] == 'detikNews' and rows[0]['url'] == 'https://news.example/a'
    assert rows[0]['related'] == [{'title': 'Isi pertemuan dibuka', 'url': 'https://news.example/b', 'source': 'Kompas'},
                                  {'title': 'Ketum partai bicara', 'url': 'https://news.example/c', 'source': 'Tempo'}]


@pytest.mark.parametrize('text', ['', '<html><body>blocked</body></html>', '<rss><channel>', '<!DOCTYPE rss [<!ENTITY a "aaaa">]><rss><channel><item><title>&a;</title></item></channel></rss>'])
def test_a_feed_that_is_not_a_feed_gives_nothing(text):
    assert parse_trending(text) == [] and parse_news(text) == []


@pytest.mark.asyncio
async def test_one_term_on_several_province_lists_is_one_signal_with_each_provinces_figure():
    result = await gather({'ID': trending(('Bahan  Bakar', '1000+', [])), 'ID-JK': trending(('bahan bakar', '200+', [])),
                           'ID-JI': trending(('bahan bakar', '500+', []), ('polda jawa timur', '200+', [('Polda rilis kasus', 'https://contoh.id/p', 'Contoh')]))})
    terms = {signal['title']: signal for signal in result['signals'] if signal['platform'] == 'search'}
    assert set(terms) == {'bahan bakar', 'polda jawa timur'}
    assert terms['bahan bakar']['figure'] == 1000 and terms['bahan bakar']['provinces'] == {'ID-JK': 200, 'ID-JI': 500}
    assert terms['polda jawa timur']['figure'] is None and terms['polda jawa timur']['provinces'] == {'ID-JI': 200}
    assert terms['polda jawa timur']['related'] == [{'title': 'Polda rilis kasus', 'url': 'https://contoh.id/p', 'source': 'Contoh'}]
    ids = [signal['id'] for signal in result['signals']]
    assert ids == [f'S{number}' for number in range(1, len(ids) + 1)], 'signals are numbered in order, so an answer can cite them'


@pytest.mark.asyncio
async def test_a_province_that_fails_or_answers_nothing_is_named_and_the_rest_is_kept():
    filled = trending(('timnas indonesia', '500+', []))
    answers = {code: filled for code in PROVINCES}
    answers.update({'ID': filled, 'ID-PA': 503, 'ID-MA': '<html>blocked</html>', 'ID-GO': trending(), 'youtube': 403})
    result = await gather(answers)
    assert {'ID-PA', 'ID-MA', 'ID-GO', 'youtube'} <= set(result['missing']) and 'search' not in result['missing'] and 'news' in result['missing']
    assert len(result['provinces_read']) == 31 and not {'ID-PA', 'ID-MA', 'ID-GO'} & set(result['provinces_read'])
    assert [signal['title'] for signal in result['signals'] if signal['platform'] == 'search'] == ['timnas indonesia']


@pytest.mark.asyncio
async def test_stories_from_the_sections_are_added_once_and_keep_their_section():
    top = news(('Pertemuan di Istana Bogor', 'https://news.example/a', 'detikNews', [('Isi pertemuan dibuka', 'https://news.example/b', 'Kompas')]))
    result = await gather({'news': top, 'NATION': top, 'BUSINESS': news(('Harga beras naik', 'https://news.example/z', 'Bisnis', []))})
    stories = [(signal['title'], signal['section'], signal['figure']) for signal in result['signals'] if signal['platform'] == 'news']
    assert stories == [('Pertemuan di Istana Bogor', None, 1), ('Harga beras naik', 'BUSINESS', 0)]
    assert 'news' not in result['missing']


@pytest.mark.asyncio
async def test_titles_are_plain_text_and_links_are_http_only():
    long = '&lt;b&gt;Judul&lt;/b&gt; ' + 'x' * 200
    result = await gather({'news': news((long, 'javascript:alert(1)', 'Sumber', []))})
    signal = next(signal for signal in result['signals'] if signal['platform'] == 'news')
    assert signal['title'].startswith('Judul x') and len(signal['title']) <= 120 and signal['title'].endswith('…')
    assert signal['url'] is None


def test_an_honest_headline_keeps_its_angle_brackets():
    assert plain('Harga < Rp10.000 dan > Rp5.000 per kilo') == 'Harga < Rp10.000 dan > Rp5.000 per kilo'
    assert plain('<b>Judul</b> <img src=x onerror=alert(1)> aman') == 'Judul aman'
    assert plain('Skor 3<5 dan a>b') == 'Skor 3<5 dan a>b'


@pytest.mark.asyncio
async def test_videos_carry_views_and_the_key_stays_in_a_header():
    seen = []
    result = await gather({'youtube': videos(('vid00000001', 'Wapres mundur, ini kata pakar', 'Kanal Berita', 2104721))}, seen)
    video = next(signal for signal in result['signals'] if signal['platform'] == 'youtube')
    assert video['title'] == 'Wapres mundur, ini kata pakar' and video['source'] == 'Kanal Berita' and video['figure'] == 2104721
    assert video['url'] == 'https://www.youtube.com/watch?v=vid00000001'
    calls = [request for request in seen if request.url.host == 'www.googleapis.com']
    assert len(calls) == 6 and all(request.headers['x-goog-api-key'] == 'fake-key' and 'key' not in request.url.params for request in calls)
    assert len([signal for signal in result['signals'] if signal['platform'] == 'youtube']) == 1, 'one video on six lists is one signal'


@pytest.mark.asyncio
async def test_without_a_video_key_the_video_list_is_missing_and_nothing_is_asked():
    seen = []
    result = await gather({}, seen, settings=SimpleNamespace(YOUTUBE_API_KEY=''))
    assert 'youtube' in result['missing'] and not [request for request in seen if request.url.host == 'www.googleapis.com']
