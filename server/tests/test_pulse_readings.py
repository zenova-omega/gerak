"""The four readings of part 2 on the server, checked against the cases the browser module is checked against too."""
import json
import re
from pathlib import Path

import pytest

from app.services import pulse_measures as m
from app.services import pulse_readings as r

CASES = json.loads((Path(__file__).resolve().parents[2] / 'shared' / 'pulse-readings.cases.json').read_text(encoding='utf-8'))
OFFSET = CASES['zone']['offset_minutes']
FRACTION = re.compile(r'[0-9]+/[0-9]+')


def cases(name):
    return [pytest.param(case, id=case.get('note', str(i))) for i, case in enumerate(CASES[name])]


def posts(rows):
    """`{"times": n, ...}` stands for n posts; `{i}` in the author becomes 01, 02, ..."""
    if rows is None:
        return None
    out = []
    for row in rows:
        times = row.get('times', 1)
        for index in range(times):
            post = {key: value for key, value in row.items() if key != 'times'}
            if isinstance(post.get('author'), str):
                post['author'] = post['author'].replace('{i}', f'{index + 1:02d}')
            if 'times' in row and 'id' in post:
                post['id'] = f"{post['id']}-{index + 1}"
            out.append(post)
    return out


def same(actual, expected, path='out'):
    """Equal, with a share written as "3/11" compared as a number."""
    if isinstance(expected, str) and FRACTION.fullmatch(expected):
        top, bottom = expected.split('/')
        assert isinstance(actual, (int, float)) and not isinstance(actual, bool), path
        assert abs(actual - int(top) / int(bottom)) < 1e-9, f'{path}: {actual} is not {expected}'
    elif isinstance(expected, dict):
        assert isinstance(actual, dict) and set(actual) == set(expected), f'{path}: {actual!r}'
        for key in expected:
            same(actual[key], expected[key], f'{path}.{key}')
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected), f'{path}: {actual!r}'
        for index, item in enumerate(expected):
            same(actual[index], item, f'{path}[{index}]')
    elif isinstance(expected, float) or (isinstance(expected, int) and isinstance(actual, float)):
        assert abs(actual - expected) < 1e-9, f'{path}: {actual} is not {expected}'
    else:
        assert actual == expected and type(actual) is type(expected), f'{path}: {actual!r} is not {expected!r}'


def test_rule_names_versions_and_sentences():
    assert [(name, version) for name, version in r.RULES.items()] == [(rule['name'], rule['version']) for rule in CASES['rules']]
    assert r.RULE_TEXT == {rule['name']: rule['text'] for rule in CASES['rules']}
    for text in r.RULE_TEXT.values():
        assert text and text[0].isupper() and '—' not in text
    assert not set(r.RULES) & set(m.RULES), 'a reading never reuses the name of a part 1 rule'


def test_the_stop_words_are_the_word_panels():
    assert sorted(r.STOPWORDS) == sorted(CASES['stopwords'])


@pytest.mark.parametrize('case', cases('words'))
def test_words(case):
    assert r.words(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('terms'))
def test_terms(case):
    terms = r.post_terms(case['in'])
    assert isinstance(terms, (set, frozenset))
    assert terms == set(case['out'])


@pytest.mark.parametrize('case', cases('period_before'))
def test_period_before(case):
    assert r.period_before(case['from'], case['to']) == case['out']


@pytest.mark.parametrize('case', cases('coverage'))
def test_coverage(case):
    same(r.coverage(posts(case['in']), case.get('offset', OFFSET)), case['out'])


@pytest.mark.parametrize('case', cases('term_shift'))
def test_term_shift(case):
    same(r.term_shift(posts(case['now']), posts(case['before'])), case['out'])


@pytest.mark.parametrize('case', cases('hour_grid'))
def test_hour_grid(case):
    expected = {**case['out'], 'rows': [{**row, 'cells': [row['cells'].get(str(hour), 0) for hour in range(24)]} for row in case['out']['rows']]}
    same(r.hour_grid(posts(case['in']), case.get('offset', OFFSET)), expected)


@pytest.mark.parametrize('case', cases('concentration'))
def test_concentration(case):
    same(r.concentration(posts(case['in']), case.get('offset', OFFSET)), case['out'])


def test_the_readings_take_any_iterable_and_do_not_change_the_posts():
    rows = posts(CASES['concentration'][0]['in'])
    before = json.dumps(rows, sort_keys=True)
    r.coverage(iter(rows), OFFSET), r.concentration(tuple(rows), OFFSET), r.hour_grid(rows, OFFSET), r.term_shift(rows, rows)
    assert json.dumps(rows, sort_keys=True) == before


def test_a_zone_west_of_utc_is_refused_like_in_part_one():
    with pytest.raises(ValueError):
        r.hour_grid([{'published_at': '2026-11-10T08:00:00'}], -300)
