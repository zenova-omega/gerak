"""One real round of the issue radar, run by hand: `python -m app.pulse_radar_check [--save] [--social]`.

Reads the public lists, asks the answer engine once, and prints what came back: signals per platform, provinces read,
the issues in order, tokens, cost and time. Without `--save` nothing is stored and the page does not change; with it
the round is stored as a refresh, exactly as the scheduled job would. Use it to see the cost before the switch in
Monitor is turned on, and to fill a fresh installation once.

`--social` adds the paid steps whatever their switch says: the search of X, the count on X and the samples from X,
TikTok and Instagram for the ten highest issues. It prints the supplier credits the round used. Without `--save` it
carries nothing from earlier refreshes, so it shows the full price of a first round.
"""
import asyncio
import sys
import time
from datetime import datetime

from sqlalchemy import select

from .config import get_settings
from .database import async_session
from .models.pulse_radar import RadarIssue, RadarRun
from .services.ai import hosted
from .services.ingest import xpoz
from .services.ingest.common import credential
from .services.pulse_radar import assemble, refresh
from .services.pulse_radar_signals import PROVINCES

NAMES = {'news': 'berita', 'search': 'pencarian', 'youtube': 'video', 'x': 'X'}


def number(value, digits=0):
    """A figure the way the product writes it: 9.000 and 0,0330."""
    return f'{value:,.{digits}f}'.replace(',', ' ').replace('.', ',').replace(' ', '.')


def _figures(issue):
    parts = []
    platforms = issue['platforms']
    if 'news' in platforms:
        parts.append(f"berita {number(platforms['news']['count'])}")
    if 'x' in platforms:
        parts.append(f"X {number(platforms['x']['count'])}+ posting" if 'count' in platforms['x'] else f"X {platforms['x']['posts']} posting contoh")
    for name, label in (('tiktok', 'TikTok'), ('instagram', 'Instagram')):
        if name in platforms:
            parts.append(f"{label} {number(platforms[name]['found'])}{'+' if platforms[name].get('capped') else ''}")
    if 'youtube' in platforms:
        parts.append(f"video {number(platforms['youtube']['count'])}")
    if 'search' in platforms:
        parts.append(f"pencarian {number(platforms['search']['searches'])}+")
    if issue['regions']:
        parts.append(f"{len(issue['regions'])} provinsi")
    return ', '.join(parts)


async def credits(settings):
    """The supplier balance right now, or None when it cannot be read. Reading it costs nothing."""
    key = credential(settings, 'XPOZ_API_KEY')
    if not key:
        return None
    try:
        return (await xpoz.fetch_xpoz_account(key)).get('credits_remaining')
    except Exception:
        return None


async def run(save=False, social=False, *, settings=None, out=print):
    settings = settings or get_settings()
    before, clock = hosted.usage(), time.monotonic()
    balance = await credits(settings) if social else None
    if save:
        result = await refresh(async_session, settings, force=True, social=True if social else None)
        if result['run_id'] is None:
            out('Tidak dijalankan: pembaruan lain sedang berjalan.')
            return {'signals': 0, 'provinces_read': 0, 'national': 0, 'local': 0, 'cost_usd': 0.0, 'credits': None, 'state': result['state']}
        async with async_session() as db:
            stored = await db.get(RadarRun, result['run_id'])
            rows = (await db.execute(select(RadarIssue).where(RadarIssue.run_id == stored.id).order_by(RadarIssue.rank))).scalars().all()
        counts, missing, read, state = (stored.usage or {}).get('signals', {}), stored.missing or [], stored.provinces_read or [], stored.state
        issues = [{'scope': row.scope, 'rank': row.rank, 'title': row.title, 'category': row.category, 'platforms': row.platforms, 'regions': row.regions} for row in rows]
    else:
        # The same steps a scheduled refresh takes, in its order, with nothing read from or written to the database.
        built = await assemble(settings, datetime.utcnow(), social={'discovery': None, 'samples': {}, 'supplier': True} if social else None)
        counts, missing, read, issues, state = built['usage']['signals'], built['missing'], built['provinces_read'], built['issues'], built['state']
    after = hosted.usage()
    spent = None
    if social:
        left = await credits(settings)
        spent = balance - left if balance is not None and left is not None else None
    national = [issue for issue in issues if issue['scope'] != 'local']
    local = [issue for issue in issues if issue['scope'] == 'local']
    cost = round(after['cost_usd'] - before['cost_usd'], 6)

    out('Sinyal terbaca: ' + ', '.join(f"{NAMES[platform]} {number(counts.get(platform, 0))}" for platform in ('news', 'search', 'youtube', 'x') if platform != 'x' or counts.get('x')))
    out(f'Daftar provinsi terbaca: {len(read)} dari {len(PROVINCES)}')
    if missing:
        out('Tidak terbaca: ' + ', '.join(missing))
    if issues:
        out(f'Isu tersusun: {len(national)} nasional, {len(local)} lokal')
        for issue in national[:15]:
            out(f"  {issue['rank']}. {issue['title']} [{issue['category']}] {_figures(issue)}")
        for issue in local[:8]:
            out(f"  lokal: {issue['title']} [{issue['category']}] {_figures(issue)}")
    else:
        out('Isu tidak disusun: mesin jawaban berbayar tidak aktif, atau jawabannya tidak terbaca. Halaman akan menampilkan daftar mentah per platform.')
    out(f"AI: {number(after['input_tokens'] - before['input_tokens'])} token masuk, {number(after['output_tokens'] - before['output_tokens'])} token keluar, USD {number(cost, 4)}")
    if social:
        out('Kredit pemasok sosial terpakai: ' + (number(spent) if spent is not None else 'tidak terbaca'))
    out(f'Waktu: {number(time.monotonic() - clock, 1)} detik')
    out(f'Disimpan sebagai pembaruan ({state}).' if save else 'Tidak ada yang disimpan. Jalankan dengan --save untuk menyimpannya sebagai pembaruan.')
    return {'signals': sum(counts.values()), 'provinces_read': len(read), 'national': len(national), 'local': len(local), 'cost_usd': cost, 'credits': spent, 'state': state}


if __name__ == '__main__':
    asyncio.run(run(save='--save' in sys.argv[1:], social='--social' in sys.argv[1:]))
