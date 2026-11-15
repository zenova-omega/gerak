"""Save a Threads token into `server/.env` without anyone reading it.

Copy the token in the browser, then from `server/`:

    pbpaste | ../.venv/bin/python -m app.pulse_threads_token

and, with the app secret copied instead, to save it and swap the saved token for one that lasts sixty days:

    pbpaste | ../.venv/bin/python -m app.pulse_threads_token secret

The token is read from standard input, shown to the platform to learn what it may do and until when it lasts, and
written over the old `THREADS_ACCESS_TOKEN` line. A token that lasts less than two days is first swapped for one
that lasts sixty, when `THREADS_APP_SECRET` is set. Only the report is printed: never the token or the secret. They
travel in a header or a request body, never in an address.
"""
import asyncio
import os
import re
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import httpx

from .services.threads_connection import describe_token

EXCHANGE_URL = 'https://graph.threads.net/access_token'
PLAUSIBLE = re.compile(r'[A-Za-z0-9_\-|.]{20,600}')
SHORT = timedelta(days=2)
NAME = 'THREADS_ACCESS_TOKEN'
SECRET_NAME = 'THREADS_APP_SECRET'
SECRET = re.compile(r'[A-Za-z0-9]{16,64}')     # a token is far longer, so one pasted by mistake is not taken for the secret


def write_env(path, name, value):
    """Set `name=value` in an env file: the first line for `name` is replaced, later ones are dropped, every other
    line is kept as it is. The file is replaced in one step and keeps its permissions (owner-only when new)."""
    path = Path(path)
    mode = path.stat().st_mode & 0o777 if path.exists() else 0o600
    own = re.compile(r'\s*(?:export\s+)?' + re.escape(name) + r'\s*=')
    lines, written = [], False
    for line in (path.read_text().splitlines() if path.exists() else []):
        if own.match(line):
            if not written:
                lines.append(f'{name}={value}')
                written = True
            continue
        lines.append(line)
    if not written:
        lines.append(f'{name}={value}')
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix='.env-')
    try:
        with os.fdopen(handle, 'w') as out:
            out.write('\n'.join(lines) + '\n')
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    except BaseException:
        if os.path.exists(temporary):
            os.unlink(temporary)
        raise


def read_env(path, name):
    """The value an env file holds for `name` (its first line for it), or None."""
    path = Path(path)
    own = re.compile(r'\s*(?:export\s+)?' + re.escape(name) + r'\s*=(.*)')
    for line in (path.read_text().splitlines() if path.exists() else []):
        found = own.match(line)
        if found:
            return found[1].strip().strip('"\'')
    return None


async def _exchange(client, token, secret):
    """A short-lived token for one that lasts sixty days, or None when the platform refuses."""
    try:
        response = await client.post(EXCHANGE_URL, follow_redirects=False, timeout=30,
                                     data={'method': 'GET', 'grant_type': 'th_exchange_token', 'client_secret': secret, 'access_token': token})
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        return None
    lasting = payload.get('access_token') if response.status_code == 200 and isinstance(payload, dict) else None
    return lasting if isinstance(lasting, str) and PLAUSIBLE.fullmatch(lasting) else None


async def store(pasted, env_path, *, secret='', client=None, now=None):
    """Check a pasted token with the platform and save it. Returns the report; the token is in none of its values."""
    if client is None:
        async with httpx.AsyncClient() as session:
            return await store(pasted, env_path, secret=secret, client=session, now=now)
    token = (pasted or '').strip()
    if not PLAUSIBLE.fullmatch(token):
        return {'saved': False, 'note': 'not_a_token'}
    described = await describe_token(client, token)
    if not described['permissions_verified']:
        return {'saved': False, 'note': 'refused'}
    now = now or datetime.utcnow()
    expires = datetime.fromisoformat(described['expires_at']) if described['expires_at'] else None
    exchanged, note = False, None
    if expires is not None and expires - now < SHORT:
        lasting = await _exchange(client, token, secret) if secret else None
        again = await describe_token(client, lasting) if lasting else None
        if again and again['permissions_verified']:
            token, described, exchanged = lasting, again, True
        else:
            note = 'exchange_refused' if secret else 'short_lived'
    if read_env(env_path, NAME) == token:
        note = note or 'same_as_saved'          # the clipboard still held the old one: nothing to write
    else:
        write_env(env_path, NAME, token)
    return {'saved': True, 'application': described['application'], 'permissions': described['permissions'],
            'search_permission': described['search_permission'], 'expires_at': described['expires_at'], 'exchanged': exchanged, 'note': note}


async def store_secret(pasted, env_path, *, client=None, now=None):
    """Save the app secret, then swap the token that is already saved for one that lasts sixty days.

    Returns a report without the secret or the token. With no token saved yet the secret is kept for the next one."""
    secret = (pasted or '').strip()
    if not SECRET.fullmatch(secret):
        return {'secret_saved': False, 'note': 'not_a_secret'}
    write_env(env_path, SECRET_NAME, secret)
    token = read_env(env_path, NAME)
    if not token:
        return {'secret_saved': True, 'saved': False, 'note': 'no_token'}
    return {'secret_saved': True, **await store(token, env_path, secret=secret, client=client, now=now)}


NOTES = {
    'not_a_token': 'yang ditempel tidak berbentuk token (kosong, terpotong, atau berisi spasi)',
    'refused': 'Threads tidak mengenali token ini (salah salin, sudah kedaluwarsa, atau milik aplikasi lain)',
    'short_lived': 'token ini berumur pendek. Salin "Threads app secret" (Use cases, Access the Threads API, Settings, tombol Show) lalu jalankan: pbpaste | ../.venv/bin/python -m app.pulse_threads_token secret',
    'exchange_refused': 'penukaran ke token 60 hari ditolak; token berumur pendek yang disimpan',
    'same_as_saved': 'token ini SAMA dengan yang sudah tersimpan, tidak ada yang berubah. Salin token baru di browser lalu jalankan lagi',
}
NO_SEARCH = ('token ini tidak bisa mencari keyword. Token dari "User Token Generator" memang tidak membawa izin itu. Buat token di '
             'Graph API Explorer: host threads.net, Meta App Pulse, tombol "Generate Threads Access Token", lalu "Copy Token"')


SECRET_NOTES = {
    'not_a_secret': 'yang ditempel tidak berbentuk app secret (deretan huruf dan angka tanpa spasi; bukan token)',
    'no_token': 'belum ada token yang tersimpan. Simpan token dulu, penukaran berjalan saat itu',
    'refused': 'token yang tersimpan tidak dikenali Threads lagi (mungkin sudah kedaluwarsa). Buat token baru di Graph API Explorer lalu simpan',
    'exchange_refused': 'penukaran ditolak. Pastikan yang disalin adalah "Threads app secret" di Use cases, Access the Threads API, Settings (bukan App secret di App settings), lalu jalankan lagi',
    'same_as_saved': 'token yang tersimpan sudah berumur panjang, tidak ada yang perlu ditukar',
}


def _print_token(report):
    print('aplikasi:', report['application'] or 'tidak disebut')
    print('izin:', ', '.join(report['permissions']) or 'tidak ada')
    print('pencarian keyword:', 'ada' if report['search_permission'] else 'TIDAK ADA di token ini')
    print('berlaku sampai:', (report['expires_at'] or 'tidak disebut').replace('T', ' ') + ' UTC')


def main():
    from .config import SERVER_DIR, get_settings
    from .services.ingest.common import credential
    env = SERVER_DIR / '.env'
    if sys.argv[1:] == ['secret']:
        report = asyncio.run(store_secret(sys.stdin.read(), env))
        if not report['secret_saved']:
            print('tidak disimpan:', SECRET_NOTES[report['note']])
            raise SystemExit(1)
        print('app secret tersimpan')
        if not report['saved']:
            print('catatan:', SECRET_NOTES[report['note']])
            raise SystemExit(1)
        print('token ditukar menjadi token 60 hari' if report['exchanged'] else 'token TIDAK ditukar')
        _print_token(report)
        if report['note']:
            print('catatan:', SECRET_NOTES.get(report['note'], NOTES[report['note']]))
        raise SystemExit(0 if report['exchanged'] or report['note'] == 'same_as_saved' else 1)
    report = asyncio.run(store(sys.stdin.read(), env, secret=credential(get_settings(), SECRET_NAME)))
    if not report['saved']:
        print('tidak disimpan:', NOTES[report['note']])
        raise SystemExit(1)
    print('TIDAK BERUBAH' if report['note'] == 'same_as_saved' else 'tersimpan' + (' (sudah ditukar menjadi token 60 hari)' if report['exchanged'] else ''))
    _print_token(report)
    if report['note']:
        print('catatan:', NOTES[report['note']])
    if not report['search_permission']:
        print('langkah berikutnya:', NO_SEARCH)


if __name__ == '__main__':
    main()
