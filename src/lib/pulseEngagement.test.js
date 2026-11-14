import test from 'node:test';
import assert from 'node:assert/strict';
import { engagementSummary, percentLabel } from './pulseEngagement.js';

test('interaction detail keeps unknown metrics unknown and views out of the total', () => {
  const one = engagementSummary({ likes: 60, comments: 30, shares: 10, views: 2000 });
  assert.equal(one.interactions, 100);
  assert.equal(one.activeShare, 0.4);
  assert.equal(one.rate, 0.05);
  const missing = engagementSummary({ likes: null, comments: null, shares: 12, views: null });
  assert.equal(missing.interactions, 12);
  assert.equal(missing.activeShare, null, 'no likes observed, so no flattering 100%');
  assert.equal(missing.rate, null);
  assert.equal(engagementSummary({}).interactions, null);
});

test('project summary counts coverage per metric and rates only posts with views', () => {
  const s = engagementSummary([{ metrics: { likes: 10, comments: 5, shares: 5, views: 100 } }, { metrics: { likes: 20 } }, {}]);
  assert.deepEqual(s.totals, { likes: 30, comments: 5, shares: 5, views: 100 });
  assert.deepEqual(s.coverage, { likes: 2, comments: 1, shares: 1, views: 1 });
  assert.equal(s.interactions, 40);
  assert.equal(s.activeShare, 0.25);
  assert.equal(s.rate, 0.2);
  assert.equal(s.ratePosts, 1);
  assert.equal(percentLabel(0.256, 1), '25,6%');
  assert.equal(percentLabel(null), null);
});
