// The report's figures are the product's figures: the KPI of Ikhtisar, the spikes of the trend chart, how concentrated
// the speaking is and how complete the data is, each from the one function every page uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = () => createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
const sheets = html => html.match(/<article class="rp-page[\s\S]*?<\/article>/g) || [];
const sheet = (html, section) => sheets(html).find(page => page.includes(`data-section="${section}"`)) || '';
const source = name => readFileSync(new URL(name, import.meta.url), 'utf8');

const week = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'];
const period = { from: '2026-10-29', to: '2026-11-04' };
const post = (id, day, { author = 'a', platform = 'x', tone, likes, text } = {}) => ({
  id, author, platform, text: text ?? `posting ${id}`, published_at: `${day}T03:00:00Z`,
  metrics: { ...(tone ? { sentiment: { label: tone } } : {}), ...(likes == null ? {} : { likes }) },
});
const now = Array.from({ length: 10 }, (_, index) => post(`n${index}`, week[index % 7], {
  author: ['a', 'b', 'c', 'd', 'e'][index % 5], tone: ['positive', 'positive', 'negative', 'neutral', undefined][index % 5],
  likes: index < 4 ? 10 : undefined, text: index === 9 ? 'posting n8' : undefined,
}));
const before = Array.from({ length: 8 }, (_, index) => post(`b${index}`, '2026-10-25'));

async function draw(server, { posts = now, previous = before, pagesFor = null, extra = {} } = {}) {
  const { default: ReportPages } = await server.ssrLoadModule('/src/pulse/ReportPages.jsx');
  const { buildReport } = await server.ssrLoadModule('/src/lib/pulseReport.js');
  const { overviewEvidence } = await server.ssrLoadModule('/src/lib/pulseOverview.js');
  const { projectKpis } = await server.ssrLoadModule('/src/lib/pulseKpis.js');
  const lib = await server.ssrLoadModule('/src/lib/pulseReportPages.js');
  const report = buildReport({ posts }, { id: 't', label: 'Isu Uji' }, period, '2026-11-05T03:00:00Z', null, { loaded: true, error: false, response: null });
  const kpis = projectKpis(overviewEvidence(report.posts, { previousPosts: previous }), { period });
  const pages = lib.reportPages(pagesFor ? pagesFor(lib) : lib.resolveSections([]), { topPosts: report.topPosts });
  const html = renderToStaticMarkup(React.createElement(ReportPages, { report, pages, data: lib.reportData(report), kpis, brand: {}, ...extra }));
  return { html, kpis, report, lib };
}

test('the executive summary prints the six figures of Ikhtisar, with its comparison and its words', async () => {
  const server = await vite();
  try {
    const { html, kpis } = await draw(server);
    const summary = sheet(html, 'summary');
    assert.match(summary, /<dl class="rp-kpis" aria-label="Angka utama">/);
    assert.deepEqual([...summary.matchAll(/<div data-kpi="(\w+)"><dt>([^<]*)<\/dt>/g)].map(match => [match[1], match[2]]), [
      ['mentions', 'Penyebutan'], ['unique', 'Konten unik'], ['accounts', 'Akun unik'],
      ['interactions', 'Interaksi'], ['net', 'Sentimen bersih'], ['concentration', 'Konsentrasi akun'],
    ]);
    assert.match(summary, /<dt>Penyebutan<\/dt><dd class="rp-kpi-value"><strong>10<\/strong><span class="rp-kpi-delta" data-direction="up" data-intent="neutral">\+25%<\/span><\/dd><dd class="rp-kpi-compare">vs 22–28 Okt 2026<\/dd>/);
    assert.match(summary, /<dt>Konten unik<\/dt><dd class="rp-kpi-value"><strong>9<\/strong><\/dd><dd class="rp-kpi-share"><span class="rp-meter" aria-hidden="true"><i style="width:90%"><\/i><\/span><span>90% teks berbeda<\/span><\/dd><dd class="rp-kpi-note">1 salinan teks identik<\/dd>/);
    assert.match(summary, /<dt>Interaksi<\/dt><dd class="rp-kpi-value"><strong>40<\/strong><\/dd><dd class="rp-kpi-share">[\s\S]*?<span>40% posting bermetrik<\/span>/);
    for (const kpi of kpis) {
      const value = typeof kpi.value === 'string' ? kpi.value : String(kpi.value);
      assert.ok(summary.includes(`<strong>${value}</strong>`), `${kpi.label} prints ${value}`);
      if (kpi.note) assert.ok(summary.includes(kpi.note.replace('…', '…')), `${kpi.label} keeps its note`);
    }
    assert.doesNotMatch(summary, /Komentar dianalisis|Akun dan sumber/, 'the old four figures are gone');
  } finally { await server.close(); }
});

test('a figure without its comparison says why, and an unknown figure reads "—"', async () => {
  const server = await vite();
  try {
    const { html } = await draw(server, { posts: [post('only', '2026-11-01')], previous: null });
    const summary = sheet(html, 'summary');
    assert.match(summary, /<dt>Penyebutan<\/dt><dd class="rp-kpi-value"><strong>1<\/strong><\/dd><dd class="rp-kpi-note">Memuat perbandingan…<\/dd>/);
    assert.match(summary, /<dt>Interaksi<\/dt><dd class="rp-kpi-value"><strong>—<\/strong><\/dd>/);
    assert.match(summary, /<dt>Sentimen bersih<\/dt><dd class="rp-kpi-value"><strong>—<\/strong><\/dd><dd class="rp-kpi-note">Belum ada posting yang dianalisis<\/dd>/);
  } finally { await server.close(); }
});

test('Ikhtisar and the report take their six figures from the one function', () => {
  for (const name of ['./ProjectOverview.jsx', './ProjectReport.jsx']) {
    assert.match(source(name), /projectKpis\(/, `${name} counts with projectKpis`);
    assert.doesNotMatch(source(name), /netSentiment\(|accountConcentration\(|recentChange\(/, `${name} keeps no copy of a KPI rule`);
  }
  assert.match(source('./ProjectReport.jsx'), /usePreviousPosts\(/, 'the report loads the period before the way the pages do');
});

const spikeDays = [...Array.from({ length: 7 }, (_, index) => Array.from({ length: index === 4 ? 12 : 2 }, (_, n) => post(`s${index}-${n}`, week[index], { tone: 'neutral' }))).flat()];

test('the trend page marks the spikes the server found (spike_v1) and lists them in the words of the trend chart', async () => {
  const server = await vite();
  try {
    const spikes = { status: 'answered', posts: [{ key: '2026-11-02', value: 12, usual: 2, times: 6 }], interactions: [] };
    const { html } = await draw(server, { posts: spikeDays, extra: { spikes } });
    const trend = sheet(html, 'trend');
    assert.equal((trend.match(/class="rp-spike-mark"/g) || []).length, 1, 'one mark over the column of the spike');
    assert.match(trend, /<h3>Lonjakan<\/h3>/);
    assert.match(trend, /<tr><th scope="row">2 Nov<\/th><td>Posting<\/td><td>12 posting, 6× hari biasa pada rentang ini\.<\/td><\/tr>/);
    assert.match(trend, /aria-label="Grafik batang[^"]*1 lonjakan ditandai\./);
  } finally { await server.close(); }
});

test('without an answer the trend page says the spikes are not checked, and marks nothing', async () => {
  const server = await vite();
  try {
    const failed = sheet((await draw(server, { posts: spikeDays, extra: { spikes: { status: 'failed', posts: [], interactions: [] } } })).html, 'trend');
    assert.match(failed, /Lonjakan belum dapat diperiksa\./);
    assert.doesNotMatch(failed, /rp-spike-mark/);
    const none = sheet((await draw(server, { posts: spikeDays, extra: { spikes: { status: 'answered', posts: [], interactions: [] } } })).html, 'trend');
    assert.match(none, /Tidak ada lonjakan pada periode ini\./);
    const waiting = sheet((await draw(server, { posts: spikeDays })).html, 'trend');
    assert.match(waiting, /Lonjakan sedang diperiksa…/);
  } finally { await server.close(); }
});

test('the report asks about the spikes of the very series it draws, through the hook the trend chart uses', () => {
  assert.match(source('./ProjectReport.jsx'), /useTrendSpikes\(/);
  assert.match(source('../lib/pulseReportPages.js'), /trendSeries\(/, 'the bars are trendSeries buckets');
  assert.match(source('./ReportPages.jsx'), /spikeLines\(/, 'the words of a spike are the trend chart\'s');
  assert.match(source('./useTrendSpikes.js'), /status/, 'the hook says whether the server has answered');
});

test('the sources page says how concentrated the speaking is, in the words of Akun & sumber (concentration_v1)', async () => {
  const server = await vite();
  try {
    const sources = sheet((await draw(server)).html, 'sources');
    assert.match(sources, /<h3>Konsentrasi akun<\/h3>/);
    assert.match(sources, /<strong>60%<\/strong> posting berasal dari 3 akun teratas, dari 5 akun\./);
    assert.match(sources, /4 dari 5 akun \(80%\) menulis 80% posting\./);
  } finally { await server.close(); }
});

test('the method page states how complete the data is by coverage_v1, the reading behind the project bar badge', async () => {
  const server = await vite();
  try {
    const method = sheet((await draw(server)).html, 'method');
    // 8 of 10 analysed, interactions known on 4, every post has a clock: the lowest share sets the level.
    assert.match(method, /<p class="rp-coverage-says"><b>Terbatas<\/b>: interaksi diketahui pada 40% posting\.<\/p>/);
    assert.match(method, /<th scope="col">Platform<\/th><th scope="col" class="rp-num">Posting<\/th><th scope="col" class="rp-num">Sudah dianalisis<\/th><th scope="col" class="rp-num">Interaksi diketahui<\/th><th scope="col" class="rp-num">Jam terbit ada<\/th><th scope="col">Keterangan<\/th>/);
    assert.match(method, /X<\/span><\/th><td class="rp-num">10<\/td><td class="rp-num">80%<\/td><td class="rp-num">40%<\/td><td class="rp-num">100%<\/td>/);
    assert.match(method, /<th scope="row">Seluruh laporan<\/th><td class="rp-num">10<\/td><td class="rp-num">80%<\/td><td class="rp-num">40%<\/td><td class="rp-num">100%<\/td>/);
  } finally { await server.close(); }
});

const storedInsights = (scope = { posts: 10, comments: 2, from: '2026-10-29', to: '2026-11-04', platforms: null }) => ({
  created_at: '2026-11-05T02:00:00Z', scope,
  sections: [
    { title: 'Judul', kind: 'headline', paragraphs: ['Isu uji memuncak pada 2 Nov [P1].'], bullets: [] },
    { title: 'Insight', kind: 'insights', paragraphs: [], bullets: ['Akun A memimpin percakapan. Ia menulis 4 posting dengan 40 interaksi [P1][A1].', 'Nada negatif menguat. Komentar menyoroti biaya [K1].'] },
  ],
  sources: [
    { code: 'P1', author: 'Akun A', platform: 'x', published_at: '2026-11-02T03:00:00Z', text: 'Teks bukti pertama', url: 'https://x.com/a/status/1', interactions: 40, id: 'n1' },
    { code: 'A1', author: 'Akun A', platform: 'x', published_at: '2026-11-02T03:00:00Z', text: 'Teks bukti pertama', url: 'https://x.com/a/status/1', interactions: 40, id: 'n1' },
    { code: 'K1', comment: true, author: 'Warga', platform: 'x', text: 'Biayanya terlalu mahal', url: 'https://x.com/a/status/1', interactions: 7, id: 'c1' },
  ],
});
const withInsights = lib => lib.switchSection(lib.resolveSections([]), 'insights', true);

test('the AI Insights page prints the stored insight: headline, numbered points and the evidence they cite', async () => {
  const server = await vite();
  try {
    const { html } = await draw(server, { pagesFor: withInsights, extra: { insights: storedInsights() } });
    const page = sheet(html, 'insights');
    assert.match(page, /<h2>AI Insights<\/h2><p>Ditulis AI pada 5 Nov 2026, 09\.00 WIB dari 10 posting dan 2 komentar\.<\/p>/);
    assert.match(page, /<p class="rp-insight-headline">Isu uji memuncak pada 2 Nov\.<\/p>/);
    assert.equal((page.match(/<li class="rp-insight">/g) || []).length, 2);
    // The reference follows the sentence it closes, as on the AI Insights page.
    assert.match(page, /<strong>Akun A memimpin percakapan\.<\/strong> Ia menulis 4 posting dengan 40 interaksi\.<sup class="rp-ref">1<\/sup>/);
    assert.match(page, /Komentar menyoroti biaya\.<sup class="rp-ref">2<\/sup>/);
    assert.equal((page.match(/<li class="rp-evidence-row"/g) || []).length, 2, 'one post cited under two codes is one piece of evidence');
    assert.match(page, /<span class="rp-evidence-no">2<\/span>[\s\S]*<strong>Warga<\/strong><span>Komentar · X · 7 suka<\/span>/);
    assert.match(page, /x\.com\/a\/status\/1/);
    assert.doesNotMatch(page, /\[[PANKIT]\d\]/, 'no raw evidence code is printed');
    // Two references side by side read "1,2", never "12".
    const twice = sheet((await draw(server, { pagesFor: withInsights, extra: { insights: { ...storedInsights(), sections: [
      { title: 'Insight', kind: 'insights', paragraphs: [], bullets: ['Dua bukti sekaligus. Akun dan komentar [P1][K1].'] }] } } })).html, 'insights');
    assert.match(twice, /Akun dan komentar\.<sup class="rp-ref">1,2<\/sup>/);
    assert.doesNotMatch(page, /bukan untuk cakupan laporan ini/, 'written for this very period');
    assert.match(sheet(html, 'method'), /Insight ditulis AI; periksa buktinya sebelum dikutip\./);
  } finally { await server.close(); }
});

test('insights written for another period are printed with a sentence that says so', async () => {
  const server = await vite();
  try {
    const { html } = await draw(server, { pagesFor: withInsights, extra: { insights: storedInsights({ posts: 90, comments: 0, from: '2026-10-01', to: '2026-10-31', platforms: null }) } });
    assert.match(sheet(html, 'insights'), /AI Insights itu ditulis untuk periode 1–31 Okt 2026, bukan untuk cakupan laporan ini\./);
  } finally { await server.close(); }
});

test('without stored insights, or in an archive, the page says so in one sentence', async () => {
  const server = await vite();
  try {
    const none = sheet((await draw(server, { pagesFor: withInsights, extra: { insights: null } })).html, 'insights');
    assert.match(none, /<p class="rp-empty">Belum ada AI Insights tersimpan untuk cakupan ini\.<\/p>/);
    const archived = sheet((await draw(server, { pagesFor: withInsights, extra: { insights: storedInsights(), archived: true } })).html, 'insights');
    assert.match(archived, /<p class="rp-empty">AI Insights tidak disimpan dalam arsip\.<\/p>/);
    assert.doesNotMatch(archived, /rp-insight-headline/);
  } finally { await server.close(); }
});

test('the builder offers the AI texts: which summary, AI Insights, what is stored, and what writing takes', async () => {
  const server = await vite();
  try {
    const { default: ReportBuilder } = await server.ssrLoadModule('/src/pulse/ReportBuilder.jsx');
    const lib = await server.ssrLoadModule('/src/lib/pulseReportPages.js');
    const report = { period, selectedPlatforms: null };
    const sections = withInsights(lib);
    const pages = lib.reportPages(sections, { topPosts: [] });
    const builder = (payload, extra = {}) => renderToStaticMarkup(React.createElement(ReportBuilder, {
      sections, brand: { logo: null, accent: null, organisation: '', description: '' }, pages, status: 'idle', onSections() {}, onBrand() {}, onRetry() {},
      ai: { choice: null, status: lib.aiStatus(payload, { report, ...extra }), busy: '', error: '', onChoice() {}, onWrite() {} },
    }));

    const empty = builder({ available: true, summaries: {} });
    assert.match(empty, /<h3 id="rb-ai-title">Isi AI<\/h3>/);
    assert.deepEqual([...empty.matchAll(/<input type="radio" name="rb-ai-summary"(?: checked="")? value="(\w+)"/g)].map(match => match[1]), ['off', 'executive', 'brief', 'timeline']);
    assert.match(empty, /checked="" value="executive"/, 'nothing chosen: the format that would be printed');
    assert.match(empty, /Belum ada ringkasan Eksekutif\./);
    assert.match(empty, />Tulis ringkasan Eksekutif<\/button>/);
    assert.match(empty, /Belum ada AI Insights\./);
    assert.match(empty, />Tulis untuk periode laporan<\/button>/);
    assert.match(empty, /±1 menit dan memakai kredit AI/);
    assert.match(empty, /Membuka laporan tidak menulis apa pun/);
    assert.equal((empty.match(/role="switch"/g) || []).length, sections.length + 1, 'every page, and AI Insights again in its group');
    assert.doesNotMatch(empty, /grok|xai|openai|ollama|llama|gpt/i, 'no model or supplier is named');

    const stored = builder({ available: true, summaries: { executive: { created_at: '2026-11-14T02:00:00Z', scope: { posts: 40 }, sections: [{ title: 'R', paragraphs: ['Isi.'] }] }, insights: storedInsights() } });
    assert.match(stored, /Ditulis 14 Nov 2026, 09\.00 WIB · Seluruh periode project, semua platform/);
    assert.match(stored, /Ditulis 5 Nov 2026, 09\.00 WIB untuk periode laporan ini\./);
    assert.doesNotMatch(stored, /Tulis ringkasan|Tulis untuk periode/, 'what is stored is not written again from here');

    const off = builder({ available: false, summaries: {} });
    assert.match(off, /AI belum aktif di instalasi ini\./);
    assert.doesNotMatch(off, /Tulis ringkasan|Tulis untuk periode/);
    assert.match(builder({ failed: true, summaries: {} }), /Teks AI tersimpan belum dapat dimuat\./);
    const archived = builder({ available: true, summaries: {} }, { archived: true });
    assert.match(archived, /Arsip dicetak tanpa teks AI\./);
  } finally { await server.close(); }
});
