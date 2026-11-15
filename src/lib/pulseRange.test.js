import test from 'node:test';
import assert from 'node:assert/strict';
import { rangeChoices, allRange, rangeBounds, resolveRange, withinRange, rangeLabel, customRangeError } from './pulseRange.js';

const days = ['2026-11-03', '2026-11-05', '2026-11-05', '2026-11-12', '2026-11-14'];

test('the choices come in one order everywhere, and "Semua" is where a chart starts', () => {
  assert.deepEqual(rangeChoices.map(row => [row.key, row.label]), [['3', '3 hari'], ['7', '7 hari'], ['30', '1 bulan'], ['all', 'Semua'], ['custom', 'Rentang']]);
  assert.deepEqual(allRange, { key: 'all' });
});

test('bounds are the first and last day that carry data, and how many days do', () => {
  assert.deepEqual(rangeBounds(days), { first: '2026-11-03', last: '2026-11-14', days: 4, from: '2026-11-03', to: '2026-11-14' });
  assert.deepEqual(rangeBounds(['2026-11-14', null, undefined, '', 'bukan tanggal', '2026-02-30', '2026-11-03']).days, 2, 'what is not a calendar day is skipped');
  assert.equal(rangeBounds([]), null);
  assert.equal(rangeBounds([null, '']), null);
});

test('a chart that draws the whole project period says so under "Semua", while presets stay on the days with data', () => {
  const bounds = rangeBounds(days, { from: '2026-11-01', to: '2026-11-20' });
  assert.deepEqual([bounds.first, bounds.last, bounds.from, bounds.to], ['2026-11-03', '2026-11-14', '2026-11-01', '2026-11-20']);
  assert.deepEqual(resolveRange(bounds, allRange), { key: 'all', from: '2026-11-01', to: '2026-11-20' });
  assert.deepEqual(resolveRange(bounds, { key: '3' }), { key: '3', from: '2026-11-12', to: '2026-11-14' });
  // A period that is narrower than the data, or only half given, never shrinks what the chart was handed.
  assert.deepEqual(rangeBounds(days, { from: '2026-11-10' }).from, '2026-11-03');
  assert.deepEqual(rangeBounds(days, { to: 'kapan saja' }).to, '2026-11-14');
});

test('a preset ends on the last day with data and reaches back N days, never before the first day with data', () => {
  const bounds = rangeBounds(days);
  assert.deepEqual(resolveRange(bounds, { key: '3' }), { key: '3', from: '2026-11-12', to: '2026-11-14' });
  assert.deepEqual(resolveRange(bounds, { key: '7' }), { key: '7', from: '2026-11-08', to: '2026-11-14' });
  assert.deepEqual(resolveRange(bounds, { key: '30' }), { key: '30', from: '2026-11-03', to: '2026-11-14' }, 'thirty days back would start before the data does');
  // A quiet weekend after the last post does not empty the chart: the anchor is the data, not today.
  const old = rangeBounds(['2025-12-30', '2026-01-02']);
  assert.deepEqual(resolveRange(old, { key: '3' }), { key: '3', from: '2025-12-31', to: '2026-01-02' });
});

test('a preset that shows the same days as "Semua" keeps its own name', () => {
  const bounds = rangeBounds(['2026-11-13', '2026-11-14']);
  assert.deepEqual(resolveRange(bounds, { key: '7' }), { key: '7', from: '2026-11-13', to: '2026-11-14' });
  assert.deepEqual(resolveRange(bounds, allRange), { key: 'all', from: '2026-11-13', to: '2026-11-14' });
});

test('a custom range is taken as given when it is whole, in order and inside the days with data', () => {
  const bounds = rangeBounds(days);
  assert.deepEqual(resolveRange(bounds, { key: 'custom', from: '2026-11-05', to: '2026-11-12' }), { key: 'custom', from: '2026-11-05', to: '2026-11-12' });
  assert.deepEqual(resolveRange(bounds, { key: 'custom', from: '2026-11-05', to: '2026-11-05' }), { key: 'custom', from: '2026-11-05', to: '2026-11-05' }, 'one day is a range');
  // What cannot be applied falls back to everything, so a chart never ends up drawing nothing because its data changed.
  assert.equal(resolveRange(bounds, { key: 'custom', from: '2026-11-12', to: '2026-11-05' }).key, 'all');
  assert.equal(resolveRange(bounds, { key: 'custom', from: '2026-10-01', to: '2026-11-05' }).key, 'all');
  assert.equal(resolveRange(bounds, { key: 'tidak dikenal' }).key, 'all');
  assert.equal(resolveRange(bounds).key, 'all');
  assert.equal(resolveRange(null, { key: '7' }), null, 'no dated data, no range');
});

test('a custom range that cannot be applied says why, in plain words', () => {
  const bounds = rangeBounds(days);
  assert.equal(customRangeError({ from: '2026-11-05', to: '2026-11-12' }, bounds), '');
  assert.equal(customRangeError({ from: '', to: '2026-11-12' }, bounds), 'Isi tanggal mulai dan tanggal akhir.');
  assert.equal(customRangeError({ from: '2026-11-05' }, bounds), 'Isi tanggal mulai dan tanggal akhir.');
  assert.equal(customRangeError({ from: '2026-02-30', to: '2026-11-12' }, bounds), 'Isi tanggal mulai dan tanggal akhir.', 'a date that does not exist is not a date');
  assert.equal(customRangeError({ from: '2026-11-12', to: '2026-11-05' }, bounds), 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir.');
  assert.equal(customRangeError({ from: '2026-11-01', to: '2026-11-05' }, bounds), 'Data grafik ini hanya mencakup 3–14 Nov 2026. Pilih tanggal di dalamnya.');
  assert.equal(customRangeError({ from: '2026-11-05', to: '2026-11-20' }, bounds), 'Data grafik ini hanya mencakup 3–14 Nov 2026. Pilih tanggal di dalamnya.');
  for (const message of [customRangeError({}, bounds), customRangeError({ from: '2026-11-12', to: '2026-11-05' }, bounds), customRangeError({ from: '2026-11-01', to: '2026-11-05' }, bounds)]) assert.doesNotMatch(message, /—/);
});

test('rows are narrowed by their day; "Semua" hands back everything, dated or not', () => {
  const rows = [{ date: '2026-11-03' }, { date: '2026-11-12' }, { date: '2026-11-14' }, { date: null }];
  const bounds = rangeBounds(rows.map(row => row.date));
  assert.equal(withinRange(rows, resolveRange(bounds, allRange)), rows, 'the same list, so nothing is recomputed');
  assert.deepEqual(withinRange(rows, resolveRange(bounds, { key: '3' })).map(row => row.date), ['2026-11-12', '2026-11-14']);
  assert.deepEqual(withinRange(rows, resolveRange(bounds, { key: 'custom', from: '2026-11-03', to: '2026-11-12' })).map(row => row.date), ['2026-11-03', '2026-11-12']);
  const posts = [{ id: 1, when: '2026-11-14' }, { id: 2, when: '2026-11-01' }, { id: 3 }];
  assert.deepEqual(withinRange(posts, { key: '3', from: '2026-11-12', to: '2026-11-14' }, post => post.when).map(post => post.id), [1], 'a post without a day is outside every dated range');
  assert.equal(withinRange(posts, null, post => post.when), posts);
});

test('the covered days are written in words, shortest form that is still unambiguous', () => {
  assert.equal(rangeLabel('2026-11-12', '2026-11-14'), '12–14 Nov 2026');
  assert.equal(rangeLabel('2026-11-14', '2026-11-14'), '14 Nov 2026');
  assert.equal(rangeLabel('2026-10-30', '2026-11-02'), '30 Okt – 2 Nov 2026');
  assert.equal(rangeLabel('2025-12-28', '2026-01-03'), '28 Des 2025 – 3 Jan 2026');
  assert.equal(rangeLabel('2026-08-01', '2026-08-31'), '1–31 Agu 2026');
  assert.equal(rangeLabel('', ''), '');
  assert.doesNotMatch(rangeLabel('2025-12-28', '2026-01-03'), /—|\d{4}-\d{2}/, 'no em dash and no raw date reaches the screen');
});
