import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('project keyword editor presents four labeled fields and a local-only readable preview', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' });
  try {
    const { ProjectEditor } = await server.ssrLoadModule('/src/pulse/ProjectBar.jsx');
    assert.equal(typeof ProjectEditor, 'function', 'project editor is available for isolated rendering');
    const resource = { updateTopic() { assert.fail('render must not save'); }, createTopic() { assert.fail('render must not create'); } };
    const render = (topic, readOnly = false) => renderToStaticMarkup(React.createElement(ProjectEditor, { topic, resource, readOnly }));
    const html = render({ id: 'one', label: 'Transportasi', query: '"bus" AND "Jakarta" NOT "iklan"', sources: ['rss'] });
    for (const label of ['Istilah utama', 'Variasi istilah', 'Konteks wajib', 'Istilah yang dikecualikan']) {
      assert.match(html, new RegExp('<label[^>]*>' + label + '</label>'));
    }
    assert.match(html, /Cocok dengan salah satu: “bus”/);
    assert.match(html, /Wajib memuat semua: “Jakarta”/);
    assert.match(html, /Abaikan jika memuat salah satu: “iklan”/);
    assert.match(html, /Ringkasan pencarian/);
    assert.match(html, /<summary>Lihat query<\/summary>/);
    assert.match(html, /&quot;bus&quot; AND &quot;Jakarta&quot; NOT &quot;iklan&quot;/);
    assert.match(html, /aria-live="polite"/);
    assert.match(render(null), /Isi minimal satu keyword utama/);
    assert.match(render(null), /<button[^>]*type="submit"[^>]*disabled/);
    assert.match(render({query: '"bus"', sources:['rss']}, true), /<fieldset disabled/);
    const legacy = render({ query: 'bus OR (kereta AND Jakarta)', sources: ['rss'] });
    assert.match(legacy, /<textarea[^>]*>bus OR \(kereta AND Jakarta\)<\/textarea>/);
    assert.match(legacy, /<button[^>]*disabled[^>]*>Keyword builder/);
  } finally { await server.close(); }
});
