"""Readings of part 3 of the calculation dictionary: who is speaking. An account's follower count, and the size of the
speakers behind a selection. Built on part 1's rules (account, interactions, tone) in pulse_measures and never
counting an account, an interaction or a tone a second way. This file and src/lib/pulseDemography.js are the only
homes of these readings; both are tested against shared/pulse-demography.cases.json.

Every function takes posts already scoped to a period and platforms, as dicts with `platform`, `author`, `metrics`
(the follower count of the author is `metrics.author_followers`), `published_at`, `crawled_at` and
`first_observed_at`."""
from datetime import datetime

from . import pulse_measures as m
from .pulse_places import province_of_location

RULES: dict[str, str] = {'followers': 'followers_v1', 'tier': 'account_tier_v1', 'origin': 'account_origin_v1', 'lead': 'group_lead_v1'}
RULE_TEXT: dict[str, str] = {
    'followers': 'Pengikut sebuah akun adalah angka pada postingan akun itu yang paling baru dikumpulkan dan melaporkan jumlah pengikut; tanpa waktu pengumpulan, angka yang lebih besar; angka yang bukan bilangan bulat nol atau lebih dianggap tidak dilaporkan.',
    'tier': 'Postingan berita membentuk baris Pemberitaan; postingan media sosial masuk ke golongan menurut pengikut akunnya: 1 jt atau lebih, 100 rb sampai di bawah 1 jt, 10 rb sampai di bawah 100 rb, 1 rb sampai di bawah 10 rb, di bawah 1 rb, atau pengikut tidak diketahui.',
    'origin': 'Asal akun X dibaca dari lokasi yang ditulis pemiliknya dan negara tempat tinggal yang disebut platform, pada postingan akun itu yang paling baru dikumpulkan; akun yang belum ditanyakan, yang tidak menulis lokasi, dan yang lokasinya tidak menyebut provinsi dihitung terpisah.',
    'lead': 'Kalimat pembuka disusun dari angka golongan akun, tanpa model, bila sedikitnya dua golongan bisa dibandingkan. Golongan dengan posting terbanyak atau interaksi terbesar disebut hanya bila selisihnya dengan golongan berikutnya lebih besar dari bagian akun yang pengikutnya tidak diketahui; bila bagian itu sama dengan atau lebih besar dari golongan teratas, yang disebut adalah bagian itu dan dua platform terbesarnya. Golongan paling negatif disebut bila sedikitnya dua golongan punya 20 postingan yang dianalisis atau lebih dan golongan itu punya postingan negatif; bila akun yang pengikutnya tidak diketahui juga punya 20 postingan yang dianalisis, golongan itu disebut paling negatif di luar akun yang pengikutnya tidak diketahui, dan nada akun tersebut ditambahkan bila lebih negatif. Provinsi dengan akun X terbanyak disebut bila sedikitnya 10 akun terbaca provinsinya.',
}
# account_tier_v1: the rows in the order they are shown. A tier with a `min` holds the accounts with at least that
# many followers and fewer than the `min` of the tier above.
TIERS: tuple[dict, ...] = (
    {'key': 'news', 'label': 'Pemberitaan'},
    {'key': '1m', 'label': '\u22651 jt', 'min': 1000000},
    {'key': '100k', 'label': '100 rb\u20131 jt', 'min': 100000},
    {'key': '10k', 'label': '10\u2013100 rb', 'min': 10000},
    {'key': '1k', 'label': '1\u201310 rb', 'min': 1000},
    {'key': 'small', 'label': '<1 rb', 'min': 0},
    {'key': 'unknown', 'label': 'Pengikut tidak diketahui'},
)
TOP_ACCOUNTS = 3
_NEVER = datetime.min   # a post with no collection time is earlier than any with one


def _figures(post) -> dict:
    """A post's account, interactions and tone from part 1's rules."""
    post = post if isinstance(post, dict) else {}
    return m.post_measures(post.get('published_at'), post.get('platform'), post.get('author'), post.get('metrics'))


def _key(post) -> str | None:
    """The account (account_v1 key) of a post, or None when it has none."""
    key = _figures(post)['account']
    return key if isinstance(key, str) and ':' in key else None


def _latest_by(posts, read) -> dict:
    """Per account (account_v1 key), what `read` finds on its most recently collected post that carries something
    (`crawled_at`, then `first_observed_at`). A post with a collection time is later than one without; on the same
    time, or with no time on either, the larger value wins (a number by size, a text by code point: its readers return
    nothing else), and `read` returning None means the post carries nothing. The one rule behind followers_v1 and
    account_origin_v1. Returns {key: (seen, value, post)}."""
    best: dict[str, tuple] = {}
    for post in posts or ():
        value = read(post)
        key = _key(post)
        if value is None or key is None:
            continue
        seen = m.read_time(post.get('crawled_at')) or m.read_time(post.get('first_observed_at')) or _NEVER
        if key not in best or seen > best[key][0] or (seen == best[key][0] and value > best[key][1]):
            best[key] = (seen, value, post)
    return best


def _metric(post, field):
    metrics = post.get('metrics') if isinstance(post, dict) else None
    return metrics.get(field) if isinstance(metrics, dict) else None


def _platform(post) -> str:
    """The platform of a post as stored; `unknown` when it has none."""
    value = post.get('platform') if isinstance(post, dict) else None
    return value if isinstance(value, str) and value else 'unknown'


def followers_of(posts) -> dict[str, int]:
    """followers_v1: the follower count of each account (account_v1 key), read from `metrics.author_followers`. The
    figure on the account's most recently collected post that carries one wins (`crawled_at`, then
    `first_observed_at`); a post with a collection time is later than one without, and on the same time, or with no
    time on either, the larger figure wins. A figure that is not a whole number of zero or more is not reported
    (part 1's `reported`)."""
    return {key: value for key, (_, value, _post) in _latest_by(posts, lambda post: m.reported(_metric(post, 'author_followers'))).items()}


def tier_of(post, followers: dict) -> str:
    """account_tier_v1: the tier key of one post, given the follower counts of its selection (`followers_of` of the
    whole selection, so every post of an account sits in one tier). A post of voice `news` (platform `news`) is
    Pemberitaan whatever its followers; a social media post is in the tier of its account's figure, by the lower bounds
    of TIERS (inclusive), or `unknown` when the post has no account or the account has no figure. The one grouping
    `account_tiers` counts by."""
    if isinstance(post, dict) and post.get('platform') == 'news':
        return 'news'
    count = (followers or {}).get(_key(post))
    return 'unknown' if count is None else next(tier['key'] for tier in TIERS if 'min' in tier and count >= tier['min'])


def account_tiers(posts) -> dict:
    """account_tier_v1: the size of the speakers. Posts of voice `news` (platform `news`) form the row Pemberitaan
    whatever their followers; a social media post is in the tier of its account's `followers_v1` figure, or in
    `unknown` when the account has none or the post has no account (`tier_of`). Per row: accounts, posts and their share of every
    post, the interactions (interactions_v1, with the posts they rest on) and their share of the selection's known
    interactions (None when the row's are unknown or the selection's total is 0), the tone, its `platforms` (the posts
    and known interactions of each platform, by posts, larger first, ties by platform; `unknown` for a post without
    one) and the `top` accounts (three at most): by the interactions of their posts, known before unknown, larger
    first, ties by account key; Pemberitaan by posts, ties by account key. Rows are in the order of TIERS and only
    those with posts are listed."""
    items = list(posts or ())
    followers = followers_of(items)
    groups: dict[str, list] = {tier['key']: [] for tier in TIERS}
    social = known = 0
    for post in items:
        key = tier_of(post, followers)
        if key != 'news':
            social += 1
            known += key != 'unknown'
        groups[key].append(post)
    everything = m.interactions_total(items)['value']
    rows = []
    for tier in TIERS:
        own = groups[tier['key']]
        if not own:
            continue
        accounts: dict[str, list] = {}
        platforms: dict[str, list] = {}
        counts = dict.fromkeys((*m.TONES, 'unknown'), 0)
        for post in own:
            counts[_figures(post)['tone']] += 1
            key = _key(post)
            if key is not None:
                accounts.setdefault(key, []).append(post)
            platforms.setdefault(_platform(post), []).append(post)
        named = [{'account': account, 'name': m.account_name(rows_), 'platform': account.split(':', 1)[0],
                  'posts': len(rows_), 'interactions': m.interactions_total(rows_)['value']} for account, rows_ in accounts.items()]
        if tier['key'] == 'news':
            named.sort(key=lambda row: (-row['posts'], row['account']))
        else:
            named.sort(key=lambda row: (row['interactions'] is None, -(row['interactions'] or 0), row['account']))
        total = m.interactions_total(own)
        rows.append({
            'key': tier['key'], 'label': tier['label'], 'accounts': len(accounts), 'posts': len(own),
            'post_share': len(own) / len(items), 'interactions': total,
            'interaction_share': total['value'] / everything if total['value'] is not None and everything else None,
            'tone': m.tone_shares(counts),
            'platforms': sorted(({'platform': platform, 'posts': len(list_), 'interactions': m.interactions_total(list_)['value']}
                                 for platform, list_ in platforms.items()), key=lambda row: (-row['posts'], row['platform'])),
            'top': [{key: row[key] for key in ('account', 'name', 'platform', 'interactions')} for row in named[:TOP_ACCOUNTS]],
        })
    return {'total': len(items), 'social_posts': social, 'followers_known_posts': known, 'known_interactions': everything, 'rows': rows}


def followers_known_share(tiers: dict) -> float | None:
    """account_tier_v1: the share of social media posts whose account's follower count is known (the base every tier
    but Pemberitaan rests on), from an `account_tiers` reading; None when there is no social media post."""
    social = (tiers or {}).get('social_posts')
    return tiers['followers_known_posts'] / social if social else None


def followers_known_interaction_share(tiers: dict) -> float | None:
    """account_tier_v1: the share of the known interactions of social media posts that come from accounts whose
    follower count is known (Pemberitaan left out), from an `account_tiers` reading; None when no social media
    interaction is known. Beside `followers_known_share` it says how much of the interaction column the tiers can
    place."""
    social = known = 0
    for row in (tiers or {}).get('rows') or []:
        value = row['interactions']['value']
        if row['key'] == 'news' or value is None:
            continue
        social += value
        if row['key'] != 'unknown':
            known += value
    return known / social if social else None


# account_origin_v1: "based in" values that name a region, not a country (compared ignoring case and outer spaces).
REGIONS: tuple[str, ...] = ('Southeast Asia', 'East Asia', 'East Asia & Pacific', 'South Asia', 'West Asia', 'Central Asia', 'Asia', 'Asia Pacific',
                            'Middle East', 'Europe', 'North America', 'South America', 'Latin America', 'Africa', 'Oceania')
_REGION_SET = frozenset(name.lower() for name in REGIONS)
ORIGIN_PROVINCES = 8   # provinces listed
_COUNTRIES = ('indonesia', 'abroad', 'region_only', 'unknown')


def _text(field):
    """A reader of a profile text on a post: the text, or None when the post does not carry the key."""
    return lambda post: value if isinstance(value := _metric(post, field), str) else None


def country_of(based_in) -> str:
    """account_origin_v1: the country group a "based in" value puts an account in: `indonesia`, `region_only` (a name
    in REGIONS: a region can include Indonesia, so it is never abroad), `abroad` (any other text) or `unknown`
    (missing, blank or not a text); compared ignoring case and outer spaces. The one grouping `account_origin` counts
    by."""
    name = based_in.strip().lower() if isinstance(based_in, str) else ''
    return 'unknown' if not name else 'indonesia' if name == 'indonesia' else 'region_only' if name in _REGION_SET else 'abroad'


def _published(own):
    """The most recently published post of an account, by the rule that picks its name (account_v1): the latest
    readable `published_at`; a post without one comes after every dated post; on a tie the first post given wins."""
    found, latest = None, None
    for post in own:
        moment = m.read_time(post.get('published_at'))
        if found is None or (moment is not None and (latest is None or moment > latest)):
            found, latest = post, moment
    return found


def _standing(rows) -> dict:
    """Accounts and posts with the tone of those posts."""
    counts = dict.fromkeys((*m.TONES, 'unknown'), 0)
    for row in rows:
        for post in row['list']:
            counts[_figures(post)['tone']] += 1
    return {'accounts': len(rows), 'posts': sum(row['posts'] for row in rows), 'tone': m.tone_shares(counts)}


def account_origin(posts) -> dict:
    """account_origin_v1: where the X accounts speaking are from. X posts only; an account is `account_v1`. Its
    location (`metrics.author_location`) and its "based in" (`metrics.author_based_in`) are each read from the
    account's most recently collected post that carries it, as followers_v1 reads a follower count. No post carries a
    location: the account is `unasked`; an empty text: `no_location`; any other text: `with_location`, of which
    `province_read` name a province (province_of_location). "Based in" sorts every account into `country` by
    `country_of`: indonesia, `abroad` (a country), `region_only` (a name in REGIONS) or `unknown` (missing or empty).
    Provinces: the eight with
    most accounts, then most posts, then name; places of a province by accounts, then name. Accounts are by known
    interactions, larger first, unknown last, ties by key; `post` is the account's most recently published post (the rule of its name), `based_in` is returned as stored, untrimmed. An
    account without a dated post is counted and has `first_day` None."""
    items = [post for post in posts or () if (_key(post) or '').startswith('x:')]
    locations, based_in = _latest_by(items, _text('author_location')), _latest_by(items, _text('author_based_in'))
    followers = followers_of(items)
    by_account: dict[str, list] = {}
    for post in items:
        by_account.setdefault(_key(post), []).append(post)
    rows = []
    for key, own in by_account.items():
        location = locations[key][1] if key in locations else None
        days = sorted(day for day in (_figures(post)['day'] for post in own) if day)
        rows.append({
            'key': key, 'author': m.account_name(own), 'location': location, 'based_in': based_in[key][1] if key in based_in else None,
            'province': province_of_location(location) if location and location.strip() else None,
            'first_day': days[0] if days else None, 'posts': len(own), 'interactions': m.interactions_total(own),
            'followers': followers.get(key), 'post': _published(own), 'list': own,
        })
    rows.sort(key=lambda row: (row['interactions']['value'] is None, -(row['interactions']['value'] or 0), row['key']))
    country = {name: _standing([row for row in rows if country_of(row['based_in']) == name]) for name in _COUNTRIES}
    where: dict[str, list] = {}
    for row in rows:
        if row['province']:
            where.setdefault(row['province']['code'], []).append(row)
    provinces = []
    for own in where.values():
        counts: dict[str, int] = {}
        for row in own:
            counts[row['province']['place']] = counts.get(row['province']['place'], 0) + 1
        provinces.append({'code': own[0]['province']['code'], 'name': own[0]['province']['name'], **_standing(own),
                          'places': sorted(([place, count] for place, count in counts.items()), key=lambda item: (-item[1], item[0]))})
    provinces.sort(key=lambda row: (-row['accounts'], -row['posts'], row['name']))
    asked = [row for row in rows if row['location'] is not None]
    return {
        'accounts': len(rows), 'unasked': len(rows) - len(asked), 'no_location': sum(not row['location'].strip() for row in asked),
        'with_location': sum(bool(row['location'].strip()) for row in asked), 'province_read': sum(bool(row['province']) for row in rows),
        'country': country, 'provinces': provinces[:ORIGIN_PROVINCES],
        'rows': [{key: value for key, value in row.items() if key != 'list'} for row in rows],
    }


def account_share(group: dict, origin: dict) -> float | None:
    """account_origin_v1: the share of every X account in the selection held by a country group or a province of an
    `account_origin` reading; None when there is no X account. Every share of the origin is over that one base."""
    accounts = (origin or {}).get('accounts')
    return group['accounts'] / accounts if accounts else None


def province_read_share(origin: dict) -> float | None:
    """account_origin_v1: the share of every X account whose province is read; None when there is no X account."""
    accounts = (origin or {}).get('accounts')
    return origin['province_read'] / accounts if accounts else None


COMPARE_MIN_ROWS = 2         # group_lead_v1: groups are compared only when at least this many can be named
NEGATIVE_MIN_ANALYSED = 20   # group_lead_v1: analysed posts a row needs to be named the most negative
WHERE_MIN_ACCOUNTS = 10      # group_lead_v1: accounts with a province needed to name one
GAP_PLATFORMS = 2            # group_lead_v1: the platforms a gap is said to sit on, largest first


def _measure_lead(rows, unknown, value):
    """group_lead_v1 on one measure, `value` of a row being its posts or its known interactions (unknown counted as
    0): the nameable row with the largest value (on equal values the earlier row of TIERS) is named only when its lead
    over the next is larger than the unknown row's value, so a tie is no lead; the gap when the unknown row's value is
    above 0 and at least the leader's. Whole counts, so both runtimes decide alike. Returns (row key or None, gap)."""
    first = second = None
    for row in rows:
        if first is None or value(row) > value(first):
            second, first = first, row
        elif second is None or value(row) > value(second):
            second = row
    top = value(first) if first else 0
    lead = top - (value(second) if second else 0)
    gap = value(unknown) if unknown else 0
    return (first['key'] if first and lead > gap else None), gap > 0 and gap >= top


def _gap_platforms(unknown, value, total):
    """group_lead_v1: the platforms the unknown row's `value` (its posts, or its known interactions) mostly sits on:
    the GAP_PLATFORMS largest above 0, ties by platform, each with its share of the row's `total`."""
    found = sorted(((platform['platform'], value(platform) or 0) for platform in unknown['platforms']), key=lambda item: (-item[1], item[0]))
    return [{'platform': platform, 'share': amount / total} for platform, amount in found if amount > 0][:GAP_PLATFORMS]


def group_lead(tiers: dict, origin: dict) -> dict:
    """group_lead_v1: what the readings above say first, without a model. The rows that may be named are every
    TIERS row but `unknown` ("Pengikut tidak diketahui" names a gap in the data, not a kind of speaker).
    `carrier`: when at least COMPARE_MIN_ROWS rows may be named (else None), on each measure (posts; known
    interactions): `posts_row` / `interactions_row`, the row with the most, named only when its lead over the next
    nameable row is larger than the unknown row's count on that measure (else None: the gap could overturn it);
    `posts_gap` / `interactions_gap` when the unknown row's count is above 0 and at least the leader's: its share (of
    every post, of the known interactions) and the GAP_PLATFORMS platforms it mostly sits on, with their shares of the
    row's own. `negative`: when at least COMPARE_MIN_ROWS nameable rows have NEGATIVE_MIN_ANALYSED analysed posts or
    more, the one of them with the largest tone_share_v1 negative percent (`share`), ties by more analysed posts, then
    by TIERS order; None when there is none or that row has no negative post. `unknown` is the unknown row's tone when
    it has NEGATIVE_MIN_ANALYSED analysed posts (the comparison then leaves out the accounts whose follower count is unknown), with
    `more_negative` when its negative percent is higher; else None.
    `where`: the first province of `origin` when at least WHERE_MIN_ACCOUNTS accounts have a province, with
    `read_share` the share of X accounts whose province is read."""
    every = (tiers or {}).get('rows') or []
    rows = [row for row in every if row['key'] != 'unknown']
    unknown = next((row for row in every if row['key'] == 'unknown'), None)
    carrier = None
    if len(rows) >= COMPARE_MIN_ROWS:
        posts_row, posts_gap = _measure_lead(rows, unknown, lambda row: row['posts'])
        interactions_row, interactions_gap = _measure_lead(rows, unknown, lambda row: row['interactions']['value'] or 0)
        carrier = {
            'posts_row': posts_row, 'interactions_row': interactions_row,
            'posts_gap': {'share': unknown['post_share'], 'platforms': _gap_platforms(unknown, lambda platform: platform['posts'], unknown['posts'])}
            if posts_gap else None,
            'interactions_gap': {'share': unknown['interaction_share'],
                                 'platforms': _gap_platforms(unknown, lambda platform: platform['interactions'], unknown['interactions']['value'])}
            if interactions_gap else None,
        }
    best = None
    compared = [row for row in rows if row['tone']['analysed'] >= NEGATIVE_MIN_ANALYSED and row['tone']['percent']]
    for row in compared if len(compared) >= COMPARE_MIN_ROWS else ():
        tone = row['tone']
        if best is None or tone['percent']['negative'] > best['tone']['percent']['negative'] or (
                tone['percent']['negative'] == best['tone']['percent']['negative'] and tone['analysed'] > best['tone']['analysed']):
            best = row
    negative = None
    if best and best['tone']['text']['negative'] != '0%':
        gap = unknown['tone'] if unknown and unknown['tone']['analysed'] >= NEGATIVE_MIN_ANALYSED else None
        negative = {'row': best['key'], 'share': best['tone']['percent']['negative'], 'analysed': best['tone']['analysed'],
                    'unknown': {'share': gap['percent']['negative'], 'analysed': gap['analysed'],
                                'more_negative': gap['percent']['negative'] > best['tone']['percent']['negative']} if gap else None}
    provinces = (origin or {}).get('provinces') or []
    where = None
    if provinces and origin['province_read'] >= WHERE_MIN_ACCOUNTS:
        where = {'code': provinces[0]['code'], 'name': provinces[0]['name'], 'accounts': provinces[0]['accounts'],
                 'read_share': province_read_share(origin)}
    return {'carrier': carrier, 'negative': negative, 'where': where}
