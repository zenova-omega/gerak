// Run with Vite on 5173: node --test src/lib/pulse-ui.test.mjs
// Real standalone UI; the dedicated fixture intercepts all API traffic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulseUI } from './test-support/pulse-ui-fixture.mjs';

test('standalone project selection, account drill-down and refresh use stored posts without collection', async t => {
  const { page, state, open } = await pulseUI(t);
  await open('/pulse/accounts');
  await page.getByRole('heading', { name: 'Pilih project untuk mulai memantau' }).waitFor();
  await page.getByRole('combobox', { name: 'Project aktif', exact: true }).selectOption('topic-a');
  const ranking = page.locator('.pulse-ranking tbody');
  await ranking.getByText('Test account', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('topic'), 'topic-a');
  assert.match(await ranking.innerText(), /—/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.ok(state.requests.some(r => r.path.endsWith('/analytics') && r.topic === 'topic-a'));
  await page.getByRole('link', { name: 'Lihat 1 posting dari Test account', exact: true }).click();
  await page.getByText('Stored GERAK evidence', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/pulse/posts');
  assert.equal(new URL(page.url()).searchParams.get('author'), 'Test account');
  await page.getByLabel('Cari dalam posting', { exact: true }).fill('does-not-exist');
  await page.getByRole('status').filter({ hasText: '0 posting cocok' }).waitFor();
  assert.equal(await page.getByText('Stored GERAK evidence', { exact: true }).count(), 0);
  await page.getByLabel('Cari dalam posting', { exact: true }).fill('');
  await page.getByText('Stored GERAK evidence', { exact: true }).waitFor();
  await page.getByRole('navigation', { name: 'Navigasi PULSE' }).getByRole('link', { name: 'Akun & sumber', exact: true }).click();
  await ranking.getByText('Test account', { exact: true }).waitFor();
  state.updated = true;
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await ranking.getByText('New stored account', { exact: true }).waitFor();
  assert.equal(await ranking.locator('tr').count(), 2);
  assert.deepEqual(state.requests.filter(r => r.method !== 'GET'), []);
});

test('analytics failure hides stale rankings and retry restores actual evidence', async t => {
  const { page, state, open } = await pulseUI(t);
  await open('/pulse/accounts?topic=topic-a');
  await page.locator('.pulse-ranking').getByText('Test account', { exact: true }).waitFor();
  state.analyticsStatus = 503;
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  const error = page.getByRole('alert').filter({ hasText: 'Analytics offline' });
  await error.waitFor();
  assert.equal(await page.locator('.pulse-ranking').count(), 0);
  assert.equal(await page.getByText('Test account', { exact: true }).count(), 0);
  state.analyticsStatus = 200;
  await error.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await page.locator('.pulse-ranking').getByText('Test account', { exact: true }).waitFor();
  assert.equal(await page.getByRole('alert').count(), 0);
});

test('standalone login rejects invalid credentials, uses session CSRF, and expires on API 401', async t => {
  const { page, state, open } = await pulseUI(t, { authenticated: false });
  await open('/pulse/accounts?topic=topic-a');
  await page.getByLabel('Email', { exact: true }).fill('analyst@example.test');
  await page.getByLabel('Kata sandi', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Email atau kata sandi tidak sesuai.' }).waitFor();
  assert.equal(await page.locator('.pulse-dashboard').count(), 0);
  assert.equal(state.requests.some(r => r.path.startsWith('/api/admin/')), false);
  state.loginAllowed = true;
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.locator('.pulse-ranking').getByText('Test account', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await page.getByRole('heading', { name: 'Masuk ke PULSE', exact: true }).waitFor();
  assert.equal(state.requests.find(r => r.path.endsWith('/logout')).csrf, 'fixture-csrf');
  assert.equal(await page.locator('.pulse-dashboard').count(), 0);
  await open('/pulse/accounts?topic=topic-a');
  await page.getByLabel('Email', { exact: true }).fill('analyst@example.test');
  await page.getByLabel('Kata sandi', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.locator('.pulse-ranking').getByText('Test account', { exact: true }).waitFor();
  state.analyticsStatus = 401;
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await page.getByRole('heading', { name: 'Masuk ke PULSE', exact: true }).waitFor();
  await page.getByRole('status').filter({ hasText: 'Sesi berakhir' }).waitFor();
  assert.equal(await page.locator('.pulse-ranking').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('sinar_token')), null);
  assert.ok(state.requests.every(r => !r.authorization));
});
