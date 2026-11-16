import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RULES, setZone, zone, readTime, hasClock, localDay, localTime, weekStart, inPeriod, reported, interactions,
  sharesTotal, contentShares, interactionsTotal, byInteractions, byFirstPublished, tone, toneShares, sampleToneShares, accountKey, accountName, postAccount, accountCount, postMeasures,
} from './pulseMeasures.js';

const CASES = JSON.parse(readFileSync(new URL('../../shared/pulse-measures.cases.json', import.meta.url), 'utf8'));
const DEFAULT_ZONE = CASES.zone[0].out;
const EXPECTED_RULES = [
  ['day', 'day_v1'], ['clock', 'clock_v1'], ['interactions', 'interactions_v1'],
  ['shares_total', 'shares_total_v1'], ['content_shares', 'content_shares_v1'],
  ['tone_share', 'tone_share_v2'], ['account', 'account_v1'],
];
const each = (name, check) => {
  for (const [index, item] of CASES[name].entries()) test(`${name}: ${item.note || index}`, () => check(item));
};

test('rule names and versions', () => {
  assert.deepEqual(Object.entries(RULES), EXPECTED_RULES);
});

test('zone: the default before the server sends one, and a zone the server sends', () => {
  assert.deepEqual(zone(), DEFAULT_ZONE);
  setZone({ offset_minutes: 540, name: 'WIT' });
  assert.deepEqual(zone(), { offset_minutes: 540, name: 'WIT' });
  setZone({ offset_minutes: 'x', name: 'bad' });
  assert.deepEqual(zone(), { offset_minutes: 540, name: 'WIT' });
  setZone(DEFAULT_ZONE);
});

each('zone', item => {
  if (item.in === null) return;
  setZone(DEFAULT_ZONE);
  try {
    setZone(item.in);
    assert.deepEqual(zone(), item.out ?? DEFAULT_ZONE);
  } finally { setZone(DEFAULT_ZONE); }
});
each('read_time', item => assert.equal(readTime(item.in), item.out));
each('has_clock', item => assert.equal(hasClock(item.in), item.out));
each('day', item => {
  setZone({ ...DEFAULT_ZONE, offset_minutes: item.offset ?? DEFAULT_ZONE.offset_minutes });
  try { assert.equal(localDay(item.in), item.out); } finally { setZone(DEFAULT_ZONE); }
});
each('week_start', item => assert.equal(weekStart(item.in), item.out));
each('local_time', item => {
  setZone({ ...DEFAULT_ZONE, offset_minutes: item.offset ?? DEFAULT_ZONE.offset_minutes });
  try {
    const value = localTime(item.in);
    assert.equal(value === null ? null : new Date(value).toISOString().slice(0, 19), item.out);
  } finally { setZone(DEFAULT_ZONE); }
});
each('in_period', item => {
  setZone({ ...DEFAULT_ZONE, offset_minutes: item.offset ?? DEFAULT_ZONE.offset_minutes });
  try { assert.equal(inPeriod(item.in, item.from, item.to), item.out); } finally { setZone(DEFAULT_ZONE); }
});
each('reported', item => assert.equal(reported(item.in), item.out));
each('interactions', item => assert.equal(interactions(item.in), item.out));
each('interactions_total', item => assert.deepEqual(interactionsTotal(item.in.map(metrics => ({ metrics }))), item.out));
each('shares_total', item => assert.equal(sharesTotal(item.in.map(metrics => ({ metrics }))), item.out));
each('content_shares', item => assert.equal(contentShares(item.in.map(metrics => ({ metrics }))), item.out));
each('interaction_order', item => assert.deepEqual([...item.in].sort(byInteractions).map(post => post.id), item.out));
each('first_order', item => assert.deepEqual([...item.in].sort(byFirstPublished).map(post => post.id), item.out));
each('tone', item => assert.equal(tone({ metrics: item.in }), item.out));
each('tone_shares', item => assert.deepEqual(toneShares(item.in), item.out));
each('sample_tone_shares', item => assert.deepEqual(sampleToneShares(item.in), item.out));
each('account', item => assert.equal(accountKey(item.in), item.out));
each('account_name', item => assert.equal(accountName(item.in), item.out));
each('post_account', item => assert.equal(postAccount(item.in), item.out));
each('account_count', item => assert.equal(accountCount(item.in), item.out));

test('postMeasures computes a post\'s own figures, or reads the ones the server sent', () => {
  const post = { published_at: '2026-11-10T17:00:00', platform: 'x', author: '@Okezonenews', metrics: { likes: 2, comments: '1', sentiment: 'neutral' } };
  assert.deepEqual(postMeasures(post), { day: '2026-11-11', clock: true, interactions: 3, account: 'x:okezonenews', tone: 'neutral' });
  const sent = { day: '2026-01-01', clock: false, interactions: 9, account: 'x:a', tone: 'positive' };
  assert.equal(postMeasures({ ...post, measures: sent }), sent);
  assert.deepEqual(postMeasures({ platform: 'news' }), { day: null, clock: false, interactions: null, account: null, tone: 'unknown' });
});

test('byInteractions reads the interactions the server sent', () => {
  const posts = [
    { id: 'a', published_at: '2026-11-10T08:00:00', metrics: { likes: 1 } },
    { id: 'b', published_at: '2026-11-10T08:00:00', metrics: {}, measures: { interactions: 7 } },
  ];
  assert.deepEqual(posts.sort(byInteractions).map(post => post.id), ['b', 'a']);
});
