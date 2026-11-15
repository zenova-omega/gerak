"""Evaluation tests own a temporary SQLite DB, never the shared server/test.db."""
from datetime import datetime

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.models.pulse import SourceItem, WatchTopic
from app.models.pulse_identity import PulseUser
from app.models.pulse_review import PostReview
from app.services.pulse_identity import new_session


@pytest.fixture
async def engine(tmp_path):
    isolated = create_async_engine(f'sqlite+aiosqlite:///{tmp_path / "evaluation.db"}')
    async with isolated.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield isolated
    await isolated.dispose()


@pytest.fixture
async def evaluation(engine):
    async with async_sessionmaker(engine, expire_on_commit=False)() as db:
        db.add_all([WatchTopic(id='a', label='A', query='a'), WatchTopic(id='b', label='B', query='b')])
        user = PulseUser(id='viewer', email='viewer@example.test', name='Viewer', role='viewer', password_hash='unused')
        db.add(user)
        await db.flush()
        token, _ = await new_session(db, user)
        await db.commit()
        app = FastAPI()
        app.state.pulse_only = True
        from app.routers.pulse_evaluation import router
        app.include_router(router, prefix='/admin/pulse')
        async def override_db():
            yield db
        app.dependency_overrides[get_db] = override_db
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost',
                               cookies={'pulse_session': token}) as client:
            yield db, client


async def add(db, id, machine='positive', manual='positive', *, topic='a', platform='x',
              published='2026-11-12T17:00:00', relevance='unreviewed', review_needed=False):
    db.add(SourceItem(id=id, topic_id=topic, source='xpoz', platform=platform,
                      url=f'https://example.test/{id}', text=f'Caption {id}',
                      published_at=datetime.fromisoformat(published) if published else None,
                      metrics={'sentiment': machine}))
    db.add(PostReview(topic_id=topic, post_id=id, manual_sentiment=manual,
                      relevance=relevance, review_needed=review_needed,
                      analyst_note='PRIVATE NOTE', updated_by='viewer'))
    await db.flush()


async def get(client, **params):
    return await client.get('/admin/pulse/evaluation', params={'topic_id': 'a', **params})


async def test_agreement_excludes_unsettled_irrelevant_unknown_and_missing(evaluation, engine):
    db, client = evaluation
    await add(db, 'match', machine={'label': 'positive'})
    await add(db, 'mismatch', machine='negative', manual='neutral')
    await add(db, 'unknown', machine='unknown', manual='neutral')
    await add(db, 'missing', machine=None)
    await add(db, 'malformed', machine={'label': ['neutral']})
    await add(db, 'no-manual', manual=None)
    await add(db, 'irrelevant', relevance='irrelevant')
    await add(db, 'pending', review_needed=True)
    statements = []
    def record(conn, cursor, statement, parameters, context, many):
        statements.append(statement.strip().split()[0].upper())
    event.listen(engine.sync_engine, 'before_cursor_execute', record)
    try:
        response = await get(client)
    finally:
        event.remove(engine.sync_engine, 'before_cursor_execute', record)
    assert response.status_code == 200
    body = response.json()
    assert (body['reviewed_count'], body['paired_count'], body['matches'], body['agreement']) == (5, 2, 1, 0.5)
    assert body['confusion_matrix'] == {
        'positive': {'positive': 1, 'neutral': 0, 'negative': 0},
        'neutral': {'positive': 0, 'neutral': 0, 'negative': 0},
        'negative': {'positive': 0, 'neutral': 1, 'negative': 0},
    }
    assert {sample['post_id'] for sample in body['samples']} == {'match', 'mismatch'}
    assert body['samples'][0]['text'].startswith('Caption')
    assert 'PRIVATE NOTE' not in response.text
    assert 'held-out' in body['caveat']
    assert 'review_needed' in body['exclusion_policy']
    assert not set(statements) & {'INSERT', 'UPDATE', 'DELETE'}


async def test_wib_inclusive_published_dates_and_platform_scope(evaluation):
    db, client = evaluation
    await add(db, 'start')
    await add(db, 'end', published='2026-11-13T16:59:59.999999')
    await add(db, 'before', published='2026-11-12T16:59:59.999999')
    await add(db, 'after', published='2026-11-13T17:00:00')
    await add(db, 'undated', published=None)
    await add(db, 'other-topic', topic='b')
    await add(db, 'other-platform', platform='instagram')
    response = await get(client, from_date='2026-11-13', to_date='2026-11-13', platforms='x')
    assert response.status_code == 200
    body = response.json()
    assert body['paired_count'] == 2
    assert {s['post_id'] for s in body['samples']} == {'start', 'end'}
    assert body['period']['timezone'] == 'WIB'   # the installation zone's name (was a hand-written 'Asia/Jakarta')
    assert (await get(client, platforms='')).json()['paired_count'] == 0
    assert (await get(client)).json()['paired_count'] == 6
    assert (await get(client, platforms=' x, instagram,x ')).json()['paired_count'] == 6


async def test_empty_has_no_score(evaluation):
    _, client = evaluation
    response = await get(client)
    assert response.status_code == 200
    assert response.json()['agreement'] is None
    assert response.json()['paired_count'] == 0
    assert response.json()['samples'] == []


@pytest.mark.parametrize('params', [
    {'from_date': '2026-02-30'}, {'to_date': '20261113'}, {'from_date': '2026-11-13T00:00:00'},
    {'from_date': ''}, {'from_date': '0001-01-01'},
    {'from_date': '2026-11-14', 'to_date': '2026-11-13'}, {'topic_id': ''},
])
async def test_invalid_scope_is_422(evaluation, params):
    _, client = evaluation
    assert (await get(client, **params)).status_code == 422


async def test_missing_project_is_404(evaluation):
    _, client = evaluation
    assert (await get(client, topic_id='absent')).status_code == 404


async def test_read_requires_authentication(evaluation):
    _, client = evaluation
    client.cookies.clear()
    assert (await get(client)).status_code == 401


async def test_samples_are_bounded_without_truncating_counts(evaluation):
    db, client = evaluation
    for i in range(23):
        await add(db, f'post-{i:02}')
    response = await get(client)
    assert response.status_code == 200
    body = response.json()
    assert body['paired_count'] == 23
    assert len(body['samples']) == 20
    assert body['samples_truncated'] is True


async def test_missing_platform_matches_analytics_unknown_filter(evaluation):
    db, client = evaluation
    await add(db, 'unknown-platform', platform=None)
    assert (await get(client, platforms='unknown')).json()['paired_count'] == 1


async def test_machine_flag_does_not_override_completed_human_review(evaluation):
    db, client = evaluation
    await add(db, 'flagged-machine', machine={'label': 'positive', 'review_needed': True})
    assert (await get(client)).json()['agreement'] == 1


async def test_cross_project_annotation_never_pairs(evaluation):
    db, client = evaluation
    db.add(SourceItem(id='foreign', topic_id='b', source='rss', platform='news',
                      url='https://example.test/foreign', text='Foreign caption', metrics={'sentiment': 'positive'}))
    db.add(PostReview(topic_id='a', post_id='foreign', manual_sentiment='positive', updated_by='viewer'))
    await db.flush()
    assert (await get(client)).json()['reviewed_count'] == 0


def test_evaluation_dates_are_whole_days_of_the_installation_zone(monkeypatch):
    from app.routers.pulse_evaluation import date_bound
    from app.services import pulse_measures
    monkeypatch.setattr(pulse_measures, 'zone', lambda: (540, 'WIT'))
    assert date_bound('2026-11-11', 'from_date')[1] == datetime(2026, 11, 10, 15)
    assert date_bound('2026-11-11', 'to_date', end=True)[1] == datetime(2026, 11, 11, 14, 59, 59, 999999)


def test_evaluation_period_names_the_installation_zone(monkeypatch):
    from app.routers import pulse_evaluation
    from app.services import pulse_measures
    monkeypatch.setattr(pulse_measures, 'zone', lambda: (540, 'WIT'))
    assert pulse_evaluation.period_label('2026-11-11', '2026-11-12') == {'from': '2026-11-11', 'to': '2026-11-12', 'timezone': 'WIT', 'basis': 'published_at'}
