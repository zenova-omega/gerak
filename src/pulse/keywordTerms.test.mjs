import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTerms, appendToQuery, splitKeywordTerms } from './keywordTerms.js';

test('confirmed keywords merge without duplicates and extend a Boolean query by kind', () => {
  assert.deepEqual(splitKeywordTerms(' a, ,b '), ['a', 'b']);
  assert.equal(mergeTerms('Gibran, wapres', ['WAPRES', 'mundur']), 'Gibran, WAPRES, mundur');
  assert.equal(mergeTerms('', []), '');
  assert.equal(appendToQuery('Gibran AND mundur', { variation: ['wapres mundur'], context: ['Jakarta'], exclude: ['lowongan'] }),
    '(Gibran AND mundur OR "wapres mundur") AND "Jakarta" NOT "lowongan"');
  assert.equal(appendToQuery('contoh', { variation: [], context: [], exclude: [] }), 'contoh');
});
