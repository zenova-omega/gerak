import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WARMUP_SECONDS, warmupRows, warmupSummary, warmupText } from './warmupState.js';

const progress = { finished: false, platforms: {
  news: { state: 'done', fetched: 640, ingested: 600, stopped: null },
  x: { state: 'running', fetched: 1200, ingested: 900, stopped: null },
  youtube: { state: 'done', fetched: 0, ingested: 0, stopped: 'access_or_quota_restricted' },
} };

test('each chosen platform gets a row, in a fixed order, and an unlisted one is waiting', () => {
  const rows = warmupRows(['youtube', 'tiktok', 'x', 'news'], progress);
  assert.deepEqual(rows.map(row => [row.platform, row.state, row.fetched]),
    [['news', 'done', 640], ['x', 'running', 1200], ['tiktok', 'waiting', 0], ['youtube', 'stopped', 0]]);
  assert.deepEqual(warmupRows(['news'], null), [{ platform: 'news', state: 'waiting', fetched: 0 }]);
});

test('the project opens when every source has settled, when the pull is finished, or when the time is up', () => {
  const rows = warmupRows(['news', 'x', 'youtube'], progress);
  const early = warmupSummary(rows, 72);
  assert.deepEqual([early.posts, early.settled, early.total, early.clock, early.ready], [1840, 2, 3, '1.12', false]);
  assert.equal(early.share, 72 / WARMUP_SECONDS);
  assert.equal(warmupSummary(rows, WARMUP_SECONDS).ready, true);
  assert.equal(warmupSummary(rows, 500).clock, '3.00');
  assert.equal(warmupSummary(rows, 10, true).ready, true);
  assert.equal(warmupSummary(warmupRows(['news'], progress), 5).ready, true);
  assert.equal(warmupSummary([], 5).ready, false);                 // nothing chosen yet is not "all settled"
});

test('a row says what is happening in plain words, without naming where the data comes from', () => {
  const [news, x, tiktok, youtube] = warmupRows(['youtube', 'tiktok', 'x', 'news'], progress);
  const count = value => value.toLocaleString('id-ID');
  assert.equal(warmupText(news, count), 'Selesai · 640 posting');
  assert.equal(warmupText(x, count), 'Mengambil… 1.200 posting sejauh ini');
  assert.equal(warmupText(tiktok, count), 'Menunggu giliran');
  assert.equal(warmupText(youtube, count), 'Belum berhasil; dicoba lagi sesuai jadwal');
  for (const row of [news, x, tiktok, youtube]) assert.doesNotMatch(warmupText(row, count), /xpoz|provider|kuota|quota/i);
});
