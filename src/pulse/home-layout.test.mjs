// Beranda, rearranged (15 Nov 2026, the owner: "jangan terlalu banyak scroll to go to the point", "filtering could be
// better", "penjelasan jadi tool tip"). The answer first, with the figures of the refresh and the filters in the same card;
// the list beside the map and the rankings; the projects; then a column per platform, five rows each until asked for ten.
// Explanations sit behind info buttons; the words are kept there, not dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const now = new Date('2026-11-15T01:30:00Z');
const region = (code, searches) => ({ code, searches });
const issue = (rank, title, category, platforms, regions = [], more = {}) => ({ key: 'k' + rank, scope: 'national', rank, title, category, reason: 'Ramai.', platforms, regions,
  evidence_titles: [], query: { q: title }, movement: null, project: null, ...more });
const issues = [
  issue(1, 'Pengunduran diri Wapres', 'politik', { news: { count: 15 }, search: { searches: 5000 }, youtube: { count: 3, views: 9000000 } }, [region('ID-JI', 1000), region('ID-JK', 2000)]),
  issue(2, 'Pertemuan di Bogor', 'politik', { news: { count: 5 } }),
  issue(3, 'Timnas Indonesia', 'olahraga', { search: { searches: 2000 } }, [region('ID-JI', 500)]),
  ...Array.from({ length: 9 }, (_, index) => issue(index + 4, 'Isu politik ' + (index + 4), 'politik', { news: { count: 4 - index / 10 } })),
];
const radar = { state: 'ok', updated_at: '2026-11-15T01:10:00', interval_minutes: 30, enabled: true, running: false, missing: [], provinces_read: ['ID-JI', 'ID-JK'],
  signals: { news: 122, search: 54, youtube: 51 }, last_attempt: { state: 'ok', at: '2026-11-15T01:10:00' }, brief: 'Wapres mundur mendominasi [1].', issues, raw: null };
const projects = [{ id: 't1', label: 'Isu Gibran', collecting: true, posts_total: 10, posts_24h: 2, posts_prev_24h: 1, alerts_unread: 0, last_collected_at: null,
  series_7d: [1, 2], sentiment_7d: { positive: 1, neutral: 1, negative: 0, unknown: 0 } }];
const none = { category: '', platform: '', province: '' };

async function render(path, name, props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const module = await server.ssrLoadModule(path);
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse'] }, React.createElement(module[name], props)));
  } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const view = props => render('/src/pulse/Home.jsx', 'HomeView', { radar, projects, filters: none, canCreate: true, now, onFilters() {}, onSelect() {}, onRefresh() {}, ...props });
const lead = props => render('/src/pulse/RadarLead.jsx', 'default', { payload: radar, filters: none, canCreate: true, now, onFilters() {}, ...props });
const group = (html, name) => html.match(new RegExp(`<div[^>]*role="group"[^>]*aria-label="${name}"[^>]*>[\\s\\S]*?</div>`))?.[0] || '';
const chips = markup => [...markup.matchAll(/<button[^>]*class="rdl-chip"[^>]*>([\s\S]*?)<\/button>/g)].map(match => text(match[1]));
const source = name => readFileSync(new URL('./' + name, import.meta.url), 'utf8');

test('Beranda reads top to bottom: the answer with its figures and filters, the list beside the map, the projects, then the columns per platform', async () => {
  const html = await view({});
  const marks = ['aria-label="Isu yang ramai di Indonesia"', 'aria-label="Angka pembaruan ini"', 'aria-label="Kategori isu"', 'aria-label="Isu teratas"',
    'aria-label="Peta sebaran isu"', 'aria-label="Provinsi paling ramai"', 'aria-label="Jejak platform"', 'id="hm-projects"', 'aria-label="Isu teratas per platform"'];
  const order = marks.map(mark => html.indexOf(mark));
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), `in this order: ${order}`);
  const first = html.slice(order[0], order[3]);
  assert.match(first, /aria-label="Angka pembaruan ini"/, 'the figures of the refresh sit in the first card, not in a strip of their own');
  assert.doesNotMatch(html, /pu-stat-grid/);
  assert.equal((html.match(/class="lay-8"/g) || []).length, 1, 'one wide column: the list; the map and rankings are its side column');
  assert.doesNotMatch(html, /Komposisi isu/, 'the categories and their counts are the switches themselves');
});

test('explanations sit behind info buttons, and their words are kept there', async () => {
  const html = await view({});
  for (const label of ['Tentang radar isu', 'Tentang urutan isu', 'Tentang peta', 'Tentang provinsi paling ramai', 'Tentang jejak platform'])
    assert.match(html, new RegExp(`class="ps-info-trigger"[^>]*aria-label="${label}"`), label);
  const words = text(html);
  for (const sentence of [/Urutan menggabungkan posisi isu/, /Peta memakai pencarian populer/, /Tanda \+ berarti batas bawah/, /Berapa isu pada daftar/])
    assert.doesNotMatch(words, sentence, String(sentence));
  assert.match(source('RadarIssues.jsx'), /Urutan menggabungkan posisi isu di tiap platform/);
  assert.match(source('RadarIssues.jsx'), /Tanda \+ berarti batas bawah/);
  assert.match(source('Home.jsx'), /MAP_SOURCE/, 'what the map cannot know is still said, in its info button');
  assert.match(source('RadarBreakdowns.jsx'), /Berapa isu pada daftar yang masuk pencarian populer tiap provinsi/);
});

test('the filters: categories and platforms as chips with their counts and marks, a province picked from a list, and what a filter hides', async () => {
  const html = await lead({});
  assert.deepEqual(chips(group(html, 'Kategori isu')), ['Semua 12', 'Politik 11', 'Olahraga 1']);
  assert.match(group(html, 'Kategori isu'), /<span class="rdl-count">11<\/span>/, 'the count is set apart from the name');
  const platforms = [...group(html, 'Platform').matchAll(/<button[^>]*class="rdl-chip"[^>]*>([\s\S]*?)<\/button>/g)].map(match => match[1]);
  assert.deepEqual(platforms.map(text), ['Semua platform', 'Berita', 'YouTube', 'Google']);
  assert.ok(platforms.slice(1).every(chip => /<svg/.test(chip)), 'each platform carries its mark');
  const select = html.match(/<select[^>]*aria-label="Wilayah"[^>]*>[\s\S]*?<\/select>/)?.[0] || '';
  assert.deepEqual([...select.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map(match => match[1]), ['Seluruh Indonesia', 'Jawa Timur · 2 isu', 'DKI Jakarta · 1 isu'],
    'only provinces where an issue is loud, the busiest first');
  const chosen = await lead({ filters: { ...none, province: 'ID-JI' } });
  assert.match(chosen, /<option value="ID-JI" selected="">/);
  assert.match(chosen, /<h2[^>]*>Isu yang ramai di Jawa Timur/);
  const filtered = await lead({ filters: { ...none, category: 'olahraga' } });
  assert.match(group(filtered, 'Kategori isu'), /<button[^>]*class="rdl-chip"[^>]*aria-pressed="true"[^>]*>Olahraga/);
  assert.match(text(filtered), /Menampilkan 1 dari 12 isu Tampilkan semua isu/);
});

test('the three highest name the source of their picture on the picture, not in a line under it', async () => {
  const THUMB = 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg';
  const html = await render('/src/pulse/RadarIssues.jsx', 'default', { payload: { ...radar, issues: [{ ...issues[0], image: { url: THUMB, source: 'Kanal Bola', kind: 'video' } }, ...issues.slice(1)] },
    filters: none, canCreate: true, onFilters() {}, onSelect() {} });
  const first = html.split(/(?=<li[^>]*class="rdi-row[" ])/)[1];
  assert.match(first, /class="rdi-pic"[\s\S]*?<span class="rdi-pic-credit" title="Gambar dari Kanal Bola">Kanal Bola<\/span>/);
  assert.doesNotMatch(first, /class="rdi-credit"/);
});

test('each platform column shows its first five, and one button shows ten in every column', async () => {
  const html = await render('/src/pulse/RadarPlatformTops.jsx', 'default', { issues, filters: none });
  const news = html.split(/(?=<div[^>]*role="region"[^>]*aria-label="Teratas di )/)[1];
  assert.equal((news.match(/<ol[^>]*class="rpt-list"[\s\S]*?<\/ol>/)[0].match(/<li/g) || []).length, 5);
  assert.match(html, /<button[^>]*aria-expanded="false"[^>]*>Tampilkan 10 teratas<\/button>/);
  assert.match(html, /class="ps-info-trigger"[^>]*aria-label="Tentang angka Berita"/, 'what a column counts is one tap away');
});
