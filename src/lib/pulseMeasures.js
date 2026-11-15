// The calculation rules every PULSE figure rests on: a post's day, its interactions, the base of a tone share,
// and what counts as one account. This file and server/app/services/pulse_measures.py are the only homes of
// these rules; both are tested against shared/pulse-measures.cases.json, so a change on one side fails the other.

export const RULES = Object.freeze({
  day: 'day_v1', clock: 'clock_v1', interactions: 'interactions_v1', shares_total: 'shares_total_v1',
  content_shares: 'content_shares_v1', tone_share: 'tone_share_v1', account: 'account_v1',
});
const TONES = ['positive', 'neutral', 'negative'];
// ASCII digits only and no surrounding spaces, exactly as the server reads them.
const TIME = /^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:[T ]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]+))?)?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$/i;
const SPACE = /^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g; // trimmed the same way on the server; other spaces are kept
const MINUTE = 60000, DAY = 86400000;

// The installation's zone. The server sends it (GET /api/admin/pulse/measures); the default matches its setting.
// Offsets west of UTC are not supported in this version: a zone outside 0 to 1439 minutes is refused and the
// previous zone stays.
let current = { offset_minutes: 420, name: 'WIB' };
export function setZone(value) {
  const offset = value?.offset_minutes;
  if (Number.isInteger(offset) && offset >= 0 && offset < 1440 && typeof value?.name === 'string' && value.name) {
    current = { offset_minutes: value.offset_minutes, name: value.name };
  }
}
export function zone() { return { ...current }; }

/** A timestamp in milliseconds: with its own zone when it carries one, as UTC when it carries none.
 * Never in the browser's zone. */
export function readTime(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value !== 'string') return null;
  const found = value.match(TIME);
  if (!found) return null;
  const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = '0', zoneText] = found;
  const parts = [+year, +month - 1, +day, +hour, +minute, +second];
  const ms = Date.UTC(...parts, +fraction.slice(0, 3).padEnd(3, '0'));
  const back = new Date(ms);
  const same = [back.getUTCFullYear(), back.getUTCMonth(), back.getUTCDate(), back.getUTCHours(), back.getUTCMinutes(), back.getUTCSeconds()];
  if (same.some((part, index) => part !== parts[index])) return null;
  if (!zoneText || zoneText.toUpperCase() === 'Z') return ms;
  const digits = zoneText.replace(':', '');
  const minutes = Number(digits.slice(1, 3)) * 60 + Number(digits.slice(3, 5));
  return ms - (digits[0] === '+' ? minutes : -minutes) * MINUTE;
}

/** clock_v1: a stored time of exactly 00:00:00 UTC means the source gave a date only. */
export function hasClock(value) {
  const ms = readTime(value);
  return ms !== null && ms % DAY !== 0;
}

const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

/** day_v1: the calendar date in the installation's zone; a post without a clock keeps its source date. */
export function localDay(value) {
  const ms = readTime(value);
  if (ms === null) return null;
  return isoDay(hasClock(value) ? ms + current.offset_minutes * MINUTE : ms);
}

/** The zone's wall-clock time of an instant, in milliseconds to be printed as UTC (timeZone: 'UTC'). It shifts every
 * readable value: a post checks `hasClock` first, since a post without a clock has a day and no time. */
export function localTime(value) {
  const ms = readTime(value);
  return ms === null ? null : ms + current.offset_minutes * MINUTE;
}

/** The Monday that starts the week of a day ("YYYY-MM-DD"). */
export function weekStart(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const ms = readTime(day);
  if (ms === null) return null;
  return isoDay(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY);
}

/** Whole days of the zone, first and last day included. A post without a date is inside only when no period is chosen. */
export function inPeriod(value, from, to) {
  if (!from && !to) return true;
  const day = localDay(value);
  if (!day) return false;
  return (!from || day >= from) && (!to || day <= to);
}

/** A reported figure: a whole number of zero or more, or a string of digits. Anything else is null. */
export function reported(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) return Number(value);
  return null;
}

const known = values => values.filter(value => value !== null);

/** interactions_v1: likes + comments + shares that were reported; views never. When none of the three is
 * reported the stored total stands in; otherwise null (unknown, never 0). */
export function interactions(metrics) {
  const parts = known(['likes', 'comments', 'shares'].map(key => reported(metrics?.[key])));
  if (parts.length) return parts.reduce((sum, value) => sum + value, 0);
  return reported(metrics?.engagement);
}

/** interactions_v1 over posts: the sum over the posts whose interactions are known, with how many posts that is.
 * `{value: null, posts: 0}` when none is known; unknown is never 0. */
export function interactionsTotal(posts) {
  const own = known((posts || []).map(post => postMeasures(post).interactions));
  return { value: own.length ? own.reduce((sum, value) => sum + value, 0) : null, posts: own.length };
}

/** shares_total_v1: the posts' own shares over the posts that report them. A repost carries none of its own. */
export function sharesTotal(posts) {
  const own = known((posts || []).map(post => reported(post?.metrics?.shares)));
  return own.length ? own.reduce((sum, value) => sum + value, 0) : null;
}

/** content_shares_v1: for posts that are one piece of content, their own shares or the largest count carried
 * by a repost when that is larger; null when no share figure exists. */
export function contentShares(posts) {
  const own = sharesTotal(posts);
  const carried = known((posts || []).filter(post => post?.metrics?.repost === true).map(post => reported(post.metrics.original_shares)));
  if (own === null && !carried.length) return null;
  return Math.max(own ?? 0, ...carried);
}

/** A post's own figures: the ones the server sent, or computed for a post that has none (an older snapshot). */
export function postMeasures(post) {
  if (post?.measures) return post.measures;
  return {
    day: localDay(post?.published_at), clock: hasClock(post?.published_at), interactions: interactions(post?.metrics),
    account: accountKey(post), tone: tone(post),
  };
}

/** Ordering by interactions: known before unknown, larger first, then earlier publication, then id. */
export function byInteractions(a, b) {
  const [x, y] = [postMeasures(a).interactions, postMeasures(b).interactions];
  if ((x === null) !== (y === null)) return x === null ? 1 : -1;
  if (x !== y) return (y ?? 0) - (x ?? 0);
  const [s, t] = [readTime(a?.published_at), readTime(b?.published_at)];
  if ((s === null) !== (t === null)) return s === null ? 1 : -1;
  if (s !== t) return s - t;
  const [p, q] = [String(a?.id ?? ''), String(b?.id ?? '')];
  return p < q ? -1 : p > q ? 1 : 0;
}

/** clock_v1 order of "who was first": by day; on one day a post with a clock comes before one whose source gave a
 * date only, which never takes part in the order by time; then time, then id. No readable date comes last. */
export function byFirstPublished(a, b) {
  const [x, y] = [localDay(a?.published_at), localDay(b?.published_at)];
  if ((x === null) !== (y === null)) return x === null ? 1 : -1;
  if (x !== y) return x < y ? -1 : 1;
  if (x !== null) {
    const [s, t] = [hasClock(a.published_at), hasClock(b.published_at)];
    if (s !== t) return s ? -1 : 1;
    if (s && readTime(a.published_at) !== readTime(b.published_at)) return readTime(a.published_at) - readTime(b.published_at);
  }
  const [p, q] = [String(a?.id ?? ''), String(b?.id ?? '')];
  return p < q ? -1 : p > q ? 1 : 0;
}

/** A post's tone from its stored label, in either stored form; anything else is 'unknown' (belum dianalisis). */
export function tone(post) {
  const stored = post?.metrics?.sentiment;
  const label = typeof stored === 'object' && stored !== null ? stored.label : stored;
  const clean = typeof label === 'string' ? label.trim().toLowerCase() : null;
  return TONES.includes(clean) ? clean : 'unknown';
}

/** tone_share_v1: shares of the analysed posts only, whole numbers adding up to 100 (largest remainder).
 * A tone with posts that would print as 0 prints "<1%". Null when nothing is analysed. */
export function toneShares(counts) {
  const values = Object.fromEntries(TONES.map(key => [key, reported(counts?.[key]) ?? 0]));
  const unknown = reported(counts?.unknown) ?? 0;
  const analysed = TONES.reduce((sum, key) => sum + values[key], 0);
  if (!analysed) return { analysed: 0, unknown, percent: null, text: null };
  const percent = Object.fromEntries(TONES.map(key => [key, Math.floor(values[key] * 100 / analysed)]));
  const left = 100 - TONES.reduce((sum, key) => sum + percent[key], 0);
  const order = [...TONES].sort((a, b) => (values[b] * 100 % analysed) - (values[a] * 100 % analysed));
  for (const key of order.slice(0, left)) percent[key] += 1;
  const text = Object.fromEntries(TONES.map(key => [key, values[key] && !percent[key] ? '<1%' : `${percent[key]}%`]));
  return { analysed, unknown, percent, text };
}

const trim = value => (typeof value === 'string' ? value.replace(SPACE, '') : '');
const handle = value => trim(value).replace(/^@+/, '').toLowerCase();
/** An id counts when it is a non-empty string, or a whole number both sides hold exactly. Anything else is no id. */
const providerId = value => (typeof value === 'string' ? trim(value) : Number.isSafeInteger(value) ? String(value) : '');

/** account_v1: `platform:identity`, identity chosen per platform so one account never gets two keys. */
export function accountKey(post) {
  const platform = trim(post?.platform).toLowerCase();
  if (!platform) return null;
  const id = providerId(post?.metrics?.author_id);
  let identity;
  if (['x', 'threads', 'reddit'].includes(platform)) identity = handle(post?.author);
  else if (platform === 'news') identity = trim(post?.author).toLowerCase();
  else identity = id || handle(post?.author);
  return identity ? `${platform}:${identity}` : null;
}

/** account_v1: the name shown for an account is the `author` text, as written, of its most recently published post
 * that has one. A post without a readable time comes after every dated post; on a tie the first post given wins. */
export function accountName(posts) {
  let name = null, latest = null;
  for (const post of posts || []) {
    if (!trim(post?.author)) continue;
    const time = readTime(post.published_at);
    if (name === null || (time !== null && (latest === null || time > latest))) { name = post.author; latest = time; }
  }
  return name;
}

/** account_v1 of a post: the `measures.account` the server sent, else its key from platform, author and metrics. A post
 * without a name still belongs to an account when its platform keys by id; its name is then unknown (null). */
export function postAccount(post) {
  return postMeasures(post).account ?? accountKey(post);
}

/** account_v1: how many accounts posted these, distinct keys; a post without a key is no account. */
export function accountCount(posts) {
  return new Set((posts || []).map(postAccount).filter(Boolean)).size;
}
