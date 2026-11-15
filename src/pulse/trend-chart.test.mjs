import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const post = (id, published_at, sentiment, metrics = {}) => ({ id, published_at, platform: 'x', author: 'akun_' + id,
  metrics: { ...metrics, ...(sentiment ? { sentiment: { label: sentiment } } : {}) } });
const posts = [
  post('a', '2026-11-03T05:00:00Z', 'negative', { likes: 1200, comments: 34 }),
  post('b', '2026-11-03T06:00:00Z', 'positive', { likes: 10 }),
  post('c', '2026-11-05T05:00:00Z', 'negative'),
  post('d', '2026-11-12T05:00:00Z', null),
];

async function render(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: TrendChart } = await server.ssrLoadModule('/src/pulse/TrendChart.jsx');
    return renderToStaticMarkup(React.createElement(TrendChart, props));
  } finally { await server.close(); }
}
const group = (html, name) => html.match(new RegExp(`<div[^>]*role="group"[^>]*aria-label="${name}"[^>]*>[\\s\\S]*?</div>`))?.[0] || '';
const pressed = markup => [...markup.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map(match => match[1]);

test('the trend card offers what to draw and in which unit, and greys out a unit that gives one point', async () => {
  const html = await render({ posts, onPick() {} });
  const what = group(html, 'Isi grafik'), unit = group(html, 'Satuan waktu');
  assert.deepEqual(pressed(what), ['Posting &amp; interaksi']);
  assert.match(what, /Sentimen/);
  assert.deepEqual(pressed(unit), ['Hari']);
  assert.match(unit, /<button[^>]*>Minggu</);
  assert.doesNotMatch(unit.match(/<button[^>]*>Minggu</)[0], / disabled=""/);
  assert.match(unit.match(/<button[^>]*>Bulan</)[0], /disabled=""/, 'four posts in one month give a single monthly point');
  assert.match(html, /data-pick=/);
});

test('posts and interactions are two charts with one axis each, never two scales on one chart', async () => {
  const html = await render({ posts, onPick() {} });
  const charts = [...html.matchAll(/<figure[^>]*class="tc-chart[^"]*"[^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map(match => match[1].replace(/<[^>]+>/g, ''));
  assert.equal(charts.length, 2);
  assert.match(charts[0], /^Posting/);
  assert.match(charts[1], /^Interaksi/);
});

test('the numbers behind the lines are a table, with a way to open each date without a mouse', async () => {
  const html = await render({ posts, onPick() {} });
  const table = html.match(/<table[\s\S]*?<\/table>/)[0];
  assert.match(table, /<th[^>]*scope="col"[^>]*>Tanggal<\/th>/);
  const first = table.match(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*3 Nov(?:(?!<\/tr>)[\s\S])*<\/tr>/)[0];
  assert.match(first, />2</, 'two posts on 3 Nov');
  assert.match(first, />1\.244</, 'their interactions, in Indonesian grouping');
  assert.match(first, /<button[^>]*aria-label="Lihat posting 3 Nov"/);
  assert.match(table, /4 Nov[\s\S]*?>0</, 'a day without posts is listed as zero, not skipped');
});

test('without a way to open posts the card promises no click', async () => {
  const html = await render({ posts });
  assert.doesNotMatch(html, /Klik grafik/);
  assert.doesNotMatch(html, /Lihat posting/);
});

test('the sentiment view says how many posts are not analysed instead of drawing them as a tone', async () => {
  const html = await render({ posts, initialView: 'sentiment', onPick() {} });
  assert.deepEqual(pressed(group(html, 'Isi grafik')), ['Sentimen']);
  for (const label of ['Positif', 'Netral', 'Negatif']) assert.match(html, new RegExp(`class="tc-key[^"]*"[^>]*>(?:(?!</li>)[\\s\\S])*${label}`));
  assert.match(html, /1 dari 4 posting belum dianalisis, tidak digambar/);
});

test('a chosen date is named, with a way back to every date', async () => {
  const html = await render({ posts, onPick() {}, onClear() {}, selected: { from: '2026-11-03', to: '2026-11-03' } });
  assert.match(html, /Menampilkan posting 3 Nov/);
  assert.match(html, /<button[^>]*>Semua tanggal<\/button>/);
});

test('posts without a date leave a plain explanation, not an empty frame', async () => {
  const html = await render({ posts: [{ id: 'x', metrics: {} }], onPick() {} });
  assert.match(html, /Belum ada posting bertanggal/);
  assert.doesNotMatch(html, /<table/);
});

test('posts that carry no publication time are counted in a sentence, so the totals on the page still add up', async () => {
  const html = await render({ posts: [...posts, { id: 'undated', platform: 'x', metrics: {} }], onPick() {} });
  assert.match(html, /1 posting tanpa tanggal terbit tidak masuk grafik/);
  assert.doesNotMatch(await render({ posts, onPick() {} }), /tanpa tanggal terbit/);
});

const caption = html => html.match(/<p[^>]*class="pu-range-caption"[^>]*>([^<]*)</)?.[1] ?? null;
const tableDays = html => [...(html.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] || '').matchAll(/<th[^>]*scope="row"[^>]*>([^<]*)</g)].map(match => match[1]);

test('the range filter sits with the other switches, starts on everything and names the days that are drawn', async () => {
  const html = await render({ posts, title: 'Tren posting', onPick() {} });
  const range = group(html, 'Rentang waktu Tren posting');
  assert.deepEqual([...range.matchAll(/<button[^>]*>([^<]*)</g)].map(match => match[1]), ['3 hari', '7 hari', '1 bulan', 'Semua', 'Rentang']);
  assert.deepEqual(pressed(range), ['Semua']);
  assert.equal(caption(html), '3–12 Nov 2026');
  // All three switches share one look, and live in the heading of the card.
  const heading = html.match(/<header[^>]*class="pu-panel-heading"[\s\S]*?<\/header>/)[0];
  assert.equal((heading.match(/class="pu-segmented"/g) || []).length, 3);
  // A project period wider than the data is still drawn in full under "Semua", quiet days as zero.
  const wide = await render({ posts, period: { from: '2026-11-01', to: '2026-11-14' }, onPick() {} });
  assert.equal(caption(wide), '1–14 Nov 2026');
  assert.equal(tableDays(wide).length, 14);
});

test('a range narrows the days before the unit is applied, and a unit that would give one point is greyed out', async () => {
  const html = await render({ posts, period: { from: '2026-11-01', to: '2026-11-14' }, initialRange: { key: '3' }, onPick() {} });
  assert.deepEqual(pressed(group(html, 'Rentang waktu Tren percakapan')), ['3 hari']);
  assert.equal(caption(html), '10–12 Nov 2026', 'three days ending on the last day with a post, not on the last day of the period');
  assert.deepEqual(tableDays(html), ['10 Nov', '11 Nov', '12 Nov'], 'the quiet days inside the range are drawn as zero');
  const figures = [...html.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map(match => match[1].replace(/<[^>]+>/g, ' '));
  assert.match(figures[0], /Posting\s+1 pada rentang ini/);
  const unit = group(html, 'Satuan waktu');
  assert.deepEqual(pressed(unit), ['Hari']);
  assert.match(unit.match(/<button[^>]*>Minggu</)[0], /disabled=""/, '10 to 12 Nov fall in one week');
  assert.match(unit.match(/<button[^>]*>Minggu</)[0], /title="Rentang ini baru mencakup satu minggu"/);
  // The whole data spans two weeks, so without the range the same unit is offered.
  assert.doesNotMatch(group(await render({ posts, onPick() {} }), 'Satuan waktu').match(/<button[^>]*>Minggu</)[0], / disabled=""/);
  // A click still opens the bucket that was clicked: the table offers the buckets of the range, and only those with posts.
  assert.match(html, /<button[^>]*aria-label="Lihat posting 12 Nov"/);
  assert.doesNotMatch(html, /aria-label="Lihat posting 3 Nov"|aria-label="Lihat posting 10 Nov"/);
});

test('a custom range is drawn day for day', async () => {
  const html = await render({ posts, initialRange: { key: 'custom', from: '2026-11-03', to: '2026-11-05' }, onPick() {} });
  assert.deepEqual(pressed(group(html, 'Rentang waktu Tren percakapan')), ['Rentang']);
  assert.deepEqual(tableDays(html), ['3 Nov', '4 Nov', '5 Nov']);
  assert.equal(caption(html), '3–5 Nov 2026');
  assert.equal((html.match(/<input[^>]*type="date"/g) || []).length, 2);
});

test('the small form shows the days it covers and no switch', async () => {
  const html = await render({ posts, compact: true });
  assert.doesNotMatch(html, /role="group"/);
  assert.equal(caption(html), '3–12 Nov 2026');
  assert.doesNotMatch(await render({ posts: [{ id: 'x', metrics: {} }], compact: true }), /pu-range/, 'nothing dated, nothing to caption');
});

// Which days are spikes is decided on the server (rule spike_v1). Rendered here on the server side no call can be made,
// so each test hands the chart the spikes the server would have answered with, and states what is drawn from them.
const at = (id, day, author, likes) => ({ id, published_at: `2026-11-${day}T05:00:00Z`, platform: 'x', author, text: 'Isi posting ' + id, metrics: { likes } });
const quiet = [at('q1', '08', 'satu', 10), at('q2', '09', 'dua', 10), at('q4', '11', 'empat', 10), at('q5', '12', 'lima', 10)];
const loud = ['a', 'b', 'c'].map(id => at(id, '10', 'ramai', 5)).concat(['d', 'e', 'f', 'g'].map(id => at(id, '10', 'akun_' + id, 5)), [at('viral', '10', 'kabar', 4000)]);
const answered = { posts: [{ key: '2026-11-10', value: 8, usual: 1, times: 8 }], interactions: [{ key: '2026-11-10', value: 4035, usual: 10, times: 403.5 }] };

test('a spike the server found is marked, and what the day is made of is told in words that need no hover', async () => {
  const html = await render({ posts: [...quiet, ...loud], spikes: answered, onPick() {} });
  assert.match(html, /class="tc-note tc-spike-note"/);
  assert.match(html, /Titik bercincin: lonjakan/);
  assert.match(html, /aria-label="Grafik garis posting per hari\. 1 lonjakan ditandai\./);
  const head = html.match(/<thead>[\s\S]*?<\/thead>/)[0];
  assert.match(head, />Lonjakan</, 'the table says in words what the mark says on hover');
  const row = html.match(/<tr><th scope="row">10 Nov<\/th>[\s\S]*?<\/tr>/)[0];
  assert.match(row, /8 posting, 8× hari biasa pada rentang ini\./);
  assert.match(row, /Terbanyak dari X: 8 posting \(100%\)\./);
  assert.match(row, /Paling banyak memposting: @ramai \(3\)\./);
  assert.match(row, /4\.035 interaksi, 403,5× hari biasa pada rentang ini\./);
  assert.match(row, /99% dari satu posting: @kabar di X, “Isi posting viral”/);
  const other = html.match(/<tr><th scope="row">9 Nov<\/th>[\s\S]*?<\/tr>/)[0];
  assert.doesNotMatch(other, /hari biasa/, 'an ordinary day carries no note');
  assert.doesNotMatch(html, /karena|penyebab|dipicu/i, 'a spike is described, never explained by a cause');
  // The server found none: no mark, no note, no extra column.
  const calm = await render({ posts: quiet, spikes: { posts: [], interactions: [] }, onPick() {} });
  assert.doesNotMatch(calm, /tc-spike|>Lonjakan<|lonjakan/);
  // Only one line has a spike: the other chart is drawn without a mark, and the table still has its column.
  const one = await render({ posts: [...quiet, ...loud], spikes: { posts: answered.posts, interactions: [] }, onPick() {} });
  assert.match(one, /8 posting, 8× hari biasa/);
  assert.doesNotMatch(one, /403,5×/);
  assert.match(one, /aria-label="Grafik garis interaksi per hari\. Angkanya ada pada tabel/);
});

test('without an answer from the server the chart marks nothing, however high a day stands', async () => {
  // The same loud day as above. No spikes are handed over and no call can be made here, which is also what the page
  // looks like while the answer is on its way or after the call has failed: the rule is not worked out in the browser.
  const html = await render({ posts: [...quiet, ...loud], onPick() {} });
  assert.match(html, /<tr><th scope="row">10 Nov<\/th><td>8<\/td>/, 'the day and its numbers are drawn as before');
  assert.doesNotMatch(html, /tc-spike|>Lonjakan<|lonjakan|hari biasa/, 'no ring, no note, no "Lonjakan" column');
  // The sentiment and platform views mark none, whatever was answered.
  const tones = await render({ posts: [...quiet, ...loud], spikes: answered, initialView: 'sentiment', onPick() {} });
  assert.doesNotMatch(tones, /tc-spike|>Lonjakan<|lonjakan/);
});

test('an answer about a day the chart does not draw is left out instead of breaking the chart', async () => {
  const stray = { posts: [{ key: '2026-10-01', value: 90, usual: 1, times: 90 }, ...answered.posts], interactions: [] };
  const html = await render({ posts: [...quiet, ...loud], spikes: stray, onPick() {} });
  assert.match(html, /aria-label="Grafik garis posting per hari\. 1 lonjakan ditandai\./);
  assert.doesNotMatch(html, /90 posting/);
});

test('the browser holds no copy of the spike rule: the chart sends its two lines to the server and draws the answer', async () => {
  const { readFileSync } = await import('node:fs');
  const described = await import('../lib/pulseTrendSpikes.js');
  assert.equal(described.trendSpikes, undefined, 'what a spike is made of is still told here; which day is one is not decided here');
  assert.doesNotMatch(readFileSync('src/lib/pulseTrendSpikes.js', 'utf8'), /ABOVE_USUAL|median\(/);
  assert.doesNotMatch(readFileSync('src/pulse/TrendChart.jsx', 'utf8'), /trendSpikes\(/);
  assert.match(readFileSync('src/pulse/useTrendSpikes.js', 'utf8'), /api\.post\('\/admin\/pulse\/spikes'/);
});

test('the platform view draws one line per platform on its own axis, with each platform\'s count and share beside it', async () => {
  const on = (id, platform, day) => ({ id, platform, published_at: `2026-11-${day}T05:00:00Z`, author: 'akun_' + id, metrics: {} });
  const mixed = [...Array.from({ length: 8 }, (_, index) => on('x' + index, 'x', index < 6 ? '10' : '11')), on('t1', 'tiktok', '11'), on('t2', 'tiktok', '12')];
  const html = await render({ posts: mixed, initialView: 'platform', onPick() {} });
  assert.deepEqual(pressed(group(html, 'Isi grafik')), ['Platform']);
  const items = [...html.matchAll(/<li class="tc-plat"[\s\S]*?<\/li>/g)].map(match => match[0]);
  assert.equal(items.length, 2);
  const text = item => item.match(/<div class="tc-plat-head">[\s\S]*?<\/div>/)[0].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(text(items[0]), 'X 8 posting · 80% Teramai 10 Nov: 6');
  assert.equal(text(items[1]), 'TikTok 2 posting · 20% Teramai 11 Nov: 1');
  assert.match(items[1], /aria-label="Grafik garis posting di TikTok per hari/);
  assert.match(html, /Skala tiap platform/, 'the reader is told the lines do not share a scale');
  assert.doesNotMatch(html, /Klik grafik/, 'a click on one platform\'s line would open every platform\'s posts, so none is promised');
  const head = [...html.match(/<thead>[\s\S]*?<\/thead>/)[0].matchAll(/<th [^>]*>([^<]*)</g)].map(match => match[1]);
  assert.deepEqual(head.slice(0, 4), ['Tanggal', 'Posting', 'X', 'TikTok']);
  const row = html.match(/<tr><th scope="row">11 Nov<\/th>[\s\S]*?<\/tr>/)[0];
  assert.deepEqual([...row.matchAll(/<td>(\d+)<\/td>/g)].map(match => match[1]), ['3', '2', '1']);
});
