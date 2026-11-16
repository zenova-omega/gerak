import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveInput,restoreArchive} from './pulseArchive.js';

test('archive restores its frozen scope and values independently from a live project',()=>{
 const report={topic:{id:'a',label:'Old title',query:'alpha'},period:{from:'2026-11-01',to:'2026-11-10'},selectedPlatforms:['x'],generatedAt:'2026-11-13T00:00:00Z',posts:[{id:'p',platform:'x',author:'Author',published_at:'2026-11-02T00:00:00Z',metrics:{engagement:7,sentiment:{label:'positive'}}}],responseAnalysis:{loaded:true,error:false,response:null}};
 const payload=archiveInput(report,'Saved');
 assert.equal(payload.topic_id,'a');
 report.posts[0].metrics.engagement=99;
 const restored=restoreArchive({version:1,snapshot:payload.snapshot});
 assert.equal(restored.topPosts[0].metrics.engagement,7);
 assert.deepEqual(restored.selectedPlatforms,['x']);
 assert.equal(restored.period.to,'2026-11-10');
 assert.equal(restored.counts.positive,1);
 assert.equal(restored.topic.label,'Old title');
 assert.throws(()=>restoreArchive({version:2,snapshot:payload.snapshot}));
});

test('an archive filed under older calculation rules, or before rules were recorded, is said to be recounted',async()=>{
 const {recounted}=await import('./pulseArchive.js');
 const {RULES}=await import('./pulseMeasures.js');
 assert.equal(recounted({}),true,'filed before rule versions were recorded');
 assert.equal(recounted({rules:null}),true);
 assert.equal(recounted({rules:{...RULES}}),false,'the rules in force today');
 assert.equal(recounted({rules:{...RULES,day:'day_v0'}}),true,'one rule older');
 const {account,...withoutAccount}=RULES;
 assert.equal(recounted({rules:withoutAccount}),true,'a rule that did not exist when it was filed');
 assert.equal(recounted({rules:{...RULES,tone_share:'tone_share_v3'}}),false,'a newer version is not older');
 assert.equal(recounted({rules:{...RULES,tone_share:'tone_share_v1'}}),true,'a report filed when tone shares were of the analysed posts is recounted');
});

test('an opened archive counts its posts by the rules in force today, never by the measures stored with them',()=>{
 // Decision 7: a filed report follows the rules in force when it is opened. A post filed with the server's measures
 // of that day (here stale on purpose) is counted from its own metrics.
 const stale={day:'2020-01-01',clock:true,interactions:999,account:'x:old',tone:'positive'};
 const post={id:'p',platform:'x',author:'Author',published_at:'2026-11-02T03:00:00Z',measures:stale,metrics:{engagement:7,sentiment:{label:'negative'}}};
 const quiet={id:'q',platform:'x',author:'Quiet',published_at:'2026-11-03T03:00:00Z',measures:{...stale,account:'x:old',interactions:5000},metrics:{engagement:3}};
 const snapshot={topic:{id:'a',label:'A',query:'a'},period:{},selectedPlatforms:null,generatedAt:'2026-11-13T00:00:00Z',posts:[quiet,post],responseAnalysis:{loaded:true,error:false,response:null}};
 const restored=restoreArchive({version:1,snapshot});
 assert.equal(restored.counts.negative,1,'the tone is read from the post, not from the stored measures');
 assert.equal(restored.counts.positive,0);
 assert.deepEqual(restored.accounts.map(row=>[row.key,row.engagement]),[['x:author',7],['x:quiet',3]]);
 assert.deepEqual(restored.topPosts.map(row=>row.id),['p','q'],'ordered by the interactions in the metrics');
 assert.deepEqual(restored.days.map(row=>row.date),['2026-11-02','2026-11-03']);
 assert.ok(restored.posts.every(row=>!('measures' in row)));
 assert.equal(snapshot.posts[0].measures.account,'x:old','the archive given is not changed');
 const filed=archiveInput({...snapshot,posts:[post]},'Saved');
 assert.ok(!('measures' in filed.snapshot.posts[0]),'a report is filed without the measures of the day');
 assert.equal(post.measures.account,'x:old','the report on screen keeps its own posts');
});
