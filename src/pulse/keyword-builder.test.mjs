import test from 'node:test';
import assert from 'node:assert/strict';
import * as query from './projectQuery.js';

test('variations join main alternatives without changing required or excluded mapping', () => {
  assert.equal(query.buildProjectQuery('transportasi', 'Jakarta, publik', 'iklan', 'angkutan, transportasi'), '("transportasi" OR "angkutan") AND "Jakarta" AND "publik" NOT "iklan"');
});

test('variations obey validation and cannot replace the main term', () => {
  assert.throws(() => query.buildProjectQuery('transportasi', '', '', 'bad"term'));
  assert.throws(() => query.buildProjectQuery('transportasi', '', '', 'x'.repeat(250)));
  assert.throws(() => query.buildProjectQuery('', '', '', 'angkutan'));
});

test('explanation includes alternatives, every context term and exclusions', () => {
  assert.equal(typeof query.explainProjectQuery, 'function');
  assert.equal(query.explainProjectQuery('transportasi', 'Jakarta, publik', 'iklan', 'angkutan'), 'Cocok dengan salah satu: “transportasi”, “angkutan”. Wajib memuat semua: “Jakarta”, “publik”. Abaikan jika memuat salah satu: “iklan”.');
  assert.equal(query.explainProjectQuery('transportasi'), 'Cocok dengan salah satu: “transportasi”. Tanpa konteks wajib. Tanpa pengecualian.');
});

test('persisted variants reopen as main alternatives with identical any/all/exclude semantics', () => {
  const saved = '("transportasi" OR "angkutan") AND "Jakarta" NOT "iklan"';
  assert.deepEqual(query.parseProjectQuery(saved), { main: 'transportasi, angkutan', required: 'Jakarta', excluded: 'iklan' });
  assert.equal(query.buildProjectQuery(...Object.values(query.parseProjectQuery(saved))), saved);
});

test('unsupported legacy queries are never approximated by the builder parser', () => {
  for (const raw of ['transportasi OR angkutan', '"bus" AND ("Jakarta" OR "Bandung")', '  "bus"  ', '"bus, kota"']) {
    assert.equal(query.parseProjectQuery(raw), null);
  }
});
