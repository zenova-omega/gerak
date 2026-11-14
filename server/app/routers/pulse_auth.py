from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from starlette.concurrency import run_in_threadpool
from ..database import get_db
from ..models.pulse_identity import PulseUser, PulseSession, PulseAudit
from ..services.pulse_identity import (
    COOKIE, check_origin, check_transport, login_budget, password_matches, password_hash,
    new_session, identity_payload, session_identity, revoke_sessions,
)

router = APIRouter()


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


@router.get('/status')
async def status(db=Depends(get_db)):
    return {'configured': bool(await db.scalar(select(PulseUser.id).limit(1)))}


@router.post('/login')
async def login(body: Login, request: Request, response: Response, db=Depends(get_db)):
    check_transport(request)
    check_origin(request)
    email = body.email.strip().lower()
    if not await login_budget(db, request, email):
        return JSONResponse({'detail': 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'}, status_code=429, headers={'Retry-After': '900'})
    user = await db.scalar(select(PulseUser).where(PulseUser.email == email))
    # Unknown accounts perform the same KDF workload, without exposing account existence.
    encoded = user.password_hash if user else 'pbkdf2_sha256$600000$dummy$' + '0' * 64
    valid = await run_in_threadpool(password_matches, body.password, encoded)
    if not user or not user.active or not valid:
        db.add(PulseAudit(action='login_failed'))
        return JSONResponse({'detail': 'Email atau password salah.'}, status_code=401)
    old = request.cookies.get(COOKIE)
    if old:
        from ..services.pulse_identity import token_digest
        await db.execute(delete(PulseSession).where(PulseSession.digest == token_digest(old)))
    token, session = await new_session(db, user)
    # HTTP exception is strictly for local development; LAN deployments require HTTPS.
    local_http = request.url.hostname in ('localhost', '127.0.0.1', '::1') and request.url.scheme == 'http'
    response.set_cookie(COOKIE, token, httponly=True, secure=not local_http, samesite='strict', max_age=28800, path='/api')
    response.headers['Cache-Control'] = 'no-store'
    db.add(PulseAudit(user_id=user.id, action='login_success'))
    return identity_payload(user, session)


@router.get('/me')
async def me(request: Request, response: Response, user=Depends(session_identity)):
    response.headers['Cache-Control'] = 'no-store'
    return identity_payload(user, request.state.pulse_session)


@router.post('/logout')
async def logout(request: Request, response: Response, user=Depends(session_identity), db=Depends(get_db)):
    await db.delete(request.state.pulse_session)
    await db.flush()
    db.add(PulseAudit(user_id=user.id, action='logout'))
    response.delete_cookie(COOKIE, path='/api')
    return {'ok': True}


@router.post('/password')
async def change_password(body: PasswordChange, request: Request, response: Response, user=Depends(session_identity), db=Depends(get_db)):
    if not await login_budget(db, request, user.email, purpose='password'):
        return JSONResponse({'detail': 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'}, status_code=429, headers={'Retry-After': '900'})
    if not await run_in_threadpool(password_matches, body.current_password, user.password_hash):
        return JSONResponse({'detail': 'Password saat ini tidak cocok.'}, status_code=400)
    user.password_hash = await run_in_threadpool(password_hash, body.new_password)
    await revoke_sessions(db, user.id)
    db.add(PulseAudit(user_id=user.id, action='password_changed'))
    response.delete_cookie(COOKIE, path='/api')
    return {'ok': True}
