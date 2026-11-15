import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

async function load() {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try { return await server.ssrLoadModule('/src/pulse/PlatformPie.jsx'); } finally { await server.close(); }
}

test('the small pie draws one slice per platform and says every share in words beside it', async () => {
  const { default: PlatformPie, pieSlices } = await load();
  const platforms = [{ platform: 'youtube', count: 600 }, { platform: 'x', count: 398 }, { platform: 'threads', count: 2 }];
  const slices = pieSlices(platforms);
  assert.equal(Math.round(slices.reduce((sum, slice) => sum + slice.share, 0) * 1000), 1000);
  assert.match(slices[0].d, /^M50 50L50\.00 2\.00A48 48 0 1 1 /, 'starts at the top; more than half is the large arc');
  const html = renderToStaticMarkup(React.createElement(PlatformPie, { platforms, onOpen() {} }));
  assert.equal((html.match(/<path d="M50 50L/g) || []).length, 3);
  assert.match(html, /aria-label="YouTube: 60%, 600 posting\. Lihat posting\."/);
  assert.match(html, /aria-label="Threads: &lt;1%, 2 posting\. Lihat posting\."/, 'a sliver is still named with its figure');
  // One platform is the whole circle; nothing to show means nothing is drawn.
  assert.match(renderToStaticMarkup(React.createElement(PlatformPie, { platforms: [{ platform: 'x', count: 5 }] })), /<circle[^>]*r="48"/);
  assert.equal(renderToStaticMarkup(React.createElement(PlatformPie, { platforms: [] })), '');
});
