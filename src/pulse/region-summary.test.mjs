import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const post = (id, published_at, title, extra = {}) => ({ id, published_at, title, text: '', platform: 'news', author: 'Media ' + id, url: 'https://example.com/' + id, metrics: {}, ...extra });
const xpost = (id, published_at, author, location) => ({ id, published_at, platform: 'x', author, title: '', text: 'teks', metrics: { author_id: author, ...(location === undefined ? {} : { author_location: location }) } });
const posts = [
  ...Array.from({ length: 6 }, (_, index) => post('j' + index, '2026-11-03T05:00:00Z', 'Aksi di Jakarta')),
  post('s1', '2026-11-04T05:00:00Z', 'Aksi serupa di Surabaya'), post('s2', '2026-11-04T06:00:00Z', 'Warga Surabaya menolak'),
  post('b1', '2026-11-05T05:00:00Z', 'Mahasiswa Bandung turun ke jalan'), post('n1', '2026-11-05T06:00:00Z', 'Pernyataan resmi'),
  xpost('x1', '2026-11-05T07:00:00Z', '@a', 'Jakarta'), xpost('x2', '2026-11-05T08:00:00Z', '@b', 'jkt'), xpost('x3', '2026-11-05T09:00:00Z', '@c', 'Medan'), xpost('x4', '2026-11-05T09:30:00Z', '@d', undefined),
];

async function load(run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try { return await run(path => server.ssrLoadModule(path)); } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('the summary card ranks the provinces a conversation names, draws them, and links to the full map', async () => {
  const html = await load(async module => {
    const { default: RegionSpreadSummary } = await module('/src/pulse/RegionSpreadSummary.jsx');
    return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(RegionSpreadSummary, { posts, to: '/pulse/network?topic=p1&focus=map' })));
  });
  assert.match(html, /role="region"[^>]*aria-label="Sebaran tempat"/);
  assert.match(html, /bukan lokasi penulis/i);
  const rows = [...html.match(/<ol[^>]*class="rs-top"[\s\S]*?<\/ol>/)[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => text(match[1]));
  assert.deepEqual(rows, ['DKI Jakarta 6 posting Jakarta 6', 'Jawa Timur 2 posting Surabaya 2', 'Jawa Barat 1 posting Bandung 1']);
  assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="Peta Indonesia: 3 dari 34 provinsi disebut\. Terbanyak: DKI Jakarta 6, Jawa Timur 2, Jawa Barat 1\."/);
  assert.equal((html.match(/class="rm-province"/g) || []).length, 34);
  assert.equal((html.match(/class="rm-province"[^>]*data-shade="5"/g) || []).length, 1, 'the most named province is the darkest');
  assert.match(text(html), /9 dari 14 posting menyebut tempat, di 3 provinsi\./);
  assert.match(text(html), /Lokasi profil akun X: DKI Jakarta 2 akun, Sumatera Utara 1 akun\. 1 akun belum diperiksa\./);
  assert.match(html, /<a[^>]*href="\/pulse\/network\?topic=p1&amp;focus=map"[^>]*>Buka peta sebaran/);
});

test('the summary card says so when no post names a place, and still offers the map', async () => {
  const html = await load(async module => {
    const { default: RegionSpreadSummary } = await module('/src/pulse/RegionSpreadSummary.jsx');
    return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(RegionSpreadSummary, { posts: [post('n', '2026-11-05T06:00:00Z', 'Pernyataan resmi')], to: '/pulse/network?focus=map' })));
  });
  assert.match(html, /Belum ada posting yang menyebut provinsi, kota atau kabupaten/);
  assert.doesNotMatch(html, /class="rs-top"|<svg[^>]*role="img"/);
  assert.match(html, /Buka peta sebaran/);
});

test('Jaringan carries the card in its spread section, and Jaringan opens on the map when a link asks for it', async () => {
  await load(async module => {
    const source = (await import('node:fs')).readFileSync(new URL('./PageExtras.jsx', import.meta.url), 'utf8');
    assert.match(source, /lazy\(\(\) => import\('\.\/RegionSpreadSummary'\)\)/, 'the outlines are fetched with the card, not with the page');
    assert.match(source, /id="network-spread"[\s\S]*<RegionSpreadSummary[^>]*to=\{link\('network'\) ?\+ ?'&focus=map'\}/);
    const { default: NetworkAnalysis } = await module('/src/components/admin/pulse/NetworkAnalysis.jsx');
    const { focusFromSearch } = await module('/src/lib/pulseDrilldown.js');
    assert.equal(focusFromSearch('?topic=p1&focus=map'), 'map');
    assert.equal(focusFromSearch('?topic=p1&focus=entah'), 'network', 'an unknown focus opens the usual view');
    assert.equal(focusFromSearch(''), 'network');
    assert.equal(typeof NetworkAnalysis, 'function');
  });
});
