"""What X is talking about, found through the hosted engine's live search and kept only with posts as evidence."""
from datetime import datetime

import pytest

from app.services.ai import hosted
from app.services.pulse_radar_x import discover, parse_discovery

NOW = datetime(2026, 11, 15, 3, 30)
ANSWER = ('{"issues": [{"title": "Banjir Aceh dan keluhan bantuan", "posts": ["https://x.com/warga_aceh/status/2121651479027327285", "https://x.com/i/status/2121651479027327286"]},'
          '{"title": "Tanpa bukti", "posts": ["https://x.com/akun", "https://x.com/search?q=banjir", "https://contoh.id/berita"]},'
          '{"title": "<b>Pelemahan rupiah</b>", "posts": ["https://twitter.com/ekonom/status/2121651479027327999", 7, null]},'
          '{"title": "Banjir Aceh dan keluhan bantuan", "posts": ["https://x.com/relawan/status/2121651479027327300"]},'
          '{"title": "", "posts": ["https://x.com/a/status/2121651479027327301"]}, "bukan objek"]}')


def test_only_issues_with_post_links_are_kept_and_links_that_are_not_posts_are_removed():
    issues = parse_discovery(ANSWER)
    assert [issue['title'] for issue in issues] == ['Banjir Aceh dan keluhan bantuan', 'Pelemahan rupiah']
    assert issues[0]['posts'] == ['https://x.com/warga_aceh/status/2121651479027327285', 'https://x.com/i/status/2121651479027327286', 'https://x.com/relawan/status/2121651479027327300'], \
        'the same issue named twice is one issue with the posts of both'
    assert issues[1]['posts'] == ['https://twitter.com/ekonom/status/2121651479027327999']


@pytest.mark.parametrize('text', ['', 'Maaf, tidak bisa.', '{"issues": "banyak"}', '{"issues": [', None, 42])
def test_an_answer_that_is_not_the_object_asked_for_gives_nothing(text):
    assert parse_discovery(text) == []


def test_a_fenced_answer_is_read_and_a_long_list_is_cut_at_twelve():
    many = ', '.join('{"title": "Isu %d", "posts": ["https://x.com/a/status/21216514790273%05d"]}' % (number, number) for number in range(20))
    assert len(parse_discovery('```json\n{"issues": [' + many + ']}\n```')) == 12


class Engine:
    def __init__(self, text=None, error=None):
        self.text, self.error, self.calls = text, error, []

    async def search_x(self, prompt, *, from_date, to_date, system=None, max_tokens=4000, timeout=240):
        self.calls.append({'prompt': prompt, 'from_date': from_date, 'to_date': to_date, 'system': system})
        if self.error:
            raise self.error
        return self.text


@pytest.mark.asyncio
async def test_discovery_returns_x_signals_with_their_posts_as_evidence():
    engine = Engine(ANSWER)
    signals = await discover(engine, NOW)
    assert engine.calls[0]['from_date'] == '2026-11-14' and engine.calls[0]['to_date'] == '2026-11-16', 'yesterday to tomorrow, so the last 24 hours are inside whatever the hour'
    assert 'JSON' in engine.calls[0]['system'] and 'Indonesia' in engine.calls[0]['prompt']
    assert signals[0] == {'platform': 'x', 'title': 'Banjir Aceh dan keluhan bantuan', 'url': 'https://x.com/warga_aceh/status/2121651479027327285', 'source': None, 'figure': None,
                          'provinces': {}, 'section': None, 'related': [{'title': 'Posting di X', 'url': 'https://x.com/i/status/2121651479027327286', 'source': None},
                                                                         {'title': 'Posting di X', 'url': 'https://x.com/relawan/status/2121651479027327300', 'source': None}]}
    assert len(signals) == 2


@pytest.mark.asyncio
async def test_discovery_that_cannot_run_gives_none_and_never_raises():
    assert await discover(Engine(error=hosted.AIUnavailable('busy')), NOW) is None
    assert await discover(Engine(error=RuntimeError('boom')), NOW) is None
    assert await discover(Engine('Maaf'), NOW) is None, 'an answer without a usable issue is no discovery'
    assert await discover(object(), NOW) is None, 'an engine that cannot search X'
    assert await discover(None, NOW) is None
