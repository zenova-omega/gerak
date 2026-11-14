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

test('range evidence counts one sentiment over several days and compares with the days before', async()=>{
  const {sentimentRangeEvidence,sentimentRanges,sentimentTimeline}=await import('./pulseSentiment.js');
  const post=(id,day,label)=>({id,published_at:`2026-11-${day}T03:00:00Z`,metrics:{sentiment:{label},likes:Number(id)}});
  const posts=[post('1','01','negative'),post('2','02','neutral'),post('3','03','negative'),post('4','04','negative'),post('5','04','positive')];
  const range=sentimentRangeEvidence(posts,'2026-11-03','2026-11-04','negative');
  assert.equal(range.count,2);assert.equal(range.days,2);assert.equal(range.previous,1);assert.equal(range.delta,1);
  assert.deepEqual([range.previousFrom,range.previousTo],['2026-11-01','2026-11-02']);
  assert.deepEqual(range.posts.map(p=>p.id),['4','3']);
  assert.equal(sentimentRangeEvidence(posts,'2026-11-01','2026-11-04','negative').delta,null);
  const presets=sentimentRanges(sentimentTimeline(posts));
  assert.deepEqual(presets.map(row=>[row.key,row.from,row.to]),[['1','2026-11-04','2026-11-04'],['7','2026-11-01','2026-11-04'],['30','2026-11-01','2026-11-04'],['all','2026-11-01','2026-11-04']]);
});
