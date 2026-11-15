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
test('public accounts typed as a handle or a profile link become @ terms in the query\'s OR group', async () => {
  const { accountTerms, explainProjectQuery } = await import('./projectQuery.js');
  assert.equal(accountTerms('@tokoh, tokoh, https://x.com/tokoh_resmi, instagram.com/tokoh.id/, https://www.tiktok.com/@tokoh'), '@tokoh, @tokoh_resmi, @tokoh.id');
  assert.equal(buildProjectQuery('Nama Tokoh', '', '', '', '@tokoh, https://x.com/tokoh_resmi'), '("Nama Tokoh" OR "@tokoh" OR "@tokoh_resmi")');
  assert.equal(buildProjectQuery('Nama Tokoh', 'Jakarta', '', '', ''), '"Nama Tokoh" AND "Jakarta"');
  assert.throws(() => accountTerms('bukan akun!'), /tidak dikenali/);
  assert.throws(() => buildProjectQuery('Nama Tokoh', '', '', '', 'a b c'), /tidak dikenali/);
  assert.match(explainProjectQuery('Nama Tokoh', '', '', '', '@tokoh'), /“@tokoh”.*sebutan di teks posting/);
});
