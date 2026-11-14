import test from 'node:test';
import assert from 'node:assert/strict';
import { emojiIn, topEmoji, topHashtags, seeded } from './pulseEmoji.js';

test('emoji are counted once per text and skin tones merge', () => {
  assert.deepEqual(emojiIn('mantap 👍👍🏽 🔥'), ['👍', '🔥']);
  assert.deepEqual(emojiIn('tanpa emotikon ?????'), []);
  assert.deepEqual(emojiIn(null), []);
  const top = topEmoji(['❤️❤️❤️', 'setuju ❤ 🔥', '🔥', 'biasa saja'], 2);
  assert.deepEqual(top, [{ emoji: '❤', count: 2 }, { emoji: '🔥', count: 2 }]);
});

test('hashtags are folded, counted once per text, and the layout seed is stable', () => {
  assert.deepEqual(topHashtags(['#Sadap #sadap ramai', 'lagi #SADAP dan #prabowo', 'tanpa tagar # a']), [{ tag: '#sadap', count: 2 }, { tag: '#prabowo', count: 1 }]);
  assert.deepEqual(topHashtags(['warna #6f6f6f dan #fff, nomor #1, tetapi #2026pemilu dan #abcde tetap']).map(row => row.tag), ['#2026pemilu', '#abcde']);
  assert.equal(seeded('#sadap', 1), seeded('#sadap', 1));
  assert.ok(seeded('#sadap') >= 0 && seeded('#sadap') < 1);
});
