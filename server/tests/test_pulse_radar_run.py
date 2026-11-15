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

from app.services.pulse_radar import (COLLECT_SECONDS, COMPOSE_SECONDS, FALLBACK_SECONDS, INTERVAL_MINUTES, LEASE_SECONDS, PROVIDER, attach, brief_with_ranks,
                                      rank, refresh)

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


def stand_ins(monkeypatch, watch=None, *, signals=SIGNALS, missing=(), composed='default', calls=None):
    """Replace the collection and the model. `composed` is what the model step returns."""
    if composed == 'default':
        composed = {'brief': 'Ringkas [1].', 'issues': [issue('Isu A', ['S1', 'S2', 'S3']), issue('Isu B', ['S5']), issue('Isu lokal', ['S6'], scope='local')]}
    calls = calls if calls is not None else []

    async def fake_collect(settings, *, client=None, pause=0.3):
        calls.append('collect')
        assert watch is None or watch.open == 0, 'a session is open while the lists are being read'
        return {'signals': list(signals), 'missing': list(missing), 'provinces_read': ['ID-BA', 'ID-JI']}

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
    assert LEASE_SECONDS > COLLECT_SECONDS + COMPOSE_SECONDS + FALLBACK_SECONDS + 120, 'reading the lists, both waits and the write all fit inside the lock'


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
