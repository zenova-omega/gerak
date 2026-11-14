import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionBlock, coverageField, safeSourceError, collectionResult, canManageSources, formatSourceTime } from './sourcesCoverage.js';

test('server UTC timestamps are not reinterpreted in the browser local timezone', () => {
  assert.equal(formatSourceTime('2026-11-10T20:58:10.441900'), formatSourceTime('2026-11-10T20:58:10.441900Z'));
});

const ready = { topicId: 'topic-1', readOnly: false, busy: false, source: { platform: 'instagram', configured: true, tool_available: true }, budget: { daily_limit: 5, used: 0, blocked_reason: null } };

test('collection requires a topic and write access, even with an available tool', () => {
  assert.equal(collectionBlock(ready), null);
  assert.ok(collectionBlock({ ...ready, topicId: '' }));
  assert.ok(collectionBlock({ ...ready, readOnly: true }));
  assert.ok(collectionBlock({ ...ready, busy: true }));
  assert.equal(canManageSources({ role: 'analyst' }), false);
  assert.equal(canManageSources(), false);
  assert.equal(canManageSources({ role: 'owner' }), true);
  assert.equal(canManageSources({ role: 'admin' }), true);
});

test('collection blocks exhausted, missing or blocked budget and unavailable providers', () => {
  for (const budget of [null, { daily_limit: 5, used: 5 }, { daily_limit: 0, used: 0 }, { daily_limit: 5, used: 0, blocked_reason: 'secret provider details' }]) {
    const reason = collectionBlock({ ...ready, budget });
    assert.ok(reason);
    assert.ok(!reason.includes('secret'));
  }
  for (const source of [null, { ...ready.source, configured: false }, { ...ready.source, tool_available: false }, { ...ready.source, tool_available: null }, { ...ready.source, platform: 'x' }]) {
    assert.ok(collectionBlock({ ...ready, source }));
  }
});

test('field coverage distinguishes missing data, zero and actual stored counts', () => {
  assert.deepEqual(coverageField(3, 5), { count: 3, total: 5, percent: 60 });
  assert.deepEqual(coverageField(0, 5), { count: 0, total: 5, percent: 0 });
  assert.deepEqual(coverageField(0, 0), { count: 0, total: 0, percent: null });
  assert.equal(coverageField(null, 5), null);
  assert.equal(coverageField(6, 5), null);
});

test('provider error text is never exposed, including HTTP conflicts and topic deletion', () => {
  for (const status of [401, 403, 404, 409, 500, undefined]) {
    assert.ok(!safeSourceError({ status, message: 'SECRET_TOKEN provider trace' }).includes('SECRET'));
  }
  assert.match(safeSourceError({ status: 409 }), /batas|berjalan|diblokir/i);
  assert.match(safeSourceError({ status: 404 }), /topik/i);
});

test('collection results do not mistake pending or empty for success or expose errors', () => {
  assert.match(collectionResult({ status: 'succeeded', fetched: 5, ingested: 3 }), /5.*3/);
  assert.match(collectionResult({ status: 'empty' }), /tidak ada/i);
  assert.match(collectionResult({ status: 'pending' }), /menunggu|berjalan/i);
  assert.ok(!collectionResult({ status: 'failed', error: 'SECRET_TOKEN' }).includes('SECRET'));
});
