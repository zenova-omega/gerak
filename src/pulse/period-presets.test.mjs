// "Today" for the period chips is the installation's day (day_v1), the same day a post published now is counted on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setZone, zone } from '../lib/pulseMeasures.js';
import { activePreset, wibDay } from './projectPeriodPresets.js';

test('the period chips end on today in the installation zone, not in a zone written by hand', () => {
  const realNow = Date.now, before = zone();
  Date.now = () => Date.parse('2026-11-15T15:30:00Z');   // 22.30 WIB on 15 Nov, 00.30 WIT on 16 Nov
  try {
    assert.equal(wibDay(), '2026-11-15');
    assert.equal(wibDay(6), '2026-11-09');
    setZone({ offset_minutes: 540, name: 'WIT' });
    assert.equal(wibDay(), '2026-11-16');
    assert.equal(wibDay(6), '2026-11-10');
    assert.equal(activePreset({ from: '2026-11-10', to: '2026-11-16' }), '7d');
  } finally { Date.now = realNow; setZone(before); }
});
