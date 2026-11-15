import test from 'node:test';
import assert from 'node:assert/strict';
import { mentionKey, mentionPlatforms, topMentions } from './pulseTopMentions.js';

const post = (id, platform, tone, interactions, extra = {}) => ({
  id, platform, author: 'akun_' + id, text: 'Teks ' + id, published_at: '2026-11-10T01:00:00Z',
  metrics: { ...(tone ? { sentiment: { label: tone } } : {}), ...(interactions == null ? {} : { likes: interactions }) }, ...extra,
});

test('mentions come from every platform, news included, most interactions first by the one ordering', () => {
  const posts = [post('n1', 'news', 'negative', null, { title: 'Berita satu' }), post('x1', 'x', 'negative', 40), post('t1', 'tiktok', 'negative', 900),
    post('i1', 'instagram', 'negative', 40, { published_at: '2026-11-09T01:00:00Z' }), post('y1', 'youtube', 'positive', 5000)];
  const result = topMentions(posts, 'negative');
  // TikTok 900 first; the two 40s by earlier publication (Instagram on 9 Nov); news reports no interactions, so it comes last.
  assert.deepEqual(result.rows.map(row => row.id), ['t1', 'i1', 'x1', 'n1']);
  assert.deepEqual([result.analysed, result.matching], [5, 4]);
  assert.deepEqual(topMentions(posts, 'positive').rows.map(row => row.id), ['y1']);
});

test('only analysed posts count: an unanalysed post is never read as either tone, and the base counts analysed posts only', () => {
  const posts = [post('a', 'x', 'negative', 3), post('b', 'x', null, 99), post('c', 'x', 'neutral', 50)];
  const result = topMentions(posts, 'negative');
  assert.deepEqual(result.rows.map(row => row.id), ['a']);
  assert.deepEqual([result.analysed, result.matching], [2, 1]);
});

test('the platform filter lists one platform, news included; the choices are the platforms with analysed posts, largest first', () => {
  const posts = [post('n1', 'news', 'negative', null, { title: 'Berita' }), post('x1', 'x', 'negative', 4), post('x2', 'x', 'positive', 9),
    post('r1', 'reddit', 'negative', 2), post('t0', 'tiktok', null, 50)];
  assert.deepEqual(topMentions(posts, 'negative', { platform: 'news' }).rows.map(row => row.id), ['n1']);
  assert.deepEqual(topMentions(posts, 'negative', { platform: 'x' }).rows.map(row => row.id), ['x1']);
  assert.deepEqual([topMentions(posts, 'negative', { platform: 'x' }).analysed, topMentions(posts, 'negative', { platform: 'x' }).matching], [2, 1]);
  assert.deepEqual(topMentions(posts, 'negative', { platform: 'all' }).rows.map(row => row.id), ['x1', 'r1', 'n1']);
  // TikTok has a post but none analysed, so it is not a choice; ties by the platform's name.
  assert.deepEqual(mentionPlatforms(posts), [{ platform: 'x', count: 2 }, { platform: 'news', count: 1 }, { platform: 'reddit', count: 1 }]);
});

test('the same story or the same text is one row that says how many more carried it; the list is cut, all stays whole', () => {
  const posts = [post('a', 'news', 'negative', null, { title: 'Gibran diminta mundur - Kompas.com' }),
    post('b', 'news', 'negative', null, { title: 'Gibran diminta mundur - detikNews' }),
    post('c', 'x', 'negative', 10, { text: 'Mundur saja!' }), post('d', 'x', 'negative', 3, { text: 'mundur   saja' }),
    ...['e', 'f', 'g', 'h', 'i'].map((id, index) => post(id, 'x', 'negative', index + 1, { text: 'Teks lain ' + id }))];
  const result = topMentions(posts, 'negative', { limit: 3 });
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].id, 'c');
  assert.equal(result.rows[0].also, 1, 'the second post with the same text is counted on the first');
  assert.equal(result.all.length, 9, 'the drawer opens every matching post');
  const news = topMentions(posts, 'negative', { platform: 'news' }).rows;
  assert.deepEqual(news.map(row => [row.id, row.also]), [['a', 1]]);
  assert.equal(mentionKey(posts[0]), mentionKey(posts[1]));
});

test('nothing in scope gives empty lists, not an error', () => {
  assert.deepEqual(topMentions([], 'negative'), { tone: 'negative', platform: 'all', analysed: 0, matching: 0, rows: [], all: [] });
  assert.deepEqual(mentionPlatforms([]), []);
});
