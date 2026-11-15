// Komentar: more cards are added in place (the owner, 15 Nov 2026: "Tampilkan 24 komentar berikutnya" showed the whole page
// loading and then nothing). The next cards come from the page itself, by a button or by themselves when the end of the
// list scrolls into view; collecting comments reloads the data in the background, so nothing on screen is swapped for a
// loader. Under the list one line says how many comments were analysed, instead of the progress of the automatic lane.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let server, panel, browse;
before(async () => {
  server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  panel = await server.ssrLoadModule('/src/components/admin/pulse/CommentsPanel.jsx');
  browse = await server.ssrLoadModule('/src/lib/pulseCommentsBrowse.js');   // the panel's helpers, kept apart so the panel exports components only
});
after(async () => { await server?.close(); });

const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const comment = index => ({ id: 'c' + index, author: 'akun' + index, text: 'Komentar ke-' + index, likes: 100 - index, published_at: '2026-11-12T08:00:00Z' });
const post = { id: 'p1', platform: 'tiktok', author: 'kanal', url: 'https://www.tiktok.com/@kanal/video/1', title: 'Video', text: 'Video', published_at: '2026-11-12T07:00:00Z',
  metrics: { comment_snapshot: { status: 'success', fetched_at: '2026-11-12T09:00:00Z', items: Array.from({ length: 40 }, (_, index) => comment(index)) } } };
const render = element => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/comments?topic=t1'] }, element));

test('one step adds the next cards and never runs past the list', () => {
  assert.equal(browse.nextShown(12, 8770), 36);
  assert.equal(browse.nextShown(36, 40), 40);
  assert.equal(browse.nextShown(40, 40), 40);
});

test('the list opens on its first cards, with one button for more, what is shown, and a mark that loads more by itself near the end', () => {
  const html = render(React.createElement(panel.default, { posts: [post], topicId: 't1' }));
  assert.equal((html.match(/class="pcm-card/g) || []).length, 12);
  const more = html.match(/<div class="pcb-more">[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(more, /<span class="pcb-sentinel" aria-hidden="true"><\/span>/, 'the end of the list is watched, so scrolling there brings the next cards');
  assert.match(more, /<button[^>]*>Tampilkan lebih banyak<\/button>/, 'and a button, for the keyboard and where watching is not possible');
  assert.match(text(more), /12 dari 40 komentar ditampilkan/);
  assert.doesNotMatch(html, /komentar berikutnya/);
});

test('scrolling brings the next cards only up to 108, so what sits under the list can still be reached; then the button goes on', () => {
  const at = shown => renderToStaticMarkup(React.createElement(panel.MoreComments, { shown, total: 8770, onMore() {} }));
  assert.match(at(84), /class="pcb-sentinel"/);
  assert.doesNotMatch(at(108), /pcb-sentinel/);
  assert.match(at(108), /<button[^>]*>Tampilkan lebih banyak<\/button>/);
});

test('under the list one line says how many comments were analysed; the automatic lane draws no progress bar', () => {
  const html = render(React.createElement(panel.default, { posts: [post], topicId: 't1' }));
  assert.doesNotMatch(html, /Komentar otomatis|pcm-progress|role="progressbar"/);
  assert.equal(text(renderToStaticMarkup(React.createElement(panel.AnalysedLine, { analysed: 300, total: 300 }))), '300 komentar teranalisis.');
  assert.equal(text(renderToStaticMarkup(React.createElement(panel.AnalysedLine, { analysed: 120, total: 300 }))), '120 dari 300 komentar teranalisis.');
  assert.equal(text(renderToStaticMarkup(React.createElement(panel.AnalysedLine, { analysed: 0, total: 300, reading: 'loading' }))), 'Memuat hasil analisis…');
  assert.match(renderToStaticMarkup(React.createElement(panel.AnalysedLine, { analysed: 300, total: 300 })), /^<p class="pcb-analysed" role="status">/);
});

test('collecting comments reloads the page data in the background, so the cards on screen stay', () => {
  const dashboard = readFileSync(new URL('../components/admin/pulse/PulseDashboard.jsx', import.meta.url), 'utf8');
  assert.match(dashboard, /const reload = \(\) => refetchAnalytics\(\{ background: true \}\);[^\n]*'pulse-data-changed'/);
});

test('the choice to collect beyond the automatic lane names the lane by the size the server reports', () => {
  assert.equal(browse.outsideTop({ auto_top: 300 }), 'Ambil di luar 300 besar');
  assert.equal(browse.outsideTop({}), 'Ambil komentar posting lain', 'a server that does not say its size is not given a number');
  assert.doesNotMatch(readFileSync(new URL('../components/admin/pulse/CommentsPanel.jsx', import.meta.url), 'utf8'), /di luar 100 besar/);
});
