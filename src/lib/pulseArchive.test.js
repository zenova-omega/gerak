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
 assert.equal(recounted({rules:{...RULES,tone_share:'tone_share_v2'}}),false,'a newer version is not older');
});
