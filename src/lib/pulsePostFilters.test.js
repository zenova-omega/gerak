import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPosts } from './pulsePostFilters.js';
import * as postFilters from './pulsePostFilters.js';
const posts = [
  { id:'a',platform:'instagram',author:'Alice',text:'presiden disadap',published_at:'2026-11-10T18:00:00Z',metrics:{engagement:50,media_url:'https://cdn.example.com/a.jpg'} },
  { id:'b',platform:'x',author:'Bob',text:'presiden',published_at:null,metrics:{} },
];
test('multiple platforms use OR, empty selection yields none, null means all',()=>{
  assert.equal(filterPosts(posts,{platforms:['instagram','x']}).length,2);
  assert.equal(filterPosts(posts,{platforms:['x']})[0].id,'b');
  assert.equal(filterPosts(posts,{platforms:[]}).length,0);
  assert.equal(filterPosts(posts,{platforms:null}).length,2);
});
test('combines platform, content, account, engagement and actual media filters',()=>{
  assert.deepEqual(filterPosts(posts,{platform:'instagram',query:'disadap',author:'ali',minEngagement:'40',media:'available'}).map(p=>p.id),['a']);
  assert.equal(filterPosts(posts,{minEngagement:'0'}).length,1);
  assert.equal(posts[0].id,'a');
});
test('date boundaries use WIB and unknown dates are excluded only with a date filter',()=>{
  assert.equal(filterPosts(posts,{}).length,2);
  assert.equal(filterPosts(posts,{from:'2026-11-10',to:'2026-11-10'}).length,0);
  assert.equal(filterPosts(posts,{from:'2026-11-11',to:'2026-11-11'}).length,1);
  assert.equal(filterPosts(posts,{to:'2026-11-11'}).length,1);
  assert.deepEqual(filterPosts([...posts].reverse(),{sort:'recent'}).map(p=>p.id),['a','b']);
});

test('oldest order puts missing dates last and daily counts use WIB in ascending order',()=>{
  const rows=[...posts,{id:'early',published_at:'2026-11-09T18:00:00Z',metrics:{}}];
  assert.deepEqual(filterPosts(rows,{sort:'oldest'}).map(p=>p.id),['early','a','b']);
  assert.equal(typeof postFilters.dailyPostCounts,'function');
  assert.deepEqual(postFilters.dailyPostCounts(rows),[{date:'2026-11-10',count:1},{date:'2026-11-11',count:1}]);
});

test('the Posting page defaults to the largest interactions, using observed likes, comments and shares',()=>{
  const rows=[{id:'small',published_at:'2026-11-02T00:00:00Z',metrics:{likes:1}},{id:'big',published_at:'2026-11-01T00:00:00Z',metrics:{likes:5,comments:4}},{id:'none',published_at:'2026-11-03T00:00:00Z',metrics:{}}];
  assert.equal(postFilters.defaultPostFilters.sort,'engagement');
  assert.deepEqual(filterPosts(rows,postFilters.defaultPostFilters).map(p=>p.id),['big','small','none']);
  assert.deepEqual(filterPosts(rows,{}).map(p=>p.id),['big','small','none']);
});
