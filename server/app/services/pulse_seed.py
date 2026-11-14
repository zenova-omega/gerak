"""Normalize supported public post identifiers without fetching arbitrary URLs."""
import re
from urllib.parse import urlsplit, parse_qs


def normalize_seed_url(value: str) -> str:
    url = urlsplit(value.strip())
    if url.scheme != 'https' or url.username or url.password or url.port:
        raise ValueError('Gunakan URL HTTPS posting publik yang didukung.')
    host = (url.hostname or '').removeprefix('www.')
    path = url.path.rstrip('/')
    if host in ('x.com', 'twitter.com') and re.fullmatch(r'/[A-Za-z0-9_]+/status/[0-9]+', path):
        return 'https://x.com' + path
    if host == 'instagram.com' and re.fullmatch(r'/(p|reel|tv)/[A-Za-z0-9_-]+', path):
        return 'https://www.instagram.com' + path + '/'
    if host == 'tiktok.com' and re.fullmatch(r'/@[A-Za-z0-9_.]+/video/[0-9]+', path):
        return 'https://www.tiktok.com' + path
    video = None
    if host == 'youtu.be':
        video = path.lstrip('/')
    elif host in ('youtube.com', 'm.youtube.com'):
        if path == '/watch':
            video = parse_qs(url.query).get('v', [''])[0]
        elif path.startswith('/shorts/'):
            video = path.split('/')[-1]
    if video and re.fullmatch(r'[A-Za-z0-9_-]{11}', video):
        return 'https://www.youtube.com/watch?v=' + video
    raise ValueError('Gunakan tautan posting X, Instagram, TikTok atau video YouTube, bukan halaman profil/shortlink.')
