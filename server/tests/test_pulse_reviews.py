"""Real HTTP/auth + isolated persistence; never touch the live database."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.database import Base, get_db
from app.models.pulse import WatchTopic, SourceItem
from app.services.pulse_identity import provision_user, new_session
from app.pulse_main import app


@pytest.fixture
async def reviews_env():
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add_all([WatchTopic(id='a', label='A', query='a'), WatchTopic(id='b', label='B', query='b')])
        await db.flush()
        for ident, topic, label in [('one','a','positive'), ('two','a','negative'), ('three','a','unknown'), ('four','a','neutral'), ('other','b','positive')]:
            db.add(SourceItem(id=ident, topic_id=topic, source='rss', url='https://example.test/'+ident, metrics={'sentiment': {'label': label}}))
        analyst = await provision_user(db, 'analyst@example.test', 'Analyst', 'long analyst password', 'analyst')
        token, session = await new_session(db, analyst)
        await db.commit()
        async def override():
            async with factory() as request_db:
                yield request_db
                await request_db.commit()
        app.dependency_overrides[get_db] = override
        async with AsyncClient(transport=ASGITransport(app), base_url='https://localhost') as client:
            client.cookies.set('pulse_session', token)
            yield client, db, {'Origin':'http://localhost:5173', 'X-Pulse-CSRF':session.csrf}
        app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_review_persists_partial_edits_and_undo_without_changing_ai(reviews_env):
    client, db, headers = reviews_env
    path = '/api/admin/pulse/reviews/one?topic_id=a'
    result = await client.put(path, headers=headers, json={'relevance':'irrelevant', 'manual_sentiment':'negative', 'review_needed':True, 'analyst_note':'Check context'})
    assert result.status_code == 200, result.text
    assert result.json()['review_needed'] is True
    state = (await client.get('/api/admin/pulse/reviews?topic_id=a')).json()
    assert state['excluded_post_ids'] == ['one']
    assert state['reviews'][0]['analyst_note'] == 'Check context'
    assert state['evaluation'] == {'paired_count':1, 'correct_count':0, 'accuracy':0.0}
    undone = await client.put(path, headers=headers, json={'relevance':'unreviewed'})
    assert undone.json()['manual_sentiment'] == 'negative'
    assert undone.json()['relevance'] == 'unreviewed'
    cleared = await client.put(path, headers=headers, json={'manual_sentiment':None, 'analyst_note':None, 'review_needed':False})
    assert cleared.json()['manual_sentiment'] is None
    state = (await client.get('/api/admin/pulse/reviews?topic_id=a')).json()
    assert state['excluded_post_ids'] == []
    assert state['evaluation'] == {'paired_count':0, 'correct_count':0, 'accuracy':None}
    await db.refresh(await db.get(SourceItem, 'one'))
    assert (await db.get(SourceItem, 'one')).metrics == {'sentiment': {'label':'positive'}}


@pytest.mark.asyncio
async def test_evaluation_only_pairs_valid_labels_and_scopes_project(reviews_env):
    client, _, headers = reviews_env
    for ident, topic, label in [('one','a','positive'), ('two','a','positive'), ('three','a','negative'), ('other','b','positive')]:
        assert (await client.put(f'/api/admin/pulse/reviews/{ident}?topic_id={topic}', headers=headers, json={'manual_sentiment':label})).status_code == 200
    state = (await client.get('/api/admin/pulse/reviews?topic_id=a')).json()
    assert {r['post_id'] for r in state['reviews']} == {'one','two','three'}
    assert state['evaluation'] == {'paired_count':2, 'correct_count':1, 'accuracy':0.5}
    assert (await client.put('/api/admin/pulse/reviews/other?topic_id=a', headers=headers, json={'relevance':'irrelevant'})).status_code == 404
    assert (await client.get('/api/admin/pulse/reviews?topic_id=missing')).status_code == 404
    assert (await client.get('/api/admin/pulse/reviews')).status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize('body', [{'relevance':'bot'}, {'manual_sentiment':'support'}, {'review_needed':None}, {'relevance':None}, {'unexpected':True}, {'analyst_note':'x'*2001}])
async def test_invalid_review_is_rejected(reviews_env, body):
    client, _, headers = reviews_env
    assert (await client.put('/api/admin/pulse/reviews/one?topic_id=a', headers=headers, json=body)).status_code == 422


@pytest.mark.asyncio
async def test_review_auth_csrf_and_viewer_read_only(reviews_env):
    client, db, headers = reviews_env
    path = '/api/admin/pulse/reviews/one?topic_id=a'
    assert (await client.put(path, json={'relevance':'irrelevant'})).status_code == 403
    viewer = await provision_user(db, 'viewer@example.test', 'Viewer', 'long viewer password', 'viewer')
    token, session = await new_session(db, viewer)
    await db.commit()
    client.cookies.set('pulse_session', token)
    assert (await client.get('/api/admin/pulse/reviews?topic_id=a')).status_code == 200
    assert (await client.put(path, headers={**headers,'X-Pulse-CSRF':session.csrf}, json={'relevance':'irrelevant'})).status_code == 403
    client.cookies.clear()
    assert (await client.get('/api/admin/pulse/reviews?topic_id=a')).status_code == 401
    assert (await client.put(path, headers=headers, json={'relevance':'irrelevant'})).status_code == 401
