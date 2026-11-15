import { test } from 'node:test';
import assert from 'node:assert/strict';

// reportPdf.js imports the API client, which needs a browser; the two pure helpers are loaded without it.
const source = await (await import('node:fs/promises')).readFile(new URL('./reportPdf.js', import.meta.url), 'utf8');
const pure = source.replace("import api from '../lib/api';", '').split('function printableCss()')[0];
const { printableRule, reportFileName } = await import('data:text/javascript,' + encodeURIComponent(pure));

test('a style rule goes into the PDF only if it makes the renderer fetch nothing', () => {
  assert.equal(printableRule('.rp-page { color: red; }'), true);
  assert.equal(printableRule('.a { background: url("data:image/png;base64,AAAA") }'), true);
  for (const refused of ['@import url("https://example.com/a.css");', '@font-face { font-family: X; src: url(/font.woff2) }',
    '.a { background: url(https://example.com/a.png) }', '.a { background: url(/pulse/brand/og.png) }', '.a { background: url("file:///etc/passwd") }',
    '.a { background: url(data:image/svg+xml;base64,AAAA) }', '.a { width: expression(alert(1)) }', '', null]) {
    assert.equal(printableRule(refused), false, String(refused));
  }
});

test('the file name is readable and safe', () => {
  assert.equal(reportFileName('Isu Pengunduran Diri Gibran', '2026-11-14'), 'laporan-pulse-isu-pengunduran-diri-gibran-2026-11-14.pdf');
  assert.equal(reportFileName('  ../../etc/passwd  ', '2026-11-14'), 'laporan-pulse-etcpasswd-2026-11-14.pdf');
  assert.equal(reportFileName('', '2026-11-14'), 'laporan-pulse-project-2026-11-14.pdf');
});
