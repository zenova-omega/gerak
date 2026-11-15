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

test('content shared by reposters counts the original post once', async () => {
  const { contentShares } = await import('./pulseEngagement.js');
  const repost = shares => ({ metrics: { likes: 0, comments: 0, shares: 0, repost: true, original_shares: shares } });
  const original = { metrics: { likes: 900, comments: 40, shares: 36254, repost: false } };
  assert.equal(contentShares([repost(7046), repost(7060), repost(36254)]), 36254, 'the original was not collected: its largest observed count');
  assert.equal(contentShares([original, repost(7046), repost(36254)]), 36254, 'the original was collected: nothing is added twice');
  assert.equal(contentShares([original, { metrics: { shares: 10 } }]), 36264, 'two posts of their own add up');
  assert.equal(contentShares([{ metrics: {} }, { metrics: { likes: 3 } }]), null, 'no share figure at all stays unknown');
  assert.equal(contentShares([{ metrics: { shares: 0 } }]), 0);
});
