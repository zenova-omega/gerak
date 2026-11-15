// When does a comment get the "Perlu ditinjau" mark? When a reading may be wrong, not when a comment takes no side.
// Most comments discuss an issue without supporting or opposing anything; that is an answer ("Membahas"), not a doubt.

/** One reading (sentiment or stance) needs a second look when the analysis flagged it or was not confident.
 * A stance of "unclear" never does, whatever was stored with it. */
export function readingNeedsReview(reading, kind = 'sentiment') {
  if (!reading || !reading.label) return false;
  if (kind === 'stance' && reading.label === 'unclear') return false;
  return Boolean(reading.review_needed) || (typeof reading.confidence === 'number' && reading.confidence < 0.65);
}

/** A comment is marked when its sentiment, or a side it actually takes, needs a second look. */
export function commentNeedsReview(comment) {
  return readingNeedsReview(comment?.sentiment, 'sentiment') || readingNeedsReview(comment?.stance, 'stance');
}
