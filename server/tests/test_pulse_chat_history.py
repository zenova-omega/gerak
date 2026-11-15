"""Tanya AI keeps its conversations: one stored conversation per thread, for the person who asked, inside one project.

The model is always a fake here. A stored turn is exactly what the page shows: question, answer, cited sources, scope, time.
"""
import logging
from datetime import datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.models.pulse import SourceItem, WatchTopic

API = '/api/admin/pulse'
QUESTION = 'Kapan isu jalan rusak mulai ramai dibahas warga?'
ANSWER = 'Lonjakan tercepat teramati pada [P1], dua hari lalu.'
SUPPLIER = 'xpoz'


def auth(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture
def model(db, monkeypatch):
    """A fake model that records each call. The route's commits are not made: tests share one database file."""
    calls = []

    async def keep():
        return None
    monkeypatch.setattr(db, 'commit', keep)

    class Fake:
        answer = ANSWER

        async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
            calls.append(prompt)
            if self.answer is None:
                raise RuntimeError('provider said no, with a secret in the message')
            return self.answer
    fake = Fake()
    fake.calls = calls
    monkeypatch.setattr('app.services.ai.get_ai_service', lambda settings=None: fake)
    return fake


async def a_project(db, topic_id='riwayat-a'):
    topic = WatchTopic(id=topic_id, label='Jalan rusak', query='jalan rusak', is_active=False)
    db.add(topic)
    await db.flush()
    db.add(SourceItem(id=topic_id + '-post', topic_id=topic_id, source=SUPPLIER, platform='x', url=f'https://x.com/warga/status/{abs(hash(topic_id))}',
                      text='Jalan rusak di depan pasar belum diperbaiki', author='warga_pasar',
                      published_at=datetime.utcnow() - timedelta(days=2), metrics={'likes': 40, 'comments': 5}))
    await db.flush()
    return topic


def stored(topic_id, user_id='test-admin', turns=1, **fields):
    from app.models.pulse_chat import PulseChatConversation
    turn = {'question': QUESTION, 'answer': ANSWER, 'sources': [], 'scope': {'posts': 1, 'from': None, 'to': None, 'platforms': None, 'truncated': False},
            'answered_at': '2026-11-14T05:00:00Z'}
    return PulseChatConversation(topic_id=topic_id, user_id=user_id, title=QUESTION, turns=[dict(turn) for _ in range(turns)], **fields)


async def ask(client, admin_token, **body):
    return await client.post(API + '/chat', json={'topic_id': 'riwayat-a', 'question': QUESTION, **body}, headers=auth(admin_token))


@pytest.mark.asyncio
async def test_an_answer_is_stored_as_a_conversation_that_reads_back_as_it_was_shown(client, admin_token, db, model):
    await a_project(db)
    answer = await ask(client, admin_token)
    assert answer.status_code == 200, answer.text
    data = answer.json()
    assert data['answer'] == ANSWER and [source['code'] for source in data['sources']] == ['P1'] and data['scope']['posts'] == 1
    assert data['conversation_id'] and data['conversation'] == {
        'id': data['conversation_id'], 'title': QUESTION, 'updated_at': data['answered_at'], 'questions': 1, 'full': False}

    read = await client.get(f"{API}/chat/conversations/{data['conversation_id']}", params={'topic_id': 'riwayat-a'}, headers=auth(admin_token))
    assert read.status_code == 200, read.text
    kept = read.json()
    assert {key: kept[key] for key in ('id', 'topic_id', 'title', 'full')} == {'id': data['conversation_id'], 'topic_id': 'riwayat-a', 'title': QUESTION, 'full': False}
    assert kept['created_at'] == kept['updated_at'] == data['answered_at']
    # The stored turn is the answer as the page received it, plus the question.
    assert kept['turns'] == [{'question': QUESTION, **{key: data[key] for key in ('answer', 'sources', 'groups', 'charts', 'scope', 'answered_at')}}]
    assert data['groups'] == [] and data['charts'] == []      # this answer cites no group and asks for no chart


@pytest.mark.asyncio
async def test_a_follow_up_is_appended_to_the_conversation_it_names(client, admin_token, db, model):
    await a_project(db)
    first = (await ask(client, admin_token)).json()
    second = await ask(client, admin_token, question='Platform mana yang paling ramai?', conversation_id=first['conversation_id'],
                       history=[{'role': 'user', 'content': QUESTION}, {'role': 'assistant', 'content': ANSWER}])
    assert second.status_code == 200, second.text
    assert second.json()['conversation_id'] == first['conversation_id']
    assert second.json()['conversation']['questions'] == 2 and second.json()['conversation']['title'] == QUESTION
    kept = (await client.get(f"{API}/chat/conversations/{first['conversation_id']}", headers=auth(admin_token))).json()
    assert [turn['question'] for turn in kept['turns']] == [QUESTION, 'Platform mana yang paling ramai?']
    assert kept['updated_at'] == second.json()['answered_at'] >= kept['created_at']
    listed = (await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'}, headers=auth(admin_token))).json()
    assert listed['total'] == 1 and listed['conversations'][0]['questions'] == 2


@pytest.mark.asyncio
async def test_nothing_is_stored_when_the_model_does_not_answer(client, admin_token, db, model):
    await a_project(db)
    kept = stored('riwayat-a')
    db.add(kept)
    await db.flush()
    model.answer = None
    assert (await ask(client, admin_token)).status_code == 502
    failed = await ask(client, admin_token, conversation_id=kept.id)
    assert failed.status_code == 502 and 'secret' not in failed.text
    listed = (await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'}, headers=auth(admin_token))).json()
    assert [(row['id'], row['questions']) for row in listed['conversations']] == [(kept.id, 1)]


@pytest.mark.asyncio
async def test_the_list_is_the_callers_own_for_one_project_newest_first_and_at_most_fifty(client, admin_token, db, model):
    await a_project(db)
    await a_project(db, 'riwayat-b')
    start = datetime(2026, 11, 1)
    db.add_all([stored('riwayat-a', created_at=start, updated_at=start + timedelta(minutes=index)) for index in range(52)])
    db.add_all([stored('riwayat-a', user_id='someone-else', updated_at=start + timedelta(days=9)),
                stored('riwayat-b', updated_at=start + timedelta(days=9))])
    await db.flush()
    answer = await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'}, headers=auth(admin_token))
    assert answer.status_code == 200, answer.text
    data = answer.json()
    assert data['total'] == 52 and len(data['conversations']) == 50
    assert set(data['conversations'][0]) == {'id', 'title', 'updated_at', 'questions', 'full'}
    times = [row['updated_at'] for row in data['conversations']]
    assert times == sorted(times, reverse=True) and times[0] == '2026-11-01T00:51:00Z'
    assert (await client.get(API + '/chat/conversations', params={'topic_id': 'tidak-ada'}, headers=auth(admin_token))).status_code == 404
    assert (await client.get(API + '/chat/conversations', headers=auth(admin_token))).status_code == 422
    assert (await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'})).status_code in (401, 403)


@pytest.mark.asyncio
async def test_a_conversation_of_another_person_or_another_project_is_not_found(client, admin_token, db, model):
    from app.models.pulse_chat import PulseChatConversation
    await a_project(db)
    await a_project(db, 'riwayat-b')
    theirs, elsewhere = stored('riwayat-a', user_id='someone-else'), stored('riwayat-b')
    db.add_all([theirs, elsewhere])
    await db.flush()
    headers = auth(admin_token)
    assert (await client.get(f'{API}/chat/conversations/{theirs.id}', headers=headers)).status_code == 404
    assert (await client.delete(f'{API}/chat/conversations/{theirs.id}', headers=headers)).status_code == 404
    assert (await client.get(f'{API}/chat/conversations/tidak-ada', headers=headers)).status_code == 404
    # The caller's own conversation, but of project B, asked for from project A.
    assert (await client.get(f'{API}/chat/conversations/{elsewhere.id}', params={'topic_id': 'riwayat-a'}, headers=headers)).status_code == 404
    assert (await client.get(f'{API}/chat/conversations/{elsewhere.id}', params={'topic_id': 'riwayat-b'}, headers=headers)).status_code == 200
    for conversation in (theirs, elsewhere):
        refused = await ask(client, admin_token, conversation_id=conversation.id)
        assert refused.status_code == 404 and 'Percakapan' in refused.json()['detail']
    assert model.calls == [], 'a question for a conversation that is not the caller\'s never reaches the model'
    assert await db.get(PulseChatConversation, theirs.id) is not None
    assert len((await db.get(PulseChatConversation, theirs.id, populate_existing=True)).turns) == 1


@pytest.mark.asyncio
async def test_a_conversation_holds_forty_questions_and_then_asks_for_a_new_one(client, admin_token, db, model):
    await a_project(db)
    almost, full = stored('riwayat-a', turns=39), stored('riwayat-a', turns=40)
    db.add_all([almost, full])
    await db.flush()
    refused = await ask(client, admin_token, conversation_id=full.id)
    assert refused.status_code == 409
    assert '40 pertanyaan' in refused.json()['detail'] and 'percakapan baru' in refused.json()['detail'].lower()
    assert model.calls == []
    last = await ask(client, admin_token, conversation_id=almost.id)
    assert last.status_code == 200 and last.json()['conversation'] == {**last.json()['conversation'], 'questions': 40, 'full': True}
    listed = (await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'}, headers=auth(admin_token))).json()
    assert {row['id']: row['full'] for row in listed['conversations']} == {almost.id: True, full.id: True}
    assert (await client.get(f'{API}/chat/conversations/{full.id}', headers=auth(admin_token))).json()['full'] is True


@pytest.mark.asyncio
async def test_a_turn_that_arrives_after_the_conversation_filled_up_or_went_away_starts_a_new_one(client, admin_token, db, model, monkeypatch):
    """The model takes a minute: the same person can fill or delete the conversation from another tab meanwhile."""
    from app.models.pulse_chat import PulseChatConversation
    await a_project(db)
    filling, leaving = stored('riwayat-a', turns=39), stored('riwayat-a')
    db.add_all([filling, leaving])
    await db.flush()

    async def fill():
        filling.turns = [*filling.turns, dict(filling.turns[0])]

    async def leave():
        await db.delete(leaving)

    for conversation, meanwhile in ((filling, fill), (leaving, leave)):
        class Slow:
            async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
                await meanwhile()
                await db.flush()
                return ANSWER
        monkeypatch.setattr('app.services.ai.get_ai_service', lambda settings=None: Slow())
        answer = await ask(client, admin_token, conversation_id=conversation.id)
        assert answer.status_code == 200, answer.text
        assert answer.json()['conversation_id'] not in (filling.id, leaving.id) and answer.json()['conversation']['questions'] == 1
    assert len((await db.get(PulseChatConversation, filling.id, populate_existing=True)).turns) == 40
    assert await db.get(PulseChatConversation, leaving.id) is None


@pytest.mark.asyncio
async def test_delete_removes_one_of_the_callers_own(client, admin_token, db, model):
    await a_project(db)
    first, second = stored('riwayat-a'), stored('riwayat-a')
    db.add_all([first, second])
    await db.flush()
    headers = auth(admin_token)
    assert (await client.delete(f'{API}/chat/conversations/{first.id}')).status_code in (401, 403)
    removed = await client.delete(f'{API}/chat/conversations/{first.id}', headers=headers)
    assert removed.status_code == 200 and removed.json() == {'deleted': first.id}
    assert (await client.get(f'{API}/chat/conversations/{first.id}', headers=headers)).status_code == 404
    assert (await client.delete(f'{API}/chat/conversations/{first.id}', headers=headers)).status_code == 404
    listed = (await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'}, headers=headers)).json()
    assert [row['id'] for row in listed['conversations']] == [second.id] and listed['total'] == 1


def test_the_title_is_the_first_question_on_one_line_cut_near_eighty_characters():
    from app.routers.pulse_chat import conversation_title
    assert conversation_title('  Apa isu\n utama   minggu ini? ') == 'Apa isu utama minggu ini?'
    long = 'Bagaimana perkembangan percakapan tentang perbaikan jalan rusak di depan pasar induk selama tujuh hari terakhir ini?'
    title = conversation_title(long)
    assert len(title) <= 80 and title.endswith('…') and long.startswith(title[:-1])
    assert not title[:-1].endswith(' ') and long[len(title) - 1] == ' ', 'cut between words, not inside one'
    assert conversation_title('x' * 200) == 'x' * 79 + '…'


@pytest.mark.asyncio
async def test_a_stored_conversation_names_neither_the_engine_nor_the_supplier(client, admin_token, db, model, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), 'AI_PROVIDER', 'ollama')
    monkeypatch.setattr(get_settings(), 'OLLAMA_MODEL', 'kitchen-engine:9b')
    await a_project(db)
    data = (await ask(client, admin_token)).json()
    headers = auth(admin_token)
    bodies = [(await ask(client, admin_token, conversation_id=data['conversation_id'])).text,
              (await client.get(API + '/chat/conversations', params={'topic_id': 'riwayat-a'}, headers=headers)).text,
              (await client.get(f"{API}/chat/conversations/{data['conversation_id']}", headers=headers)).text]
    for body in bodies:
        assert [word for word in ('kitchen-engine', 'ollama', SUPPLIER, '"model"', '"method"', '"provider"', '"source"') if word in body.lower()] == []
    assert '"sources"' in bodies[2] and 'warga_pasar' in bodies[2], 'the cited post itself is kept'


@pytest.mark.asyncio
async def test_question_and_answer_text_never_reach_the_log(client, admin_token, db, model, monkeypatch, caplog):
    import app.routers.pulse_chat as routes
    caplog.set_level(logging.DEBUG, logger='app')
    await a_project(db)
    assert (await ask(client, admin_token)).status_code == 200

    async def locked(*args, **kwargs):
        raise RuntimeError(f'database is locked while writing {QUESTION}')
    monkeypatch.setattr(routes, 'remember', locked)
    # The answer was already produced: it is handed back even when it could not be kept, and says so.
    unsaved = await ask(client, admin_token)
    assert unsaved.status_code == 200 and unsaved.json()['answer'] == ANSWER
    assert unsaved.json()['conversation_id'] is None and unsaved.json()['conversation'] is None
    written = [record.getMessage() for record in caplog.records if record.name.startswith('app')]
    assert any('not stored' in line and 'RuntimeError' in line for line in written), written
    assert not any(QUESTION in line or ANSWER in line for line in written)


@pytest.mark.asyncio
async def test_deleting_a_project_takes_its_conversations_with_it(client, admin_token, db, model):
    from app.models.pulse_chat import PulseChatConversation
    await a_project(db)
    await a_project(db, 'riwayat-b')
    gone, stays = stored('riwayat-a'), stored('riwayat-b')
    db.add_all([gone, stays])
    await db.flush()
    removed = await client.delete(API + '/topics/riwayat-a', headers=auth(admin_token))
    assert removed.status_code == 200, removed.text
    await db.flush()
    left = (await db.scalars(select(PulseChatConversation.id).where(PulseChatConversation.id.in_([gone.id, stays.id])))).all()
    assert left == [stays.id]


@pytest.mark.asyncio
async def test_the_table_is_added_to_a_database_made_before_it_existed_and_nothing_else_changes(tmp_path):
    """What the standalone server does when it starts (app/pulse_main.py lifespan): create what is missing, keep the rest."""
    from app.models.pulse_chat import PulseChatConversation
    from app.services.pulse_migrate import add_missing_columns
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'before.db'}")
    older = [table for table in Base.metadata.sorted_tables if table.name != PulseChatConversation.__tablename__]
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync: Base.metadata.create_all(sync, tables=older))
        await conn.execute(WatchTopic.__table__.insert().values(id='lama', label='Project lama', query='lama'))
        assert not await conn.run_sync(lambda sync: inspect(sync).has_table(PulseChatConversation.__tablename__))
    for _ in range(2):      # the first start adds the table; the next one finds it and leaves it alone
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(add_missing_columns)
    async with engine.begin() as conn:
        columns = await conn.run_sync(lambda sync: {column['name'] for column in inspect(sync).get_columns(PulseChatConversation.__tablename__)})
        assert columns == {'id', 'topic_id', 'user_id', 'title', 'created_at', 'updated_at', 'turns'}
        assert (await conn.execute(select(WatchTopic.label))).scalars().all() == ['Project lama']
        assert await conn.scalar(select(func.count()).select_from(PulseChatConversation)) == 0
    await engine.dispose()


# ── The standalone server: two people who each sign in with a PULSE session ──────────────────────────────────────────

@pytest.fixture
async def two_people(monkeypatch):
    from app.models.pulse_identity import PulseUser
    from app.pulse_main import app
    from app.services.pulse_identity import new_session
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    people = {}
    async with factory() as db:
        await a_project(db)
        for name in ('ani', 'budi'):
            user = PulseUser(email=f'{name}@example.test', name=name, role='owner', password_hash='not-a-usable-hash')
            db.add(user)
            await db.flush()
            token, session = await new_session(db, user)
            people[name] = (user.id, token, {'Origin': 'http://localhost:5173', 'X-Pulse-CSRF': session.csrf})
        await db.commit()

    async def override():
        async with factory() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    class Fake:
        async def generate_text(self, prompt, system=None, max_tokens=0, context_tokens=None):
            return ANSWER
    monkeypatch.setattr('app.services.ai.get_ai_service', lambda settings=None: Fake())
    app.dependency_overrides[get_db] = override
    clients = {}
    for name, (user_id, token, headers) in people.items():
        clients[name] = AsyncClient(transport=ASGITransport(app), base_url='https://localhost', headers=headers, cookies={'pulse_session': token})
    yield clients, {name: user_id for name, (user_id, _, _) in people.items()}, factory
    for one in clients.values():
        await one.aclose()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_each_signed_in_person_sees_and_deletes_only_their_own_conversations(two_people):
    from app.models.pulse_chat import PulseChatConversation
    from app.models.pulse_identity import PulseAudit
    clients, ids, factory = two_people
    ani, budi = clients['ani'], clients['budi']
    body = {'topic_id': 'riwayat-a', 'question': QUESTION}
    made = await ani.post(API + '/chat', json=body)
    assert made.status_code == 200, made.text
    conversation = made.json()['conversation_id']
    async with factory() as db:      # really committed, under the person who asked
        row = await db.get(PulseChatConversation, conversation)
        assert (row.user_id, row.topic_id, len(row.turns)) == (ids['ani'], 'riwayat-a', 1)
        assert await db.scalar(select(func.count()).select_from(PulseAudit).where(PulseAudit.action == f'POST {API}/chat')) == 1
    again = await ani.post(API + '/chat', json={**body, 'conversation_id': conversation})
    assert again.status_code == 200 and again.json()['conversation']['questions'] == 2
    params = {'topic_id': 'riwayat-a'}
    assert [row['id'] for row in (await ani.get(API + '/chat/conversations', params=params)).json()['conversations']] == [conversation]
    assert (await budi.get(API + '/chat/conversations', params=params)).json() == {'conversations': [], 'total': 0}
    assert (await budi.get(f'{API}/chat/conversations/{conversation}')).status_code == 404
    assert (await budi.delete(f'{API}/chat/conversations/{conversation}')).status_code == 404
    assert (await budi.post(API + '/chat', json={**body, 'conversation_id': conversation})).status_code == 404
    assert (await ani.delete(f'{API}/chat/conversations/{conversation}')).json() == {'deleted': conversation}
    async with factory() as db:
        assert await db.get(PulseChatConversation, conversation) is None
