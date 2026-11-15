import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let seq = 0;
const said = (text, day, times = 1) => Array.from({ length: times }, () => ({ id: 'p' + (++seq), platform: 'x', author: 'akun_' + seq, title: '', text, published_at: `2026-11-${day}T05:00:00Z`, metrics: {} }));
const period = { from: '2026-11-09', to: '2026-11-15' }, before = { from: '2026-11-02', to: '2026-11-08' };
// Now: "banjir besar" in 6 of 10 posts, "macet" in 1. Before: "banjir" in 2 of 10, "macet" in 5.
const now = [...said('Banjir besar', '10', 6), ...said('macet', '11'), ...said('', '12', 3)];
const earlier = [...said('banjir', '03', 2), ...said('macet', '04', 5), ...said('', '05', 3)];

async function render(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Panel } = await server.ssrLoadModule('/src/components/admin/pulse/InfographicsPanel.jsx');
    return renderToStaticMarkup(React.createElement(Panel, props));
  } finally { await server.close(); }
}
const text = html => html.replace(/<\/?(?:b|strong)>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const wordsPanel = html => html.match(/<section class="pi-words"[\s\S]*?<section class="pi-keywords"/)[0];
const group = (html, name) => html.match(new RegExp(`<div[^>]*role="group"[^>]*aria-label="${name}"[^>]*>[\\s\\S]*?</div>`))?.[0] || '';
const pressed = markup => [...markup.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map(match => match[1]);
const rows = (html, name) => [...(html.match(new RegExp(`<section[^>]*aria-label="${name}"[\\s\\S]*?</section>`))?.[0] || '').matchAll(/<button[^>]*class="pts-row"[^>]*aria-label="([^"]+)"/g)].map(match => match[1]);
const shiftView = shift => render({ posts: now, shift, initialWordView: 'shift' });

test('a panel that was given nothing to compare with has no switch: the word panel is as it was', async () => {
  const html = wordsPanel(await render({ posts: now }));
  assert.equal(group(html, 'Tampilan kata'), '');
  assert.match(html, /class="pi-wordcloud"/);
});

test('the word panel opens on the most frequent words, with a two-way switch to what rose and fell', async () => {
  const html = wordsPanel(await render({ posts: now, shift: { period, before, posts: earlier, status: 'ready' } }));
  const view = group(html, 'Tampilan kata');
  assert.deepEqual([...view.matchAll(/<button[^>]*>([^<]*)</g)].map(match => match[1]), ['Paling sering', 'Naik dan turun']);
  assert.deepEqual(pressed(view), ['Paling sering']);
  assert.match(view, /class="pu-segmented/);
  assert.match(html, /class="pi-wordcloud"/);
  assert.match(html, /aria-label="Rentang waktu Kata dalam percakapan"/);
  assert.doesNotMatch(html, /pts-row/);
});

test('rising and falling terms are bars to the right and left of one centre line, with both shares in words', async () => {
  const html = wordsPanel(await shiftView({ period, before, posts: earlier, status: 'ready' }));
  assert.deepEqual(pressed(group(html, 'Tampilan kata')), ['Naik dan turun']);
  assert.doesNotMatch(html, /pi-wordcloud|Rentang waktu Kata/, 'the comparison is between two whole periods, so the panel\'s own range filter steps aside');
  assert.match(text(html), /9–15 Nov 2026 \(10 posting\) dibanding 2–8 Nov 2026 \(10 posting\)/);
  assert.deepEqual(rows(html, 'Kata yang naik'), [
    'banjir besar: naik 60 poin, dari 0% ke 60% posting. 6 posting periode ini, 0 sebelumnya',
    'besar: naik 60 poin, dari 0% ke 60% posting. 6 posting periode ini, 0 sebelumnya',
    'banjir: naik 40 poin, dari 20% ke 60% posting. 6 posting periode ini, 2 sebelumnya',
  ]);
  assert.deepEqual(rows(html, 'Kata yang turun'), ['macet: turun 40 poin, dari 50% ke 10% posting. 1 posting periode ini, 5 sebelumnya']);
  // One scale for every bar: the largest shift fills its half, the others are in proportion. Rising runs right of the centre, falling left.
  const bars = [...html.matchAll(/<i class="pts-bar" data-side="(up|down)" style="([^"]+)"/g)].map(match => [match[1], match[2]]);
  assert.deepEqual(bars.map(([side]) => side), ['up', 'up', 'up', 'down']);
  assert.match(bars[0][1], /left:50%;width:50%/);
  assert.match(bars[2][1], /left:50%;width:33\.33%/);
  assert.match(bars[3][1], /right:50%;width:33\.33%/);
  // The figures are written beside each bar: direction in a word, both shares in numbers.
  assert.match(text(html), /banjir naik 40 poin dari 20% ke 60%/);
  assert.match(text(html), /macet turun 40 poin dari 50% ke 10%/);
});

test('a term opens its posts in the list the word panel already has, a pair of words included', async () => {
  const html = wordsPanel(await shiftView({ period, before, posts: earlier, status: 'ready' }));
  const first = html.match(/<button[^>]*class="pts-row"[^>]*>/)[0];
  assert.match(first, /aria-pressed="true"/, 'the first term is chosen to begin with');
  const list = html.match(/<section class="pi-evidence"[\s\S]*?<\/section>/)[0];
  assert.match(first, new RegExp(`aria-controls="${list.match(/id="([^"]+)"/)[1]}"`));
  assert.match(list, /Bukti kata “banjir besar”/);
  assert.match(text(list), /6 dari 6 posting periode ini ditampilkan/);
  assert.equal((list.match(/class="pi-source"/g) || []).length, 6);
});

test('without a chosen period there is nothing to compare, and the panel says what to do', async () => {
  const html = wordsPanel(await shiftView({ period: null, before: null, posts: null, status: 'none' }));
  assert.doesNotMatch(html, /pts-row|pi-wordcloud/);
  assert.match(text(html), /Belum ada pembanding/);
  assert.match(text(html), /Pilih periode di bilah project/);
});

test('while the period before is loading, and when it could not be loaded, the panel says so', async () => {
  const loading = wordsPanel(await shiftView({ period, before, posts: null, status: 'loading' }));
  assert.match(loading, /<p[^>]*role="status"[^>]*>Memuat 2–8 Nov 2026/);
  assert.doesNotMatch(loading, /pts-row/);
  const failed = wordsPanel(await shiftView({ period, before, posts: null, status: 'error', retry() {} }));
  assert.match(text(failed), /Posting 2–8 Nov 2026 belum dapat dimuat/);
  assert.match(failed, /<button[^>]*>Coba lagi<\/button>/);
});

test('no post in the period before is no shift, not a rise from zero', async () => {
  const html = wordsPanel(await shiftView({ period, before, posts: [], status: 'ready' }));
  assert.doesNotMatch(html, /pts-row/);
  assert.match(text(html), /Tidak ada posting pada 2–8 Nov 2026\./);
});

test('thin data: terms in fewer than five posts are not listed, and the panel says why it is empty', async () => {
  const html = wordsPanel(await render({ posts: said('hujan deras', '10', 4), shift: { period, before, posts: said('angin', '03', 3), status: 'ready' }, initialWordView: 'shift' }));
  assert.doesNotMatch(html, /pts-row/);
  assert.match(text(html), /Belum ada kata yang porsinya berubah/);
  assert.match(text(html), /4 posting\) dibanding 2–8 Nov 2026 \(3 posting\)/);
});

test('the bars share one hue and a centre line, and the styles keep to the tokens', () => {
  const css = readFileSync('src/pulse/ds/term-shift.css', 'utf8');
  assert.match(css, /\.pts-track::before \{[^}]*left: 50%/);
  assert.match(css, /\.pts-bar\[data-side=down\]/);
  assert.doesNotMatch(css, /--ps-sent-|--ps-success|--ps-danger/, 'a word that rises is not good news and one that falls is not bad');
  assert.doesNotMatch(css, /font-size:\s*(?:\.[0-6]\d*rem|1[01]px|[0-9]px)/, 'no text under 12px');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(/i, 'colours come from tokens');
});
