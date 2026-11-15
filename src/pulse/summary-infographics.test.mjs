import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const facts = { totals: { posts: 1329, accounts: 400, interactions: 9000, comments: 10, days: 5 }, sentiment: { positive: 16, neutral: 757, negative: 267, unknown: 289, analysed: 1040 },
  platforms: [{ platform: 'x', posts: 900 }, { platform: 'tiktok', posts: 429 }], days: [{ date: '2026-11-10', posts: 10 }, { date: '2026-11-12', posts: 90 }], peak_day: { date: '2026-11-12', posts: 90 },
  accounts: [{ author: 'detikNews', platform: 'x', posts: 3, interactions: 500 }], emotions: [{ label: 'anger', posts: 40 }], quotes: [],
  triggers: [{ code: 'N1', author: 'akun_a', platform: 'x', interactions: 120, text: 'Teks', reason: 'Mengkritik DPR' }] };

test('overview and trigger graphics come from counted facts', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { Overview, conclusion, default: Graphic } = await vite.ssrLoadModule('/src/pulse/SummaryInfographics.jsx');
    assert.match(conclusion(facts), /1\.329 posting dari 400 akun dalam 5 hari · teramai 12 Nov \(90 posting\) · sentimen dominan netral 73%/);
    const overview = renderToStaticMarkup(React.createElement(Overview, { facts }));
    assert.match(overview, /Platform/); assert.match(overview, /detikNews/); assert.match(overview, /anger/);
    assert.match(renderToStaticMarkup(React.createElement(Graphic, { kind: 'anger', facts })), /Mengkritik DPR/);
    assert.equal(renderToStaticMarkup(React.createElement(Overview, { facts: null })), '');
  } finally { await vite.close(); }
});

test('the interactions figure says over how many posts it is known, and unknown is a dash', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Graphic } = await vite.ssrLoadModule('/src/pulse/SummaryInfographics.jsx');
    const figures = totals => renderToStaticMarkup(React.createElement(Graphic, { kind: 'topic', facts: { ...facts, totals: { ...facts.totals, ...totals } } }));
    assert.match(figures({ interaction_posts: 1100 }), /<strong>9\.000<\/strong><span>interaksi dari 1\.100 posting<\/span>/, 'known on fewer posts than the set holds');
    assert.match(figures({ interaction_posts: 1329 }), /<strong>9\.000<\/strong><span>interaksi<\/span>/, 'every post reports: nothing to add');
    assert.match(figures({ interactions: null, interaction_posts: 0 }), /<strong>—<\/strong><span>interaksi<\/span>/);
  } finally { await vite.close(); }
});
