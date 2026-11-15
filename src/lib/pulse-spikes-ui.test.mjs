// Run with Vite on 5173: node --test src/lib/pulse-spikes-ui.test.mjs
// The real trend chart in a real browser; the fixture stands in for the server, so the rule itself is never run here.
// Which days are spikes is the server's answer: the chart sends the numbers it draws, marks what comes back, and
// marks nothing when no answer comes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulseUI } from './test-support/pulse-ui-fixture.mjs';

// Ten posts on three days: one on 9 Nov, eight on 10 Nov, and the fixture's own on 11 Nov. Eight against a usual day
// of one is a spike by the rule, so a browser that worked the rule out by itself would mark it without being told.
const extraPosts = [
  { id: 'post-9', title: 'Kabar sembilan', author: 'akun_sembilan', url: 'https://example.test/9', published_at: '2026-11-09T03:00:00Z' },
  ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => ({ id: 'post-10' + id, title: 'Kabar sepuluh ' + id, author: 'akun_' + id, url: 'https://example.test/10' + id, published_at: '2026-11-10T03:00:00Z' })),
];
const days = values => values.map((value, index) => ({ key: `2026-11-${String(9 + index).padStart(2, '0')}`, value }));

async function posting(t) {
  const ui = await pulseUI(t);
  ui.state.extraPosts = extraPosts;
  await ui.page.setViewportSize({ width: 1280, height: 900 });
  return ui;
}

test('the trend chart sends its two lines to the server once and marks the day the server calls a spike', async t => {
  const { page, state, open } = await posting(t);
  state.spikes = { posts: [{ key: '2026-11-10', value: 8, usual: 1, times: 8 }] };   // what the server answers
  await open('/pulse/posts?topic=topic-a');
  const card = page.getByRole('region', { name: 'Tren posting', exact: true });
  await card.locator('.tc-spike-note').waitFor();
  assert.match(await card.locator('.tc-spike-note').innerText(), /Titik bercincin menandai lonjakan/);
  assert.equal(await card.locator('.tc-plot').first().getAttribute('aria-label'), 'Grafik garis posting per hari. 1 lonjakan ditandai. Angkanya ada pada tabel di bawah grafik.');
  assert.match(await card.locator('.tc-plot').nth(1).getAttribute('aria-label'), /^Grafik garis interaksi per hari\. Angkanya/, 'the server named no spike in interactions');
  assert.equal(await card.locator('.tc-plot').first().locator('.tc-spike').count(), 1, 'one ringed point on the posts line');
  // The same answer in words, for a reader without a mouse.
  await card.getByText('Lihat angka', { exact: true }).click();
  const row = card.locator('tbody tr').filter({ hasText: '10 Nov' });
  assert.match(await row.innerText(), /8 posting, 8× hari biasa pada rentang ini\./);
  assert.match(await row.innerText(), /Terbanyak dari Berita: 8 posting \(100%\)\./, 'what the day is made of is still counted from the posts on screen');
  // What was asked: the numbers that are drawn, with the session's token, in one request.
  assert.deepEqual(state.spikeQuestions, [{ series: { posts: days([1, 8, 1]), interactions: days([0, 0, 0]) }, csrf: 'fixture-csrf' }]);
  // Another view and back: the same lines are not asked about again.
  await card.getByRole('button', { name: 'Sentimen', exact: true }).click();
  await card.getByText('Posting menurut sentimen', { exact: true }).waitFor();
  assert.equal(await card.locator('.tc-spike-note').count(), 0, 'the sentiment view marks no spike');
  await card.getByRole('button', { name: 'Posting & interaksi', exact: true }).click();
  await card.locator('.tc-spike-note').waitFor();
  assert.equal(state.spikeQuestions.length, 1);
  assert.deepEqual(state.unexpected, []);
});

test('when the server does not answer, the chart is drawn without any mark and without an error', async t => {
  const { page, state, open } = await posting(t);
  state.spikesStatus = 503;
  const refused = page.waitForResponse(response => response.url().endsWith('/api/admin/pulse/spikes'));
  await open('/pulse/posts?topic=topic-a');
  const card = page.getByRole('region', { name: 'Tren posting', exact: true });
  await card.locator('.tc-plot svg.recharts-surface').first().waitFor();
  assert.equal((await refused).status(), 503);
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));   // let the page take the refusal in
  await card.getByText('Lihat angka', { exact: true }).click();
  await card.locator('tbody tr').filter({ hasText: '10 Nov' }).waitFor();
  assert.ok(state.spikeQuestions.length >= 1, 'the chart did ask');
  assert.equal(await card.locator('.tc-spike-note').count(), 0);
  assert.equal(await card.locator('.tc-spike').count(), 0);
  assert.equal(await card.getByRole('columnheader', { name: 'Lonjakan', exact: true }).count(), 0, 'the eight posts of 10 Nov are not called a spike by the browser on its own');
  assert.equal(await card.getByRole('alert').count(), 0, 'a missing mark is not an error to show');
});
