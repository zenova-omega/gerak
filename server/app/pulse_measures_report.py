"""Before and after: the figures the calculation dictionary moved, per project, read from a copy of the database.

    cd server && ../.venv/bin/python -m app.pulse_measures_report <database> [--old | --compare] [--json]
        [--today YYYY-MM-DD] [--now YYYY-MM-DDTHH:MM:SS] [--days 14]

Read only: the SQLite file is opened in SQLite's read-only mode and nothing is written. No page or route imports this
file; it exists so the owner can see what moved before the live API is restarted.

Per project it prints posts per day of the installation's zone for the last 14 days, total interactions and how many
posts report them, accounts per platform (with Monitor's "days with posts"), and the tone percentages with the
analysed and "belum dianalisis" counts: for the whole project, for warganet and berita apart (the Sentimen page), and
for Beranda's last seven times 24 hours. Across the database it prints, per platform, the names seen both with and
without a provider id.

The new figures come from app.services.pulse_measures. `--old` gives the same figures by the rules from before this
work, which live here and nowhere else:
  day           Monitor's "days with posts" counted UTC dates; the day chart already added 7 hours to every time
  interactions  likes + comments + shares over the figures stored as numbers, a missing one read as 0, no stand-in
  account       the platform with the provider id, else the author text as written
  tone base     tone_share_v1 (15 to 16 Nov 2026): the analysed posts only, "belum dianalisis" given beside as a count.
                tone_share_v2 replaced it on the owner's choice, which is the rule from before 15 Nov again: all posts,
                "belum dianalisis" the fourth part of the 100. v1 is pulse_measures.sample_tone_shares, the reading
                comments keep, so it is not written a second time here.
`--compare` prints both as one markdown table per project, only the figures that moved, each with a short note.

Exit status 1 when a platform keyed by provider id has a name seen both with and without an id (account_v1 would
then split one account in two), 2 when the database cannot be read.
"""
import argparse
import json
import math
import sqlite3
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError

from .models.pulse import SourceItem, WatchTopic
from .services import pulse_measures as measures

PLATFORMS = {'x': 'X', 'youtube': 'YouTube', 'instagram': 'Instagram', 'tiktok': 'TikTok', 'threads': 'Threads',
             'reddit': 'Reddit', 'news': 'Berita'}
TONES = measures.TONES
WORDS = {'positive': 'positif', 'neutral': 'netral', 'negative': 'negatif', 'unknown': 'belum dianalisis'}
VOICES = {'public': 'warganet', 'news': 'berita'}
BERANDA_DAYS = 7
SAME_FIGURES = 'Every post has the same figure under both rules.'
# The day chart before day_v1 added 7 hours to every stored time, a date-only one (00:00) included. local_day with that
# offset is the same rule: 00:00 plus 7 hours stays on its date, which is what local_day keeps for a date-only time.
OLD_CHART_OFFSET = 7 * 60
OLD_MONITOR_OFFSET = 0      # Monitor before day_v1: SQL date(published_at), the UTC date


# ---- reading --------------------------------------------------------------------------------------------------------
def _file(database) -> Path:
    text = str(database)
    for prefix in ('sqlite+aiosqlite:///', 'sqlite:///'):
        if text.startswith(prefix):
            text = text[len(prefix):]
    path = Path(text).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f'no database file at {path}')
    return path


def read(database):
    """Projects and their posts, through the app's own column types, from a connection SQLite opens read-only."""
    uri = _file(database).as_uri() + '?mode=ro'
    engine = create_engine('sqlite://', creator=lambda: sqlite3.connect(uri, uri=True))
    try:
        with engine.connect() as connection:
            topics = connection.execute(select(WatchTopic.id, WatchTopic.label)).all()
            rows = connection.execute(select(SourceItem.topic_id, SourceItem.platform, SourceItem.author,
                                             SourceItem.published_at, SourceItem.metrics)).all()
    finally:
        engine.dispose()
    posts = defaultdict(list)
    for topic_id, platform, author, published_at, metrics in rows:
        posts[topic_id].append({'platform': platform or 'unknown', 'monitored': platform is not None, 'author': author,
                                'published_at': published_at, 'metrics': metrics if isinstance(metrics, dict) else {}})
    return [(topic_id, label, posts.get(topic_id, [])) for topic_id, label in topics], rows


# ---- the old rules (only here) --------------------------------------------------------------------------------------
def _old_interactions(metrics) -> int:
    """Before interactions_v1: the three figures stored as numbers, added up; anything else read as 0."""
    return sum(value for value in (metrics.get(name) for name in ('likes', 'comments', 'shares'))
               if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value))


def _old_account(post):
    """Before account_v1: the provider id, else the author text exactly as written; a post without an author had none."""
    if not post['author']:
        return None
    return post['platform'], post['metrics'].get('author_id') or post['author']


# ---- one project's figures ------------------------------------------------------------------------------------------
def keyed_by_id(platform) -> bool:
    """Whether account_v1 keys a platform by provider id: asked of the module, not written here a second time."""
    return measures.account_key(platform, 'name', {'author_id': 'id'}) != measures.account_key(platform, 'name', {})


def _tone(posts, old: bool) -> dict:
    counts = Counter(measures.tone(post['metrics']) for post in posts)
    counts = {key: counts.get(key, 0) for key in (*TONES, 'unknown')}
    analysed = sum(counts[key] for key in TONES)
    if old:   # tone_share_v1: the three tones over the analysed posts, "belum dianalisis" a count beside them
        shares = measures.sample_tone_shares(counts)
        only = (lambda value: {key: value[key] for key in TONES} if value else None)
        return {'counts': counts, 'analysed': analysed, 'unknown': counts['unknown'], 'base': analysed,
                'percent': only(shares['percent']), 'text': only(shares['text'])}
    shares = measures.tone_shares(counts)
    return {'counts': counts, 'analysed': analysed, 'unknown': counts['unknown'], 'base': len(posts),
            'percent': shares['percent'], 'text': shares['text']}


def _span(first, last) -> int | None:
    return (date.fromisoformat(last) - date.fromisoformat(first)).days + 1 if first and last else None


def figures(topic_id, label, posts, *, old: bool, dates: list[str], now: datetime) -> dict:
    chart_day = (lambda value: measures.local_day(value, OLD_CHART_OFFSET)) if old else measures.local_day
    monitor_day = (lambda value: measures.local_day(value, OLD_MONITOR_OFFSET)) if old else measures.local_day
    days = Counter(chart_day(post['published_at']) for post in posts)
    dated = [post for post in posts if measures.local_day(post['published_at']) is not None]
    if old:
        interactions = {'value': sum(_old_interactions(post['metrics']) for post in posts), 'posts': len(posts)}
        accounts = {key for key in map(_old_account, posts) if key}
        account_platform = {key: key[0] for key in accounts}
    else:
        interactions = measures.interactions_total([post['metrics'] for post in posts])
        accounts = {key for key in map(measures.post_account, posts) if key}
        account_platform = {key: post['platform'] for post in posts for key in [measures.post_account(post)] if key}
    platforms = []
    for platform in sorted({post['platform'] for post in posts}):
        own = [post for post in posts if post['platform'] == platform]
        stamped = [chart_day(post['published_at']) for post in own if post['published_at'] is not None]
        stamped = [day for day in stamped if day]
        first, last = (min(stamped), max(stamped)) if stamped else (None, None)
        monitored = {monitor_day(post['published_at']) for post in own if post['monitored']} - {None}
        platforms.append({'platform': platform, 'posts': len(own),
                          'accounts': sum(1 for key in accounts if account_platform[key] == platform),
                          'days_with_posts': len(monitored), 'first_day': first, 'last_day': last, 'span_days': _span(first, last)})
    platforms.sort(key=lambda row: (-row['posts'], row['platform']))
    edge = now - timedelta(days=BERANDA_DAYS)
    week = [post for post in posts if (moment := measures.read_time(post['published_at'])) is not None and moment > edge]
    return {
        'id': topic_id, 'label': label, 'posts': len(posts), 'dated': len(dated), 'undated': len(posts) - len(dated),
        'date_only': sum(1 for post in dated if not measures.has_clock(post['published_at'])),
        'per_day': [{'day': day, 'posts': days.get(day, 0)} for day in dates],
        'interactions': interactions, 'accounts': len(accounts), 'platforms': platforms,
        'tone': _tone(posts, old),
        'tone_voice': {voice: _tone([post for post in posts if (post['platform'] == 'news') == (voice == 'news')], old) for voice in VOICES},
        'tone_7d': {**_tone(week, old), 'posts': len(week), 'since': edge.isoformat(sep=' ', timespec='minutes')},
    }


def names(rows) -> list[dict]:
    """Per platform, across the database: the names (account_v1's name form) seen on a row with a provider id and on a
    row without one. For a platform keyed by id this has to be 0, or one account gets two keys."""
    seen, counted = defaultdict(lambda: defaultdict(set)), Counter()
    with_id = Counter()
    for _topic, platform, author, _published, metrics in rows:
        platform = platform or 'unknown'
        has_id = bool(measures._provider_id(metrics.get('author_id') if isinstance(metrics, dict) else None))   # the module's reading of an id
        counted[platform] += 1
        with_id[platform] += has_id
        name = measures.account_key(platform, author, None)
        if name:
            seen[platform][name].add(has_id)
    return [{'platform': platform, 'rows': counted[platform], 'rows_with_id': with_id[platform],
             'names_both': sum(1 for flags in seen[platform].values() if len(flags) == 2), 'keyed_by_id': keyed_by_id(platform)}
            for platform in sorted(counted)]


def collect(database, *, old: bool = False, today: str | None = None, now: str | datetime | None = None, days: int = 14) -> dict:
    moment = measures.read_time(now) if now is not None else datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
    if moment is None:
        raise ValueError(f'cannot read the time {now!r}')
    last = date.fromisoformat(today) if today else date.fromisoformat(measures.local_day(moment))
    dates = [(last - timedelta(days=step)).isoformat() for step in range(days - 1, -1, -1)]
    projects, rows = read(database)
    found = names(rows)
    offset, zone_name = measures.zone()
    return {
        'rules': 'old' if old else 'new', 'database': str(_file(database)),
        'zone': {'offset_minutes': offset, 'name': zone_name}, 'today': last.isoformat(),
        'now': moment.isoformat(sep=' ', timespec='minutes'),
        'projects': sorted((figures(topic_id, label, posts, old=old, dates=dates, now=moment) for topic_id, label, posts in projects),
                           key=lambda project: project['label'].lower()),
        'names': found, 'failed': [row['platform'] for row in found if row['keyed_by_id'] and row['names_both']],
    }


# ---- printing -------------------------------------------------------------------------------------------------------
def number(value) -> str:
    return '—' if value is None else f'{value:,}'


def posts_text(count) -> str:
    return f"{number(count)} post{'' if count == 1 else 's'}"


def platform_name(platform) -> str:
    return PLATFORMS.get(platform, platform)


def _zone_text(zone) -> str:
    minutes = zone['offset_minutes']
    return f"+{minutes // 60:02d}:{minutes % 60:02d} {zone['name']}"


def _tone_line(tone, old: bool) -> str:
    if not tone['text']:
        return f"no tone: nothing analysed; belum dianalisis {number(tone['unknown'])}" if old else 'no posts'
    keys = TONES if old else (*TONES, 'unknown')
    shares = ' · '.join(f"{WORDS[key]} {tone['text'][key]}" for key in keys)
    counts = ' · '.join(number(tone['counts'][key]) for key in keys)
    if old:
        return f"{shares} ({counts}) of {number(tone['analysed'])} analysed; belum dianalisis {number(tone['unknown'])}"
    return f"{shares} ({counts}) of all {number(tone['base'])} posts"


def text(result) -> str:
    old = result['rules'] == 'old'
    lines = [f"PULSE figures by the {'OLD rules (before the calculation dictionary)' if old else 'rules in app/services/pulse_measures.py'}",
             f"Database {result['database']} (read-only) · zone {_zone_text(result['zone'])} · today {result['today']} · now {result['now']} UTC"]
    day_rule = 'stored time + 7 hours' if old else result['zone']['name']
    monitor_rule = 'UTC dates' if old else f"{result['zone']['name']} days"
    for project in result['projects']:
        total = project['interactions']
        lines += ['', f"== {project['label']} ({project['id']}) ==",
                  f"Posts: {number(project['posts'])} · with a date {number(project['dated'])} · without a date {number(project['undated'])}"
                  f" · date only, no clock {number(project['date_only'])}",
                  f"Posts per day ({day_rule}), last {len(project['per_day'])} days:"]
        lines += [f"  {date.fromisoformat(row['day']).strftime('%a')} {row['day']}  {number(row['posts']):>7}" for row in project['per_day']]
        if old:
            lines.append('Interactions: ' + number(total['value']) + ' (likes + comments + shares stored as numbers, unknown read as 0,'
                         + ' over all ' + number(total['posts']) + ' posts)')
        else:
            lines.append(f"Interactions: {number(total['value'])} over {number(total['posts'])} of {number(project['posts'])} posts "
                         f"({number(project['posts'] - total['posts'])} report none)")
        lines.append(f"Accounts: {number(project['accounts'])} ({'id, else the author as written' if old else 'account_v1'}, counted per platform)")
        lines.append(f"  {'Platform':<10} {'Posts':>7} {'Accounts':>9}  Monitor: days with posts ({monitor_rule}) of the span")
        for row in project['platforms']:
            span = f"{row['days_with_posts']} of {row['span_days']} ({row['first_day']} to {row['last_day']})" if row['span_days'] else 'no dated post'
            lines.append(f"  {platform_name(row['platform']):<10} {number(row['posts']):>7} {number(row['accounts']):>9}  {span}")
        lines.append(f"Tone, all posts: {_tone_line(project['tone'], old)}")
        for voice, word in VOICES.items():
            lines.append(f"Tone, {word}: {_tone_line(project['tone_voice'][voice], old)}")
        week = project['tone_7d']
        lines.append(f"Tone, Beranda (7 x 24 hours since {week['since']} UTC, {number(week['posts'])} posts): {_tone_line(week, old)}")
    lines += ['', '== Names seen with and without a provider id (all projects) ==',
              f"  {'Platform':<10} {'Rows':>7} {'With id':>8} {'Both ways':>10}  Keyed by"]
    for row in result['names']:
        lines.append(f"  {platform_name(row['platform']):<10} {number(row['rows']):>7} {number(row['rows_with_id']):>8} "
                     f"{number(row['names_both']):>10}  {'provider id' if row['keyed_by_id'] else 'name'}")
    lines.append('FAILED: ' + ', '.join(result['failed']) + ' (keyed by id, but a name is seen with and without an id)'
                 if result['failed'] else 'Every platform keyed by provider id: 0 names seen both ways.')
    return '\n'.join(lines) + '\n'


# ---- before and after -----------------------------------------------------------------------------------------------
def _interaction_note(posts) -> str:
    """Where the difference in total interactions comes from, post by post: the source's own total standing in, or the
    three figures read differently (digits stored as text now count; negative or fractional figures no longer do)."""
    parts = Counter()
    for post in posts:
        metrics = post['metrics']
        new, old = measures.interactions(metrics), _old_interactions(metrics)
        if (new or 0) == old:
            continue
        reason = 'stand_in' if measures.interactions({**metrics, 'engagement': None}) is None else 'read'
        parts[reason] += (new or 0) - old
        parts[reason + '_posts'] += 1
    said = []
    if parts['read_posts']:
        said.append(f"likes, comments and shares are read by one rule: digits stored as text count, negative or fractional "
                    f"figures do not ({'+' if parts['read'] >= 0 else ''}{number(parts['read'])} on {posts_text(parts['read_posts'])})")
    if parts['stand_in_posts']:
        said.append(f"the source's own total stands in where it reports none of the three ({'+' if parts['stand_in'] >= 0 else ''}"
                    f"{number(parts['stand_in'])} on {posts_text(parts['stand_in_posts'])})")
    return ('Before, only the figures stored as numbers were added and anything else read as 0. Now '
            + '; '.join(said) + '.') if said else SAME_FIGURES


def _account_note(platform) -> str:
    if platform == 'x':
        return 'X is now counted by handle (lower case, no @) instead of the provider id, the form mentions in text use.'
    if platform == 'threads':
        return 'Threads is now counted by handle: an account with an id on some posts and none on others was counted twice.'
    if platform == 'reddit':
        return 'Reddit is now counted by handle: the same handle with other capitals or an @ was counted twice.'
    if platform == 'news':
        return 'Publishers are now counted by name, trimmed and lower case: the same publisher written with other capitals or spaces was counted twice.'
    return ('Counted by provider id; the handle (lower case, no @) only for a post without an id, where before the name '
            'was taken as written.')


def _tone_text(tone) -> str:
    return ' · '.join(f"{WORDS[key]} {tone['text'][key]}" for key in (*TONES, 'unknown')) if tone['text'] else 'no posts'


def _tone_rows(where, before, after, same):
    """`before` is tone_share_v1 (of the analysed posts, "belum dianalisis" a count), `after` tone_share_v2."""
    rows = []
    for key in (*TONES, 'unknown'):
        if key == 'unknown':
            b = f"{number(before['unknown'])} posting"
        else:
            b = before['text'][key] if before['text'] else '—'
        a = after['text'][key] if after['text'] else '—'
        if b != a and not (key == 'unknown' and not before['unknown']):   # none waiting: nothing moved
            rows.append((f'{where}, {WORDS[key]}', b, a,
                         f"Before, beside the shares as a count; now the fourth part of the 100, of all {number(after['base'])} posts."
                         if key == 'unknown' else
                         f"Before, a share of the {number(before['analysed'])} analysed posts only; now of all {number(after['base'])} "
                         f"posts, belum dianalisis ({number(after['unknown'])}) included." if after['unknown'] else
                         "Every post is analysed: the same base, so only the rounding with a fourth part of 0 could move it."))
    if not rows:
        same.append(f"{where} ({_tone_text(after)})")
    return rows


def compare(before, after, posts_by_project) -> str:
    zone_name = after['zone']['name']
    lines = ['## Before and after: figures that moved', '',
             f"Read from {after['database']} (read-only). Zone {_zone_text(after['zone'])}; today {after['today']}; "
             f"Beranda's 7 x 24 hours end {after['now']} UTC. Before = the rules from before the calculation dictionary "
             "(`--old`); after = `app/services/pulse_measures.py`. Only figures that moved are in the table; the rest is "
             "named under it with its value."]
    old_projects = {project['id']: project for project in before['projects']}
    for project in after['projects']:
        was = old_projects[project['id']]
        rows, same = [], [f"posts ({number(project['posts'])})"]
        old_days = {row['day']: row['posts'] for row in was['per_day']}
        moved_days = [row for row in project['per_day'] if old_days[row['day']] != row['posts']]
        for row in moved_days:
            rows.append((f"Posts per day, {row['day']}", number(old_days[row['day']]), number(row['posts']),
                         f"The day chart added 7 hours to every stored time; now it counts days in {zone_name}."))
        if not moved_days:
            busiest = max(project['per_day'], key=lambda row: row['posts'])
            same.append(f"posts per day for the {len(project['per_day'])} days to {after['today']} (busiest {busiest['day']}, "
                        f"{number(busiest['posts'])}; the day chart already added 7 hours, which is {zone_name})")
        old_platforms = {row['platform']: row for row in was['platforms']}
        steady = []
        for row in project['platforms']:
            prior = old_platforms[row['platform']]
            if prior['days_with_posts'] == row['days_with_posts']:
                steady.append(f"{platform_name(row['platform'])} {row['days_with_posts']}")
                continue
            shown = min(prior['days_with_posts'], row['span_days'] or 0)
            capped = (f" The page shows at most the span, so it read {shown} of {row['span_days']} before as well."
                      if prior['days_with_posts'] > (row['span_days'] or 0) else '')
            rows.append((f"Monitor, days with posts, {platform_name(row['platform'])}", number(prior['days_with_posts']),
                         number(row['days_with_posts']),
                         f"Monitor counted UTC dates, so a post published from 00:00 to 06:59 {zone_name} fell on the day "
                         f"before; now it counts days in {zone_name}, of a span of {number(row['span_days'])} days.{capped}"))
        if steady:
            same.append('Monitor days with posts on ' + ', '.join(steady))
        b, a = was['interactions'], project['interactions']
        if b['value'] != a['value']:
            rows.append(('Interactions, total', number(b['value']), number(a['value']),
                         _interaction_note(posts_by_project[project['id']])))
        else:
            plain = _interaction_note(posts_by_project[project['id']]) == SAME_FIGURES
            same.append(f"total interactions ({number(a['value'])}" + (': every post gives the same figure under both rules; '
                        'what changed is how many posts the total is said to cover)' if plain else '; the differences between posts cancel out)'))
        if b['posts'] != a['posts']:
            rows.append(('Interactions, posts counted', number(b['posts']), number(a['posts']),
                         f"Before, a post that reports no interaction figure was counted as 0; now it is left out of the total "
                         f"and named: {number(project['posts'] - a['posts'])} posts report none (shown as —)."))
        steady = []
        for row in project['platforms']:
            prior = old_platforms[row['platform']]
            if prior['accounts'] != row['accounts']:
                rows.append((f"Accounts, {platform_name(row['platform'])}", number(prior['accounts']), number(row['accounts']),
                             _account_note(row['platform'])))
            else:
                steady.append(f"{platform_name(row['platform'])} {number(row['accounts'])}")
        if was['accounts'] != project['accounts']:
            rows.append(('Accounts, all platforms', number(was['accounts']), number(project['accounts']),
                         'The platforms above added up; an account is still counted once per platform.'))
        else:
            same.append(f"accounts, all platforms ({number(project['accounts'])})")
        if steady:
            same.append('accounts on ' + ', '.join(steady))
        rows += _tone_rows('Tone, all posts', was['tone'], project['tone'], same)
        for voice, word in VOICES.items():
            rows += _tone_rows(f'Tone, {word}', was['tone_voice'][voice], project['tone_voice'][voice], same)
        rows += _tone_rows('Beranda, tone 7 × 24 hours', was['tone_7d'], project['tone_7d'], same)
        lines += ['', f"### {project['label']}", '',
                  f"{number(project['posts'])} posts: {number(project['undated'])} without a date, {number(project['date_only'])} "
                  f"with a date and no clock; interactions known on {number(project['interactions']['posts'])}; "
                  f"{number(project['tone']['analysed'])} analysed, {number(project['tone']['unknown'])} belum dianalisis.", '']
        if rows:
            lines += ['| Figure | Before | After | Why it moved |', '|---|---|---|---|']
            lines += [f'| {figure} | {old} | {new} | {note} |' for figure, old, new, note in rows]
        else:
            lines.append('Nothing moved.')
        lines += ['', 'Unchanged: ' + '; '.join(same) + '.']
    lines += ['', '### Names seen with and without a provider id (all projects)', '',
              '| Platform | Rows | Rows with an id | Names seen both ways | Keyed by |', '|---|---|---|---|---|']
    lines += [f"| {platform_name(row['platform'])} | {number(row['rows'])} | {number(row['rows_with_id'])} | {number(row['names_both'])} | "
              f"{'provider id' if row['keyed_by_id'] else 'name'} |" for row in after['names']]
    lines.append('')
    lines.append('FAILED: ' + ', '.join(after['failed']) + ' is keyed by id but has a name seen with and without an id.'
                 if after['failed'] else 'Every platform keyed by provider id has 0 names seen both ways.')
    return '\n'.join(lines) + '\n'


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog='python -m app.pulse_measures_report', description=__doc__.split('\n\n')[0])
    parser.add_argument('database', help='path of the SQLite database (a copy), opened read-only')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--old', action='store_true', help='the rules from before the calculation dictionary')
    mode.add_argument('--compare', action='store_true', help='old and new as one markdown table per project')
    parser.add_argument('--json', action='store_true', help='print the figures as JSON')
    parser.add_argument('--today', help='last day of the per-day figures (YYYY-MM-DD); default: today in the zone')
    parser.add_argument('--now', help="Beranda's end of the 7 x 24 hours, UTC (YYYY-MM-DDTHH:MM:SS); default: now")
    parser.add_argument('--days', type=int, default=14, help='number of days of the per-day figures (default 14)')
    args = parser.parse_args(argv)
    try:
        options = {'today': args.today, 'now': args.now, 'days': args.days}
        if args.compare:
            before, after = collect(args.database, old=True, **options), collect(args.database, **options)
            if args.json:
                print(json.dumps({'old': before, 'new': after}, ensure_ascii=False, indent=1))
            else:
                posts = {topic_id: rows for topic_id, _label, rows in read(args.database)[0]}
                print(compare(before, after, posts), end='')
            result = after
        else:
            result = collect(args.database, old=args.old, **options)
            print(json.dumps(result, ensure_ascii=False, indent=1) if args.json else text(result).rstrip('\n'))
    except (FileNotFoundError, ValueError, sqlite3.Error, SQLAlchemyError) as error:
        print(f'cannot make the figures: {error}', file=sys.stderr)
        return 2
    if result['failed']:
        print('FAILED: a platform keyed by provider id has names seen both with and without an id: ' + ', '.join(
            f"{row['platform']} ({row['names_both']})" for row in result['names'] if row['platform'] in result['failed']), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
