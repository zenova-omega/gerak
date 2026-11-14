"""Workflow API regressions, using only a temporary SQLite database."""
import asyncio
from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.database import Base
from app.models.pulse import WatchTopic
from app.models.pulse_monitor import PulseAlert, MonitorSchedule, WorkerUsage


@pytest.fixture(scope='session')
async def engine(tmp_path_factory):
    path = tmp_path_factory.mktemp('alert-workflow') / 'isolated.sqlite'
    engine = create_async_engine(f'sqlite+aiosqlite:///{path}')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def alert(db):
    now = datetime.utcnow()
    db.add(WatchTopic(id='workflow-topic', label='Test', query='test'))
    await db.flush()
    row = PulseAlert(id='workflow-alert', dedup_key='workflow-alert', topic_id='workflow-topic',
                     title='Test only', kind='collection_error', window_start=now, window_end=now,
                     detail={'posts': 7, 'provider': 'rss'}, evidence_ids=['evidence'])
    db.add_all([row, MonitorSchedule(id='workflow-schedule', topic_id='workflow-topic',
                                   provider='rss', enabled=False),
                WorkerUsage(id='workflow-usage', provider='rss', day='2026-11-13', used=3)])
    await db.flush()
    return row


async def put(client, token, **body):
    return await client.put('/api/admin/pulse/monitor/alerts/workflow-alert/workflow',
                            json=body, headers={'Authorization': f'Bearer {token}'})


@pytest.mark.asyncio
async def test_workflow_history_validation_and_ack_independence(client, admin_token, alert, db):
    response = await put(client, admin_token, status='reviewing', assignee='  Analis A  ', expected_revision=0)
    assert response.status_code == 200
    data = response.json()
    workflow = data['workflow']
    assert (workflow['status'], workflow['assignee'], workflow['revision']) == ('reviewing', 'Analis A', 1)
    event = workflow['history'][0]
    assert event['actor'] == 'test-admin'
    assert datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00')).utcoffset().total_seconds() == 0
    assert event['from'] == {'status': 'new', 'assignee': None}
    assert event['to'] == {'status': 'reviewing', 'assignee': 'Analis A'}
    assert data['detail']['posts'] == 7 and data['evidence_ids'] == ['evidence']
    assert data['acknowledged_at'] is None
    ack = await client.post('/api/admin/pulse/monitor/alerts/workflow-alert/ack',
                            headers={'Authorization': f'Bearer {admin_token}'})
    assert ack.status_code == 200 and ack.json()['workflow'] == workflow
    acknowledged = ack.json()['acknowledged_at']
    assert (await put(client, admin_token, status='done', expected_revision=0)).status_code == 409
    done = await put(client, admin_token, status='done', assignee=None, expected_revision=1)
    assert done.status_code == 200
    assert done.json()['workflow']['revision'] == 2
    assert done.json()['workflow']['assignee'] is None
    assert done.json()['acknowledged_at'] == acknowledged
    noop = await put(client, admin_token, status='done', assignee='', expected_revision=2)
    assert noop.json()['workflow']['revision'] == 2
    reopened = await put(client, admin_token, status='new', expected_revision=2)
    assert reopened.json()['workflow']['revision'] == 3
    await db.refresh(alert)
    assert alert.detail['workflow'] == reopened.json()['workflow']
    assert (await db.get(MonitorSchedule, 'workflow-schedule')).enabled is False
    assert (await db.get(WorkerUsage, 'workflow-usage')).used == 3


@pytest.mark.asyncio
@pytest.mark.parametrize('body', [
    {'status': 'invalid', 'expected_revision': 0}, {'status': None, 'expected_revision': 0},
    {'status': 'done', 'expected_revision': 0, 'assignee': 'a' * 121},
    {'status': 'done', 'expected_revision': 0, 'assignee': 42},
    {'status': 'done'}, {'status': 'done', 'expected_revision': -1},
    {'status': 'done', 'expected_revision': 0, 'actor': 'forged'},
])
async def test_rejects_invalid_workflow(client, admin_token, alert, body):
    assert (await put(client, admin_token, **body)).status_code == 422


@pytest.mark.asyncio
async def test_auth_missing_alert_and_legacy_default(client, admin_token, user_token, alert):
    path = '/api/admin/pulse/monitor/alerts/workflow-alert/workflow'
    body = {'status': 'done', 'expected_revision': 0}
    assert (await client.put(path, json=body)).status_code == 403
    assert (await put(client, user_token, **body)).status_code == 403
    missing = await client.put(path.replace('workflow-alert', 'missing'), json=body,
                               headers={'Authorization': f'Bearer {admin_token}'})
    assert missing.status_code == 404
    ack = await client.post('/api/admin/pulse/monitor/alerts/workflow-alert/ack',
                            headers={'Authorization': f'Bearer {admin_token}'})
    assert ack.json()['workflow'] == {'status': 'new', 'assignee': None, 'revision': 0, 'history': []}
    assert 'workflow' not in ack.json()['detail']


@pytest.mark.asyncio
async def test_competing_transactions_reject_stale_revision(engine):
    from fastapi import HTTPException
    from app.services.pulse_alert_workflow import update_workflow
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory.begin() as db:
        now = datetime.utcnow()
        db.add(WatchTopic(id='concurrent-topic', label='Test', query='test'))
        await db.flush()
        db.add(PulseAlert(id='concurrent-alert', dedup_key='concurrent-alert', topic_id='concurrent-topic',
                          title='Test', kind='collection_error', window_start=now, window_end=now, detail={'posts': 8}))
    async def change(name):
        try:
            async with factory.begin() as db:
                # Simulate an identity-map row loaded before another transaction writes.
                cached = await db.get(PulseAlert, 'concurrent-alert')
                changed = await update_workflow(db, 'concurrent-alert', status='reviewing', assignee=name,
                                      expected_revision=0, actor=name)
                assert changed is cached
            return 200
        except HTTPException as exc:
            return exc.status_code
    assert sorted(await asyncio.gather(change('first'), change('second'))) == [200, 409]
    async with factory() as db:
        row = await db.scalar(select(PulseAlert).where(PulseAlert.id == 'concurrent-alert'))
        assert row.detail['posts'] == 8
        assert len(row.detail['workflow']['history']) == row.detail['workflow']['revision'] == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('role,expected', [('owner', 200), ('admin', 200), ('analyst', 403), ('viewer', 403)])
async def test_cookie_workflow_requires_csrf_origin_and_existing_role(client, db, alert, role, expected):
    from app.services.pulse_identity import provision_user, new_session
    user = await provision_user(db, 'workflow@example.com', 'Operator', 'test-only-long-password', role)
    token, session = await new_session(db, user)
    client.base_url = 'https://localhost'
    client.cookies.set('pulse_session', token)
    path = '/api/admin/pulse/monitor/alerts/workflow-alert/workflow'
    body = {'status': 'reviewing', 'expected_revision': 0}
    headers = {'Origin': 'http://localhost:5173', 'X-Pulse-CSRF': session.csrf}
    assert (await client.put(path, json=body)).status_code == 403
    assert (await client.put(path, json=body, headers={**headers, 'Origin': 'https://invalid.example'})).status_code == 403
    response = await client.put(path, json=body, headers=headers)
    assert response.status_code == expected
    if expected == 200:
        assert response.json()['workflow']['history'][0]['actor'] == user.id
    if role == 'analyst':
        assert (await client.post(path.rsplit('/', 1)[0] + '/ack', headers=headers)).status_code == 200
