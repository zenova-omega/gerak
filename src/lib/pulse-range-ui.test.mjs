// Run with Vite on 5173: node --test src/lib/pulse-range-ui.test.mjs
// The range filter in the real UI, on the trend chart of Posting; the shared fixture intercepts all API traffic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulseUI } from './test-support/pulse-ui-fixture.mjs';

// Nothing is wider than its box: the page, the shell that scrolls, the trend card. The charts redraw a moment after the
// window changes size, so this waits for the layout to settle instead of measuring once.
const fits = page => page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth
  && [...document.querySelectorAll('.pulse-standalone, .tc')].every(node => node.scrollWidth <= node.clientWidth + 1), null, { timeout: 4000 }).then(() => true, () => false);

test('the range filter narrows the trend chart before the unit is applied, keeps the click on a bucket, refuses a reversed range and fits a phone', async t => {
  const { page, state, open } = await pulseUI(t);
  // With the fixture's own post on 11 Nov the data runs from 20 Oct to 11 Nov 2026.
  state.extraPosts = [
    { id: 'post-oct', title: 'October evidence', author: 'October account', url: 'https://example.test/oct', published_at: '2026-10-20T03:00:00Z' },
    { id: 'post-early', title: 'Early November evidence', author: 'Early account', url: 'https://example.test/early', published_at: '2026-11-03T03:00:00Z' },
    { id: 'post-nine', title: 'Ninth of November evidence', author: 'Ninth account', url: 'https://example.test/nine', published_at: '2026-11-09T03:00:00Z' },
  ];
  await page.setViewportSize({ width: 1280, height: 900 });
  await open('/pulse/posts?topic=topic-a');
  const card = page.getByRole('region', { name: 'Tren posting', exact: true });
  const range = card.getByRole('group', { name: 'Rentang waktu Tren posting', exact: true });
  await range.waitFor();
  const choice = name => range.getByRole('button', { name, exact: true });
  const unit = name => card.getByRole('group', { name: 'Satuan waktu', exact: true }).getByRole('button', { name, exact: true });
  const caption = card.locator('.pu-range-caption');
  const tableDays = () => card.locator('.tc-table tbody th').allInnerTexts();

  // It starts on everything and says which days that is.
  assert.deepEqual(await range.getByRole('button').allInnerTexts(), ['3 hari', '7 hari', '1 bulan', 'Semua', 'Rentang']);
  assert.equal(await choice('Semua').getAttribute('aria-pressed'), 'true');
  assert.equal(await caption.innerText(), '20 Okt – 11 Nov 2026');
  assert.equal(await card.locator('.pu-panel-heading .pu-segmented').count(), 3, 'the range sits in the heading with the other two switches');
  assert.equal(await range.evaluate(node => getComputedStyle(node.querySelector('button')).minHeight), '36px');
  await card.getByText('Lihat angka', { exact: true }).click();
  assert.equal((await tableDays()).length, 23);

  // Three days end on the last day with a post. One week is a single point, so the unit steps back to days and "Minggu" is greyed out.
  await unit('Minggu').click();
  assert.equal(await unit('Minggu').getAttribute('aria-pressed'), 'true');
  await choice('3 hari').click();
  assert.equal(await choice('3 hari').getAttribute('aria-pressed'), 'true');
  assert.equal(await choice('Semua').getAttribute('aria-pressed'), 'false');
  assert.equal(await caption.innerText(), '9–11 Nov 2026');
  assert.deepEqual(await tableDays(), ['9 Nov', '10 Nov', '11 Nov']);
  assert.equal(await unit('Minggu').isDisabled(), true);
  assert.equal(await unit('Minggu').getAttribute('title'), 'Rentang ini baru mencakup satu minggu');
  assert.equal(await unit('Hari').getAttribute('aria-pressed'), 'true');

  // Seven days reach into the week before, so weeks are offered again and are cut from the seven days, not from all the data.
  await choice('7 hari').click();
  assert.equal(await caption.innerText(), '5–11 Nov 2026');
  assert.equal(await unit('Minggu').isDisabled(), false);
  assert.equal(await unit('Minggu').getAttribute('aria-pressed'), 'true', 'the unit that was chosen comes back once it has two points');
  assert.deepEqual(await tableDays(), ['5–8 Nov', '9–11 Nov']);

  // A click on the chart still opens the bucket that was clicked, and the chart keeps its range.
  const plot = await card.locator('.tc-plot').first().boundingBox();
  await page.mouse.click(plot.x + plot.width - 30, plot.y + plot.height / 2);
  await page.getByRole('status').filter({ hasText: '2 posting cocok' }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('day'), '2026-11-09');
  assert.equal(new URL(page.url()).searchParams.get('day_to'), '2026-11-11');
  assert.equal(await page.getByText('Early November evidence', { exact: true }).count(), 0);
  assert.equal(await choice('7 hari').getAttribute('aria-pressed'), 'true');
  assert.equal(await caption.innerText(), '5–11 Nov 2026');
  await card.getByRole('button', { name: 'Semua tanggal', exact: true }).click();
  await page.getByText('Early November evidence', { exact: true }).waitFor();

  // "Rentang" opens two dates in the same row, filled with the days on screen. Nothing changes until a date does.
  await choice('Rentang').click();
  const from = card.getByLabel('Dari tanggal, Tren posting', { exact: true }), to = card.getByLabel('Sampai tanggal, Tren posting', { exact: true });
  assert.equal(await from.inputValue(), '2026-11-05');
  assert.equal(await to.inputValue(), '2026-11-11');
  assert.equal(await caption.innerText(), '5–11 Nov 2026');
  assert.equal(await page.getByRole('dialog').count(), 0);
  const switchBox = await range.boundingBox(), fromBox = await from.boundingBox();
  assert.ok(Math.abs((switchBox.y + switchBox.height / 2) - (fromBox.y + fromBox.height / 2)) < 2, 'the dates sit in the row of the switch');
  // A reversed range is not applied and says why.
  await to.fill('2026-11-03');
  const problem = card.getByRole('alert');
  assert.equal(await problem.innerText(), 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir.');
  assert.equal(await caption.innerText(), '5–11 Nov 2026', 'the chart keeps the last range that could be applied');
  assert.equal(await to.getAttribute('aria-invalid'), 'true');
  // A day outside the data is refused too.
  await to.fill('2026-11-20');
  assert.equal(await problem.innerText(), 'Data grafik ini hanya mencakup 20 Okt – 11 Nov 2026. Pilih tanggal di dalamnya.');
  // A range that works is applied at once.
  await to.fill('2026-11-09');
  await from.fill('2026-11-03');
  assert.equal(await caption.innerText(), '3–9 Nov 2026');
  assert.equal(await card.getByRole('alert').count(), 0);
  await unit('Hari').click();
  assert.deepEqual(await tableDays(), ['3 Nov', '4 Nov', '5 Nov', '6 Nov', '7 Nov', '8 Nov', '9 Nov']);
  assert.equal(await fits(page), true, 'no sideways scroll at 1280px');

  // On a phone the items are 44px tall, the dates stay inside the card and nothing scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await range.evaluate(node => getComputedStyle(node.querySelector('button')).minHeight), '44px');
  const cardBox = await card.boundingBox();
  for (const part of [range, from, to, caption]) {
    const box = await part.boundingBox();
    assert.ok(box.x >= cardBox.x && box.x + box.width <= cardBox.x + cardBox.width + 0.5, 'every part of the filter stays inside its card');
  }
  assert.equal(await fits(page), true, 'no sideways scroll at 390px');
  await choice('Semua').click();
  assert.equal(await card.getByLabel('Dari tanggal, Tren posting', { exact: true }).count(), 0);
  assert.equal(await caption.innerText(), '20 Okt – 11 Nov 2026');
  assert.equal(await fits(page), true);
  assert.deepEqual(state.requests.filter(request => request.method !== 'GET'), [], 'choosing a range never writes and never starts a collection');
});
