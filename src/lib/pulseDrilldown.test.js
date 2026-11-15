import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountPostsLink, postsEvidenceLink } from './pulseDrilldown.js';
import { filterPosts } from './pulsePostFilters.js';

test('daily evidence retains project period and clears unrelated evidence filters',()=>{
  const url=new URL(postsEvidenceLink('topic=p&from=2026-11-01&to=2026-11-30&author=Old&sentiment=positive',{day:'2026-11-11'}),'http://localhost');
  assert.equal(url.searchParams.get('from'),'2026-11-01');
  assert.equal(url.searchParams.get('day'),'2026-11-11');
  assert.equal(url.searchParams.has('author'),false);
  assert.equal(url.searchParams.has('sentiment'),false);
});

test('account drilldown uses exact account identity rather than matching longer names',()=>{
  const posts=[{id:'a',author:'kompas',platform:'instagram'},{id:'b',author:'kompastv',platform:'instagram'}];
  assert.deepEqual(filterPosts(posts,{exactAuthor:'kompas',platforms:['instagram']}).map(p=>p.id),['a']);
});

test('account drilldown preserves project and period but clears unrelated post filters', () => {
  const url = new URL(accountPostsLink('?topic=p1&from=2026-11-01&to=2026-11-11&alert=a&sentiment=negative', {author:'Tempo & News',platform:'instagram'}), 'http://localhost');
  assert.equal(url.pathname, '/pulse/posts');
  assert.equal(url.searchParams.get('topic'), 'p1');
  assert.equal(url.searchParams.get('from'), '2026-11-01');
  assert.equal(url.searchParams.get('to'), '2026-11-11');
  assert.equal(url.searchParams.get('author'), 'Tempo & News');
  assert.equal(url.searchParams.get('platform'), 'instagram');
  assert.equal(url.searchParams.has('sentiment'), false);
  assert.equal(url.searchParams.get('alert'), 'a');
});

test('a link to one day of posts drops a week or month picked earlier on the trend chart', () => {
  const link = postsEvidenceLink('topic=t1&day=2026-11-03&day_to=2026-11-09', { day: '2026-11-12' });
  assert.equal(new URL(link, 'http://x').searchParams.get('day'), '2026-11-12');
  assert.equal(new URL(link, 'http://x').searchParams.has('day_to'), false);
});

test('a link to a week or month of posts carries its first and last day', () => {
  const link = postsEvidenceLink('topic=t1&day=2026-11-01', { day: '2026-11-09', day_to: '2026-11-15' });
  const params = new URL(link, 'http://x').searchParams;
  assert.deepEqual([params.get('topic'), params.get('day'), params.get('day_to')], ['t1', '2026-11-09', '2026-11-15']);
});

test('a link to Posting can carry a province, and drops the one it came with', async () => {
  const { postsEvidenceLink } = await import('./pulseDrilldown.js');
  assert.equal(postsEvidenceLink('topic=p1&province=ID-JB&author=lama', { province: 'ID-JI' }), '/pulse/posts?topic=p1&province=ID-JI');
  assert.equal(postsEvidenceLink('topic=p1&province=ID-JB', { author: '@a', platform: 'x' }), '/pulse/posts?topic=p1&author=%40a&platform=x');
});

test('an account row opens its posts by its account_v1 key, whatever name each post carries', () => {
  const url = new URL(accountPostsLink('?topic=p1&author=lama&account=x%3Alain', { key: 'x:okezonenews', author: '@okezonenews', platform: 'x' }), 'http://localhost');
  assert.equal(url.searchParams.get('account'), 'x:okezonenews');
  assert.equal(url.searchParams.has('author'), false, 'the name alone would leave out the post written "Okezonenews"');
  assert.equal(url.searchParams.get('platform'), 'x');
  assert.equal(url.searchParams.get('topic'), 'p1');
  assert.equal(postsEvidenceLink('topic=p1&account=x%3Aa', { day: '2026-11-11' }), '/pulse/posts?topic=p1&day=2026-11-11', 'a stale account filter is cleared');
  const posts = [
    { id: '1', platform: 'x', author: 'Okezonenews', metrics: {} }, { id: '2', platform: 'x', author: '@okezonenews', metrics: {} },
    { id: '3', platform: 'youtube', author: 'Kanal Lama', metrics: { author_id: 'UC1' } }, { id: '4', platform: 'youtube', author: 'Kanal Baru', metrics: { author_id: 'UC1' } },
    { id: '5', platform: 'x', author: 'lain', metrics: {}, measures: { account: 'x:okezonenews' } },
  ];
  assert.deepEqual(filterPosts(posts, { account: 'x:okezonenews' }).map(p => p.id), ['1', '2', '5']);
  assert.deepEqual(filterPosts(posts, { account: 'youtube:UC1' }).map(p => p.id), ['3', '4']);
  assert.deepEqual(filterPosts(posts, { exactAuthor: 'Kanal Baru' }).map(p => p.id), ['4'], 'a link shared before still opens by name');
});
