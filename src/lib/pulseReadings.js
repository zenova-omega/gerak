// Four readings built on the calculation rules of pulseMeasures.js: how much of a selection each kind of figure
// rests on, which words gained and lost ground, when posts were published, and how much of the conversation rests
// on how few accounts. This file and server/app/services/pulse_readings.py are the only homes of these four;
// both are tested against shared/pulse-readings.cases.json, so a change on one side fails the other.
// Every function takes posts already scoped to the project's period and platforms. A post's day, clock,
// interactions, account and tone are read through postMeasures and never from raw columns.
import { localTime, postMeasures, readTime } from './pulseMeasures.js';
import { keepsWord, wordsIn } from './pulseInfographics.js';

export const RULES = Object.freeze({
  coverage: 'coverage_v1', term_shift: 'term_shift_v1', hour_grid: 'hour_grid_v1', concentration: 'concentration_v1',
});
export const RULE_TEXT = Object.freeze({
  coverage: 'Cakupan data menyebut berapa bagian postingan dalam pilihan yang sudah dianalisis, yang interaksinya diketahui, dan yang membawa jam terbit; tingkatnya mengikuti bagian terkecil dari ketiganya: Lengkap mulai 90%, Cukup mulai 60%, Terbatas di bawah itu.',
  term_shift: 'Naik dan turun kata membandingkan bagian postingan yang memuat satu kata, atau dua kata berurutan, pada periode ini dengan periode sama panjang tepat sebelumnya, dalam poin persentase; kata dihitung bila dimuat sedikitnya 5 postingan pada salah satu periode.',
  hour_grid: 'Kisi hari dan jam menghitung postingan yang membawa jam terbit per hari dan per jam menurut zona waktu instalasi; barisnya tanggal bila rentangnya 14 hari atau kurang, selain itu hari dalam seminggu mulai Senin.',
  concentration: 'Konsentrasi akun mengurutkan akun dari yang paling banyak memposting, lalu menyebut bagian postingan dari tiga akun teratas dan berapa akun yang dibutuhkan untuk mencapai 80% postingan; hal yang sama dihitung untuk interaksi, dari postingan yang interaksinya diketahui.',
});

const DAY = 86400000;
const TONES = ['positive', 'neutral', 'negative'];
/** coverage_v1: the three shares the level follows, in the order a tie is named. */
export const COVERAGE_SHARES = Object.freeze(['analysed', 'measured', 'clocked']);
/** term_shift_v1: posts a term needs in one of the two periods, and how many terms each list holds. */
export const TERM_MIN_POSTS = 5, TERM_LIMIT = 8;
/** hour_grid_v1: up to this many days the rows are the days themselves. */
export const GRID_DAY_ROWS = 14;
/** concentration_v1: accounts needed for a curve, the points it is sampled at, and the accounts named. */
export const CURVE_MIN_ACCOUNTS = 10, CURVE_POINTS = 20, TOP_ACCOUNTS = 3;

const dayStart = value => (typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ? readTime(value) : null);
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
const SURROGATE = /[\ud800-\udfff]/;
/** The order of the characters themselves, as the server sorts text. */
function byText(a, b) {
  if (a === b) return 0;
  if (!SURROGATE.test(a) && !SURROGATE.test(b)) return a < b ? -1 : 1;
  const x = [...a], y = [...b];
  for (let index = 0; index < x.length && index < y.length; index++) {
    const step = x[index].codePointAt(0) - y[index].codePointAt(0);
    if (step) return step;
  }
  return x.length - y.length;
}
/** A count as a part of a total: the share as a fraction, and a whole percent that is cut, never rounded up. */
const part = (count, total) => ({ count, share: count / total, percent: Math.floor(count * 100 / total) });

/** The words of a post in reading order, exactly as the word panel reads them (its tokenizer, not a second one). */
export const words = post => wordsIn(post ?? {});

/** term_shift_v1: the terms of one post. A term is a word the word panel keeps, or two of them in a row inside the
 * title or inside the text; a post holds a term once however often it repeats it.
 * @returns {Set<string>} */
export function postTerms(post) {
  const terms = new Set();
  for (const field of ['title', 'text']) {
    let previous = null;
    for (const word of wordsIn({ [field]: post?.[field] })) {
      if (!keepsWord(word)) { previous = null; continue; }
      terms.add(word);
      if (previous !== null) terms.add(previous + ' ' + word);
      previous = word;
    }
  }
  return terms;
}

/** The posts that hold a term, for the list that opens from a term. */
export function postsWithTerm(posts, term) {
  return term ? (posts || []).filter(post => postTerms(post).has(term)) : [];
}

/** term_shift_v1: the period before a chosen one, the same number of days ending the day before it starts.
 * Null without a chosen period (both days are needed).
 * @returns {{from: string, to: string} | null} */
export function periodBefore(from, to) {
  const start = dayStart(from), end = dayStart(to);
  if (start === null || end === null || end < start) return null;
  return { from: isoDay(start - (end - start + DAY)), to: isoDay(start - DAY) };
}

/**
 * coverage_v1: how much of the selection each kind of figure rests on. `analysed` (the post has a tone), `measured`
 * (its interactions are known) and `clocked` (it has a clock) set the level through the lowest of them: `complete`
 * from 90%, `fair` from 60%, `limited` under that. `lowest` names the share that set it. `dated` is reported and not
 * judged. An empty selection has no shares and no level.
 * @returns {{total: number, analysed: object|null, measured: object|null, clocked: object|null, dated: object|null,
 *   level: 'complete'|'fair'|'limited'|null, lowest: 'analysed'|'measured'|'clocked'|null, platforms: object[]}}
 */
export function coverage(posts) {
  const tally = () => ({ total: 0, analysed: 0, measured: 0, clocked: 0, dated: 0 });
  const all = tally(), platforms = new Map();
  for (const post of posts || []) {
    const figures = postMeasures(post);
    const name = typeof post?.platform === 'string' && post.platform ? post.platform : 'unknown';
    if (!platforms.has(name)) platforms.set(name, tally());
    for (const row of [all, platforms.get(name)]) {
      row.total++;
      if (TONES.includes(figures.tone)) row.analysed++;
      if (figures.interactions != null) row.measured++;
      if (figures.clock === true) row.clocked++;
      if (figures.day != null) row.dated++;
    }
  }
  if (!all.total) return { total: 0, analysed: null, measured: null, clocked: null, dated: null, level: null, lowest: null, platforms: [] };
  const shares = row => Object.fromEntries([...COVERAGE_SHARES, 'dated'].map(key => [key, part(row[key], row.total)]));
  const lowest = COVERAGE_SHARES.reduce((low, key) => (all[key] < all[low] ? key : low));
  const level = all[lowest] * 10 >= all.total * 9 ? 'complete' : all[lowest] * 10 >= all.total * 6 ? 'fair' : 'limited';
  return {
    total: all.total, ...shares(all), level, lowest,
    platforms: [...platforms].sort((a, b) => b[1].total - a[1].total || byText(a[0], b[0]))
      .map(([platform, row]) => ({ platform, total: row.total, ...shares(row) })),
  };
}

/**
 * term_shift_v1: which terms gained and lost ground against the period before. A term's share is the posts that
 * hold it over the posts of the period; its shift is the share now minus the share before, in percentage points.
 * A term is kept when at least 5 posts hold it in one of the two periods. Up to 8 rising and up to 8 falling,
 * largest shift first; ties by more posts now, then by the alphabet. Null when either period has no post.
 * @returns {{posts_now: number, posts_before: number, rising: object[], falling: object[]} | null}
 */
export function termShift(postsNow, postsBefore) {
  const now = [...(postsNow || [])], before = [...(postsBefore || [])];
  if (!now.length || !before.length) return null;
  const counts = new Map();
  [now, before].forEach((rows, side) => {
    for (const post of rows) for (const term of postTerms(post)) {
      if (!counts.has(term)) counts.set(term, [0, 0]);
      counts.get(term)[side]++;
    }
  });
  const n = now.length, m = before.length, moved = [];
  for (const [term, [a, b]] of counts) {
    if (a < TERM_MIN_POSTS && b < TERM_MIN_POSTS) continue;
    // Both shares over one denominator, so equal shifts are equal and not a rounding apart.
    const lead = a * m - b * n;
    if (lead) moved.push({ term, now: a, before: b, share_now: a / n, share_before: b / m, shift: lead * 100 / (n * m), lead });
  }
  const list = sign => moved.filter(row => Math.sign(row.lead) === sign)
    .sort((x, y) => sign * (y.lead - x.lead) || y.now - x.now || byText(x.term, y.term))
    .slice(0, TERM_LIMIT).map(row => ({ term: row.term, now: row.now, before: row.before, share_now: row.share_now, share_before: row.share_before, shift: row.shift }));
  return { posts_now: n, posts_before: m, rising: list(1), falling: list(-1) };
}

/**
 * hour_grid_v1: when the posts were published. A cell counts the posts with a clock of one row and one hour of the
 * installation's zone. Rows are the days themselves, first to last day that has such a post, when those are 14
 * days or fewer; otherwise the seven weekdays, Monday first (`weekday` 0 to 6). Posts without a clock are counted
 * as `date_only`, posts without a date as `undated`; neither is in a cell. No post with a clock: no rows.
 * @returns {{mode: 'days'|'weekdays'|null, from: string|null, to: string|null, max: number, total: number,
 *   rows: {day: string|null, weekday: number, cells: number[], total: number}[], clocked: number, date_only: number, undated: number}}
 */
export function hourGrid(posts) {
  const days = new Map();
  let total = 0, clocked = 0, dateOnly = 0, undated = 0;
  for (const post of posts || []) {
    total++;
    const figures = postMeasures(post);
    if (dayStart(figures.day) === null) { undated++; continue; }
    // The hour on the zone's wall clock, from the one place that knows the zone.
    const moment = figures.clock === true ? localTime(post?.published_at) : null;
    if (moment === null) { dateOnly++; continue; }
    if (!days.has(figures.day)) days.set(figures.day, Array(24).fill(0));
    days.get(figures.day)[new Date(moment).getUTCHours()]++;
    clocked++;
  }
  if (!clocked) return { mode: null, from: null, to: null, rows: [], max: 0, clocked, date_only: dateOnly, undated, total };
  const seen = [...days.keys()].sort(), from = seen[0], to = seen.at(-1);
  const first = dayStart(from), span = (dayStart(to) - first) / DAY + 1;
  const weekday = ms => (new Date(ms).getUTCDay() + 6) % 7;
  const row = (day, weekdayOf, cells) => ({ day, weekday: weekdayOf, cells, total: cells.reduce((sum, value) => sum + value, 0) });
  let rows;
  if (span <= GRID_DAY_ROWS) {
    rows = Array.from({ length: span }, (_, index) => {
      const ms = first + index * DAY, day = isoDay(ms);
      return row(day, weekday(ms), days.get(day) || Array(24).fill(0));
    });
  } else {
    const week = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const [day, cells] of days) cells.forEach((value, hour) => { week[weekday(dayStart(day))][hour] += value; });
    rows = week.map((cells, index) => row(null, index, cells));
  }
  return { mode: span <= GRID_DAY_ROWS ? 'days' : 'weekdays', from, to, rows, max: Math.max(...rows.flatMap(item => item.cells)),
    clocked, date_only: dateOnly, undated, total };
}

/** Accounts with their value, most first; ties by the account key. */
const inRank = values => [...values].sort((a, b) => b[1] - a[1] || byText(a[0], b[0]));

/** One ranking as figures: the named top accounts, their share, the 80% point and the sampled curve. */
function ranking(values, names) {
  const ranked = inRank(values);
  const accounts = ranked.length, sum = ranked.reduce((run, [, value]) => run + value, 0);
  if (!sum) return { sum, accounts, top: [], top_share: null, reach80: null, curve: null };
  const top = ranked.slice(0, TOP_ACCOUNTS).map(([account, value]) => ({
    account, name: names.get(account)?.name ?? null, platform: account.slice(0, account.indexOf(':')), value, share: value / sum,
  }));
  const cumulative = [];
  ranked.reduce((run, [, value]) => { cumulative.push(run + value); return run + value; }, 0);
  const point = count => ({ accounts: count, account_share: count / accounts, share: cumulative[count - 1] / sum });
  const picks = accounts <= CURVE_POINTS ? Array.from({ length: accounts }, (_, index) => index + 1)
    : Array.from({ length: CURVE_POINTS }, (_, index) => 1 + Math.floor(index * (accounts - 1) / (CURVE_POINTS - 1)));
  return {
    sum, accounts, top, top_share: top.reduce((run, row) => run + row.value, 0) / sum,
    reach80: point(cumulative.findIndex(value => value * 5 >= sum * 4) + 1),
    curve: accounts >= CURVE_MIN_ACCOUNTS ? picks.map(point) : null,
  };
}

/**
 * concentration_v1: how much of the conversation rests on how few accounts. Accounts are ranked by posts, most
 * first, ties by the account key. `top` names the three most active with their share, `reach80` is how many
 * accounts it takes to reach 80% of the posts, and `curve` is the cumulative share of posts against the share of
 * accounts, at no more than 20 points that always include the first account and the last; no curve under 10
 * accounts. `interactions` is the same with accounts ranked by the interactions of their posts, from posts whose
 * interactions are known, with the selection's measured share beside it. Posts without an account are counted in
 * `without_account` and left out. An account's `name` is the author text of its most recently published post.
 */
export function concentration(posts) {
  const byPosts = new Map(), byInteractions = new Map(), names = new Map();
  let total = 0, without = 0, measured = 0, known = 0;
  for (const post of posts || []) {
    total++;
    const figures = postMeasures(post), own = figures.interactions ?? null;
    if (own !== null) measured++;
    const key = typeof figures.account === 'string' && figures.account.includes(':') ? figures.account : null;
    if (key === null) { without++; continue; }
    byPosts.set(key, (byPosts.get(key) || 0) + 1);
    if (own !== null) { byInteractions.set(key, (byInteractions.get(key) || 0) + own); known++; }
    if (typeof post?.author === 'string' && post.author) {
      const at = readTime(post.published_at), best = names.get(key);
      if (!best || (at !== null && (best.at === null || at > best.at))) names.set(key, { at, name: post.author });
    }
  }
  const { sum: named, ...postFigures } = ranking(byPosts, names), { sum, ...interactionFigures } = ranking(byInteractions, names);
  return {
    total, without_account: without,
    posts: { total: named, ...postFigures },
    interactions: { total: known ? sum : null, posts: known, measured: total ? part(measured, total) : null, ...interactionFigures },
  };
}

/** The keys of the `count` most active accounts in the ranking of `concentration`, for the list that opens from its
 * figures (the three named accounts, or the accounts behind the 80% point).
 * @returns {Set<string>} */
export function leadingAccounts(posts, count) {
  const byPosts = new Map();
  for (const post of posts || []) {
    const key = postMeasures(post).account;
    if (typeof key === 'string' && key.includes(':')) byPosts.set(key, (byPosts.get(key) || 0) + 1);
  }
  return new Set(inRank(byPosts).slice(0, Math.max(0, count)).map(([key]) => key));
}
