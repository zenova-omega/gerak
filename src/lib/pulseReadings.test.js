import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RULES, RULE_TEXT, words, postTerms, periodBefore, coverage, termShift, hourGrid, concentration, postsWithTerm, leadingAccounts, postsInCell } from './pulseReadings.js';
import { RULES as MEASURES, setZone } from './pulseMeasures.js';
import { STOPWORDS, wordFrequency } from './pulseInfographics.js';
import { previousPeriod } from './pulseOverview.js';

const CASES = JSON.parse(readFileSync(new URL('../../shared/pulse-readings.cases.json', import.meta.url), 'utf8'));
const ZONE = CASES.zone;
const each = (name, check) => {
  for (const [index, item] of CASES[name].entries()) test(`${name}: ${item.note || index}`, () => check(item));
};
/** `{"times": n, ...}` stands for n posts; `{i}` in the author becomes 01, 02, ... */
const posts = rows => rows && rows.flatMap(row => Array.from({ length: row.times ?? 1 }, (_, index) => {
  const { times, ...post } = row;
  if (typeof post.author === 'string') post.author = post.author.replace('{i}', String(index + 1).padStart(2, '0'));
  if (times !== undefined && 'id' in post) post.id = `${post.id}-${index + 1}`;
  return post;
}));
/** Equal, with a share written as "3/11" compared as a number. */
function same(actual, expected, path = 'out') {
  if (typeof expected === 'string' && /^[0-9]+\/[0-9]+$/.test(expected)) {
    const [top, bottom] = expected.split('/').map(Number);
    assert.equal(typeof actual, 'number', path);
    assert.ok(Math.abs(actual - top / bottom) < 1e-9, `${path}: ${actual} is not ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual) && actual.length === expected.length, `${path}: ${JSON.stringify(actual)}`);
    expected.forEach((item, index) => same(actual[index], item, `${path}[${index}]`));
  } else if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), `${path}: ${JSON.stringify(actual)}`);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path);
    for (const key of Object.keys(expected)) same(actual[key], expected[key], `${path}.${key}`);
  } else if (typeof expected === 'number') {
    assert.equal(typeof actual, 'number', path);
    assert.ok(Math.abs(actual - expected) < 1e-9, `${path}: ${actual} is not ${expected}`);
  } else assert.equal(actual, expected, path);
}
const inZone = (item, run) => {
  setZone({ ...ZONE, offset_minutes: item.offset ?? ZONE.offset_minutes });
  try { run(); } finally { setZone(ZONE); }
};

test('rule names, versions and sentences', () => {
  assert.deepEqual(Object.entries(RULES), CASES.rules.map(rule => [rule.name, rule.version]));
  assert.deepEqual(RULE_TEXT, Object.fromEntries(CASES.rules.map(rule => [rule.name, rule.text])));
  for (const text of Object.values(RULE_TEXT)) assert.ok(/^[A-Z]/.test(text) && !text.includes('—'));
  assert.equal(Object.keys(RULES).filter(name => name in MEASURES).length, 0, 'a reading never reuses the name of a part 1 rule');
});

test('the stop words of the cases are the word panel\'s own', () => {
  assert.deepEqual([...STOPWORDS].sort(), [...CASES.stopwords].sort());
});

each('words', item => assert.deepEqual(words(item.in), item.out));
each('terms', item => {
  const terms = postTerms(item.in);
  assert.ok(terms instanceof Set);
  assert.deepEqual([...terms].sort(), [...item.out].sort());
});
each('period_before', item => {
  assert.deepEqual(periodBefore(item.from, item.to), item.out);
  // The comparison period the overview already loads is the same days.
  if (item.out) assert.deepEqual(previousPeriod({ from: item.from, to: item.to }), item.out);
});
each('coverage', item => inZone(item, () => same(coverage(posts(item.in)), item.out)));
each('term_shift', item => same(termShift(posts(item.now), posts(item.before)), item.out));
each('hour_grid', item => inZone(item, () => {
  const rows = item.out.rows.map(row => ({ ...row, cells: Array.from({ length: 24 }, (_, hour) => row.cells[hour] ?? 0) }));
  same(hourGrid(posts(item.in)), { ...item.out, rows });
}));
each('concentration', item => inZone(item, () => same(concentration(posts(item.in)), item.out)));

test('the readings do not change the posts they are given', () => {
  const rows = posts(CASES.concentration[0].in), before = JSON.stringify(rows);
  coverage(rows); concentration(rows); hourGrid(rows); termShift(rows, rows);
  assert.equal(JSON.stringify(rows), before);
});

test('a single word is counted in as many posts as the word panel counts it', () => {
  const rows = [
    { id: 1, title: 'Banjir Jakarta', text: 'Warga mengungsi karena banjir' }, { id: 2, text: 'banjir lagi di jakarta' },
    { id: 3, text: 'Macet parah https://contoh.id/banjir' }, { id: 4, text: '' },
  ];
  const panel = Object.fromEntries(wordFrequency(rows).terms.map(row => [row.term, row.count]));
  for (const [term, count] of Object.entries(panel)) assert.equal(postsWithTerm(rows, term).length, count, term);
  assert.deepEqual(postsWithTerm(rows, 'banjir jakarta').map(post => post.id), [1], 'a pair is found inside one field only');
  assert.deepEqual(postsWithTerm(rows, ''), []);
});

test('the accounts behind a figure are the first of the same ranking', () => {
  for (const item of CASES.concentration) {
    const rows = posts(item.in), reading = concentration(rows);
    assert.deepEqual([...leadingAccounts(rows, 3)], reading.posts.top.map(row => row.account), item.note);
    if (reading.posts.reach80) assert.equal(leadingAccounts(rows, reading.posts.reach80.accounts).size, reading.posts.reach80.accounts);
  }
  assert.equal(leadingAccounts(null, 3).size, 0);
});

test('the posts behind a cell of the hour grid are the ones the cell counts', () => {
  for (const item of CASES.hour_grid) inZone(item, () => {
    const rows = posts(item.in).map((post, index) => ({ ...post, id: index })), grid = hourGrid(rows);
    let seen = 0;
    for (const row of grid.rows) row.cells.forEach((count, hour) => {
      const behind = postsInCell(rows, row, hour);
      assert.equal(behind.length, count, `${item.note}: ${row.day ?? row.weekday} ${hour}`);
      seen += behind.length;
    });
    assert.equal(seen, grid.clocked, item.note);
  });
});
