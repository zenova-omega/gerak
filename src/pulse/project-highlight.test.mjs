import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const day = offset => new Date(Date.now() + 7 * 3600000 - offset * 86400000).toISOString().slice(0, 10);
const post = (id, offset, likes, extra = {}) => ({
  id, platform: 'tiktok', author: 'akun_' + id, text: 'Isi posting ' + id, url: 'https://example.com/' + id, published_at: `${day(offset)}T03:00:00Z`,
  metrics: { sentiment: { label: 'positive' }, author_followers: 15800000, ...(likes == null ? {} : { likes }) }, ...extra,
});
const posts = [post('a', 1, 3000000), post('b', 2, 100), post('c', 3, null, { platform: 'news', author: 'Kompas.com' }), post('old', 9, 1000000)];

async function load(run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const view = await server.ssrLoadModule('/src/pulse/ProjectHighlight.jsx');
    return await run(props => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(view.default, { topic: { id: 't1', label: 'Isu Gibran' }, period: {}, ...props }))));
  } finally { await server.close(); }
}

test('the highlight leads with the interactions of the last seven days, their change, and what they rest on', async () => {
  await load(render => {
    const html = render({ posts });
    assert.match(html, /<section class="phl"[^>]*aria-labelledby="phl-title"/);
    assert.match(html, /Interaksi naik\. Lebih banyak percakapan\./);
    assert.match(html, /Isu Gibran mencatat/);
    assert.match(html, /<strong[^>]*title="3\.000\.100 interaksi"[^>]*>3 juta<\/strong>/);
    assert.match(html, /7 hari terakhir/);
    assert.match(html, /\+200% dibandingkan 7 hari sebelumnya/);
    assert.match(html, /3 posting · 2 platform · interaksi diketahui pada 66% posting/);
  });
});

test('the mentions worth a look show the account the way accounts are shown everywhere, with followers, tone and a way through', async () => {
  await load(render => {
    const html = render({ posts });
    const panel = html.slice(html.indexOf('class="phl-mentions"'));
    assert.match(panel, /Mention yang patut dilihat/);
    assert.match(panel, /class="[^"]*psi-avatar/);
    assert.match(panel, /akun_a/);
    assert.match(panel, /TikTok · 15,8 juta pengikut/);
    assert.match(panel, /Positif/);
    assert.match(panel, /1\/3/);
    assert.match(panel, /aria-label="Mention sebelumnya"/);
    assert.match(panel, /aria-label="Mention berikutnya"/);
    assert.match(panel, /href="https:\/\/example\.com\/a"/);
  });
});

test('the footer leads to who drove the interactions and names the accounts that posted most', async () => {
  await load(render => {
    const html = render({ posts });
    assert.match(html, /href="\/pulse\/accounts\?topic=t1"[^>]*>Lihat penggerak interaksi/);
    assert.match(html, /Paling banyak menyebut/);
  });
});

test('a period with no post says so instead of drawing zeros, and Ikhtisar puts the highlight first', async () => {
  await load(render => {
    const html = render({ posts: [post('old', 9, 5)] });
    assert.match(html, /Belum ada posting pada 7 hari terakhir/);
    assert.doesNotMatch(html, /phl-mentions/);
  });
  const overview = readFileSync(new URL('./ProjectOverview.jsx', import.meta.url), 'utf8');
  assert.match(overview, /<div className="po-overview po-workbench">\s*<ProjectHighlight /, 'its own section, at the very top');
});
