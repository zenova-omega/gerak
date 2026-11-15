"""A news publisher's own site icon, read from its home page. One page, never a crawl.

The address comes from collected data, so it is treated as untrusted: HTTPS on the default port only,
every hop must resolve to public addresses, the connection is pinned to the address that was checked,
redirects are followed by hand (three at most), and the body is capped.
"""
import asyncio
import ipaddress
import re
import socket
from urllib.parse import urljoin, urlsplit
import httpx
from .xpoz import _public_image_url

MAX_HTML = 400_000
_LINK = re.compile(r'<link\b[^>]{0,2000}>', re.I)
_ATTR = re.compile(r'([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))')


def public_site(value):
    """The https home address of a publisher, or None when it is not a plain public web address."""
    url = _public_image_url(value)
    return url if url and len(url) <= 500 else None


async def _public_address(host):
    """One address for `host`, only if every address it resolves to is public."""
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError:
        return None
    addresses = list(dict.fromkeys(info[4][0].split('%')[0] for info in infos))
    if not addresses or not all(ipaddress.ip_address(address).is_global for address in addresses):
        return None
    return addresses[0]


async def _get(client, url, limit):
    """(final url, content type, body) of a capped GET, or None. Redirects are re-validated one by one."""
    for _ in range(4):
        clean = _public_image_url(url)
        if not clean:
            return None
        parts = urlsplit(clean)
        address = await _public_address(parts.hostname)
        if not address:
            return None
        literal = f'[{address}]' if ':' in address else address
        target = f'https://{literal}{parts.path or "/"}' + (f'?{parts.query}' if parts.query else '')
        # Connect to the address that was just checked; the name is still what the certificate must match.
        async with client.stream('GET', target, headers={'Host': parts.hostname}, extensions={'sni_hostname': parts.hostname}) as response:
            if response.status_code in (301, 302, 303, 307, 308):
                url = urljoin(clean, response.headers.get('location', ''))
                continue
            if response.status_code != 200:
                return None
            body = b''
            async for chunk in response.aiter_bytes():
                body += chunk
                if len(body) >= limit:
                    break
            return clean, response.headers.get('content-type', '').lower(), body[:limit]
    return None


def best_icon(html, base):
    """The largest declared icon of a page: a touch icon first, then any sized icon, then a plain favicon."""
    best = (0, None)
    for tag in _LINK.findall(html):
        attrs = {name.lower(): (a or b or c) for name, a, b, c in _ATTR.findall(tag)}
        rel, href = (attrs.get('rel') or '').lower(), (attrs.get('href') or '').strip()
        if not href or 'icon' not in rel.split() + rel.replace('-', ' ').split() or 'mask-icon' in rel:
            continue
        size = max([int(n) for n in re.findall(r'(\d{1,4})x\d{1,4}', attrs.get('sizes') or '')] or [180 if 'apple-touch-icon' in rel else 0])
        score = (2000 if 'apple-touch-icon' in rel else 1000 if size >= 96 else 0) + min(size, 512) + 1
        url = _public_image_url(urljoin(base, href))
        if url and score > best[0]:
            best = (score, url)
    return best[1]


async def fetch_site_icon(site_url):
    """The icon address for one publisher site, or None. At most two reads: the home page, then /favicon.ico."""
    site = public_site(site_url)
    if not site:
        return None
    try:
        async with asyncio.timeout(20):
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=False, headers={'User-Agent': 'Mozilla/5.0 (compatible; site-icon)', 'Accept': 'text/html,*/*;q=0.5'}) as client:
                page = await _get(client, site, MAX_HTML)
                if page:
                    icon = best_icon(page[2].decode('utf-8', 'replace'), page[0])
                    if icon:
                        return icon
                fallback = await _get(client, urljoin(page[0] if page else site, '/favicon.ico'), 4096)
                return fallback[0] if fallback and fallback[1].startswith('image/') else None
    except (httpx.HTTPError, TimeoutError, ValueError, OSError):
        return None


PHOTO_BYTES = 300_000
IMAGE_SIGNATURES = {'image/jpeg': (b'\xff\xd8\xff',), 'image/png': (b'\x89PNG\r\n\x1a\n',), 'image/gif': (b'GIF87a', b'GIF89a'), 'image/webp': (b'RIFF',)}


async def fetch_image(url):
    """(content type, bytes) of a small public picture, or None.
    Kept only when the declared type is an image type we serve and the bytes begin like one, so nothing else can be
    stored and handed back to a browser as a picture. Same address checks as every other fetch in this module."""
    try:
        async with asyncio.timeout(20):
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=False, headers={'User-Agent': 'Mozilla/5.0 (compatible; account-picture)', 'Accept': 'image/*'}) as client:
                got = await _get(client, url, PHOTO_BYTES)
    except (httpx.HTTPError, TimeoutError, ValueError, OSError):
        return None
    if not got:
        return None
    kind, body = (got[1] or '').split(';')[0].strip().lower(), got[2]
    if kind not in IMAGE_SIGNATURES or not body or len(body) >= PHOTO_BYTES or not body.startswith(IMAGE_SIGNATURES[kind]):
        return None
    return kind, body
