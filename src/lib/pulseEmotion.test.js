import test from 'node:test';
import assert from 'node:assert/strict';
import {emotionEvidence} from './pulseEmotion.js';
test('emotion evidence never converts polarity to emotion and preserves WIB source dates',()=>{
 const posts=[{id:'a',published_at:'2026-11-11T18:00:00Z',metrics:{sentiment:{label:'negative'},emotion:{label:'anger',confidence:.9,reason:'Nada marah'}}},{id:'b',metrics:{sentiment:{label:'positive'}}},{id:'c',metrics:{emotion:{label:'none',confidence:.8,reason:'Hanya melaporkan'}}},{id:'d',metrics:{emotion:{label:'joy',confidence:'high'}}}];
 const result=emotionEvidence(posts);
 assert.equal(result.counts.anger,1);assert.equal(result.counts.joy,0);assert.equal(result.unknown,2);assert.equal(result.analyzed,2);assert.equal(result.counts.none,1);
 assert.deepEqual(result.days.map(d=>[d.date,d.anger]),[['2026-11-12',1]]);
 assert.deepEqual(result.rows.anger.map(p=>p.id),['a']);
 assert.equal(emotionEvidence([]).analyzed,0);
});
