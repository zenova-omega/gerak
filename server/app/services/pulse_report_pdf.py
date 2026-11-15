"""The report as a PDF file, rendered by a headless Chromium on this server.

The browser sends the report pages as one HTML document. Rendering a document someone sends is only safe if it cannot
make the renderer read a file or call an address, so the document is checked before anything runs: its own styles,
embedded pictures and ordinary web links are allowed, and everything that points elsewhere is refused outright (the
document is never rewritten). The renderer itself runs without network: every request goes to a dead proxy.
"""
import asyncio
import os
import re
import shutil
import tempfile
from html.parser import HTMLParser
from pathlib import Path

MAX_DOCUMENT = 8_000_000
RENDER_SECONDS = 90
EMBEDDED_IMAGE = re.compile(r'data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\s]+', re.I)
FORBIDDEN_TAGS = frozenset(('script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'link', 'base', 'form', 'input', 'select', 'textarea',
                            'video', 'audio', 'source', 'track', 'canvas', 'applet', 'portal', 'foreignobject', 'noscript', 'template'))
URL_ATTRIBUTES = frozenset(('src', 'srcset', 'poster', 'data', 'action', 'formaction', 'background', 'ping', 'manifest', 'codebase', 'cite',
                            'longdesc', 'usemap', 'lowsrc', 'dynsrc', 'href', 'xlink:href'))
IMAGE_TAGS = frozenset(('img', 'image'))
CSS_FETCHERS = ('@import', '@font-face', '@namespace', 'expression(', '-moz-binding', 'behavior:', 'image-set(', 'src(', 'image(', 'element(', 'paint(')
USUAL_PLACES = ('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium')
_one_at_a_time = asyncio.Lock()


class PdfUnavailable(Exception):
    """No Chromium on this server."""


class PdfFailed(Exception):
    """Chromium ran and produced no usable file."""


def _plain_css(text):
    """CSS with its escapes resolved, lower case: `u\\72l(` is the same function as `url(` to a browser."""
    text = re.sub(r'\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?', lambda match: chr(int(match.group(1), 16)) if int(match.group(1), 16) < 0x110000 else '', text)
    return re.sub(r'\\(.)', r'\1', text).lower()


def check_css(text):
    """Raise ValueError when a style sheet or style attribute could make the renderer fetch something."""
    plain = _plain_css(text or '')
    for word in CSS_FETCHERS:
        if word in plain:
            raise ValueError('gaya memuat sumber luar')
    for match in re.finditer(r'url\(\s*([\'"]?)(.*?)\1\s*\)', plain, re.S):
        if not EMBEDDED_IMAGE.fullmatch(match.group(2).strip()):
            raise ValueError('gaya menunjuk ke luar dokumen')
    if plain.count('url(') != len(re.findall(r'url\(\s*([\'"]?)(.*?)\1\s*\)', plain, re.S)):
        raise ValueError('gaya tidak dapat dibaca')


class _Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in FORBIDDEN_TAGS:
            raise ValueError(f'unsur <{tag}> tidak diizinkan')
        names = {name.lower(): (value or '') for name, value in attrs}
        if tag == 'meta' and set(names) - {'charset'}:
            raise ValueError('unsur <meta> hanya boleh menyebut charset')
        for name, value in names.items():
            value = value.strip()
            if name.startswith('on'):
                raise ValueError('atribut peristiwa tidak diizinkan')
            if name == 'style':
                check_css(value)
            elif name in URL_ATTRIBUTES:
                if name in ('src', 'href', 'xlink:href') and tag in IMAGE_TAGS:
                    allowed = EMBEDDED_IMAGE.fullmatch(value) is not None
                elif name in ('href', 'xlink:href') and tag == 'a':
                    allowed = re.match(r'(https?://|#)', value, re.I) is not None
                elif name in ('href', 'xlink:href'):
                    allowed = value.startswith('#')
                else:
                    allowed = False
                if not allowed:
                    raise ValueError(f'atribut {name} menunjuk ke luar dokumen')
        self.in_style = tag == 'style'

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.in_style = False

    def handle_endtag(self, tag):
        if tag.lower() == 'style':
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            check_css(data)


def check_document(html):
    """Raise ValueError unless `html` is a self-contained report document. Nothing is repaired: a refused document
    is a bug in the page that built it, or an attempt, and either way it is not rendered."""
    if not isinstance(html, str) or len(html) > MAX_DOCUMENT:
        raise ValueError('dokumen terlalu besar')
    if not re.match(r'\s*<!doctype html>', html, re.I):
        raise ValueError('bukan dokumen laporan')
    checker = _Checker()
    checker.feed(html)
    checker.close()


def find_chromium():
    """Path of the Chromium that renders PDFs: `PULSE_CHROMIUM` if it names a program, else the usual places."""
    chosen = os.environ.get('PULSE_CHROMIUM', '').strip()
    candidates = ([chosen] if chosen else []) + list(USUAL_PLACES)
    for path in candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    for name in ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'):
        found = shutil.which(name)
        if found:
            return found
    return None


def _flags(profile, output):
    flags = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
             '--disable-background-networking', '--disable-sync', '--disable-component-update', '--disable-default-apps',
             # No network at all: every request, loopback included, goes to a port nothing listens on.
             '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=<-loopback>', '--host-resolver-rules=MAP * ~NOTFOUND',
             f'--user-data-dir={profile}', '--no-pdf-header-footer', f'--print-to-pdf={output}']
    # A container usually cannot give Chromium its own sandbox; the document was checked and the renderer has no network.
    if os.environ.get('PULSE_CHROMIUM_NO_SANDBOX', '').lower() in ('1', 'true', 'yes') or (hasattr(os, 'geteuid') and os.geteuid() == 0):
        flags.append('--no-sandbox')
    return flags + [flag for flag in os.environ.get('PULSE_CHROMIUM_FLAGS', '').split() if flag.startswith('--')]


async def render_pdf(html):
    """The PDF bytes for a checked document. One render at a time: Chromium is heavy and reports are rare."""
    binary = find_chromium()
    if binary is None:
        raise PdfUnavailable()
    async with _one_at_a_time:
        with tempfile.TemporaryDirectory(prefix='pulse-pdf-') as folder:
            page, output = Path(folder) / 'laporan.html', Path(folder) / 'laporan.pdf'
            page.write_text(html, encoding='utf-8')
            process = await asyncio.create_subprocess_exec(binary, *_flags(Path(folder) / 'profile', output), page.as_uri(),
                                                           stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
            try:
                await asyncio.wait_for(process.wait(), RENDER_SECONDS)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise PdfFailed('timeout')
            if not output.exists() or output.stat().st_size < 1000:
                raise PdfFailed('no_output')
            return output.read_bytes()


def pdf_pages(data):
    """How many pages a PDF has, counted from its page objects."""
    return len(re.findall(rb'/Type\s*/Page(?![a-zA-Z])', data))


def page_size(data):
    """(width, height) of the first page in whole points, or None."""
    box = re.search(rb'/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]', data)
    return (round(float(box.group(3)) - float(box.group(1))), round(float(box.group(4)) - float(box.group(2)))) if box else None


def safe_file_name(name):
    """A download name without path parts or odd characters, always ending in .pdf."""
    stem = re.sub(r'\.pdf$', '', str(name or '').replace('\\', '/').split('/')[-1], flags=re.I)
    stem = re.sub(r'[^A-Za-z0-9._-]+', '-', stem).strip('-.')[:100]
    return (stem or 'laporan-pulse') + '.pdf'
