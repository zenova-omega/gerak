"""The four calculation rules on the server, checked against the cases the browser module is checked against too."""
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated

import pytest
from pydantic import TypeAdapter, ValidationError

from app.config import Settings
from app.services import pulse_measures as m

CASES = json.loads((Path(__file__).resolve().parents[2] / 'shared' / 'pulse-measures.cases.json').read_text())
OFFSET = CASES['zone'][0]['out']['offset_minutes']
EPOCH = datetime(1970, 1, 1)

EXPECTED_RULES = [
    ('day', 'day_v1'), ('clock', 'clock_v1'), ('interactions', 'interactions_v1'),
    ('shares_total', 'shares_total_v1'), ('content_shares', 'content_shares_v1'),
    ('tone_share', 'tone_share_v1'), ('account', 'account_v1'),
]


def cases(name):
    return [pytest.param(case, id=case.get('note', str(i))) for i, case in enumerate(CASES[name])]


def test_rule_names_and_versions():
    assert list(m.RULES.items()) == EXPECTED_RULES
    assert set(m.RULE_TEXT) == set(m.RULES)
    for text in m.RULE_TEXT.values():
        assert text and text[0].isupper() and '—' not in text


def test_the_zone_defaults_are_the_cases_zone():
    zone = CASES['zone'][0]['out']
    assert Settings.model_fields['PULSE_ZONE_OFFSET_MINUTES'].default == zone['offset_minutes']
    assert Settings.model_fields['PULSE_ZONE_NAME'].default == zone['name']


@pytest.mark.parametrize('case', [c for c in cases('zone') if c.values[0]['in'] is not None])
def test_the_zone_setting_accepts_only_offsets_east_of_utc(case):
    # Checked against the field itself, so no environment file is read.
    field = Settings.model_fields['PULSE_ZONE_OFFSET_MINUTES']
    check = TypeAdapter(Annotated[field.annotation, *field.metadata])
    offset = case['in']['offset_minutes']
    if case['out'] is None:
        with pytest.raises(ValidationError):
            check.validate_python(offset)
        with pytest.raises(ValueError):
            m.local_day('2026-11-10T08:00:00', offset)
        with pytest.raises(ValueError):
            m.period_bounds('2026-11-10', '2026-11-10', offset)
    else:
        assert check.validate_python(offset) == case['out']['offset_minutes']
        assert m.local_day('2026-11-10T08:00:00', offset) is not None


def test_a_no_clock_post_is_inside_its_own_day_by_the_bounds_for_every_supported_offset():
    day = '2026-11-10'
    for offset in range(0, 1440, 30):
        start, end = m.period_bounds(day, day, offset)
        assert start <= m.read_time(day) < end, offset
        assert not (start <= m.read_time('2026-11-09') < end), offset
        assert not (start <= m.read_time('2026-11-11') < end), offset
    start, end = m.period_bounds(day, day, 1439)
    assert start <= m.read_time(day) < end


@pytest.mark.parametrize('case', cases('read_time'))
def test_read_time(case):
    value = m.read_time(case['in'])
    assert (None if value is None else (value - EPOCH) // timedelta(milliseconds=1)) == case['out']


@pytest.mark.parametrize('case', cases('has_clock'))
def test_has_clock(case):
    assert m.has_clock(case['in']) is case['out']


@pytest.mark.parametrize('case', cases('day'))
def test_day(case):
    assert m.local_day(case['in'], case.get('offset', OFFSET)) == case['out']


@pytest.mark.parametrize('case', cases('week_start'))
def test_week_start(case):
    assert m.week_start(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('local_time'))
def test_local_time(case):
    value = m.local_time(case['in'], case.get('offset', OFFSET))
    assert (None if value is None else value.isoformat(timespec='seconds')) == case['out']


@pytest.mark.parametrize('case', [c for c in cases('in_period') if c.values[0]['from'] or c.values[0]['to']])
def test_closed_period_bounds_agree_with_the_rule_for_queries_written_with_less_or_equal(case):
    offset = case.get('offset', OFFSET)
    start, last = m.period_closed_bounds(case['from'], case['to'], offset)
    value = m.read_time(case['in'])
    if value is not None:
        assert ((start is None or value >= start) and (last is None or value <= last)) is case['out']
    assert m.period_closed_bounds(None, None, offset) == (None, None)
    assert m.period_closed_bounds('2026-11-10', '2026-11-10', 420)[1] == datetime(2026, 11, 10, 16, 59, 59, 999999)


@pytest.mark.parametrize('case', cases('in_period'))
def test_in_period(case):
    offset = case.get('offset', OFFSET)
    assert m.in_period(case['in'], case['from'], case['to'], offset) is case['out']
    # The SQL bounds agree with the rule on every dated case.
    start, end = m.period_bounds(case['from'], case['to'], offset)
    value = m.read_time(case['in'])
    if value is not None and (start or end):
        assert ((start is None or value >= start) and (end is None or value < end)) is case['out']


@pytest.mark.parametrize('case', cases('reported'))
def test_reported(case):
    assert m.reported(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('interactions'))
def test_interactions(case):
    assert m.interactions(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('interactions_total'))
def test_interactions_total(case):
    assert m.interactions_total(case['in']) == case['out']
    assert m.interactions_total([{'metrics': metrics} for metrics in case['in']]) == case['out']


@pytest.mark.parametrize('case', cases('shares_total'))
def test_shares_total(case):
    assert m.shares_total(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('content_shares'))
def test_content_shares(case):
    assert m.content_shares(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('interaction_order'))
def test_interaction_order(case):
    ordered = sorted(case['in'], key=lambda p: m.interaction_sort_key(m.interactions(p['metrics']), p['published_at'], p['id']))
    assert [p['id'] for p in ordered] == case['out']


@pytest.mark.parametrize('case', cases('tone'))
def test_tone(case):
    assert m.tone(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('tone_shares'))
def test_tone_shares(case):
    assert m.tone_shares(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('account'))
def test_account(case):
    post = case['in']
    assert m.account_key(post['platform'], post['author'], post['metrics']) == case['out']


@pytest.mark.parametrize('case', cases('account_name'))
def test_account_name(case):
    assert m.account_name(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('post_account'))
def test_post_account(case):
    assert m.post_account(case['in']) == case['out']


@pytest.mark.parametrize('case', cases('account_count'))
def test_account_count(case):
    assert m.account_count(case['in']) == case['out']


def test_post_measures_bundles_the_rules():
    measures = m.post_measures('2026-11-10T17:00:00', 'x', '@Okezonenews', {'likes': 2, 'comments': '1', 'sentiment': 'neutral'}, 'p1')
    assert measures == {'day': m.local_day('2026-11-10T17:00:00'), 'clock': True, 'interactions': 3, 'account': 'x:okezonenews', 'tone': 'neutral'}
    assert m.post_measures(None, 'news', None, None) == {'day': None, 'clock': False, 'interactions': None, 'account': None, 'tone': 'unknown'}


async def test_the_rule_list_route(client, admin_token):
    response = await client.get('/api/admin/pulse/measures', headers={'Authorization': f'Bearer {admin_token}'})
    assert response.status_code == 200
    body = response.json()
    offset, name = m.zone()
    assert body['zone'] == {'offset_minutes': offset, 'name': name}
    assert [(rule['name'], rule['version']) for rule in body['rules']] == EXPECTED_RULES
    assert all(rule['text'] == m.RULE_TEXT[rule['name']] for rule in body['rules'])


async def test_the_rule_list_needs_access(client):
    response = await client.get('/api/admin/pulse/measures')
    assert response.status_code in (401, 403)
