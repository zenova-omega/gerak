"""The hand-run check of the radar: one round, its counts and cost on the terminal, and nothing stored unless asked."""
import pytest

from app import pulse_radar_check
from app.services import pulse_radar
from app.services.ai import hosted


def signal(number, platform, title, figure=None, provinces=None):
    return {'id': f'S{number}', 'platform': platform, 'title': title, 'url': None, 'source': None, 'figure': figure, 'provinces': provinces or {}, 'related': [], 'section': None}


SIGNALS = [signal(1, 'news', 'Wapres mundur', 4), signal(2, 'youtube', 'Pamitan di Istana', 2104721), signal(3, 'search', 'gibran mundur', 5000, {'ID-JK': 2000}),
           signal(4, 'search', 'polda jawa timur', None, {'ID-JI': 200})]
ANSWER = ('{"brief": "Satu isu menonjol [1].", "issues": ['
          '{"key": "", "title": "Pengunduran diri Wapres", "category": "politik", "reason": "Ramai.", "signals": ["S1", "S2", "S3"], "q": "gibran mundur"},'
          '{"key": "", "title": "Polda Jawa Timur", "category": "hukum", "reason": "Dicari di Jawa Timur.", "signals": ["S4"], "q": "polda jawa timur"}]}')


class Model:
    async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
        hosted.record({'input_tokens': 9000, 'output_tokens': 2500, 'cost_in_usd_ticks': 330_000_000})
        return ANSWER


@pytest.fixture
def stand_ins(monkeypatch):
    hosted.reset()

    async def fake_collect(settings, **kw):
        return {'signals': list(SIGNALS), 'missing': ['ID-PA'], 'provinces_read': ['ID-JK', 'ID-JI']}
    monkeypatch.setattr(pulse_radar, 'collect', fake_collect)
    monkeypatch.setattr(pulse_radar, 'engines_for', lambda settings, ai=None: [(Model, 5)])

    def no_database(*args, **kw):
        raise AssertionError('the check opened the database without --save')
    monkeypatch.setattr(pulse_radar_check, 'async_session', no_database)
    yield
    hosted.reset()


@pytest.mark.asyncio
async def test_the_check_prints_counts_and_cost_and_writes_nothing_by_default(stand_ins):
    lines = []
    summary = await pulse_radar_check.run(out=lines.append)
    text = '\n'.join(lines)
    assert 'berita 1, pencarian 2, video 1' in text
    assert 'Daftar provinsi terbaca: 2 dari 34' in text and 'ID-PA' in text
    assert 'Isu tersusun: 1 nasional, 1 lokal' in text
    assert '1. Pengunduran diri Wapres [politik]' in text
    assert '9.000 token masuk, 2.500 token keluar' in text and 'USD 0,0330' in text
    assert 'Tidak ada yang disimpan' in text
    assert summary == {'signals': 4, 'provinces_read': 2, 'national': 1, 'local': 1, 'cost_usd': 0.033, 'credits': None, 'state': 'partial'}


@pytest.mark.asyncio
async def test_without_the_hosted_engine_the_check_says_the_lists_stay_raw(stand_ins, monkeypatch):
    monkeypatch.setattr(pulse_radar, 'engines_for', lambda settings, ai=None: [])
    lines = []
    summary = await pulse_radar_check.run(out=lines.append)
    assert 'Isu tidak disusun' in '\n'.join(lines) and summary['state'] == 'raw' and summary['national'] == 0


class Silent:
    async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
        raise TimeoutError('no answer in time')


@pytest.mark.asyncio
async def test_the_check_asks_the_faster_engine_when_the_first_gives_nothing(stand_ins, monkeypatch):
    monkeypatch.setattr(pulse_radar, 'engines_for', lambda settings, ai=None: [(Silent, 5), (Model, 5)])
    lines = []
    summary = await pulse_radar_check.run(out=lines.append)
    assert summary['national'] == 1 and summary['state'] == 'partial' and 'Isu tersusun: 1 nasional, 1 lokal' in '\n'.join(lines)


@pytest.mark.asyncio
async def test_the_paid_round_prints_what_x_found_what_was_measured_and_what_it_cost(stand_ins, monkeypatch):
    from types import SimpleNamespace
    balances, asked = iter([1000, 912]), {}

    async def credits(settings):
        return next(balances)

    async def fake_discover(engine, now):
        hosted.record({'input_tokens': 100000, 'output_tokens': 2000, 'cost_in_usd_ticks': 3_900_000_000})
        return [{'platform': 'x', 'title': 'Tagar soal BBM', 'url': 'https://x.com/a/status/11111', 'source': None, 'figure': None, 'provinces': {}, 'section': None, 'related': []}]

    async def fake_measure(issues, previous, *, key, now, client=None, budget=None, choose=None):
        asked.update(keys=[issue['title'] for issue in issues], previous=previous)
        figures = {issues[0]['key']: {'x': {'count': 625}, 'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 3, 'capped': False}}}
        choose(figures)
        return {'figures': figures, 'evidence': {}, 'sampled': {}, 'missing': ['instagram']}
    monkeypatch.setattr(pulse_radar_check, 'credits', credits)
    monkeypatch.setattr(pulse_radar, 'discover', fake_discover)
    monkeypatch.setattr(pulse_radar, 'get_ai_service', lambda settings=None: object())
    monkeypatch.setattr(pulse_radar, 'measure', fake_measure)
    lines = []
    summary = await pulse_radar_check.run(social=True, settings=SimpleNamespace(AI_PROVIDER='grok', XAI_API_KEY='fake', YOUTUBE_API_KEY='', XPOZ_API_KEY='fake'), out=lines.append)
    text = '\n'.join(lines)
    assert 'berita 1, pencarian 2, video 1, X 1' in text
    assert asked == {'keys': ['Pengunduran diri Wapres'], 'previous': {}}, 'by hand, nothing is carried from an earlier refresh: the round shows the full price'
    assert '1. Pengunduran diri Wapres [politik] berita 5, X 625+ posting, TikTok 20+, Instagram 3, video 1, pencarian 5.000+, 1 provinsi' in text
    assert 'Tidak terbaca: ID-PA, instagram' in text
    assert 'Kredit pemasok sosial terpakai: 88' in text and 'USD 0,4230' in text
    assert summary['credits'] == 88 and summary['state'] == 'partial'


@pytest.mark.asyncio
async def test_without_the_paid_flag_the_check_asks_neither_x_nor_the_supplier(stand_ins, monkeypatch):
    def never(*args, **kw):
        raise AssertionError('a paid step ran without --social')
    for name in ('discover', 'measure'):
        monkeypatch.setattr(pulse_radar, name, never)
    monkeypatch.setattr(pulse_radar_check, 'credits', never)
    lines = []
    summary = await pulse_radar_check.run(out=lines.append)
    assert summary['credits'] is None and 'Kredit' not in '\n'.join(lines) and ', X ' not in '\n'.join(lines)
