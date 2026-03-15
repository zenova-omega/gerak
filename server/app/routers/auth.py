from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.user import User
from ..models.audit import AuditLog
from ..middleware.rate_limit import login_limiter
from ..schemas import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest, UserResponse
from ..middleware.auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user, require_admin,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"

    # Rate limiting
    await login_limiter.check(client_ip)

    result = await db.execute(select(User).where(User.nrp == req.nrp))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        # Audit failed login
        db.add(AuditLog(action="login_failed", detail=f"NRP: {req.nrp}", ip_address=client_ip))
        raise HTTPException(status_code=401, detail="NRP atau password salah")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun tidak aktif")

    # Clear rate limit on success
    await login_limiter.reset(client_ip)

    # Audit successful login
    db.add(AuditLog(user_id=user.id, action="login_success", ip_address=client_ip))

    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user={
            "id": user.id, "nrp": user.nrp, "name": user.name,
            "role": user.role.value, "account_type": user.account_type.value,
            "rank": user.rank, "xp": user.xp, "tier": user.tier.value,
        },
    )


@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    # Check if NRP already exists
    existing = await db.execute(select(User).where(User.nrp == req.nrp))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="NRP sudah terdaftar")

    user = User(
        nrp=req.nrp,
        name=req.name,
        password_hash=hash_password(req.password),
        role=req.role,
        account_type=req.account_type,
        satuan=req.satuan,
        kodam_id=req.kodam_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token type tidak valid")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User tidak ditemukan")

    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user={
            "id": user.id, "nrp": user.nrp, "name": user.name,
            "role": user.role.value, "account_type": user.account_type.value,
            "rank": user.rank, "xp": user.xp, "tier": user.tier.value,
        },
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user
