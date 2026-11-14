// Emoji actually typed in a set of texts. Counts each emoji once per text it appears in, so one
// comment with twenty hearts does not outrank twenty comments with one.
const pictograph = /\p{Extended_Pictographic}/u;
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('id', { granularity: 'grapheme' }) : null;

export function emojiIn(text) {
  if (typeof text !== 'string' || !pictograph.test(text)) return [];
  const parts = segmenter ? [...segmenter.segment(text)].map(part => part.segment) : [...text];
  // Skin tone and presentation variants count as the same emoji.
  return [...new Set(parts.filter(part => pictograph.test(part)).map(part => part.replace(/\p{Emoji_Modifier}|\uFE0F/gu, '')))];
}

/** @returns {{emoji: string, count: number}[]} most used first; `count` is the number of texts. */
export function topEmoji(texts, limit = 8) {
  const counts = new Map();
  for (const text of texts) for (const emoji of emojiIn(text)) counts.set(emoji, (counts.get(emoji) || 0) + 1);
  return [...counts].map(([emoji, count]) => ({ emoji, count })).sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji)).slice(0, limit);
}

/** Hashtags as typed, case-folded, counted once per text. @returns {{tag: string, count: number}[]} */
export function topHashtags(texts, limit = 40) {
  const counts = new Map();
  for (const text of texts) {
    if (typeof text !== 'string') continue;
    // A run of hex digits is a colour code that leaked from page markup (#6f6f6f), and a bare number is a list marker (#1): neither is a hashtag.
    for (const tag of new Set((text.match(/#[\p{L}\p{N}_]{2,40}/gu) || []).map(value => value.toLowerCase()).filter(value => !/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8}|\d+)$/.test(value)))) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, limit);
}

/** A stable pseudo-random number in [0, 1) from a string, so a cloud keeps its layout between renders. */
export function seeded(text, salt = 0) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}
