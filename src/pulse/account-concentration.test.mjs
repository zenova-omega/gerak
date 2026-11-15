import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const by = (author, count, likes, platform = 'x') => Array.from({ length: count }, (_, index) => ({
  id: `${author}-${index}`, platform, author, published_at: '2026-11-10T05:00:00Z', metrics: likes == null ? {} : { likes },
}));
// Twelve accounts with 12, 11, ... 1 posts: 78 posts, and the seventh account is the first to reach 80% (63 of 78).
const twelve = likes => Array.from({ length: 12 }, (_, index) => by('a' + String(index + 1).padStart(2, '0'), 12 - index, likes)).flat();

async function render(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Panel } = await server.ssrLoadModule('/src/pulse/AccountConcentration.jsx');
    return renderToStaticMarkup(React.createElement(Panel, props));
  } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const curve = html => html.match(/<section[^>]*aria-label="Kurva konsentrasi"[\s\S]*?<\/section>/)?.[0] || '';

test('no account in the selection: the panel says so and draws nothing', async () => {
  const html = await render({ posts: [{ id: 'n', platform: 'x', author: '', metrics: { likes: 3 } }] });
  assert.match(html, /Belum ada akun/);
  assert.doesNotMatch(html, /acc-plot|ac-bar|Kurva konsentrasi/);
});

test('fewer than ten accounts: the 80% figure stands in words and no curve is drawn', async () => {
  const html = await render({ posts: [...by('a', 5, 10), ...by('b', 3, 1), ...by('c', 2), ...by('d', 1)] });
  const block = curve(html);
  assert.match(text(block), /3 akun menulis 80% posting/);
  assert.match(text(block), /75% dari 4 akun/);
  assert.doesNotMatch(block, /acc-plot|<svg|<table/);
  assert.match(text(block), /Kurva digambar bila ada 10 akun atau lebih/);
  assert.equal((html.match(/class="ac-bar"/g) || []).length, 2, 'the two bars that were there stay');
});

test('ten accounts or more: the curve is drawn beside the two bars, with the 80% point marked and said in words', async () => {
  const html = await render({ posts: twelve(2) });
  const block = curve(html);
  assert.equal((html.match(/class="ac-bar"/g) || []).length, 2);
  assert.ok(html.indexOf('Kurva konsentrasi') > html.indexOf('Konsentrasi interaksi'), 'the curve comes after the two bars');
  assert.match(text(block), /7 akun menulis 80% posting/);
  assert.match(text(block), /58% dari 12 akun/);
  // The picture has a name that says what it shows, and the same figures as a table.
  const plot = block.match(/<div[^>]*class="acc-plot"[^>]*>/)[0];
  assert.match(plot, /role="img"/);
  assert.match(plot, /aria-label="[^"]*7 dari 12 akun \(58%\)[^"]*80% posting[^"]*"/);
  assert.match(block, /<polyline[^>]*class="acc-line acc-line-posts"[^>]*points="0,100 /, 'the curve starts where no account has written anything');
  assert.match(block, /class="acc-mark"/);
  assert.match(text(block.match(/class="acc-mark-label"[^>]*>[\s\S]*?<\/span>/)[0]), /7 akun/);
  const table = block.match(/<table[\s\S]*?<\/table>/)[0];
  assert.equal((table.match(/<tr/g) || []).length, 13, 'a heading row and one row per point of the curve');
  assert.match(table, /<th[^>]*scope="col"[^>]*>Akun teraktif<\/th>/);
  assert.match(text(table), /7 58% 81%/);
  // Interactions: the same reading, drawn as a second line that is told apart by more than colour.
  assert.match(block, /<polyline[^>]*class="acc-line acc-line-interactions"/);
  const keys = [...block.matchAll(/<li[^>]*class="acc-key[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map(match => text(match[1]).trim());
  assert.deepEqual(keys, ['Posting', 'Interaksi', 'Bila semua akun sama aktif']);
  assert.match(text(block), /80% interaksi berasal dari 7 dari 12 akun/);
  assert.match(text(block), /Interaksi diketahui pada 100% posting/);
});

test('a selection without reported interactions draws the posts curve alone and says why', async () => {
  const block = curve(await render({ posts: twelve(null) }));
  assert.match(block, /acc-line-posts/);
  assert.doesNotMatch(block, /acc-line-interactions/);
  assert.deepEqual([...block.matchAll(/<li[^>]*class="acc-key[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map(match => text(match[1]).trim()), ['Posting', 'Bila semua akun sama aktif']);
  assert.match(text(block), /Kurva interaksi tidak digambar: sumber tidak melaporkan interaksi pada pilihan ini/);
});

test('with a way to open posts the named accounts and the 80% figure open theirs; without one nothing promises it', async () => {
  const closed = await render({ posts: twelve(2) });
  assert.doesNotMatch(closed, /Lihat posting/);
  const html = await render({ posts: twelve(2), onOpen() {} });
  assert.match(html, /<button[^>]*aria-label="Lihat posting a01 · X"/);
  assert.match(curve(html), /<button[^>]*>Lihat posting 7 akun ini/);
});

test('an account is counted by the one account rule: one Instagram account under two handles is one account', async () => {
  const posts = [...by('lama', 2, 1, 'instagram'), ...by('baru', 3, 1, 'instagram')].map(post => ({ ...post, metrics: { ...post.metrics, author_id: '77' } }));
  const html = await render({ posts });
  assert.match(text(html), /100% posting berasal dari 3 akun teratas, dari 1 akun/);
});

test('the curve keeps its text at its own size and scrolls nothing: lines stretch, labels do not', () => {
  const css = readFileSync('src/pulse/ds/concentration-curve.css', 'utf8');
  assert.match(css, /vector-effect: non-scaling-stroke/);
  assert.doesNotMatch(css, /font-size:\s*(?:\.[0-6]\d*rem|1[01]px|[0-9]px)/, 'no text under 12px');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(/i, 'colours come from tokens');
});

test('with more accounts than points the 80% point is added to the line and the table, so the mark sits on the line', async () => {
  // 40 accounts with one post each: 20 sampled points (1, 3, 5, ... 39) and the 80% point at account 32.
  const block = curve(await render({ posts: Array.from({ length: 40 }, (_, index) => by('u' + String(index + 1).padStart(2, '0'), 1)).flat() }));
  const table = block.match(/<table[\s\S]*?<\/table>/)[0];
  assert.equal((table.match(/<tr/g) || []).length, 22, 'a heading row, 20 sampled points and the 80% point');
  assert.match(table, /<tr data-reach=""><th scope="row">32<\/th><td>80%<\/td><td>80%<\/td><\/tr>/);
  assert.match(block.match(/<polyline[^>]*acc-line-posts[^>]*>/)[0], / 80,20 /, 'the line passes through the mark');
  assert.match(block, /class="acc-mark" style="left:80%;top:20%"/);
  assert.match(block, /class="acc-mark-label" data-side="left"/, 'near the right edge the label moves to the free side');
});

test('a share that exists never prints as 0%', async () => {
  // 400 accounts with one post each: the first account is a quarter of a percent of the accounts and of the posts.
  const block = curve(await render({ posts: Array.from({ length: 400 }, (_, index) => by('u' + index, 1)).flat() }));
  assert.match(block, /<th scope="row">1<\/th><td>&lt;1%<\/td><td>&lt;1%<\/td>/);
  assert.doesNotMatch(text(block.match(/<table[\s\S]*?<\/table>/)[0]), / 0%/);
});
