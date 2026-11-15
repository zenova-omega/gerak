import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { pageMeta, pageOrder } from './pageMeta.js';
import { monitorExtras } from '../lib/pulseMonitor.js';

const now = new Date('2026-11-15T01:30:00Z');
const project = (id, label, more = {}) => ({ id, label, collecting: true, posts_total: 6694, posts_24h: 412, posts_prev_24h: 349, alerts_unread: 3,
  last_collected_at: '2026-11-15T00:13:00', newest_post_at: '2026-11-15T00:10:00', series_7d: [90, 209, 1910, 1368, 1242, 349, 412],
  sentiment_7d: { positive: 6, neutral: 59, negative: 35, unknown: 0 }, ...more });
const projects = [
  project('t1', 'Isu Pengunduran Diri Gibran'),
  project('t2', 'Isu Penyadapan Presiden', { posts_total: 3196, posts_24h: 96, posts_prev_24h: 123, alerts_unread: 0, sentiment_7d: { positive: 1, neutral: 0, negative: 0, unknown: 3 } }),
  project('t3', 'cawapres', { posts_24h: 50, posts_prev_24h: 50, last_collected_at: null }),
  project('t4', 'Baru hari ini', { posts_24h: 7, posts_prev_24h: 0, series_7d: [0, 0, 0, 0, 0, 0, 7] }),
  project('t5', 'Sepi', { posts_24h: 0, posts_prev_24h: 0, posts_total: 0, series_7d: [0, 0, 0, 0, 0, 0, 0], sentiment_7d: { positive: 0, neutral: 0, negative: 0, unknown: 0 } }),
  project('t6', 'Arsip banjir', { collecting: false, posts_24h: 0, posts_prev_24h: 4 }),
];
const region = (code, searches) => ({ code, searches });
const issue = (rank, title, category, platforms, regions = [], more = {}) => ({ key: 'k' + rank, scope: 'national', rank, title, category, reason: 'Ramai.', platforms, regions,
  evidence_titles: [], query: { q: title }, movement: null, project: null, ...more });
const radar = { state: 'ok', updated_at: '2026-11-15T01:10:00', interval_minutes: 30, enabled: true, running: false, missing: [], provinces_read: ['ID-JI', 'ID-JK'],
  signals: { news: 122, search: 54, youtube: 51 }, last_attempt: { state: 'ok', at: '2026-11-15T01:10:00' }, brief: 'Wapres mundur mendominasi [1].',
  issues: [issue(1, 'Pengunduran diri Wapres', 'politik', { news: { count: 15 }, youtube: { count: 3, views: 9000000 } }, [region('ID-JI', 1000), region('ID-JK', 2000)]),
    issue(2, 'Pertemuan di Bogor', 'politik', { news: { count: 5 } }), issue(3, 'Timnas Indonesia', 'olahraga', { search: { searches: 2000 } }, [region('ID-JI', 500)])], raw: null };
const none = { category: '', platform: '', province: '' };

async function render(path, name, props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const module = await server.ssrLoadModule(path);
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse'] }, React.createElement(module[name], props)));
  } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const cards = html => html.split(/(?=<div[^>]*class="[^"]*hmp-card)/).slice(1);
const cardOf = (html, label) => cards(html).find(card => card.includes('>' + label + '<')) || '';
const view = props => render('/src/pulse/Home.jsx', 'HomeView', { radar, projects, filters: none, canCreate: true, now, onFilters() {}, onSelect() {}, onRefresh() {}, ...props });

test('a project card with nothing analysed yet prints no percentage; "belum dianalisis" carries the whole count (tone_share_v1)', async () => {
  const rows = [project('w', 'Menunggu analisis', { sentiment_7d: { positive: 0, neutral: 0, negative: 0, unknown: 1240 } }),
    project('s', 'Satu dari tiga ratus', { sentiment_7d: { positive: 1, neutral: 299, negative: 0, unknown: 0 } })];
  const html = await render('/src/pulse/HomeProjects.jsx', 'default', { rows, canCreate: true, now });
  const tone = card => card.slice(card.indexOf('hmp-tone'));
  const waiting = tone(cardOf(html, 'Menunggu analisis'));
  assert.match(waiting, /aria-label="Sentimen 7 hari: Belum dianalisis 1\.240 posting"/);
  assert.doesNotMatch(text(waiting), /%|NaN/);
  assert.match(cardOf(html, 'Satu dari tiga ratus'), /aria-label="Sentimen 7 hari: Positif &lt;1%, Netral 100%"/, 'one post of 300 is a sliver, not 0%');
});

test('a project card shows the last day against the day before, a week as a line, and how the week felt', async () => {
  const html = await render('/src/pulse/HomeProjects.jsx', 'default', { rows: projects, canCreate: true, now });
  const first = cardOf(html, 'Isu Pengunduran Diri Gibran');
  assert.match(first, /<a[^>]*href="\/pulse\/overview\?topic=t1"[^>]*>Isu Pengunduran Diri Gibran<\/a>/);
  assert.match(text(first), /Posting 24 jam 412 \+18% dari 24 jam sebelumnya/);
  assert.match(first, /class="pu-sparkline"/);
  assert.match(text(first), /Posting per 24 jam, tujuh hari terakhir: 90, 209, 1\.910, 1\.368, 1\.242, 349, 412/, 'the line has the same content in words');
  assert.match(first, /class="pu-distribution-bar"[^>]*role="img"[^>]*aria-label="Sentimen 7 hari: Positif 6%, Netral 59%, Negatif 35%"/);
  assert.match(text(first), /Sentimen 7 hari Positif 6% Netral 59% Negatif 35%/);
  assert.match(text(first), /3 alert baru/);
  assert.match(text(first), /6\.694 posting, terakhir terkumpul 07\.13 WIB/);
  const second = cardOf(html, 'Isu Penyadapan Presiden');
  assert.match(text(second), /Posting 24 jam 96 -22% dari 24 jam sebelumnya/);
  assert.match(second, /data-hatch=""/, 'posts without a reading are hatched, never a flat grey');
  // tone_share_v1: a share is of the analysed posts and "belum dianalisis" is a count (was Positif 25%, Belum dianalisis 75%).
  assert.match(text(second), /Belum dianalisis 3 posting/);
  assert.match(second, /aria-label="Sentimen 7 hari: Positif 100%, Belum dianalisis 3 posting"/);
  assert.doesNotMatch(text(second), /alert baru/, 'no alert, no tag');
  assert.match(text(cardOf(html, 'cawapres')), /Posting 24 jam 50 0% dari 24 jam sebelumnya/);
  assert.match(text(cardOf(html, 'cawapres')), /belum pernah terkumpul/);
  assert.match(text(cardOf(html, 'Baru hari ini')), /Posting 24 jam 7 belum ada pada 24 jam sebelumnya/);
  const quiet = cardOf(html, 'Sepi');
  assert.match(text(quiet), /Posting 24 jam 0/);
  assert.match(text(quiet), /Belum ada posting dalam 7 hari\./);
  assert.doesNotMatch(quiet, /pu-distribution-bar/);
  assert.match(text(html), /Project aktif/);
  assert.match(html, /<a[^>]*href="\/pulse\/search"[^>]*>(?:<svg[\s\S]*?<\/svg>)?Project baru<\/a>/);
  assert.equal((html.match(/class="lay-4"/g) || []).length, 5, 'one third of the row a card, so never more than three in a row');
});

test('paused projects sit under their own disclosure and an empty installation offers the first project', async () => {
  const html = await render('/src/pulse/HomeProjects.jsx', 'default', { rows: projects, canCreate: false, now });
  const paused = html.match(/<details[^>]*class="hmp-paused"[\s\S]*?<\/details>/)[0];
  assert.match(paused, /<summary[^>]*>Dijeda \(1\)<\/summary>/);
  assert.match(paused, /<a[^>]*href="\/pulse\/overview\?topic=t6"[^>]*>Arsip banjir<\/a>/);
  assert.doesNotMatch(html.replace(paused, ''), /Arsip banjir/);
  assert.doesNotMatch(html, /Project baru/, 'a viewer cannot create projects');
  const empty = await render('/src/pulse/HomeProjects.jsx', 'default', { rows: [], canCreate: true, now });
  assert.match(text(empty), /Belum ada project\./);
  assert.match(empty, /<a[^>]*href="\/pulse\/search"[^>]*>Buat project<\/a>/);
  assert.doesNotMatch(await render('/src/pulse/HomeProjects.jsx', 'default', { rows: [], canCreate: false, now }), /Buat project</);
  assert.match(text(await render('/src/pulse/HomeProjects.jsx', 'default', { rows: null, canCreate: true, now })), /Memuat project/);
});

test('the page follows the product grid: the answer, the figures, map with its ranking, list with its composition, a top ten per platform, projects', async () => {
  const html = await view({});
  assert.match(html, /<h1[^>]*>Beranda<\/h1>/);
  const marks = ['Isu yang ramai di Indonesia</h2>', 'class="pu-stat-grid', 'Peta sebaran isu</h2>', 'Provinsi paling ramai</h2>', 'Isu teratas</h2>', 'Komposisi isu</h2>', 'aria-label="Isu teratas per platform"', 'id="hm-projects"'];
  const order = marks.map(mark => html.indexOf(mark));
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), `in this order: ${order}`);
  assert.equal((html.match(/class="lay-8"/g) || []).length, 2);
  assert.match(html, /<a[^>]*href="#hm-projects"[^>]*>Project aktif<\/a>/, 'a way to jump past the radar');
  assert.match(text(html), /Peta memakai pencarian populer per provinsi dan tempat yang disebut berita\. X, TikTok, dan Instagram tidak memberi lokasi\./);
});

test('the rankings beside the map and the list are links that set the same choices as the switches', async () => {
  const html = await view({ filters: { ...none, category: 'politik' } });
  assert.match(html, /<a[^>]*href="\/pulse\?cat=politik&amp;prov=ID-JI"[^>]*>(?:(?!<\/a>)[\s\S])*Jawa Timur/, 'a province keeps the category that is chosen');
  assert.match(html, /<a[^>]*href="\/pulse"[^>]*>(?:(?!<\/a>)[\s\S])*Politik/, 'the chosen category is dropped by its own row');
  assert.match(html, /<a[^>]*href="\/pulse\?cat=olahraga"[^>]*>(?:(?!<\/a>)[\s\S])*Olahraga/);
  assert.match(html, /<a[^>]*href="\/pulse\?cat=politik&amp;pf=news"[^>]*>(?:(?!<\/a>)[\s\S])*Berita/);
  assert.match(text(html), /Jejak platform/);
});

test('the map shows where the category is loud whatever platform orders the list, and a chosen issue is drawn alone', async () => {
  const byVideo = await view({ filters: { ...none, platform: 'youtube' } });
  assert.match(byVideo, /aria-label="Jawa Timur: 2 isu ramai"/, 'the map does not follow the platform switch');
  const chosen = await view({ filters: { ...none, province: 'ID-JI' }, selectedKey: 'k1' });
  assert.match(text(chosen), /Sebaran isu: Pengunduran diri Wapres/);
  assert.match(text(chosen), /Isu yang ramai di Jawa Timur/);
});

test('with no list there is no empty map or strip, and a failed first load says so', async () => {
  const waiting = await view({ radar: { ...radar, state: 'empty', issues: [], updated_at: null, brief: null, last_attempt: null } });
  assert.doesNotMatch(waiting, /class="rdm"|pu-stat-grid|Isu teratas<\/h2>/);
  assert.match(text(waiting), /Radar belum pernah berjalan/);
  assert.match(waiting, /id="hm-projects"/);
  const raw = await view({ radar: { ...radar, state: 'raw', issues: [], brief: null, raw: { news: [{ title: 'Judul', url: null, source: 'Kompas', figure: 1 }], youtube: [], search: [] } } });
  assert.match(raw, /Daftar mentah per platform/);
  assert.doesNotMatch(raw, /class="rdm"|Komposisi isu/);
  const failed = await view({ radar: null, projects: null, error: 'Tidak dapat terhubung ke server PULSE.', onRetry() {} });
  assert.match(text(failed), /Tidak dapat terhubung ke server PULSE\./);
  assert.match(failed, /<button[^>]*>Coba lagi<\/button>/);
});

test('/pulse is Beranda, an old link with a project goes to Ikhtisar, and the sidebar marks the right page', () => {
  assert.equal(pageMeta.home.title, 'Beranda');
  assert.ok(pageMeta.home.tagline.split(' ').length <= 5 && pageMeta.home.guide.length === 2);
  assert.ok(!pageOrder.includes('home'), 'Beranda is above the project pages, not one of them');
  const app = readFileSync(new URL('./PulseApp.jsx', import.meta.url), 'utf8');
  assert.match(app, /<Route path="\/pulse" element=\{new URLSearchParams\(location\.search\)\.has\('topic'\) \? <Navigate to=\{`\/pulse\/overview\$\{location\.search\}`\} replace ?\/> : <Home /);
  assert.match(app, /<Link to="\/pulse" aria-current=\{location\.pathname === '\/pulse' \? 'page' : undefined\}>\{createElement\(pageMeta\.home\.icon/);
  assert.doesNotMatch(app, /id === 'overview' && location\.pathname === '\/pulse'/, 'Ikhtisar is current on its own address only');
  assert.match(app, /location\.pathname !== '\/pulse' && location\.pathname !== '\/pulse\/search' && !quickDestination && <ProjectBar/, 'nothing on Beranda is scoped to one project');
  assert.match(app, /location\.pathname === '\/pulse' \? 'home'/);
  assert.match(app, /const navigationSearch = location\.pathname === '\/pulse' \? projectSearch : /, 'from Beranda the sidebar leads back into the project that was open');
});

test('the radar has its own switch in Monitor, asked about before it is turned on', () => {
  assert.deepEqual(monitorExtras.find(extra => extra.channel === 'radar'), { channel: 'radar', label: 'Radar isu Indonesia', paid: true });
  assert.deepEqual(monitorExtras.find(extra => extra.channel === 'radar_social'), { channel: 'radar_social', label: 'Radar: X, TikTok, Instagram', paid: true }, 'the paid steps have their own switch');
});

test('Beranda opens on every issue: a category or platform chosen on an earlier visit is never brought back, and the old saved choice is dropped', () => {
  const source = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage\.setItem|localStorage\.getItem/, 'no choice is saved or read');
  assert.match(source, /localStorage\.removeItem\(STORE\)/, 'a "Sosial" left from before is removed');
});
