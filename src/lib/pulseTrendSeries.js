// Posts over time for the trend chart: one row per day, week or month in WIB, with no gaps, so a quiet day
// draws as zero instead of a line that skips it. Pure: no dates are read from the clock.
import { sentimentDate } from './pulseSentiment.js';
import { postSentiment } from './pulsePostFilters.js';
import { postInteractions } from './pulseEngagement.js';

export const trendUnits = ['day', 'week', 'month'];
const MAX_DAYS = 1100;   // three years of days: a guard against a stray date drawing an endless axis

const addDays = (date, count) => new Date(Date.parse(date + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
const weekday = date => (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;   // Monday is 0
const monthEnd = date => { const [year, month] = date.split('-').map(Number); return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); };

/** First and last day of the bucket that holds `date`. */
function bounds(date, unit) {
  if (unit === 'week') { const start = addDays(date, -weekday(date)); return [start, addDays(start, 6)]; }
  if (unit === 'month') return [date.slice(0, 8) + '01', monthEnd(date)];
  return [date, date];
}

/** The days the series covers: the posts' own first and last day, stretched to a chosen period when one is given. */
function span(posts, range = {}) {
  const dates = posts.map(sentimentDate).filter(Boolean).sort();
  if (!dates.length) return null;
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;
  let first = dates[0], last = dates.at(-1);
  if (valid(range.from) && range.from < first) first = range.from;
  if (valid(range.to) && range.to > last) last = range.to;
  if (addDays(first, MAX_DAYS) < last) first = addDays(last, -MAX_DAYS);
  return [first, last];
}

/**
 * @param {object[]} posts posts already scoped to the project's period and platforms
 * @param {'day'|'week'|'month'} unit
 * @param {{from?: string, to?: string}} range the chosen period, YYYY-MM-DD in WIB
 * @returns {{key:string, from:string, to:string, posts:number, interactions:number, positive:number, neutral:number, negative:number, unknown:number}[]}
 *   oldest first. `from` and `to` never reach outside the covered days, so a bucket can be used as a date filter as it is.
 *   `interactions` adds only what the source reported: a post without metrics adds nothing.
 */
export function trendSeries(posts = [], unit = 'day', range = {}) {
  const covered = span(posts, range);
  if (!covered) return [];
  const [first, last] = covered, rows = new Map();
  for (let day = first; day <= last; ) {
    const [start, end] = bounds(day, unit);
    const from = start < first ? first : start, to = end > last ? last : end;
    rows.set(start, { key: from, from, to, posts: 0, interactions: 0, positive: 0, neutral: 0, negative: 0, unknown: 0 });
    day = addDays(end, 1);
  }
  for (const post of posts) {
    const date = sentimentDate(post);
    if (!date || date < first || date > last) continue;
    const row = rows.get(bounds(date, unit)[0]);
    row.posts++;
    row[postSentiment(post)]++;
    const interactions = postInteractions(post.metrics);
    if (Number.isFinite(interactions)) row.interactions += interactions;
  }
  return [...rows.values()];
}

/** Which units give a line worth drawing: at least two points. */
export function trendUnitsAvailable(posts = [], range = {}) {
  return Object.fromEntries(trendUnits.map(unit => [unit, trendSeries(posts, unit, range).length >= 2]));
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dayMonth = date => `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]}`;
/** "4 Nov", "9–15 Nov", "27 Okt – 2 Nov", "Nov 2026". */
export function bucketLabel(row, unit = 'day') {
  if (unit === 'month') return `${months[Number(row.from.slice(5, 7)) - 1]} ${row.from.slice(0, 4)}`;
  if (row.from === row.to) return dayMonth(row.from);
  return row.from.slice(0, 7) === row.to.slice(0, 7) ? `${Number(row.from.slice(8))}–${dayMonth(row.to)}` : `${dayMonth(row.from)} – ${dayMonth(row.to)}`;
}

/** The posts published inside one bucket (WIB). */
export function bucketPosts(posts = [], row) {
  return posts.filter(post => { const date = sentimentDate(post); return date && date >= row.from && date <= row.to; });
}
