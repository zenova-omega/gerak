"""PULSE sessions must never grant GERAK access or accept CSRF writes."""
import pytest


@pytest.fixture(autouse=True)
def tls_client(client):
    client.base_url = 'https://localhost'


@pytest.mark.asyncio
async def test_pulse_rejects_anonymous_and_has_no_public_signup(client):
    assert (await client.get('/api/pulse/auth/me')).status_code == 401
    assert (await client.post('/api/pulse/auth/register', json={})).status_code == 404
    assert (await client.get('/api/pulse/auth/status')).json() == {'configured': False}


@pytest.mark.asyncio
async def test_cookie_login_csrf_logout_and_isolation(client, db):
    from app.services.pulse_identity import provision_user
    user = await provision_user(db, 'Owner@Example.com', 'Owner', 'long local password 123', 'owner')
    headers = {'Origin': 'http://localhost:5173'}
    result = await client.post('/api/pulse/auth/login', headers=headers,
                              json={'email': 'owner@example.com', 'password': 'long local password 123'})
    assert result.status_code == 200
    assert 'HttpOnly' in result.headers['set-cookie']
    assert 'SameSite=strict' in result.headers['set-cookie']
    # Inspect and replay the opaque token to verify server-side revocation.
    token = result.cookies.get('pulse_session')
    client.cookies.set('pulse_session', token)
    me = (await client.get('/api/pulse/auth/me')).json()
    assert me['id'] == user.id and me['email'] == 'owner@example.com'
    assert (await client.get('/api/admin/pulse/topics')).status_code == 200
    assert (await client.get('/api/auth/me')).status_code in (401, 403)
    assert (await client.post('/api/admin/pulse/topics', json={'label': 'Local', 'query': 'local'})).status_code == 403
    csrf = {**headers, 'X-Pulse-CSRF': me['csrf_token']}
    assert (await client.post('/api/admin/pulse/topics', headers=csrf, json={'label': 'Local', 'query': 'local'})).status_code == 200
    assert (await client.post('/api/pulse/auth/logout', headers={**csrf, 'Origin': 'https://evil.example'})).status_code == 403
    assert (await client.post('/api/pulse/auth/logout', headers=csrf)).status_code == 200
    client.cookies.set('pulse_session', token)
    assert (await client.get('/api/pulse/auth/me')).status_code == 401


@pytest.mark.asyncio
async def test_viewer_cannot_mutate_and_password_change_revokes(client, db):
    from app.services.pulse_identity import provision_user
    await provision_user(db, 'viewer@example.com', 'Viewer', 'initial long password', 'viewer')
    h = {'Origin': 'http://localhost:5173'}
    r = await client.post('/api/pulse/auth/login', headers=h, json={'email': 'viewer@example.com', 'password': 'initial long password'})
    client.cookies.set('pulse_session', r.cookies.get('pulse_session'))
    h['X-Pulse-CSRF'] = r.json()['csrf_token']
    assert (await client.get('/api/admin/pulse/analytics')).status_code == 200
    assert (await client.post('/api/admin/pulse/topics', headers=h, json={'label':'x','query':'x'})).status_code == 403
    assert (await client.post('/api/pulse/auth/password', headers=h, json={'current_password':'wrong', 'new_password':'new long password 123'})).status_code == 400
    assert (await client.post('/api/pulse/auth/password', headers=h, json={'current_password':'initial long password', 'new_password':'new long password 123'})).status_code == 200
    assert (await client.get('/api/pulse/auth/me')).status_code == 401


@pytest.mark.asyncio
async def test_login_throttle_and_origin(client):
    body = {'email':'absent@example.com','password':'incorrect password'}
    assert (await client.post('/api/pulse/auth/login', json=body)).status_code == 403
    for _ in range(5):
        assert (await client.post('/api/pulse/auth/login', headers={'Origin':'http://localhost:5173'}, json=body)).status_code == 401
    assert (await client.post('/api/pulse/auth/login', headers={'Origin':'http://localhost:5173'}, json=body)).status_code == 429


@pytest.mark.asyncio
async def test_expired_and_disabled_sessions_are_denied(client, db):
    from datetime import datetime, timedelta
    from app.services.pulse_identity import provision_user, new_session
    user = await provision_user(db, 'expiry@example.com', 'Owner', 'long local password', 'owner')
    token, session = await new_session(db, user)
    client.cookies.set('pulse_session', token)
    session.expires_at = datetime.utcnow() - timedelta(seconds=1)
    await db.flush()
    assert (await client.get('/api/pulse/auth/me')).status_code == 401
    session.expires_at = datetime.utcnow() + timedelta(hours=1)
    user.active = False
    await db.flush()
    assert (await client.get('/api/admin/pulse/topics')).status_code == 401


@pytest.mark.asyncio
async def test_standalone_excludes_gerak_and_rejects_legacy_token(db, admin_token):
    from httpx import AsyncClient, ASGITransport
    from app.pulse_main import app
    from app.database import get_db
    async def override():
        yield db
    app.dependency_overrides[get_db] = override
    try:
        async with AsyncClient(transport=ASGITransport(app), base_url='http://localhost') as c:
            assert (await c.get('/api/auth/me')).status_code == 404
            assert (await c.get('/api/admin/pulse/topics', headers={'Authorization':f'Bearer {admin_token}'})).status_code == 401
            assert (await c.get('/api/admin/pulse/topics')).status_code == 401
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_nonlocal_plaintext_login_is_rejected(client, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), 'CORS_ORIGINS', ['http://pulse.example'])
    client.base_url = 'http://pulse.example'
    response = await client.post('/api/pulse/auth/login', headers={'Origin':'http://pulse.example'}, json={'email':'x@example.com','password':'wrong'})
    assert response.status_code == 403
    assert 'HTTPS' in response.json()['detail']


@pytest.mark.asyncio
async def test_remote_peer_cannot_spoof_loopback_or_replay_session_over_http(client, db, monkeypatch):
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.config import get_settings
    from app.services.pulse_identity import provision_user, new_session
    monkeypatch.setattr(get_settings(), 'CORS_ORIGINS', ['http://localhost:5173', 'http://pulse.example'])
    user = await provision_user(db, 'transport@example.com', 'Owner', 'long local password', 'owner')
    token, _ = await new_session(db, user)
    async with AsyncClient(transport=ASGITransport(app, client=('192.0.2.2', 1234)), base_url='http://localhost') as remote:
        r = await remote.post('/api/pulse/auth/login', headers={'Origin':'http://localhost:5173'}, json={'email':user.email,'password':'long local password'})
        assert r.status_code == 403 and 'HTTPS' in r.json()['detail']
        remote.base_url = 'http://pulse.example'
        r = await remote.get('/api/pulse/auth/me', headers={'Cookie':f'pulse_session={token}'})
        assert r.status_code == 403 and 'HTTPS' in r.json()['detail']


@pytest.mark.asyncio
async def test_password_guessing_is_throttled(client, db):
    from app.services.pulse_identity import provision_user, new_session
    user = await provision_user(db, 'guess@example.com', 'Owner', 'long local password', 'owner')
    token, row = await new_session(db, user)
    client.cookies.set('pulse_session', token)
    headers = {'Origin':'http://localhost:5173', 'X-Pulse-CSRF':row.csrf}
    for _ in range(5):
        assert (await client.post('/api/pulse/auth/password', headers=headers, json={'current_password':'wrong', 'new_password':'another long password'})).status_code == 400
    assert (await client.post('/api/pulse/auth/password', headers=headers, json={'current_password':'wrong', 'new_password':'another long password'})).status_code == 429


@pytest.mark.asyncio
async def test_ip_throttling_prevents_new_email_budget_rows(client, db):
    from sqlalchemy import select, func
    from app.models.pulse_identity import PulseLoginBudget
    for n in range(25):
        await client.post('/api/pulse/auth/login', headers={'Origin':'http://localhost:5173'}, json={'email':f'absent{n}@example.com','password':'wrong'})
    assert await db.scalar(select(func.count()).select_from(PulseLoginBudget)) == 21
