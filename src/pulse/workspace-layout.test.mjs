import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright-core';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('workspace menu folds on mobile, supports Escape, and stays visible on desktop', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'pulse-layout-'));
  const fixture = { name: 'workspace-layout-fixture', resolveId(id) { if (id === '/layout-fixture.jsx') return id; }, load(id) {
    if (id === '/layout-fixture.jsx') return `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Navigation from '/src/pulse/WorkspaceNavigation.jsx';
      import '/src/pulse/workspace-layout.css';
      createRoot(document.getElementById('root')).render(<div className="pulse-standalone"><div className="ps-workspace"><Navigation brand={<a href="#">PULSE</a>} label="Ikhtisar"><nav aria-label="Navigasi PULSE"><a href="#posts">Posting</a></nav></Navigation><main className="ps-content">Konten</main></div></div>);
    `;
  } };
  const server = await createServer({ configFile: false, cacheDir, plugins: [react(), fixture], resolve: { alias: { '@': new URL('../', import.meta.url).pathname } }, server: { host: '127.0.0.1', port: 0, hmr: false, ws: false, watch: null }, appType: 'custom' });
  server.middlewares.use('/layout-fixture', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await server.transformIndexHtml('/layout-fixture', '<div id="root"></div><script type="module" src="/layout-fixture.jsx"></script>'));
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(server.resolvedUrls.local[0] + 'layout-fixture');
    const toggle = page.getByRole('button', { name: 'Ikhtisar' });
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByRole('link', { name: 'Posting' }).isVisible(), false);
    await toggle.click();
    assert.equal(await page.getByRole('link', { name: 'Posting' }).isVisible(), true);
    await page.getByRole('link', { name: 'Posting' }).focus();
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.getByRole('link', { name: 'Posting' }).isVisible(), true);
    assert.equal(await toggle.isVisible(), false);
  } finally {
    await browser?.close(); await server.close(); await rm(cacheDir, { recursive: true, force: true });
  }
});
