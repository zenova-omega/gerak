"""The issue radar: one refresh from public signals to a stored, ranked list of what Indonesia is talking about.

A refresh reads the lists, asks the answer engine to group them into issues, then decides everything else here: how
loud an issue is on each platform, in which provinces, and in what order. The slow steps (network, model) run with
no database session open. One refresh at a time, held by a lease on the radar's row beside the other worker switches.

Behind a second, paid switch (off by default) a refresh also asks what is loud on X, counts the highest issues there,
and samples posts from X, TikTok and Instagram as evidence. With that switch off none of it is asked.

While the first switch is on the list is made once a day, at PULSE_RADAR_DAILY_AT on the installation's clock (08.00 WIB
by default), and by hand with the refresh button.
"""
import asyncio
import collections
import logging
import re
import time
import uuid
from datetime import datetime, timedelta

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import OperationalError

from ..config import get_settings
from ..database import async_session
from ..models.pulse_monitor import WorkerPolicy
from ..models.pulse_radar import RadarIssue, RadarRun
from .ai import _hosted_ready, get_ai_service, get_bulk_ai_service
from .ingest.common import credential
from .pulse_monitor import insert_once
from .pulse_radar_compose import compose
from .pulse_radar_measure import SAMPLE_HOURS, SOCIAL as SOCIAL_PLATFORMS, count_phrase, measure
from .pulse_radar_signals import collect, picture_link
from .pulse_radar_x import discover, handle_of

PROVIDER = 'radar'
SOCIAL = 'radar_social'    # the paid switch: issues found on X, and figures from X, TikTok and Instagram. Off by default
SUPPLIER = 'xpoz'          # the social supplier's own lane; while it is blocked the radar does not ask it either
AGAIN_MINUTES = 30         # a day's refresh that gave no list is tried again this much later, until the day has one
KEEP_DAYS = 30
COLLECT_SECONDS = 240      # reading every list took 20 s on a real round; a source that hangs must not outlast the lock
DISCOVERY_SECONDS = 240    # the live search of X took 72 s on a real round, after two answers of "at capacity"
COMPOSE_SECONDS = 300      # the answer engine needed 115 s on a real round (15 Nov 2026); 120 s lost the refresh
FALLBACK_SECONDS = 120     # the faster engine, asked only when the first gave nothing; it needed 20 s
MEASURE_SECONDS = 300      # counting and sampling ten issues that have no samples yet took about 170 s
LEASE_SECONDS = 1500       # longer than every wait above together
DISCOVERY_MINUTES = 20 * 60       # X is searched at the day's refresh (about USD 0.39 a search), or when someone presses the refresh button; a refresh
                                  # within this long of the last search carries its issues. Under a day, so a morning after one made up late still searches
CARRY_MINUTES = 26 * 60           # a search that gave nothing is covered by the last one for this long
RETRY_MINUTES = 120               # and is tried again this much later, not at the next refresh: a search can be billed although its answer could not be used
EVIDENCE_PER_PLATFORM = 5
LIST_ROWS = 10             # the rows the page lists; the brief only cites these, and these are the ones sampled
RAW_ROWS = 20
WRITE_TRIES = 4            # the installation's database has one writer at a time; a busy one must not cost a refresh its list
WRITE_PAUSE = (2, 5, 10)   # seconds between the tries
PLATFORMS = ('news', 'x', 'youtube', 'search')     # what an issue is ordered by. TikTok and Instagram are samples: shown, never ordering
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
    # The posts a search of X pointed at. How many there are says how the issue was found, not how loud it is.
    links = list(dict.fromkeys(link for row in cited if row['platform'] == 'x' for link in [row.get('url'), *(other.get('url') for other in row.get('related', []))] if link))
    platforms = {}
    if stories:
        platforms['news'] = {'count': sum(1 + (row['figure'] or 0) for row in stories)}      # the story and the other coverage listed under it
    if links:
        platforms['x'] = {'posts': len(links)}
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
    evidence = (coverage[:EVIDENCE_PER_PLATFORM]
                + [{'platform': 'x', 'title': 'Posting dari @' + handle_of(link) if handle_of(link) else 'Posting di X', 'url': link, 'source': None, 'figure': None} for link in links[:EVIDENCE_PER_PLATFORM]]
                + [item('youtube', row, row['figure']) for row in videos[:EVIDENCE_PER_PLATFORM]]
                + [item('search', row, _searches(row)) for row in terms[:EVIDENCE_PER_PLATFORM]])
    return {**issue, 'platforms': platforms, 'evidence': evidence, 'image': _picture(videos, terms),
            'regions': [{'code': code, 'searches': count} for code, count in sorted(regions.items(), key=lambda pair: (-pair[1], pair[0]))]}


def _picture(videos, terms):
    """One picture for an issue, from its own sources: its most watched video, else the picture the search list shows for
    its most searched term, else the picture of a story listed under one of its terms. None when it has none of these."""
    def shown(link, source, kind):
        return {'url': link, 'source': source, 'kind': kind} if picture_link(link) else None
    for row in videos:
        found = shown((row.get('picture') or {}).get('url'), (row.get('picture') or {}).get('source'), 'video')
        if found:
            return found
    searched = sorted(terms, key=lambda row: -_searches(row))
    for row in searched:
        found = shown((row.get('picture') or {}).get('url'), (row.get('picture') or {}).get('source'), 'photo')
        if found:
            return found
    for row in searched:
        for story in row.get('related', []):
            found = shown(story.get('picture'), story.get('source'), 'photo')
            if found:
                return found
    return None


def _image(stored):
    """A stored picture as the page gets it: only the three fields, and only a link from a host the lists use."""
    if not isinstance(stored, dict) or not picture_link(stored.get('url')):
        return None
    return {'url': stored['url'], 'source': stored.get('source') if isinstance(stored.get('source'), str) else None, 'kind': 'video' if stored.get('kind') == 'video' else 'photo'}


def loudness(issue, platform):
    """The one figure an issue is ordered by on a platform, or None when it is not on it."""
    figures = issue['platforms'].get(platform)
    if not figures:
        return None
    if platform == 'x':
        return figures.get('count')         # counted posts only; the posts that merely found the issue are not a measure
    return figures['count'] if platform == 'news' else figures['views'] if platform == 'youtube' else figures['searches']


def with_social(issue, figures=None, evidence=None):
    """An issue with what the supplier measured for it: the count on X in place of the posts that found it, what the
    samples found on TikTok and Instagram, and the sampled posts as evidence in place of bare links."""
    platforms = {**issue['platforms'], **{platform: dict(figure) for platform, figure in (figures or {}).items()}}
    rows = issue['evidence']
    if evidence:
        sampled = {row['platform'] for row in evidence}
        rows = [row for row in rows if row['platform'] not in sampled] + list(evidence)
    return {**issue, 'platforms': platforms, 'evidence': rows}


def rank(issues):
    """National issues by where they stand on each platform, more platforms counting for more; local issues after
    them, by how many provinces and how many searches. The order has to be explainable in one sentence."""
    national = [dict(issue) for issue in issues if issue['scope'] != 'local']
    local = [dict(issue) for issue in issues if issue['scope'] == 'local']
    for issue in national:
        issue['score'] = 0.5 * max(0, sum(1 for platform in PLATFORMS if platform in issue['platforms']) - 1)
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
    if not out['x']:
        del out['x']        # a refresh that did not search X has no X list, rather than an empty one
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
    """The radar's two switches, beside the other worker switches. Both off until someone turns them on."""
    await insert_once(db, WorkerPolicy, {'provider': PROVIDER, 'daily_limit': 0})
    await insert_once(db, WorkerPolicy, {'provider': SOCIAL, 'daily_limit': 0})


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


def _age(discovery, now):
    """How long ago a stored search of X was made, or None when there is nothing usable stored."""
    try:
        if not isinstance(discovery, dict) or not [row for row in discovery['signals'] if row['platform'] == 'x' and row['title']]:
            return None
        return now - datetime.fromisoformat(discovery['at'])
    except (KeyError, TypeError, ValueError):
        return None


def search_due(last, now, *, tried=None, fresh=False):
    """Should X be searched in this refresh? Yes when someone asked for it (`fresh`, the refresh button). Otherwise only
    when the last search that found something is DISCOVERY_MINUTES old or more, and the last try, whatever came of it,
    is RETRY_MINUTES old or more: a try that gave nothing is not repeated half an hour later."""
    if fresh:
        return True
    age = _age(last, now)
    if age is not None and age < timedelta(minutes=DISCOVERY_MINUTES):
        return False
    try:
        return now - datetime.fromisoformat(tried) >= timedelta(minutes=RETRY_MINUTES)
    except (TypeError, ValueError):
        return True         # no try on record


async def x_issues(settings, now, last, ai=None, *, search=None):
    """What X is talking about, for this refresh: (signals, when they were searched), or (None, None) to go without.
    When a search is due (`search`; by default decided from `last` alone) and finds something, that is the answer. In
    every other case (not due, busy, refused, timed out, nothing usable) the last search serves until it is CARRY_MINUTES old."""
    if search is None:
        search = search_due(last, now)
    if search:
        try:
            engine = ai if ai is not None else get_ai_service(settings) if _hosted_ready(settings) else None
            found = await asyncio.wait_for(discover(engine, now), DISCOVERY_SECONDS)
        except Exception:       # no engine, a busy or refused search, a search that never ends: the list is composed without a new one
            found = None
        if found:
            return found, now.isoformat()
    age = _age(last, now)
    if age is not None and age < timedelta(minutes=CARRY_MINUTES):
        return last['signals'], last['at']
    return None, None


async def social_figures(settings, now, issues, social):
    """`issues` in their final order with what the supplier measured: (issues, platforms it could not be asked everything
    about, when each sample was taken). X is counted for the ten highest and for whatever X itself found below them;
    the order is then settled, and only the ten highest of that order are sampled."""
    key = credential(settings, 'XPOZ_API_KEY')
    if not key or not social.get('supplier'):
        return issues, list(SOCIAL_PLATFORMS), {}
    national = [issue for issue in issues if issue['scope'] != 'local']
    asked = national[:LIST_ROWS] + [issue for issue in national[LIST_ROWS:] if 'x' in issue['platforms']]
    settled = []

    def choose(figures):
        counted = {name: {'x': found['x']} for name, found in figures.items() if 'x' in found}
        settled[:] = rank([with_social(issue, counted.get(issue['key'])) for issue in issues])
        return [issue['key'] for issue in settled if issue['scope'] != 'local'][:LIST_ROWS]
    try:
        measured = await asyncio.wait_for(measure(asked, social.get('samples') or {}, key=key, now=now, budget=MEASURE_SECONDS - 30, choose=choose), MEASURE_SECONDS)
    except Exception:
        log.exception('radar: measurement failed')
        return settled or issues, list(SOCIAL_PLATFORMS), {}
    if not settled:
        choose(measured['figures'])
    sampled = {name: {platform: figure for platform, figure in found.items() if platform != 'x'} for name, found in measured['figures'].items()}
    return [with_social(issue, sampled.get(issue['key']), measured['evidence'].get(issue['key'])) for issue in settled], list(measured['missing']), measured['sampled']


async def assemble(settings, now, *, previous=(), ai=None, client=None, social=None):
    """Everything one refresh produces, with no database in it: what is stored as the run, and its issues in order.

    `social` is None while the paid switch is off. On, it is what the earlier refreshes left: {'discovery': the last
    stored search of X or None, 'tried': when X was last searched whatever came of it, 'fresh': search X now (the refresh
    button), 'samples': earlier samples by issue key, 'supplier': may the supplier be asked}."""
    clock = time.monotonic()
    empty = {'signals': [], 'missing': [], 'provinces_read': []}
    gathered, rows, composed, state, missing, extra = empty, [], None, 'failed', [], {}
    try:
        gathered = await asyncio.wait_for(collect(settings, client=client), COLLECT_SECONDS)
        rows, missing = list(gathered['signals']), list(gathered['missing'])
        if rows and social is not None:
            due = search_due(social.get('discovery'), now, tried=social.get('tried'), fresh=bool(social.get('fresh')))
            if due:
                extra['x_tried'] = now.isoformat()
            found, at = await x_issues(settings, now, social.get('discovery'), ai, search=due)
            if found:
                found = [{name: value for name, value in row.items() if name != 'id'} for row in found]
                rows += [{'id': f'S{number}', **row} for number, row in enumerate(found, len(rows) + 1)]
                extra['discovery'] = {'at': at, 'signals': found}
            else:
                missing.append('x')
        if rows:
            composed = await compose_issues(settings, rows, [{'key': row['key'], 'title': row['title']} for row in previous], ai)
            state = 'ok' if composed else 'raw'
        if composed and social is not None:
            # An issue is counted and sampled by its keywords, and the model words them anew at every refresh (on the first
            # real rounds a count went from 1,059 to 110 that way). While an issue lives it keeps the keywords it had.
            # Keywords that give no phrase to count (two-letter ones) are not worth keeping: the newest proposal is taken instead.
            kept = {row['key']: row['query'] for row in previous if count_phrase(row.get('query'))}
            for issue in composed['issues']:
                issue['query'] = kept.get(issue['key'], issue['query'])
    except Exception:
        log.exception('radar: refresh failed')
        gathered, rows, composed, state, missing, extra = empty, [], None, 'failed', [], {}
    signals = {row['id']: row for row in rows}
    issues = rank([attach(issue, signals) for issue in composed['issues']]) if state == 'ok' else []
    if issues and social is not None:
        try:
            issues, unasked, sampled = await social_figures(settings, now, issues, social)
        except Exception:       # whatever went wrong after the calls were paid for, the list is stored: a refresh that stores nothing is started again
            log.exception('radar: social figures failed')
            unasked, sampled = list(SOCIAL_PLATFORMS), {}
        missing += [platform for platform in unasked if platform not in missing]
        if sampled:
            extra['sampled'] = sampled
    if state == 'ok' and missing:
        state = 'partial'
    why = {name: reason for name, reason in (gathered.get('why') or {}).items() if name in missing}
    if why:
        extra['why'] = why        # never leaves the server; the log line summarises it
    counts = {platform: sum(1 for row in rows if row['platform'] == platform) for platform in PLATFORMS}
    if not counts['x']:
        del counts['x']
    return {'state': state, 'missing': missing, 'provinces_read': list(gathered['provinces_read']), 'issues': issues, 'signals': len(rows),
            'brief': brief_with_ranks(composed.get('brief'), issues) if issues else None, 'raw': _raw(rows),
            'usage': {'signals': counts, 'issues': len(issues), 'seconds': round(time.monotonic() - clock, 1), **extra}}


async def _left_by_earlier(db, now):
    """What earlier refreshes left for the paid steps: the last stored search of X, when X was last searched whatever came
    of it, and each issue's newest sample per platform, as {key: {platform: {'at', 'figure', 'evidence'}}}."""
    since = now - timedelta(minutes=max(CARRY_MINUTES, SAMPLE_HOURS * 60))
    runs = (await db.execute(select(RadarRun).where(RadarRun.started_at >= since, RadarRun.started_at < now).order_by(RadarRun.started_at.desc()))).scalars().all()
    discovery = next(((run.usage or {}).get('discovery') for run in runs if (run.usage or {}).get('discovery')), None)      # its own time decides whether it still serves
    tried = next(((run.usage or {}).get('x_tried') for run in runs if (run.usage or {}).get('x_tried')), None)
    recent = now - timedelta(hours=SAMPLE_HOURS)      # the search of X is carried for a day, the samples only for their own few hours
    sampling = [run for run in runs if run.started_at >= recent and isinstance((run.usage or {}).get('sampled'), dict) and run.usage['sampled']]
    samples = {}
    if sampling:
        stored = {(row.run_id, row.key): row for row in (await db.execute(select(RadarIssue).where(RadarIssue.run_id.in_([run.id for run in sampling])))).scalars()}
        for run in sampling:
            for name, stamps in run.usage['sampled'].items():
                issue = stored.get((run.id, name))
                for platform, at in (stamps.items() if issue is not None and isinstance(stamps, dict) else ()):
                    if platform not in samples.get(name, {}):
                        samples.setdefault(name, {})[platform] = {'at': at, 'figure': (issue.platforms or {}).get(platform),
                                                                  'evidence': [row for row in issue.evidence or [] if row.get('platform') == platform]}
    return discovery, tried, samples


async def _store(session_factory, run_id, now, built, first_seen):
    """Write one refresh: its run, its issues, and the removal of runs past KEEP_DAYS. One transaction; nothing is left behind when it fails."""
    async with session_factory() as db:
        db.add(RadarRun(id=run_id, started_at=now, finished_at=datetime.utcnow(), state=built['state'], missing=built['missing'],
                        provinces_read=built['provinces_read'], brief=built['brief'], raw=built['raw'], usage=built['usage']))
        for issue in built['issues']:
            db.add(RadarIssue(run_id=run_id, key=issue['key'], scope=issue['scope'], rank=issue['rank'], title=issue['title'], category=issue['category'],
                              reason=issue['reason'], score=issue['score'], platforms=issue['platforms'], regions=issue['regions'], evidence=issue['evidence'],
                              query=issue['query'], image=issue.get('image'), first_seen_at=first_seen.get(issue['key'], now)))
        cutoff = now - timedelta(days=KEEP_DAYS)
        await db.execute(delete(RadarIssue).where(RadarIssue.run_id.in_(select(RadarRun.id).where(RadarRun.started_at < cutoff))))
        await db.execute(delete(RadarRun).where(RadarRun.started_at < cutoff))
        await db.commit()


async def refresh(session_factory, settings=None, *, ai=None, client=None, now=None, force=False, social=None, fresh_x=False):
    """Run one refresh. Returns {'state', 'run_id'}: the stored run's state, or 'off' (the switch is off and this was
    not forced) or 'busy' (another refresh holds the lease), both without a run. `social` overrides the paid switch.
    `fresh_x` (the refresh button) searches X again even when the last search is under a day old."""
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
        previous = [] if last is None else [{'key': row.key, 'title': row.title, 'first_seen_at': row.first_seen_at, 'query': row.query} for row in
                                            (await db.execute(select(RadarIssue).where(RadarIssue.run_id == last.id).order_by(RadarIssue.rank))).scalars()]
        if social is None:
            social = (await db.get(WorkerPolicy, SOCIAL, populate_existing=True)).daily_limit != 0
        paid = None
        if social:
            supplier = await db.get(WorkerPolicy, SUPPLIER, populate_existing=True)
            discovery, tried, samples = await _left_by_earlier(db, now)
            paid = {'discovery': discovery, 'tried': tried, 'fresh': fresh_x, 'samples': samples, 'supplier': supplier is None or not supplier.blocked_reason}
        await db.commit()
    try:
        # No session is open from here until the result is written.
        built = await assemble(settings, now, previous=previous, ai=ai, client=client, social=paid)
        issues, first_seen = built['issues'], {row['key']: row['first_seen_at'] for row in previous}
        run_id = str(uuid.uuid4())
        for attempt in range(WRITE_TRIES):
            try:
                await _store(session_factory, run_id, now, built, first_seen)
                break
            except OperationalError:        # "database is locked": another writer held it past the wait. Everything is in memory; try again
                if attempt == WRITE_TRIES - 1:
                    raise
                log.warning('radar: the list could not be stored (database busy), trying again')
                await asyncio.sleep(WRITE_PAUSE[attempt])
        reasons = collections.Counter((built['usage'].get('why') or {}).values()).most_common(3)
        log.info('radar: %s, %s signals, %s issues, %s missing%s', built['state'], built['signals'], len(issues), len(built['missing']),
                 ' (' + ', '.join(f'{reason} {count}' for reason, count in reasons) + ')' if reasons else '')
        return {'state': built['state'], 'run_id': run_id}
    finally:
        await _release(session_factory, token)


def slot(now, settings=None):
    """The last moment at or before `now` the day's refresh was due, as naive UTC: PULSE_RADAR_DAILY_AT on the
    installation's clock (PULSE_ZONE_OFFSET_MINUTES east of UTC)."""
    settings = settings or get_settings()
    shift = timedelta(minutes=settings.PULSE_ZONE_OFFSET_MINUTES)
    hour, minute = (int(part) for part in settings.PULSE_RADAR_DAILY_AT.split(':'))
    clock = now + shift
    due = clock.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return (due if due <= clock else due - timedelta(days=1)) - shift


_ticked = {'at': None}      # when this process last started a scheduled refresh


async def radar_tick(now=None):
    """The scheduled check, once a minute: refresh when the switch is on and no list has been made since the day's
    moment (`slot`). A morning missed while the server was asleep or stopped is made up as soon as it runs again; a
    refresh that gave no list is tried again AGAIN_MINUTES after it started. The last start is read from the stored runs
    and also remembered here: a refresh that broke before it could store its run must not be started again a minute
    later, with its search and samples paid for again."""
    now = now or datetime.utcnow()
    try:
        settings = get_settings()
        due = slot(now, settings)
        async with async_session() as db:
            await ensure_policy(db)
            policy = await db.get(WorkerPolicy, PROVIDER, populate_existing=True)
            last = await db.scalar(select(func.max(RadarRun.started_at)))
            made = await db.scalar(select(func.count()).select_from(RadarRun).where(RadarRun.state.in_(COMPOSED), RadarRun.started_at >= due, RadarRun.started_at <= now))
            await db.commit()
        last = max((when for when in (last, _ticked['at']) if when is not None), default=None)
        if policy.daily_limit == 0 or made or (last is not None and last >= due and timedelta(0) <= now - last < timedelta(minutes=AGAIN_MINUTES)):
            return
        before, _ticked['at'] = _ticked['at'], now
        if (await refresh(async_session, settings, now=now))['run_id'] is None:
            _ticked['at'] = before        # told busy or off: nothing was started, so the next minute may try again
    except Exception:
        log.exception('radar: tick failed')


# ── What the page reads ─────────────────────────────────────────────────────────────────────────────────────────────

STALE_MINUTES = 60          # a list made before the day's moment is shown with a notice once that moment is this long past
RAW_AFTER_HOURS = 6         # with no composed list this recent, the raw lists are shown instead
MOVE_HOURS = 24             # movement is told against the list of about a day earlier: the list is made once a day
MOVE_GAP_HOURS = 12         # and never against one closer than this (the refresh button makes lists in between)
MOVE_PLACES = 2


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
            'platforms': issue.platforms or {}, 'regions': issue.regions or [], 'image': _image(issue.image),
            'evidence_titles': [item['title'] for item in issue.evidence or [] if item.get('platform') in ('news', 'youtube')],     # headlines: where a place is read from
            'query': issue.query or {}, 'movement': movement, 'project': project}


async def _issues(db, run):
    return (await db.execute(select(RadarIssue).where(RadarIssue.run_id == run.id).order_by(RadarIssue.rank))).scalars().all()


async def _movements(db, shown, issues):
    """Movement of the national issues against the list of about a day earlier: new (not on that list), or up or down.
    Without a list of about a day earlier nothing moves: on the very first list every issue would be new, which says nothing."""
    target = shown.started_at - timedelta(hours=MOVE_HOURS)
    earlier = (await db.execute(select(RadarRun).where(RadarRun.state.in_(COMPOSED), RadarRun.started_at <= shown.started_at - timedelta(hours=MOVE_GAP_HOURS),
                                                       RadarRun.started_at >= target - timedelta(hours=MOVE_HOURS)))).scalars().all()
    base = min(earlier, key=lambda run: abs((run.started_at - target).total_seconds()), default=None)
    if base is None:
        return {}
    before = {row.key: row.rank for row in await _issues(db, base) if row.scope != 'local'}
    moves = {}
    for issue in issues:
        if issue.scope == 'local':
            continue
        if issue.key not in before:
            moves[issue.key] = {'kind': 'new', 'places': 0}
        elif abs(before[issue.key] - issue.rank) >= MOVE_PLACES:
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


def _x_searched(run):
    """When the issues from X on this list were searched: they are carried for up to a day, so they can be older than the list."""
    at = ((run.usage or {}).get('discovery') or {}).get('at')
    return at if isinstance(at, str) else None


async def latest(db, now):
    """The newest stored refresh, as Beranda shows it. Reading never starts a refresh."""
    from ..models.pulse import WatchTopic
    policy = await _switch(db)
    newest = (await db.execute(select(RadarRun).order_by(RadarRun.started_at.desc()).limit(1))).scalars().first()
    settings = get_settings()
    # When the list is made: the zone's clock time of the day's refresh, and the next moment it is due.
    out = {'state': 'empty', 'updated_at': None, 'daily_at': settings.PULSE_RADAR_DAILY_AT, 'next_at': slot(now, settings) + timedelta(days=1), 'enabled': policy.daily_limit != 0,
           # The newest attempt, whatever came of it: a refresh that failed must not look like one that never ran.
           'last_attempt': {'state': newest.state, 'at': newest.started_at} if newest is not None else None,
           'running': bool(policy.lease_until and policy.lease_until > now), 'missing': [], 'provinces_read': [], 'signals': {}, 'x_searched_at': None,
           'brief': None, 'issues': [], 'raw': None}
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
    stale = shown.started_at < slot(now - timedelta(minutes=STALE_MINUTES), settings)      # the day's refresh is an hour late, or more
    return {**out, 'state': 'stale' if stale else shown.state, 'updated_at': shown.started_at,
            'missing': shown.missing or [], 'provinces_read': shown.provinces_read or [], 'signals': _signals(shown), 'x_searched_at': _x_searched(shown), 'brief': shown.brief,
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
