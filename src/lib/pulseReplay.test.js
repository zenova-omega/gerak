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
test('top account badge adds up each account by account_v1, the key the network nodes carry', () => {
  const rows=[
    {platform:'threads',author:'@Warga.Solo',metrics:{author_id:'1789',likes:5}},{platform:'threads',author:'warga.solo',metrics:{likes:6}},
    {platform:'youtube',author:'Kanal Lama',metrics:{author_id:'UC1',likes:3}},{platform:'youtube',author:'Kanal Baru',metrics:{author_id:'UC1',likes:4}},
    {platform:'news',author:'Kompas.com',metrics:{likes:8}},{platform:'news',author:'KOMPAS.com',metrics:{likes:1}},
  ];
  assert.deepEqual([...replay.topViralAccounts(rows,1)],['threads:warga.solo']);
  assert.deepEqual([...replay.topViralAccounts(rows,3)].sort(),['news:kompas.com','threads:warga.solo','youtube:UC1']);
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
test('replay events put date-only posts after the timed ones, never among them by 00.00 UTC', () => {
  const events = replay.replayEvents({ accounts: [{ id: 'x:a', evidence: [
    { id: 'late', published_at: '2026-11-10T09:00:00Z' },
    { id: 'date-only', published_at: '2026-11-10T00:00:00' },
    { id: 'early', published_at: '2026-11-10T03:00:00Z' },
  ] }] });
  assert.deepEqual(events.map(e => [e.id, e.clock]), [['early', true], ['late', true], ['date-only', false]]);
});
test('viral accounts rank by interactions_v1: parts first, a digit string counts, unknown is left out', () => {
  const rows=[{platform:'x',author:'A',metrics:{likes:'30',engagement:1}},{platform:'x',author:'B',metrics:{likes:true,comments:2.5,engagement:20}},{platform:'x',author:'C',metrics:{likes:-5,engagement:null}}];
  assert.deepEqual([...replay.topViralAccounts(rows,1)],['x:a'],'the reported likes, not the stale stored total');
  assert.deepEqual([...replay.topViralAccounts(rows,2)].sort(),['x:a','x:b'],'nothing reported: the stored total stands in');
  assert.deepEqual([...replay.topViralAccounts([{platform:'x',author:'C',metrics:{views:9}}],3)],[],'no interaction known: no viral account');
});
test('top account badge counts a post without a name for its channel by id', () => {
  const rows=[{platform:'youtube',author:'',metrics:{author_id:'UC9',likes:9}},{platform:'youtube',author:'Kanal',metrics:{author_id:'UC1',likes:2}}];
  assert.deepEqual([...replay.topViralAccounts(rows,1)],['youtube:UC9']);
});
test('while the replay is scrubbed, a date-only post appears once the cutoff passes the end of its local day', async () => {
  // clock_v1: a post stored at 00:00:00 UTC has a date and no hour, so it is not published at midnight UTC. In WIB its
  // day 2026-11-10 ends at 2026-11-10T17:00:00Z; until then the replay does not show it, in the frame or in the list.
  const { setZone, zone } = await import('./pulseMeasures.js');
  const dateOnly = { id: 'd', published_at: '2026-11-10T00:00:00' };
  const timed = { id: 't', published_at: '2026-11-10T03:00:00Z' };
  const at = text => Date.parse(text);
  assert.equal(replay.publishedBy(dateOnly.published_at, at('2026-11-10T03:00:00Z')), false);
  assert.equal(replay.publishedBy(dateOnly.published_at, at('2026-11-10T16:59:59Z')), false);
  assert.equal(replay.publishedBy(dateOnly.published_at, at('2026-11-10T17:00:00Z')), true);
  assert.equal(replay.publishedBy(dateOnly.published_at, Infinity), true);
  assert.equal(replay.publishedBy(timed.published_at, at('2026-11-10T03:00:00Z')), true);
  assert.equal(replay.publishedBy(timed.published_at, at('2026-11-10T02:59:59Z')), false);
  assert.equal(replay.publishedBy(null, at('2026-11-10T03:00:00Z')), false);
  const sample = { nodes: [{ id: 'x:d' }, { id: 'x:t' }], accounts: [{ id: 'x:d', evidence: [dateOnly] }, { id: 'x:t', evidence: [timed] }], edges: [] };
  assert.deepEqual(replay.replayFrame(sample, at('2026-11-10T03:00:00Z')).nodes.map(n => n.id), ['x:t']);
  assert.deepEqual(replay.replayFrame(sample, at('2026-11-10T17:00:00Z')).nodes.map(n => n.id), ['x:d', 'x:t']);
  const events = replay.replayEvents(sample);
  assert.deepEqual(replay.eventsUntil(events, at('2026-11-10T03:00:00Z')).map(e => e.id), ['t']);
  assert.deepEqual(replay.eventsUntil(events, at('2026-11-10T17:00:00Z')).map(e => e.id), ['t', 'd']);
  assert.deepEqual(replay.eventsUntil(events, Infinity).map(e => e.id), ['t', 'd']);
  const before = zone();
  setZone({ offset_minutes: 540, name: 'WIT' });
  try {
    assert.equal(replay.publishedBy(dateOnly.published_at, at('2026-11-10T14:59:59Z')), false);
    assert.equal(replay.publishedBy(dateOnly.published_at, at('2026-11-10T15:00:00Z')), true);
  } finally { setZone(before); }
});
