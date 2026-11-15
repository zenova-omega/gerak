import test from 'node:test';
import assert from 'node:assert/strict';
import { readingNeedsReview, commentNeedsReview } from './pulseCommentReview.js';

const reading = (label, confidence, review_needed = false) => ({ label, confidence, review_needed });

test('a comment that takes no side is not sent to review, however its "side" was stored', () => {
  assert.equal(commentNeedsReview({ sentiment: reading('neutral', 0.9), stance: reading('unclear', 0, true) }), false);
  assert.equal(commentNeedsReview({ sentiment: reading('negative', 0.9), stance: reading('unclear', 0.3) }), false);
});

test('a doubtful sentiment, or a side taken with little confidence, is sent to review', () => {
  assert.equal(commentNeedsReview({ sentiment: reading('negative', 0.5), stance: reading('unclear', 0.9) }), true);
  assert.equal(commentNeedsReview({ sentiment: reading('neutral', 0.9, true), stance: null }), true);
  assert.equal(commentNeedsReview({ sentiment: reading('positive', 0.9), stance: reading('supports', 0.6) }), true);
  assert.equal(commentNeedsReview({ sentiment: reading('positive', 0.9), stance: reading('opposes', 0.9, true) }), true);
  assert.equal(commentNeedsReview({ sentiment: reading('positive', 0.9), stance: reading('supports', 0.9) }), false);
});

test('a comment that was not analysed has nothing to review', () => {
  assert.equal(commentNeedsReview({}), false);
  assert.equal(readingNeedsReview(null), false);
  assert.equal(readingNeedsReview(reading('unclear', 0, true), 'stance'), false);
  assert.equal(readingNeedsReview(reading('opposes', 0.4), 'stance'), true);
});
