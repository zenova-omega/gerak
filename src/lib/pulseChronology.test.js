import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chronologyRows, chronologyPage, observedProfile } from './pulseChronology.js';
import { replayFrame } from './pulseReplay.js';

const early = { id: 'early', author: '@A', platform: 'x', title: 'Early evidence', published_at: '2026-11-10T01:00:00Z' };
const late = { id: 'late', author: '@B', platform: 'x', published_at: '2026-11-10T03:00:00Z' };
const unknown = { id: 'unknown', author: '@A', platform: 'x', published_at: null };
const data = {
  nodes: [{ id: 'x:a', label: '@A', platform: 'x', observed: true }, { id: 'x:b', label: '@B', platform: 'x', observed: true }],
  accounts: [{ id: 'x:a', evidence: [unknown, early, early] }, { id: 'x:b', evidence: [late] }],
  edges: [{ source: 'x:a', target: 'x:b', kind: 'mention', evidence: [early] }],
};

test('chronology sorts publications oldest first, deduplicates and puts unknown dates last', () => {
  const rows = chronologyRows(data);
  assert.deepEqual(rows.map(p => [p.id, p.accountId]), [['early', 'x:a'], ['late', 'x:b'], ['unknown', 'x:a']]);
  assert.equal(rows[2].time, null);
  assert.equal(data.accounts[0].evidence[0].id, 'unknown');
});

test('chronology respects relation and isolated-account filters', () => {
  assert.deepEqual(chronologyRows(data, { kind: 'similarity', includeIsolated: false }), []);
  assert.equal(chronologyRows(data, { kind: 'mention', includeIsolated: false }).length, 3);
  assert.equal(chronologyRows(data, { kind: 'similarity', includeIsolated: true }).length, 3);
});

test('chronology consumes historical frames without future or unknown-date evidence', () => {
  const frame = replayFrame(data, Date.parse('2026-11-10T02:00:00Z'));
  assert.deepEqual(chronologyRows(frame).map(p => p.id), ['early']);
});

test('chronology does not impose the graph 120-account limit', () => {
  const accounts = Array.from({ length: 125 }, (_, i) => ({ id: `account-${i}`, evidence: [{ id: i }] }));
  assert.equal(chronologyRows({ accounts, edges: [] }).length, 125);
});

test('pages contain fifteen records with accurate dated/unknown counts and clamp after filtering', () => {
  const rows = Array.from({ length: 32 }, (_, i) => ({ id: i, time: i < 30 ? i : null }));
  const first = chronologyPage(rows, 0);
  assert.equal(first.rows.length, 15);
  assert.deepEqual([first.total, first.dated, first.unknown, first.pages], [32, 30, 2, 3]);
  assert.deepEqual(chronologyPage(rows, 1).rows.map(p => p.id), [15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]);
  assert.deepEqual(chronologyPage(rows, 99).rows.map(p => p.id), [30,31]);
  assert.equal(chronologyPage([], 99).page, 0);
  assert.equal(chronologyPage([], 99).total, 0);
});

test('profile exposes only observed account fields and deduplicated current evidence', () => {
  const profile = observedProfile({ ...data.nodes[0], age: 25, gender: 'guess', bio: 'unverified', location: 'guess' }, data.accounts[0]);
  assert.deepEqual(profile, {
    label: '@A', platform: 'x', status: 'Posting teramati', count: 2,
    first: early.published_at, last: early.published_at, unknown: 1,
    bio: 'Tidak tersedia dalam data saat ini', demography: 'Tidak diketahui; tidak disimpulkan',
  });
});

test('mention-only accounts never inherit a profile or publications from a similar identity', () => {
  const profile = observedProfile({ id: 'x:other', label: '@A', platform: 'x', observed: false }, data.accounts[0]);
  assert.equal(profile.count, 0);
  assert.equal(profile.first, null);
  assert.equal(profile.status, 'Hanya disebut');
});

test('a date-only post is left out of the time order and counted as left out', () => {
  const dateOnly = { id: 'date-only', author: '@C', platform: 'instagram', published_at: '2026-11-10T00:00:00' };
  const frame = { accounts: [{ id: 'x:a', evidence: [late, dateOnly, early, unknown] }], edges: [] };
  const rows = chronologyRows(frame);
  assert.deepEqual(rows.map(p => p.id), ['early', 'late', 'date-only', 'unknown'], 'timed posts first, then date-only, then undated');
  assert.equal(rows.find(p => p.id === 'date-only').clock, false);
  const page = chronologyPage(rows);
  assert.deepEqual([page.total, page.dated, page.unknown, page.dateOnly], [4, 3, 1, 1]);
  const profile = observedProfile({ id: 'x:a', label: '@A', platform: 'x' }, frame.accounts[0]);
  assert.deepEqual([profile.first, profile.last], [early.published_at, late.published_at], 'first and last by time skip a date-only post');
});
