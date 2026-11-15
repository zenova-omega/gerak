import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as replay from './pulseReplay.js';

const a = { id: 'a', author: 'A', published_at: '2026-11-10T01:00:00Z', platform: 'x' };
const b = { id: 'b', author: 'B', published_at: '2026-11-10T03:00:00Z', platform: 'x' };
const data = { nodes: [{ id: 'x:a', label: 'A' }, { id: 'x:b', label: 'B' }, { id: 'x:c', label: 'C', observed: false }], accounts: [{ id: 'x:a', evidence: [a] }, { id: 'x:b', evidence: [b] }], edges: [{ source: 'x:a', target: 'x:c', kind: 'mention', evidence: [a,b] }, { source: 'x:a', target: 'x:b', kind: 'similarity', evidence: [a,b] }] };
test('replay filters future evidence and waits for both similarity participants', () => {
  assert.equal(typeof replay.replayFrame, 'function');
  const frame = replay.replayFrame(data, Date.parse('2026-11-10T02:00:00Z'));
  assert.deepEqual(frame.nodes.map(n=>n.id).sort(), ['x:a','x:c']);
  assert.equal(frame.edges.length, 1);
  assert.deepEqual(frame.edges[0].evidence.map(p=>p.id), ['a']);
  assert.equal(frame.edges[0].count, 1);
});
test('unknown dates stay out of historical replay but appear in full sample', () => {
  assert.equal(typeof replay.replayFrame, 'function');
  const sample = { nodes:[{id:'u'}], accounts:[{id:'u',evidence:[{id:'u',published_at:null}]}],edges:[] };
  assert.equal(replay.replayFrame(sample,0).nodes.length,0);
  assert.equal(replay.replayFrame(sample,Infinity).nodes.length,1);
});
test('timeline deduplicates evidence and normalizes zone-less UTC dates', () => {
  assert.equal(typeof replay.replayEvents, 'function');
  const events = replay.replayEvents({...data,accounts:[...data.accounts,{id:'duplicate',evidence:[a,{id:'unknown',published_at:null}]}]});
  assert.equal(events.length,2);
  assert.equal(replay.replayTime('2026-11-10T01:00:00'),Date.parse(a.published_at));
  assert.equal(replay.replayTime(null),null);
});
test('top account badge excludes unknown/zero engagement and includes cutoff ties', () => {
  assert.equal(typeof replay.topViralAccounts, 'function');
  const rows=[{platform:'x',author:'@A',metrics:{engagement:10}},{platform:'x',author:'a',metrics:{engagement:5}},{platform:'x',author:'B',metrics:{engagement:null}},{platform:'x',author:'C',metrics:{engagement:15}},{platform:'x',author:'D',metrics:{engagement:0}}];
  assert.deepEqual([...replay.topViralAccounts(rows,1)].sort(),['x:a','x:c']);
});
test('layout remains stable across replay frames and positions are finite', () => {
  assert.equal(typeof replay.networkPositions, 'function');
  const positions=replay.networkPositions(data);
  assert.deepEqual(positions,replay.networkPositions(data));
  assert.ok(Object.values(positions).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)));
  assert.equal(Object.keys(positions).length,3);
});
test('replayTime is the shared reader: a space, fractions and a zone without a colon read alike', () => {
  assert.equal(replay.replayTime('2026-11-10 01:00:00'), Date.parse('2026-11-10T01:00:00Z'));
  assert.equal(replay.replayTime('2026-11-10T08:00:00.5+0700'), Date.parse('2026-11-10T01:00:00.500Z'));
  assert.equal(replay.replayTime('2026-02-30T10:00:00Z'), null, 'an impossible date is not a time');
});
