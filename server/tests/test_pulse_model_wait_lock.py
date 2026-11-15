"""A slow model call must not hold the request's database transaction.

The standalone server writes an audit row for every POST. SQLite has a single writer, so a transaction left open for the
length of a model answer (a minute or more) makes every collection and analysis worker fail with 'database is locked'.
Each route that waits for the model therefore ends its transaction first.
"""
from datetime import datetime

import pytest

from app.models.pulse import SourceItem, WatchTopic


@pytest.fixture
def order(db, monkeypatch):
    """Records the order of 'commit' and 'model'. The commit is recorded, not made: tests share one database file."""
    events = []

    async def commit():
        events.append('commit')
    monkeypatch.setattr(db, 'commit', commit)

    class Fake:
        async def generate_text(self, prompt, system=None, max_tokens=None, context_tokens=None):
            events.append('model')
            return '### Awal\nMuncul 1 Nov oleh akun_awal [A1].\n- "kata kunci"'
    monkeypatch.setattr('app.services.ai.get_ai_service', lambda settings=None: Fake())
    return events


async def a_project(db):
    topic = WatchTopic(label='Tunggu model', query='tunggu')
    db.add(topic)
    await db.flush()
    db.add(SourceItem(topic_id=topic.id, source='x', platform='x', url='https://x.com/a/status/77', author='akun_awal', text='Kabar tunggu',
                      published_at=datetime(2026, 11, 1, 2), metrics={'likes': 3}))
    await db.flush()
    return topic


@pytest.mark.asyncio
async def test_a_question_releases_the_database_before_waiting_for_the_model(client, admin_token, db, order):
    topic = await a_project(db)
    answer = await client.post('/api/admin/pulse/chat', json={'topic_id': topic.id, 'question': 'Kapan isu ini mulai ramai?'},
                               headers={'Authorization': f'Bearer {admin_token}'})
    assert answer.status_code == 200
    assert order[:2] == ['commit', 'model']


@pytest.mark.asyncio
async def test_a_stored_conversation_is_read_before_the_wait_and_written_after_it_never_across(client, admin_token, db, order):
    """A follow-up reads its conversation, then lets go of the database, waits for the model, and only then writes the turn."""
    from sqlalchemy import event
    topic = await a_project(db)
    headers = {'Authorization': f'Bearer {admin_token}'}
    body = {'topic_id': topic.id, 'question': 'Kapan isu ini mulai ramai?'}
    first = await client.post('/api/admin/pulse/chat', json=body, headers=headers)
    assert first.status_code == 200 and first.json()['conversation_id']
    assert order == ['commit', 'model', 'commit'], 'released before the model, and the stored turn committed at once after it'

    def statement(conn, cursor, sql, parameters, context, executemany):
        order.append('sql')
    order.clear()
    engine = db.bind.sync_engine
    event.listen(engine, 'before_cursor_execute', statement)
    try:
        follow_up = await client.post('/api/admin/pulse/chat', json={**body, 'conversation_id': first.json()['conversation_id']}, headers=headers)
    finally:
        event.remove(engine, 'before_cursor_execute', statement)
    assert follow_up.status_code == 200 and follow_up.json()['conversation']['questions'] == 2
    waited = order.index('model')
    assert order[waited - 1] == 'commit', 'no statement between letting go of the database and the model wait'
    assert 'sql' in order[:waited] and 'sql' in order[waited:], 'the conversation is read before the wait and written after it'
    assert order[-1] == 'commit' and order.count('model') == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('fmt', ['brief', 'insights'])
async def test_a_summary_releases_the_database_before_waiting_for_the_model(client, admin_token, db, order, fmt):
    topic = await a_project(db)
    made = await client.post(f'/api/admin/pulse/topics/{topic.id}/summary', json={'format': fmt}, headers={'Authorization': f'Bearer {admin_token}'})
    assert made.status_code == 200
    assert order[:2] == ['commit', 'model']


@pytest.mark.asyncio
async def test_keyword_suggestions_release_the_database_before_waiting_for_the_model(client, admin_token, db, order):
    topic = await a_project(db)
    made = await client.post('/api/admin/pulse/keywords/suggest', json={'topic_id': topic.id, 'seed': 'tunggu', 'existing': []},
                             headers={'Authorization': f'Bearer {admin_token}'})
    assert made.status_code in (200, 502)      # the fake answer need not parse into suggestions
    assert order[:2] == ['commit', 'model']
