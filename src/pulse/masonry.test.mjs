import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MASONRY_ROW, masonrySpan } from './useMasonry.js';

test('a card spans the rows its own height needs, plus the gap, so cards keep their own heights and pack under each other', () => {
  assert.equal(MASONRY_ROW, 4);
  assert.equal(masonrySpan(400, 12), 103, '(400 + 12) / 4 = 103 rows');
  assert.equal(masonrySpan(401, 12), 104, 'a part of a row is a whole row, so nothing is cut');
  assert.equal(masonrySpan(0, 12), 3, 'an empty card still keeps the gap');
  assert.equal(masonrySpan(Number.NaN, 12), null, 'an unreadable height leaves the card to the normal grid');
});

test('the grid of "Posting di balik angka" packs its cards; the list view is untouched', () => {
  const page = readFileSync(new URL('./SentimentAnalytics.jsx', import.meta.url), 'utf8');
  assert.match(page, /useMasonry\(evidenceList,\s*layout==='grid'/);
  assert.match(page, /<ol ref=\{evidenceList\} className="psa-evidence" data-layout=\{layout\}/);
  const css = readFileSync(new URL('./ds/analytics-kit.css', import.meta.url), 'utf8');
  assert.match(css, /\.psa-evidence\[data-layout=grid\] \{[^}]*align-items: start;/, 'without the script, cards still keep their own height');
  assert.doesNotMatch(css, /\.psa-evidence\[data-layout=grid\] > \.pse-card \{[^}]*grid-template-rows: auto 1fr auto auto/, 'the caption row no longer stretches');
});
