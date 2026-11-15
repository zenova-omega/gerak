import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const post = (id, platform, tone, likes, extra = {}) => ({
  id, platform, author: 'akun_' + id, text: 'Isi posting ' + id, url: 'https://example.com/' + id, published_at: '2026-11-10T01:00:00Z',
  metrics: { sentiment: { label: tone }, ...(likes == null ? {} : { likes }) }, ...extra,
});
const posts = [post('t1', 'tiktok', 'negative', 1200), post('x1', 'x', 'negative', 30), post('n1', 'news', 'negative', null, { author: 'Kompas.com', title: 'Gibran diminta mundur - Kompas.com' }),
  post('y1', 'youtube', 'positive', 5000)];

async function load(run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const view = await server.ssrLoadModule('/src/pulse/TopMentions.jsx');
    return await run(props => renderToStaticMarkup(React.createElement(view.default, { onOpen: () => {}, ...props })));
  } finally { await server.close(); }
}

test('every mention shows the account the way accounts are shown everywhere, its platform, its text and its interactions', async () => {
  await load(render => {
    const html = render({ posts });
    assert.match(html, /<h2[^>]*>Mention teratas<\/h2>/);
    const negative = html.slice(html.indexOf('data-tone="negative"'), html.indexOf('data-tone="positive"'));
    const rows = [...negative.matchAll(/<li[\s\S]*?<\/li>/g)].map(match => match[0]);
    assert.equal(rows.length, 3, 'TikTok, X and the news article');
    assert.match(rows[0], /class="[^"]*psi-avatar/, 'the account picture or its initials, with the platform mark (AccountAvatar)');
    assert.match(rows[0], /akun_t1/);
    assert.match(rows[0], /TikTok/);
    assert.match(rows[0], /Isi posting t1/);
    assert.match(rows[0], /<b[^>]*>1\.200<\/b>/);
    assert.match(rows[2], /Kompas\.com/);
    assert.match(rows[2], /Gibran diminta mundur/, 'an article shows its headline');
    assert.match(rows[2], /tidak dilaporkan/, 'news reports no interactions, said in words, never 0');
    assert.match(negative, /3 dari 4 mention/);
  });
});

test('the platform filter offers every platform with analysed mentions, with its count, all platforms first and pressed', async () => {
  await load(render => {
    const html = render({ posts });
    const group = html.match(/<div class="pu-tag-group[^"]*" role="group" aria-label="Platform mention">([\s\S]*?)<\/div>/)?.[1] || '';
    const labels = [...group.matchAll(/<span class="pu-tag-label">([^<]*)<\/span>/g)].map(match => match[1]);
    assert.deepEqual(labels.slice(0, 1), ['Semua platform']);
    assert.deepEqual(labels.slice(1).sort(), ['Berita', 'TikTok', 'X', 'YouTube'].sort());
    assert.match(group, /aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Semua platform/);
  });
});

test('a tone with nothing to list says so; a scope with no analysed post shows nothing', async () => {
  await load(render => {
    const html = render({ posts: [post('x1', 'x', 'negative', 3)] });
    assert.match(html, /Belum ada mention bernada positif/);
    assert.equal(render({ posts: [{ ...post('x2', 'x', null, 3), metrics: { likes: 3 } }] }), '');
    assert.equal(render({ posts: [] }), '');
  });
});
