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
