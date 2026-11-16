"""The report PDF is rendered on the server from a document the browser sends. That document is checked first: it may
carry its own styles, embedded pictures and ordinary web links, and nothing that would make the renderer fetch a
file or an address."""
import base64

import pytest

from app.models.pulse import WatchTopic
from app.services import pulse_report_pdf as pdf
from app.services import pulse_report_settings as settings_service

PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='


def document(body='', style=''):
    return ('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan</title>'
            f'<style>@page {{ size: A4; margin: 0 }} html, body {{ margin: 0 }} .rp-page {{ width: 210mm; height: 297mm; overflow: hidden; break-after: page; }} .rp-page:last-child {{ break-after: auto; }} {style}</style></head>'
            f'<body><div class="pulse-standalone" data-theme="light">{body}</div></body></html>')


GOOD = document(
    f'<section class="rp-page" style="--rp-accent: #2d273f"><h1>Isu contoh</h1><img src="{PIXEL}" alt="logo">'
    '<p>Sumber: <a href="https://example.com/berita?id=1">example.com</a> dan <a href="#lampiran">lampiran</a>.</p>'
    '<svg viewBox="0 0 10 10"><defs><path id="p" d="M0 0h10v10z"/></defs><use href="#p"/><rect width="4" height="4" fill="currentColor"/></svg>'
    '<button type="button">Tombol yang tertinggal</button></section>'
    '<section class="rp-page"><h2 id="lampiran">Halaman kedua</h2></section>',
    f'.logo {{ background: url("{PIXEL}") }} .q::before {{ content: "\\201C" }}')


def test_a_self_contained_report_document_is_accepted():
    pdf.check_document(GOOD)


@pytest.mark.parametrize('body', [
    '<script>fetch("http://10.0.0.1")</script>',
    '<img src="https://example.com/a.png">',
    '<img src="file:///etc/passwd">',
    '<img src="/api/admin/pulse/topics">',
    '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">',
    f'<img src="{PIXEL}" onerror="alert(1)">',
    f'<img src="{PIXEL}" srcset="https://example.com/a.png 2x">',
    '<iframe src="file:///etc/passwd"></iframe>',
    '<object data="file:///etc/passwd"></object>',
    '<embed src="file:///etc/passwd">',
    '<link rel="stylesheet" href="https://example.com/a.css">',
    '<meta http-equiv="refresh" content="0;url=file:///etc/passwd">',
    '<base href="file:///">',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="file:///etc/passwd">x</a>',
    '<svg><image href="https://example.com/a.png"/></svg>',
    '<svg><use href="https://example.com/a.svg#x"/></svg>',
    '<svg><foreignObject><p>x</p></foreignObject></svg>',
    '<form action="https://example.com"><input name="a"></form>',
    '<video src="https://example.com/a.mp4"></video>',
    '<p style="background: url(https://example.com/a.png)">x</p>',
    '<p style="background: u\\72l(https://example.com/a.png)">x</p>',
    '<p style="background: image-set(\'https://example.com/a.png\' 1x)">x</p>',
    '<body background="https://example.com/a.png"></body>',
])
def test_anything_that_points_outside_the_document_is_refused(body):
    with pytest.raises(ValueError):
        pdf.check_document(document(body))


@pytest.mark.parametrize('style', [
    '@import url("https://example.com/a.css");',
    '@import "https://example.com/a.css";',
    '@font-face { font-family: X; src: url(https://example.com/x.woff2) }',
    '.a { background: url(file:///etc/passwd) }',
    '.a { background: url( "http://169.254.169.254/latest" ) }',
    '.a { background: \\75\\72\\6c(http://127.0.0.1:8000/api) }',
    '.a { background: URL(//example.com/a.png) }',
    '.a { behavior: url(x.htc) }',
])
def test_a_style_sheet_that_would_fetch_is_refused(style):
    with pytest.raises(ValueError):
        pdf.check_document(document('<p>x</p>', style))


def test_a_document_that_is_too_large_or_not_a_document_is_refused():
    with pytest.raises(ValueError):
        pdf.check_document('x' * 100)
    with pytest.raises(ValueError):
        pdf.check_document(document('<p>' + 'x' * (pdf.MAX_DOCUMENT + 1) + '</p>'))


def test_the_renderer_is_found_from_the_environment_or_the_usual_places(monkeypatch, tmp_path):
    fake = tmp_path / 'chromium'
    fake.write_text('#!/bin/sh\n')
    fake.chmod(0o755)
    monkeypatch.setenv('PULSE_CHROMIUM', str(fake))
    assert pdf.find_chromium() == str(fake)
    monkeypatch.setenv('PULSE_CHROMIUM', str(tmp_path / 'tidak-ada'))
    monkeypatch.setattr(pdf, 'USUAL_PLACES', ())
    monkeypatch.setattr(pdf.shutil, 'which', lambda name: None)
    assert pdf.find_chromium() is None


@pytest.mark.asyncio
async def test_without_a_renderer_the_caller_is_told_so(monkeypatch):
    monkeypatch.setattr(pdf, 'find_chromium', lambda: None)
    with pytest.raises(pdf.PdfUnavailable):
        await pdf.render_pdf(GOOD)


@pytest.mark.asyncio
async def test_a_real_renderer_makes_one_a4_sheet_per_page():
    if pdf.find_chromium() is None:
        pytest.skip('no Chromium on this machine')
    made = await pdf.render_pdf(GOOD)
    assert made[:5] == b'%PDF-' and len(made) > 2000
    assert pdf.pdf_pages(made) == 2
    assert pdf.page_size(made) == (595, 842)          # A4 in points, from the document's own @page rule


@pytest.mark.asyncio
async def test_the_route_refuses_a_bad_document_and_reports_a_missing_renderer(client, admin_token, monkeypatch):
    headers = {'Authorization': f'Bearer {admin_token}'}
    bad = await client.post('/api/admin/pulse/reports/pdf', json={'html': document('<script>1</script>'), 'filename': 'a.pdf'}, headers=headers)
    assert bad.status_code == 400 and 'ditolak' in bad.json()['detail']

    async def missing(html):
        raise pdf.PdfUnavailable()
    monkeypatch.setattr(pdf, 'render_pdf', missing)
    assert (await client.post('/api/admin/pulse/reports/pdf', json={'html': GOOD, 'filename': 'a.pdf'}, headers=headers)).status_code == 503

    async def made(html):
        return b'%PDF-1.7\n/Type /Page\n/Type /Page\n%%EOF' + b' ' * 1200
    monkeypatch.setattr(pdf, 'render_pdf', made)
    answer = await client.post('/api/admin/pulse/reports/pdf', json={'html': GOOD, 'filename': '../../Laporan Gibran?.pdf'}, headers=headers)
    assert answer.status_code == 200
    body = answer.json()
    assert body['filename'] == 'Laporan-Gibran.pdf' and body['pages'] == 2
    assert base64.b64decode(body['pdf']).startswith(b'%PDF-')


@pytest.mark.asyncio
async def test_report_settings_are_kept_per_project_and_checked(db):
    topic = WatchTopic(label='Laporan', query='laporan')
    db.add(topic)
    await db.flush()
    assert await settings_service.read(db, topic.id) == {'sections': [], 'brand': {'logo': None, 'accent': None, 'organisation': '', 'description': ''},
                                                         'ai': {'summary': None}}
    saved = await settings_service.save(db, topic.id, {
        'sections': [{'key': 'cover', 'on': True}, {'key': 'method', 'on': False}],
        'brand': {'logo': PIXEL, 'accent': '#1A2B3C', 'organisation': '  Biro Humas  ', 'description': 'Ringkasan mingguan.'}})
    assert saved['sections'] == [{'key': 'cover', 'on': True}, {'key': 'method', 'on': False}]
    assert saved['brand'] == {'logo': PIXEL, 'accent': '#1a2b3c', 'organisation': 'Biro Humas', 'description': 'Ringkasan mingguan.'}
    assert saved['ai'] == {'summary': None}, 'a save without a choice of summary keeps the automatic one'
    assert await settings_service.read(db, topic.id) == saved
    for wrong in ({'brand': {'logo': 'data:image/svg+xml;base64,AAAA'}}, {'brand': {'logo': 'https://example.com/logo.png'}},
                  {'brand': {'logo': 'data:image/png;base64,' + 'A' * 500000}}, {'brand': {'accent': 'red'}},
                  {'brand': {'description': 'x' * 601}}, {'sections': [{'key': 'DROP TABLE', 'on': True}]},
                  {'sections': [{'key': 'cover', 'on': True}] * 40}):
        with pytest.raises(ValueError):
            await settings_service.save(db, topic.id, wrong)
    assert await settings_service.read(db, topic.id) == saved            # a refused save changes nothing


@pytest.mark.asyncio
async def test_the_report_keeps_which_written_summary_it_prints(db):
    topic = WatchTopic(label='Laporan AI', query='laporan')
    db.add(topic)
    await db.flush()
    for choice in ('executive', 'brief', 'timeline', 'off', None):
        saved = await settings_service.save(db, topic.id, {'sections': [{'key': 'insights', 'on': True}], 'ai': {'summary': choice}})
        assert saved['ai'] == {'summary': choice}
        assert (await settings_service.read(db, topic.id))['ai'] == {'summary': choice}
    for wrong in ({'ai': {'summary': 'insights'}}, {'ai': {'summary': 'model-x'}}, {'ai': 'executive'}, {'ai': {'summary': 3}}):
        with pytest.raises(ValueError):
            await settings_service.save(db, topic.id, wrong)
    assert (await settings_service.read(db, topic.id))['ai'] == {'summary': None}            # a refused save changes nothing
