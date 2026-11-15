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

test('report top posts follow the interactions order: ties by earlier publication, unknown last, digit strings count', () => {
  const data={posts:[
    {id:'late',author:'A',platform:'x',metrics:{likes:5},published_at:'2026-11-12T10:00:00Z'},
    {id:'none',author:'B',platform:'x',metrics:{likes:true,shares:1.5},published_at:'2026-11-01T10:00:00Z'},
    {id:'early',author:'C',platform:'x',metrics:{likes:'5'},published_at:'2026-11-11T10:00:00Z'},
    {id:'twin-b',author:'D',platform:'x',metrics:{likes:7},published_at:'2026-11-11T09:00:00Z'},
    {id:'twin-a',author:'D',platform:'x',metrics:{likes:7},published_at:'2026-11-11T09:00:00Z'},
  ]};
  const report=buildReport(data,{label:'T'},{},'2026-11-15T00:00:00Z');
  assert.deepEqual(report.topPosts.map(p=>p.id),['twin-a','twin-b','early','late','none'],'same figure and same time: by id');
  assert.equal(report.accounts.find(row=>row.author==='B').engagement,null);
  assert.equal(report.accounts.find(row=>row.author==='C').engagement,5);
});

test('report accounts carry their interaction total with its post count, by the measures module', () => {
  const data={posts:[
    {id:'a',author:'A',platform:'x',metrics:{},measures:{interactions:9},published_at:'2026-11-10T10:00:00Z'},
    {id:'b',author:'A',platform:'x',metrics:{likes:'2'},published_at:'2026-11-10T11:00:00Z'},
    {id:'c',author:'A',platform:'x',metrics:{likes:true},published_at:'2026-11-10T12:00:00Z'},
    {id:'d',author:'B',platform:'x',metrics:{views:3},published_at:'2026-11-10T13:00:00Z'},
  ]};
  const accounts=buildReport(data,{label:'T'},{},'2026-11-15T00:00:00Z').accounts;
  const by=Object.fromEntries(accounts.map(row=>[row.author,row]));
  assert.deepEqual([by.A.engagement,by.A.interaction_posts,by.A.mentions],[11,2,3]);
  assert.deepEqual([by.B.engagement,by.B.interaction_posts],[null,0]);
});

test('the report account table has one row per account by account_v1, named by its most recently published post', () => {
  // One X handle written two ways, a renamed YouTube channel, a Threads account with an id on one row only.
  const data={posts:[
    {id:'k1',platform:'x',author:'Okezonenews',published_at:'2026-11-10T08:00:00Z',metrics:{likes:1}},
    {id:'k2',platform:'x',author:'@okezonenews',published_at:'2026-11-11T08:00:00Z',metrics:{likes:2}},
    {id:'k3',platform:'youtube',author:'Kanal Lama',published_at:'2026-11-09T08:00:00Z',metrics:{author_id:'UC1',likes:3}},
    {id:'k4',platform:'youtube',author:'Kanal Baru',published_at:'2026-11-12T08:00:00Z',metrics:{author_id:'UC1',likes:4}},
    {id:'k5',platform:'threads',author:'@Warga.Solo',published_at:'2026-11-12T09:00:00Z',metrics:{author_id:'1789',likes:5}},
    {id:'k6',platform:'threads',author:'warga.solo',published_at:'2026-11-08T08:00:00Z',metrics:{likes:6}},
  ]};
  const accounts=buildReport(data,{label:'T'},{},'2026-11-15T00:00:00Z').accounts;
  assert.deepEqual(accounts.map(row=>[row.key,row.author,row.mentions,row.engagement]),[
    ['threads:warga.solo','@Warga.Solo',2,11],['youtube:UC1','Kanal Baru',2,7],['x:okezonenews','@okezonenews',2,3]]);
});

test('the report account table keeps a channel whose post has no name, without inventing a name', () => {
  const data={posts:[
    {id:'n1',platform:'youtube',author:null,published_at:'2026-11-12T08:00:00Z',metrics:{author_id:'UC1',likes:1}},
    {id:'n2',platform:'youtube',author:'Kanal',published_at:'2026-11-10T08:00:00Z',metrics:{author_id:'UC1',likes:1}},
    {id:'n3',platform:'youtube',author:'',published_at:'2026-11-11T08:00:00Z',metrics:{author_id:'UC9',likes:5}},
    {id:'n4',platform:'x',author:'',published_at:'2026-11-11T08:00:00Z',metrics:{likes:7}},
  ]};
  const accounts=buildReport(data,{label:'T'},{},'2026-11-15T00:00:00Z').accounts;
  assert.deepEqual(accounts.map(row=>[row.key,row.author,row.mentions]),[['youtube:UC9',null,1],['youtube:UC1','Kanal',2]]);
});
