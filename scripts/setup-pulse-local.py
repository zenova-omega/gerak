"""Non-destructive local prototype setup. Never prints secrets."""
import asyncio
import os
from pathlib import Path
import secrets
import sys

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / 'server'
os.chdir(SERVER)
sys.path.insert(0, str(SERVER))

def private_create(path, content):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as out:
        out.write(content)

env = SERVER / '.env'
if not env.exists():
    private_create(env, 'DATABASE_URL=sqlite+aiosqlite:///./pulse-prototype.db\n'
                   + 'JWT_SECRET=' + secrets.token_urlsafe(48) + '\n'
                   + 'ENABLE_SCHEDULER=false\nAI_PROVIDER=\nDEBUG=false\n')

async def main():
    from app.database import engine, Base, async_session
    from app import models  # registers metadata
    from app.models.user import User, Role
    from app.middleware.auth import hash_password
    from sqlalchemy import select
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as db:
        existing = await db.scalar(select(User).where(User.nrp == 'PULSEADMIN'))
        if existing is None:
            password = secrets.token_urlsafe(18)
            access = SERVER / '.prototype-access'
            if access.exists():
                raise RuntimeError('Access file exists without user; refusing overwrite.')
            private_create(access, 'NRP=PULSEADMIN\nPASSWORD=' + password + '\n')
            db.add(User(nrp='PULSEADMIN', name='Pulse Prototype Admin', role=Role.ADMIN,
                        password_hash=hash_password(password)))
            await db.commit()
            print('Prototype admin created; credentials in server/.prototype-access (600).')
        else:
            print('Prototype admin already exists; preserved.')
    await engine.dispose()

asyncio.run(main())
