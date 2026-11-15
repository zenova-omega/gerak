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
  assert.match(html, /Klik grafik untuk melihat posting/);
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
  assert.match(html, /1 dari 4 posting belum dianalisis dan tidak digambar/);
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
