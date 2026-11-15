import test from 'node:test';
import assert from 'node:assert/strict';
import { trendSeries, trendUnitsAvailable, bucketLabel, bucketPosts, platformTrend } from './pulseTrendSeries.js';

const post = (published_at, sentiment, metrics = {}) => ({ id: published_at + (sentiment || ''), published_at, platform: 'x',
  metrics: { ...metrics, ...(sentiment ? { sentiment: { label: sentiment } } : {}) } });

test('days run without gaps from the first to the last post, counted in WIB', () => {
  const rows = trendSeries([
    post('2026-11-03T18:30:00Z', 'negative', { likes: 10, comments: 5 }),   // 4 Nov 01:30 WIB
    post('2026-11-04T01:00:00Z', 'positive', { likes: 1 }),                 // 4 Nov WIB
    post('2026-11-06T05:00:00Z', null),                                     // 6 Nov WIB, not analysed, no metrics
  ], 'day');
  assert.deepEqual(rows.map(row => row.key), ['2026-11-04', '2026-11-05', '2026-11-06']);
  assert.deepEqual(rows.map(row => row.posts), [2, 0, 1]);
  assert.deepEqual(rows[0], { key: '2026-11-04', from: '2026-11-04', to: '2026-11-04', posts: 2, interactions: 16,
    positive: 1, neutral: 0, negative: 1, unknown: 0 });
  assert.equal(rows[2].unknown, 1);
  assert.equal(rows[2].interactions, 0);
});

test('weeks start on Monday and never claim days outside the data', () => {
  const rows = trendSeries([post('2026-11-05T05:00:00Z', 'negative'), post('2026-11-10T05:00:00Z', 'negative'), post('2026-11-18T05:00:00Z', 'positive')], 'week');
  // 5 Nov 2026 is a Thursday: its week is Mon 2 to Sun 8, shown from the first day that has data.
  assert.deepEqual(rows.map(row => [row.from, row.to, row.posts]), [['2026-11-05', '2026-11-08', 1], ['2026-11-09', '2026-11-15', 1], ['2026-11-16', '2026-11-18', 1]]);
  assert.equal(rows[1].key, '2026-11-09');
});

test('months follow the calendar', () => {
  const rows = trendSeries([post('2026-10-30T05:00:00Z', 'negative'), post('2026-11-02T05:00:00Z', 'negative'), post('2026-12-01T05:00:00Z', 'neutral')], 'month');
  assert.deepEqual(rows.map(row => [row.from, row.to, row.posts]), [['2026-10-30', '2026-10-31', 1], ['2026-11-01', '2026-11-30', 1], ['2026-12-01', '2026-12-01', 1]]);
});

test('a chosen period stretches the line to its edges, so quiet days at either end show as zero', () => {
  const rows = trendSeries([post('2026-11-05T05:00:00Z', 'negative')], 'day', { from: '2026-11-03', to: '2026-11-06' });
  assert.deepEqual(rows.map(row => [row.key, row.posts]), [['2026-11-03', 0], ['2026-11-04', 0], ['2026-11-05', 1], ['2026-11-06', 0]]);
});

test('posts without a publication time are left out, and no posts means no line', () => {
  assert.deepEqual(trendSeries([{ id: 'a', metrics: {} }], 'day'), []);
  assert.deepEqual(trendSeries([], 'week'), []);
});

test('a unit is offered only when it gives at least two points', () => {
  const sameWeek = [post('2026-11-03T05:00:00Z'), post('2026-11-05T05:00:00Z')];
  assert.deepEqual(trendUnitsAvailable(sameWeek), { day: true, week: false, month: false });
  const twoWeeks = [...sameWeek, post('2026-11-12T05:00:00Z')];
  assert.deepEqual(trendUnitsAvailable(twoWeeks), { day: true, week: true, month: false });
  assert.deepEqual(trendUnitsAvailable([post('2026-11-03T05:00:00Z')]), { day: false, week: false, month: false });
});

test('a bucket is named the way a reader says it', () => {
  assert.equal(bucketLabel({ from: '2026-11-04', to: '2026-11-04' }, 'day'), '4 Nov');
  assert.equal(bucketLabel({ from: '2026-11-09', to: '2026-11-15' }, 'week'), '9–15 Nov');
  assert.equal(bucketLabel({ from: '2026-10-27', to: '2026-11-02' }, 'week'), '27 Okt – 2 Nov');
  assert.equal(bucketLabel({ from: '2026-11-01', to: '2026-11-30' }, 'month'), 'Nov 2026');
});

test('the posts behind a bucket are the ones published inside it', () => {
  const posts = [post('2026-11-08T16:59:00Z'), post('2026-11-08T17:00:00Z'), post('2026-11-15T17:00:00Z')];   // 8 Nov 23:59, 9 Nov 00:00, 16 Nov 00:00 WIB
  assert.deepEqual(bucketPosts(posts, { from: '2026-11-09', to: '2026-11-15' }).map(row => row.published_at), ['2026-11-08T17:00:00Z']);
});

test('each platform gets its own line over the same buckets, busiest first, with its share and busiest bucket', () => {
  const on = (platform, published_at) => ({ id: platform + published_at, platform, published_at, metrics: {} });
  const posts = [on('x', '2026-11-03T05:00:00Z'), on('x', '2026-11-03T06:00:00Z'), on('x', '2026-11-05T05:00:00Z'),
    on('tiktok', '2026-11-04T05:00:00Z'), on(undefined, '2026-11-12T05:00:00Z'), { id: 'undated', platform: 'tiktok', metrics: {} }];
  const lines = platformTrend(posts, 'day');
  assert.deepEqual(lines.map(line => [line.platform, line.total]), [['x', 3], ['other', 1], ['tiktok', 1]]);
  assert.equal(lines[0].share, 0.6, 'a share of the dated posts: the undated one is in no line');
  assert.deepEqual(lines[0].rows.map(row => row.posts), [2, 0, 1, 0, 0, 0, 0, 0, 0, 0], 'quiet days are zero, on the same days as the total');
  assert.deepEqual(lines[0].rows.map(row => row.key), trendSeries(posts, 'day').map(row => row.key));
  assert.deepEqual(lines[0].peak, { key: '2026-11-03', from: '2026-11-03', to: '2026-11-03', posts: 2 });
  // Weeks: the lines add up to the total line, bucket by bucket.
  const weeks = platformTrend(posts, 'week'), total = trendSeries(posts, 'week');
  assert.deepEqual(total.map((row, index) => weeks.reduce((sum, line) => sum + line.rows[index].posts, 0)), total.map(row => row.posts));
  assert.deepEqual(platformTrend([{ id: 'a', metrics: {} }], 'day'), []);
});

test('weeks run Monday to Sunday and a post written with any zone lands on its day_v1 day', () => {
  const rows = trendSeries([
    { id: 'sun', published_at: '2026-11-15T23:30:00+0700', platform: 'x', metrics: {} },   // Sunday 15 Nov
    { id: 'mon', published_at: '2026-11-15T17:00:00', platform: 'x', metrics: {} },         // Monday 16 Nov in WIB
  ], 'week');
  assert.deepEqual(rows.map(row => [row.from, row.to, row.posts]), [['2026-11-15', '2026-11-15', 1], ['2026-11-16', '2026-11-16', 1]]);
});
