import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { colorGuide, colorGuideTokens, colorGuideMarkdown } from '../lib/pulseColorGuide.js';

const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });
const css = ['src/pulse', 'src/components/admin/pulse', 'src/components/ui'].flatMap(walk).filter(p => p.endsWith('.css'));
// Sanctioned exceptions, each with a reason in docs/PULSE-COLOR-GUIDE.md: the network canvas theme, printed report pages, forced high contrast.
const literalColourAllowed = new Set(['network-explorer.css', 'project-report.css', 'report-pages.css', 'analytics-kit.css', 'report-brand.css']);

test('every token in the colour guide is defined in the PULSE stylesheets', () => {
  const all = css.map(p => readFileSync(p, 'utf8')).join('\n');
  const missing = colorGuideTokens.filter(token => !new RegExp(`${token}\\s*:`).test(all));
  assert.deepEqual(missing, []);
  assert.equal(new Set(colorGuideTokens).size, colorGuideTokens.length, 'a token is listed twice');
  for (const group of colorGuide) assert.ok(group.meaning && group.rule && group.tokens.length, `${group.id} needs a meaning, a rule and tokens`);
});

test('PULSE CSS carries no literal colour outside the sanctioned files', () => {
  const offenders = css.filter(p => !literalColourAllowed.has(p.split('/').pop())).filter(p => /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(readFileSync(p, 'utf8').replace(/url\([^)]*\)/g, '')));
  assert.deepEqual(offenders, [], 'use a --ps-* token, or add the meaning to src/lib/pulseColorGuide.js first');
});

test('the written colour guide matches its source', () => {
  assert.equal(readFileSync('docs/PULSE-COLOR-GUIDE.md', 'utf8'), colorGuideMarkdown(), 'run: node scripts/pulse-color-guide.mjs');
});

test('PulseCard, the card grid and the filter bar render with their contracts', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { PulseCard, PulseCardGrid, PulseFilterBar, PulseFilterGroup, PulseFilterChip, PulseFilterSelect } = await server.ssrLoadModule('/src/components/ui/PulseSurface.jsx');
    const card = renderToStaticMarkup(React.createElement(PulseCard, { tone: 'warning', title: 'Antrean', description: 'Tertunda', actions: 'aksi', footer: 'kaki' }, 'isi'));
    assert.match(card, /<section[^>]*class="pu-card"[^>]*data-tone="warning"[^>]*data-pad="md"/);
    assert.match(card, /aria-labelledby="[^"]+"/);
    assert.match(card, /<h3[^>]*class="pu-card-title"[^>]*>Antrean<\/h3>/);
    assert.match(card, /pu-card-foot/);
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(PulseCard, { as: 'div' }, 'x')), /aria-labelledby/);
    assert.match(renderToStaticMarkup(React.createElement(PulseCardGrid, { min: 200 }, 'x')), /--pu-card-min:200px/);
    const bar = renderToStaticMarkup(React.createElement(PulseFilterBar, { label: 'Filter posting', activeCount: 2, onReset: () => {} },
      React.createElement(PulseFilterGroup, { label: 'Sentimen' }, React.createElement(PulseFilterChip, { active: true }, 'Positif')),
      React.createElement(PulseFilterSelect, { label: 'Urutkan', value: 'a', onChange: () => {}, options: [{ value: 'a', label: 'A' }] })));
    assert.match(bar, /role="group"[^>]*aria-label="Filter posting"/);
    assert.match(bar, /aria-pressed="true"/);
    assert.match(bar, /Hapus semua filter \(2\)/);
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(PulseFilterBar, { label: 'x', activeCount: 0, onReset: () => {} })), /Hapus semua/);
  } finally { await server.close(); }
});
