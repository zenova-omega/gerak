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
    monkeypatch.setattr(pulse_radar_check, 'collect', fake_collect)
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
    assert summary == {'signals': 4, 'provinces_read': 2, 'national': 1, 'local': 1, 'cost_usd': 0.033, 'state': 'partial'}


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
