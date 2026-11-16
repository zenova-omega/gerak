// "Lonjakan" is the word for what the product's one spike rule found (spike_v1, on the server). Other things that
// stand out have their own names: the day with the most posts is the busiest day ("hari teramai"), and the post whose
// interactions grew fastest is the fastest-growing post ("posting tumbuh tercepat"). Neither is called a "lonjakan"
// or a "puncak", because every period has a busiest day and a fastest post whether or not anything jumped.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = () => createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent' });
const text = html => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('on Ikhtisar the day with the most posts is the busiest day, and the chart footer speaks of spikes', async () => {
  const server = await vite();
  try {
    const { default: Overview } = await server.ssrLoadModule('/src/pulse/ProjectOverview.jsx');
    const at = (id, day) => ({ id, platform: 'x', author: 'akun_' + id, text: 'Isi ' + id, published_at: `2026-11-${day}T05:00:00Z`, metrics: {} });
    const posts = [at('a', '10'), at('b', '10'), at('c', '10'), at('d', '11')];
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse/overview?topic=t'] },
      React.createElement(Overview, { data: { posts }, topic: { id: 't', label: 'Isu' }, period: {} })));
    const highlights = text(html.match(/<ul class="po-signals"[\s\S]*?<\/ul>/)[0]);
    assert.match(highlights, /Hari teramai 10 Nov 3 posting · 75% dari cakupan/);
    assert.doesNotMatch(html, /[Pp]uncak/, 'a busiest day is not a peak in the sense of the chart');
    // No answer from the server here, so nothing on the page is called a spike.
    assert.equal((html.match(/[Ll]onjakan/g) || []).length, 0);
  } finally { await server.close(); }
});

test('in the AI summary the fastest-growing post and the busiest day are named for what they are', async () => {
  const server = await vite();
  try {
    const { default: Graphic, conclusion } = await server.ssrLoadModule('/src/pulse/SummaryInfographics.jsx');
    const facts = { totals: { posts: 1329, accounts: 400, interactions: 9000, comments: 10, days: 5 }, sentiment: { positive: 16, neutral: 757, negative: 267, unknown: 289, analysed: 1040 },
      days: [{ date: '2026-11-10', posts: 10 }, { date: '2026-11-12', posts: 90 }], peak_day: { date: '2026-11-12', posts: 90 },
      spikes: { rule: 'spike_v1', days: [] },
      surge: { code: 'P1', author: 'kabar.viral', platform: 'tiktok', added: 12400, rate_per_hour: 1240.4, from: '2026-11-12 09:00', to: '2026-11-12 19:00', interactions: 20000 } };
    const growing = text(renderToStaticMarkup(React.createElement(Graphic, { kind: 'viral', facts })));
    assert.equal(growing, '+12.400 interaksi di antara dua pengamatan 1.240/jam posting tumbuh tercepat · kabar.viral');
    const nameless = text(renderToStaticMarkup(React.createElement(Graphic, { kind: 'viral', facts: { ...facts, surge: { ...facts.surge, author: null } } })));
    assert.match(nameless, /1\.240\/jam posting tumbuh tercepat$/);
    // No growth was observed between two readings: the block falls back to the busiest day and says that it is one.
    const busiest = text(renderToStaticMarkup(React.createElement(Graphic, { kind: 'viral', facts: { ...facts, surge: null } })));
    assert.equal(busiest, '90 posting pada 12 Nov, hari teramai');
    assert.match(text(renderToStaticMarkup(React.createElement(Graphic, { kind: 'timeline', facts }))), /10 Nov sampai 12 Nov · teramai 12 Nov \(90 posting\)/);
    assert.match(conclusion(facts), /teramai 12 Nov \(90 posting\)/);
    for (const kind of ['viral', 'timeline', 'overview']) assert.doesNotMatch(renderToStaticMarkup(React.createElement(Graphic, { kind, facts })), /lonjakan|puncak/i);
    // A summary stored before the facts carried spike days still draws.
    const { spikes: _spikes, ...older } = facts;
    assert.match(renderToStaticMarkup(React.createElement(Graphic, { kind: 'viral', facts: older })), /posting tumbuh tercepat/);
  } finally { await server.close(); }
});

test('the report, the platform lines and the growth panel use the same names', async () => {
  const server = await vite();
  try {
    // The printed report marks the day with the most posts on its trend page.
    const { default: ReportPages } = await server.ssrLoadModule('/src/pulse/ReportPages.jsx');
    const { buildReport } = await server.ssrLoadModule('/src/lib/pulseReport.js');
    const lib = await server.ssrLoadModule('/src/lib/pulseReportPages.js');
    const posts = [1, 2, 2, 2, 3].map((day, index) => ({ id: 'p' + index, author: 'akun ' + index, platform: 'x', text: 'Teks ' + index, published_at: `2026-11-0${day}T02:00:00Z`, metrics: { likes: 10 } }));
    const report = buildReport({ posts }, { id: 't', label: 'Isu Uji' }, {}, '2026-11-14T03:00:00Z', null, { loaded: true, error: false, response: null });
    const pages = lib.reportPages(lib.resolveSections([]), { topPosts: report.topPosts });
    const printed = renderToStaticMarkup(React.createElement(ReportPages, { report, pages, data: lib.reportData(report), summary: null, brand: { logo: null, accent: null, organisation: '', description: '' } }));
    assert.match(printed, /<text class="rp-peak"[^>]*>Teramai: 3 posting, 2 Nov<\/text>/);
    // "Lonjakan" heads only the list of what spike_v1 found (the server's answer); nothing else on the report uses it.
    const outsideSpikes = printed.replace(/<section class="rp-block"><h3>Lonjakan<\/h3>[\s\S]*?<\/section>/g, '');
    assert.match(printed, /<h3>Lonjakan<\/h3>/);
    assert.doesNotMatch(outsideSpikes, /[Pp]uncak|[Ll]onjakan/);

    // The panel of interaction growth speaks of growth.
    const { default: GrowthEvidence } = await server.ssrLoadModule('/src/pulse/GrowthEvidence.jsx');
    const growth = renderToStaticMarkup(React.createElement(GrowthEvidence, { data: { posts: [] }, posts: [], loaded: true }));
    assert.doesNotMatch(growth, /lonjakan/i);
  } finally { await server.close(); }
});
