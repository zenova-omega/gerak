import test from 'node:test';
import assert from 'node:assert/strict';
import { elapsedText, observedWindow, paceOf } from './pulseGrowthView.js';

test('the time between two observations is said in the largest two units that matter', () => {
  assert.equal(elapsedText(2 / 60), '2 menit');
  assert.equal(elapsedText(2.05), '2 jam 3 menit');
  assert.equal(elapsedText(3), '3 jam');
  assert.equal(elapsedText(14.05), '14 jam 3 menit');
  assert.equal(elapsedText(50), '2 hari 2 jam');
  assert.equal(elapsedText(48), '2 hari');
  assert.equal(elapsedText(0.004), 'kurang dari 1 menit');
});

test('no elapsed time is stated when the server gave none', () => {
  for (const value of [null, undefined, 0, -1, NaN, '2']) assert.equal(elapsedText(value), null);
});

test('two observations on one day name the day once and the zone once', () => {
  assert.equal(observedWindow('2026-11-14T22:09:00Z', '2026-11-15T00:12:00Z'), '15 Nov 2026, 05.09 → 07.12 WIB');
});

test('two observations on different days name both days', () => {
  assert.equal(observedWindow('2026-11-14T10:09:00Z', '2026-11-15T00:12:00Z'), '14 Nov 2026, 17.09 → 15 Nov 2026, 07.12 WIB');
});

test('a missing observation time is said, not guessed', () => {
  assert.equal(observedWindow(null, '2026-11-15T00:12:00Z'), 'Waktu tidak tersedia → 15 Nov 2026, 07.12 WIB');
});

test('the change of pace has one word, and too little data is not called steady', () => {
  assert.deepEqual(paceOf(0.4), { key: 'up', label: 'Mempercepat' });
  assert.deepEqual(paceOf(-3), { key: 'down', label: 'Melambat' });
  assert.deepEqual(paceOf(0), { key: 'flat', label: 'Tetap' });
  assert.deepEqual(paceOf(null), { key: 'unknown', label: 'Belum cukup data' });
  assert.deepEqual(paceOf(undefined), { key: 'unknown', label: 'Belum cukup data' });
});
