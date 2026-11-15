"""One real round of the issue radar, run by hand: `python -m app.pulse_radar_check [--save]`.

Reads the public lists, asks the answer engine once, and prints what came back: signals per platform, provinces read,
the issues in order, tokens, cost and time. Without `--save` nothing is stored and the page does not change; with it
the round is stored as a refresh, exactly as the scheduled job would. Use it to see the cost before the switch in
Monitor is turned on, and to fill a fresh installation once.
"""
import asyncio
import sys
import time

from sqlalchemy import select

from .config import get_settings
from .database import async_session
from .models.pulse_radar import RadarIssue, RadarRun
from .services.ai import hosted
from .services.pulse_radar import PLATFORMS, attach, compose_issues, rank, refresh
from .services.pulse_radar_signals import PROVINCES, collect

NAMES = {'news': 'berita', 'search': 'pencarian', 'youtube': 'video'}


def number(value, digits=0):
    """A figure the way the product writes it: 9.000 and 0,0330."""
    return f'{value:,.{digits}f}'.replace(',', ' ').replace('.', ',').replace(' ', '.')


def _figures(issue):
    parts = []
    platforms = issue['platforms']
    if 'news' in platforms:
        parts.append(f"berita {number(platforms['news']['count'])}")
    if 'youtube' in platforms:
        parts.append(f"video {number(platforms['youtube']['count'])}")
    if 'search' in platforms:
        parts.append(f"pencarian {number(platforms['search']['searches'])}+")
    if issue['regions']:
        parts.append(f"{len(issue['regions'])} provinsi")
    return ', '.join(parts)


async def run(save=False, *, settings=None, out=print):
    settings = settings or get_settings()
    before, clock = hosted.usage(), time.monotonic()
    if save:
        result = await refresh(async_session, settings, force=True)
        if result['run_id'] is None:
            out('Tidak dijalankan: pembaruan lain sedang berjalan.')
            return {'signals': 0, 'provinces_read': 0, 'national': 0, 'local': 0, 'cost_usd': 0.0, 'state': result['state']}
        async with async_session() as db:
            stored = await db.get(RadarRun, result['run_id'])
            rows = (await db.execute(select(RadarIssue).where(RadarIssue.run_id == stored.id).order_by(RadarIssue.rank))).scalars().all()
        counts, missing, read, state = (stored.usage or {}).get('signals', {}), stored.missing or [], stored.provinces_read or [], stored.state
        issues = [{'scope': row.scope, 'rank': row.rank, 'title': row.title, 'category': row.category, 'platforms': row.platforms, 'regions': row.regions} for row in rows]
    else:
        gathered = await collect(settings)
        counts = {platform: sum(1 for row in gathered['signals'] if row['platform'] == platform) for platform in PLATFORMS}
        missing, read = gathered['missing'], gathered['provinces_read']
        composed = await compose_issues(settings, gathered['signals'], []) if gathered['signals'] else None     # the engines a scheduled refresh would ask, in its order
        signals = {row['id']: row for row in gathered['signals']}
        issues = rank([attach(issue, signals) for issue in composed['issues']]) if composed else []
        state = ('partial' if missing else 'ok') if issues else ('raw' if gathered['signals'] else 'failed')
    after = hosted.usage()
    national = [issue for issue in issues if issue['scope'] != 'local']
    local = [issue for issue in issues if issue['scope'] == 'local']
    cost = round(after['cost_usd'] - before['cost_usd'], 6)

    out('Sinyal terbaca: ' + ', '.join(f"{NAMES[platform]} {number(counts.get(platform, 0))}" for platform in ('news', 'search', 'youtube')))
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
    out(f'Waktu: {number(time.monotonic() - clock, 1)} detik')
    out(f'Disimpan sebagai pembaruan ({state}).' if save else 'Tidak ada yang disimpan. Jalankan dengan --save untuk menyimpannya sebagai pembaruan.')
    return {'signals': sum(counts.values()), 'provinces_read': len(read), 'national': len(national), 'local': len(local), 'cost_usd': cost, 'state': state}


if __name__ == '__main__':
    asyncio.run(run(save='--save' in sys.argv[1:]))
