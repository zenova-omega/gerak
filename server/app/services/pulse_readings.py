"""Four readings built on the calculation rules of pulse_measures: how much of a selection each kind of figure rests
on, which words gained and lost ground, when posts were published, and how much of the conversation rests on how few
accounts. This file and src/lib/pulseReadings.js are the only homes of these four; both are tested against
shared/pulse-readings.cases.json, so a change on one side fails the other.

Every function takes posts already scoped to a period and platforms, as dicts with `published_at`, `platform`,
`author`, `metrics`, `title` and `text`. A post's day, clock, interactions, account and tone come from pulse_measures
(or from the `measures` a post already carries), never from a rule written here."""
import re
import unicodedata
from datetime import date, timedelta

from . import pulse_measures as m

RULES: dict[str, str] = {
    'coverage': 'coverage_v1', 'term_shift': 'term_shift_v1', 'hour_grid': 'hour_grid_v1', 'concentration': 'concentration_v1',
}
RULE_TEXT: dict[str, str] = {
    'coverage': 'Cakupan data menyebut berapa bagian postingan dalam pilihan yang sudah dianalisis, yang interaksinya diketahui, dan yang membawa jam terbit; tingkatnya mengikuti bagian terkecil dari ketiganya: Lengkap mulai 90%, Cukup mulai 60%, Terbatas di bawah itu.',
    'term_shift': 'Naik dan turun kata membandingkan bagian postingan yang memuat satu kata, atau dua kata berurutan, pada periode ini dengan periode sama panjang tepat sebelumnya, dalam poin persentase; kata dihitung bila dimuat sedikitnya 5 postingan pada salah satu periode.',
    'hour_grid': 'Kisi hari dan jam menghitung postingan yang membawa jam terbit per hari dan per jam menurut zona waktu instalasi; barisnya tanggal bila rentangnya 14 hari atau kurang, selain itu hari dalam seminggu mulai Senin.',
    'concentration': 'Konsentrasi akun mengurutkan akun dari yang paling banyak memposting, lalu menyebut bagian postingan dari tiga akun teratas dan berapa akun yang dibutuhkan untuk mencapai 80% postingan; hal yang sama dihitung untuk interaksi, dari postingan yang interaksinya diketahui.',
}
COVERAGE_SHARES = ('analysed', 'measured', 'clocked')   # the order a tie is named in
TERM_MIN_POSTS, TERM_LIMIT = 5, 8
GRID_DAY_ROWS = 14
CURVE_MIN_ACCOUNTS, CURVE_POINTS, TOP_ACCOUNTS = 10, 20, 3

# --- The word panel's tokenizer (`wordsIn` in src/lib/pulseInfographics.js), read the same way on the server. -------
# The browser's regular expressions are written out with the exact character sets they use there, because Python's
# own `\s`, `\b` and case-insensitive `[a-z]` cover other characters. Both sides follow their own Unicode tables for
# what a letter is, so a letter newer than the older of the two tables is read differently until both know it.
STOPWORDS = frozenset((
    'ada adalah adanya adapun agar akan akhirnya aku anda antara apa apabila apakah atas atau awal bagi bahwa bahkan '
    'baik banyak baru beberapa begitu belum benar berupa bisa bukan cara cukup dalam dan dapat dari daripada datang '
    'dengan demi demikian dia dilakukan diri dirinya dua dulu hanya harus hingga ia ialah ini itu jadi jangan juga '
    'justru kalau kami kamu karena kata ke kembali kemudian kepada ketika kita lagi lain lalu lebih maka makin maupun '
    'masih masing melalui memang mengenai menjadi mengatakan merupakan mereka meski mungkin namun nanti oleh pada '
    'paling para perlu pernah pula pun punya saat saja saling sama sampai sangat satu saya sebab sebagai sebagaimana '
    'sebagainya sebagian sebelum sebuah secara sedang sehingga sejak sejumlah sekitar selalu seluruh semua semakin '
    'sementara sendiri seperti serta setiap siapa sudah supaya telah tentang tentu terhadap tersebut tetapi tiap tidak '
    'tiga untuk yaitu yakni yang nya dong kok si sang rt via http https www com id the and for with from this that are '
    'was were not you your').split())
_NAMED = {'nbsp': ' ', 'amp': '&', 'quot': '"', 'apos': "'", 'lt': '<', 'gt': '>', 'ensp': ' ', 'emsp': ' ',
          'thinsp': ' ', 'ndash': '\u2013', 'mdash': '\u2014', 'hellip': '\u2026', 'lsquo': '\u2018', 'rsquo': '\u2019',
          'ldquo': '\u201c', 'rdquo': '\u201d'}
# What the browser calls white space (its `\s`); `\S` is everything else.
_SPACE = '\\t\\n\\x0b\\x0c\\r \\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff'
_ENTITY = re.compile(r'&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][0-9a-zA-Z]+);')
_COMMENT = re.compile(r'<!--[\s\S]*?(?:-->|\Z)')
_BLOCK = re.compile(r'''<(script|style)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?(?:</\1[''' + _SPACE + r''']*>|\Z)''', re.A | re.I)
_TAG = re.compile(r'''</?[a-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>''', re.A | re.I)
_DECLARATION = re.compile(r'<![^>]*>')
# The browser's `\b`: an edge between an ASCII letter, digit or underscore and anything else.
_EDGE = r'(?:(?<![A-Za-z0-9_])(?=[A-Za-z0-9_])|(?<=[A-Za-z0-9_])(?![A-Za-z0-9_]))'


def _entity(found: re.Match) -> str:
    entity = found.group(1)
    if entity[0] != '#':
        return _NAMED.get(entity.lower(), ' ')
    code = int(entity[2:], 16) if entity[1] in 'xX' else int(entity[1:])
    return chr(code) if 0 < code <= 0x10ffff and not 0xd800 <= code <= 0xdfff else ' '


def _plain_text(value: str) -> str:
    """Entities read as text (three passes, for text that was escaped more than once), then markup dropped."""
    for _ in range(3):
        value = _ENTITY.sub(_entity, value)
    for pattern in (_COMMENT, _BLOCK, _TAG, _DECLARATION):
        value = pattern.sub(' ', value)
    return value


class _Shape(dict):
    """For `str.translate`: every letter outside ASCII becomes one stand-in letter and every number outside ASCII one
    stand-in number, so the patterns below can name "a letter" and "a number" with a handful of characters instead
    of the whole Unicode table (which made each match hundreds of times slower). Everything else stays itself, and
    the text keeps its length, so a match on the shape is the same span of the text."""

    def __missing__(self, code: int) -> int:
        kind = unicodedata.category(chr(code))[0] if code > 127 else ''
        self[code] = value = 0xe9 if kind == 'L' else 0xb2 if kind == 'N' else code
        return value


_SHAPE = _Shape()
_LETTER, _BOTH = 'A-Za-z\\xe9', 'A-Za-z\\xe90-9\\xb2'   # after lower-casing; the stand-ins are a letter and a number themselves
_LINK = re.compile(rf'(?:https?://|www\.)[^{_SPACE}]+')
_REMOVED = (re.compile(rf'[{_BOTH}._%+\-]+@[{_BOTH}.\-]+'),
            re.compile(rf'{_EDGE}[{_BOTH}\-]+(?:\.[{_BOTH}\-]+)+(?:/[^{_SPACE}]*)?'),
            re.compile(rf'@[{_BOTH}_]+'))
_WORD = re.compile(rf'[{_LETTER}]+')


def _blank(found: re.Match) -> str:
    return ' ' * (found.end() - found.start())


def words(post) -> list[str]:
    """The words of a post's title and text in reading order, as the word panel reads them: markup, links,
    addresses, site names and @handles removed, lower-cased, letters only. Stop words and short words are still in."""
    post = post if isinstance(post, dict) else {}
    text = ' '.join(_plain_text(value) for value in (post.get('title'), post.get('text')) if isinstance(value, str))
    text = _LINK.sub(' ', unicodedata.normalize('NFKC', text).lower())
    shape = text.translate(_SHAPE)
    for pattern in _REMOVED:
        shape = pattern.sub(_blank, shape)
    return [text[found.start():found.end()] for found in _WORD.finditer(shape)]


def keeps_word(word: str) -> bool:
    """Whether the word panel counts a word: 3 to 40 characters as the browser counts them (a character outside
    the first plane is two), and not a stop word."""
    return 3 <= len(word.encode('utf-16-le')) // 2 <= 40 and word not in STOPWORDS


def post_terms(post) -> set[str]:
    """term_shift_v1: the terms of one post. A term is a word the word panel keeps, or two of them in a row inside
    the title or inside the text; a post holds a term once however often it repeats it."""
    post = post if isinstance(post, dict) else {}
    terms: set[str] = set()
    for field in ('title', 'text'):
        previous = None
        for word in words({field: post.get(field)}):
            if not keeps_word(word):
                previous = None
                continue
            terms.add(word)
            if previous is not None:
                terms.add(f'{previous} {word}')
            previous = word
    return terms


# --- A post's own figures, from part 1. -------------------------------------------------------------------------
def _figures(post, offset: int | None) -> dict:
    """The figures a post carries (`measures`, as the analytics payload sends them), or the same from part 1's rules."""
    post = post if isinstance(post, dict) else {}
    sent = post.get('measures')
    if isinstance(sent, dict):
        return sent
    stamp, metrics = post.get('published_at'), post.get('metrics')
    return {'day': m.local_day(stamp, offset), 'clock': m.has_clock(stamp), 'interactions': m.interactions(metrics),
            'account': m.account_key(post.get('platform'), post.get('author'), metrics), 'tone': m.tone(metrics)}


def _day(value) -> date | None:
    """A calendar day written YYYY-MM-DD, as part 1 reads one (its week rule refuses anything else)."""
    return date.fromisoformat(value) if isinstance(value, str) and m.week_start(value) is not None else None


def _part(count: int, total: int) -> dict:
    """A count as a part of a total: the share as a fraction, and a whole percent that is cut, never rounded up."""
    return {'count': count, 'share': count / total, 'percent': count * 100 // total}


def period_before(date_from, date_to) -> dict | None:
    """term_shift_v1: the period before a chosen one, the same number of days ending the day before it starts.
    None without a chosen period (both days are needed)."""
    first, last = _day(date_from), _day(date_to)
    if first is None or last is None or last < first:
        return None
    return {'from': (first - (last - first + timedelta(days=1))).isoformat(), 'to': (first - timedelta(days=1)).isoformat()}


def coverage(posts, offset: int | None = None) -> dict:
    """coverage_v1: how much of the selection each kind of figure rests on. `analysed` (the post has a tone),
    `measured` (its interactions are known) and `clocked` (it has a clock) set the level through the lowest of them:
    `complete` from 90%, `fair` from 60%, `limited` under that. `lowest` names the share that set it. `dated` is
    reported and not judged. An empty selection has no shares and no level."""
    keys = (*COVERAGE_SHARES, 'dated')
    everything = dict.fromkeys(('total', *keys), 0)
    platforms: dict[str, dict] = {}
    for post in posts or ():
        figures = _figures(post, offset)
        name = post.get('platform') if isinstance(post, dict) else None
        name = name if isinstance(name, str) and name else 'unknown'
        seen = (figures.get('tone') in m.TONES, figures.get('interactions') is not None, figures.get('clock') is True,
                figures.get('day') is not None)
        for row in (everything, platforms.setdefault(name, dict.fromkeys(('total', *keys), 0))):
            row['total'] += 1
            for key, hit in zip(keys, seen):
                row[key] += hit
    total = everything['total']
    if not total:
        return {'total': 0, **dict.fromkeys(keys), 'level': None, 'lowest': None, 'platforms': []}
    lowest = min(COVERAGE_SHARES, key=lambda key: everything[key])   # the first of equals
    least = everything[lowest]
    level = 'complete' if least * 10 >= total * 9 else 'fair' if least * 10 >= total * 6 else 'limited'
    return {
        'total': total, **{key: _part(everything[key], total) for key in keys}, 'level': level, 'lowest': lowest,
        'platforms': [{'platform': name, 'total': row['total'], **{key: _part(row[key], row['total']) for key in keys}}
                      for name, row in sorted(platforms.items(), key=lambda item: (-item[1]['total'], item[0]))],
    }


def term_shift(posts_now, posts_before) -> dict | None:
    """term_shift_v1: which terms gained and lost ground against the period before. A term's share is the posts that
    hold it over the posts of the period; its shift is the share now minus the share before, in percentage points.
    A term is kept when at least 5 posts hold it in one of the two periods. Up to 8 rising and up to 8 falling,
    largest shift first; ties by more posts now, then by the alphabet. None when either period has no post."""
    now, before = list(posts_now or ()), list(posts_before or ())
    if not now or not before:
        return None
    counts: dict[str, list[int]] = {}
    for side, rows in enumerate((now, before)):
        for post in rows:
            for term in post_terms(post):
                counts.setdefault(term, [0, 0])[side] += 1
    n, k = len(now), len(before)
    moved = []
    for term, (a, b) in counts.items():
        if a < TERM_MIN_POSTS and b < TERM_MIN_POSTS:
            continue
        lead = a * k - b * n   # both shares over one denominator, so equal shifts are equal and not a rounding apart
        if lead:
            moved.append((lead, {'term': term, 'now': a, 'before': b, 'share_now': a / n, 'share_before': b / k,
                                 'shift': lead * 100 / (n * k)}))

    def listed(sign: int) -> list[dict]:
        rows = [item for item in moved if (item[0] > 0) == (sign > 0)]
        rows.sort(key=lambda item: (-sign * item[0], -item[1]['now'], item[1]['term']))
        return [row for _, row in rows[:TERM_LIMIT]]

    return {'posts_now': n, 'posts_before': k, 'rising': listed(1), 'falling': listed(-1)}


def hour_grid(posts, offset: int | None = None) -> dict:
    """hour_grid_v1: when the posts were published. A cell counts the posts with a clock of one row and one hour of
    the installation's zone. Rows are the days themselves, first to last day that has such a post, when those are
    14 days or fewer; otherwise the seven weekdays, Monday first (`weekday` 0 to 6). Posts without a clock are
    counted as `date_only`, posts without a date as `undated`; neither is in a cell. No post with a clock: no rows."""
    days: dict[str, list[int]] = {}
    total = clocked = date_only = undated = 0
    for post in posts or ():
        total += 1
        figures = _figures(post, offset)
        day = figures.get('day')
        if _day(day) is None:
            undated += 1
            continue
        # The hour on the zone's wall clock, from the one place that knows the zone.
        moment = m.local_time(post.get('published_at'), offset) if figures.get('clock') is True else None
        if moment is None:
            date_only += 1
            continue
        days.setdefault(day, [0] * 24)[moment.hour] += 1
        clocked += 1
    if not clocked:
        return {'mode': None, 'from': None, 'to': None, 'rows': [], 'max': 0, 'clocked': 0, 'date_only': date_only,
                'undated': undated, 'total': total}
    first, last = _day(min(days)), _day(max(days))
    span = (last - first).days + 1
    if span <= GRID_DAY_ROWS:
        each = [first + timedelta(days=index) for index in range(span)]
        rows = [{'day': day.isoformat(), 'weekday': day.weekday(), 'cells': days.get(day.isoformat(), [0] * 24)} for day in each]
    else:
        week = [[0] * 24 for _ in range(7)]
        for day, cells in days.items():
            row = week[_day(day).weekday()]
            for hour, value in enumerate(cells):
                row[hour] += value
        rows = [{'day': None, 'weekday': index, 'cells': cells} for index, cells in enumerate(week)]
    for row in rows:
        row['total'] = sum(row['cells'])
    return {'mode': 'days' if span <= GRID_DAY_ROWS else 'weekdays', 'from': first.isoformat(), 'to': last.isoformat(),
            'rows': rows, 'max': max(max(row['cells']) for row in rows), 'clocked': clocked, 'date_only': date_only,
            'undated': undated, 'total': total}


def _ranking(values: dict[str, int], names: dict[str, tuple]) -> tuple[int, dict]:
    """One ranking as figures: the named top accounts, their share, the 80% point and the sampled curve."""
    ranked = sorted(values.items(), key=lambda item: (-item[1], item[0]))
    accounts, total = len(ranked), sum(value for _, value in ranked)
    if not total:
        return total, {'accounts': accounts, 'top': [], 'top_share': None, 'reach80': None, 'curve': None}
    top = [{'account': account, 'name': names[account][1] if account in names else None,
            'platform': account.split(':', 1)[0], 'value': value, 'share': value / total} for account, value in ranked[:TOP_ACCOUNTS]]
    cumulative, run = [], 0
    for _, value in ranked:
        run += value
        cumulative.append(run)

    def point(count: int) -> dict:
        return {'accounts': count, 'account_share': count / accounts, 'share': cumulative[count - 1] / total}

    picks = (range(1, accounts + 1) if accounts <= CURVE_POINTS
             else [1 + index * (accounts - 1) // (CURVE_POINTS - 1) for index in range(CURVE_POINTS)])
    reach = next(index for index, value in enumerate(cumulative, 1) if value * 5 >= total * 4)
    return total, {'accounts': accounts, 'top': top, 'top_share': sum(row['value'] for row in top) / total,
                   'reach80': point(reach), 'curve': [point(count) for count in picks] if accounts >= CURVE_MIN_ACCOUNTS else None}


def concentration(posts, offset: int | None = None) -> dict:
    """concentration_v1: how much of the conversation rests on how few accounts. Accounts are ranked by posts, most
    first, ties by the account key. `top` names the three most active with their share, `reach80` is how many
    accounts it takes to reach 80% of the posts, and `curve` is the cumulative share of posts against the share of
    accounts, at no more than 20 points that always include the first account and the last; no curve under 10
    accounts. `interactions` is the same with accounts ranked by the interactions of their posts, from posts whose
    interactions are known, with the selection's measured share beside it. Posts without an account are counted in
    `without_account` and left out. An account's `name` is the author text of its most recently published post."""
    by_posts: dict[str, int] = {}
    by_interactions: dict[str, int] = {}
    names: dict[str, tuple] = {}
    total = without = measured = known = 0
    for post in posts or ():
        total += 1
        figures = _figures(post, offset)
        own = figures.get('interactions')
        if own is not None:
            measured += 1
        key = figures.get('account')
        if not isinstance(key, str) or ':' not in key:
            without += 1
            continue
        by_posts[key] = by_posts.get(key, 0) + 1
        if own is not None:
            by_interactions[key] = by_interactions.get(key, 0) + own
            known += 1
        author = post.get('author') if isinstance(post, dict) else None
        if isinstance(author, str) and author:
            at, best = m.read_time(post.get('published_at')), names.get(key)
            if best is None or (at is not None and (best[0] is None or at > best[0])):
                names[key] = (at, author)
    named, post_figures = _ranking(by_posts, names)
    reported, interaction_figures = _ranking(by_interactions, names)
    return {
        'total': total, 'without_account': without,
        'posts': {'total': named, **post_figures},
        'interactions': {'total': reported if known else None, 'posts': known,
                         'measured': _part(measured, total) if total else None, **interaction_figures},
    }
