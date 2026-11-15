import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeSourceUrl, pulseError, observedAccounts, allegationLabel, providerResults, validLocations, pulseDate } from './pulseData.js';

test('source links only allow absolute http and https evidence URLs', () => {
  assert.equal(safeSourceUrl('javascript:alert(1)'), undefined);
  assert.equal(safeSourceUrl('/login'), undefined);
  assert.equal(safeSourceUrl('https://example.com/story'), 'https://example.com/story');
});
test('authorization errors explicitly require admin sign in', () => {
  assert.match(pulseError({ status: 401 }), /Masuk/);
  assert.match(pulseError({ status: 403 }), /admin/);
  assert.match(pulseError(new Error('Offline')), /Offline/);
});
test('account ranking uses observed engagement and does not mutate input', () => {
  const rows = [{ author: 'A', engagement: null }, { author: 'B', engagement: 12 }, { author: 'C', engagement: 3 }];
  assert.deepEqual(observedAccounts(rows).map(row => row.author), ['B', 'C', 'A']);
  assert.equal(rows[0].author, 'A');
});
test('account activity ranking sorts posting counts independently of engagement', () => {
  const rows = [{ author: 'A', mentions: 8, engagement: 2 }, { author: 'B', mentions: 1, engagement: 100 }];
  assert.deepEqual(observedAccounts(rows, 'mentions').map(row => row.author), ['A', 'B']);
});
test('wiretapping labels remain allegations without duplicating qualifiers', () => {
  assert.equal(allegationLabel('Isu Penyadapan Presiden'), 'Dugaan · Isu Penyadapan Presiden');
  assert.equal(allegationLabel('Dugaan penyadapan'), 'Dugaan penyadapan');
  assert.equal(allegationLabel('GERAK'), 'GERAK');
});
test('provider results retain failures and skipped providers', () => {
  assert.deepEqual(providerResults({ rss: { status: 'ok', ingested: 3 }, apify: { status: 'skipped', reason: 'Not configured' } }), [
    { provider: 'rss', status: 'ok', ingested: 3 }, { provider: 'apify', status: 'skipped', reason: 'Not configured' },
  ]);
  assert.deepEqual(providerResults(undefined), []);
});
test('geographic points require finite coordinates, valid bounds and provenance', () => {
  const point = { lat: -6.2, lon: 106.8, count: 2, provenance: 'Source geotag' };
  assert.deepEqual(validLocations([point, { lat: 91, lon: 20, provenance: 'x' }, { lat: 0, lon: 0 }, { lat: null, lon: 1, provenance: 'x' }]), [point]);
  assert.deepEqual(validLocations([]), []);
});
test('timestamps without a zone are interpreted as UTC and rendered in Jakarta', () => {
  assert.equal(pulseDate('2026-11-10T10:00:00'), pulseDate('2026-11-10T10:00:00Z'));
  assert.match(pulseDate('2026-11-10T10:00:00Z'), /17[.:]00.*WIB/);
  assert.equal(pulseDate(null), 'Waktu tidak tersedia');
  assert.equal(pulseDate('not-a-date'), 'Waktu tidak tersedia');
});

test('a publish time of exactly midnight UTC is a date without a clock, never "07.00 WIB"', async () => {
  const { hasClock, pulseDate } = await import('./pulseData.js');
  assert.equal(hasClock('2026-11-12T00:00:00'), false);
  assert.equal(hasClock('2026-11-12T00:00:00.000000Z'), false);
  assert.equal(hasClock('2026-11-12 00:00:00'), false);
  assert.equal(hasClock('2026-11-12'), false);
  assert.equal(hasClock('2026-11-12T00:00:01'), true);
  assert.equal(hasClock('2026-11-12T03:15:00Z'), true);
  assert.equal(hasClock('2026-11-12T07:00:00+07:00'), true, 'a stated zone and time is a real time');
  assert.equal(hasClock(null), false);
  assert.equal(pulseDate('2026-11-12T00:00:00'), '12 Nov 2026');
  assert.match(pulseDate('2026-11-12T03:15:00'), /^12 Nov 2026.+10\.15 WIB$/);
  assert.equal(pulseDate(''), 'Waktu tidak tersedia');
});

test('a calendar day is written the way the rest of the product writes dates', async () => {
  const { pulseDay } = await import('./pulseData.js');
  assert.equal(pulseDay('2026-11-08'), '8 Nov 2026');
  assert.equal(pulseDay('2026-11-14T03:00:00'), '14 Nov 2026');
  assert.equal(pulseDay(''), '');
  assert.equal(pulseDay('bukan tanggal'), 'bukan tanggal');
});
