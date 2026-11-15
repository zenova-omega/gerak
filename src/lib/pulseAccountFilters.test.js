import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountPageSize, accountPlatforms, accountRanking, filterAccounts, followerIndex, isAccountFiltered, normalizePlatforms,
  pageOf, platformFacets, readAccountFilters, sortAccounts, togglePlatform, withFollowers, withoutAccountFilters, writeAccountFilters,
} from './pulseAccountFilters.js';

const rows = [
  { author: 'Kompas TV', platform: 'youtube', mentions: 4, engagement: 900 },
  { author: '@warga_satu', platform: 'x', mentions: 1, engagement: 1200 },
  { author: 'warga_dua', platform: 'x', mentions: 6, engagement: null },
  { author: 'Détik', platform: 'news', mentions: 9, engagement: null },
  { author: 'kreator.id', platform: 'instagram', mentions: 1, engagement: 1200 },
  { author: 'forum_kota', platform: 'reddit', mentions: 2, engagement: 0 },
];
const names = list => list.map(row => row.author);

test('follower counts come from the posts of the same account on the same platform', () => {
  const posts = [
    { author: 'warga_satu', platform: 'x', crawled_at: '2026-11-10T00:00:00Z', metrics: { author_followers: 500 } },
    { author: '@Warga_Satu', platform: 'x', crawled_at: '2026-11-12T00:00:00Z', metrics: { author_followers: 480 } },
    { author: 'warga_satu', platform: 'instagram', crawled_at: '2026-11-13T00:00:00Z', metrics: { author_followers: 9 } },
    { author: 'kreator.id', platform: 'instagram', metrics: { author_followers: 70 } },
    { author: 'kreator.id', platform: 'instagram', metrics: { author_followers: 90 } },
    { author: 'warga_dua', platform: 'x', metrics: { author_followers: null } },
    { author: 'forum_kota', platform: 'reddit', metrics: { author_followers: '12' } },
    { author: 'Kompas TV', platform: 'youtube', metrics: {} },
  ];
  const index = followerIndex(posts);
  assert.equal(index.get('x|warga_satu').count, 480, 'the most recently collected post wins');
  assert.equal(index.get('instagram|kreator.id').count, 90, 'without a collection time the larger figure wins');
  const filled = withFollowers(rows, posts);
  assert.deepEqual(filled.map(row => row.followers), [null, 480, null, null, 90, null]);
  assert.equal(rows[1].followers, undefined, 'input rows are not changed');
  assert.deepEqual(withFollowers(rows, null).map(row => row.followers), [null, null, null, null, null, null]);
});

test('platform chips list only platforms with accounts, social first', () => {
  assert.deepEqual(accountPlatforms(rows), ['x', 'instagram', 'youtube', 'reddit', 'news']);
  assert.deepEqual(accountPlatforms([{ author: 'a' }, { author: 'b', platform: 'zeta' }, { author: 'c', platform: 'web' }]), ['web', 'unknown', 'zeta']);
});

test('several platforms can be on at once; none or all of them means all', () => {
  const available = accountPlatforms(rows);
  assert.deepEqual(togglePlatform(null, 'news', available), ['news']);
  assert.deepEqual(togglePlatform(['news'], 'x', available), ['x', 'news']);
  assert.equal(togglePlatform(['news'], 'news', available), null);
  assert.equal(togglePlatform(['x', 'instagram', 'youtube', 'reddit'], 'news', available), null);
  assert.deepEqual(normalizePlatforms(['facebook', 'x', 'x'], available), ['x']);
  assert.equal(normalizePlatforms(['facebook'], available), null);
  assert.equal(normalizePlatforms('x', available), null);
});

test('filtering combines platforms with every word of the search', () => {
  assert.deepEqual(names(filterAccounts(rows, { platforms: ['x', 'news'] })), ['@warga_satu', 'warga_dua', 'Détik']);
  assert.deepEqual(names(filterAccounts(rows, { query: '  WARGA ' })), ['@warga_satu', 'warga_dua']);
  assert.deepEqual(names(filterAccounts(rows, { query: '@warga_satu' })), ['@warga_satu']);
  assert.deepEqual(names(filterAccounts(rows, { query: 'tv kompas' })), ['Kompas TV']);
  assert.deepEqual(names(filterAccounts(rows, { query: 'detik' })), ['Détik'], 'accents do not block a match');
  assert.deepEqual(names(filterAccounts(rows, { query: 'berita' })), ['Détik'], 'the Indonesian platform name matches');
  assert.deepEqual(names(filterAccounts(rows, { platforms: ['x'], query: 'kompas' })), []);
  assert.equal(filterAccounts(rows).length, rows.length);
});

test('sorting puts unknown figures last and breaks ties with the other figures', () => {
  assert.deepEqual(names(sortAccounts(rows, 'engagement')), ['@warga_satu', 'kreator.id', 'Kompas TV', 'forum_kota', 'Détik', 'warga_dua']);
  assert.deepEqual(names(sortAccounts(rows, 'mentions')), ['Détik', 'warga_dua', 'Kompas TV', 'forum_kota', '@warga_satu', 'kreator.id']);
  const followed = rows.map((row, index) => ({ ...row, followers: [null, 0, 300, null, 300, null][index] }));
  assert.deepEqual(names(sortAccounts(followed, 'followers')), ['kreator.id', 'warga_dua', '@warga_satu', 'Kompas TV', 'forum_kota', 'Détik']);
  assert.deepEqual(names(sortAccounts(rows, 'nonsense')), names(sortAccounts(rows, 'engagement')));
  assert.equal(rows[0].author, 'Kompas TV', 'input order is kept');
});

test('ranking numbers follow the selected platforms, not the search', () => {
  const all = accountRanking(rows, {});
  assert.deepEqual(all.rows.map(row => row.rank), [1, 2, 3, 4, null, null], 'no interaction figure, no rank');
  assert.deepEqual([all.scoped, all.total], [6, 6]);
  const onX = accountRanking(rows, { platforms: ['x'], sort: 'mentions' });
  assert.deepEqual(onX.rows.map(row => [row.author, row.rank]), [['warga_dua', 1], ['@warga_satu', 2]]);
  const searched = accountRanking(rows, { query: 'kompas' });
  assert.deepEqual(searched.rows.map(row => [row.author, row.rank]), [['Kompas TV', 3]]);
  assert.deepEqual([searched.scoped, searched.total], [6, 6]);
  assert.deepEqual(accountRanking(rows, { sort: 'followers' }).rows.map(row => row.rank), [null, null, null, null, null, null]);
  assert.deepEqual(accountRanking(undefined), { rows: [], scoped: 0, total: 0 });
});

test('chip counts follow the search and keep platforms without a match', () => {
  assert.deepEqual(platformFacets(rows), [{ platform: 'x', count: 2 }, { platform: 'instagram', count: 1 }, { platform: 'youtube', count: 1 }, { platform: 'reddit', count: 1 }, { platform: 'news', count: 1 }]);
  assert.deepEqual(platformFacets(rows, 'warga').map(facet => facet.count), [2, 0, 0, 0, 0]);
});

test('the table shows fifty rows at a time and says how many remain', () => {
  const many = Array.from({ length: 627 }, (_, index) => ({ author: 'akun_' + index }));
  assert.equal(accountPageSize, 50);
  assert.deepEqual([pageOf(many).visible.length, pageOf(many).remaining, pageOf(many).next], [50, 577, 50]);
  assert.deepEqual([pageOf(many, 12).visible.length, pageOf(many, 12).remaining, pageOf(many, 12).next], [600, 27, 27]);
  assert.deepEqual([pageOf(many, 13).visible.length, pageOf(many, 13).remaining, pageOf(many, 13).next], [627, 0, 0]);
  assert.deepEqual([pageOf(many.slice(0, 7)).visible.length, pageOf(many.slice(0, 7)).remaining], [7, 0]);
  assert.equal(pageOf(many, 0).visible.length, 50);
});

test('only a platform or a search counts as a filter', () => {
  assert.equal(isAccountFiltered({ platforms: null, query: '  ', sort: 'followers' }), false);
  assert.equal(isAccountFiltered({ platforms: ['x'] }), true);
  assert.equal(isAccountFiltered({ query: 'a' }), true);
});

test('filters round-trip through the URL beside the other query keys', () => {
  const written = writeAccountFilters('topic=t1&platforms=x&sentiment=negative', { platforms: ['news', 'x'], query: ' kompas tv ', sort: 'followers' });
  assert.equal(written.toString(), 'topic=t1&platforms=x&sentiment=negative&acc_platforms=x%2Cnews&acc_find=kompas+tv&acc_sort=followers');
  assert.deepEqual(readAccountFilters(written), { platforms: ['x', 'news'], query: 'kompas tv', sort: 'followers' });
  assert.deepEqual(readAccountFilters(written, ['x', 'instagram']), { platforms: ['x'], query: 'kompas tv', sort: 'followers' }, 'a platform the data lacks is dropped');
  assert.equal(writeAccountFilters(written, { sort: 'mentions' }).get('acc_platforms'), 'x,news', 'a patch keeps the other filters');
  assert.equal(writeAccountFilters(written, { platforms: null, query: '', sort: 'engagement' }).toString(), 'topic=t1&platforms=x&sentiment=negative', 'defaults leave the URL');
  assert.equal(withoutAccountFilters(written).toString(), 'topic=t1&platforms=x&sentiment=negative');
  assert.deepEqual(readAccountFilters('acc_sort=drop&acc_platforms=,,'), { platforms: null, query: '', sort: 'engagement' });
  assert.deepEqual(readAccountFilters(''), { platforms: null, query: '', sort: 'engagement' });
});
