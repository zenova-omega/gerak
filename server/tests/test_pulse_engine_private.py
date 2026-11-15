"""Which engine produced a label is an operations detail. It stays in the database and never reaches the browser.

Stored results keep `model` and `method` so an operator can audit or re-run an analysis. Every answer the server gives,
and every report it files or hands back, carries the label, its reason and its date, and nothing about the engine.
"""
from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.models.pulse import Issue, SourceItem, WatchTopic
from app.models.pulse_report import PulseReport
from app.models.pulse_response_analysis import ResponseAnalysisJob

ENGINE = 'kitchen-engine:9b'
ENGINE_WORDS = (ENGINE, 'ollama', 'qwen', 'claude', 'anthropic', 'grok', 'x.ai')
POST_URL = 'https://x.com/warga_kota/status/1988001122334455'


def stored_labels():
    """Labels exactly as the analysis workers store them."""
    return {
        'sentiment': {'label': 'negative', 'confidence': 0.8, 'reason': 'Keluhan pelayanan', 'method': 'ollama_post_v1',
                      'model': ENGINE, 'analyzed_at': '2026-11-11T21:20:00Z', 'characters': 29},
        'emotion': {'label': 'anger', 'confidence': 0.75, 'reason': 'Nada kesal', 'review_needed': False,
                    'method': 'ollama_emotion_v1', 'model': ENGINE, 'analyzed_at': '2026-11-11T21:20:00Z', 'characters': 29},
    }


def names_the_engine(body):
    text = body.lower()
    return [word for word in ENGINE_WORDS if word in text]


@pytest.fixture
def engine_configured(monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), 'AI_PROVIDER', 'ollama')
    monkeypatch.setattr(get_settings(), 'OLLAMA_MODEL', ENGINE)


@pytest.fixture
async def project(db, engine_configured):
    """One analysed post with one analysed comment, as the workers leave them."""
    from app.services.pulse_response_analysis import digest, fingerprint
    topic = WatchTopic(label='Pelayanan kantor', query='pelayanan')
    db.add(topic)
    await db.flush()
    issue = Issue(topic_id=topic.id, title='Keluhan pelayanan')
    db.add(issue)
    await db.flush()
    item = SourceItem(topic_id=topic.id, issue_id=issue.id, source='x', platform='x', url=POST_URL, author='warga_kota',
                      text='Pelayanan sangat mengecewakan', published_at=datetime(2026, 11, 11, 2),
                      metrics={'likes': 9, **stored_labels(),
                               'comment_snapshot': {'items': [{'id': 'c1', 'text': 'Setuju, antre tiga jam'}]}})
    db.add(item)
    await db.flush()
    for kind, key, text in (('post', item.id, item.text), ('comment', 'c1', 'Setuju, antre tiga jam')):
        db.add(ResponseAnalysisJob(
            id=digest(item.id, kind, key), post_id=item.id, subject_id=key, kind=kind, status='done',
            content_target_hash=fingerprint(kind, text, topic.label), finished_at=datetime(2026, 11, 11, 3),
            result={'stance': {'label': 'opposes', 'confidence': 0.9, 'reason': 'Menolak'},
                    'sentiment': {'label': 'negative', 'confidence': 0.9, 'reason': 'Kesal'},
                    'model': ENGINE, 'method': 'response_v1', 'target': topic.label}))
    await db.flush()
    return topic, issue, item


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.mark.asyncio
async def test_post_labels_reach_the_browser_without_the_engine_behind_them(client, admin_token, db, project):
    topic, _, item = project
    answer = await client.get('/api/admin/pulse/analytics', params={'topic_id': topic.id}, headers=auth(admin_token))
    assert answer.status_code == 200
    metrics = answer.json()['posts'][0]['metrics']
    assert metrics['sentiment'] == {'label': 'negative', 'confidence': 0.8, 'reason': 'Keluhan pelayanan',
                                    'analyzed_at': '2026-11-11T21:20:00Z', 'characters': 29}
    assert metrics['emotion']['label'] == 'anger' and metrics['emotion']['reason'] == 'Nada kesal'
    assert 'model' not in metrics['emotion'] and 'method' not in metrics['emotion']
    assert metrics['likes'] == 9
    # The record itself is untouched: the operator still sees what produced the label.
    assert item.metrics['sentiment']['model'] == ENGINE and item.metrics['emotion']['method'] == 'ollama_emotion_v1'


@pytest.mark.asyncio
async def test_response_analysis_reaches_the_browser_without_the_engine_behind_it(client, admin_token, project):
    topic, _, _ = project
    answer = await client.get('/api/admin/pulse/response-analysis', params={'topic_id': topic.id}, headers=auth(admin_token))
    assert answer.status_code == 200
    post = answer.json()['posts'][0]
    assert post['stance']['label'] == 'opposes' and post['status'] == 'done'
    assert post['comments'][0]['sentiment']['label'] == 'negative'
    for row in (post, post['comments'][0]):
        assert 'model' not in row and 'method' not in row


@pytest.mark.asyncio
async def test_analysis_status_says_whether_it_works_not_what_runs_it(client, admin_token, engine_configured):
    answer = await client.get('/api/admin/pulse/sentiment/status', headers=auth(admin_token))
    assert answer.json() == {'configured': True, 'mode': 'automatic_and_manual', 'max_characters': 6000}


@pytest.mark.asyncio
async def test_analysis_progress_counts_posts_and_names_no_engine(client, admin_token, project):
    topic, _, _ = project
    answer = await client.get('/api/admin/pulse/sentiment/progress', params={'topic_id': topic.id}, headers=auth(admin_token))
    assert answer.status_code == 200
    assert answer.json()['total'] == 1 and 'model' not in answer.json()


@pytest.mark.asyncio
async def test_a_label_already_stored_is_handed_back_without_the_engine(client, admin_token, project):
    _, _, item = project
    answer = await client.post(f'/api/admin/pulse/items/{item.id}/sentiment', headers=auth(admin_token))
    assert answer.status_code == 200
    assert answer.json()['label'] == 'negative' and answer.json()['reason'] == 'Keluhan pelayanan'
    assert 'model' not in answer.json() and 'method' not in answer.json()


READS = (
    ('/analytics', lambda t, i, p: {'topic_id': t.id}),
    ('/search', lambda t, i, p: {'q': 'mengecewakan'}),
    ('/seed-preview', lambda t, i, p: {'url': POST_URL}),
    ('/issues', lambda t, i, p: {'topic_id': t.id}),
    ('/issues/{issue}', lambda t, i, p: {}),
    ('/response-analysis', lambda t, i, p: {'topic_id': t.id}),
    ('/sentiment/status', lambda t, i, p: {}),
    ('/sentiment/progress', lambda t, i, p: {'topic_id': t.id}),
    ('/evaluation', lambda t, i, p: {'topic_id': t.id}),
    ('/chat/status', lambda t, i, p: {}),
    ('/chat/conversations', lambda t, i, p: {'topic_id': t.id}),
    ('/chat/conversations/{conversation}', lambda t, i, p: {}),
    ('/topics', lambda t, i, p: {}),
    ('/topics/{topic}/summary', lambda t, i, p: {}),
    ('/monitor', lambda t, i, p: {}),
    ('/monitor/items/{post}/snapshots', lambda t, i, p: {}),
)


@pytest.fixture
async def conversation(client, admin_token, db, project, monkeypatch):
    """One Tanya AI question, asked through the route with the engine configured, so the stored turn is what the route leaves."""
    async def keep():
        return None
    monkeypatch.setattr(db, 'commit', keep)      # the route commits around the model wait; tests share one database file

    class Fake:
        async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
            return 'Keluhan pelayanan paling ramai pada [P1].'
    monkeypatch.setattr('app.services.ai.get_ai_service', lambda settings=None: Fake())
    topic, _, _ = project
    asked = await client.post('/api/admin/pulse/chat', json={'topic_id': topic.id, 'question': 'Apa keluhan yang paling ramai?'}, headers=auth(admin_token))
    assert asked.status_code == 200, asked.text
    assert names_the_engine(asked.text) == []
    return asked.json()['conversation_id']


@pytest.mark.asyncio
@pytest.mark.parametrize('path,params', READS, ids=[path for path, _ in READS])
async def test_no_page_of_data_names_the_engine(client, admin_token, project, conversation, path, params):
    topic, issue, item = project
    url = '/api/admin/pulse' + path.format(topic=topic.id, issue=issue.id, post=item.id, conversation=conversation)
    answer = await client.get(url, params=params(topic, issue, item), headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    assert names_the_engine(answer.text) == []
    if 'conversations' in path:
        assert 'Apa keluhan yang paling ramai?' in answer.text, 'the stored conversation is in the answer that was checked'


# ── Reports: filed by the browser, kept as they were filed, read back later ──────────────────────────────────────────

@pytest.fixture
async def archive():
    from app.pulse_main import app
    from app.services.pulse_identity import new_session, provision_user
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(WatchTopic(id='a', label='Project A', query='alpha'))
        await db.flush()
        db.add(SourceItem(id='p', topic_id='a', source='rss', platform='news', url='https://example.test/p'))
        owner = await provision_user(db, 'engine@example.test', 'Owner', 'secure archive password', 'owner')
        token, session = await new_session(db, owner)
        await db.commit()

    async def override():
        async with factory() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise
    app.dependency_overrides[get_db] = override
    async with AsyncClient(transport=ASGITransport(app), base_url='https://localhost') as client:
        client.cookies.set('pulse_session', token)
        yield client, {'Origin': 'http://localhost:5173', 'X-Pulse-CSRF': session.csrf}, factory
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


def report_as_an_older_browser_filed_it():
    labelled = {'stance': {'label': 'opposes', 'confidence': 0.9, 'reason': 'Menolak'}, 'model': ENGINE, 'method': 'response_v1',
                'status': 'done', 'fresh': True}
    row = {'post_id': 'p', **labelled, 'comments': [{'id': 'c1', **labelled, 'sentiment': {'label': 'negative', 'reason': 'Kesal'}}]}
    return {'topic': {'id': 'a', 'label': 'Project A', 'query': 'alpha'}, 'period': {'from': '2026-11-01', 'to': '2026-11-13'},
            'selectedPlatforms': ['news'], 'generatedAt': '2026-11-13T00:00:00Z',
            'posts': [{'id': 'p', 'platform': 'news', 'published_at': '2026-11-02T00:00:00Z', 'text': 'Original caption',
                       'metrics': {'likes': 9, **stored_labels()}}],
            'responseAnalysis': {'loaded': True, 'error': False,
                                 'response': {'target': 'Project A', 'topic_id': 'a', 'posts': [row], 'by_post': [row]}}}


@pytest.mark.asyncio
async def test_a_report_is_filed_without_the_engine_behind_its_labels(archive):
    client, headers, factory = archive
    made = await client.post('/api/admin/pulse/reports', headers=headers,
                             json={'topic_id': 'a', 'title': 'Report A', 'snapshot': report_as_an_older_browser_filed_it()})
    assert made.status_code == 201, made.text
    async with factory() as db:
        kept = (await db.get(PulseReport, made.json()['id'])).snapshot
    import json
    assert names_the_engine(json.dumps(kept)) == []
    assert kept['posts'][0]['metrics']['sentiment']['reason'] == 'Keluhan pelayanan' and kept['posts'][0]['metrics']['likes'] == 9
    assert kept['responseAnalysis']['response']['posts'][0]['comments'][0]['stance']['label'] == 'opposes'


@pytest.mark.asyncio
async def test_a_report_filed_earlier_is_read_back_without_the_engine(archive):
    client, _, factory = archive
    async with factory() as db:
        old = PulseReport(topic_id='a', title='Laporan lama', snapshot=report_as_an_older_browser_filed_it(), created_by='someone')
        db.add(old)
        await db.commit()
    answer = await client.get(f'/api/admin/pulse/reports/{old.id}?topic_id=a')
    assert answer.status_code == 200
    assert names_the_engine(answer.text) == []
    snapshot = answer.json()['snapshot']
    assert snapshot['posts'][0]['metrics']['emotion']['label'] == 'anger'
    assert snapshot['responseAnalysis']['response']['posts'][0]['stance']['label'] == 'opposes'
