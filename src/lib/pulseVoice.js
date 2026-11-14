// Who is speaking, and what a neutral text actually is.
//
// A project mixes two very different voices: the public on social platforms and the press. News is
// written to sound neutral, so one combined sentiment figure mostly measures how much news was collected.
// Public opinion itself is read from comments, where people answer what was posted.
import { postSentiment } from './pulsePostFilters.js';

export const voiceLabels = { public: 'Suara warganet', news: 'Pemberitaan', all: 'Semua sumber' };
export const voiceOf = post => (post?.platform === 'news' ? 'news' : 'public');
export const inVoice = (posts, voice) => (voice === 'public' || voice === 'news' ? posts.filter(post => voiceOf(post) === voice) : posts);

// The form of a neutral text. `report` is a news item; the model names the other four; `unsorted` is a
// neutral text analysed before forms existed and not yet revisited.
export const kindOrder = ['report', 'statement', 'question', 'call', 'sarcasm', 'unsorted'];
export const kindLabels = { report: 'Berita', statement: 'Pernyataan', question: 'Pertanyaan', call: 'Ajakan', sarcasm: 'Sindiran', unsorted: 'Belum dirinci' };
export const kindHints = {
  report: 'Laporan media: ditulis datar, jadi netral di sini bukan berarti publik tidak peduli.',
  statement: 'Menyampaikan sesuatu tanpa nada yang jelas.',
  question: 'Bertanya, belum mengambil posisi.',
  call: 'Mengajak orang berbuat sesuatu: ikut, sebarkan, dukung, tolak.',
  sarcasm: 'Kata-katanya datar atau memuji, maksudnya mengejek. Baca langsung sebelum disimpulkan.',
  unsorted: 'Netral yang dianalisis sebelum rincian ini ada. Diisi bertahap.',
};
const modelKinds = ['statement', 'question', 'call', 'sarcasm'];
const emptyKinds = () => Object.fromEntries(kindOrder.map(key => [key, 0]));

/** The form of a neutral post, or null when the post is not neutral. */
export function neutralKind(post) {
  if (postSentiment(post) !== 'neutral') return null;
  if (voiceOf(post) === 'news') return 'report';
  const kind = post.metrics?.sentiment?.kind;
  return modelKinds.includes(kind) ? kind : 'unsorted';
}
export function neutralBreakdown(posts) {
  const counts = emptyKinds();
  for (const post of posts) { const kind = neutralKind(post); if (kind) counts[kind]++; }
  return counts;
}

/** Public opinion from analysed comments (the `comments` of `responseEvidence`).
 * @returns {{total:number, analysed:number, posts:number, counts:object, stance:object, kinds:object, lead:string|null}}
 * `counts` and `stance` include `unknown` for comments not analysed yet; `kinds` covers neutral comments only. */
export function publicOpinion(comments = []) {
  const counts = { positive: 0, neutral: 0, negative: 0, unknown: 0 }, stance = { supports: 0, opposes: 0, unclear: 0, unknown: 0 };
  const kinds = emptyKinds(), posts = new Set();
  for (const comment of comments) {
    const label = comment.sentiment?.label;
    if (!Object.hasOwn(counts, label) || label === 'unknown') { counts.unknown++; stance.unknown++; continue; }
    counts[label]++;
    stance[Object.hasOwn(stance, comment.stance?.label) ? comment.stance.label : 'unknown']++;
    if (comment.post?.id != null) posts.add(comment.post.id);
    if (label === 'neutral') kinds[modelKinds.includes(comment.sentiment.kind) ? comment.sentiment.kind : 'unsorted']++;
  }
  const analysed = counts.positive + counts.neutral + counts.negative;
  return { total: comments.length, analysed, posts: posts.size, counts, stance, kinds, lead: leading(counts) };
}

/** The largest analysed sentiment, or null when nothing is analysed. A tie goes to the more cautious reading: negative, then neutral. */
export function leading(counts) {
  const analysed = counts.positive + counts.neutral + counts.negative;
  return analysed ? ['negative', 'neutral', 'positive'].reduce((best, key) => (counts[key] > counts[best] ? key : best), 'negative') : null;
}

/** Whole-number shares that add up to 100 (largest remainder), so a bar's legend never reads 99% or 101%. */
export function shares(counts, keys) {
  const total = keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
  if (!total) return Object.fromEntries(keys.map(key => [key, 0]));
  const exact = keys.map(key => [key, (counts[key] || 0) / total * 100]);
  const result = Object.fromEntries(exact.map(([key, value]) => [key, Math.floor(value)]));
  let left = 100 - Object.values(result).reduce((sum, value) => sum + value, 0);
  for (const [key] of [...exact].sort((a, b) => (b[1] % 1) - (a[1] % 1))) { if (left-- <= 0) break; result[key]++; }
  return result;
}
