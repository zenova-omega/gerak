"""Single-organization PULSE identity; deliberately separate from GERAK JWTs."""
import hashlib
import secrets
import re
import ipaddress
import time
from urllib.parse import urlsplit
from starlette.concurrency import run_in_threadpool
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, update, delete
from ..database import get_db
from ..config import get_settings
from ..models.pulse_identity import PulseUser, PulseSession, PulseLoginBudget, PulseAudit
from ..middleware.auth import get_current_user, require_admin

COOKIE = 'pulse_session'
optional_bearer = HTTPBearer(auto_error=False)


def password_hash(password):
    if not 12 <= len(password) <= 128:
        raise ValueError('Password harus 12–128 karakter.')
    salt = secrets.token_hex(24)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600000).hex()
    return f'pbkdf2_sha256$600000${salt}${digest}'


def password_matches(password, encoded):
    try:
        _, iterations, salt, digest = encoded.split('$')
        result = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), int(iterations)).hex()
        return secrets.compare_digest(result, digest)
    except (ValueError, TypeError):
        return False


def token_digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def check_origin(request):
    # No forwarded-host trust. Configure the exact on-prem frontend origin.
    if request.headers.get('origin') not in get_settings().CORS_ORIGINS:
        raise HTTPException(403, 'Origin tidak diizinkan')


def check_transport(request):
    allowed_hosts = {urlsplit(origin).hostname for origin in get_settings().CORS_ORIGINS}
    if request.url.hostname not in allowed_hosts:
        raise HTTPException(403, 'Host PULSE tidak diizinkan')
    if request.url.scheme == 'https':
        return
    try:
        local_peer = bool(request.client) and ipaddress.ip_address(request.client.host).is_loopback
    except ValueError:
        local_peer = False
    if not (local_peer and request.url.hostname in ('localhost', '127.0.0.1', '::1')):
        raise HTTPException(403, 'HTTPS wajib untuk akses PULSE melalui jaringan')


async def provision_user(db, email, name, password, role='viewer'):
    email = email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or len(email) > 254:
        raise ValueError('Email tidak valid.')
    if role not in ('owner', 'admin', 'analyst', 'viewer') or not name.strip() or len(name) > 100:
        raise ValueError('Nama atau peran tidak valid.')
    if await db.scalar(select(PulseUser.id).where(PulseUser.email == email)):
        raise ValueError('Email sudah terdaftar.')
    user = PulseUser(email=email, name=name.strip(), role=role, password_hash=await run_in_threadpool(password_hash, password))
    db.add(user)
    await db.flush()
    db.add(PulseAudit(user_id=user.id, action='user_provisioned_locally'))
    return user


async def login_budget(db, request, email, purpose='login'):
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    insert = sqlite_insert if db.bind.dialect.name == 'sqlite' else pg_insert
    bucket = int(time.time()) // 900
    ip = request.client.host if request.client else 'unknown'
    # Reservations are atomic across processes. Count attempts, including successes.
    # Fixed-width bucket prefix permits bounded retention without another migration.
    await db.execute(delete(PulseLoginBudget).where(PulseLoginBudget.key < f'{bucket - 2:012d}:'))
    for subject, limit in [('ip:' + ip, 20), ('email:' + email, 5)]:
        key = f'{bucket:012d}:{token_digest(purpose + subject)}'
        await db.execute(insert(PulseLoginBudget).values(key=key, used=0).on_conflict_do_nothing())
        result = await db.execute(update(PulseLoginBudget).where(PulseLoginBudget.key == key, PulseLoginBudget.used < limit).values(used=PulseLoginBudget.used + 1))
        if not result.rowcount:
            return False
    return True


async def session_identity(request: Request, db=Depends(get_db)):
    check_transport(request)
    token = request.cookies.get(COOKIE, '')
    row = await db.get(PulseSession, token_digest(token)) if token else None
    if not row or row.expires_at <= datetime.utcnow():
        raise HTTPException(401, 'Sesi PULSE berakhir. Silakan masuk kembali.')
    user = await db.get(PulseUser, row.user_id)
    if not user or not user.active:
        raise HTTPException(401, 'Sesi tidak valid')
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        check_origin(request)
        if not secrets.compare_digest(request.headers.get('x-pulse-csrf', ''), row.csrf):
            raise HTTPException(403, 'Token CSRF tidak valid')
    request.state.pulse_session = row
    return user


async def require_pulse_access(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer), db=Depends(get_db)):
    # Existing embedded deployment retains GERAK admin access; standalone server doesn't.
    if credentials and not getattr(request.app.state, 'pulse_only', False):
        return await require_admin(await get_current_user(credentials, db))
    if not credentials and not request.cookies.get(COOKIE) and not getattr(request.app.state, 'pulse_only', False):
        raise HTTPException(403, 'Autentikasi diperlukan')
    user = await session_identity(request, db)
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        # The spike rule answers from its own request: it reads no project data and stores nothing (routers/pulse_spikes.py).
        # It is a POST only because a series does not fit in an address. So any signed-in role may ask, and asking
        # leaves no line in the audit trail; the session's CSRF check above has already been made.
        if request.method == 'POST' and request.url.path.endswith('/admin/pulse/spikes'):
            return user
        permitted = user.role in ('owner', 'admin')
        if user.role == 'analyst' and request.url.path.endswith('/ack'):
            permitted = True
        if not permitted:
            raise HTTPException(403, 'Peran Anda tidak boleh mengubah pengaturan atau menjalankan crawl.')
        db.add(PulseAudit(user_id=user.id, action=request.method + ' ' + request.url.path[:70]))
    return user


async def new_session(db, user):
    token = secrets.token_urlsafe(48)
    row = PulseSession(digest=token_digest(token), user_id=user.id,
                       csrf=secrets.token_urlsafe(32), expires_at=datetime.utcnow() + timedelta(hours=8))
    db.add(row)
    await db.flush()
    return token, row


def identity_payload(user, session):
    return {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role, 'csrf_token': session.csrf}


async def revoke_sessions(db, user_id):
    await db.execute(delete(PulseSession).where(PulseSession.user_id == user_id))
