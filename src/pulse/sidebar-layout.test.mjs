// The sidebar shows every page without scrolling: compact rows, Pengaturan among the pages, and one short frozen row at the
// bottom that holds who is signed in with the theme and sign-out buttons.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const app = readFileSync(new URL('./PulseApp.jsx', import.meta.url), 'utf8');
const kit = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('./pulse-tokens.css', import.meta.url), 'utf8');

let server;
before(async () => { server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' }); });
after(async () => { await server?.close(); });

const user = { name: 'PULSE Owner', email: 'owner@example.test', role: 'owner' };
async function render(props) {
  const { default: SidebarAccount } = await server.ssrLoadModule('/src/pulse/SidebarAccount.jsx');
  return renderToStaticMarkup(React.createElement(SidebarAccount, { user, theme: 'dark', onTheme() {}, onLogout() {}, ...props }));
}

test('Pengaturan is one of the pages in the navigation, not part of the frozen bottom', () => {
  const nav = app.match(/<nav aria-label="Navigasi PULSE">([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.match(nav, /\/pulse\/settings\$\{location\.search\}/);
  assert.match(nav, />Pengaturan</);
  const bottom = app.match(/<div className="ps-sidebar-bottom">[\s\S]*?<\/div>/)?.[0] || app.match(/<SidebarAccount[\s\S]*?\/>/)?.[0] || '';
  assert.doesNotMatch(bottom, /Pengaturan/);
});

test('the bottom row names who is signed in, with their initials, and offers theme and sign-out as labelled buttons', async () => {
  const html = await render();
  assert.match(html, /class="ps-sidebar-bottom"/);
  assert.match(html, /<span class="ps-user-mark" aria-hidden="true">PO<\/span>/);
  assert.match(html, /<strong title="PULSE Owner">PULSE Owner<\/strong>/);
  assert.match(html, /<span class="ps-user-role">owner<\/span>/);
  assert.match(html, /<button[^>]*aria-label="Gunakan tema terang"[^>]*title="Tema terang"/);
  assert.match(html, /<button[^>]*aria-label="Keluar"[^>]*title="Keluar"/);
  assert.doesNotMatch(html, /role="alert"/);
});

test('in the light theme the theme button offers the dark one; a busy sign-out says so; an error is announced', async () => {
  assert.match(await render({ theme: 'light' }), /aria-label="Gunakan tema gelap"[^>]*title="Tema gelap"/);
  const busy = await render({ busy: true });
  assert.match(busy, /<button[^>]*aria-label="Keluar…"[^>]*disabled=""/);
  assert.match(await render({ error: 'Gagal keluar.' }), /<p role="alert" class="ps-error">Gagal keluar\.<\/p>/);
});

test('without a name the initials come from the email', async () => {
  assert.match(await render({ user: { email: 'analyst@example.test', role: 'analyst' } }), /<span class="ps-user-mark" aria-hidden="true">A<\/span>/);
});

test('rows are compact: 34px items two pixels apart, and nothing sets them back to 40px', () => {
  assert.match(tokens, /--ps-nav-item-height:\s*34px/);
  assert.match(kit, /\.pulse-standalone \.ps-sidebar nav \{[^}]*gap:\s*2px/);
  assert.doesNotMatch(kit, /\.ps-sidebar nav a \{[^}]*min-height:\s*40px/);
  assert.match(kit, /\.ps-sidebar-bottom \.ps-user \{[^}]*grid-template-columns:\s*28px minmax\(0, 1fr\) 32px 32px/);
});
