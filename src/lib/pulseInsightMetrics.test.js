import test from 'node:test';
import assert from 'node:assert/strict';
import { netSentiment, netSentimentChange, narrativeBubbles, accountConcentration } from './pulseInsightMetrics.js';

const post = (id, sentiment, likes, author = 'a', platform = 'x') => ({ id, author, platform, metrics: { ...(sentiment ? { sentiment: { label: sentiment, confidence: 0.9 } } : {}), ...(likes == null ? {} : { likes }) } });

test('net sentiment is positive minus negative over the analysed posts, and unknown posts stay out of the base', () => {
  assert.equal(netSentiment({ positive: 6, neutral: 2, negative: 2, unknown: 90 }), 40);
  assert.equal(netSentiment({ positive: 0, neutral: 0, negative: 4 }), -100);
  assert.equal(netSentiment({ positive: 0, neutral: 0, negative: 0, unknown: 5 }), null, 'nothing analysed is no score, not zero');
  assert.equal(netSentiment(), null);
});

test('net sentiment change is the move of the positive share minus the move of the negative share', () => {
  const week = (positive, negative) => Array.from({ length: 7 }, () => ({ positive, neutral: 0, negative }));
  assert.equal(netSentimentChange([...week(1, 3), ...week(3, 1)]).delta, 100);
  assert.equal(netSentimentChange([...week(5, 5), ...week(10, 10)]).delta, 0, 'more volume at the same mix is no change');
  assert.equal(netSentimentChange([...week(0, 0), ...week(1, 1)]), null);
});

test('a narrative bubble is its posts, its net sentiment and the interactions its sources reported', () => {
  const narratives = [
    { id: 'n1', title: 'Satu', posts: [post('1', 'negative', 10, 'a'), post('2', 'negative', 5, 'b'), post('3', 'positive', null, 'a')] },
    { id: 'n2', title: 'Belum dianalisis', posts: [post('4', null, 3), post('5', null, 2)] },
    { id: 'n3', title: 'Tanpa angka', posts: [post('6', 'positive', null), post('7', 'positive', null)] },
  ];
  const { points, unrated } = narrativeBubbles(narratives);
  assert.equal(unrated, 1, 'a narrative with no analysed post is counted, not drawn at zero');
  assert.deepEqual(points.map(point => [point.id, point.count, point.accounts, Math.round(point.net), point.interactions]), [['n1', 3, 2, -33, 15], ['n3', 2, 1, 100, null]]);
});

test('concentration is the share of posts by the top three accounts and of interactions by the top three posts', () => {
  const posts = [post('1', null, 100, 'a'), post('2', null, 50, 'a'), post('3', null, 10, 'A'), post('4', null, 5, 'b'), post('5', null, 5, 'c'), post('6', null, 5, 'd'), post('7', null, null, 'e'), post('8', null, 5, '', 'news')];
  const result = accountConcentration(posts);
  assert.equal(result.accounts, 5, 'the same name in other capitals is one account');
  assert.equal(result.posts, 7, 'a post without an author is not counted as anyone');
  assert.deepEqual(result.topAccounts.map(row => [row.author, row.count]), [['a', 3], ['b', 1], ['c', 1]]);
  assert.ok(Math.abs(result.topAccountShare - 5 / 7) < 1e-9);
  assert.equal(result.interactions, 180);
  assert.deepEqual(result.topPosts.map(row => row.id), ['1', '2', '3']);
  assert.ok(Math.abs(result.topPostShare - 160 / 180) < 1e-9);
  const none = accountConcentration([post('1', null, null, '')]);
  assert.equal(none.topAccountShare, null);
  assert.equal(none.topPostShare, null);
});

test('a diverging bar splits neutral across the centre and says nothing when nothing is analysed', async () => {
  const { divergingSplit, divergingScale } = await import('./pulseInsightMetrics.js');
  const split = divergingSplit({ positive: 2, neutral: 4, negative: 4, unknown: 50 });
  assert.deepEqual(split.left.map(row => [row.key, row.share]), [['neutral', 20], ['negative', 40]]);
  assert.deepEqual(split.right.map(row => [row.key, row.share]), [['neutral', 20], ['positive', 20]]);
  assert.equal(split.leftTotal, 60);
  assert.equal(split.rightTotal, 40);
  assert.equal(split.net, -20);
  assert.equal(divergingSplit({ unknown: 9 }), null);
  assert.equal(divergingScale([split, null, divergingSplit({ positive: 1 })]), 100, 'one scale for every bar');
});
