import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { MemoryRouter } from 'react-router-dom';

test('quota breakdown preserves shared cap and distinguishes manual use from queued jobs', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Breakdown } = await server.ssrLoadModule('/src/components/admin/pulse/QuotaBreakdown.jsx');
    const data={quota_day_utc:'2026-11-11',workers:[{provider:'social',used:3,daily_limit:4}],quota_breakdown:[{provider:'social',project:'Gibran',topic_id:'a',platform:'instagram',mode:'automatic',used:1},{provider:'social',project:'Penyadapan',topic_id:'b',platform:'tiktok',mode:'manual',used:1}],quota_unattributed:{social:1},quota_queue:[{project:'Gibran',topic_id:'a',source:'tiktok',status:'queued',count:1}]};
    const html=renderToStaticMarkup(React.createElement(Breakdown,{data}));
    assert.match(html,/3 \/ 4 percobaan/);
    assert.match(html,/sisa 1/);
    assert.match(html,/Gibran/); assert.match(html,/Penyadapan/);
    assert.match(html,/Instagram/); assert.match(html,/TikTok/);
    assert.match(html,/Manual IG\/TikTok/); assert.match(html,/Otomatis/);
    assert.match(html,/Belum teratribusi/); assert.match(html,/Menunggu/);
  } finally { await server.close(); }
});

test('platform picker renders independent checkboxes, branded glyphs and explicit empty selection', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Picker } = await server.ssrLoadModule('/src/components/admin/pulse/PlatformCheckboxes.jsx');
    const platforms = ['instagram','tiktok','x','youtube','news'];
    const render = value => renderToStaticMarkup(React.createElement(Picker,{platforms,value,onChange:()=>{}}));
    const markup = render(['instagram','tiktok']);
    assert.equal((markup.match(/type="checkbox"/g)||[]).length,5);
    assert.equal((markup.match(/checked=""/g)||[]).length,2);
    assert.equal((markup.match(/<svg/g)||[]).length,5);
    assert.equal((render(null).match(/checked=""/g)||[]).length,5);
    assert.equal((render([]).match(/checked=""/g)||[]).length,0);
    assert.match(markup,/>Kosongkan<\/button>/);
  } finally { await server.close(); }
});

test('analysis navigation preserves selected project and alert evidence scope', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: Navigation } = await server.ssrLoadModule('/src/pulse/AnalysisNavigation.jsx');
    const markup = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse?topic=project-a&alert=alert-a'] }, React.createElement(Navigation)));
    for (const route of ['network', 'accounts', 'posts']) assert.ok(markup.includes(`/pulse/${route}?topic=project-a&amp;alert=alert-a`));
    assert.match(markup, /aria-label="Lanjutkan analisis project"/);
    assert.doesNotMatch(markup, /<button/);
  } finally { await server.close(); }
});

test('the analytics hook sets the installation zone from every payload it receives, on every page that reads it', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: api } = await server.ssrLoadModule('/src/lib/api.js');
    const { usePulseAnalytics } = await server.ssrLoadModule('/src/hooks/usePulse.js');
    const { zone, setZone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
    const requested = [];
    const get = api.get;
    api.get = async (path, params) => { requested.push(path); return { posts: [], measures: { zone: { offset_minutes: 540, name: 'WIT' }, rules: {} } }; };
    try {
      let hook = null;
      const Probe = () => { hook = usePulseAnalytics('t', null, {}); return null; };
      renderToStaticMarkup(React.createElement(Probe));
      assert.equal(zone().offset_minutes, 420);
      await hook.refetch().catch(() => {});   // the server renderer may refuse the state update; the payload is read first
      assert.deepEqual(requested, ['/admin/pulse/analytics']);
      assert.deepEqual(zone(), { offset_minutes: 540, name: 'WIT' });
    } finally { api.get = get; setZone({ offset_minutes: 420, name: 'WIB' }); }
  } finally { await server.close(); }
});

test('the PULSE shell reads the installation zone once, before its pages, and a failed answer keeps the default', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: api } = await server.ssrLoadModule('/src/lib/api.js');
    const { loadZone, useInstallationZone } = await server.ssrLoadModule('/src/hooks/usePulse.js');
    const { zone, setZone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
    const requested = [], get = api.get;
    let fail = true;
    api.get = async path => {
      requested.push(path);
      if (fail) throw Object.assign(new Error('Tidak dapat terhubung'), { status: 0 });
      return { zone: { offset_minutes: 540, name: 'WIT' }, rules: [] };
    };
    try {
      let ready = null;
      const Probe = () => { ready = useInstallationZone(true); return null; };
      renderToStaticMarkup(React.createElement(Probe));
      assert.equal(ready, false, 'the signed-in pages wait for the answer');
      assert.equal(await loadZone(), false, 'a failed answer never throws');
      assert.deepEqual(zone(), { offset_minutes: 420, name: 'WIB' }, 'the default zone stays');
      renderToStaticMarkup(React.createElement(Probe));
      assert.equal(ready, true, 'and a failed answer never holds the pages');
      fail = false;
      assert.equal(await loadZone(), true, 'asked again on the next sign-in');
      assert.deepEqual(zone(), { offset_minutes: 540, name: 'WIT' });
      await loadZone();
      assert.deepEqual(requested, ['/admin/pulse/measures', '/admin/pulse/measures'], 'once answered, asked once per page load');
    } finally { api.get = get; setZone({ offset_minutes: 420, name: 'WIB' }); }
    const { readFileSync } = await import('node:fs');
    const app = readFileSync(new URL('./PulseApp.jsx', import.meta.url), 'utf8');
    assert.match(app, /const zoneReady = useInstallationZone\(Boolean\(session\.user\)\);/);
    assert.match(app, /\{session\.loading \|\| \(session\.user && !zoneReady\) \? <main className="ps-loading">/, 'the workspace mounts once the zone is known');
  } finally { await server.close(); }
});
