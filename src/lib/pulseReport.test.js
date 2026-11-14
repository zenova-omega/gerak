import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReport} from './pulseReport.js';
import * as reports from './pulseReport.js';
test('freeze waits for response success and detaches the latest draft',()=>{
  assert.equal(typeof reports.freezeReport,'function');
  const draft=buildReport({posts:[]});
  assert.equal(reports.freezeReport(draft),null);
  draft.responseAnalysis={loaded:true,error:true};
  assert.equal(reports.freezeReport(draft),null);
  draft.responseAnalysis={loaded:true,error:false,response:{target:'Loaded'}};
  const frozen=reports.freezeReport(draft,'2026-11-13');
  draft.responseAnalysis.response.target='Changed';
  assert.equal(frozen.responseAnalysis.response.target,'Loaded');
  assert.equal(frozen.generatedAt,'2026-11-13');
});
test('coverage distinguishes observed Threads, empty selected sources and excluded sources',()=>{
  const r=buildReport({posts:[{id:'t',platform:'threads',metrics:{}}]}, {}, {}, undefined, ['threads','x']);
  assert.equal(r.sourceCoverage?.find(row=>row.platform==='threads')?.status,'observed');
  assert.equal(r.sourceCoverage?.find(row=>row.platform==='x')?.status,'empty');
  assert.equal(r.sourceCoverage?.find(row=>row.platform==='news')?.status,'excluded');
});
test('JSON archive preserves report scope and labels itself as a local snapshot',()=>{
  assert.equal(typeof reports.reportArchive,'function');
  const r=buildReport({posts:[]},{id:'p',label:'Project'}, {from:'2026-11-01'}, '2026-11-13', ['threads']);
  const archive=JSON.parse(reports.reportArchive(r));
  assert.equal(archive.kind,'pulse-local-report-snapshot');
  assert.equal(archive.report.topic.id,'p');
  assert.deepEqual(archive.report.selectedPlatforms,['threads']);
  assert.equal(archive.report.period.from,'2026-11-01');
});
test('report snapshot excludes response evidence outside its selected posts',()=>{
  const state={loaded:true,error:false,response:{target:'Issue',posts:[{post_id:'keep'},{post_id:'excluded'}]}};
  const r=buildReport({posts:[{id:'keep',platform:'threads'},{id:'excluded',platform:'x'}]}, {}, {}, undefined, ['threads'], state);
  assert.deepEqual(r.responseAnalysis.response.posts,[{post_id:'keep'}]);
  assert.equal(state.response.posts.length,2);
});
test('report freezes source data, preserves unknown sentiment and ranks by observed engagement',()=>{
  const data={posts:[{id:'a',author:'A',platform:'threads',metrics:{engagement:12,sentiment:'negative'},published_at:'2026-11-10T18:00:00Z'},{id:'b',author:'A',platform:'threads',metrics:{engagement:2}},{id:'c',author:'B',platform:'x',metrics:{}}]};
  data.posts[1].published_at='2026-11-11T01:00:00Z';
  data.posts[2].published_at='2026-11-11T02:00:00Z';
  const report=buildReport(data,{label:'Project',query:'keyword'},{from:'2026-11-01',to:'2026-11-12'},'2026-11-12T00:00:00Z');
  assert.equal(report.counts.unknown,2);assert.equal(report.counts.neutral,0);
  assert.equal(report.accounts[0].engagement,14);assert.equal(report.accounts[1].engagement,null);
  assert.equal(report.platforms.threads,2);assert.equal(report.days[0].date,'2026-11-11');
  data.posts[0].metrics.sentiment='positive';assert.equal(report.posts[0].metrics.sentiment,'negative');
  assert.deepEqual(report.period,{from:'2026-11-01',to:'2026-11-12'});
});
test('empty report has no fabricated rankings or dates',()=>{
  const r=buildReport({posts:[]},{},{},'2026-11-12');
  assert.equal(r.analyzed,0);assert.deepEqual(r.accounts,[]);assert.deepEqual(r.days,[]);
});
test('response results are frozen with report posts until explicit refresh',()=>{
  const state={loaded:true,error:false,response:{target:'Issue',posts:[{post_id:'p',stance:{label:'support'}}]}};
  const report=buildReport({posts:[{id:'p',platform:'x',metrics:{}}]},{id:'topic'},{},'2026-11-12',null,state);
  state.response.posts[0].stance.label='reject';
  assert.equal(report.responseAnalysis?.response.posts[0].stance.label,'support');
  assert.equal(report.responseAnalysis?.loaded,true);
});
test('report enforces its declared platform and date scope even on unfiltered input',()=>{
  const posts=[{id:'keep',platform:'x',published_at:'2026-11-10T17:00:00Z',metrics:{}},{id:'other',platform:'instagram',published_at:'2026-11-11T00:00:00Z',metrics:{}},{id:'old',platform:'x',published_at:'2026-11-10T16:59:59Z',metrics:{}}];
  const r=buildReport({posts},{},{from:'2026-11-11',to:'2026-11-11'},'2026-11-12',['x']);
  assert.deepEqual(r.posts.map(p=>p.id),['keep']);
  assert.deepEqual(r.selectedPlatforms,['x']);
  assert.equal(buildReport({posts},{},{},'2026-11-12',[]).posts.length,0);
});
