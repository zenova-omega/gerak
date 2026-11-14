import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inVoice, kindLabels, kindOrder, leading, neutralBreakdown, neutralKind, publicOpinion, shares, voiceOf } from './pulseVoice.js';

const post = (platform, label, kind) => ({ id: platform + label + kind, platform, metrics: label ? { sentiment: { label, ...(kind ? { kind } : {}) } } : {} });

test('news is the press, everything else is the public', () => {
  const posts = [post('news', 'neutral'), post('x', 'negative'), post('youtube', 'neutral'), post(undefined, 'positive')];
  assert.deepEqual(posts.map(voiceOf), ['news', 'public', 'public', 'public']);
  assert.equal(inVoice(posts, 'public').length, 3);
  assert.equal(inVoice(posts, 'news').length, 1);
  assert.equal(inVoice(posts, 'all').length, 4);
});

test('a neutral text is named by its form; a non-neutral one has none', () => {
  assert.equal(neutralKind(post('news', 'neutral', 'question')), 'report');       // a report stays a report whatever the model said
  assert.equal(neutralKind(post('x', 'neutral', 'sarcasm')), 'sarcasm');
  assert.equal(neutralKind(post('x', 'neutral')), 'unsorted');
  assert.equal(neutralKind(post('x', 'neutral', 'made-up')), 'unsorted');
  assert.equal(neutralKind(post('x', 'negative', 'sarcasm')), null);
  assert.equal(neutralKind(post('x')), null);
  const counts = neutralBreakdown([post('news', 'neutral'), post('x', 'neutral', 'question'), post('x', 'neutral', 'call'), post('x', 'neutral'), post('x', 'negative')]);
  assert.deepEqual(counts, { report: 1, statement: 0, question: 1, call: 1, sarcasm: 0, unsorted: 1 });
  assert.deepEqual(Object.keys(kindLabels), kindOrder);
});

test('public opinion counts analysed comments only and keeps the rest visible as unknown', () => {
  const comments = [
    { sentiment: { label: 'negative' }, stance: { label: 'opposes' }, post: { id: 'a' } },
    { sentiment: { label: 'negative' }, stance: { label: 'unclear' }, post: { id: 'a' } },
    { sentiment: { label: 'neutral', kind: 'question' }, stance: { label: 'unclear' }, post: { id: 'b' } },
    { sentiment: { label: 'neutral' }, stance: null, post: { id: 'b' } },
    { sentiment: null, stance: null, post: { id: 'c' } },
    { sentiment: { label: 'shouting' }, post: { id: 'c' } },
  ];
  const opinion = publicOpinion(comments);
  assert.equal(opinion.total, 6);
  assert.equal(opinion.analysed, 4);
  assert.equal(opinion.posts, 2);                       // posts that have at least one analysed comment
  assert.deepEqual(opinion.counts, { positive: 0, neutral: 2, negative: 2, unknown: 2 });
  assert.deepEqual(opinion.stance, { supports: 0, opposes: 1, unclear: 2, unknown: 3 });
  assert.equal(opinion.kinds.question, 1);
  assert.equal(opinion.kinds.unsorted, 1);
  assert.equal(opinion.lead, 'negative');               // a tie reads as the more cautious label
  assert.equal(publicOpinion([]).lead, null);
  assert.equal(leading({ positive: 5, neutral: 2, negative: 1 }), 'positive');
});

test('shares are whole numbers that add up to one hundred', () => {
  const result = shares({ positive: 1, neutral: 1, negative: 1 }, ['positive', 'neutral', 'negative']);
  assert.equal(result.positive + result.neutral + result.negative, 100);
  assert.deepEqual(shares({ positive: 0, neutral: 0, negative: 0 }, ['positive', 'neutral', 'negative']), { positive: 0, neutral: 0, negative: 0 });
  assert.deepEqual(shares({ negative: 45, neutral: 52, positive: 3 }, ['negative', 'neutral', 'positive']), { negative: 45, neutral: 52, positive: 3 });
});
