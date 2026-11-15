import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const make = (platform, published_at, metrics, times = 1) => Array.from({ length: times }, (_, index) => ({ id: `${platform}-${published_at}-${index}`, platform, author: 'akun', published_at, metrics }));
const read = { sentiment: { label: 'neutral' }, likes: 3 };
// Five Instagram posts that carry a date only and one X post with a clock: analysed and measured in full, clocked 1 of 6.
const thin = [...make('instagram', '2026-11-10T00:00:00', read, 5), ...make('x', '2026-11-10T08:00:00', read)];
const full = make('x', '2026-11-10T08:00:00', read, 4);
// 7 of 10 analysed, everything else known.
const fair = [...make('x', '2026-11-10T08:00:00', read, 7), ...make('news', '2026-11-10T09:00:00', { likes: 1 }, 3)];

async function load(run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const view = await server.ssrLoadModule('/src/pulse/CoverageBadge.jsx'), { coverage } = await server.ssrLoadModule('/src/lib/pulseReadings.js');
    const render = (Component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
    return await run({ badge: posts => render(view.default, { reading: posts && coverage(posts), to: '/pulse/sources?topic=abc' }), detail: (posts, props) => render(view.CoverageDetail, { reading: coverage(posts), ...props }) });
  } finally { await server.close(); }
}
const text = html => html.replace(/<\/?(?:b|strong)>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rowsOf = html => [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(match => text(match[1]));

test('nothing loaded, or an empty selection: no badge, because there is no level to state', async () => {
  await load(({ badge }) => {
    assert.equal(badge(null), '');
    assert.equal(badge([]), '');
  });
});

test('thin data: the badge names the level and the share that set it, and is itself the way to the detail', async () => {
  await load(({ badge }) => {
    const html = badge(thin);
    const link = html.match(/<a[^>]*class="pcv-badge"[^>]*>/)[0];
    assert.match(link, /href="\/pulse\/sources\?topic=abc"/);
    assert.match(link, /aria-label="Kelengkapan data: Terbatas, jam terbit ada pada 16% posting\. Buka Sumber &amp; Cakupan"/);
    assert.match(text(html.match(/<a[^>]*class="pcv-badge"[\s\S]*?<\/a>/)[0]), /^Kelengkapan data Terbatas: jam terbit ada pada 16% posting$/);
    assert.match(html, /class="pcv-mark" data-level="limited"/);
    // The card behind it: what the level means, then the three shares as bars for the whole selection and per platform.
    const card = html.match(/<aside[^>]*class="pcv-card"[\s\S]*<\/aside>/)[0];
    assert.match(card, /role="tooltip"/);
    assert.match(text(card), /Terbatas: jam terbit ada pada 16% posting/);
    assert.deepEqual(rowsOf(card), [
      'Platform Posting Dianalisis Interaksi Jam terbit',
      'Seluruh pilihan 6 100% 100% 16%',
      'Instagram 5 100% 100% 0%',
      'X 1 100% 100% 100%',
    ]);
    assert.equal((card.match(/class="pcv-bar"/g) || []).length, 9, 'three bars for the selection and three per platform');
    assert.match(card, /<a[^>]*href="\/pulse\/sources\?topic=abc"[^>]*>Rincian di Sumber &amp; Cakupan/);
  });
});

test('full data is complete and still says which share is the lowest; in between is "Cukup"', async () => {
  await load(({ badge }) => {
    const complete = badge(full);
    assert.match(text(complete.match(/<a[^>]*class="pcv-badge"[\s\S]*?<\/a>/)[0]), /^Kelengkapan data Lengkap: sentimen sudah dianalisis pada 100% posting$/);
    assert.match(complete, /class="pcv-mark" data-level="complete"/);
    const middle = badge(fair);
    assert.match(middle, /aria-label="Kelengkapan data: Cukup, sentimen sudah dianalisis pada 70% posting\. Buka Sumber &amp; Cakupan"/);
    assert.match(middle, /class="pcv-mark" data-level="fair"/);
    // The level is told by a word and by how many of the three steps of the mark are filled, never by a colour of praise or alarm.
    const filled = html => (html.match(/<span class="pcv-mark"[\s\S]*?<\/span>/)[0].match(/<i data-on=""/g) || []).length;
    assert.deepEqual([filled(badge(thin)), filled(middle), filled(complete)], [1, 2, 3]);
  });
});

test('the detail for Sumber & Cakupan adds the dated share and the full column names', async () => {
  await load(({ detail }) => {
    const html = detail(thin, {});
    // Each column carries its short name too, shown instead of the full one at phone width (coverage-badge.css).
    const full = html.replace(/<span class="pcv-short">[^<]*<\/span>/g, '');
    assert.deepEqual([...html.matchAll(/<span class="pcv-short">([^<]*)<\/span>/g)].map(match => match[1]), ['Dianalisis', 'Interaksi', 'Jam terbit', 'Bertanggal']);
    assert.deepEqual(rowsOf(full), [
      'Platform Posting Sudah dianalisis Interaksi diketahui Jam terbit ada Bertanggal',
      'Seluruh pilihan 6 100% 100% 16% 100%',
      'Instagram 5 100% 100% 0% 100%',
      'X 1 100% 100% 100% 100%',
    ]);
    assert.match(full, /<th[^>]*scope="col"[^>]*data-lowest=""[^>]*><span class="pcv-long">Jam terbit ada<\/span><\/th>/, 'the share that set the level is marked');
    assert.doesNotMatch(detail(thin, { compact: true }), /Bertanggal/);
  });
});

test('a share that exists never prints as 0%', async () => {
  await load(({ badge }) => {
    const html = badge([...make('instagram', '2026-11-10T00:00:00', read, 300), ...make('x', '2026-11-10T08:00:00', read)]);
    assert.match(html, /jam terbit ada pada &lt;1% posting/);
  });
});

test('the card follows the hover preview pattern, and the badge sits in the project bar', () => {
  const css = readFileSync('src/pulse/ds/coverage-badge.css', 'utf8');
  assert.match(css, /\.pcv:is\(:hover, :focus-within\) > \.pcv-card \{[^}]*visibility: visible[^}]*transition-delay: \.35s/);
  assert.match(css, /@media \(hover: none\) \{ \.pcv-card \{ display: none; \} \}/, 'never on touch: a tap follows the link');
  assert.match(css, /@media print \{[^}]*\.pcv-card[^}]*display: none/);
  assert.doesNotMatch(css, /--ps-(?:mint|peach|danger|success|warning)/, 'no colour of praise or alarm');
  assert.doesNotMatch(css, /font-size:\s*(?:\.[0-6]\d*rem|1[01]px|[0-9]px)/, 'no text under 12px');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(/i, 'colours come from tokens');
  // The bar's row of controls is full at a laptop width, so the badge is a one-line strip under it. Its room is kept
  // whether or not a figure is known: nothing moves when the figure arrives.
  const bar = readFileSync('src/pulse/ProjectBar.jsx', 'utf8');
  assert.match(bar, /\{topic && <div className="pcv-band"><CoverageBadge reading=\{[^}]+\} to=\{/);
  assert.match(css, /\.pcv-band \{[^}]*min-height: \d+px/);
  assert.match(css, /@media \(max-width: 700px\) \{[^@]*\.pcv-badge \{[^}]*min-height: 44px/, 'a full target on a phone');
  assert.match(readFileSync('src/pulse/SourcesCoverage.jsx', 'utf8'), /<CoverageDetail reading=\{/);
});
