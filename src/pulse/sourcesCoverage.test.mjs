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

test('source times read in WIB like the rest of the product, and an old balance can say how old it is', async () => {
  const { balanceAgeHours } = await import('./sourcesCoverage.js');
  assert.match(formatSourceTime('2026-11-10T21:00:00'), /^11 Nov 2026.+04\.00 WIB$/);
  const now = Date.parse('2026-11-14T09:00:00Z');
  assert.equal(balanceAgeHours('2026-11-10T21:00:00', now), 84);
  assert.equal(balanceAgeHours('2026-11-14T08:40:00Z', now), 0);
  assert.equal(balanceAgeHours('2026-11-14T10:00:00Z', now), 0, 'a clock slightly ahead is not a negative age');
  assert.equal(balanceAgeHours(null, now), null);
  assert.equal(balanceAgeHours('bukan waktu', now), null);
});

test('the shell speaks up only when collection has really stopped, and never names the provider', async () => {
  const { collectionNotice } = await import('./sourcesCoverage.js');
  assert.equal(collectionNotice({ state: 'ok', credits_remaining: 5832 }), null);
  assert.equal(collectionNotice({ state: 'paused', until: '2026-11-14T09:15:00' }), null, 'a short wait ends by itself and is not worth a banner');
  assert.equal(collectionNotice(null), null);
  const empty = collectionNotice({ state: 'empty', credits_remaining: 0 });
  assert.match(empty.title, /Saldo sumber data habis/);
  assert.match(empty.text, /diisi lagi/);
  assert.match(empty.text, /lanjut sendiri/);
  assert.match(empty.text, /Analisis .*tetap berjalan/);
  const access = collectionNotice({ state: 'access' });
  assert.match(access.title, /ditolak/);
  assert.match(access.text, /Analisis .*tetap berjalan/);
  for (const notice of [empty, access]) assert.doesNotMatch(notice.title + notice.text, /xpoz|provider/i);
});

test('a manual collection covers the project lookback, ending today', async () => {
  const { lookbackRange } = await import('./sourcesCoverage.js');
  const now = new Date('2026-11-14T10:00:00Z');
  assert.deepEqual(lookbackRange(7, now), { from: '2026-11-08', to: '2026-11-14' });
  assert.deepEqual(lookbackRange(1, now), { from: '2026-11-14', to: '2026-11-14' });
  assert.deepEqual(lookbackRange(undefined, now), { from: '2026-11-08', to: '2026-11-14' });
  assert.deepEqual(lookbackRange(500, now).from, '2026-08-15');          // the pull accepts at most 92 days
});

test('the Threads row says what the saved token can do, from stored facts only', async () => {
  const { threadsStatus } = await import('./sourcesCoverage.js');
  const context = { topicId: 'topic-1', readOnly: false, busy: false, now: new Date('2026-11-15T02:00:00Z') };
  const account = { connected: true, username: 'akun.uji', permissions_verified: true, search_permission: true, expires_at: '2027-01-14T00:36:58' };
  const row = (connection, extra = {}) => ({ platform: 'threads', provider: 'threads', configured: true, keyword_collection_available: connection?.search_permission === true, connection, last_attempt: null, ...extra });
  const said = status => status.lines.join(' ');

  const missing = threadsStatus({ platform: 'threads', configured: false, connection: null }, context);
  assert.match(said(missing), /Token Threads belum disimpan/);
  assert.equal(missing.canCollect, false);

  const unchecked = threadsStatus(row(null), context);
  assert.match(said(unchecked), /belum diperiksa/);
  assert.equal(unchecked.canCollect, false);

  assert.match(said(threadsStatus(row({ connected: false, reason: 'api_error' }), context)), /Koneksi ditolak/);

  // The token the app dashboard hands out by default: connected, but it cannot search.
  const cannotSearch = threadsStatus(row({ ...account, search_permission: false }), context);
  assert.match(said(cannotSearch), /@akun\.uji/);
  assert.match(said(cannotSearch), /belum membawa izin pencarian keyword/);
  assert.match(said(cannotSearch), /berlaku sampai 14 Jan 2027/);
  assert.equal(cannotSearch.canCollect, false);
  assert.match(cannotSearch.reason, /izin pencarian/);

  const ready = threadsStatus(row(account), context);
  assert.equal(ready.canCollect, true);
  assert.equal(ready.reason, null);
  assert.match(said(ready), /hanya menjangkau posting akun yang terhubung/, 'what a search covers before the platform approves the app is said up front');

  assert.match(threadsStatus(row(account), { ...context, topicId: '' }).reason, /Pilih satu topik/);
  assert.equal(threadsStatus(row(account), { ...context, readOnly: true }).canCollect, false);
  assert.equal(threadsStatus(row(account), { ...context, busy: true }).canCollect, false);

  const unknown = threadsStatus(row({ ...account, permissions_verified: false, search_permission: null, expires_at: null }), context);
  assert.match(said(unknown), /belum berhasil dibaca/);
  assert.equal(unknown.canCollect, false);

  assert.match(said(threadsStatus(row({ ...account, expires_at: '2026-11-18T00:00:00' }), context)), /Token berakhir 18 Nov 2026/, 'a token in its last week asks to be renewed');
  const ended = threadsStatus(row({ ...account, expires_at: '2026-11-14T00:00:00' }), context);
  assert.match(said(ended), /sudah berakhir/);
  assert.equal(ended.canCollect, false);

  for (const [error, words] of [['permission', /izin pencarian/], ['token', /tidak berlaku lagi/], ['quota', /jatah pencarian/], ['network', /tidak dapat dihubungi/]]) {
    assert.match(said(threadsStatus(row(account, { last_attempt: { status: 'failed', error } }), context)), words);
  }
  assert.doesNotMatch(said(threadsStatus(row(account, { last_attempt: { status: 'succeeded', error: null } }), context)), /ditolak/);
});
