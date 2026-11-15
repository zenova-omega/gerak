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

test('the summary says how many posts state an emotion, which one leads, and ranks the emotions among themselves', async () => {
  const { emotionEvidence, emotionSummary } = await import('./pulseEmotion.js');
  const stated = (id, label) => ({ id, metrics: { emotion: { label, confidence: 0.9, reason: 'alasan' } } });
  const posts = [stated('a', 'anger'), stated('b', 'anger'), stated('c', 'anger'), stated('d', 'joy'), stated('e', 'none'), stated('f', 'none'), stated('g', 'none'), stated('h', 'none'), { id: 'i', metrics: {} }, { id: 'j', metrics: {} }];
  const summary = emotionSummary(emotionEvidence(posts));
  assert.deepEqual([summary.emotional, summary.none, summary.analyzed, summary.share], [4, 4, 8, 0.5]);
  assert.deepEqual(summary.ranked.map(row => [row.key, row.count]), [['anger', 3], ['joy', 1], ['sadness', 0], ['fear', 0], ['disgust', 0], ['admiration', 0]], 'largest first; emotions nobody stated keep their usual order');
  assert.equal(summary.ranked[0].share, 0.75, 'a share is of the posts that state an emotion, so the six add up to the whole');
  assert.equal(summary.lead.key, 'anger');
  // Analysed, but no post states an emotion: nothing leads and no share is invented.
  const flat = emotionSummary(emotionEvidence([stated('a', 'none'), stated('b', 'none')]));
  assert.deepEqual([flat.emotional, flat.share, flat.lead], [0, 0, null]);
  assert.ok(flat.ranked.every(row => row.count === 0 && row.share === 0));
  // Nothing analysed yet.
  const empty = emotionSummary(emotionEvidence([{ id: 'x', metrics: {} }]));
  assert.deepEqual([empty.analyzed, empty.share, empty.lead], [0, 0, null]);
});

test('the daily chart draws a quiet day as an empty day instead of skipping it', async () => {
  const { filledDays } = await import('./pulseEmotion.js');
  const day = (date, anger) => ({ date, joy: 0, anger, sadness: 0, fear: 0, disgust: 0, admiration: 0, none: 0 });
  const filled = filledDays([day('2026-11-08', 2), day('2026-11-11', 5)]);
  assert.deepEqual(filled.map(row => [row.date, row.anger]), [['2026-11-08', 2], ['2026-11-09', 0], ['2026-11-10', 0], ['2026-11-11', 5]]);
  assert.equal(filled[1].none, 0);
  // A span too long to draw day by day is left as the days that have posts.
  const sparse = [day('2026-06-04', 1), day('2026-11-11', 5)];
  assert.deepEqual(filledDays(sparse), sparse);
  assert.deepEqual(filledDays([]), []);
});
