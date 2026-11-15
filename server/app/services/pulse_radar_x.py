"""What X is talking about in Indonesia, for the issue radar.

The social supplier has no list of trends, so the hosted engine is asked once, with its live search of X switched on,
which public issues are loud there. Its answer is kept only where it points at posts: an issue without a post link is
dropped, and a link that is not a post (a profile, a search, another site) is removed. How loud an issue is on X is
not taken from this answer; it is counted afterwards (pulse_radar_measure).
"""
import re
from datetime import timedelta

from .pulse_radar_compose import _object
from .pulse_radar_signals import plain

POST_LINK = re.compile(r'https://(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/status/\d{5,25}')
MAX_ISSUES = 12
SYSTEM = ('Anda mencari isu publik yang sedang ramai dibicarakan pengguna X di Indonesia. Pakai hanya apa yang ditemukan pencarian; jangan menambah '
          'fakta atau dugaan, dan jangan menyebut diri Anda. Jawab HANYA dengan satu objek JSON yang sah, tanpa teks lain.')
PROMPT = ('Cari di X isu publik yang paling ramai dibicarakan pengguna di Indonesia dalam 24 jam terakhir (politik, hukum, ekonomi, bencana, sosial, '
          'teknologi, olahraga, hiburan). Berikan paling banyak 12 isu yang berbeda, dari yang paling ramai. Untuk tiap isu tulis judul netral paling '
          'panjang 70 karakter dan dua atau tiga tautan posting X yang mewakilinya.\n'
          'FORMAT JAWABAN: {"issues": [{"title": "...", "posts": ["https://x.com/akun/status/123"]}]}')


def handle_of(link):
    """The account a post link belongs to, or an empty string. "i" is the address of a post whose account is not named."""
    found = POST_LINK.match(str(link or ''))
    return found.group(1) if found and found.group(1).lower() != 'i' else ''


def parse_discovery(text):
    """Issues of an answer that come with posts: [{'title', 'posts'}]. The same title twice is one issue."""
    data = _object(text)
    if data is None or not isinstance(data.get('issues'), list):
        return []
    found = {}
    for raw in data['issues']:
        if not isinstance(raw, dict) or not isinstance(raw.get('title'), str) or not isinstance(raw.get('posts'), list):
            continue
        title = plain(raw['title'])
        links = [match.group(0) for value in raw['posts'] if isinstance(value, str) for match in [POST_LINK.match(value.strip())] if match]
        if not title or not links:
            continue
        issue = found.setdefault(title.lower(), {'title': title, 'posts': []})
        issue['posts'].extend(link for link in links if link not in issue['posts'])
    return list(found.values())[:MAX_ISSUES]


async def discover(engine, now):
    """X signals for one refresh, or None when there is no discovery this time: the engine cannot search X, is busy
    or refused, or its answer holds no issue with a post. The caller goes on without X; it never fails for this."""
    if engine is None or not hasattr(engine, 'search_x'):
        return None
    from .ai import hosted
    hosted.set_lane('radar_x')
    try:
        text = await engine.search_x(PROMPT, from_date=(now - timedelta(days=1)).date().isoformat(), to_date=(now + timedelta(days=1)).date().isoformat(), system=SYSTEM)
    except Exception:
        return None
    issues = parse_discovery(text)
    if not issues:
        return None
    return [{'platform': 'x', 'title': issue['title'], 'url': issue['posts'][0], 'source': None, 'figure': None, 'provinces': {}, 'section': None,
             'related': [{'title': 'Posting di X', 'url': link, 'source': None} for link in issue['posts'][1:]]} for issue in issues]
