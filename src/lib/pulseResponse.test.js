import test from 'node:test';
import assert from 'node:assert/strict';
import {responseEvidence} from './pulseResponse.js';

test('response analysis intersects visible posts and comments, never invents neutral labels',()=>{
 const posts=[{id:'a',platform:'youtube',text:'Sumber',metrics:{comment_snapshot:{items:[{id:'c',text:'Komentar asli'},{id:'d',text:'Belum diproses'}]}}}];
 const data={target:'Pengunduran diri',posts:[{post_id:'a',stance:{label:'unclear',reason:'Hanya berita'},comments:[{id:'c',sentiment:{label:'negative',reason:'Kecewa'},stance:{label:'opposes',reason:'Menolak tindakan'}}]},{post_id:'outside',stance:{label:'supports'},comments:[{id:'outside',sentiment:{label:'positive'}}]}]};
 const r=responseEvidence(posts,data);
 assert.deepEqual(r.stanceCounts,{supports:0,opposes:0,unclear:1,unknown:0});
 assert.deepEqual(r.commentCounts,{positive:0,neutral:0,negative:1,unknown:1});
 assert.equal(r.comments.length,2);assert.equal(r.comments[0].text,'Komentar asli');
 assert.equal(r.comments[0].stance.label,'opposes');assert.equal(r.comments[1].sentiment,null);
 assert.equal(responseEvidence([],data).comments.length,0);
});

test('invalid labels and unavailable result stay unknown; no author stance aggregation',()=>{
 const r=responseEvidence([{id:'a',author:'A',metrics:{comment_snapshot:{items:[{id:'c',text:'x'}]}}}],{posts:[{post_id:'a',stance:{label:'negative'},comments:[{id:'c',sentiment:{label:'supports'}}]}]});
 assert.equal(r.stanceCounts.unknown,1);assert.equal(r.commentCounts.unknown,1);
 assert.equal(r.posts[0].stance,null);assert.equal('accounts' in r,false);
});

test('shares of a breakdown are read over what has been analysed, never over the waiting rows', async () => {
  const { analysedShares } = await import('./pulseResponse.js');
  const shares = analysedShares({ positive: 105, neutral: 150, negative: 177, unknown: 20143 });
  assert.equal(shares.total, 20575);
  assert.equal(shares.analysed, 432);
  assert.equal(Math.round(shares.percent('negative')), 41);      // not 0.9% of everything stored
  assert.equal(shares.percent('unknown'), null);                 // waiting rows are coverage, not a category
  assert.equal(shares.percent('missing'), 0);
  const waiting = analysedShares({ positive: 0, neutral: 0, negative: 0, unknown: 12 });
  assert.equal(waiting.analysed, 0);
  assert.equal(waiting.percent('negative'), null);               // nothing analysed: no figure at all
});
