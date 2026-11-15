// Every chart's hover card is the same floating card: one frame, one head, one kind of row.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let server;
before(async () => { server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' }); });
after(async () => { await server?.close(); });
const load = path => server.ssrLoadModule(path);
const html = element => renderToStaticMarkup(React.createElement(MemoryRouter, null, element));
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const ruleOf = (css, selector) => css.match(new RegExp('(?:^|[}\\n])\\s*' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'))?.[1] ?? null;

test('the frame is written once: line, radius, surface and shadow of a floating card', () => {
  const rule = ruleOf(read('./ds/analytics-kit.css'), 'div.pu-hover-card');
  assert.ok(rule, 'div.pu-hover-card is defined');
  for (const part of ['border: 1px solid var(--ps-control-line)', 'border-radius: var(--ps-surface-radius', 'background: var(--ps-panel)', 'box-shadow: var(--ps-shadow-overlay)', 'padding: 12px 14px', 'font-size: .75rem'])
    assert.ok(rule.includes(part), `the frame sets ${part}`);
});

test('no chart draws a frame of its own', () => {
  for (const [file, selector] of [['./emotion-analytics.css', '.pea-tip'], ['./ds/narrative-panel.css', '.np-tip'], ['./ds/analytics-kit.css', '.pu-chart-tooltip']]) {
    const rule = ruleOf(read(file), selector);
    assert.ok(rule !== null, `${selector} still has its own rule for what is its own`);
    assert.doesNotMatch(rule, /(^|;)\s*(border|border-radius|background|box-shadow|padding|font-size)\s*:/, `${selector} leaves the frame to .pu-hover-card`);
  }
});

test('sentiment: the card is built from the shared frame, head, bar and rows', async () => {
  const { PulseChartTooltip } = await load('/src/components/ui/PulseAnalytics.jsx');
  const markup = html(React.createElement(PulseChartTooltip, { active: true, label: '10 Nov', total: true, percent: true,
    payload: [{ dataKey: 'positive', name: 'Positif', value: 1, color: 'green' }, { dataKey: 'negative', name: 'Negatif', value: 3, color: 'red' }] }));
  assert.match(markup, /^<div class="pu-hover-card pu-chart-tooltip">/);
  assert.match(markup, /<header class="pu-hover-head"><strong>10 Nov<\/strong><span>Total <b>4<\/b><\/span><\/header>/);
  assert.match(markup, /<span class="pu-hover-bar" aria-hidden="true">/);
  assert.match(markup, /<ul class="pu-hover-rows">/);
});

test('emotion: the same card, with the day and its count in the head and the emotions as rows', async () => {
  const { DayTip } = await load('/src/pulse/EmotionAnalytics.jsx');
  const markup = html(React.createElement(DayTip, { active: true, payload: [{ payload: { date: '2026-11-10', anger: 5, joy: 2, fear: 0, none: 3 } }] }));
  assert.match(markup, /^<div class="pu-hover-card pea-tip">/);
  assert.match(markup, /<header class="pu-hover-head"><strong>10 Nov<\/strong><span><b>7<\/b> posting beremosi<\/span><\/header>/);
  const bar = markup.match(/<span class="pu-hover-bar" aria-hidden="true">([\s\S]*?)<\/span>/)?.[1] || '';
  assert.equal((bar.match(/<i /g) || []).length, 2, 'one segment per emotion that was stated that day');
  assert.match(bar, /flex-grow:5;--swatch:var\(--emotion-anger\)/);
  const rows = markup.match(/<ul class="pu-hover-rows">([\s\S]*?)<\/ul>/)?.[1] || '';
  assert.deepEqual([...rows.matchAll(/<\/span>(Marah|Senang|Takut)<b>(\d+)<\/b>/g)].map(found => [found[1], found[2]]), [['Marah', '5'], ['Senang', '2']], 'largest first, nothing for an emotion nobody stated');
  assert.match(markup, /<p class="pu-hover-foot">Tanpa emosi jelas<b>3<\/b><\/p>/);
});

test('emotion: a day where every post states an emotion has no foot', async () => {
  const { DayTip } = await load('/src/pulse/EmotionAnalytics.jsx');
  assert.doesNotMatch(html(React.createElement(DayTip, { active: true, payload: [{ payload: { date: '2026-11-10', anger: 1, none: 0 } }] })), /pu-hover-foot/);
  assert.equal(html(React.createElement(DayTip, { active: false, payload: [] })), '');
});

const bubble = more => ({ rank: 2, title: 'Wapres mundur', count: 1224, accounts: 310, net: -46.4, interactions: 2400000, ...more });

test('narrative: the same card, the title on top and one figure per row', async () => {
  const { NarrativeTip } = await load('/src/pulse/NarrativePanel.jsx');
  const markup = html(React.createElement(NarrativeTip, { active: true, payload: [{ payload: bubble() }] }));
  assert.match(markup, /^<div class="pu-hover-card np-tip">/);
  assert.match(markup, /<p class="pu-hover-title">2\. Wapres mundur<\/p>/);
  const rows = markup.match(/<ul class="pu-hover-rows">([\s\S]*?)<\/ul>/)?.[1] || '';
  assert.match(rows, /<li>Posting<b>1\.224<\/b><\/li>/);
  assert.match(rows, /<li>Akun<b>310<\/b><\/li>/);
  assert.match(rows, /<li>Sentimen bersih<small>condong negatif<\/small><b>-46<\/b><\/li>/);
  assert.match(rows, /<li>Interaksi<b>2\.400\.000<\/b><\/li>/);
});

test('narrative: interactions the sources did not report are said so, not shown as zero', async () => {
  const { NarrativeTip } = await load('/src/pulse/NarrativePanel.jsx');
  const markup = html(React.createElement(NarrativeTip, { active: true, payload: [{ payload: bubble({ interactions: null, net: 3, title: 'x'.repeat(120) }) }] }));
  assert.match(markup, /<li>Interaksi<em>tidak dilaporkan sumber<\/em><\/li>/);
  assert.match(markup, /<li>Sentimen bersih<small>campuran<\/small><b>\+3<\/b><\/li>/);
  assert.match(markup, /<p class="pu-hover-title">2\. x{90}…<\/p>/);
});

test('trend: the shared tooltip of the line charts takes the same frame and names its parts', () => {
  const source = read('../components/ui/shadcn/chart.jsx');
  const content = source.slice(source.indexOf('const ChartTooltipContent'), source.indexOf('ChartTooltipContent.displayName'));
  assert.match(content, /"pu-hover-card /, 'the frame');
  assert.doesNotMatch(content, /rounded-lg|shadow-xl|bg-background|border-border|px-2\.5|py-1\.5/, 'no second frame from utility classes');
  assert.equal((content.match(/"pu-hover-label"/g) || []).length, 2, 'both label branches');
  assert.match(content, /className="pu-hover-name"/);
  assert.match(content, /className="pu-hover-value"/);
  const css = read('./ds/analytics-kit.css');
  for (const selector of ['.pu-hover-label', '.pu-hover-name', '.pu-hover-value']) assert.ok(css.includes(selector + ' {') || css.includes(selector + ','), `${selector} is styled`);
});
