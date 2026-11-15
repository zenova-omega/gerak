// Run with Vite on 5173: node --test src/lib/pulse-insights-ui.test.mjs
// The real AI Insights page in a browser; the shared fixture and the route below intercept all API traffic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulseUI } from './test-support/pulse-ui-fixture.mjs';

const source = (code, author, platform, url, extra = {}) => ({ code, id: 'post-' + code, author, platform, url, published_at: '2026-11-03T00:00:00Z', interactions: 665, text: 'Teks sumber ' + code + ' yang cukup panjang untuk membungkus di layar sempit tanpa menggeser halaman.', ...extra });
const insight = scope => ({
  format: 'insights', created_at: '2026-11-14T02:27:00Z',
  sections: [
    { title: 'Judul', kind: 'headline', paragraphs: ['Isu penyadapan melonjak pada 8 Nov dan didominasi nada negatif [A1].'], bullets: [] },
    { title: 'Insight', kind: 'insights', paragraphs: [], bullets: [
      'Lonjakan terjadi pada 8 Nov. Posting dengan interaksi tertinggi muncul hari itu, dengan 317.599 interaksi pada satu posting [K3].',
      'Posting negatif mendominasi, dengan 50% dari posting yang dianalisis [N1]. Komentar teratas menyindir penegak hukum [K3][K2].',
      'Akun_dengan_nama_yang_sangat_panjang_tanpa_spasi_sama_sekali_agar_teruji menjadi penggerak utama [P2].',
    ] },
  ],
  facts: {},
  sources: [
    source('A1', 'padarincang2026', 'tiktok', 'https://www.tiktok.com/@padarincang2026/video/1'),
    source('K3', 'sanioce_', 'tiktok', 'https://www.tiktok.com/@putra.ajisujati/video/7', { comment: true, published_at: null, interactions: 15865 }),
    source('N1', 'gemathebillionaire', 'instagram', 'https://www.instagram.com/p/DfcEm4XSuuS/', { published_at: null }),
    source('K2', 'cah.kalem075', 'tiktok', 'https://www.tiktok.com/@putra.ajisujati/video/7', { comment: true, published_at: null }),
    source('P2', 'Akun_dengan_nama_yang_sangat_panjang_tanpa_spasi_sama_sekali_agar_teruji', 'tiktok', 'https://www.tiktok.com/@orangdalam.update/video/2'),
  ],
  scope: { posts: 3000, comments: 17514, truncated: false, from: null, to: null, platforms: null, ...scope },
});

/** Answers the summary endpoint of the fixture project. `api.stored` is what the server holds; `api.write` decides the next POST. */
async function summaryApi(page, stored = null) {
  const api = { stored, calls: [], write: null };
  await page.route('**/api/admin/pulse/topics/topic-a/summary', async route => {
    const request = route.request();
    const body = request.method() === 'POST' ? request.postDataJSON() : null;
    api.calls.push({ method: request.method(), body });
    if (request.method() === 'GET') {
      return route.fulfill({ json: { available: true, posts_now: 3200, min_posts: 30, formats: [{ key: 'brief', label: 'Ringkas' }, { key: 'timeline', label: 'Kronologi' }, { key: 'executive', label: 'Eksekutif' }], summaries: api.stored ? { insights: api.stored } : {} } });
    }
    const answer = await api.write(body);
    if (answer.status) return route.fulfill({ status: answer.status, json: { detail: answer.detail } });
    api.stored = answer;
    return route.fulfill({ json: answer });
  });
  return api;
}
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.pulse-standalone, .ain-page, .ain-card')].every(node => node.scrollWidth <= node.clientWidth + 1));

test('AI Insights opens the stored insight without asking for a new one, links each number to its source, and fits a phone', async t => {
  const { page, open } = await pulseUI(t);
  const api = await summaryApi(page, insight());
  await open('/pulse/insights?topic=topic-a');
  await page.getByRole('heading', { level: 1, name: 'AI Insights', exact: true }).waitFor();
  await page.getByRole('heading', { level: 2, name: 'Isu penyadapan melonjak pada 8 Nov dan didominasi nada negatif.', exact: true }).waitFor();
  assert.equal(await page.title(), 'AI Insights · PULSE');
  assert.equal(await page.locator('.ain-insight').count(), 3);
  assert.equal(await page.locator('.ain-insight strong').first().innerText(), 'Lonjakan terjadi pada 8 Nov.');
  // The first source cited gets number 1 and keeps it when cited again; a comment opens the post it sits under.
  const first = page.getByRole('link', { name: 'Bukti 1: komentar akun sanioce_ pada posting di TikTok', exact: true });
  assert.equal(await first.count(), 2);
  assert.equal(await first.first().getAttribute('href'), 'https://www.tiktok.com/@putra.ajisujati/video/7');
  assert.equal(await first.first().getAttribute('target'), '_blank');
  assert.equal(await page.getByRole('link', { name: 'Bukti 2: posting akun gemathebillionaire di Instagram', exact: true }).innerText(), '2');
  assert.equal(await page.locator('.ain-evidence li').count(), 4);
  // The period card names the project and the period of the insight; the trend of posts and interactions sits with it.
  const period = page.getByRole('group', { name: 'Periode insight' });
  assert.match(await period.innerText(), /GERAK/);
  assert.match(await period.innerText(), /Seluruh periode tersimpan\s*Periode pilihan\s*Semua platform/);
  const trend = page.locator('.ain-chart').getByRole('region', { name: 'Posting dan interaksi', exact: true });
  await trend.waitFor();
  assert.equal(await trend.getByRole('group').count(), 0, 'the small form has no switches');
  assert.equal(await trend.locator('.tc-chart').count(), 2);
  assert.equal(await fits(page), true, 'no sideways scroll at 390px');
  // 200 new posts since a whole-project insight was written.
  await page.getByText('200 posting baru belum masuk insight ini.', { exact: true }).waitFor();
  // The sidebar lists the page right after Ikhtisar, and it is the current page.
  await page.locator('.ps-menu-toggle').click();
  const links = await page.getByRole('navigation', { name: 'Navigasi PULSE' }).getByRole('link').allInnerTexts();
  assert.deepEqual(links.slice(0, 5).map(text => text.trim()), ['Beranda', 'Pencarian cepat', 'Ikhtisar', 'AI Insights', 'Tanya AI']);
  assert.equal(await page.getByRole('navigation', { name: 'Navigasi PULSE' }).getByRole('link', { name: 'AI Insights', exact: true }).getAttribute('aria-current'), 'page');
  assert.deepEqual(api.calls.filter(call => call.method !== 'GET'), [], 'reading never asks for a new insight');
  // Wide screen: the insight takes two thirds, the period card sits beside it.
  await page.setViewportSize({ width: 1440, height: 900 });
  const main = await page.locator('.ain-main').boundingBox(), side = await period.boundingBox();
  assert.ok(side.x >= main.x + main.width && Math.abs(side.y - main.y) < 2, 'period card beside the insight');
  assert.ok(Math.abs(main.width / side.width - 2) < 0.15, 'two thirds and one third');
  assert.equal(await fits(page), true);
});

test('Buat insight writes for the period and platforms of the project bar, waits in the open, and keeps the insight when a rewrite fails', async t => {
  const { page, open } = await pulseUI(t);
  const api = await summaryApi(page);
  await page.addInitScript(() => localStorage.setItem('pulse:project-period:topic-a', JSON.stringify({ from: '2026-11-03', to: '2026-11-09' })));
  await open('/pulse/insights?topic=topic-a&platforms=x,tiktok');
  await page.getByRole('heading', { level: 2, name: 'Belum ada insight untuk project ini', exact: true }).waitFor();
  const period = page.getByRole('group', { name: 'Periode insight' });
  assert.match(await period.innerText(), /3 Nov 2026 – 9 Nov 2026\s*Mingguan\s*TikTok dan X/);
  let release;
  api.write = body => new Promise(resolve => { release = () => resolve(insight({ from: body.from, to: body.to, platforms: body.platforms })); });
  await page.getByRole('button', { name: 'Buat insight', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Biasanya sekitar satu menit, paling lama tiga menit.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Menulis insight…', exact: true }).isDisabled(), true);
  release();
  await page.getByRole('heading', { level: 2, name: 'Isu penyadapan melonjak pada 8 Nov dan didominasi nada negatif.', exact: true }).waitFor();
  assert.deepEqual(api.calls.at(-1), { method: 'POST', body: { format: 'insights', from: '2026-11-03', to: '2026-11-09', platforms: ['tiktok', 'x'] } });
  assert.equal(await page.getByText('Bilah project sekarang memilih').count(), 0);
  // A rewrite that fails says so and leaves the insight on screen.
  api.write = async () => ({ status: 502, detail: 'Ringkasan tidak berhasil disusun.' });
  await page.getByRole('button', { name: 'Perbarui insight', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Insight belum berhasil ditulis. Insight sebelumnya tetap ditampilkan. Coba lagi.' }).waitFor();
  assert.equal(await page.locator('.ain-insight').count(), 3);
  assert.equal(await fits(page), true);
  // The project bar now shows all platforms: the stored insight says what it was written for and offers the rewrite.
  await open('/pulse/insights?topic=topic-a&platforms=all');
  await page.getByText('Insight ini ditulis untuk 3 Nov 2026 – 9 Nov 2026, TikTok dan X. Bilah project sekarang memilih 3 Nov 2026 – 9 Nov 2026, semua platform.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Perbarui insight', exact: true }).count(), 1);
  assert.match(await period.innerText(), /TikTok dan X/);
  assert.equal(await fits(page), true);
  assert.equal(api.calls.filter(call => call.method === 'POST').length, 2, 'one request per press, none on reload');
});
