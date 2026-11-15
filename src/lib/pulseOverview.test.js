import test from 'node:test';
import assert from 'node:assert/strict';
import { narrativePlatforms, overviewEvidence, previousPeriod, reviewEvidence, sourceText } from './pulseOverview.js';

test('equal length previous period uses inclusive WIB calendar days',()=>{
  assert.deepEqual(previousPeriod({from:'2026-11-01',to:'2026-11-07'}),{from:'2026-10-25',to:'2026-10-31'});
  assert.equal(previousPeriod({from:'',to:''}),null);
});
test('dedup counts normalized identical content but does not merge different claims or empty text',()=>{
  const result=overviewEvidence([{id:'a',text:'Berita  Baru',platform:'x'},{id:'b',text:'berita baru',platform:'news'},{id:'c',text:'berita baru dibantah',platform:'x'},{id:'d'},{id:'e'}]);
  assert.equal(result.uniqueContent,4);assert.equal(result.duplicates,1);
  assert.equal(result.analyzed,0);assert.equal(result.engagement,null);
});
test('platform and relevance filters affect all aggregates and do not erase zero',()=>{
  const posts=[{id:'a',author:'A',platform:'x',text:'hello',metrics:{engagement:0,sentiment:{label:'neutral'}}},{id:'b',author:'B',platform:'x',metrics:{engagement:90}},{id:'c',author:'A',platform:'tiktok',metrics:{engagement:100}}];
  const r=overviewEvidence(posts,{platforms:['x'],excludedIds:['b']});
  assert.equal(r.posts.length,1);assert.equal(r.accounts.length,1);assert.equal(r.engagement,0);assert.equal(r.analyzed,1);
});
test('narrative examples and first observed dates use evidence, not inferred originators',()=>{
  const r=overviewEvidence([{id:'a',issue_id:'i',text:'sama',platform:'x',published_at:'2026-11-01T20:00:00Z',first_observed_at:'2026-11-04T00:00:00Z',crawled_at:'2026-11-06T00:00:00Z'},{id:'b',issue_id:'i',text:'mirip',platform:'news',published_at:'2026-11-03T00:00:00Z'}]);
  assert.equal(r.narratives[0].posts.length,2);assert.equal(r.days[0].date,'2026-11-02');assert.equal(r.platformTimeline.find(p=>p.platform==='x').firstObserved,'2026-11-04T00:00:00Z');
  assert.equal(r.volumeChange,null);
});
test('zero comparison base does not fabricate percentage growth',()=>{
  const r=overviewEvidence([{id:'a'}],{previousPosts:[]});assert.equal(r.volumeChange.delta,1);assert.equal(r.volumeChange.percent,null);
});
test('different video titles sharing channel boilerplate remain distinct content',()=>{
 assert.equal(overviewEvidence([{id:'a',title:'Topik A',text:'Subscribe channel'},{id:'b',title:'Topik B',text:'Subscribe channel'}]).uniqueContent,2);
 assert.equal(sourceText({text:'<a href="https://example.com">Berita &amp; kabar</a>'}),'Berita & kabar');
});
test('review accuracy excludes unpaired labels and flags uncertain results separately',()=>{
 const posts=[{id:'a',metrics:{sentiment:{label:'negative',confidence:0.4}}},{id:'b',metrics:{}},{id:'c',metrics:{sentiment:{label:'positive',confidence:0.9}}}];
 const r=reviewEvidence(posts,[{post_id:'a',manual_sentiment:'negative'},{post_id:'b',manual_sentiment:'neutral'},{post_id:'c',manual_sentiment:'neutral'}]);
 assert.equal(r.paired,2);assert.equal(r.correct,1);assert.equal(r.accuracy,0.5);assert.deepEqual(r.needsReview.map(p=>p.id),['a','c']);
 assert.equal(reviewEvidence(posts,[]).accuracy,null);
});

test('a narrative says where its posts are: platforms with their counts, most first, the tail folded',()=>{
  const on=(platform,count)=>Array.from({length:count},(_,index)=>({id:platform+index,platform}));
  assert.deepEqual(narrativePlatforms([...on('tiktok',2),...on('x',5),...on('news',1)]),{rows:[{platform:'x',count:5},{platform:'tiktok',count:2},{platform:'news',count:1}],more:0});
  const wide=narrativePlatforms([...on('x',5),...on('tiktok',4),...on('instagram',3),...on('youtube',2),...on('news',1),...on('reddit',1)]);
  assert.deepEqual(wide.rows.map(row=>row.platform),['x','tiktok','instagram','youtube']);
  assert.equal(wide.more,2,'beyond four platforms the rest is counted, not drawn');
  assert.deepEqual(narrativePlatforms([{id:'a'},{id:'b',platform:''},...on('x',1)]),{rows:[{platform:'x',count:1}],more:0},'a post without a platform is not given one');
  assert.deepEqual(narrativePlatforms([]),{rows:[],more:0});
  assert.deepEqual(narrativePlatforms([...on('x',2),...on('tiktok',2)]).rows.map(row=>row.platform),['tiktok','x'],'a tie is ordered by name, so the order does not jump between refreshes');
});
