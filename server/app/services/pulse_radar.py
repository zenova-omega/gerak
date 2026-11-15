"""The issue radar: one refresh from public signals to a stored, ranked list of what Indonesia is talking about.

A refresh reads the lists, asks the answer engine to group them into issues, then decides everything else here: how
loud an issue is on each platform, in which provinces, and in what order. The slow steps (network, model) run with
no database session open. One refresh at a time, held by a lease on the radar's row beside the other worker switches.
"""
import asyncio
import logging
import re
import time
import uuid
from datetime import datetime, timedelta

from sqlalchemy import delete, func, or_, select, update

from ..config import get_settings
from ..database import async_session
from ..models.pulse_monitor import WorkerPolicy
from ..models.pulse_radar import RadarIssue, RadarRun
from .ai import _hosted_ready, get_ai_service, get_bulk_ai_service
from .pulse_monitor import insert_once
from .pulse_radar_compose import compose
from .pulse_radar_signals import collect

PROVIDER = 'radar'
INTERVAL_MINUTES = 30
KEEP_DAYS = 30
COLLECT_SECONDS = 240      # reading every list took 20 s on a real round; a source that hangs must not outlast the lock
COMPOSE_SECONDS = 300      # the answer engine needed 115 s on a real round (15 Nov 2026); 120 s lost the refresh
FALLBACK_SECONDS = 120     # the faster engine, asked only when the first gave nothing; it needed 20 s
LEASE_SECONDS = 900        # longer than reading the lists and both waits together
EVIDENCE_PER_PLATFORM = 5
LIST_ROWS = 10             # the rows the page lists; the brief only cites these
RAW_ROWS = 20
PLATFORMS = ('news', 'youtube', 'search')
COMPOSED = ('ok', 'partial')

log = logging.getLogger('uvicorn.error')


def _searches(signal):
    return max([signal.get('figure') or 0, *signal.get('provinces', {}).values()])


def attach(issue, signals):
    """Give an issue its figures, provinces and evidence, all read from the signals it cites."""
    cited = [signals[name] for name in issue['signal_ids'] if name in signals]
    stories = [row for row in cited if row['platform'] == 'news']
    videos = sorted((row for row in cited if row['platform'] == 'youtube'), key=lambda row: -(row['figure'] or 0))
    terms = [row for row in cited if row['platform'] == 'search']
    platforms = {}
    if stories:
        platforms['news'] = {'count': sum(1 + (row['figure'] or 0) for row in stories)}      # the story and the other coverage listed under it
    if videos:
        platforms['youtube'] = {'count': len(videos), 'views': sum(row['figure'] or 0 for row in videos)}
    if terms:
        platforms['search'] = {'searches': max(_searches(row) for row in terms)}
    regions = {}
    for row in terms:
        for code, count in row.get('provinces', {}).items():
            regions[code] = max(count, regions.get(code, 0))

    def item(platform, row, figure):
        return {'platform': platform, 'title': row['title'], 'url': row.get('url'), 'source': row.get('source'), 'figure': figure}
    coverage = []
    for row in stories:
        coverage.append(item('news', row, row['figure']))
        coverage.extend(item('news', other, None) for other in row.get('related', []))
    for row in terms:       # the news a search list shows beside a term is coverage of the same story
        coverage.extend(item('news', other, None) for other in row.get('related', []))
    evidence = (coverage[:EVIDENCE_PER_PLATFORM] + [item('youtube', row, row['figure']) for row in videos[:EVIDENCE_PER_PLATFORM]]
                + [item('search', row, _searches(row)) for row in terms[:EVIDENCE_PER_PLATFORM]])
    return {**issue, 'platforms': platforms, 'evidence': evidence,
            'regions': [{'code': code, 'searches': count} for code, count in sorted(regions.items(), key=lambda pair: (-pair[1], pair[0]))]}


def loudness(issue, platform):
    """The one figure an issue is ordered by on a platform, or None when it is not on it."""
    figures = issue['platforms'].get(platform)
    if not figures:
        return None
    return figures['count'] if platform == 'news' else figures['views'] if platform == 'youtube' else figures['searches']


def rank(issues):
    """National issues by where they stand on each platform, more platforms counting for more; local issues after
    them, by how many provinces and how many searches. The order has to be explainable in one sentence."""
    national = [dict(issue) for issue in issues if issue['scope'] != 'local']
    local = [dict(issue) for issue in issues if issue['scope'] == 'local']
    for issue in national:
        issue['score'] = 0.5 * max(0, len(issue['platforms']) - 1)
    for platform in PLATFORMS:
        on_it = sorted((issue for issue in national if loudness(issue, platform) is not None), key=lambda issue: (-loudness(issue, platform), issue['title']))
        for position, issue in enumerate(on_it):
            issue['score'] += 1 - position / len(on_it)
    national.sort(key=lambda issue: (-issue['score'], issue['title']))
    local.sort(key=lambda issue: (-len(issue['regions']), -(loudness(issue, 'search') or 0), issue['title']))
    for issue in local:
        issue['score'] = 0.0
    ordered = national + local
    for position, issue in enumerate(ordered, 1):
        issue['rank'], issue['score'] = position, round(issue['score'], 4)
    return ordered


def brief_with_ranks(brief, issues):
    """The brief as the page shows it: each "[#key]" becomes the row number of that issue in the national list, and a
    reference to an issue that is not among the listed rows is taken out."""
    if not brief:
        return brief
    rows = {issue['key']: issue['rank'] for issue in issues if issue['scope'] != 'local' and issue['rank'] <= LIST_ROWS}
    return re.sub(r'\s*\[#([^\]]+)\]', lambda found: f' [{rows[found.group(1)]}]' if found.group(1) in rows else '', brief)


def _raw(signals):
    """The head of each list as it was read, for the view that is shown when the lists could not be composed."""
    out = {platform: [] for platform in PLATFORMS}
    for row in signals:
        rows = out.get(row['platform'])
        if rows is not None and len(rows) < RAW_ROWS:
            rows.append({'title': row['title'], 'url': row.get('url'), 'source': row.get('source'),
                         'figure': _searches(row) if row['platform'] == 'search' else row.get('figure')})
    return out


def engines_for(settings, ai=None):
    """Who is asked to group the signals, in order, each as (how to get it, seconds it is given). An engine handed in is
    the only one. Otherwise the hosted answer engine, then the faster one; an installation on the local model has none."""
    if ai is not None:
        return [(lambda: ai, COMPOSE_SECONDS)]
    if not _hosted_ready(settings):
        return []
    return [(lambda: get_ai_service(settings), COMPOSE_SECONDS), (lambda: get_bulk_ai_service(settings), FALLBACK_SECONDS)]


async def compose_issues(settings, signals, previous, ai=None):
    """The first composed list with at least one issue, or None when nobody produced one."""
    for make, seconds in engines_for(settings, ai):
        engine = make()
        if engine is None:
            continue
        composed = await compose(engine, signals, previous, timeout=seconds)
        if composed and composed['issues']:
            return composed
    return None


async def ensure_policy(db):
    """The radar's switch, beside the other worker switches. Off until someone turns it on."""
    await insert_once(db, WorkerPolicy, {'provider': PROVIDER, 'daily_limit': 0})


async def composed_run(db, before=None):
    """The newest run that produced issues."""
    query = select(RadarRun).where(RadarRun.state.in_(COMPOSED)).order_by(RadarRun.started_at.desc()).limit(1)
    if before is not None:
        query = query.where(RadarRun.started_at < before)
    return (await db.execute(query)).scalars().first()


async def _release(session_factory, token):
    async with session_factory() as db:
        await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == PROVIDER, WorkerPolicy.lease_token == token).values(lease_until=None, lease_token=None))
        await db.commit()


async def refresh(session_factory, settings=None, *, ai=None, client=None, now=None, force=False):
    """Run one refresh. Returns {'state', 'run_id'}: the stored run's state, or 'off' (the switch is off and this was
    not forced) or 'busy' (another refresh holds the lease), both without a run."""
    settings = settings or get_settings()
    now = now or datetime.utcnow()
    token = str(uuid.uuid4())
    async with session_factory() as db:
        await ensure_policy(db)
        free = [WorkerPolicy.provider == PROVIDER, or_(WorkerPolicy.lease_until.is_(None), WorkerPolicy.lease_until <= now)]
        if not force:
            free.append(WorkerPolicy.daily_limit != 0)
        won = await db.execute(update(WorkerPolicy).where(*free).values(lease_until=now + timedelta(seconds=LEASE_SECONDS), lease_token=token))
        if not won.rowcount:
            policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
            await db.commit()
            return {'state': 'off' if not force and policy.daily_limit == 0 else 'busy', 'run_id': None}
        last = await composed_run(db, before=now)
        previous = [] if last is None else [{'key': row.key, 'title': row.title, 'first_seen_at': row.first_seen_at} for row in
                                            (await db.execute(select(RadarIssue).where(RadarIssue.run_id == last.id).order_by(RadarIssue.rank))).scalars()]
        await db.commit()
    try:
        # No session is open from here until the result is written.
        clock = time.monotonic()
        gathered, composed, state = {'signals': [], 'missing': [], 'provinces_read': []}, None, 'failed'
        try:
            gathered = await asyncio.wait_for(collect(settings, client=client), COLLECT_SECONDS)
            if gathered['signals']:
                composed = await compose_issues(settings, gathered['signals'], [{'key': row['key'], 'title': row['title']} for row in previous], ai)
                state = ('partial' if gathered['missing'] else 'ok') if composed else 'raw'
        except Exception:
            log.exception('radar: refresh failed')
            gathered, composed, state = {'signals': [], 'missing': [], 'provinces_read': []}, None, 'failed'
        signals = {row['id']: row for row in gathered['signals']}
        issues = rank([attach(issue, signals) for issue in composed['issues']]) if state in COMPOSED else []
        first_seen = {row['key']: row['first_seen_at'] for row in previous}
        counts = {platform: sum(1 for row in gathered['signals'] if row['platform'] == platform) for platform in PLATFORMS}
        run_id = str(uuid.uuid4())
        async with session_factory() as db:
            db.add(RadarRun(id=run_id, started_at=now, finished_at=datetime.utcnow(), state=state, missing=list(gathered['missing']),
                            provinces_read=list(gathered['provinces_read']), brief=brief_with_ranks(composed.get('brief'), issues) if issues else None, raw=_raw(gathered['signals']),
                            usage={'signals': counts, 'issues': len(issues), 'seconds': round(time.monotonic() - clock, 1)}))
            for issue in issues:
                db.add(RadarIssue(run_id=run_id, key=issue['key'], scope=issue['scope'], rank=issue['rank'], title=issue['title'], category=issue['category'],
                                  reason=issue['reason'], score=issue['score'], platforms=issue['platforms'], regions=issue['regions'], evidence=issue['evidence'],
                                  query=issue['query'], first_seen_at=first_seen.get(issue['key'], now)))
            cutoff = now - timedelta(days=KEEP_DAYS)
            await db.execute(delete(RadarIssue).where(RadarIssue.run_id.in_(select(RadarRun.id).where(RadarRun.started_at < cutoff))))
            await db.execute(delete(RadarRun).where(RadarRun.started_at < cutoff))
            await db.commit()
        log.info('radar: %s, %s signals, %s issues, %s missing', state, len(gathered['signals']), len(issues), len(gathered['missing']))
        return {'state': state, 'run_id': run_id}
    finally:
        await _release(session_factory, token)


async def radar_tick(now=None):
    """The scheduled check: refresh when the switch is on and the last refresh started an interval or more ago."""
    now = now or datetime.utcnow()
    try:
        async with async_session() as db:
            await ensure_policy(db)
            policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
            last = await db.scalar(select(func.max(RadarRun.started_at)))
            await db.commit()
        if policy.daily_limit == 0 or (last is not None and now - last < timedelta(minutes=INTERVAL_MINUTES)):
            return
        await refresh(async_session, get_settings(), now=now)
    except Exception:
        log.exception('radar: tick failed')


# ── What the page reads ─────────────────────────────────────────────────────────────────────────────────────────────

STALE_MINUTES = 60          # a composed list older than this is shown with a notice
RAW_AFTER_HOURS = 6         # with no composed list this recent, the raw lists are shown instead
MOVE_HOURS = 3              # movement is told against the list of about this long ago
MOVE_GAP_MINUTES = 90       # and never against one closer than this
MOVE_PLACES = 2
NEW_HOURS = 6


def _covering(issue, topics):
    """The first project whose keywords already catch this issue."""
    from .ingest.query_match import matches_query
    terms = [term.strip() for term in str((issue.query or {}).get('q') or '').split(',') if term.strip()]
    texts = [issue.title, *terms, ' '.join([issue.title, *terms])]
    for topic in topics:
        if any(matches_query(topic.query, text) for text in texts):
            return {'id': topic.id, 'label': topic.label}
    return None


def _for_reader(issue, movement=None, project=None):
    return {'key': issue.key, 'scope': issue.scope, 'rank': issue.rank, 'title': issue.title, 'category': issue.category, 'reason': issue.reason,
            'platforms': issue.platforms or {}, 'regions': issue.regions or [],
            'evidence_titles': [item['title'] for item in issue.evidence or [] if item.get('platform') != 'search'],
            'query': issue.query or {}, 'movement': movement, 'project': project}


async def _issues(db, run):
    return (await db.execute(select(RadarIssue).where(RadarIssue.run_id == run.id).order_by(RadarIssue.rank))).scalars().all()


async def _movements(db, shown, issues):
    """Movement of the national issues: new, or up or down against the list of about three hours earlier."""
    target = shown.started_at - timedelta(hours=MOVE_HOURS)
    earlier = (await db.execute(select(RadarRun).where(RadarRun.state.in_(COMPOSED), RadarRun.started_at <= shown.started_at - timedelta(minutes=MOVE_GAP_MINUTES),
                                                       RadarRun.started_at >= target - timedelta(hours=MOVE_HOURS)))).scalars().all()
    base = min(earlier, key=lambda run: abs((run.started_at - target).total_seconds()), default=None)
    before = {row.key: row.rank for row in await _issues(db, base) if row.scope != 'local'} if base is not None else {}
    # "New" needs a list it was absent from: on the very first list every issue would be new, which says nothing.
    first_list = await db.scalar(select(func.min(RadarRun.started_at)).where(RadarRun.state.in_(COMPOSED)))
    moves = {}
    for issue in issues:
        if issue.scope == 'local':
            continue
        if issue.first_seen_at > shown.started_at - timedelta(hours=NEW_HOURS) and first_list is not None and first_list < issue.first_seen_at:
            moves[issue.key] = {'kind': 'new', 'places': 0}
        elif issue.key in before and abs(before[issue.key] - issue.rank) >= MOVE_PLACES:
            moves[issue.key] = {'kind': 'up' if before[issue.key] > issue.rank else 'down', 'places': abs(before[issue.key] - issue.rank)}
    return moves


async def _switch(db):
    """The radar's switch row. It is created the first time it is asked for; after that a read writes nothing, so the
    landing page never waits behind the database's writers."""
    policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
    if policy is None:
        await ensure_policy(db)
        policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
    return policy


def _signals(run):
    """How many signals a refresh read, per platform. A count of public lists, not a detail of how the list was composed."""
    counts = (run.usage or {}).get('signals') or {}
    return {platform: int(counts[platform]) for platform in PLATFORMS if isinstance(counts.get(platform), int)}


async def latest(db, now):
    """The newest stored refresh, as Beranda shows it. Reading never starts a refresh."""
    from ..models.pulse import WatchTopic
    policy = await _switch(db)
    newest = (await db.execute(select(RadarRun).order_by(RadarRun.started_at.desc()).limit(1))).scalars().first()
    out = {'state': 'empty', 'updated_at': None, 'interval_minutes': INTERVAL_MINUTES, 'enabled': policy.daily_limit != 0,
           # The newest attempt, whatever came of it: a refresh that failed must not look like one that never ran.
           'last_attempt': {'state': newest.state, 'at': newest.started_at} if newest is not None else None,
           'running': bool(policy.lease_until and policy.lease_until > now), 'missing': [], 'provinces_read': [], 'signals': {}, 'brief': None, 'issues': [], 'raw': None}
    shown = await composed_run(db)
    if shown is None or now - shown.started_at > timedelta(hours=RAW_AFTER_HOURS):
        lists = (await db.execute(select(RadarRun).where(RadarRun.state == 'raw').order_by(RadarRun.started_at.desc()).limit(1))).scalars().first()
        if lists is not None and (shown is None or lists.started_at > shown.started_at):
            return {**out, 'state': 'raw', 'updated_at': lists.started_at, 'missing': lists.missing or [], 'provinces_read': lists.provinces_read or [],
                    'signals': _signals(lists), 'raw': lists.raw or {}}
        if shown is None:
            return {**out, 'missing': (newest.missing or []) if newest is not None else []}
    issues = await _issues(db, shown)
    moves = await _movements(db, shown, issues)
    topics = (await db.execute(select(WatchTopic).order_by(WatchTopic.created_at))).scalars().all()
    return {**out, 'state': 'stale' if now - shown.started_at > timedelta(minutes=STALE_MINUTES) else shown.state, 'updated_at': shown.started_at,
            'missing': shown.missing or [], 'provinces_read': shown.provinces_read or [], 'signals': _signals(shown), 'brief': shown.brief,
            'issues': [_for_reader(issue, moves.get(issue.key), _covering(issue, topics)) for issue in issues]}


async def issue_detail(db, key):
    """One issue of the list on the page, with the evidence it was built on."""
    from ..models.pulse import WatchTopic
    shown = await composed_run(db)
    if shown is None:
        return None
    issue = (await db.execute(select(RadarIssue).where(RadarIssue.run_id == shown.id, RadarIssue.key == key))).scalars().first()
    if issue is None:
        return None
    topics = (await db.execute(select(WatchTopic).order_by(WatchTopic.created_at))).scalars().all()
    return {**_for_reader(issue, None, _covering(issue, topics)), 'updated_at': shown.started_at, 'evidence': issue.evidence or []}


async def held(db, now):
    """Is a refresh running right now?"""
    policy = await _switch(db)
    return bool(policy.lease_until and policy.lease_until > now)
