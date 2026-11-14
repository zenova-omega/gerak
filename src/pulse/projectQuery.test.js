import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectQuery, projectSearch, quickSearchDestination } from './projectQuery.js';
test('builds quoted alternatives, required terms and exclusions without duplicates', () => {
  assert.equal(buildProjectQuery('penyadapan, disadap, penyadapan', 'presiden', 'film, trailer'), '("penyadapan" OR "disadap") AND "presiden" NOT "film" NOT "trailer"');
});
test('requires a main keyword and rejects query operators inside a term', () => {
  assert.throws(() => buildProjectQuery('', '', 'film'));
  assert.throws(() => buildProjectQuery('test" OR *', '', ''));
});
test('switching project preserves filters but clears alert scope', () => {
  assert.equal(projectSearch('?topic=old&alert=alert1&range=7', 'new'), 'topic=new&range=7');
});
test('selecting a project clears the unrelated global search phrase', () => {
  assert.equal(projectSearch('?q=gibran&topic=old', 'new'), 'topic=new');
});
test('a standalone post search opens real search instead of all project posts', () => {
  assert.equal(quickSearchDestination('/pulse/posts', '?q=gibran'), '/pulse/search?q=gibran');
  assert.equal(quickSearchDestination('/pulse/posts', '?topic=one&q=gibran'), null);
  assert.equal(quickSearchDestination('/pulse/monitor', '?q=gibran'), null);
  assert.equal(quickSearchDestination('/pulse/posts', '?q=%20'), null);
});
