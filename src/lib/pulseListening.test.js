import test from 'node:test';
import assert from 'node:assert/strict';
import * as filters from './pulsePostFilters.js';
import * as queries from '../pulse/projectQuery.js';

test('sentiment selection never treats missing or issue-level sentiment as neutral', () => {
  const posts = [{id:'p',metrics:{sentiment:{label:'positive',method:'provider'}}},{id:'n',metrics:{sentiment:{label:'negative'}}},{id:'u',metrics:{}},{id:'bad',metrics:{sentiment:0.8}}];
  assert.deepEqual(filters.filterPosts(posts,{sentiments:['positive','negative']}).map(p=>p.id),['p','n']);
  assert.deepEqual(filters.filterPosts(posts,{sentiments:['unknown']}).map(p=>p.id),['u','bad']);
  assert.deepEqual(filters.filterPosts(posts,{sentiments:[]}),[]);
});
test('sentiment totals retain unknown and sum to the actual dataset', () => {
  assert.equal(typeof filters.sentimentCounts,'function');
  assert.deepEqual(filters.sentimentCounts([{metrics:{sentiment:'neutral'}},{metrics:{sentiment:'negative'}},{}]),{positive:0,neutral:1,negative:1,unknown:1});
});
test('keyword editor restores only roundtrippable query syntax without silently changing complex queries', () => {
  assert.equal(typeof queries.parseProjectQuery,'function');
  assert.deepEqual(queries.parseProjectQuery('("sadap" OR "disadap") AND "presiden" NOT "film"'),{main:'sadap, disadap',required:'presiden',excluded:'film'});
  assert.equal(queries.parseProjectQuery('(sadap OR disadap) AND (presiden OR Prabowo)'),null);
});
test('saved views reject malformed filters and never restore stale date bounds',()=>{
  assert.equal(typeof filters.parseSavedViews,'function');
  assert.deepEqual(filters.parseSavedViews('{broken'),[]);
  assert.deepEqual(filters.parseSavedViews(JSON.stringify([{name:'Bad',filters:{platforms:'x'}}])),[]);
  const saved=filters.parseSavedViews(JSON.stringify([{name:'Negatif',filters:{sentiments:['negative'],from:'2026-01-01',to:'2026-01-02',query:'sadap'}}]));
  assert.equal(saved[0].filters.from,'');
  assert.equal(saved[0].filters.query,'sadap');
});
