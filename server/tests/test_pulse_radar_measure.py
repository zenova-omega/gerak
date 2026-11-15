"""How loud the ten highest issues are on X, TikTok and Instagram: a count on X, and sample posts as evidence.

The supplier is a stand-in. What is checked: the phrase that is counted is built safely from the keyword proposal,
every issue is counted before any sample is bought, samples are reused per platform while fresh, a sample is never a
total, and a refusal or a spent time budget stops only what it must.
"""
from datetime import datetime, timedelta

import pytest

from app.services import pulse_radar_measure
from app.services.ingest import xpoz
from app.services.pulse_radar_measure import KEEP, SAMPLE_ROWS, count_phrase, measure

NOW = datetime(2026, 11, 15, 3, 30)
TOOLS = {'getTwitterPostsByKeywords': 'x', 'getTiktokPostsByKeywords': 'tiktok', 'getInstagramPostsByKeywords': 'instagram'}
SEARCHES = list(TOOLS)


def issue(number, q=None, required=''):
    return {'key': f'k{number}', 'title': f'Isu {number}', 'query': {'q': q if q is not None else f'kata kunci {number}', 'required': required, 'excluded': ''}}


def rows(platform, count):
    if platform == 'x':
        return [{'id': str(2121651479027327000 + index), 'authorId': '9', 'authorUsername': f'akun_{index}', 'text': f'posting x {index}', 'createdAt': '2026-11-14T10:00:00Z',
                 'likeCount': str(index), 'replyCount': '0', 'retweetCount': '0', 'impressionCount': '100'} for index in range(count)]
    if platform == 'tiktok':
        return [{'id': str(7707170588653047000 + index), 'username': f'tt_{index}', 'userId': '7', 'description': f'video {index}', 'createdAtDate': '2026-11-14T00:00:00',
                 'likeCount': str(index * 2), 'commentCount': '1', 'forwardCount': '0', 'playCount': '500'} for index in range(count)]
    return [{'id': f'40292800452350416{index:02d}_29498130780', 'username': f'ig_{index}', 'userId': '5', 'caption': f'foto {index}', 'createdAtDate': '2026-11-14T00:00:00',
             'likeCount': str(index * 3), 'commentCount': '0', 'codeUrl': f'https://www.instagram.com/p/ABCdef{index:02d}/', 'mediaType': 'image'} for index in range(count)]


class Supplier:
    def __init__(self):
        self.found, self.counts, self.refuse_after, self.calls, self.trouble = {'x': 20, 'tiktok': 20, 'instagram': 8}, {}, None, [], {}

    async def rpc(self, client, message):
        if message.get('method') != 'tools/call':
            return {}
        name, arguments = message['params']['name'], message['params']['arguments']
        self.calls.append((name, arguments))
        if self.refuse_after is not None and len(self.calls) > self.refuse_after:
            return {'isError': True, 'content': [{'type': 'text', 'text': 'insufficient credit for this plan'}]}
        trouble = self.trouble.get(len(self.calls))
        if isinstance(trouble, Exception):
            raise trouble
        if trouble is not None:
            return trouble
        if name == 'countTweets':
            return {'content': [{'type': 'text', 'text': f"status: success\ndata:\n  count: {self.counts.get(arguments['phrase'], 614)}"}]}
        return {'structuredContent': {'results': rows(TOOLS[name], self.found[TOOLS[name]])}}

    @property
    def names(self):
        return [name for name, _ in self.calls]


@pytest.fixture
def supplier(monkeypatch):
    fake = Supplier()

    async def ready(client):
        return None
    monkeypatch.setattr(xpoz, '_initialize', ready)
    monkeypatch.setattr(xpoz, '_rpc', lambda client, message: fake.rpc(client, message))
    return fake


@pytest.mark.parametrize('query,expected', [
    ({'q': 'gibran mundur, wapres mundur', 'required': '', 'excluded': ''}, '"gibran mundur" OR "wapres mundur"'),
    ({'q': 'banjir, longsor', 'required': 'Aceh, RI', 'excluded': ''}, '("banjir" OR "longsor") AND ("Aceh")'),
    ({'q': '"harga beras", AND, or, beras "premium", not', 'required': None}, '"harga beras" OR "beras premium"'),
    ({'q': 'satu, dua, tiga, empat, lima'}, '"satu" OR "dua" OR "tiga"'),
    ({'q': 'Banjir, banjir, (longsor)'}, '"Banjir" OR "longsor"'),
    ({'q': 'a, bb, " "'}, None), ({'q': ''}, None), ({}, None), (None, None), ({'q': ['bukan teks']}, None),
])
def test_the_phrase_that_is_counted_is_built_safely_from_the_keyword_proposal(query, expected):
    assert count_phrase(query) == expected


def test_a_phrase_never_exceeds_what_the_supplier_accepts():
    long = ', '.join('kata sangat panjang sekali ' * 4 + str(number) for number in range(3))
    phrase = count_phrase({'q': long, 'required': long})
    assert phrase and len(phrase) <= 250 and phrase.count('"') % 2 == 0 and phrase.count('(') == phrase.count(')')


@pytest.mark.asyncio
async def test_ten_fresh_issues_cost_ten_counts_and_thirty_small_searches(supplier):
    supplier.counts['"kata kunci 1"'] = 9700
    out = await measure([issue(number) for number in range(1, 11)], {}, key='fake', now=NOW, client=object())
    assert supplier.names[:10] == ['countTweets'] * 10, 'every issue is counted before any sample is bought: the count is what orders the list'
    assert supplier.names[10:] == SEARCHES * 10 and out['missing'] == []
    assert supplier.calls[0][1] == {'phrase': '"kata kunci 1"', 'startDate': '2026-11-14', 'endDate': '2026-11-15'}, 'posts since yesterday: the count only knows UTC dates'
    search = next(arguments for name, arguments in supplier.calls if name == 'getTiktokPostsByKeywords')
    assert search['query'] == '"kata kunci 1"' and search['limit'] == SAMPLE_ROWS and search['responseType'] == 'fast'
    assert search['startDate'] == '2026-11-12' and search['endDate'] == '2026-11-16', 'without a window the answer is mostly old posts'
    assert out['figures']['k1'] == {'x': {'count': 9700}, 'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 8, 'capped': False}}, \
        'a sample that fills its limit is marked, so it is never read as a total'
    evidence = out['evidence']['k1']
    assert [item['platform'] for item in evidence] == ['x'] * KEEP + ['tiktok'] * KEEP + ['instagram'] * KEEP
    assert evidence[0] == {'platform': 'x', 'title': 'posting x 19', 'url': 'https://x.com/i/status/2121651479027327019', 'source': 'akun_19', 'figure': 19}, 'the most engaged posts are kept'
    assert out['sampled']['k1'] == {name: NOW.isoformat() for name in ('x', 'tiktok', 'instagram')}


@pytest.mark.asyncio
async def test_samples_are_reused_per_platform_while_fresh_and_bought_again_when_old(supplier):
    fresh, old = (NOW - timedelta(hours=1)).isoformat(), (NOW - timedelta(hours=4)).isoformat()
    kept = {'platform': 'tiktok', 'title': 'video lama', 'url': 'https://www.tiktok.com/@a/video/1', 'source': 'a', 'figure': 5}
    post = {'platform': 'x', 'title': 'posting lama', 'url': 'https://x.com/i/status/11111', 'source': 'b', 'figure': 2}
    previous = {
        'k1': {'x': {'at': fresh, 'figure': {'count': 5}, 'evidence': [post]}, 'tiktok': {'at': fresh, 'figure': {'found': 1, 'capped': False}, 'evidence': [kept]},
               'instagram': {'at': fresh, 'figure': None, 'evidence': []}},
        'k2': {'x': {'at': old, 'figure': {'count': 5}, 'evidence': [post]}, 'tiktok': {'at': old, 'figure': {'found': 1, 'capped': False}, 'evidence': [kept]}},
        'k3': {'tiktok': {'at': fresh, 'figure': {'found': 1, 'capped': False}, 'evidence': [kept]}, 'instagram': {'at': 'bukan waktu', 'figure': None, 'evidence': []}},
    }
    out = await measure([issue(1), issue(2), issue(3)], previous, key='fake', now=NOW, client=object())
    assert supplier.names == ['countTweets'] * 3 + SEARCHES + ['getTwitterPostsByKeywords', 'getInstagramPostsByKeywords'], \
        'the count is asked every time; a sample only where the last one is over three hours old or was never taken'
    assert out['evidence']['k1'] == [post, kept] and out['figures']['k1'] == {'x': {'count': 614}, 'tiktok': {'found': 1, 'capped': False}}, \
        'the count is new, the sample and what it found are carried; a platform that had nothing still has nothing'
    assert out['sampled']['k1'] == {'x': fresh, 'tiktok': fresh, 'instagram': fresh}, 'a carried sample keeps its own age, so it is bought again in time'
    assert out['figures']['k2']['tiktok'] == {'found': 20, 'capped': True} and out['sampled']['k2']['tiktok'] == NOW.isoformat()
    assert out['sampled']['k3'] == {'x': NOW.isoformat(), 'tiktok': fresh, 'instagram': NOW.isoformat()}
    assert [item['platform'] for item in out['evidence']['k3']] == ['x'] * KEEP + ['tiktok'] + ['instagram'] * KEEP


@pytest.mark.asyncio
async def test_a_refusal_stops_what_was_refused_and_keeps_what_was_measured(supplier):
    supplier.refuse_after = 7          # three counts, issue 1's three samples, issue 2's X sample; then every call is refused
    out = await measure([issue(1), issue(2), issue(3)], {}, key='fake', now=NOW, client=object())
    assert out['figures']['k1'] == {'x': {'count': 614}, 'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 8, 'capped': False}}
    assert out['figures']['k2'] == {'x': {'count': 614}} == out['figures']['k3']
    assert [item['platform'] for item in out['evidence']['k2']] == ['x'] * KEEP and 'k3' not in out['evidence']
    assert out['sampled']['k2'] == {'x': NOW.isoformat()}, 'what was refused is not remembered as sampled, so the next refresh asks again'
    assert out['missing'] == ['x', 'tiktok', 'instagram']
    assert len(supplier.calls) == 10, 'after its first refusal a platform is not asked again in this refresh'


@pytest.mark.asyncio
async def test_one_answer_that_did_not_come_loses_one_issue_not_the_platform_and_a_second_ends_it(supplier, caplog):
    # Calls: three counts, then X, TikTok, Instagram for each issue. The fifth is issue 1's TikTok search.
    supplier.trouble = {5: TimeoutError()}
    out = await measure([issue(1), issue(2), issue(3)], {}, key='fake', now=NOW, client=object())
    assert len(supplier.calls) == 12, 'the supplier was slow once: the next issue is still asked'
    assert 'tiktok' not in out['figures']['k1'] and out['sampled']['k1'] == {'x': NOW.isoformat(), 'instagram': NOW.isoformat()}, 'not remembered as sampled, so it is asked again next time'
    assert out['figures']['k2']['tiktok'] == {'found': 20, 'capped': True} and out['missing'] == ['tiktok'], 'and the refresh says TikTok is incomplete'
    assert 'tiktok' in caplog.text and 'timeout' in caplog.text, 'what went wrong is written down, as a kind, never the supplier\'s words'
    supplier.calls.clear()
    supplier.trouble = {5: TimeoutError(), 8: {'content': [{'type': 'text', 'text': 'status: running\noperationId: abc'}]}}
    out = await measure([issue(1), issue(2), issue(3)], {}, key='fake', now=NOW, client=object())
    assert len(supplier.calls) == 11 and supplier.names[-2:] == ['getTwitterPostsByKeywords', 'getInstagramPostsByKeywords'], 'twice in one refresh: the platform is left alone'
    assert out['missing'] == ['tiktok'] and all('tiktok' not in out['figures'][name] for name in ('k1', 'k2', 'k3'))


@pytest.mark.asyncio
async def test_being_told_to_slow_down_ends_the_platform_at_once(supplier):
    import httpx
    slow = httpx.HTTPStatusError('too many', request=httpx.Request('POST', 'https://supplier.example'), response=httpx.Response(429))
    supplier.trouble = {5: slow}
    out = await measure([issue(1), issue(2), issue(3)], {}, key='fake', now=NOW, client=object())
    assert len(supplier.calls) == 10 and out['missing'] == ['tiktok'], 'no second TikTok search after a 429'
    assert out['figures']['k3'] == {'x': {'count': 614}, 'instagram': {'found': 8, 'capped': False}}


@pytest.mark.asyncio
async def test_the_caller_chooses_which_issues_are_sampled_once_every_issue_is_counted(supplier):
    seen = []

    def choose(figures):
        seen.append(figures)
        return ['k3', 'k1', 'k-unknown']
    out = await measure([issue(1), issue(2), issue(3)], {}, key='fake', now=NOW, client=object(), choose=choose)
    assert supplier.names == ['countTweets'] * 3 + SEARCHES * 2
    assert [arguments['query'] for _, arguments in supplier.calls[3:]] == ['"kata kunci 3"'] * 3 + ['"kata kunci 1"'] * 3, 'sampled in the order chosen'
    assert seen == [{f'k{number}': {'x': {'count': 614}} for number in (1, 2, 3)}], 'the choice is made on the counts alone'
    assert set(out['sampled']) == {'k1', 'k3'} and out['figures']['k2'] == {'x': {'count': 614}}


@pytest.mark.asyncio
async def test_a_refused_count_leaves_x_out_and_the_other_platforms_measured(supplier):
    supplier.refuse_after = 0
    real = supplier.rpc

    async def only_counts_refused(client, message):
        supplier.refuse_after = 0 if message.get('params', {}).get('name') == 'countTweets' else None
        return await real(client, message)
    supplier.rpc = only_counts_refused
    out = await measure([issue(1), issue(2)], {}, key='fake', now=NOW, client=object())
    assert supplier.names == ['countTweets'] + ['getTiktokPostsByKeywords', 'getInstagramPostsByKeywords'] * 2, 'no count, no sample from X'
    assert out['missing'] == ['x'] and out['figures']['k2'] == {'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 8, 'capped': False}}


@pytest.mark.asyncio
async def test_when_the_time_is_spent_the_counts_stay_and_the_rest_is_reported_missing(supplier, monkeypatch):
    clock = iter([0, 1, 2, 3] + [500] * 99)
    monkeypatch.setattr(pulse_radar_measure, '_now', lambda: next(clock))
    out = await measure([issue(1), issue(2), issue(3)], {}, key='fake', now=NOW, client=object(), budget=300)
    assert supplier.names == ['countTweets'] * 3, 'no call starts after the budget: the refresh must end inside its lock'
    assert {key: figure for key, figure in out['figures'].items()} == {f'k{number}': {'x': {'count': 614}} for number in (1, 2, 3)}
    assert out['missing'] == ['x', 'tiktok', 'instagram'] and out['sampled'] == {}


@pytest.mark.asyncio
async def test_nothing_found_is_remembered_as_sampled_but_is_not_a_figure(supplier):
    supplier.found = {'x': 0, 'tiktok': 0, 'instagram': 3}
    supplier.counts['"kata kunci 1"'] = 0
    out = await measure([issue(1), issue(2)], {}, key='fake', now=NOW, client=object())
    assert out['figures']['k1'] == {'instagram': {'found': 3, 'capped': False}}, 'no posts counted on X and none sampled: no figure'
    assert supplier.names == ['countTweets'] * 2 + SEARCHES * 2, \
        'X is sampled although nothing was counted: the count only sees posts already stored, and the sample search is what stores them'
    assert out['sampled']['k1'] == {name: NOW.isoformat() for name in ('x', 'tiktok', 'instagram')}, 'an empty answer is not bought again every half hour'
    assert out['figures']['k2'] == {'x': {'count': 614}, 'instagram': {'found': 3, 'capped': False}} and out['missing'] == []


@pytest.mark.asyncio
async def test_a_stored_sample_that_cannot_be_read_is_bought_again_and_the_rest_is_kept(supplier):
    fresh = (NOW - timedelta(hours=1)).isoformat()
    kept = {'platform': 'x', 'title': 'posting lama', 'url': 'https://x.com/i/status/11111', 'source': 'b', 'figure': 2}
    previous = {'k1': {'x': {'at': fresh, 'figure': None, 'evidence': [kept]}, 'tiktok': {'at': fresh, 'figure': {'found': '20+', 'capped': True}, 'evidence': []},
                       'instagram': {'at': fresh, 'figure': {'found': 3, 'capped': False}, 'evidence': 7}}}
    out = await measure([issue(1)], previous, key='fake', now=NOW, client=object())
    assert supplier.names == ['countTweets', 'getTiktokPostsByKeywords', 'getInstagramPostsByKeywords'], 'only what could not be read is sampled again'
    assert out['figures']['k1'] == {'x': {'count': 614}, 'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 8, 'capped': False}}
    assert out['evidence']['k1'][0] == kept and out['sampled']['k1']['x'] == fresh and out['sampled']['k1']['tiktok'] == NOW.isoformat()


@pytest.mark.asyncio
async def test_an_issue_without_a_usable_phrase_is_not_asked_about(supplier):
    out = await measure([issue(1, q='a, b'), issue(2)], {}, key='fake', now=NOW, client=object())
    assert 'k1' not in out['figures'] and out['figures']['k2']['x'] == {'count': 614}
    assert all(arguments.get('phrase', arguments.get('query')) == '"kata kunci 2"' for _, arguments in supplier.calls)


@pytest.mark.asyncio
async def test_a_supplier_that_cannot_be_reached_fails_no_refresh(supplier, monkeypatch):
    async def down(client):
        raise OSError('no route')
    monkeypatch.setattr(xpoz, '_initialize', down)
    out = await measure([issue(1)], {}, key='fake', now=NOW, client=object())
    assert out == {'figures': {}, 'evidence': {}, 'sampled': {}, 'missing': ['x', 'tiktok', 'instagram']} and supplier.calls == []


@pytest.mark.asyncio
async def test_reposts_and_posts_without_text_are_not_evidence(supplier, monkeypatch):
    real = supplier.rpc

    async def odd(client, message):
        result = await real(client, message)
        if message.get('params', {}).get('name') == 'getTwitterPostsByKeywords':
            result['structuredContent']['results'] = [
                {'id': '111111', 'authorUsername': 'pengulang', 'text': 'RT @asli: kabar', 'likeCount': '0', 'replyCount': '0', 'retweetCount': '900', 'impressionCount': '0'},
                {'id': '222222', 'authorUsername': 'kosong', 'text': '   ', 'likeCount': '50', 'replyCount': '0', 'retweetCount': '0', 'impressionCount': '900'},
                {'id': '333333', 'authorUsername': 'asli', 'text': 'kabar <b>penting</b>\n' + 'x' * 300, 'likeCount': '3', 'replyCount': '1', 'retweetCount': '2', 'impressionCount': '900'}]
        return result
    supplier.rpc = odd
    out = await measure([issue(1)], {}, key='fake', now=NOW, client=object())
    posts = [item for item in out['evidence']['k1'] if item['platform'] == 'x']
    assert [item['source'] for item in posts] == ['asli'] and posts[0]['figure'] == 6
    assert len(posts[0]['title']) <= 160 and posts[0]['title'].startswith('kabar penting x') and '\n' not in posts[0]['title']
