import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

async function withVite(run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try { return await run(path => server.ssrLoadModule(path)); } finally { await server.close(); }
}
const group = (html, name) => html.match(new RegExp(`<div[^>]*role="group"[^>]*aria-label="${name}"[^>]*>[\\s\\S]*?</div>`))?.[0] || '';
const buttons = markup => [...markup.matchAll(/<button[^>]*>([^<]*)</g)].map(match => match[1]);
const pressed = markup => [...markup.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map(match => match[1]);
const caption = html => html.match(/<p[^>]*class="pu-range-caption"[^>]*>([^<]*)</)?.[1] ?? null;

test('the range filter is one segmented switch that names its chart and says which days are drawn', async () => {
  await withVite(async load => {
    const { PulseRange } = await load('/src/components/ui/PulseRange.jsx');
    const { rangeBounds } = await load('/src/lib/pulseRange.js');
    const bounds = rangeBounds(['2026-11-03', '2026-11-05', '2026-11-14']);
    const render = props => renderToStaticMarkup(React.createElement(PulseRange, { chart: 'Tren harian', bounds, value: { key: 'all' }, onChange() {}, ...props }));

    const html = render();
    const range = group(html, 'Rentang waktu Tren harian');
    assert.match(range, /class="pu-segmented"/, 'the one shared look of a segmented switch');
    assert.deepEqual(buttons(range), ['3 hari', '7 hari', '1 bulan', 'Semua', 'Rentang']);
    assert.deepEqual(pressed(range), ['Semua']);
    assert.equal((range.match(/aria-pressed="false"/g) || []).length, 4);
    assert.doesNotMatch(range, / disabled=""/, 'no choice is switched off, also when it would show the same days as "Semua"');
    assert.match(range, /type="button"/);
    assert.equal(caption(html), '3–14 Nov 2026');
    assert.match(html, /<p[^>]*class="pu-range-caption"[^>]*role="status"/);
    assert.doesNotMatch(html, /type="date"/, 'date inputs stay away until "Rentang" is chosen');
    assert.doesNotMatch(html, /role="dialog"|<dialog/);

    const week = render({ value: { key: '7' } });
    assert.deepEqual(pressed(group(week, 'Rentang waktu Tren harian')), ['7 hari']);
    assert.equal(caption(week), '8–14 Nov 2026', 'seven days ending on the last day that has data');
  });
});

test('"Rentang" shows two date inputs in the same row, limited to the days that have data', async () => {
  await withVite(async load => {
    const { PulseRange } = await load('/src/components/ui/PulseRange.jsx');
    const { rangeBounds } = await load('/src/lib/pulseRange.js');
    const bounds = rangeBounds(['2026-11-03', '2026-11-05', '2026-11-14']);
    const html = renderToStaticMarkup(React.createElement(PulseRange, { chart: 'Tren harian', bounds, value: { key: 'custom', from: '2026-11-05', to: '2026-11-14' }, onChange() {} }));
    assert.deepEqual(pressed(group(html, 'Rentang waktu Tren harian')), ['Rentang']);
    const inputs = [...html.matchAll(/<input[^>]*type="date"[^>]*>/g)].map(match => match[0]);
    assert.equal(inputs.length, 2);
    assert.match(inputs[0], /aria-label="Dari tanggal, Tren harian"/);
    assert.match(inputs[0], /min="2026-11-03"/); assert.match(inputs[0], /max="2026-11-14"/); assert.match(inputs[0], /value="2026-11-05"/);
    assert.match(inputs[1], /aria-label="Sampai tanggal, Tren harian"/);
    assert.match(inputs[1], /min="2026-11-05"/); assert.match(inputs[1], /max="2026-11-14"/); assert.match(inputs[1], /value="2026-11-14"/);
    assert.equal(caption(html), '5–14 Nov 2026');
    assert.doesNotMatch(html, /role="alert"/, 'a range that applies has nothing to complain about');
    assert.doesNotMatch(html, /Terapkan|role="dialog"/, 'no modal and no extra step');
  });
});

test('too little data for a choice leaves only the caption, and no data leaves nothing', async () => {
  await withVite(async load => {
    const { PulseRange } = await load('/src/components/ui/PulseRange.jsx');
    const { rangeBounds } = await load('/src/lib/pulseRange.js');
    const render = props => renderToStaticMarkup(React.createElement(PulseRange, { chart: 'Emosi percakapan', value: { key: 'all' }, onChange() {}, ...props }));
    const oneDay = render({ bounds: rangeBounds(['2026-11-14', '2026-11-14']) });
    assert.doesNotMatch(oneDay, /role="group"|<button/);
    assert.equal(caption(oneDay), '14 Nov 2026');
    assert.equal(render({ bounds: rangeBounds([]) }), '');
    // The small form of a chart keeps the caption and drops the switch.
    const small = render({ bounds: rangeBounds(['2026-11-03', '2026-11-14']), captionOnly: true });
    assert.doesNotMatch(small, /role="group"|<button|type="date"/);
    assert.equal(caption(small), '3–14 Nov 2026');
  });
});

const post = (id, published_at, extra = {}) => ({ id, platform: 'x', author: 'akun_' + id, title: 'Harga beras naik ' + id, text: 'Harga beras naik lagi', published_at,
  metrics: { sentiment: { label: 'negative', reason: 'Keluhan harga' }, emotion: { label: 'anger', confidence: .9, reason: 'Nada marah' }, likes: 3 }, ...extra });
const posts = [post('a', '2026-11-03T05:00:00Z'), post('b', '2026-11-05T05:00:00Z'), post('c', '2026-11-12T05:00:00Z'), post('d', '2026-11-14T05:00:00Z')];

test('the Sentimen page uses the shared filter on its daily chart and for the posts behind the numbers', async () => {
  await withVite(async load => {
    const { default: Page } = await load('/src/pulse/SentimentAnalytics.jsx');
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/sentiment?topic=p1'] }, React.createElement(Page, { data: { posts } })));
    assert.deepEqual(pressed(group(html, 'Rentang waktu Tren harian')), ['Semua'], 'the chart starts on everything it was given');
    assert.deepEqual(pressed(group(html, 'Rentang waktu Posting di balik angka')), ['7 hari'], 'the evidence keeps its seven-day start, so there is a week before to compare with');
    assert.match(html, /8–14 Nov 2026/);
    assert.doesNotMatch(html, /Pilih rentang waktu|Hari terakhir|>Satu hari<|>30 hari</, 'the page no longer has a preset row of its own');
    // One day is still one click away: every date in the table under the chart opens that day in the evidence.
    assert.match(html, /<button[^>]*aria-label="Telusuri perubahan 2026-11-14"/);
  });
});

test('the emotion card carries the filter in its heading', async () => {
  await withVite(async load => {
    const { default: Panel } = await load('/src/pulse/EmotionAnalytics.jsx');
    const html = renderToStaticMarkup(React.createElement(Panel, { posts }));
    assert.deepEqual(pressed(group(html, 'Rentang waktu Emosi percakapan')), ['Semua']);
    assert.match(html, /3–14 Nov 2026/);
    assert.match(html, /aria-label="Marah: 4 posting. Lihat sumber"/);
    // A card without dated emotion results has nothing to narrow.
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(Panel, { posts: [{ id: 'x', metrics: {} }] })), /Rentang waktu/);
  });
});

test('words and publication hours on Ikhtisar are narrowed separately', async () => {
  await withVite(async load => {
    const { default: Panel } = await load('/src/components/admin/pulse/InfographicsPanel.jsx');
    const html = renderToStaticMarkup(React.createElement(Panel, { posts }));
    assert.deepEqual(pressed(group(html, 'Rentang waktu Kata dalam percakapan')), ['Semua']);
    assert.deepEqual(pressed(group(html, 'Rentang waktu Jam publikasi')), ['Semua']);
    // The top five are the same count as the cloud, so they follow its filter and repeat the days it covers.
    const topFive = html.match(/<section[^>]*aria-label="Lima kata teratas"[\s\S]*?<\/section>/)[0];
    assert.doesNotMatch(topFive, /role="group"/);
    assert.equal(caption(topFive), '3–14 Nov 2026');
    // The old Command Center view sits outside the PULSE shell and its styles, so it opts out.
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(Panel, { posts, ranged: false })), /Rentang waktu|pu-range/);
  });
});

test('the design-system gallery shows the filter with sample days', async () => {
  await withVite(async load => {
    const { default: Gallery } = await load('/src/pulse/DesignSystemGallery.jsx');
    const html = renderToStaticMarkup(React.createElement(Gallery));
    assert.deepEqual(buttons(group(html, 'Rentang waktu Contoh grafik')), ['3 hari', '7 hari', '1 bulan', 'Semua', 'Rentang']);
    assert.match(html, /<h3>Filter rentang grafik<\/h3>/);
  });
});

test('the segmented switch has one definition, shared by the range filter and the trend chart', () => {
  const shared = readFileSync('src/pulse/ds/range-filter.css', 'utf8'), trend = readFileSync('src/pulse/ds/trend-chart.css', 'utf8');
  assert.match(shared, /\.pu-segmented > button\[aria-pressed=true\]/);
  assert.match(shared, /@media \(max-width: 700px\)[^}]*\.pu-segmented > button[^}]*min-height: var\(--ps-control-md\)/, '36px items become 44px on a phone');
  assert.match(shared, /outline: var\(--ps-control-focus\)/);
  assert.doesNotMatch(trend, /tc-switch/, 'the trend chart no longer keeps a copy');
  assert.doesNotMatch(readFileSync('src/pulse/TrendChart.jsx', 'utf8'), /tc-switch/);
  assert.doesNotMatch(shared, /gradient|border-left|box-shadow: [^n]/);
});
