// Page rhythm: panels set straight in a page's main column are spaced like sibling cards, the Jaringan analysis
// opens with its own heading that says what its figures are counted from, and the spread list reads one platform a row.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const css = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
const rule = selector => css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'))?.[1] ?? null;

test('a panel that follows anything in the main column keeps the gap between sibling cards', () => {
  const body = rule('.pulse-standalone .pulse-main > * + :is(.pu-analytics-panel, #network-spread, .pulse-evaluation-disclosure)');
  assert.ok(body, 'the spacing rule exists');
  assert.match(body, /margin-top:\s*var\(--ps-surface-gap\)/);
});

test('the spread list reads one platform a row on a wide panel, and stacks on a phone', () => {
  const row = rule('.pulse-standalone .pu-analytics-panel .po-spread li');
  assert.ok(row, 'the row rule exists');
  assert.match(row, /grid-template-areas:\s*"icon name first seen action"/);
  assert.match(css, /@media \(max-width: 700px\) \{[^@]*\.pu-analytics-panel \.po-spread li \{[^}]*grid-template-areas:\s*"icon name action" "icon first first" "icon seen seen"/);
});

let server;
before(async () => { server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' }); });
after(async () => { await server?.close(); });

const data = { analyzed_posts: 1000, total_posts: 6750, accounts: [], narratives: [], nodes: [], edges: [], signals: [], origins: [], timeline: [] };

test('the Jaringan analysis opens with a heading that says its figures come from the analysed sample', async () => {
  const { default: NetworkAnalysis } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkAnalysis.jsx');
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(NetworkAnalysis, { data, posts: [] })));
  const head = html.match(/<header class="pn-section-head">([\s\S]*?)<\/header>/)?.[1] || '';
  assert.match(head, /<h2[^>]*>Hubungan antar akun<\/h2>/);
  assert.match(head, /1\.000 dari 6\.750 posting dianalisis/);
  assert.ok(html.indexOf('pn-section-head') < html.indexOf('Ringkasan analisis jaringan'), 'the heading comes before the figures');
});

test('when every post was analysed the heading does not claim a sample', async () => {
  const { default: NetworkAnalysis } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkAnalysis.jsx');
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(NetworkAnalysis, { data: { ...data, analyzed_posts: 640, total_posts: 640 }, posts: [] })));
  const head = html.match(/<header class="pn-section-head">([\s\S]*?)<\/header>/)?.[1] || '';
  assert.doesNotMatch(head, /dianalisis/);
});
