"""One refresh of the radar, from signals to a stored run.

The collection and the model are stand-ins. What is checked: figures, provinces and evidence come from the signals and
not from the model's answer; the order can be explained; only one refresh runs at a time; a refresh that could not be
composed is kept as raw lists; and no database session is open while the slow work happens.
"""
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.pulse_monitor import WorkerPolicy
from app.models.pulse_radar import RadarIssue, RadarRun
from app.services import pulse_radar
import asyncio

from app.services.pulse_radar import (COLLECT_SECONDS, COMPOSE_SECONDS, DISCOVERY_SECONDS, FALLBACK_SECONDS, INTERVAL_MINUTES, LEASE_SECONDS, MEASURE_SECONDS,
                                      PROVIDER, SOCIAL, attach, brief_with_ranks, rank, refresh, with_social)

NOW = datetime(2026, 11, 15, 1, 10)
HOSTED = SimpleNamespace(AI_PROVIDER='grok', XAI_API_KEY='fake', YOUTUBE_API_KEY='')
LOCAL = SimpleNamespace(AI_PROVIDER='ollama', XAI_API_KEY='', YOUTUBE_API_KEY='')


def signal(number, platform, title, figure=None, provinces=None, related=(), url=None, source=None):
    return {'id': f'S{number}', 'platform': platform, 'title': title, 'url': url, 'source': source, 'figure': figure,
            'provinces': provinces or {}, 'related': list(related), 'section': None}


SIGNALS = [signal(1, 'news', 'Laga Jepang lawan Brasil', 4, url='https://news.example/a', source='Kompas',
                  related=[{'title': f'Liputan {index}', 'url': f'https://news.example/r{index}', 'source': 'Tempo'} for index in range(1, 8)]),
           signal(2, 'youtube', 'Cuplikan Jepang vs Brasil', 2104721, url='https://www.youtube.com/watch?v=vid00000001', source='Kanal Bola'),
           signal(3, 'search', 'jepang vs brasil', None, {'ID-BA': 5000, 'ID-PA': 2000}),
           signal(4, 'search', 'japan vs brazil', None, {'ID-BA': 500, 'ID-SU': 200}),
           signal(5, 'news', 'Harga beras naik', 49, url='https://news.example/b', source='Bisnis'),
           signal(6, 'search', 'polda jawa timur', None, {'ID-JI': 200})]
BY_ID = {row['id']: row for row in SIGNALS}


def issue(title, ids, scope='national', key=None):
    return {'key': key or 'k-' + title.lower().replace(' ', '-'), 'scope': scope, 'title': title, 'category': 'olahraga', 'reason': 'Ramai.',
            'signal_ids': ids, 'query': {'q': title.lower(), 'required': '', 'excluded': ''}}


def test_figures_provinces_and_evidence_come_from_the_signals():
    row = attach(issue('Jepang lawan Brasil', ['S1', 'S2', 'S3', 'S4']), BY_ID)
    assert row['platforms'] == {'news': {'count': 5}, 'youtube': {'count': 1, 'views': 2104721}, 'search': {'searches': 5000}}
    assert [(region['code'], region['searches']) for region in row['regions']] == [('ID-BA', 5000), ('ID-PA', 2000), ('ID-SU', 200)], \
        'one story searched under two spellings: the provinces of both, each with its largest figure'
    by_platform = {}
    for item in row['evidence']:
        by_platform.setdefault(item['platform'], []).append(item)
    assert len(by_platform['news']) == 5 and by_platform['news'][0] == {'platform': 'news', 'title': 'Laga Jepang lawan Brasil', 'url': 'https://news.example/a', 'source': 'Kompas', 'figure': 4}
    assert by_platform['youtube'][0]['figure'] == 2104721 and [item['title'] for item in by_platform['search']] == ['jepang vs brasil', 'japan vs brazil']
    assert attach(issue('Tanpa sinyal', ['S99']), BY_ID)['platforms'] == {}


def test_an_issue_on_more_platforms_ranks_above_a_louder_one_on_a_single_platform():
    rows = rank([attach(issue('Harga beras', ['S5']), BY_ID), attach(issue('Jepang lawan Brasil', ['S1', 'S2', 'S3']), BY_ID)])
    assert [(row['title'], row['rank']) for row in rows] == [('Jepang lawan Brasil', 1), ('Harga beras', 2)]
    assert rows[0]['score'] > rows[1]['score'] > 0


def test_local_issues_never_enter_the_national_order():
    rows = rank([attach(issue('Polda Jawa Timur', ['S6'], scope='local'), BY_ID), attach(issue('Harga beras', ['S5']), BY_ID)])
    assert [(row['title'], row['scope'], row['rank']) for row in rows] == [('Harga beras', 'national', 1), ('Polda Jawa Timur', 'local', 2)]


@pytest.fixture(autouse=True)
def no_tick_remembered(monkeypatch):
    monkeypatch.setattr(pulse_radar, '_ticked', {'at': None}, raising=False)


@pytest.fixture
async def store(tmp_path):
    engine = create_async_engine(f'sqlite+aiosqlite:///{tmp_path}/radar.db')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


class Watch:
    """A session factory that counts the sessions open at this moment."""
    def __init__(self, factory):
        self.factory, self.open = factory, 0

    def __call__(self):
        watch, session = self, self.factory()

        class Guard:
            async def __aenter__(self):
                watch.open += 1
                return await session.__aenter__()

            async def __aexit__(self, *error):
                watch.open -= 1
                return await session.__aexit__(*error)
        return Guard()


def stand_ins(monkeypatch, watch=None, *, signals=SIGNALS, missing=(), composed='default', calls=None, why=None):
    """Replace the collection and the model. `composed` is what the model step returns."""
    if composed == 'default':
        composed = {'brief': 'Ringkas [1].', 'issues': [issue('Isu A', ['S1', 'S2', 'S3']), issue('Isu B', ['S5']), issue('Isu lokal', ['S6'], scope='local')]}
    calls = calls if calls is not None else []

    async def fake_collect(settings, *, client=None, pause=0.3):
        calls.append('collect')
        assert watch is None or watch.open == 0, 'a session is open while the lists are being read'
        return {'signals': list(signals), 'missing': list(missing), 'provinces_read': ['ID-BA', 'ID-JI'], **({'why': dict(why)} if why is not None else {})}

    async def fake_compose(ai, rows, previous, **kw):
        calls.append(('compose', ai, [row['key'] for row in previous]))
        assert watch is None or watch.open == 0, 'a session is open while the model is asked'
        return composed if ai is not None else None
    monkeypatch.setattr(pulse_radar, 'collect', fake_collect)
    monkeypatch.setattr(pulse_radar, 'compose', fake_compose)
    return calls


async def rows_of(store, model, *order):
    async with store() as db:
        return (await db.execute(select(model).order_by(*order))).scalars().all()


@pytest.mark.asyncio
async def test_a_refresh_stores_one_run_with_its_issues_and_holds_no_session_while_it_fetches(store, monkeypatch):
    watch = Watch(store)
    calls = stand_ins(monkeypatch, watch)
    result = await refresh(watch, HOSTED, ai=object(), now=NOW, force=True)
    assert result['state'] == 'ok' and calls[0] == 'collect' and calls[1][0] == 'compose'
    runs = await rows_of(store, RadarRun, RadarRun.started_at)
    assert len(runs) == 1 and runs[0].id == result['run_id'] and runs[0].state == 'ok' and runs[0].brief == 'Ringkas [1].'
    assert runs[0].provinces_read == ['ID-BA', 'ID-JI'] and runs[0].started_at == NOW and runs[0].finished_at is not None
    issues = await rows_of(store, RadarIssue, RadarIssue.rank)
    assert [(row.title, row.scope, row.rank) for row in issues] == [('Isu A', 'national', 1), ('Isu B', 'national', 2), ('Isu lokal', 'local', 3)]
    assert issues[0].platforms['search'] == {'searches': 5000} and issues[0].first_seen_at == NOW and issues[0].query['q'] == 'isu a'
    policy = (await rows_of(store, WorkerPolicy, WorkerPolicy.provider))[0]
    assert policy.provider == PROVIDER and policy.lease_token is None and policy.daily_limit == 0, 'the lock is released and the switch stays as it was'


@pytest.mark.asyncio
async def test_missing_sources_make_the_run_partial_and_an_unreadable_answer_makes_it_raw(store, monkeypatch):
    stand_ins(monkeypatch, missing=['ID-PA'])
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True))['state'] == 'partial'
    stand_ins(monkeypatch, composed=None)
    assert (await refresh(store, HOSTED, ai=object(), now=NOW + timedelta(minutes=30), force=True))['state'] == 'raw'
    partial, raw = await rows_of(store, RadarRun, RadarRun.started_at)
    assert partial.state == 'partial' and partial.missing == ['ID-PA']
    assert raw.state == 'raw' and [row['title'] for row in raw.raw['search']] == ['jepang vs brasil', 'japan vs brazil', 'polda jawa timur']
    assert raw.raw['news'][0] == {'title': 'Laga Jepang lawan Brasil', 'url': 'https://news.example/a', 'source': 'Kompas', 'figure': 4}
    async with store() as db:
        assert await db.scalar(select(func.count()).select_from(RadarIssue).where(RadarIssue.run_id == raw.id)) == 0


@pytest.mark.asyncio
async def test_a_refresh_that_reads_nothing_at_all_is_failed_and_asks_no_model(store, monkeypatch):
    calls = stand_ins(monkeypatch, signals=[], missing=['news', 'search', 'youtube'])
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True))['state'] == 'failed'
    assert calls == ['collect']

    async def broken(settings, **kw):
        raise RuntimeError('the network is gone')
    monkeypatch.setattr(pulse_radar, 'collect', broken)
    assert (await refresh(store, HOSTED, ai=object(), now=NOW + timedelta(hours=1), force=True))['state'] == 'failed'
    policy = (await rows_of(store, WorkerPolicy, WorkerPolicy.provider))[0]
    assert policy.lease_token is None, 'a refresh that broke does not keep the lock'


@pytest.mark.asyncio
async def test_without_the_hosted_engine_the_run_is_raw_and_the_model_is_not_called(store, monkeypatch):
    calls = stand_ins(monkeypatch)
    asked = []
    monkeypatch.setattr(pulse_radar, 'get_ai_service', lambda settings=None: asked.append(settings) or object())
    assert (await refresh(store, LOCAL, now=NOW, force=True))['state'] == 'raw'
    assert not asked and [call for call in calls if call != 'collect'] == []
    assert (await refresh(store, HOSTED, now=NOW + timedelta(hours=1), force=True))['state'] == 'ok' and len(asked) == 1


@pytest.mark.asyncio
async def test_when_the_answer_engine_gives_nothing_the_faster_engine_is_asked_once(store, monkeypatch):
    answer, faster, asked, replies = object(), object(), [], {}
    good = {'brief': None, 'issues': [issue('Isu A', ['S1'])]}

    async def fake_compose(ai, rows, previous, **options):
        asked.append((ai, options.get('timeout')))
        return replies.get(ai)
    stand_ins(monkeypatch)
    monkeypatch.setattr(pulse_radar, 'compose', fake_compose)
    monkeypatch.setattr(pulse_radar, 'get_ai_service', lambda settings=None: answer)
    monkeypatch.setattr(pulse_radar, 'get_bulk_ai_service', lambda settings=None: faster)
    replies[faster] = good
    assert (await refresh(store, HOSTED, now=NOW, force=True))['state'] == 'ok'
    assert asked == [(answer, COMPOSE_SECONDS), (faster, FALLBACK_SECONDS)], 'the slower engine first, with the longer wait'
    asked.clear()
    replies[answer] = good
    assert (await refresh(store, HOSTED, now=NOW + timedelta(hours=1), force=True))['state'] == 'ok'
    assert [engine for engine, _ in asked] == [answer], 'an answer that came is not asked for twice'
    asked.clear()
    replies.clear()
    replies[answer] = {'brief': None, 'issues': []}       # an answer without a single issue is no list either
    assert (await refresh(store, HOSTED, now=NOW + timedelta(hours=2), force=True))['state'] == 'raw'
    assert [engine for engine, _ in asked] == [answer, faster]
    asked.clear()
    assert (await refresh(store, LOCAL, now=NOW + timedelta(hours=3), force=True))['state'] == 'raw' and asked == [], 'without the hosted engine nobody is asked'
    assert (await refresh(store, HOSTED, ai=faster, now=NOW + timedelta(hours=4), force=True))['state'] == 'raw'
    assert [engine for engine, _ in asked] == [faster], 'an engine handed in is the only one asked'


def test_the_lock_outlasts_the_longest_refresh():
    assert COMPOSE_SECONDS == 300, 'the answer engine needed 115 s on a real round; 120 s lost the refresh'
    writing = pulse_radar.WRITE_TRIES * 30 + sum(pulse_radar.WRITE_PAUSE)      # each try may wait the database's 30 s for another writer
    assert LEASE_SECONDS > COLLECT_SECONDS + DISCOVERY_SECONDS + COMPOSE_SECONDS + FALLBACK_SECONDS + MEASURE_SECONDS + writing + 60, \
        'reading the lists, the search of X, both waits, the measurement and the write all fit inside the lock'


@pytest.mark.asyncio
async def test_a_reading_that_never_ends_is_given_up_and_the_lock_released(store, monkeypatch):
    stand_ins(monkeypatch)

    async def stuck(settings, **kw):
        await asyncio.sleep(30)
    monkeypatch.setattr(pulse_radar, 'collect', stuck)
    monkeypatch.setattr(pulse_radar, 'COLLECT_SECONDS', 0.05)
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True))['state'] == 'failed'
    assert (await rows_of(store, WorkerPolicy, WorkerPolicy.provider))[0].lease_token is None


def test_the_brief_cites_the_final_rows():
    ranked = [{'key': 'k-b', 'rank': 1, 'scope': 'national'}, {'key': 'k-a', 'rank': 2, 'scope': 'national'}, {'key': 'k-l', 'rank': 3, 'scope': 'local'},
              {'key': 'k-z', 'rank': 11, 'scope': 'national'}]
    assert brief_with_ranks('A [#k-a] lalu B [#k-b]; lokal [#k-l], jauh [#k-z], hilang [#k-x].', ranked) == 'A [2] lalu B [1]; lokal, jauh, hilang.'
    assert brief_with_ranks(None, ranked) is None and brief_with_ranks('Tanpa rujukan.', ranked) == 'Tanpa rujukan.'


@pytest.mark.asyncio
async def test_the_stored_brief_carries_the_rows_final_numbers(store, monkeypatch):
    stand_ins(monkeypatch, composed={'brief': 'Menonjol: beras [#k-beras] dan bola [#k-bola].', 'issues': [issue('Harga beras', ['S5'], key='k-beras'), issue('Jepang lawan Brasil', ['S1', 'S2', 'S3'], key='k-bola')]})
    await refresh(store, HOSTED, ai=object(), now=NOW, force=True)
    assert (await rows_of(store, RadarRun, RadarRun.started_at))[0].brief == 'Menonjol: beras [2] dan bola [1].'


@pytest.mark.asyncio
async def test_a_second_refresh_during_the_first_is_told_busy_and_writes_nothing(store, monkeypatch):
    inner = []

    async def collect_and_try_again(settings, *, client=None, pause=0.3):
        inner.append(await refresh(store, HOSTED, ai=object(), now=NOW + timedelta(seconds=5), force=True))
        return {'signals': list(SIGNALS), 'missing': [], 'provinces_read': []}
    stand_ins(monkeypatch)
    monkeypatch.setattr(pulse_radar, 'collect', collect_and_try_again)
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True))['state'] == 'ok'
    assert inner == [{'state': 'busy', 'run_id': None}] and len(await rows_of(store, RadarRun, RadarRun.started_at)) == 1
    # A lock left by a process that died is taken over once it has run out.
    async with store() as db:
        policy = await db.get(WorkerPolicy, PROVIDER)
        policy.lease_token, policy.lease_until = 'dead', NOW + timedelta(minutes=10)
        await db.commit()
    assert (await refresh(store, HOSTED, ai=object(), now=NOW + timedelta(minutes=5), force=True))['state'] == 'busy'
    assert (await refresh(store, HOSTED, ai=object(), now=NOW + timedelta(minutes=11), force=True))['state'] == 'ok'


@pytest.mark.asyncio
async def test_the_switch_decides_whether_a_scheduled_refresh_runs(store, monkeypatch):
    calls = stand_ins(monkeypatch)
    assert await refresh(store, HOSTED, ai=object(), now=NOW) == {'state': 'off', 'run_id': None} and calls == []
    monkeypatch.setattr(pulse_radar, 'async_session', store, raising=False)
    monkeypatch.setattr(pulse_radar, 'get_settings', lambda: HOSTED, raising=False)
    monkeypatch.setattr(pulse_radar, 'get_ai_service', lambda settings=None: object())
    await pulse_radar.radar_tick(now=NOW)
    assert calls == [], 'off by default: the tick reads nothing'
    async with store() as db:
        (await db.get(WorkerPolicy, PROVIDER)).daily_limit = -1
        await db.commit()
    await pulse_radar.radar_tick(now=NOW)
    assert calls.count('collect') == 1
    await pulse_radar.radar_tick(now=NOW + timedelta(minutes=INTERVAL_MINUTES - 1))
    assert calls.count('collect') == 1, 'not yet due'
    await pulse_radar.radar_tick(now=NOW + timedelta(minutes=INTERVAL_MINUTES))
    assert calls.count('collect') == 2


@pytest.mark.asyncio
async def test_first_seen_is_carried_by_key_and_runs_older_than_thirty_days_are_removed(store, monkeypatch):
    stand_ins(monkeypatch, composed={'brief': None, 'issues': [issue('Isu A', ['S1'], key='k-a')]})
    old = await refresh(store, HOSTED, ai=object(), now=NOW - timedelta(days=31), force=True)
    first = await refresh(store, HOSTED, ai=object(), now=NOW - timedelta(hours=2), force=True)
    calls = stand_ins(monkeypatch, composed={'brief': None, 'issues': [issue('Isu A lagi', ['S1'], key='k-a'), issue('Isu baru', ['S5'], key='k-b')]})
    last = await refresh(store, HOSTED, ai=object(), now=NOW, force=True)
    assert calls[1][2] == ['k-a'], 'the model is shown the issues of the last composed run'
    runs = {run.id for run in await rows_of(store, RadarRun, RadarRun.started_at)}
    assert runs == {first['run_id'], last['run_id']} and old['run_id'] not in runs
    issues = {(row.run_id, row.key): row for row in await rows_of(store, RadarIssue, RadarIssue.rank)}
    assert not [key for key in issues if key[0] == old['run_id']]
    assert issues[(last['run_id'], 'k-a')].first_seen_at == NOW - timedelta(days=31), 'the story was first seen when its key first appeared'
    assert issues[(last['run_id'], 'k-b')].first_seen_at == NOW


# ── Stage 2: issues found on X and the social figures, behind their own paid switch ─────────────────────────────────

PAID = SimpleNamespace(AI_PROVIDER='grok', XAI_API_KEY='fake', YOUTUBE_API_KEY='', XPOZ_API_KEY='fake')
X_FOUND = [{'platform': 'x', 'title': 'Tagar soal BBM', 'url': 'https://x.com/akun_a/status/11111', 'source': None, 'figure': None, 'provinces': {}, 'section': None,
            'related': [{'title': 'Posting di X', 'url': 'https://x.com/akun_b/status/22222', 'source': None}]}]
POST = {'platform': 'x', 'title': 'Skor akhir imbang', 'url': 'https://x.com/i/status/33333', 'source': 'bola_id', 'figure': 80}
CLIP = {'platform': 'tiktok', 'title': 'Cuplikan gol', 'url': 'https://www.tiktok.com/@bola/video/44444', 'source': 'bola', 'figure': 900}


def composed_from(rows):
    """Two issues from the lists, and one more from whatever X found."""
    on_x = [row['id'] for row in rows if row['platform'] == 'x']
    return {'brief': 'Menonjol [#k-beras].', 'issues': [issue('Laga bola', ['S1'], key='k-bola'), issue('Harga beras', ['S5'], key='k-beras')]
            + ([issue('Tagar BBM', on_x, key='k-bbm')] if on_x else [])}


def social_stand_ins(monkeypatch, *, found=X_FOUND, measured=None, watch=None):
    """Replace the lists, the model, the search of X and the supplier. Returns a record of what each was asked."""
    seen = SimpleNamespace(calls=[], rows=[], asked=[], previous=[], chosen=[])
    stand_ins(monkeypatch, watch, calls=seen.calls)

    async def fake_compose(ai, rows, previous, **kw):
        seen.rows.append(rows)
        return composed_from(rows)

    async def fake_discover(engine, now):
        seen.calls.append('discover')
        assert watch is None or watch.open == 0, 'a session is open while X is searched'
        return None if found is None else [dict(row) for row in found]

    async def fake_measure(issues, previous, *, key, now, client=None, budget=None, choose=None):
        seen.calls.append('measure')
        assert watch is None or watch.open == 0, 'a session is open while the supplier is asked'
        assert key == 'fake' and budget < MEASURE_SECONDS
        seen.asked.append([row['key'] for row in issues])
        seen.previous.append(previous)
        result = {'figures': {}, 'evidence': {}, 'sampled': {}, 'missing': [], **(measured(issues) if callable(measured) else measured or {})}
        if choose is not None:
            seen.chosen.append(choose(result['figures']))
        return result
    monkeypatch.setattr(pulse_radar, 'compose', fake_compose)
    monkeypatch.setattr(pulse_radar, 'discover', fake_discover)
    monkeypatch.setattr(pulse_radar, 'measure', fake_measure)
    return seen


@pytest.mark.asyncio
async def test_with_the_paid_switch_off_a_refresh_asks_neither_x_nor_the_supplier(store, monkeypatch):
    seen = social_stand_ins(monkeypatch)
    assert (await refresh(store, PAID, ai=object(), now=NOW, force=True))['state'] == 'ok'
    assert seen.calls == ['collect']
    run = (await rows_of(store, RadarRun, RadarRun.started_at))[0]
    assert set(run.raw) == {'news', 'youtube', 'search'} and set(run.usage) == {'signals', 'issues', 'seconds'} and set(run.usage['signals']) == {'news', 'youtube', 'search'}, \
        'off, a refresh stores exactly what it stored before the switch existed'
    assert {row.provider: row.daily_limit for row in await rows_of(store, WorkerPolicy, WorkerPolicy.provider)} == {PROVIDER: 0, SOCIAL: 0}, \
        'the paid switch exists beside the radar\'s own and is off until someone turns it on'
    async with store() as db:
        (await db.get(WorkerPolicy, SOCIAL)).daily_limit = -1
        await db.commit()
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=30), force=True)
    assert seen.calls[1:] == ['collect', 'discover', 'measure']
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=60), force=True, social=False))['state'] == 'ok' and seen.calls[4:] == ['collect']


@pytest.mark.asyncio
async def test_issues_found_on_x_join_the_list_with_their_posts_as_evidence(store, monkeypatch):
    watch = Watch(store)
    seen = social_stand_ins(monkeypatch, watch=watch)
    assert (await refresh(watch, PAID, ai=object(), now=NOW, force=True, social=True))['state'] == 'ok'
    assert [(row['id'], row['platform'], row['title']) for row in seen.rows[0][-2:]] == [('S6', 'search', 'polda jawa timur'), ('S7', 'x', 'Tagar soal BBM')], \
        'what X found is numbered after the lists and shown to the model with them'
    run = (await rows_of(store, RadarRun, RadarRun.started_at))[0]
    bbm = {row.key: row for row in await rows_of(store, RadarIssue, RadarIssue.rank)}['k-bbm']
    assert bbm.scope == 'national' and bbm.platforms == {'x': {'posts': 2}}, 'not counted yet: the number of posts that found it, never a total'
    assert bbm.evidence == [{'platform': 'x', 'title': 'Posting dari @akun_a', 'url': 'https://x.com/akun_a/status/11111', 'source': None, 'figure': None},
                            {'platform': 'x', 'title': 'Posting dari @akun_b', 'url': 'https://x.com/akun_b/status/22222', 'source': None, 'figure': None}]
    assert run.usage['signals'] == {'news': 2, 'x': 1, 'youtube': 1, 'search': 3} and run.usage['discovery'] == {'at': NOW.isoformat(), 'signals': X_FOUND}
    assert run.raw['x'] == [{'title': 'Tagar soal BBM', 'url': 'https://x.com/akun_a/status/11111', 'source': None, 'figure': None}] and run.missing == []


@pytest.mark.asyncio
async def test_x_is_searched_once_a_day_and_a_search_that_gave_nothing_is_covered_by_the_last_one(store, monkeypatch):
    seen = social_stand_ins(monkeypatch)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=5), force=True, social=True)
    assert seen.calls.count('discover') == 1 and seen.rows[1][-1]['platform'] == 'x', 'the refreshes between two searches carry the issues of the last one'
    seen = social_stand_ins(monkeypatch, found=None)
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=24), force=True, social=True))['state'] == 'ok'
    assert seen.calls.count('discover') == 1 and seen.rows[0][-1]['platform'] == 'x', 'a day on X is searched again; busy, it is covered by the last search'
    runs = await rows_of(store, RadarRun, RadarRun.started_at)
    assert [run.usage['discovery']['at'] for run in runs] == [NOW.isoformat()] * 3, 'a carried search keeps its own time, so it runs out'
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=27), force=True, social=True))['state'] == 'partial'
    last = (await rows_of(store, RadarRun, RadarRun.started_at))[-1]
    assert last.missing == ['x'] and 'discovery' not in last.usage and 'x' not in last.raw and all(row['platform'] != 'x' for row in seen.rows[1]), \
        'after twenty-six hours the list is composed without X, and says so'


@pytest.mark.asyncio
async def test_the_refresh_button_searches_x_again_inside_the_day(store, monkeypatch):
    seen = social_stand_ins(monkeypatch)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=2), force=True, social=True)
    assert seen.calls.count('discover') == 1
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=3), force=True, social=True, fresh_x=True)
    assert seen.calls.count('discover') == 2, 'a person pressing the button gets a new search'


@pytest.mark.asyncio
async def test_a_search_of_x_that_never_ends_is_given_up_and_the_list_is_composed_without_it(store, monkeypatch):
    social_stand_ins(monkeypatch)

    async def stuck(engine, now):
        await asyncio.sleep(30)
    monkeypatch.setattr(pulse_radar, 'discover', stuck)
    monkeypatch.setattr(pulse_radar, 'DISCOVERY_SECONDS', 0.05)
    assert (await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True))['state'] == 'partial'
    assert [row.key for row in await rows_of(store, RadarIssue, RadarIssue.rank)] == ['k-beras', 'k-bola']


@pytest.mark.asyncio
async def test_a_search_engine_that_cannot_be_built_means_no_search_not_a_failed_refresh(monkeypatch):
    def broken(settings=None):
        raise AttributeError('incomplete settings')
    monkeypatch.setattr(pulse_radar, 'get_ai_service', broken)
    assert await pulse_radar.x_issues(HOSTED, NOW, None) == (None, None)
    last = {'at': (NOW - timedelta(hours=25)).isoformat(), 'signals': X_FOUND}
    assert await pulse_radar.x_issues(HOSTED, NOW, last) == (X_FOUND, last['at']), 'and the last search still serves'
    assert await pulse_radar.x_issues(LOCAL, NOW, {'at': 'bukan waktu', 'signals': X_FOUND}) == (None, None), 'a stored search that cannot be dated is not used'


def test_a_sample_never_orders_the_list():
    sampled = with_social(attach(issue('Laga bola', ['S1']), BY_ID), {'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 20, 'capped': True}})
    assert sampled['platforms'] == {'news': {'count': 5}, 'tiktok': {'found': 20, 'capped': True}, 'instagram': {'found': 20, 'capped': True}}
    assert [row['title'] for row in rank([sampled, attach(issue('Harga beras', ['S5']), BY_ID)])] == ['Harga beras', 'Laga bola'], \
        'found on TikTok and Instagram is shown, but twenty sampled posts are not a measure of anything'


@pytest.mark.asyncio
async def test_the_count_on_x_decides_the_order_and_the_samples_follow_it(store, monkeypatch):
    def measured(issues):
        return {'figures': {'k-bola': {'x': {'count': 9000}, 'tiktok': {'found': 20, 'capped': True}}, 'k-bbm': {'x': {'count': 300}}},
                'evidence': {'k-bola': [POST, CLIP], 'k-bbm': [{**POST, 'title': 'BBM naik lagi'}]},
                'sampled': {'k-bola': {'x': NOW.isoformat(), 'tiktok': NOW.isoformat()}, 'k-bbm': {'x': NOW.isoformat()}}}
    seen = social_stand_ins(monkeypatch, measured=measured)
    assert (await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True))['state'] == 'ok'
    assert seen.asked == [['k-beras', 'k-bola', 'k-bbm']], 'asked in the order the lists alone gave'
    assert seen.chosen == [['k-bola', 'k-beras', 'k-bbm']], 'the samples are bought for the ten highest once X has been counted'
    rows = await rows_of(store, RadarIssue, RadarIssue.rank)
    assert [(row.key, row.rank) for row in rows] == [('k-bola', 1), ('k-beras', 2), ('k-bbm', 3)]
    assert rows[0].platforms == {'news': {'count': 5}, 'x': {'count': 9000}, 'tiktok': {'found': 20, 'capped': True}} and rows[2].platforms == {'x': {'count': 300}}
    assert [item['platform'] for item in rows[0].evidence] == ['news'] * 5 + ['x', 'tiktok'] and rows[0].evidence[-2:] == [POST, CLIP]
    assert rows[2].evidence == [{**POST, 'title': 'BBM naik lagi'}], 'sampled posts take the place of the bare links that found the issue'
    run = (await rows_of(store, RadarRun, RadarRun.started_at))[0]
    assert run.brief == 'Menonjol [2].' and run.usage['sampled'] == measured([])['sampled']


@pytest.mark.asyncio
async def test_issues_found_on_x_are_counted_even_below_the_ten_highest(store, monkeypatch):
    many = [signal(number, 'news', f'Berita {number}', 60 - number) for number in range(1, 13)]

    async def fake_compose(ai, rows, previous, **kw):
        return {'brief': None, 'issues': [issue(f'Isu {number:02d}', [f'S{number}'], key=f'k{number}') for number in range(1, 13)] + [issue('Tagar BBM', ['S13'], key='k-bbm')]}
    seen = social_stand_ins(monkeypatch, measured=lambda issues: {'figures': {'k-bbm': {'x': {'count': 50000}}, 'k1': {'x': {'count': 10}}}})
    stand_ins(monkeypatch, signals=many, calls=seen.calls)
    monkeypatch.setattr(pulse_radar, 'compose', fake_compose)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    assert seen.asked == [[f'k{number}' for number in range(1, 11)] + ['k-bbm']], 'the ten highest, and whatever X found below them'
    assert 'k-bbm' in seen.chosen[0] and len(seen.chosen[0]) == 10, 'among issues that each stand on one platform, the loudest on X is in the ten'


def test_an_issue_only_on_x_is_ranked_like_an_issue_only_in_the_news():
    # X is one platform among four. An issue on X alone does not pass issues that stand on more platforms, however many
    # posts it has; it leads the list of X ("Teratas di X") instead. A review on stored runs showed such an issue at row 11 to 13.
    wide = with_social(attach(issue('Laga bola', ['S1', 'S3']), BY_ID), {'x': {'count': 5}})
    only_x = {**attach(issue('Tagar BBM', []), BY_ID), 'platforms': {'x': {'count': 90000}}}
    only_news = attach(issue('Harga beras', ['S5']), BY_ID)
    rows = {row['title']: row for row in rank([only_x, only_news, wide])}
    assert rows['Laga bola']['rank'] == 1 and rows['Tagar BBM']['score'] == rows['Harga beras']['score'] == 1.0


def test_a_post_link_without_an_account_is_not_given_one():
    found = {'id': 'S7', 'platform': 'x', 'title': 'Tagar BBM', 'url': 'https://x.com/i/status/33333', 'source': None, 'figure': None, 'provinces': {}, 'section': None,
             'related': [{'title': 'Posting di X', 'url': 'https://x.com/akun_b/status/22222', 'source': None}]}
    row = attach(issue('Tagar BBM', ['S7']), {'S7': found})
    assert [item['title'] for item in row['evidence']] == ['Posting di X', 'Posting dari @akun_b'], '"i" is the address of a post whose account is not named, not an account'


@pytest.mark.asyncio
async def test_what_the_supplier_could_not_be_asked_makes_the_run_partial_and_never_fails_it(store, monkeypatch):
    social_stand_ins(monkeypatch, measured={'missing': ['tiktok']})
    assert (await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True))['state'] == 'partial'

    async def broken(issues, previous, **kw):
        raise RuntimeError('the supplier is gone')
    monkeypatch.setattr(pulse_radar, 'measure', broken)
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=30), force=True, social=True))['state'] == 'partial'
    first, second = await rows_of(store, RadarRun, RadarRun.started_at)
    assert first.missing == ['tiktok'] and second.missing == ['x', 'tiktok', 'instagram']
    async with store() as db:
        assert await db.scalar(select(func.count()).select_from(RadarIssue).where(RadarIssue.run_id == second.id)) == 3, 'the list is still stored'


@pytest.mark.asyncio
async def test_the_supplier_is_not_asked_without_a_key_or_while_its_own_lane_is_blocked(store, monkeypatch):
    seen = social_stand_ins(monkeypatch)
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True, social=True))['state'] == 'partial'
    async with store() as db:
        db.add(WorkerPolicy(provider='xpoz', daily_limit=-1, blocked_reason='rate_limited'))
        await db.commit()
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=30), force=True, social=True))['state'] == 'partial'
    assert 'measure' not in seen.calls
    assert [run.missing for run in await rows_of(store, RadarRun, RadarRun.started_at)] == [['x', 'tiktok', 'instagram']] * 2
    async with store() as db:
        (await db.get(WorkerPolicy, 'xpoz')).blocked_reason = None
        await db.commit()
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=60), force=True, social=True))['state'] == 'ok' and seen.calls.count('measure') == 1


@pytest.mark.asyncio
async def test_earlier_samples_are_handed_back_so_they_are_not_bought_twice(store, monkeypatch):
    at = NOW.isoformat()
    social_stand_ins(monkeypatch, found=None, measured={
        'figures': {'k-bola': {'x': {'count': 9000}, 'tiktok': {'found': 20, 'capped': True}}}, 'evidence': {'k-bola': [POST, CLIP]},
        'sampled': {'k-bola': {'x': at, 'tiktok': at, 'instagram': at}}})
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    later, photo = (NOW + timedelta(minutes=30)).isoformat(), {'platform': 'instagram', 'title': 'Antre beras', 'url': 'https://www.instagram.com/p/ABC/', 'source': 'warga', 'figure': 12}
    seen = social_stand_ins(monkeypatch, found=None, measured={      # the next refresh samples another issue, and TikTok again for the first
        'figures': {'k-beras': {'instagram': {'found': 3, 'capped': False}}, 'k-bola': {'tiktok': {'found': 4, 'capped': False}}},
        'evidence': {'k-beras': [photo], 'k-bola': [{**CLIP, 'title': 'Cuplikan baru'}]}, 'sampled': {'k-beras': {'instagram': later}, 'k-bola': {'tiktok': later}}})
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=30), force=True, social=True)
    kept = {'k-bola': {'x': {'at': at, 'figure': {'count': 9000}, 'evidence': [POST]}, 'tiktok': {'at': at, 'figure': {'found': 20, 'capped': True}, 'evidence': [CLIP]},
                       'instagram': {'at': at, 'figure': None, 'evidence': []}}}
    assert seen.previous == [kept]
    seen = social_stand_ins(monkeypatch, found=None)
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=60), force=True, social=True)
    assert seen.previous == [{'k-beras': {'instagram': {'at': later, 'figure': {'found': 3, 'capped': False}, 'evidence': [photo]}},
                              'k-bola': {**kept['k-bola'], 'tiktok': {'at': later, 'figure': {'found': 4, 'capped': False}, 'evidence': [{**CLIP, 'title': 'Cuplikan baru'}]}}}], \
        'each platform\'s newest sample, from whichever refresh took it: X of an hour ago is not bought again because TikTok was sampled since'
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=4), force=True, social=True)
    assert seen.previous[1] == {}, 'samples over three hours old are not offered'


@pytest.mark.asyncio
async def test_an_issue_keeps_its_keywords_while_it_lives_so_its_count_means_the_same_thing(store, monkeypatch):
    # Seen on the first real rounds: the model reworded an issue's keywords half an hour later and its count on X went from 1,059 to 110.
    social_stand_ins(monkeypatch, found=None)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    asked = []

    async def reworded(ai, rows, previous, **kw):
        return {'brief': None, 'issues': [{**issue('Laga bola', ['S1'], key='k-bola'), 'query': {'q': 'kata lain', 'required': 'baru', 'excluded': ''}}, issue('Isu baru', ['S5'], key='k-baru')]}

    async def fake_measure(issues, previous, **kw):
        asked.extend((row['key'], row['query']['q']) for row in issues)
        return {'figures': {}, 'evidence': {}, 'sampled': {}, 'missing': []}
    monkeypatch.setattr(pulse_radar, 'compose', reworded)
    monkeypatch.setattr(pulse_radar, 'measure', fake_measure)
    second = await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=30), force=True, social=True)
    assert dict(asked) == {'k-bola': 'laga bola', 'k-baru': 'isu baru'}, 'counted with the keywords it was first counted with'
    stored = {(row.run_id, row.key): row.query for row in await rows_of(store, RadarIssue, RadarIssue.rank)}
    assert stored[(second['run_id'], 'k-bola')] == {'q': 'laga bola', 'required': '', 'excluded': ''}, 'and that is the proposal the page shows'
    third = await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=60), force=True, social=False)
    stored = {(row.run_id, row.key): row.query for row in await rows_of(store, RadarIssue, RadarIssue.rank)}
    assert stored[(third['run_id'], 'k-bola')]['q'] == 'kata lain', 'with the paid switch off nothing is counted, and the proposal is the newest one as before'


# ── After the review of 15 Nov: searches that cost money must leave a trace, and a fault must not start a refresh again ──

@pytest.mark.asyncio
async def test_the_button_with_a_busy_search_keeps_the_issues_of_the_last_search(store, monkeypatch):
    social_stand_ins(monkeypatch)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    seen = social_stand_ins(monkeypatch, found=None)
    assert (await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=2), force=True, social=True, fresh_x=True))['state'] == 'ok'
    assert seen.calls.count('discover') == 1 and seen.rows[0][-1]['platform'] == 'x', 'the new search was tried, and what the last one found is still on the list'
    last = (await rows_of(store, RadarRun, RadarRun.started_at))[-1]
    assert last.missing == [] and last.usage['discovery']['at'] == NOW.isoformat()


@pytest.mark.asyncio
async def test_a_search_that_gave_nothing_is_remembered_and_not_repeated_at_every_refresh(store, monkeypatch):
    seen = social_stand_ins(monkeypatch, found=None)
    for minutes in (0, 30, 60, 90):
        await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=minutes), force=True, social=True)
    assert seen.calls.count('discover') == 1, 'a search can be billed although its answer could not be used: the next try waits'
    runs = await rows_of(store, RadarRun, RadarRun.started_at)
    assert runs[0].usage['x_tried'] == NOW.isoformat() and all('x_tried' not in run.usage for run in runs[1:]) and all(run.missing == ['x'] for run in runs)
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=pulse_radar.RETRY_MINUTES), force=True, social=True)
    assert seen.calls.count('discover') == 2
    await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=pulse_radar.RETRY_MINUTES + 30), force=True, social=True, fresh_x=True)
    assert seen.calls.count('discover') == 3, 'a person pressing the button does not wait'


@pytest.mark.asyncio
async def test_a_search_that_worked_is_remembered_too_and_a_day_later_a_failed_one_waits_like_any_other(store, monkeypatch):
    seen = social_stand_ins(monkeypatch)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    assert (await rows_of(store, RadarRun, RadarRun.started_at))[0].usage['x_tried'] == NOW.isoformat()
    seen = social_stand_ins(monkeypatch, found=None)
    for hours in (24, 24.5, 25):
        await refresh(store, PAID, ai=object(), now=NOW + timedelta(hours=hours), force=True, social=True)
    assert seen.calls.count('discover') == 1 and all(rows[-1]['platform'] == 'x' for rows in seen.rows), 'tried once, and covered by yesterday\'s search meanwhile'


@pytest.mark.asyncio
async def test_a_fault_after_the_paid_steps_still_stores_the_list(store, monkeypatch):
    social_stand_ins(monkeypatch, measured={'evidence': ['bukan peta'], 'figures': {'k-bola': {'x': {'count': 9}}}})
    assert (await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True))['state'] == 'partial'
    run = (await rows_of(store, RadarRun, RadarRun.started_at))[0]
    assert run.missing == ['x', 'tiktok', 'instagram'] and len(await rows_of(store, RadarIssue, RadarIssue.rank)) == 3, \
        'what was paid for must not be bought again a minute later because nothing was stored'


@pytest.mark.asyncio
async def test_a_refresh_that_left_no_run_is_not_started_again_a_minute_later(store, monkeypatch):
    started = []

    async def broken(session_factory, settings=None, **options):
        started.append(options.get('now'))
        raise RuntimeError('the run could not be stored')
    monkeypatch.setattr(pulse_radar, 'async_session', store, raising=False)
    monkeypatch.setattr(pulse_radar, 'get_settings', lambda: PAID, raising=False)
    async with store() as db:
        await pulse_radar.ensure_policy(db)
        (await db.get(WorkerPolicy, PROVIDER)).daily_limit = -1
        await db.commit()
    monkeypatch.setattr(pulse_radar, 'refresh', broken)
    for minutes in (0, 1, 2, INTERVAL_MINUTES - 1):
        await pulse_radar.radar_tick(now=NOW + timedelta(minutes=minutes))
    assert started == [NOW], 'with no run stored the schedule would otherwise pay for the search and the samples every minute'
    await pulse_radar.radar_tick(now=NOW + timedelta(minutes=INTERVAL_MINUTES))
    assert len(started) == 2


@pytest.mark.asyncio
async def test_keywords_that_cannot_be_counted_are_not_kept(store, monkeypatch):
    social_stand_ins(monkeypatch, found=None)

    async def first(ai, rows, previous, **kw):
        return {'brief': None, 'issues': [{**issue('Laga MU', ['S1'], key='k-mu'), 'query': {'q': 'MU, AI', 'required': '', 'excluded': ''}}]}

    async def second(ai, rows, previous, **kw):
        return {'brief': None, 'issues': [{**issue('Laga MU', ['S1'], key='k-mu'), 'query': {'q': 'manchester united', 'required': '', 'excluded': ''}}]}
    monkeypatch.setattr(pulse_radar, 'compose', first)
    await refresh(store, PAID, ai=object(), now=NOW, force=True, social=True)
    monkeypatch.setattr(pulse_radar, 'compose', second)
    later = await refresh(store, PAID, ai=object(), now=NOW + timedelta(minutes=30), force=True, social=True)
    stored = {row.run_id: row.query['q'] for row in await rows_of(store, RadarIssue, RadarIssue.rank)}
    assert stored[later['run_id']] == 'manchester united', 'two-letter keywords give no phrase to count; keeping them would leave the issue uncounted for as long as it lives'


@pytest.mark.asyncio
async def test_a_tick_that_was_told_busy_tries_again_the_next_minute(store, monkeypatch):
    # A lock left by a process that was stopped mid-refresh: the tick must take it over when it runs out, not half an hour later.
    calls = stand_ins(monkeypatch)
    monkeypatch.setattr(pulse_radar, 'async_session', store, raising=False)
    monkeypatch.setattr(pulse_radar, 'get_settings', lambda: HOSTED, raising=False)
    monkeypatch.setattr(pulse_radar, 'get_ai_service', lambda settings=None: object())
    async with store() as db:
        await pulse_radar.ensure_policy(db)
        policy = await db.get(WorkerPolicy, PROVIDER)
        policy.daily_limit, policy.lease_token, policy.lease_until = -1, 'dead', NOW + timedelta(minutes=3)
        await db.commit()
    for minutes in (0, 1, 2):
        await pulse_radar.radar_tick(now=NOW + timedelta(minutes=minutes))
    assert calls == [], 'held: nothing is read'
    await pulse_radar.radar_tick(now=NOW + timedelta(minutes=3))
    assert calls.count('collect') == 1, 'the lock ran out a minute ago and the refresh starts at once'
    await pulse_radar.radar_tick(now=NOW + timedelta(minutes=4))
    assert calls.count('collect') == 1


@pytest.mark.asyncio
async def test_a_busy_database_does_not_cost_the_refresh_its_list(store, monkeypatch):
    # Seen live on 15 Nov: "database is locked" at the final write, and the whole refresh was gone. With the paid steps on,
    # that is a search and samples paid for and thrown away.
    from sqlalchemy.exc import OperationalError
    stand_ins(monkeypatch)
    real, tries = pulse_radar._store, []

    async def busy_twice(*args, **kw):
        tries.append(1)
        if len(tries) < 3:
            raise OperationalError('insert', {}, Exception('database is locked'))
        return await real(*args, **kw)
    monkeypatch.setattr(pulse_radar, '_store', busy_twice)
    monkeypatch.setattr(pulse_radar, 'WRITE_PAUSE', (0, 0, 0))
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True))['state'] == 'ok'
    assert len(tries) == 3 and len(await rows_of(store, RadarRun, RadarRun.started_at)) == 1 and len(await rows_of(store, RadarIssue, RadarIssue.rank)) == 3

    async def never(*args, **kw):
        tries.append(1)
        raise OperationalError('insert', {}, Exception('database is locked'))
    monkeypatch.setattr(pulse_radar, '_store', never)
    with pytest.raises(OperationalError):
        await refresh(store, HOSTED, ai=object(), now=NOW + timedelta(minutes=30), force=True)
    assert len(tries) == 3 + pulse_radar.WRITE_TRIES, 'it gives up after a few tries'
    assert (await rows_of(store, WorkerPolicy, WorkerPolicy.provider))[0].lease_token is None, 'and does not keep the lock'


# ── A picture for an issue, from its own sources ────────────────────────────────────────────────────────────────────

def test_an_issue_takes_its_picture_from_its_own_sources_the_video_first():
    thumb, photo, story = 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg', 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcTerm000000000', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStory00000000'
    signals = {**BY_ID,
               'S2': {**BY_ID['S2'], 'picture': {'url': thumb, 'source': 'Kanal Bola'}},
               'S3': {**BY_ID['S3'], 'picture': {'url': photo, 'source': 'Kompas.com'}},
               'S4': {**BY_ID['S4'], 'related': [{'title': 'Liputan laga', 'url': 'https://news.example/x', 'source': 'Tempo', 'picture': story}]}}
    assert attach(issue('Jepang lawan Brasil', ['S1', 'S2', 'S3']), signals)['image'] == {'url': thumb, 'source': 'Kanal Bola', 'kind': 'video'}
    assert attach(issue('Hanya pencarian', ['S1', 'S3', 'S4']), signals)['image'] == {'url': photo, 'source': 'Kompas.com', 'kind': 'photo'}
    assert attach(issue('Dari liputan di daftar pencarian', ['S4']), signals)['image'] == {'url': story, 'source': 'Tempo', 'kind': 'photo'}
    assert attach(issue('Hanya berita', ['S1', 'S5']), signals)['image'] is None, 'the news list has no pictures: the page draws the category instead'
    odd = {**signals, 'S3': {**BY_ID['S3'], 'picture': {'url': 'https://evil.example/a.png', 'source': 'x'}}}
    assert attach(issue('Tautan lain', ['S3']), odd)['image'] is None


@pytest.mark.asyncio
async def test_the_picture_is_stored_with_the_issue(store, monkeypatch):
    thumb = 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg'
    stand_ins(monkeypatch, signals=[{**row, 'picture': {'url': thumb, 'source': 'Kanal Bola'}} if row['id'] == 'S2' else row for row in SIGNALS])
    await refresh(store, HOSTED, ai=object(), now=NOW, force=True)
    stored = {row.title: row.image for row in await rows_of(store, RadarIssue, RadarIssue.rank)}
    assert stored == {'Isu A': {'url': thumb, 'source': 'Kanal Bola', 'kind': 'video'}, 'Isu B': None, 'Isu lokal': None}


@pytest.mark.asyncio
async def test_the_log_line_says_why_sources_were_not_read_and_the_run_keeps_it(store, monkeypatch, caplog):
    import logging
    caplog.set_level(logging.INFO, logger='uvicorn.error')
    stand_ins(monkeypatch, missing=['news', 'ID-PA', 'ID-MA'], why={'news': 'ProxyError', 'ID-PA': 'ProxyError', 'ID-MA': 'http_503'})
    assert (await refresh(store, HOSTED, ai=object(), now=NOW, force=True))['state'] == 'partial'
    assert 'radar: partial, 6 signals, 3 issues, 3 missing (ProxyError 2, http_503 1)' in caplog.text
    assert (await rows_of(store, RadarRun, RadarRun.started_at))[0].usage['why'] == {'news': 'ProxyError', 'ID-PA': 'ProxyError', 'ID-MA': 'http_503'}
