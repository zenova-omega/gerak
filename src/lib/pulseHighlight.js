// The highlight at the top of Ikhtisar: how loud the project was in a period against the one before, the mentions worth
// a look, and the accounts that posted most. Everything is counted by the calculation dictionary: the day (inPeriod,
// day_v1), interactions (interactionsTotal, interactions_v1: unknown is never 0), the order by interactions
// (byInteractions), the account (account_v1) and its name. PULSE holds no reach figure, so the headline is the
// interactions the sources reported (the owner's choice, 16 Nov 2026).
import { accountName, byInteractions, inPeriod, interactionsTotal, postMeasures, readTime } from './pulseMeasures.js';
import { periodBefore } from './pulseReadings.js';
import { mentionKey } from './pulseTopMentions.js';

const DAY = 86400000;
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
const shiftDay = (day, days) => isoDay(readTime(day) + days * DAY);
const short = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('id-ID');

/** A big figure in a few characters: "15,8 ribu", "33,9 juta", "18,3 miliar"; "—" when it is not a number. */
export function compactCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const size = Math.abs(value);
  if (size >= 1e9) return `${short.format(value / 1e9)} miliar`;
  if (size >= 1e6) return `${short.format(value / 1e6)} juta`;
  if (size >= 1e3) return `${short.format(value / 1e3)} ribu`;
  return whole.format(value);
}

/**
 * The period the highlight reads and the one it compares with. With a period chosen in the project bar, that period
 * (an open end runs to `today`, or back seven days from a last day); otherwise the last seven days up to `today`.
 * The period before has the same length and ends the day before (term_shift_v1's rule, `periodBefore`).
 */
export function highlightWindow(period = {}, today) {
  const chosen = Boolean(period?.from || period?.to);
  const to = chosen ? (period.to || today) : today;
  const from = chosen ? (period.from || shiftDay(to, -6)) : shiftDay(today, -6);
  return { from, to, before: periodBefore(from, to), chosen,
    label: chosen ? 'periode ini' : '7 hari terakhir', compare: chosen ? 'periode sebelumnya' : '7 hari sebelumnya' };
}

const change = (now, before) => (typeof now === 'number' && typeof before === 'number' && before > 0 ? (now - before) / before : null);

/**
 * @param {object[]} posts the posts the page holds (they cover the period)
 * @param {object[]|null} previousPosts posts that cover the period before, or null while they are not known
 * @param {ReturnType<typeof highlightWindow>} window
 */
export function projectHighlight(posts = [], previousPosts, window) {
  const now = (posts || []).filter(post => inPeriod(post?.published_at, window.from, window.to));
  const before = Array.isArray(previousPosts) && window.before
    ? previousPosts.filter(post => inPeriod(post?.published_at, window.before.from, window.before.to)) : null;
  const interactions = interactionsTotal(now), previous = before ? interactionsTotal(before) : null;
  const interactionChange = previous ? change(interactions.value, previous.value) : null;
  const postChange = before ? change(now.length, before.length) : null;
  const lead = [];
  if (interactions.value === null) lead.push('Interaksi belum tercatat.');
  else if (interactionChange !== null) lead.push(interactionChange > 0 ? 'Interaksi naik.' : interactionChange < 0 ? 'Interaksi turun.' : 'Interaksi tetap.');
  if (postChange !== null) lead.push(postChange > 0 ? 'Lebih banyak percakapan.' : postChange < 0 ? 'Lebih sedikit percakapan.' : 'Percakapan sama ramainya.');

  const stories = new Map();
  for (const post of [...now].sort(byInteractions)) {
    const key = mentionKey(post) || `id:${post.id}`;
    if (stories.has(key)) stories.get(key).also += 1; else stories.set(key, { post, also: 0 });
  }
  const mentions = [...stories.values()].slice(0, 5).map(({ post, also }) => ({ ...post, also }));

  const accounts = new Map();
  for (const post of now) {
    const key = postMeasures(post).account;
    if (!key) continue;
    if (!accounts.has(key)) accounts.set(key, []);
    accounts.get(key).push(post);
  }
  const sources = [...accounts].map(([key, own]) => ({ key, name: accountName(own), platform: own[0].platform, posts: own.length }))
    .sort((a, b) => b.posts - a.posts || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).slice(0, 3);

  return {
    empty: !now.length, posts: now.length, all: now, interactions, interactionChange, postChange, lead, mentions, sources,
    platforms: new Set(now.map(post => post?.platform).filter(Boolean)).size,
    measured: now.length ? interactions.posts / now.length : null,
  };
}
