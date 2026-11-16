"""The calculation rules every PULSE figure rests on: a post's day, its interactions, the base of a tone share, and
what counts as one account. This file and src/lib/pulseMeasures.js are the only homes of these rules; both are
tested against shared/pulse-measures.cases.json, so a change on one side fails the other."""
import re
from datetime import date, datetime, time, timedelta, timezone

from ..config import get_settings

RULES: dict[str, str] = {
    'day': 'day_v1', 'clock': 'clock_v1', 'interactions': 'interactions_v1', 'shares_total': 'shares_total_v1',
    'content_shares': 'content_shares_v1', 'tone_share': 'tone_share_v2', 'account': 'account_v1',
}
RULE_TEXT: dict[str, str] = {
    'day': 'Sebuah postingan masuk ke tanggal kalender menurut zona waktu instalasi; periode dihitung per hari penuh dan minggu berjalan dari Senin sampai Minggu.',
    'clock': 'Postingan yang sumbernya hanya memberi tanggal (tersimpan tepat pukul 00.00.00 UTC) tetap memakai tanggal itu dan tidak ikut dalam angka per jam.',
    'interactions': 'Interaksi adalah suka ditambah komentar ditambah bagikan yang dilaporkan sumber; tayangan tidak dihitung, dan bila tak satu pun dilaporkan, angkanya tidak diketahui, bukan 0.',
    'shares_total': 'Jumlah dibagikan untuk sekumpulan postingan adalah jumlah bagikan milik tiap postingan yang melaporkannya, sehingga repost tidak dihitung dua kali.',
    'content_shares': 'Jumlah dibagikan untuk satu konten adalah jumlah bagikan postingannya, atau angka terbesar yang dibawa repost bila itu lebih besar.',
    'tone_share': 'Persentase sentimen dihitung dari total postingan dalam cakupan, termasuk yang belum dianalisis; positif, netral, negatif dan belum dianalisis dibulatkan agar berjumlah 100.',
    'account': 'Satu akun dihitung per platform, dikenali dari handle, ID penyedia, atau nama penerbit sesuai platformnya.',
}
TONES = ('positive', 'neutral', 'negative')
SHARE_KEYS = (*TONES, 'unknown')   # tone_share_v2: the four parts of 100, in the order a tie is settled
# ASCII digits only and no surrounding spaces, exactly as the browser reads them.
_TIME = re.compile(r'^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:[T ]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]+))?)?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$', re.I)
_DAY = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}')
_DIGITS = re.compile(r'[0-9]+')
_SPACE = ' \t\n\r\x0b\x0c'   # trimmed the same way in the browser; other spaces are kept
MAX_SAFE_ID = 2 ** 53 - 1


def zone() -> tuple[int, str]:
    settings = get_settings()
    return settings.PULSE_ZONE_OFFSET_MINUTES, settings.PULSE_ZONE_NAME


def _offset(offset: int | None) -> int:
    """The zone offset in minutes. Offsets west of UTC are not supported in this version: 0 to 1439 only."""
    value = zone()[0] if offset is None else offset
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value < 1440:
        raise ValueError('zone offset must be whole minutes from 0 to 1439')
    return value


def read_time(value) -> datetime | None:
    """A timestamp as a naive UTC datetime: with its own zone when it carries one, as UTC when it carries none."""
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
    if isinstance(value, date):
        return datetime.combine(value, time())
    if not isinstance(value, str):
        return None
    found = _TIME.fullmatch(value)
    if not found:
        return None
    year, month, day, hour, minute, second, fraction, zone_text = found.groups()
    try:
        moment = datetime(int(year), int(month), int(day), int(hour or 0), int(minute or 0), int(second or 0),
                          (int((fraction or '0')[:3].ljust(3, '0'))) * 1000)
    except ValueError:
        return None
    if zone_text and zone_text.upper() != 'Z':
        digits = zone_text.replace(':', '')
        minutes = int(digits[1:3]) * 60 + int(digits[3:5])
        moment -= timedelta(minutes=minutes if digits[0] == '+' else -minutes)
    return moment


def has_clock(value) -> bool:
    moment = read_time(value)
    return moment is not None and moment.time() != time()


def local_day(value, offset: int | None = None) -> str | None:
    shift = timedelta(minutes=_offset(offset))
    moment = read_time(value)
    if moment is None:
        return None
    if has_clock(moment):
        moment += shift
    return moment.date().isoformat()


def local_time(value, offset: int | None = None) -> datetime | None:
    """The zone's wall-clock time of an instant, as a naive datetime, for printing a time. It shifts every readable
    value: a post checks `has_clock` first, since a post without a clock has a day and no time."""
    shift = timedelta(minutes=_offset(offset))
    moment = read_time(value)
    return None if moment is None else moment + shift


def _day(value) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not _DAY.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def week_start(day) -> str | None:
    value = _day(day)
    return None if value is None else (value - timedelta(days=value.weekday())).isoformat()


def period_bounds(date_from, date_to, offset: int | None = None) -> tuple[datetime | None, datetime | None]:
    """Whole days of the zone as UTC bounds for SQL filters: start inclusive, end exclusive (the next local midnight).

    For every supported offset (0 to 1439 minutes) a post without a clock (00:00 UTC on day D) falls inside the
    bounds of day D and outside those of D-1 and D+1, so a query using these bounds needs no special case for it.
    Outside SQL, use `in_period`."""
    shift = timedelta(minutes=_offset(offset))
    first, last = _day(date_from), _day(date_to)
    start = datetime.combine(first, time()) - shift if first else None
    end = datetime.combine(last + timedelta(days=1), time()) - shift if last else None
    return start, end


def period_closed_bounds(date_from, date_to, offset: int | None = None) -> tuple[datetime | None, datetime | None]:
    """`period_bounds` for a query written `>= start` and `<= last`: the end is the last microsecond before the next
    local midnight, so a post at that midnight belongs to the next day and stays outside."""
    start, end = period_bounds(date_from, date_to, offset)
    return start, None if end is None else end - timedelta(microseconds=1)


def in_period(value, date_from, date_to, offset: int | None = None) -> bool:
    """Whether a post is in a period of whole zone days, first and last included. With no period chosen every post is
    inside; with one, a post without a date is outside. A post without a clock belongs to the date its source gave."""
    day = local_day(value, offset)
    first, last = _day(date_from), _day(date_to)
    if first is None and last is None:
        return True
    if day is None:
        return False
    return (first is None or day >= first.isoformat()) and (last is None or day <= last.isoformat())


def reported(value) -> int | None:
    """A whole number of zero or more, or a string of digits. Anything else is not reported."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float):
        return int(value) if value.is_integer() and value >= 0 else None
    if isinstance(value, str) and _DIGITS.fullmatch(value):
        return int(value)
    return None


def interactions(metrics: dict | None) -> int | None:
    metrics = metrics if isinstance(metrics, dict) else {}
    parts = [n for n in (reported(metrics.get(key)) for key in ('likes', 'comments', 'shares')) if n is not None]
    return sum(parts) if parts else reported(metrics.get('engagement'))


def _metrics(item) -> dict:
    """A metrics dict, or a post that carries one under `metrics`."""
    if not isinstance(item, dict):
        return {}
    inner = item.get('metrics')
    return inner if isinstance(inner, dict) else ({} if 'metrics' in item else item)


def interactions_total(metrics_list) -> dict:
    """interactions_v1 over posts (metrics dicts, or posts that carry them): the sum over the posts whose interactions
    are known, with how many posts that is. Unknown (None, 0 posts) when none is known; never 0 for unknown."""
    known = [n for n in (interactions(_metrics(m)) for m in metrics_list or []) if n is not None]
    return {'value': sum(known) if known else None, 'posts': len(known)}


def shares_total(metrics_list) -> int | None:
    own = [n for n in (reported(_metrics(m).get('shares')) for m in metrics_list or []) if n is not None]
    return sum(own) if own else None


def content_shares(metrics_list) -> int | None:
    rows = [_metrics(m) for m in metrics_list or []]
    own = shares_total(rows)
    carried = [n for n in (reported(m.get('original_shares')) for m in rows if m.get('repost') is True) if n is not None]
    if own is None and not carried:
        return None
    return max(own or 0, max(carried, default=0))


def interaction_sort_key(interactions, published_at, post_id) -> tuple:
    """Known before unknown, larger first, then earlier publication, then id."""
    moment = read_time(published_at)
    return (interactions is None, -(interactions or 0), moment is None, moment or datetime.min,
            '' if post_id is None else str(post_id))


def first_sort_key(published_at, post_id) -> tuple:
    """clock_v1 order of "who was first": by day; on one day a post with a clock comes before one whose source gave a
    date only, which never takes part in the order by time; then time, then id. No readable date comes last."""
    day = local_day(published_at)
    clock = day is not None and has_clock(published_at)
    return (day is None, day or '', not clock, read_time(published_at) if clock else datetime.min,
            '' if post_id is None else str(post_id))


def tone(metrics: dict | None) -> str:
    stored = (metrics or {}).get('sentiment') if isinstance(metrics, dict) else None
    label = stored.get('label') if isinstance(stored, dict) else stored
    label = label.strip().lower() if isinstance(label, str) else None
    return label if label in TONES else 'unknown'


def tone_shares(counts: dict) -> dict:
    """tone_share_v2: shares of every post counted (`total`), the ones not analysed yet included, so positive, neutral,
    negative and unknown (belum dianalisis) are four whole numbers adding up to 100 (largest remainder, ties in that
    order). A part with posts that would print as 0 prints "<1%". No shares when there are no posts at all."""
    values = {key: reported((counts or {}).get(key)) or 0 for key in SHARE_KEYS}
    total = sum(values.values())
    if not total:
        return {'total': 0, 'analysed': 0, 'unknown': 0, 'percent': None, 'text': None}
    percent = {key: values[key] * 100 // total for key in SHARE_KEYS}
    left = 100 - sum(percent.values())
    for key in sorted(SHARE_KEYS, key=lambda k: -(values[k] * 100 % total))[:left]:
        percent[key] += 1
    text = {key: '<1%' if values[key] and not percent[key] else f'{percent[key]}%' for key in SHARE_KEYS}
    return {'total': total, 'analysed': total - values['unknown'], 'unknown': values['unknown'], 'percent': percent, 'text': text}


def sample_tone_shares(counts: dict) -> dict:
    """Comments are read as a sample (the most-liked ones of the busiest posts), not a backlog that drains, so their
    shares are tone_share_v2 over the analysed comments only: the waiting ones are coverage, said apart."""
    return tone_shares({key: (counts or {}).get(key) for key in TONES})


def _trim(value) -> str:
    return value.strip(_SPACE) if isinstance(value, str) else ''


def _handle(value) -> str:
    return _trim(value).lstrip('@').lower()


def _provider_id(value) -> str:
    """An id counts when it is a non-empty string, or a whole number in the range both sides hold exactly
    (a whole-number float included, since the browser cannot tell 5.0 from 5). Anything else is no id."""
    if isinstance(value, str):
        return _trim(value)
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) <= MAX_SAFE_ID:
        return str(value)
    return ''


def account_key(platform: str | None, author: str | None, metrics: dict | None) -> str | None:
    platform = _trim(platform).lower()
    if not platform:
        return None
    provider_id = _provider_id(metrics.get('author_id')) if isinstance(metrics, dict) else ''
    if platform in ('x', 'threads', 'reddit'):
        identity = _handle(author)
    elif platform == 'news':
        identity = _trim(author).lower()
    else:
        identity = provider_id or _handle(author)
    return f'{platform}:{identity}' if identity else None


def account_name(posts) -> str | None:
    """account_v1: the name shown for an account is the `author` text, as written, of its most recently published post
    that has one. A post without a readable time comes after every dated post; on a tie the first post given wins."""
    name, latest = None, None
    for post in posts or []:
        author = post.get('author') if isinstance(post, dict) else None
        if not _trim(author):
            continue
        moment = read_time(post.get('published_at'))
        if name is None or (moment is not None and (latest is None or moment > latest)):
            name, latest = author, moment
    return name


def post_account(post) -> str | None:
    """account_v1 of a post: the `measures.account` it carries, else its key from platform, author and metrics. A post
    without a name still belongs to an account when its platform keys by id; its name is then unknown (None)."""
    if not isinstance(post, dict):
        return None
    measures = post.get('measures')
    if isinstance(measures, dict) and measures.get('account') is not None:
        return measures['account']
    return account_key(post.get('platform'), post.get('author'), post.get('metrics'))


def account_count(posts) -> int:
    """account_v1: how many accounts posted these, distinct keys; a post without a key is no account."""
    return len({key for key in map(post_account, posts or []) if key})


def post_measures(published_at, platform, author, metrics, post_id=None) -> dict:
    return {'day': local_day(published_at), 'clock': has_clock(published_at), 'interactions': interactions(metrics),
            'account': account_key(platform, author, metrics), 'tone': tone(metrics)}
