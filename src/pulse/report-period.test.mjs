// The report page says which dates it covers and lets them be changed where the file is made.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
before(async () => { server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' }); });
after(async () => { await server?.close(); });

const post = { id: 'one', author: 'Source', platform: 'x', url: 'https://x.com/i/status/1', text: 'Isi posting', metrics: { engagement: 8 }, published_at: '2026-11-03T00:00:00Z' };
async function page(period) {
  const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
  return renderToStaticMarkup(React.createElement(Report, { topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period, data: { posts: [post] } }));
}
const block = html => html.match(/<div class="ps-scope pr-period"[\s\S]*?<\/section><\/div>/)?.[0] || '';

test('the report page has the period control between the actions and the preview, on screen only', async () => {
  const html = await page({ from: '2026-11-01', to: '2026-11-12' });
  const control = block(html);
  assert.ok(control, 'the period block is on the page');
  assert.match(control, /^<div class="ps-scope pr-period" data-screen-only="">/);
  for (const name of ['Semua', 'Hari ini', '7 hari', '30 hari', 'Kustom']) assert.match(control, new RegExp(`<span class="pu-tag-label">${name}</span>`));
  assert.ok(html.indexOf('class="pr-bar"') < html.indexOf('class="ps-scope pr-period"'), 'after the actions');
  assert.ok(html.indexOf('class="ps-scope pr-period"') < html.indexOf('class="pr-layout"'), 'before the preview');
  assert.doesNotMatch(html.slice(html.indexOf('<div class="rp-doc')), /pr-period/, 'never inside what is printed');
});

test('the action line names the dates the file will cover', async () => {
  assert.match(await page({ from: '2026-11-01', to: '2026-11-12' }), /<p class="pr-bar-text"[^>]*>10 halaman A4 · <strong>1 Nov 2026 – 12 Nov 2026<\/strong><\/p>/);
  assert.match(await page({}), /<p class="pr-bar-text"[^>]*>10 halaman A4 · <strong>seluruh periode tersimpan<\/strong>/);
});

test('the file name carries the dates of the report, and the day it was made when no dates were chosen', async () => {
  const { reportFileName } = await server.ssrLoadModule('/src/pulse/reportPdf.js');
  assert.equal(reportFileName('Isu Gibran', '2026-11-15', { from: '2026-11-01', to: '2026-11-12' }), 'laporan-pulse-isu-gibran-2026-11-01-sd-2026-11-12.pdf');
  assert.equal(reportFileName('Isu Gibran', '2026-11-15', { from: '2026-11-12', to: '2026-11-12' }), 'laporan-pulse-isu-gibran-2026-11-12.pdf');
  assert.equal(reportFileName('Isu Gibran', '2026-11-15', { from: '2026-11-01', to: '' }), 'laporan-pulse-isu-gibran-sejak-2026-11-01.pdf');
  assert.equal(reportFileName('Isu Gibran', '2026-11-15', { from: '', to: '2026-11-12' }), 'laporan-pulse-isu-gibran-sampai-2026-11-12.pdf');
  assert.equal(reportFileName('Isu Gibran', '2026-11-15', {}), 'laporan-pulse-isu-gibran-2026-11-15.pdf');
  assert.equal(reportFileName('Isu Gibran', '2026-11-15'), 'laporan-pulse-isu-gibran-2026-11-15.pdf');
});

test('a date that is not a plain day never reaches the file name', async () => {
  const { reportFileName } = await server.ssrLoadModule('/src/pulse/reportPdf.js');
  assert.equal(reportFileName('Isu', '2026-11-15', { from: '../../x', to: '2026-11-12' }), 'laporan-pulse-isu-sampai-2026-11-12.pdf');
  assert.equal(reportFileName('Isu', '2026-11-15', { from: '2026-11-01"', to: null }), 'laporan-pulse-isu-2026-11-15.pdf');
});
