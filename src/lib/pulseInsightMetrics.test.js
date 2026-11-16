import test from 'node:test';
import assert from 'node:assert/strict';
import { netSentiment, netSentimentChange, narrativeBubbles, accountConcentration } from './pulseInsightMetrics.js';

const post = (id, sentiment, likes, author = 'a', platform = 'x') => ({ id, author, platform, metrics: { ...(sentiment ? { sentiment: { label: sentiment, confidence: 0.9 } } : {}), ...(likes == null ? {} : { likes }) } });

test('net sentiment is positive minus negative over every post (tone_share_v2), the ones not analysed yet included', () => {
  assert.equal(netSentiment({ positive: 6, neutral: 2, negative: 2, unknown: 90 }), 4, 'of 100 posts (was +40 of the 10 analysed)');
  assert.equal(netSentiment({ positive: 3, negative: 1, unknown: 4 }), 25, 'the same as the positive share minus the negative share');
  assert.equal(netSentiment({ positive: 0, neutral: 0, negative: 4 }), -100);
  assert.equal(netSentiment({ positive: 0, neutral: 0, negative: 0, unknown: 5 }), null, 'nothing analysed is no score, not zero');
  assert.equal(netSentiment(), null);
});

test('net sentiment change is the move of the positive share minus the move of the negative share', () => {
  const week = (positive, negative, unknown = 0) => Array.from({ length: 7 }, () => ({ positive, neutral: 0, negative, unknown }));
  assert.equal(netSentimentChange([...week(1, 3), ...week(3, 1)]).delta, 100);
  assert.equal(netSentimentChange([...week(5, 5), ...week(10, 10)]).delta, 0, 'more volume at the same mix is no change');
  assert.equal(netSentimentChange([...week(1, 1, 2), ...week(2, 0, 2)]).delta, 50, 'shares of every post: net 0 of 4, then +50 of 4');
  assert.equal(netSentimentChange([...week(0, 0), ...week(1, 1)]), null);
  assert.equal(netSentimentChange([...week(0, 0, 3), ...week(1, 1)]), null, 'a window where nothing is analysed has no reading');
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

test('a diverging bar splits neutral across the centre, in shares of every post, and says nothing when nothing is analysed', async () => {
  const { divergingSplit, divergingScale } = await import('./pulseInsightMetrics.js');
  const split = divergingSplit({ positive: 2, neutral: 4, negative: 4, unknown: 10 });
  assert.deepEqual(split.left.map(row => [row.key, row.share]), [['neutral', 10], ['negative', 20]]);
  assert.deepEqual(split.right.map(row => [row.key, row.share]), [['neutral', 10], ['positive', 10]]);
  assert.equal(split.leftTotal, 30, 'the waiting half of the platform is not drawn, so its bar is shorter');
  assert.equal(split.rightTotal, 20);
  assert.equal(split.net, -10);
  assert.equal(divergingSplit({ unknown: 9 }), null);
  assert.equal(divergingScale([split, null, divergingSplit({ positive: 1 })]), 100, 'one scale for every bar');
});

// Part 1 of the calculation dictionary: this file reads a post's tone, interactions and account through
// pulseMeasures.js, and concentration is the reading of pulseReadings.js.
test('a bubble counts accounts by the one account rule, and reads interactions the way every page does', () => {
  const group = { id: 'n', title: 'Satu', posts: [
    { id: '1', platform: 'x', author: '@Budi', metrics: { sentiment: 'negative', likes: '4' } },
    { id: '2', platform: 'x', author: 'budi', metrics: { sentiment: { label: 'negative' }, likes: 1 } },
    { id: '3', platform: 'instagram', author: 'budi', metrics: { sentiment: { label: ' Positive ' }, author_id: 9 } },
    { id: '4', platform: 'x', author: '', metrics: { sentiment: 'negative' } },
  ] };
  const [point] = narrativeBubbles([group]).points;
  assert.equal(point.accounts, 2, 'one X account written two ways, one Instagram account; a post without an author is nobody');
  assert.equal(point.interactions, 5, 'a count the source sent as digits is a count');
  assert.equal(Math.round(point.net), -50, 'a label stored as plain text, or with spaces and capitals, is still a tone');
});

test('a post that carries its own figures is read from them', () => {
  const sent = { day: null, clock: false, interactions: 40, account: 'x:someone', tone: 'positive' };
  const group = { id: 'n', title: 'Satu', posts: [{ id: '1', platform: 'x', author: 'a', metrics: {}, measures: sent }] };
  assert.deepEqual(narrativeBubbles([group]).points.map(point => [point.net, point.interactions, point.accounts]), [[100, 40, 1]]);
  assert.equal(accountConcentration(group.posts).interactions, 40);
});

test('concentration counts accounts by the one account rule and orders the top posts by the one ordering', () => {
  const insta = (id, author, likes) => ({ id, platform: 'instagram', author, metrics: { author_id: '77', likes } });
  const result = accountConcentration([
    insta('1', 'nama_lama', 5), insta('2', 'nama_baru', 5),
    { id: '3', platform: 'x', author: 'nama_baru', published_at: '2026-11-10T09:00:00', metrics: { likes: 7 } },
    { id: '4', platform: 'x', author: 'lain', published_at: '2026-11-10T08:00:00', metrics: { likes: '7' } },
  ]);
  assert.equal(result.accounts, 3, 'one Instagram account under two handles is one; the same name on X is another account');
  assert.deepEqual(result.topAccounts.map(row => [row.platform, row.count]), [['instagram', 2], ['x', 1], ['x', 1]]);
  assert.deepEqual(result.topPosts.map(row => row.id), ['4', '3', '1'], 'equal interactions: the earlier post first, then the id');
  assert.equal(result.interactions, 24);
  assert.equal(result.reading.posts.reach80.accounts, 3, 'the reading it was taken from comes with it');
});

test('a bubble says over how many posts its interactions are known, by the one total rule', () => {
  const group = { id: 'n', title: 'Dua', posts: [
    { id: '1', platform: 'x', author: 'a', metrics: { sentiment: 'negative', likes: 7 } },
    { id: '2', platform: 'news', author: 'b', metrics: { sentiment: 'negative' } },
    { id: '3', platform: 'x', author: 'c', metrics: { sentiment: 'negative', likes: 0 } },
  ] };
  const [point] = narrativeBubbles([group]).points;
  assert.deepEqual([point.interactions, point.interaction_posts], [7, 2], 'the news post reports nothing and is not counted; a reported 0 is');
  const [none] = narrativeBubbles([{ ...group, posts: [group.posts[1]] }]).points;
  assert.deepEqual([none.interactions, none.interaction_posts], [null, 0], 'unknown, never 0');
});
