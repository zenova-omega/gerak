"""Delete stored posts from the command line: on a person's request, or once they are past the retention period.

From `server/`:

    ../.venv/bin/python -m app.pulse_forget request --platform threads --author nama_akun
    ../.venv/bin/python -m app.pulse_forget request --url https://www.threads.net/@nama_akun/post/ABC
    ../.venv/bin/python -m app.pulse_forget expired
    ../.venv/bin/python -m app.pulse_forget expired --days 365

Each of these only counts: it prints how many things of each kind would go and writes nothing. Add `--apply` to
delete; the same list is then printed for what was deleted. `expired` uses PULSE_RETENTION_DAYS unless `--days` is
given, and says so when neither sets a limit.

A request is one transaction, so it is deleted whole or not at all. Expired posts go a few to a transaction, the way
the daily run deletes them, so the collectors keep writing in between. Only counts are printed: never the text of a
post, and no account name other than the one that was asked for. What exactly goes with a post is described in
`services/pulse_retention.py`.
"""
import argparse
import asyncio
import sys
from datetime import datetime, timedelta

from .services.pulse_retention import delete_expired, delete_posts, delete_request, expired_post_ids

# Every kind that is counted, in the order it is printed, in the words the app uses.
LABELS = (
    ('posts', 'posting'),
    ('metric_snapshots', 'catatan angka posting dari waktu ke waktu'),
    ('sentiment_jobs', 'antrean analisis sentimen'),
    ('reviews', 'tinjauan analis'),
    ('response_jobs', 'analisis tanggapan untuk posting dan komentarnya'),
    ('issues', 'kelompok percakapan yang tidak punya posting lagi'),
    ('alerts', 'peringatan'),
    ('summaries', 'ringkasan AI'),
    ('chat_turns', 'jawaban Tanya AI'),
    ('conversations', 'percakapan Tanya AI yang menjadi kosong'),
    ('profiles', 'profil akun (foto, jumlah pengikut, lokasi)'),
    ('report_entries', 'salinan posting di laporan tersimpan'),
    ('comments', 'komentar akun ini di bawah posting lain'),
    ('report_comments', 'komentar akun ini di laporan tersimpan'),
)
ONLY_ON_REQUEST = ('report_entries', 'comments', 'report_comments')    # retention never touches these
HOW_TO_APPLY = 'Untuk benar-benar menghapus, jalankan perintah yang sama dengan tambahan --apply'


def _arguments(argv):
    """The parsed command. One that does not say whose posts, which link or how many days is refused with exit code 2."""
    parser = argparse.ArgumentParser(prog='python -m app.pulse_forget', description='Hapus posting tersimpan PULSE. Tanpa --apply hanya menghitung.')
    commands = parser.add_subparsers(dest='command', required=True)
    request = commands.add_parser('request', help='hapus atas permintaan: posting satu akun di satu platform, atau satu posting lewat tautannya')
    request.add_argument('--platform', help='platform akun itu, misalnya threads, x, instagram, tiktok, youtube, news')
    request.add_argument('--author', help='nama akun seperti yang tampil di PULSE, dengan atau tanpa @')
    request.add_argument('--url', help='tautan posting, sama persis dengan yang tersimpan')
    request.add_argument('--apply', action='store_true', help='benar-benar menghapus')
    expired = commands.add_parser('expired', help='posting yang sudah lewat masa simpan')
    expired.add_argument('--days', type=int, help='masa simpan dalam hari; tanpa ini dipakai PULSE_RETENTION_DAYS')
    expired.add_argument('--apply', action='store_true', help='benar-benar menghapus')
    args = parser.parse_args(argv)
    if args.command == 'request':
        args.platform, args.author, args.url = ((value or '').strip() or None for value in (args.platform, args.author, args.url))
        if args.url and (args.platform or args.author):
            parser.error('pakai --url saja, atau --platform bersama --author; jangan keduanya')
        if not args.url and not (args.platform and args.author):
            parser.error('sebutkan --platform bersama --author, atau --url')
    elif args.days is not None and args.days < 1:
        parser.error('--days harus 1 atau lebih')
    return args


def _counted(counts, applied, skip=()):
    lines = ['SUDAH DIHAPUS:' if applied else 'BELUM ADA YANG DIHAPUS. Yang akan dihapus:']
    lines += [f'  {label}: {counts[kind]}' for kind, label in LABELS if kind not in skip]
    return lines


async def _request(args, session_factory):
    async with session_factory() as db:
        counts = await delete_request(db, args.platform, args.author, args.url, apply=args.apply)
        if args.apply:
            await db.commit()
    lines = [f'Permintaan hapus: tautan {args.url}' if args.url else f'Permintaan hapus: akun "{args.author}" di {args.platform}',
             *_counted(counts, args.apply)]
    if not any(counts.values()):
        lines.append('Tidak ada data tersimpan yang cocok. Nama akun dicocokkan seperti yang tampil di PULSE, dan tautan harus sama persis dengan yang tersimpan.')
    elif not args.apply:
        lines.append(HOW_TO_APPLY)
    return lines


async def _expired(args, session_factory, settings, now):
    days = args.days if args.days is not None else settings.PULSE_RETENTION_DAYS
    if days <= 0:
        return ['Masa simpan belum diatur (PULSE_RETENTION_DAYS=0), jadi tidak ada yang dianggap lewat masa simpan dan tidak ada yang dihapus.',
                'Untuk menghitung dengan masa simpan tertentu, tambahkan --days, misalnya: expired --days 365']
    if args.apply:
        counts = await delete_expired(session_factory, now, days)
    else:
        async with session_factory() as db:
            counts = await delete_posts(db, await expired_post_ids(db, now, days), apply=False)
    lines = [f'Masa simpan: {days} hari. Yang dihitung: posting yang terbit sebelum {now - timedelta(days=days):%Y-%m-%d %H:%M} UTC;',
             'posting tanpa tanggal terbit dihitung dari terakhir kali terlihat oleh pengumpul.',
             *_counted(counts, args.apply, skip=ONLY_ON_REQUEST)]
    if counts['posts'] and not args.apply:
        lines.append(HOW_TO_APPLY)
    return lines


async def run(argv, *, session_factory, settings, now):
    """Carry out one command and return the lines to print. Nothing is deleted unless `argv` has `--apply`."""
    args = _arguments(argv)
    if args.command == 'expired':
        return await _expired(args, session_factory, settings, now)
    return await _request(args, session_factory)


async def _main(argv):
    from .config import get_settings
    from .database import async_session, engine
    try:
        return await run(argv, session_factory=async_session, settings=get_settings(), now=datetime.utcnow())
    finally:
        await engine.dispose()


def main():
    for line in asyncio.run(_main(sys.argv[1:])):
        print(line)


if __name__ == '__main__':
    main()
