// Run with Vite on 5173: node --test src/lib/pulse-ui.test.mjs
// Real standalone UI; the dedicated fixture intercepts all API traffic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nonReads, pulseUI } from './test-support/pulse-ui-fixture.mjs';

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
  assert.equal(new URL(page.url()).searchParams.get('account'), 'news:test account');
  await page.getByLabel('Cari dalam posting', { exact: true }).fill('does-not-exist');
  await page.getByRole('status').filter({ hasText: '0 posting cocok' }).waitFor();
  assert.equal(await page.getByText('Stored GERAK evidence', { exact: true }).count(), 0);
  await page.getByLabel('Cari dalam posting', { exact: true }).fill('');
  await page.getByText('Stored GERAK evidence', { exact: true }).waitFor();
  await page.locator('.ps-menu-toggle').click();   // at phone width the navigation sits behind the menu button
  await page.getByRole('navigation', { name: 'Navigasi PULSE' }).getByRole('link', { name: 'Akun & sumber', exact: true }).click();
  await ranking.getByText('Test account', { exact: true }).waitFor();
  state.updated = true;
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await ranking.getByText('New stored account', { exact: true }).waitFor();
  assert.equal(await ranking.locator('tr').count(), 2);
  assert.deepEqual(nonReads(state), []);
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
  await page.locator('.ps-menu-toggle').click();
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

test('the tab title names the page and the head is PULSE\'s own, with each tag present once', async t => {
  const { page, open } = await pulseUI(t);
  await open('/pulse/accounts?topic=topic-a');
  await page.locator('.pulse-ranking').getByText('Test account', { exact: true }).waitFor();
  assert.equal(await page.title(), 'Akun & sumber · PULSE');
  const head = () => page.evaluate(() => ({
    lang: document.documentElement.lang,
    titles: document.head.querySelectorAll('title').length,
    descriptions: [...document.head.querySelectorAll('meta[name=description]')].map(node => node.content),
    robots: [...document.head.querySelectorAll('meta[name=robots]')].map(node => node.content),
    theme: [...document.head.querySelectorAll('meta[name=theme-color]')].map(node => node.content),
    icon: document.head.querySelector('link[rel=icon][type="image/svg+xml"]')?.getAttribute('href'),
    touch: [...document.head.querySelectorAll('link[rel=apple-touch-icon]')].map(node => node.getAttribute('href')),
  }));
  const first = await head();
  assert.equal(first.lang, 'id');
  assert.equal(first.titles, 1);
  assert.equal(first.descriptions.length, 1);
  assert.match(first.descriptions[0], /^PULSE memantau percakapan publik/);
  assert.deepEqual(first.robots, ['noindex, nofollow']);
  assert.deepEqual(first.theme, ['#f4f5f9']);
  assert.equal(first.icon, '/pulse/brand/icon.svg');
  assert.deepEqual(first.touch, ['/pulse/brand/apple-touch-icon.png']);
  // Moving to another page renames the tab and adds no second tag.
  await page.locator('.ps-menu-toggle').click();
  await page.getByRole('navigation', { name: 'Navigasi PULSE' }).getByRole('link', { name: 'Posting', exact: true }).click();
  await page.waitForFunction(() => document.title === 'Posting · PULSE');
  const second = await head();
  assert.equal(second.descriptions.length, 1);
  assert.equal(second.theme.length, 1);
  for (const path of ['/pulse/brand/icon.svg', '/pulse/brand/apple-touch-icon.png', '/pulse/brand/icon-32.png', '/pulse/brand/og.png']) {
    assert.equal(await page.evaluate(async url => (await fetch(url)).headers.get('content-type')?.split('/')[0], path), 'image', path);
  }
});

test('the sign-in screen has its own tab title', async t => {
  const { page, open } = await pulseUI(t, { authenticated: false });
  await open('/pulse/accounts?topic=topic-a');
  await page.getByRole('heading', { name: 'Masuk ke PULSE', exact: true }).waitFor();
  assert.equal(await page.title(), 'Masuk · PULSE');
});

test('an empty balance is announced on every page, and nothing is shown while collection is fine', async t => {
  const { page, open, state } = await pulseUI(t);
  await open('/pulse/posts?topic=topic-a');
  await page.getByRole('heading', { name: 'Posting', exact: true }).waitFor();
  assert.equal(await page.getByText('Saldo sumber data habis').count(), 0);
  state.balance = { state: 'empty', credits_remaining: 0, checked_at: '2026-11-14T09:00:00', until: null };
  await open('/pulse/accounts?topic=topic-a');
  const notice = page.getByRole('status').filter({ hasText: 'Saldo sumber data habis' });
  await notice.waitFor();
  assert.match(await notice.innerText(), /Analisis .*tetap berjalan/);
  assert.ok(await notice.getByRole('link', { name: /Sumber & Cakupan/ }).count(), 'the notice links to where the balance is shown');
});

test('choosing another page in the navigation opens it at the top, behind a short loader in the content area', async t => {
  const { page, open } = await pulseUI(t);
  await page.setViewportSize({ width: 1280, height: 420 });   // wide enough for the fixed sidebar, short enough to scroll
  await open('/pulse/accounts?topic=topic-a');
  await page.locator('.pulse-ranking').getByText('Test account', { exact: true }).waitFor();
  const scroller = page.locator('.pulse-standalone');
  await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
  assert.ok(await scroller.evaluate(element => element.scrollTop) > 100, 'the page must be scrolled down before the change');
  await page.getByRole('navigation', { name: 'Navigasi PULSE' }).getByRole('link', { name: 'Posting', exact: true }).click();
  const loader = page.locator('#ps-content').getByRole('status').filter({ hasText: 'Membuka Posting' });
  await loader.waitFor();
  assert.equal(await scroller.evaluate(element => element.scrollTop), 0);
  assert.equal(await page.locator('.ps-project-bar, .ps-topline').first().isVisible(), true);   // only the page area waits
  await page.getByText('Stored GERAK evidence', { exact: true }).waitFor();
  assert.equal(await loader.count(), 0);
  assert.equal(await scroller.evaluate(element => element.scrollTop), 0);
  // A filter or project change on the same page is not a page change: no loader, no jump.
  await scroller.evaluate(element => { element.scrollTop = 60; });
  await page.getByLabel('Cari dalam posting', { exact: true }).fill('Stored');
  await page.getByText('Stored GERAK evidence', { exact: true }).waitFor();
  assert.equal(await page.locator('#ps-content').getByRole('status').filter({ hasText: 'Membuka' }).count(), 0);
});

test('the trend chart on Posting filters the list to the day that is picked, and "Semua tanggal" brings every post back', async t => {
  const { page, state, open } = await pulseUI(t);
  state.extraPosts = [{ id: 'post-old', title: 'Older stored evidence', author: 'Earlier account', url: 'https://example.test/old', published_at: '2026-11-09T03:00:00Z' }];
  await page.setViewportSize({ width: 1280, height: 900 });
  await open('/pulse/posts?topic=topic-a');
  const card = page.getByRole('region', { name: 'Tren posting', exact: true });
  await card.waitFor();
  assert.equal(await card.getByRole('button', { name: 'Posting & interaksi', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await card.getByRole('button', { name: 'Hari', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await card.getByRole('button', { name: 'Minggu', exact: true }).isDisabled(), true, '9 and 11 Nov 2026 fall in one week');
  assert.equal(await card.locator('.tc-plot svg.recharts-surface').count(), 2, 'posts and interactions each have their own chart');
  await page.getByText('Older stored evidence', { exact: true }).waitFor();
  // By keyboard or screen reader: the table under the chart opens a day.
  await card.getByText('Lihat angka', { exact: true }).click();
  await card.getByRole('button', { name: 'Lihat posting 9 Nov', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '1 posting cocok' }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('day'), '2026-11-09');
  assert.equal(new URL(page.url()).searchParams.has('day_to'), false);
  assert.equal(await page.getByText('Stored GERAK evidence', { exact: true }).count(), 0);
  await card.getByText('Menampilkan posting 9 Nov.', { exact: true }).waitFor();
  await card.getByRole('button', { name: 'Semua tanggal', exact: true }).click();
  await page.getByText('Stored GERAK evidence', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('day'), false);
  // By mouse: a click on the line picks the nearest day, here the last one.
  const plot = await card.locator('.tc-plot').first().boundingBox();
  await page.mouse.click(plot.x + plot.width - 30, plot.y + plot.height / 2);
  await page.getByRole('status').filter({ hasText: '1 posting cocok' }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('day'), '2026-11-11');
  assert.equal(await page.getByText('Older stored evidence', { exact: true }).count(), 0);
  await card.getByRole('button', { name: 'Sentimen', exact: true }).click();
  await card.getByText('2 dari 2 posting belum dianalisis, tidak digambar.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(nonReads(state), []);
  assert.deepEqual(state.unexpected, []);
});
