import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const comment = (id, author, text, likes, extra = {}) => ({ id, author, text, likes, published_at: '2026-11-12T03:49:00Z', url: 'https://www.tiktok.com/@akun/video/1?comment=' + id, ...extra });
const post = { id: 'p1', platform: 'tiktok', author: 'setwapres.ri', metrics: { comment_snapshot: { status: 'success', fetched_at: '2026-11-14T11:18:00Z', items: [
  comment('c1', 'sagitariussssgirls', 'Dia udh semuak itu ternyata', 173630),
  comment('c2', 'nafikrisky', 'DPR itu kalau dipermasalahin semua ijazahnya juga lebih parah', 50192, { replies: 12 }),
  comment('c3', 'tanpa_tautan', 'Komentar tanpa tautan', 3, { url: 'javascript:alert(1)' }),
  ...Array.from({ length: 5 }, (_, index) => comment('m' + index, 'akun_' + index, 'Komentar lain ' + index, 1)),
] } } };

async function render(element) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { PostComments } = await server.ssrLoadModule('/src/components/admin/pulse/CommentsPanel.jsx');
    return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(PostComments, element)));
  } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('a comment under a post is one compact row: who and when on one line, the words under it, likes and the way out at the side', async () => {
  const html = await render({ post });
  const rows = html.match(/<article class="pcm-card pcm-compact"[\s\S]*?<\/article>/g);
  assert.equal(rows.length, 5, 'five comments first, the rest on request');
  assert.match(html, /Tampilkan 3 komentar berikutnya/);
  assert.match(text(rows[0]), /sagitariussssgirls 12 Nov 2026, 10\.49 WIB Dia udh semuak itu ternyata Suka: 173\.630$/);
  assert.match(rows[0], /<div class="pcm-line"><strong>sagitariussssgirls<\/strong><small>12 Nov 2026, 10\.49 WIB<\/small><\/div><p class="pcm-text">Dia udh semuak itu ternyata<\/p>/);
  assert.match(rows[0], /<a class="pcm-open" href="https:\/\/www\.tiktok\.com\/@akun\/video\/1\?comment=c1" target="_blank" rel="noopener noreferrer" aria-label="Buka komentar sagitariussssgirls" title="Buka komentar">/);
  assert.match(text(rows[1]), /nafikrisky 12 Nov 2026, 10\.49 WIB · 12 balasan DPR itu/);
  assert.doesNotMatch(rows[2], /<a /, 'a link that is not a web address is not offered');
  // The rules a post card keeps for its own header and footer must have nothing to grab inside a comment.
  for (const row of rows) assert.doesNotMatch(row, /<header|<footer/);
  assert.match(html, /<p class="pcm-note">Diambil 14 Nov 2026, 18\.18 WIB\.<\/p>/);
});

test('the compact row is styled as a row, not as a card inside a card', () => {
  const css = readFileSync(new URL('./ds/comments-browse.css', import.meta.url), 'utf8');
  const rule = css.match(/\.pulse-standalone\.pulse-standalone \.pcm-card\.pcm-compact \{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /grid-template-columns: auto minmax\(0, 1fr\) auto/);
  assert.match(rule, /border: 0/);
  assert.match(rule, /background: transparent/);
  assert.match(css, /\.pcm-open[^{]*\{[^}]*min-width: var\(--ps-control-sm\)/, 'the way out keeps a comfortable target');
  assert.doesNotMatch(css.match(/\/\* Compact comment rows[\s\S]*$/)?.[0] || '', /border-(left|right):\s*[2-9]px/);
});

// ── The card on the Komentar page ───────────────────────────────────────────────────────────────────────────────────

async function card(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { Comment } = await server.ssrLoadModule('/src/components/admin/pulse/CommentsPanel.jsx');
    return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Comment, props)));
  } finally { await server.close(); }
}
const read = { ...comment('k1', 'aynar045', 'dia terlalu sakit karna bapaknya terlalu di hina terus menerus', 170740),
  sentiment: { label: 'negative', confidence: 0.9, reason: 'Nada kecewa' }, stance: { label: 'unclear', reason: 'Tidak memihak' } };

test('the card on the Komentar page keeps everything in fewer rows: the way out sits in its head, the reading and its reasons share a row', async () => {
  const html = await card({ comment: read, video: 'liat mas gibran nangis', post: { id: 'p', platform: 'tiktok', author: 'akun', metrics: {} } });
  const head = html.match(/<header class="pcm-head">[\s\S]*?<\/header>/)[0];
  assert.match(head, /<span class="pcm-likes"[\s\S]*?170\.740<\/span><a class="pcm-open" href="https:\/\/www\.tiktok\.com\/@akun\/video\/1\?comment=k1" target="_blank" rel="noopener noreferrer" aria-label="Buka komentar aynar045" title="Buka komentar">/,
    'likes, then the icon link, in the head');
  const reading = html.match(/<div class="pcm-reading">[\s\S]*?<\/details><\/div>/)[0];
  assert.match(reading, /<div class="pu-tag-group">[\s\S]*Negatif[\s\S]*<\/div><details class="pcm-reasons"><summary>Alasan<\/summary>/, 'tags and the reasons disclosure are siblings of one row');
  assert.match(reading, /Nada kecewa/);
  const foot = html.match(/<footer class="pcm-foot">[\s\S]*?<\/footer>/)[0];
  assert.match(foot, /Pada posting: liat mas gibran nangis/);
  assert.doesNotMatch(foot, /<a /, 'the foot is one quiet line: the link moved to the head');
  // With one post chosen there is no source line, so the card has no foot at all.
  assert.doesNotMatch(await card({ comment: read }), /pcm-foot/);
});

test('the card is set tighter: smaller padding and gaps, 14px text, a foot without a rule', () => {
  const css = readFileSync(new URL('./ds/comments-browse.css', import.meta.url), 'utf8');
  const dense = css.match(/\/\* Denser comment cards[\s\S]*$/)?.[0] || '';
  assert.match(dense, /\.pcm-card \{[^}]*gap: 8px[^}]*padding: 12px 14px/);
  assert.match(dense, /\.pcm-text \{[^}]*font-size: \.875rem[^}]*line-height: 1\.5/);
  assert.match(dense, /\.pcm-reading \{[^}]*display: flex[^}]*flex-wrap: wrap/);
  assert.match(dense, /\.pcm-reasons\[open\] \{[^}]*flex: 1 1 100%/, 'opened, the reasons take a row of their own');
  assert.match(dense, /\.pcm-foot \{[^}]*padding-top: 0[^}]*border-top: 0/);
  assert.match(dense, /\.pcm-reasons > summary \{[^}]*min-height: 32px/, 'the disclosure keeps the 32px row the design rules ask for');
});
