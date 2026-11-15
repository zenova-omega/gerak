"""Grouping signals into issues. The model proposes; the server keeps only what the signals support.

The model is always a fake here. What is checked is what happens to its answer: an issue must point at signals that
exist, keep its identity from one refresh to the next, and never be about the assistant instead of the news.
"""
import asyncio
import json

import pytest

from app.services.pulse_radar_compose import CATEGORIES, SYSTEM, build_prompt, compose, parse_answer


def signal(number, platform, title, figure=None, provinces=None):
    return {'id': f'S{number}', 'platform': platform, 'title': title, 'url': None, 'source': None, 'figure': figure,
            'provinces': provinces or {}, 'related': [], 'section': None}


SIGNALS = [signal(1, 'news', 'Wapres Gibran resmi mundur', 4), signal(2, 'youtube', 'Pamitan Gibran di Istana', 2104721),
           signal(3, 'search', 'gibran mundur', 5000, {'ID-JK': 2000, 'ID-JT': 1000}), signal(4, 'search', 'polda jawa timur', None, {'ID-JI': 200}),
           signal(5, 'news', 'Perampokan di Malang tewaskan anak', 2), signal(6, 'search', 'tim nasional sepak bola indonesia', 10000, {'ID-JK': 200})]
PREVIOUS = [{'key': 'k-gibran', 'title': 'Pengunduran diri Wapres Gibran'}]


def answer(*issues, brief='Ringkas.'):
    return json.dumps({'brief': brief, 'issues': [
        {'key': '', 'title': 'Isu', 'category': 'politik', 'reason': 'Ramai di berita.', 'signals': ['S1'], 'q': 'isu', 'required': '', 'excluded': '', **issue}
        for issue in issues]})


def read(*issues, **kw):
    return parse_answer(answer(*issues, **kw), SIGNALS, PREVIOUS)


def test_the_prompt_numbers_every_signal_and_names_the_provinces_of_a_search_term():
    prompt = build_prompt(SIGNALS, PREVIOUS)
    assert 'S1 | berita | Wapres Gibran resmi mundur' in prompt and 'S3 | pencarian | gibran mundur' in prompt
    assert 'JK 2000' in prompt and 'JT 1000' in prompt
    assert 'k-gibran | Pengunduran diri Wapres Gibran' in prompt
    assert all(category in prompt for category in CATEGORIES)
    assert 'JSON' in SYSTEM, 'the engine is asked for an object, not prose'


def test_an_issue_keeps_only_signals_that_exist_and_is_dropped_without_any():
    out = read({'title': 'A', 'signals': ['S1', 'S99']}, {'title': 'B', 'signals': ['S98']}, {'title': 'C', 'signals': 'S1'})
    assert [issue['title'] for issue in out['issues']] == ['A'] and out['issues'][0]['signal_ids'] == ['S1']


def test_an_unknown_category_becomes_lainnya_and_text_is_cut():
    issue = read({'title': 'T' * 300, 'category': 'Gosip', 'reason': 'r' * 900})['issues'][0]
    assert issue['category'] == 'lainnya' and len(issue['title']) <= 120 and len(issue['reason']) <= 300
    assert read({'category': 'HUKUM'})['issues'][0]['category'] == 'hukum'


def test_the_same_story_keeps_its_key_and_a_new_story_gets_a_new_one():
    out = read({'key': 'k-gibran', 'title': 'Pengunduran diri Wapres Gibran'}, {'key': '', 'title': 'Perampokan di Malang', 'signals': ['S5']},
               {'key': 'k-made-up', 'title': 'Timnas', 'signals': ['S6']}, {'key': 'k-gibran', 'title': 'Hak pensiun Wapres', 'signals': ['S2']})
    by_title = {issue['title']: issue['key'] for issue in out['issues']}
    assert by_title['Pengunduran diri Wapres Gibran'] == 'k-gibran'
    assert by_title['Perampokan di Malang'].startswith('r-') and by_title['Timnas'].startswith('r-'), 'a key that was never issued is replaced'
    assert by_title['Hak pensiun Wapres'] != 'k-gibran', 'one key names one issue in a run'
    assert len(set(by_title.values())) == 4


def test_a_story_told_again_without_its_key_is_recognised_by_its_words():
    out = read({'key': '', 'title': 'Pengunduran diri Wapres Gibran dari jabatan'}, {'key': '', 'title': 'Gibran bertemu warga', 'signals': ['S2']})
    assert out['issues'][0]['key'] == 'k-gibran' and out['issues'][1]['key'] != 'k-gibran'


def test_an_issue_only_on_province_lists_is_local():
    out = read({'title': 'Polda Jawa Timur', 'signals': ['S4']}, {'title': 'Gibran', 'signals': ['S3']}, {'title': 'Malang', 'signals': ['S5', 'S4']})
    assert [issue['scope'] for issue in out['issues']] == ['local', 'national', 'national']


def test_an_issue_on_the_lists_of_five_provinces_is_national_even_without_news():
    wide = signal(7, 'search', 'sscasn', None, {'ID-JK': 1000, 'ID-JB': 500, 'ID-JI': 500, 'ID-SU': 200, 'ID-PA': 100})
    near = signal(8, 'search', 'kosovo vs israel', None, {'ID-JK': 500, 'ID-BA': 200})
    also = signal(9, 'search', 'israel vs kosovo', None, {'ID-BA': 500, 'ID-SU': 200, 'ID-JT': 100})
    out = parse_answer(answer({'title': 'SSCASN 2026', 'signals': ['S7']}, {'title': 'Kosovo lawan Israel', 'signals': ['S8', 'S9']}, {'title': 'Polda', 'signals': ['S4', 'S8']}),
                       SIGNALS + [wide, near, also], PREVIOUS)
    assert [(issue['title'], issue['scope']) for issue in out['issues']] == [('SSCASN 2026', 'national'), ('Kosovo lawan Israel', 'local'), ('Polda', 'local')], \
        'five provinces between all its terms make an issue national; four do not'


def test_the_keyword_proposal_is_always_usable():
    out = read({'title': 'Timnas Indonesia', 'signals': ['S6'], 'q': '  ', 'required': None}, {'q': 'gibran mundur, wapres mundur', 'required': 'Indonesia', 'excluded': 'promo'})
    assert out['issues'][0]['query'] == {'q': 'tim nasional sepak bola indonesia', 'required': '', 'excluded': ''}, 'without a proposal, the search terms people used'
    assert out['issues'][1]['query'] == {'q': 'gibran mundur, wapres mundur', 'required': 'Indonesia', 'excluded': 'promo'}


def test_an_issue_about_an_ai_company_passes_unaltered_and_one_about_the_assistant_itself_is_dropped():
    out = read({'title': 'Grok diblokir di Indonesia', 'reason': 'Kominfo memblokir Grok milik xAI; ramai di X.'},
               {'title': 'Model bahasa lokal', 'reason': 'Peluncuran model bahasa buatan lokal ramai dibahas sebagai AI paling banyak dipakai.'},
               {'title': 'Kutipan', 'reason': 'Pernyataan "saya siap mundur" ramai dikutip.'},
               {'title': 'Catatan', 'reason': 'Sebagai model bahasa, saya tidak dapat memastikan isu ini.'},
               {'title': 'Catatan lain', 'reason': 'Sebagai Grok, saya merangkum dari sinyal yang ada.'}, brief='Sebagai AI, saya merangkum tiga isu.')
    assert [issue['title'] for issue in out['issues']] == ['Grok diblokir di Indonesia', 'Model bahasa lokal', 'Kutipan'], \
        'only the assistant speaking in the first person is dropped; a story about AI, or a quoted "saya", is a story'
    assert out['issues'][0]['reason'] == 'Kominfo memblokir Grok milik xAI; ramai di X.'
    assert out['brief'] is None


@pytest.mark.parametrize('text,expected', [('', None), ('Maaf, tidak bisa.', None), ('{"issues": [', None), ('{"issues": "banyak"}', None), ('[1, 2]', None),
                                           ('```json\n{"issues": []}\n```', {'brief': None, 'issues': []}),
                                           ('Berikut hasilnya:\n{"brief": "Dua isu.", "issues": []}\nSemoga membantu.', {'brief': 'Dua isu.', 'issues': []})])
def test_an_answer_that_is_not_the_object_asked_for(text, expected):
    assert parse_answer(text, SIGNALS, PREVIOUS) == expected


def test_the_briefs_numbers_follow_the_issues_they_were_written_about():
    out = read({'title': 'A', 'signals': ['S99']}, {'title': 'B', 'signals': ['S1']}, {'title': 'C', 'signals': ['S5']},
               brief='Yang menonjol B [2] dan C [3]; A [1] dan [9] tidak ada.')
    keys = {issue['title']: issue['key'] for issue in out['issues']}
    assert out['brief'] == f"Yang menonjol B [#{keys['B']}] dan C [#{keys['C']}]; A dan tidak ada.", \
        'a number becomes the key of the issue it meant; a number whose issue was dropped is removed'


def test_odd_shapes_in_an_answer_never_raise():
    text = json.dumps({'brief': ['bukan', 'teks'], 'issues': [
        {'title': 'A', 'signals': [['S1'], {'x': 1}, 'S1', 5]}, 'bukan objek', {'title': {'x': 1}, 'signals': ['S5']},
        {'title': 'B', 'signals': ['S5'], 'q': ['a'], 'category': 7, 'reason': None, 'key': ['k']}]})
    out = parse_answer(text, SIGNALS, PREVIOUS)
    assert [issue['title'] for issue in out['issues']] == ['A', 'B'] and out['issues'][0]['signal_ids'] == ['S1'] and out['brief'] is None
    assert out['issues'][1]['query']['q'] == 'B' and out['issues'][1]['category'] == 'lainnya' and out['issues'][1]['reason'] == ''


class Model:
    def __init__(self, text=None, error=None, wait=0):
        self.text, self.error, self.wait, self.calls = text, error, wait, []

    async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
        self.calls.append({'prompt': prompt, 'system': system, 'max_tokens': max_tokens})
        await asyncio.sleep(self.wait)
        if self.error:
            raise self.error
        return self.text


@pytest.mark.asyncio
async def test_composing_asks_once_and_returns_the_checked_issues():
    model = Model(answer({'title': 'Pengunduran diri Wapres Gibran', 'signals': ['S1', 'S2', 'S3']}))
    out = await compose(model, SIGNALS, PREVIOUS)
    assert len(model.calls) == 1 and model.calls[0]['system'] == SYSTEM and model.calls[0]['max_tokens'] >= 6000
    assert out['issues'][0]['signal_ids'] == ['S1', 'S2', 'S3'] and out['brief'] == 'Ringkas.'


@pytest.mark.asyncio
async def test_a_model_that_raises_or_hangs_gives_none():
    assert await compose(Model(error=RuntimeError('provider said no, with a secret in the message')), SIGNALS, PREVIOUS) is None
    assert await compose(Model(text='{}', wait=5), SIGNALS, PREVIOUS, timeout=0.05) is None
    assert await compose(None, SIGNALS, PREVIOUS) is None, 'no engine, no issues'
    assert await compose(Model(answer()), [], PREVIOUS) is None, 'nothing to group, nothing asked'
    assert await compose(Model(text=12345), SIGNALS, PREVIOUS) is None, 'an answer that is not text is no answer'
