import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const post = (id, platform, published_at) => ({ id, platform, author: 'akun_' + id, published_at, first_observed_at: '2026-11-12T03:00:00', text: 'Isi ' + id, metrics: {} });

async function spread(posts) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { NetworkNarratives } = await server.ssrLoadModule('/src/pulse/PageExtras.jsx');
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/network?topic=t1'] }, React.createElement(NetworkNarratives, { posts })));
    return html.match(/<[^>]*aria-label="Penyebaran percakapan"[\s\S]*?<\/ol>[\s\S]*?(?=<section id="network-spread")/)?.[0] || html;
  } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('posts that carry a date without a clock are counted under the order of publication, in the words Jaringan already uses', async () => {
  const html = await spread([post('a', 'x', '2026-11-10T05:00:00Z'), post('b', 'instagram', '2026-11-09T00:00:00'), post('c', 'instagram', '2026-11-11')]);
  assert.match(text(html), /2 posting hanya bertanggal tidak diurutkan menurut jam\./);
});

test('a channel whose earliest post has only a date is written as a date, and says so; no clock is invented', async () => {
  const html = await spread([post('a', 'x', '2026-11-10T05:00:00Z'), post('b', 'instagram', '2026-11-09T00:00:00')]);
  const rows = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => text(match[1]));
  const instagram = rows.find(row => row.startsWith('Instagram')), x = rows.find(row => row.startsWith('X'));
  assert.match(instagram, /Publikasi awal: 9 Nov 2026 \(hanya tanggal\)/);
  assert.doesNotMatch(instagram.split('Pertama ditemukan')[0], /\d\d\.\d\d|WIB/, 'a date-only post has no time of day');
  assert.match(x, /Publikasi awal: 10 Nov 2026,? 12\.00 WIB/);
  assert.doesNotMatch(x, /hanya tanggal/);
});

test('when every post has a clock nothing is said about dates without one', async () => {
  const html = await spread([post('a', 'x', '2026-11-10T05:00:00Z'), post('b', 'news', '2026-11-10T06:00:00Z')]);
  assert.doesNotMatch(text(html), /hanya bertanggal|hanya tanggal/);
});

test('what a panel says about the posts it opens reaches the drawer (one piece of content is counted by its own rule)', async () => {
  // The drawer renders in a portal, so the hand-over is read from the source, as the drawer's own test does.
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./PageExtras.jsx', import.meta.url), 'utf8');
  const opens = [...source.matchAll(/const open=\(([^)]*)\)=>setSelection\(([^;]*)\);/g)];
  assert.equal(opens.length, 2, 'Jaringan and Akun & sumber each hand posts to the drawer');
  for (const [, parameters, selection] of opens) {
    assert.equal(parameters, 'title,rows,options');
    assert.equal(selection, '{title,posts:rows,...options}');
  }
});
