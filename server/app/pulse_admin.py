"""Run locally: python -m app.pulse_admin create --email owner@example.com --name Owner --role owner."""
import argparse
import asyncio
import getpass
from sqlalchemy import select
from .database import Base, engine, async_session
from .models.pulse_identity import PulseUser, PulseAudit
from .services.pulse_identity import provision_user, password_hash, revoke_sessions


async def execute(args):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    password = getpass.getpass('Password baru (12–128 karakter): ')
    if password != getpass.getpass('Ulangi password: '):
        raise ValueError('Password tidak sama.')
    async with async_session() as db:
        if args.action == 'create':
            await provision_user(db, args.email, args.name, password, args.role)
        else:
            user = await db.scalar(select(PulseUser).where(PulseUser.email == args.email.strip().lower()))
            if not user:
                raise ValueError('Akun tidak ditemukan.')
            user.password_hash = password_hash(password)
            await revoke_sessions(db, user.id)
            db.add(PulseAudit(user_id=user.id, action='password_reset_locally'))
        await db.commit()
    print('Akun PULSE diperbarui. Password tidak disimpan dalam file atau riwayat shell.')
    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description='Administrasi lokal PULSE; tidak ada default password.')
    parser.add_argument('action', choices=['create', 'reset-password'])
    parser.add_argument('--email', required=True)
    parser.add_argument('--name', default='PULSE administrator')
    parser.add_argument('--role', choices=['owner', 'admin', 'analyst', 'viewer'], default='viewer')
    try:
        asyncio.run(execute(parser.parse_args()))
    except ValueError as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
