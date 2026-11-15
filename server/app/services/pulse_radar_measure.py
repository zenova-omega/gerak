"""How loud the radar's highest issues are on X, TikTok and Instagram, from the social supplier.

Two kinds of answer, kept apart. A COUNT on X: how many posts since yesterday carry the issue's keywords (the supplier
counts by UTC date, so that is the finest window there is). And SAMPLES from X, TikTok and Instagram: a small search
whose posts are shown as evidence. A sample says the issue is there and shows what is said; it is never a total, so a
sample that came back full is marked `capped`.

Every call costs credits (measured 15 Nov 2026: a count about 2, a 20-row search about 7 on X, 5 on TikTok, 17 on
Instagram), so every issue is counted first (the count is what orders the list), and a sample is bought again only
when the last one for that issue and platform is over `SAMPLE_HOURS` old. Nothing here raises: what could not be
asked is reported in `missing`, and the refresh goes on with what was measured.

A call can fail two ways. The supplier refuses or asks to slow down (no access, no credit, too many requests): that
platform is left alone for the rest of the refresh. Or one answer simply does not come (slow, not ready, unreadable):
that one issue goes without, the next is still asked, and a second such loss ends the platform too. On the first real
round one slow answer each on TikTok and X cost the other issues their samples; hence the difference.
"""
import asyncio
import itertools
import logging
import re
import time
from datetime import datetime, timedelta

import httpx

from .ingest import xpoz
from .pulse_radar_signals import plain

SOCIAL = ('x', 'tiktok', 'instagram')
SEARCHES = {'x': 'getTwitterPostsByKeywords', 'tiktok': 'getTiktokPostsByKeywords', 'instagram': 'getInstagramPostsByKeywords'}
SAMPLE_ROWS = 20          # rows asked for in one sample
SAMPLE_HOURS = 3          # a sample is reused this long
SAMPLE_DAYS = 3           # a sample looks this far back; without a window the answer is mostly old posts
KEEP = 5                  # posts kept as evidence per platform
TERMS = 3                 # keywords of a proposal that go into the phrase
TERM_LENGTH = 60
PHRASE_LENGTH = 250       # the supplier's limit for a query
CALL_SECONDS = 45
BUDGET_SECONDS = 300      # the whole measurement; a refresh must end inside its lock
TITLE_LENGTH = 160
# The supplier said no, or said to wait: asking again in this refresh would only be refused again.
REFUSALS = {'authentication_failed', 'access_or_quota_restricted', 'plan_restricted', 'rate_limited', 'http_401', 'http_402', 'http_403', 'http_429'}
LOST_ANSWERS = 2          # answers that did not come before a platform is left alone
_now = time.monotonic
log = logging.getLogger('uvicorn.error')


def _reason(error):
    """What kind of failure this was, as one of our own words. The supplier's text is never logged or returned."""
    if isinstance(error, xpoz.XpozToolError):
        return error.code
    if isinstance(error, httpx.HTTPStatusError):
        return f'http_{error.response.status_code}'
    return 'timeout' if isinstance(error, TimeoutError) else type(error).__name__


def _terms(text):
    """The usable keywords of one comma-separated field: no quotes or brackets, no bare boolean word, three letters or more."""
    found = []
    for part in (text.split(',') if isinstance(text, str) else []):
        term = ' '.join(re.sub(r'["“”„‟«»()\[\]\\]', ' ', part).split())[:TERM_LENGTH].strip()
        if (len(re.sub(r'[\W_]', '', term)) < 3 or term.lower() in ('and', 'or', 'not')
                or term.lower() in (other.lower() for other in found)):
            continue
        found.append(term)
        if len(found) == TERMS:
            break
    return found


def count_phrase(query):
    """A keyword proposal as one boolean phrase the supplier can count and search, or None when nothing usable is left."""
    if not isinstance(query, dict):
        return None
    main, required = _terms(query.get('q')), _terms(query.get('required'))

    def group(terms):
        return ' OR '.join(f'"{term}"' for term in terms)
    while main:
        for kept in range(len(required), -1, -1):
            phrase = f'({group(main)}) AND ({group(required[:kept])})' if kept else group(main)
            if len(phrase) <= PHRASE_LENGTH:
                return phrase
        main = main[:-1]
    return None


def _text_of(result):
    return ''.join(block.get('text', '') for block in result.get('content') or [] if isinstance(block, dict) and block.get('type') == 'text')


def _count(result):
    """The integer a count answered with. Anything else is a failed call."""
    if not isinstance(result, dict):
        raise ValueError('Invalid count answer')
    if result.get('isError'):
        xpoz._tool_error(result)
    structured = result.get('structuredContent')
    if isinstance(structured, dict):
        data = structured.get('data', structured)
        value = data.get('count') if isinstance(data, dict) else data
    else:
        text = _text_of(result)
        match = re.search(r'^\s*count:\s*(\d+)\s*$', text, re.M)
        value = match.group(1) if match else text.strip()
    if isinstance(value, bool) or not str(value).isdigit():
        raise ValueError('Invalid count answer')
    return int(value)


def _rows(result):
    if not isinstance(result, dict):
        raise ValueError('Invalid search answer')
    if result.get('isError'):
        xpoz._tool_error(result)
    if result.get('structuredContent') is not None:
        return xpoz._stored_rows(result['structuredContent'])
    return xpoz._page_rows(_text_of(result))


def _evidence(platform, items):
    """The most engaged posts of a sample as evidence rows. A repost repeats someone else's post, and a post without text shows nothing."""
    rows = []
    for item in items:
        metrics = item.get('metrics') or {}
        title = plain(item.get('text'), TITLE_LENGTH)
        if not title or metrics.get('repost'):
            continue
        rows.append({'platform': platform, 'title': title, 'url': item.get('url'), 'source': plain(item.get('author'), 80) or None, 'figure': metrics.get('engagement')})
    rows.sort(key=lambda row: -(row['figure'] if row['figure'] is not None else -1))
    return rows[:KEEP]


def _fresh(sample, now):
    """Was this sample taken less than `SAMPLE_HOURS` ago, and can it be read? One that cannot is bought again."""
    try:
        figure = sample.get('figure')
        readable = isinstance(sample.get('evidence') or [], list) and (figure is None or (isinstance(figure, dict) and isinstance(figure.get('found', 0), int)))
        return readable and timedelta(0) <= now - datetime.fromisoformat(str(sample.get('at'))) < timedelta(hours=SAMPLE_HOURS)
    except (AttributeError, TypeError, ValueError):
        return False


async def measure(issues, previous, *, key, now, client=None, budget=BUDGET_SECONDS, choose=None):
    """Count `issues` on X, then sample them: all of them, or the ones `choose` names once it has seen the counts
    (`choose(figures) -> [key]`, in the order to sample; the caller ranks with the counts and names its highest).

    `previous` maps an issue key to its earlier samples, `{platform: {'at': iso, 'figure': {...} | None, 'evidence': [...]}}`.
    Returns `figures` (`{key: {'x': {'count'}, 'tiktok': {'found', 'capped'}, 'instagram': {...}}}`, only what was found),
    `evidence` (`{key: [rows]}`, X then TikTok then Instagram), `sampled` (`{key: {platform: iso}}`, when each sample in
    use was taken) and `missing` (the platforms that could not be asked everything)."""
    out = {'figures': {}, 'evidence': {}, 'sampled': {}, 'missing': []}
    asked = [(issue, phrase) for issue, phrase in ((issue, count_phrase(issue.get('query'))) for issue in issues if isinstance(issue, dict) and issue.get('key')) if phrase]
    if not asked:
        return out
    stopped, incomplete, lost, numbers, began = set(), set(), {}, itertools.count(10), _now()
    own = client is None
    client = client or httpx.AsyncClient(timeout=30.0, follow_redirects=False, headers={'Authorization': f'Bearer {key}', 'Accept': 'application/json, text/event-stream'})

    def failed(platform, error):
        """An answer that did not come or could not be used. A refusal ends the platform for this refresh; so does the second lost answer."""
        reason = _reason(error)
        incomplete.add(platform)
        lost[platform] = lost.get(platform, 0) + 1
        if reason in REFUSALS or lost[platform] >= LOST_ANSWERS:
            stopped.add(platform)
        log.warning('radar: %s gave no answer for one issue (%s)%s', platform, reason, '; left alone for this refresh' if platform in stopped else '')

    async def call(platform, tool, arguments, read):
        """One paid call, read with `read`. None when the platform is left alone, the time is spent, or no usable answer came."""
        left = budget - (_now() - began)
        if platform in stopped or left <= 0:
            incomplete.add(platform)
            stopped.add(platform)
            return None
        try:
            async with asyncio.timeout(min(CALL_SECONDS, left)):
                return read(await xpoz._rpc(client, {'jsonrpc': '2.0', 'id': next(numbers), 'method': 'tools/call', 'params': {'name': tool, 'arguments': arguments}}))
        except Exception as error:
            failed(platform, error)
            return None

    try:
        try:
            async with asyncio.timeout(CALL_SECONDS):
                await xpoz._initialize(client)
        except Exception:
            out['missing'] = list(SOCIAL)
            return out
        day = now.date()
        counted = {}
        for issue, phrase in asked:
            counted[issue['key']] = await call('x', 'countTweets', {'phrase': phrase, 'startDate': (day - timedelta(days=1)).isoformat(), 'endDate': day.isoformat()}, _count)
            if counted[issue['key']]:
                out['figures'].setdefault(issue['key'], {})['x'] = {'count': counted[issue['key']]}
        if choose is not None:
            known = {issue['key']: (issue, phrase) for issue, phrase in asked}
            asked = [known[name] for name in choose({name: {platform: dict(figure) for platform, figure in found.items()} for name, found in out['figures'].items()}) if name in known]
        window = {'startDate': (day - timedelta(days=SAMPLE_DAYS)).isoformat(), 'endDate': (day + timedelta(days=1)).isoformat()}
        for issue, phrase in asked:
            name, before = issue['key'], previous.get(issue['key']) if isinstance(previous, dict) else None
            evidence, stamps = [], {}
            for platform in SOCIAL:
                sample = (before or {}).get(platform) if isinstance(before, dict) else None
                if _fresh(sample, now):
                    figure, rows = sample.get('figure'), [row for row in sample.get('evidence') or [] if isinstance(row, dict) and row.get('platform') == platform][:KEEP]
                    stamps[platform] = sample['at']
                else:       # X is sampled even when nothing was counted: the count only sees posts already stored, and this search is what stores them
                    arguments = {'query': phrase, 'responseType': 'fast', 'limit': SAMPLE_ROWS, 'forceLatest': False, **window,
                                 'fields': (xpoz.FIELDS if platform == 'x' else xpoz.SOCIAL_FIELDS[platform]).split(',')}
                    if platform == 'x':
                        arguments['sortBy'] = 'latest'
                    found = await call(platform, SEARCHES[platform], arguments, _rows)
                    if found is None:
                        continue
                    try:
                        items = xpoz.normalize_posts(found, SAMPLE_ROWS) if platform == 'x' else xpoz.normalize_social_posts(platform, found[:SAMPLE_ROWS])
                    except Exception as error:
                        failed(platform, error)
                        continue
                    figure, rows = ({'found': len(items), 'capped': len(found) >= SAMPLE_ROWS} if items else None), _evidence(platform, items)
                    stamps[platform] = now.isoformat()
                if platform != 'x' and isinstance(figure, dict) and figure.get('found'):
                    out['figures'].setdefault(name, {})[platform] = {'found': int(figure['found']), 'capped': bool(figure.get('capped'))}
                evidence.extend(rows)
            if evidence:
                out['evidence'][name] = evidence
            if stamps:
                out['sampled'][name] = stamps
    finally:
        if own:
            await client.aclose()
    out['missing'] = [platform for platform in SOCIAL if platform in incomplete]
    return out
