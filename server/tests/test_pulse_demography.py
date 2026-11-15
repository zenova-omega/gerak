"""The readings of part 3 (followers, account tier) on the server, checked against the cases the browser module is checked against too."""
import json
import re
from pathlib import Path

import pytest

from app.services import pulse_measures as m
from app.services import pulse_demography as r
from app.services import pulse_readings as earlier

CASES = json.loads((Path(__file__).resolve().parents[2] / 'shared' / 'pulse-demography.cases.json').read_text(encoding='utf-8'))
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
    assert not set(r.RULES) & (set(m.RULES) | set(earlier.RULES)), 'a reading never reuses the name of an earlier rule'
    assert not set(r.RULES.values()) & (set(m.RULES.values()) | set(earlier.RULES.values()))


def test_the_tiers_in_the_order_of_the_rows():
    assert [tier['key'] for tier in r.TIERS] == ['news', '1m', '100k', '10k', '1k', 'small', 'unknown']
    assert [tier['label'] for tier in r.TIERS] == ['Pemberitaan', '≥1 jt', '100 rb–1 jt', '10–100 rb', '1–10 rb', '<1 rb', 'Pengikut tidak diketahui']
    assert [tier['min'] for tier in r.TIERS if 'min' in tier] == [1000000, 100000, 10000, 1000, 0]


@pytest.mark.parametrize('case', cases('followers'))
def test_followers(case):
    assert r.followers_of(posts(case['in'])) == case['out']


@pytest.mark.parametrize('case', cases('tiers'))
def test_account_tiers(case):
    same(r.account_tiers(posts(case['in'])), case['out'])


def test_post_shares_add_up_to_one_and_rows_keep_the_order_of_the_tiers():
    keys = [tier['key'] for tier in r.TIERS]
    for case in CASES['tiers']:
        reading = r.account_tiers(posts(case['in']))
        if not reading['rows']:
            continue
        assert abs(sum(row['post_share'] for row in reading['rows']) - 1) < 1e-9, case['note']
        assert sum(row['posts'] for row in reading['rows']) == reading['total'], case['note']
        order = [keys.index(row['key']) for row in reading['rows']]
        assert order == sorted(order), case['note']
        assert all(len(row['top']) <= 3 and row['accounts'] > 0 and row['posts'] > 0 for row in reading['rows']), case['note']


def test_the_platforms_of_a_row_hold_exactly_its_posts_and_its_known_interactions():
    for case in CASES['tiers'] + CASES['lead']:
        for row in r.account_tiers(posts(case['in']))['rows']:
            assert sum(platform['posts'] for platform in row['platforms']) == row['posts'], f"{case['note']}: {row['key']}"
            known = [platform['interactions'] for platform in row['platforms'] if platform['interactions'] is not None]
            assert (sum(known) if known else None) == row['interactions']['value'], f"{case['note']}: {row['key']}"


@pytest.mark.parametrize('case', cases('tier_of'))
def test_tier_of(case):
    rows = posts(case['in'])
    followers = r.followers_of(rows)
    assert [r.tier_of(post, followers) for post in rows] == case['out']


def test_a_row_of_the_tiers_holds_exactly_the_posts_tier_of_places_in_it():
    keys = [tier['key'] for tier in r.TIERS]
    for case in CASES['tiers']:
        rows = posts(case['in'])
        followers = r.followers_of(rows)
        placed: dict[str, int] = {}
        for post in rows:
            key = r.tier_of(post, followers)
            placed[key] = placed.get(key, 0) + 1
        assert [(row['key'], row['posts']) for row in r.account_tiers(rows)['rows']] == sorted(placed.items(), key=lambda item: keys.index(item[0])), case['note']


def test_the_readings_take_any_iterable_and_do_not_change_the_posts():
    rows = posts(CASES['tiers'][1]['in'])
    before = json.dumps(rows, sort_keys=True)
    r.followers_of(iter(rows)), r.account_tiers(tuple(rows))
    assert json.dumps(rows, sort_keys=True) == before
    assert r.account_tiers(None)['rows'] == [] and r.followers_of(None) == {}


def shown(reading, only):
    """What an `origin` case compares: no `post` on a row, a tone as {analysed, unknown}."""
    def group(row):
        return {**row, 'tone': {'analysed': row['tone']['analysed'], 'unknown': row['tone']['unknown']}}
    whole = {**reading, 'country': {name: group(row) for name, row in reading['country'].items()},
             'provinces': [group(row) for row in reading['provinces']],
             'rows': [{key: value for key, value in row.items() if key != 'post'} for row in reading['rows']]}
    return {key: whole[key] for key in only} if only else whole


@pytest.mark.parametrize('case', cases('origin'))
def test_account_origin(case):
    same(shown(r.account_origin(posts(case['in'])), case.get('only')), case['out'])


def test_origin_splits_add_up_and_rows_carry_the_post_that_was_read():
    for case in CASES['origin']:
        reading = r.account_origin(posts(case['in']))
        assert reading['unasked'] + reading['no_location'] + reading['with_location'] == reading['accounts'], case['note']
        assert sum(group['accounts'] for group in reading['country'].values()) == reading['accounts'], case['note']
        assert len(reading['rows']) == reading['accounts'], case['note']
        assert list(reading['country']) == ['indonesia', 'abroad', 'region_only', 'unknown']
        assert all(row['post']['platform'] == 'x' for row in reading['rows']), case['note']


@pytest.mark.parametrize('case', cases('country_of'))
def test_country_of(case):
    assert [r.country_of(value) for value in case['in']] == case['out']


def test_origin_a_country_group_holds_exactly_the_accounts_country_of_places_in_it():
    for case in CASES['origin']:
        reading = r.account_origin(posts(case['in']))
        for name, group in reading['country'].items():
            assert sum(r.country_of(row['based_in']) == name for row in reading['rows']) == group['accounts'], f"{case['note']}: {name}"


@pytest.mark.parametrize('case', cases('shares'))
def test_shares(case):
    rows = posts(case['in'])
    tiers, origin = r.account_tiers(rows), r.account_origin(rows)
    same({
        'followers_known': r.followers_known_share(tiers), 'followers_known_interactions': r.followers_known_interaction_share(tiers),
        'province_read': r.province_read_share(origin),
        'country': {name: r.account_share(group, origin) for name, group in origin['country'].items()},
        'provinces': {province['code']: r.account_share(province, origin) for province in origin['provinces']},
    }, case['out'])


def test_group_lead_reads_the_province_share_from_province_read_share():
    for case in CASES['lead']:
        rows = posts(case['in'])
        origin = r.account_origin(rows)
        lead = r.group_lead(r.account_tiers(rows), origin)
        if lead['where']:
            assert lead['where']['read_share'] == r.province_read_share(origin), case['note']


def _origin(note):
    return next(case for case in CASES['origin'] if case['note'].startswith(note))


def test_origin_row_names_the_most_recently_published_post_of_the_account():
    case = _origin("a row's post")
    rows = posts(case['in'])
    reading = r.account_origin(rows)
    for key, index in case['post'].items():
        assert next(row for row in reading['rows'] if row['key'] == key)['post'] is rows[index]


def test_regions_and_the_origin_reading_does_not_change_the_posts():
    assert {'Southeast Asia', 'West Asia', 'East Asia & Pacific', 'East Asia'} <= set(r.REGIONS) and 'Indonesia' not in r.REGIONS
    rows = posts(_origin('the base splits')['in'])
    before = json.dumps(rows, sort_keys=True)
    r.account_origin(iter(rows))
    assert json.dumps(rows, sort_keys=True) == before
    assert r.account_origin(None)['accounts'] == 0


def _lead(rows):
    return r.group_lead(r.account_tiers(rows), r.account_origin(rows))


# The fix wave of 15 Nov changed some expectations; each changed case's note says why (a tie is no lead; a gap is said
# instead of a winner it could overturn).
@pytest.mark.parametrize('case', cases('lead'))
def test_group_lead(case):
    same(_lead(posts(case['in'])), case['out'])


def test_group_lead_names_a_group_only_when_its_lead_is_larger_than_the_unknown_share():
    measures = {'posts': lambda row: row['posts'], 'interactions': lambda row: row['interactions']['value'] or 0}
    for case in CASES['lead']:
        rows_ = posts(case['in'])
        tiers = r.account_tiers(rows_)
        lead = r.group_lead(tiers, r.account_origin(rows_))
        if not lead['carrier']:
            continue
        rows = [row for row in tiers['rows'] if row['key'] != 'unknown']
        unknown = next((row for row in tiers['rows'] if row['key'] == 'unknown'), None)
        for measure, value in measures.items():
            ranked = sorted((value(row) for row in rows), reverse=True)
            gap = value(unknown) if unknown else 0
            named, said = lead['carrier'][f'{measure}_row'], lead['carrier'][f'{measure}_gap']
            assert (named is not None) == (ranked[0] - (ranked[1] if len(ranked) > 1 else 0) > gap), f"{case['note']}: {measure}"
            if named is not None:
                assert value(next(row for row in rows if row['key'] == named)) == ranked[0], case['note']
            assert (said is not None) == (gap > 0 and gap >= ranked[0]), f"{case['note']}: {measure} gap"
            if said:
                shares = [platform['share'] for platform in said['platforms']]
                assert 1 <= len(shares) <= 2 and all(share > 0 for share in shares) and shares == sorted(shares, reverse=True), case['note']


def test_group_lead_most_negative_is_never_a_row_without_a_negative_post_and_is_qualified_by_the_unknown_row():
    for case in CASES['lead']:
        rows_ = posts(case['in'])
        tiers = r.account_tiers(rows_)
        lead = r.group_lead(tiers, r.account_origin(rows_))
        if not lead['negative']:
            continue
        row = next(own for own in tiers['rows'] if own['key'] == lead['negative']['row'])
        unknown = next((own for own in tiers['rows'] if own['key'] == 'unknown'), None)
        assert row['tone']['text']['negative'] != '0%', case['note']
        assert (lead['negative']['unknown'] is not None) == ((unknown or {'tone': {'analysed': 0}})['tone']['analysed'] >= r.NEGATIVE_MIN_ANALYSED), case['note']
        if lead['negative']['unknown']:
            assert lead['negative']['unknown']['more_negative'] == (unknown['tone']['percent']['negative'] > lead['negative']['share']), case['note']


def test_group_lead_thresholds_and_names():
    assert r.COMPARE_MIN_ROWS == 2 and r.NEGATIVE_MIN_ANALYSED == 20 and r.WHERE_MIN_ACCOUNTS == 10
    names = {tier['key'] for tier in r.TIERS if tier['key'] != 'unknown'}
    for case in CASES['lead']:
        lead = _lead(posts(case['in']))
        for row in (lead['carrier'] or {}).get('posts_row'), (lead['carrier'] or {}).get('interactions_row'), (lead['negative'] or {}).get('row'):
            assert row is None or row in names, case['note']


def test_group_lead_does_not_change_the_posts():
    rows = posts(CASES['lead'][5]['in'])
    before = json.dumps(rows, sort_keys=True)
    _lead(rows)
    assert json.dumps(rows, sort_keys=True) == before
    assert r.group_lead(r.account_tiers(None), r.account_origin(None)) == {'carrier': None, 'negative': None, 'where': None}
