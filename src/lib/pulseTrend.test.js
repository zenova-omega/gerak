import test from 'node:test';
import assert from 'node:assert/strict';
import { recentChange, deltaIntent } from './pulseTrend.js';

test('recent change compares the last days with the same number of days before', () => {
  assert.deepEqual(recentChange([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]), { delta: 7, percent: 100, days: 7 });
  assert.deepEqual(recentChange([0, 0, 3, 5]), { delta: 8, percent: null, days: 2 });
  assert.equal(recentChange([4]), null);
  assert.equal(recentChange([]), null);
});

test('a rise is bad for negative posts, good for positive posts, and neutral for volume', () => {
  assert.equal(deltaIntent('negative', 5), 'bad');
  assert.equal(deltaIntent('negative', -5), 'good');
  assert.equal(deltaIntent('positive', 5), 'good');
  assert.equal(deltaIntent('positive', -5), 'bad');
  assert.equal(deltaIntent('total', 5), 'neutral');
  assert.equal(deltaIntent('negative', 0), 'neutral');
});
