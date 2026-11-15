import test from 'node:test';
import assert from 'node:assert/strict';
import { recentChange, recentShareChange, deltaIntent } from './pulseTrend.js';

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

test('share change compares a tone\'s share of analysed posts, so more volume alone is not a rise', () => {
  const week = (positive, negative) => Array.from({ length: 7 }, () => ({ positive, neutral: 0, negative }));
  // Volume doubles, the mix stays 50/50: no change in share (counts would have said +100%).
  const doubled = recentShareChange([...week(5, 5), ...week(10, 10)], 'negative');
  assert.equal(doubled.delta, 0);
  assert.equal(doubled.days, 7);
  // Negative goes from 25% to 50% of the analysed posts.
  assert.equal(recentShareChange([...week(3, 1), ...week(1, 1)], 'negative').delta, 25);
  assert.equal(recentShareChange([...week(3, 1), ...week(1, 1)], 'positive').delta, -25);
  // Nothing analysed in one window, or a short series, or an unknown key: no figure rather than zero.
  assert.equal(recentShareChange([...week(0, 0), ...week(1, 1)], 'negative'), null);
  assert.equal(recentShareChange([{ positive: 1, neutral: 0, negative: 0 }], 'positive'), null);
  assert.equal(recentShareChange(week(1, 1), 'unknown'), null);
});
