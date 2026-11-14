import test from 'node:test';
import assert from 'node:assert/strict';
import { sentimentTimeline, sentimentDayEvidence } from './pulseSentiment.js';

test('sentiment timeline uses publication WIB, separates unknown and preserves missing dates',()=>{
  const rows=sentimentTimeline([
    {published_at:'2026-11-01T18:00:00',metrics:{sentiment:{label:'negative'}}},
    {published_at:'2026-11-02T01:00:00Z',metrics:{}},
    {published_at:'2026-11-04T01:00:00Z',metrics:{sentiment:'neutral'}},
    {published_at:null,metrics:{sentiment:'positive'}},
  ]);
  assert.deepEqual(rows.map(r=>[r.date,r.negative,r.neutral,r.unknown,r.total]),[['2026-11-02',1,0,1,2],['2026-11-04',0,1,0,1]]);
});
test('day evidence compares calendar predecessor, not last available date, and ranks real labeled posts',()=>{
  const posts=[
    {id:'old',published_at:'2026-11-01T00:00:00Z',metrics:{sentiment:'negative'}},
    {id:'a',published_at:'2026-11-03T00:00:00Z',metrics:{sentiment:'negative',engagement:2}},
    {id:'b',published_at:'2026-11-03T01:00:00Z',metrics:{sentiment:'negative',engagement:8}},
    {id:'u',published_at:'2026-11-03T01:00:00Z',metrics:{engagement:100}},
  ];
  const result=sentimentDayEvidence(posts,'2026-11-03','negative');
  assert.equal(result.previousDate,'2026-11-02');
  assert.equal(result.previous,null);
  assert.equal(result.delta,null);
  assert.deepEqual(result.posts.map(p=>p.id),['b','a']);
  assert.equal(result.current.unknown,1);
});
test('daily change is unavailable when either day has no analyzed posts',()=>{
  const posts=[{published_at:'2026-11-02T00:00:00Z',metrics:{sentiment:'negative'}},{published_at:'2026-11-03T00:00:00Z',metrics:{}}];
  const result=sentimentDayEvidence(posts,'2026-11-03','negative');
  assert.equal(result.delta,null);
  assert.equal(result.current.neutral,0);
  assert.deepEqual(sentimentTimeline([]),[]);
});
test('daily change counts labeled posts when both days have results',()=>{
  const posts=[{published_at:'2026-11-02T00:00:00Z',metrics:{sentiment:'negative'}},{published_at:'2026-11-03T00:00:00Z',metrics:{sentiment:'neutral'}}];
  assert.equal(sentimentDayEvidence(posts,'2026-11-03','negative').delta,-1);
});
