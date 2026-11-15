"""One rule for what PULSE calls a spike ("lonjakan"): spike_v1.

The rule is counted in one place on the server. The trend chart asks for it over HTTP, the volume alert and the AI
summary's facts call it directly, so the same series gives the same spikes wherever it is read. The cases of the first
four tests are the ones the chart's browser rule was tested with before it moved here; the figures are unchanged.
"""
import pytest
from sqlalchemy import event

from app.services.pulse_spikes import FLOORS, MAX_BUCKETS, RULE, daily_series, find_spikes, keyed_spikes

URL = '/api/admin/pulse/spikes'


def at(spikes):
    return [spike['index'] for spike in spikes]


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


def days(values):
    """A series as the chart sends it: one bucket per day from 8 Nov 2026."""
    return [{'key': f'2026-11-{8 + index:02d}', 'value': value} for index, value in enumerate(values)]


# ── The rule ────────────────────────────────────────────────────────────────────────────────────────────────────────

def test_a_spike_is_a_bucket_that_rose_is_not_topped_by_the_next_one_and_stands_well_above_the_usual_bucket():
    # The week in the owner's screenshot: posts jump on the third day and then ease off.
    assert find_spikes([80, 180, 1700, 1400, 1328, 1050, 1030], FLOORS['posts']) == [
        {'index': 2, 'value': 1700, 'usual': 1040, 'times': 1700 / 1040}]            # one and a half times the usual day is a spike
    assert find_spikes([80, 180, 1500, 1400, 1328, 1050, 1030], FLOORS['posts']) == []   # a little under one and a half times is not
    # Interactions peak on the third day and again on the fifth.
    interactions = find_spikes([0, 0, 6_000_000, 2_500_000, 17_300_000, 3_000_000, 200_000], FLOORS['interactions'])
    assert at(interactions) == [2, 4]
    assert interactions[1]['usual'] == 1_350_000                                     # the usual bucket is the middle one of the others


@pytest.mark.parametrize('values,kind,why', [
    ([100, 120, 110, 130, 125], 'posts', 'a little more than usual is not a spike'),
    ([50, 50, 50, 50], 'posts', 'flat'),
    ([900, 40, 30, 20], 'posts', 'the first bucket cannot be said to have risen'),
    ([10, 400], 'posts', 'two points are too few to know what is usual'),
    ([0, 0, 3, 0, 0], 'posts', 'three posts are too few to call a spike'),
    ([0, 0, 60, 0, 0], 'interactions', 'sixty interactions are too few to call a spike'),
    ([], 'posts', 'nothing to read'),
])
def test_ordinary_movement_is_no_spike(values, kind, why):
    assert find_spikes(values, FLOORS[kind]) == [], why


def test_a_rise_in_the_last_bucket_counts_an_empty_usual_gives_no_ratio_and_at_most_three_are_returned():
    assert at(find_spikes([10, 12, 9, 11, 80], FLOORS['posts'])) == [4]
    alone = find_spikes([0, 0, 40, 0, 0], FLOORS['posts'])[0]
    assert alone['usual'] == 0
    assert alone['times'] is None                                                    # nothing can be so many times zero
    many = find_spikes([1, 50, 1, 90, 1, 70, 1, 60, 1], FLOORS['posts'])
    assert at(many) == [3, 5, 7]                                                     # the three highest, oldest first


def test_a_rise_too_small_to_see_beside_the_highest_bucket_is_no_spike():
    # A bucket of 300 interactions next to one of 17 million is a flat line to the eye.
    values = [0, 0, 300, 0, 0, 0, 6_000_000, 2_500_000, 17_300_000, 3_000_000]
    assert at(find_spikes(values, FLOORS['interactions'])) == [6, 8]


def test_the_floor_is_the_callers_and_the_rule_says_what_it_is_made_of():
    quiet_then_ten = [0, 0, 0, 10]
    assert at(find_spikes(quiet_then_ten, 10)) == [3]
    assert find_spikes(quiet_then_ten, 11) == []
    assert RULE == {'id': 'spike_v1', 'minimum_ratio': 1.5, 'usual': 'median_of_other_buckets', 'visible_share': 0.1,
                    'most': 3, 'minimum_buckets': 3, 'floors': {'posts': 5, 'interactions': 100}}
    assert FLOORS == {'posts': 5, 'interactions': 100}


def test_a_series_with_keys_gets_its_spikes_back_by_key():
    series = [(f'2026-11-{8 + index:02d}', value) for index, value in enumerate([80, 180, 1700, 1400, 1328, 1050, 1030])]
    assert keyed_spikes(series, FLOORS['posts']) == [{'key': '2026-11-10', 'value': 1700, 'usual': 1040, 'times': 1700 / 1040}]


def test_days_without_posts_count_as_zero_between_the_first_and_the_last_day():
    counted = {'2026-11-09': 4, '2026-11-12': 9}
    assert daily_series(counted) == [('2026-11-09', 4), ('2026-11-10', 0), ('2026-11-11', 0), ('2026-11-12', 9)]
    # A chosen period wider than the posts is covered in full, as on the chart; one inside them does not cut them off.
    assert [day for day, _ in daily_series(counted, first='2026-11-08', last='2026-11-13')] == [
        '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
    assert daily_series(counted, first='2026-11-10', last='2026-11-11') == daily_series(counted)
    assert daily_series({}) == []
    # A stray date cannot draw an endless series: the newest days are kept.
    long = daily_series({'2020-01-01': 1, '2026-11-12': 2})
    assert len(long) == MAX_BUCKETS and long[-1] == ('2026-11-12', 2)


# ── The answer over HTTP ────────────────────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_the_route_answers_with_the_rule_and_the_spikes_of_each_series_it_was_given(client, admin_token):
    body = {'series': {'posts': days([80, 180, 1700, 1400, 1328, 1050, 1030]),
                       'interactions': days([0, 0, 6_000_000, 2_500_000, 17_300_000, 3_000_000, 200_000])}}
    answer = await client.post(URL, json=body, headers=auth(admin_token))
    assert answer.status_code == 200
    assert answer.json() == {'rule': RULE, 'spikes': {
        'posts': [{'key': '2026-11-10', 'value': 1700, 'usual': 1040, 'times': 1700 / 1040}],
        'interactions': [{'key': '2026-11-10', 'value': 6_000_000, 'usual': 1_350_000, 'times': 6_000_000 / 1_350_000},
                         {'key': '2026-11-12', 'value': 17_300_000, 'usual': 1_350_000, 'times': 17_300_000 / 1_350_000}]}}
    # One series is enough, and only what was asked for is answered.
    one = await client.post(URL, json={'series': {'posts': days([0, 0, 40, 0, 0])}}, headers=auth(admin_token))
    assert one.status_code == 200
    assert one.json()['spikes'] == {'posts': [{'key': '2026-11-10', 'value': 40, 'usual': 0, 'times': None}]}
    calm = await client.post(URL, json={'series': {'interactions': []}}, headers=auth(admin_token))
    assert calm.json()['spikes'] == {'interactions': []}


@pytest.mark.asyncio
async def test_the_route_is_closed_without_a_sign_in_and_to_a_member_who_is_not_an_administrator(client, user_token):
    body = {'series': {'posts': days([0, 0, 40, 0, 0])}}
    assert (await client.post(URL, json=body)).status_code in (401, 403)
    assert (await client.post(URL, json=body, headers=auth(user_token))).status_code == 403


@pytest.mark.asyncio
async def test_every_signed_in_role_gets_an_answer_and_asking_leaves_no_line_in_the_audit_trail(client, db):
    """Asking which buckets are spikes changes nothing and reads no project data, so it is a read in every way but its
    verb: a viewer's chart is marked like an owner's, and drawing a chart does not fill the audit trail. The session's
    own protection for a request that is not a GET (the CSRF token) still applies."""
    from sqlalchemy import func, select
    from app.models.pulse_identity import PulseAudit
    from app.services.pulse_identity import provision_user
    client.base_url = 'https://localhost'
    body, origin = {'series': {'posts': days([0, 0, 40, 0, 0])}}, {'Origin': 'http://localhost:5173'}

    async def sign_in(email, role):
        user = await provision_user(db, email, role, 'long local password 123', role)
        signed = await client.post('/api/pulse/auth/login', headers=origin, json={'email': email, 'password': 'long local password 123'})
        client.cookies.set('pulse_session', signed.cookies.get('pulse_session'))
        return user, {**origin, 'X-Pulse-CSRF': signed.json()['csrf_token']}

    for role in ('owner', 'analyst', 'viewer'):
        user, headers = await sign_in(f'spike-{role}@example.com', role)
        assert (await client.post(URL, json=body, headers=origin)).status_code == 403, 'no CSRF token, no answer'
        answered = await client.post(URL, json=body, headers=headers)
        assert answered.status_code == 200 and answered.json()['spikes']['posts'][0]['key'] == '2026-11-10', role
        assert await db.scalar(select(func.count()).select_from(PulseAudit).where(PulseAudit.user_id == user.id, PulseAudit.action.like('%/spikes'))) == 0
    # Anything else a viewer posts is still refused: the exemption is this one address.
    assert (await client.post('/api/admin/pulse/sources/check', headers=headers)).status_code == 403


@pytest.mark.parametrize('series', [
    {},                                                           # no series at all
    {'likes': days([0, 0, 40, 0, 0])},                            # not a series the rule has a floor for
    {'posts': days([0, 0, 40, 0, 0]), 'views': []},
    {'posts': days([0] * (MAX_BUCKETS + 1))},                     # longer than the longest chart
    {'posts': [{'key': '2026-11-10', 'value': -1}]},
    {'posts': [{'key': '2026-11-10', 'value': '40'}]},            # a number written as text
    {'posts': [{'key': '2026-11-10', 'value': True}]},
    {'posts': [{'key': '2026-11-10', 'value': None}]},
    {'posts': [{'key': '2026-11-10'}]},
    {'posts': [{'key': '', 'value': 4}]},
    {'posts': [{'key': 'k' * 41, 'value': 4}]},
    {'posts': 'banyak'},
])
@pytest.mark.asyncio
async def test_the_route_refuses_what_it_cannot_count(client, admin_token, series):
    assert (await client.post(URL, json={'series': series}, headers=auth(admin_token))).status_code == 422


@pytest.mark.parametrize('value', ['NaN', 'Infinity', '-Infinity', '1e999'])
@pytest.mark.asyncio
async def test_the_route_refuses_a_value_that_is_not_a_finite_number(client, admin_token, value):
    raw = '{"series": {"posts": [{"key": "2026-11-10", "value": %s}]}}' % value
    answer = await client.post(URL, content=raw, headers={**auth(admin_token), 'Content-Type': 'application/json'})
    assert answer.status_code == 422


@pytest.mark.asyncio
async def test_the_longest_chart_is_answered(client, admin_token):
    longest = [{'key': str(index), 'value': index % 7} for index in range(MAX_BUCKETS)]
    answer = await client.post(URL, json={'series': {'posts': longest, 'interactions': longest}}, headers=auth(admin_token))
    assert answer.status_code == 200 and MAX_BUCKETS == 1100


@pytest.mark.asyncio
async def test_the_answer_comes_from_the_request_alone_nothing_is_stored_and_no_project_data_is_read(client, admin_token, engine):
    statements = []

    def record(connection, cursor, statement, *rest):
        statements.append(' '.join(statement.split()).lower())
    event.listen(engine.sync_engine, 'before_cursor_execute', record)
    try:
        answer = await client.post(URL, json={'series': {'posts': days([0, 0, 40, 0, 0])}}, headers=auth(admin_token))
    finally:
        event.remove(engine.sync_engine, 'before_cursor_execute', record)
    assert answer.status_code == 200
    # The sign-in check looks the account up. That is all: no write, and no table of posts, projects or alerts.
    assert statements and all(statement.startswith('select') and ' from users' in statement for statement in statements), statements


@pytest.mark.asyncio
async def test_the_answer_names_neither_an_engine_nor_a_supplier(client, admin_token):
    answer = await client.post(URL, json={'series': {'posts': days([80, 180, 1700, 1400, 1328, 1050, 1030])}}, headers=auth(admin_token))
    assert set(answer.json()) == {'rule', 'spikes'}
    text = answer.text.lower()
    assert not [word for word in ('model', 'method', 'ollama', 'grok', 'claude', 'xpoz', 'socialcrawl') if word in text]


# ── The AI summary's facts ──────────────────────────────────────────────────────────────────────────────────────────

async def project_with_posts_per_day(db, label, per_day):
    """A project whose posts are published at noon WIB on the given days of November 2026: `{day: how many}`."""
    from datetime import datetime
    from app.models.pulse import SourceItem, WatchTopic
    topic = WatchTopic(label=label, query=label)
    db.add(topic)
    await db.flush()
    db.add_all([SourceItem(topic_id=topic.id, source='x', platform='x', url=f'https://x.com/akun/status/{day}{index:03d}', author=f'akun{index}',
                           text='Kabar hari ini', published_at=datetime(2026, 11, day, 5), metrics={})
                for day, count in per_day.items() for index in range(count)])
    await db.flush()
    return topic


def spike_line(data):
    return next(line for line in data.split('\n') if line.startswith('HARI LONJAKAN POSTING'))


@pytest.mark.asyncio
async def test_the_summarys_facts_name_the_spike_days_by_the_rule_and_keep_the_busiest_day_as_its_own_fact(db):
    from datetime import datetime
    from app.services import pulse_summary
    topic = await project_with_posts_per_day(db, 'Ringkasan lonjakan', {8: 2, 9: 3, 10: 12, 11: 4, 12: 3})
    built = await pulse_summary.build_summary_input(db, topic.id, datetime(2026, 11, 13))
    assert built['facts']['spikes'] == {'rule': 'spike_v1', 'days': [{'date': '2026-11-10', 'posts': 12, 'usual': 3, 'times': 4}]}
    assert built['facts']['peak_day'] == {'date': '2026-11-10', 'posts': 12}     # kept: stored summaries and the card read it
    assert spike_line(built['data']).endswith(': 2026-11-10 12 posting, 4,0 kali hari biasa')

    # Every scope has a busiest day. It is a spike only when the rule says so.
    even = await project_with_posts_per_day(db, 'Ringkasan rata', {8: 6, 9: 7, 10: 8, 11: 7})
    built = await pulse_summary.build_summary_input(db, even.id, datetime(2026, 11, 13))
    assert built['facts']['peak_day'] == {'date': '2026-11-10', 'posts': 8}
    assert built['facts']['spikes'] == {'rule': 'spike_v1', 'days': []}
    assert spike_line(built['data']).endswith(': tidak ada')


@pytest.mark.asyncio
async def test_the_summary_reads_the_days_the_trend_chart_draws_quiet_days_as_zero_and_a_chosen_period_in_full(db):
    from datetime import datetime
    from app.services import pulse_summary
    topic = await project_with_posts_per_day(db, 'Ringkasan satu hari', {10: 6})
    # Without a period the posts cover one day: one bucket says nothing about what is usual.
    assert (await pulse_summary.build_summary_input(db, topic.id, datetime(2026, 11, 13)))['facts']['spikes']['days'] == []
    # The period 8 to 12 Nov (WIB) is drawn in full, so the same six posts stand among four empty days.
    built = await pulse_summary.build_summary_input(db, topic.id, datetime(2026, 11, 13), start=datetime(2026, 11, 7, 17), end=datetime(2026, 11, 12, 16, 59, 59))
    assert built['facts']['spikes']['days'] == [{'date': '2026-11-10', 'posts': 6, 'usual': 0, 'times': None}]
    assert spike_line(built['data']).endswith(': 2026-11-10 6 posting, hari lain umumnya kosong')


def test_the_model_is_told_which_days_the_word_lonjakan_is_for():
    from app.services import pulse_summary
    assert 'HARI LONJAKAN POSTING' in pulse_summary.BASE
    told = pulse_summary.BASE + ''.join(text for _, text in pulse_summary.FORMATS.values())
    # The post whose interactions grew fastest is its own thing and is no longer called a "lonjakan".
    assert 'lonjakan interaksi' not in told and 'lonjakan tercepat' not in told
