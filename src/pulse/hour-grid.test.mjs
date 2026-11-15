import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const at = (id, published_at) => ({ id, platform: 'x', author: 'akun_' + id, published_at, text: 'Isi ' + id, metrics: {} });
// Stored times are UTC; the installation's zone is WIB (seven hours ahead). 10 Nov 2026 is a Tuesday.
const oneDay = [at('a', '2026-11-10T08:13:34'), at('b', '2026-11-10T08:59:00'), at('c', '2026-11-10T02:00:00')];
const threeWeeks = [
  at('m1', '2026-11-02T03:00:00'), at('m2', '2026-11-16T03:30:00'), at('m3', '2026-11-09T03:59:59'),   // three Mondays, 10.00
  at('s1', '2026-11-08T13:00:00'), at('w1', '2026-11-04T16:30:00'),                                    // Sunday 20.00, Wednesday 23.00
  at('d1', '2026-11-05T00:00:00'), at('d2', '2026-11-06'), at('u1', null),                              // two date-only, one undated
];

async function load(path, run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try { return await run((await server.ssrLoadModule(path)).default); } finally { await server.close(); }
}
const render = props => load('/src/pulse/HourGrid.jsx', Grid => renderToStaticMarkup(React.createElement(Grid, props)));
const text = html => html.replace(/<\/?b>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rowHeads = html => [...html.matchAll(/<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/g)].map(match => text(match[1]));
const cellNames = html => [...html.matchAll(/class="phg-cell"[^>]*aria-label="([^"]+)"/g)].map(match => match[1]);

test('no post in the selection: nothing is drawn and the panel says so', async () => {
  const html = await render({ posts: [] });
  assert.doesNotMatch(html, /<table|phg-legend/);
  assert.match(text(html), /Belum ada posting\./);
});

test('posts without a clock: no grid, and the count of date-only and undated posts instead', async () => {
  const html = await render({ posts: [at('d1', '2026-11-05T00:00:00'), at('d2', '2026-11-06'), at('u1', null)] });
  assert.doesNotMatch(html, /<table|phg-legend/);
  assert.match(text(html), /Tidak ada posting dengan jam terbit/);
  assert.match(text(html), /2 posting hanya bertanggal dan 1 tanpa tanggal/);
});

test('a few posts on one day: one row for that day, never a weekday row', async () => {
  const html = await render({ posts: oneDay });
  assert.deepEqual(rowHeads(html), ['Sel 10 Nov']);
  const names = cellNames(html);
  assert.equal(names.length, 24);
  assert.equal(names[15], 'Selasa, 10 Nov, pukul 15.00: 2 posting');
  assert.equal(names[9], 'Selasa, 10 Nov, pukul 09.00: 1 posting');
  assert.equal(names[0], 'Selasa, 10 Nov, pukul 00.00: 0 posting');
  assert.match(text(html), /Paling ramai: Selasa, 10 Nov pukul 15\.00 WIB, 2 posting/);
  assert.match(text(html), /3 dari 3 posting punya jam terbit/);
  assert.doesNotMatch(text(html), /hanya bertanggal|tanpa tanggal/);
  // The key says in numbers what each step of the one hue stands for; with a largest cell of 2 there are two steps.
  const legend = html.match(/<ul[^>]*class="phg-legend"[\s\S]*?<\/ul>/)[0];
  assert.deepEqual([...legend.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => text(match[1])), ['0', '1', '2']);
  assert.deepEqual([...html.matchAll(/class="phg-cell"[^>]*data-level="(\d)"/g)].map(match => match[1]).filter(level => level !== '0'), ['1', '2']);
});

test('more than 14 days: seven weekday rows from Monday, hours of the zone, a key, and what was left out', async () => {
  const html = await render({ posts: threeWeeks });
  assert.deepEqual(rowHeads(html), ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']);
  const names = cellNames(html);
  assert.equal(names.length, 7 * 24);
  assert.equal(names[10], 'Senin, pukul 10.00: 3 posting');
  assert.equal(names[2 * 24 + 23], 'Rabu, pukul 23.00: 1 posting');
  assert.equal(names[6 * 24 + 20], 'Minggu, pukul 20.00: 1 posting');
  // Hour labels are written every third hour; every column still has a name for a screen reader.
  const heads = [...html.matchAll(/<th[^>]*scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map(match => match[1]);
  assert.equal(heads.length, 26, 'the row label, 24 hours and the row total');
  assert.deepEqual(heads.slice(1, 25).filter(cell => !/pu-sr/.test(cell)).map(text), ['00', '03', '06', '09', '12', '15', '18', '21']);
  assert.match(html, /<caption[^>]*>[^<]*per hari dan jam terbit \(WIB\)/);
  assert.match(text(html), /Paling ramai: Senin pukul 10\.00 WIB, 3 posting/);
  assert.match(text(html), /5 dari 8 posting punya jam terbit/);
  assert.match(text(html), /2 posting hanya bertanggal dan 1 tanpa tanggal tidak masuk/);
  assert.deepEqual([...html.matchAll(/<td[^>]*class="phg-sum"[^>]*>([^<]*)</g)].map(match => match[1]), ['3', '0', '1', '0', '0', '0', '1']);
});

test('with a way to open posts each cell is a button and the grid is one stop for the keyboard; without one it promises nothing', async () => {
  const still = await render({ posts: threeWeeks });
  assert.doesNotMatch(still, /<button/);
  assert.match(still, /class="phg-scroll"[^>]*tabindex="0"/, 'a grid that only scrolls can still be scrolled from the keyboard');
  const html = await render({ posts: threeWeeks, onOpen() {} });
  assert.equal((html.match(/<button[^>]*class="phg-cell"/g) || []).length, 7 * 24);
  const stops = [...html.matchAll(/<button[^>]*class="phg-cell"[^>]*>/g)].map(match => match[0]).filter(tag => / tabindex="0"/.test(tag));
  assert.equal(stops.length, 1);
  assert.match(stops[0], /aria-label="Senin, pukul 10\.00: 3 posting"/, 'the keyboard starts on the busiest cell');
});

test('in the word panel of a project page the grid takes the place of the 24 bars, with the same range filter', async () => {
  await load('/src/components/admin/pulse/InfographicsPanel.jsx', Panel => {
    const html = renderToStaticMarkup(React.createElement(Panel, { posts: threeWeeks, grid: true }));
    assert.doesNotMatch(html, /pi-hour-bar|pi-hour-chart|Lihat hitungan 24 jam/);
    assert.match(html, /<table[^>]*class="phg-grid"/);
    assert.match(html, /aria-label="Rentang waktu Jam publikasi"/);
    assert.match(html, /<h3>Kapan posting dipublikasikan\?<\/h3>/);
    // Without the switch (the old Command Center view) the bars stay as they were.
    const old = renderToStaticMarkup(React.createElement(Panel, { posts: threeWeeks, ranged: false }));
    assert.equal((old.match(/class="pi-hour-bar"/g) || []).length, 24);
    assert.doesNotMatch(old, /phg-grid/);
  });
});

test('the grid is one hue from the accent, scrolls sideways inside its panel, and keeps its targets large on a phone', () => {
  const css = readFileSync('src/pulse/ds/hour-grid.css', 'utf8');
  assert.match(css, /\.phg-scroll \{[^}]*overflow-x: auto/);
  assert.match(css, /--phg-1: color-mix\(in oklab, var\(--ps-accent\) \d+%, var\(--ps-panel\)\)/);
  assert.match(css, /@media \(max-width: 700px\)[^}]*\{[^}]*\.phg-cell[^}]*(?:height|min-height): 44px/);
  assert.doesNotMatch(css, /font-size:\s*(?:\.[0-6]\d*rem|1[01]px|[0-9]px)/, 'no text under 12px');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(/i, 'colours come from tokens');
});
