/** Grouping, filtering, sorting and paging for "Kelompok percakapan". Pure: no React, no DOM.
 * A group is the posts of one issue (`issue_id`, assigned by text similarity) inside the project scope.
 * One post alone is not a group: it is counted in the totals and left out of the list unless `minPosts` is 1.
 * A figure nobody observed is `null` and is never read as zero. */
import { filterPosts, postSentiment } from './pulsePostFilters.js';
import { sourceText } from './pulseOverview.js';
import { contentShares, postInteractions } from './pulseEngagement.js';
import { formatCount, pulseDay } from './pulseData.js';

export const groupPageSize = 20;
export const groupSorts = ['posts', 'accounts', 'interactions', 'recent'];
export const groupSizes = [2, 5, 10];
/** Same order as the stacked sentiment charts, so a segment never changes place between pages. */
export const groupSentiments = ['positive', 'neutral', 'negative', 'unknown'];
export const defaultGroupFilters = { platforms: null, sentiments: null, minPosts: 2, query: '', sort: 'posts' };

// Chip order: social platforms first, publishers after, anything else alphabetically at the end.
const platformOrder = ['x', 'instagram', 'tiktok', 'youtube', 'facebook', 'threads', 'reddit', 'news', 'web'];
const byPlatformOrder = (a, b) => {
  const left = platformOrder.indexOf(a), right = platformOrder.indexOf(b);
  return (left < 0 ? platformOrder.length : left) - (right < 0 ? platformOrder.length : right) || a.localeCompare(b);
};
const fold = value => String(value ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const wib = 7 * 60 * 60 * 1000;
function timeOf(value) {
  if (typeof value !== 'string' || !value) return null;
  const time = Date.parse(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value) || !/[T ]\d{2}:/.test(value) ? value : value + 'Z');
  return Number.isFinite(time) ? time : null;
}
/** The calendar day in WIB. A date the source gave without a clock is midnight UTC and stays on its own day. */
const dayOf = time => time === null ? null : new Date(time + wib).toISOString().slice(0, 10);

function describe(id, posts) {
  const accounts = new Map(), platforms = new Map(), tone = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
  let interactions = null, interactionCoverage = 0, first = null, latest = null;
  for (const post of posts) {
    const platform = post.platform || 'unknown';
    platforms.set(platform, (platforms.get(platform) || 0) + 1);
    tone[postSentiment(post)]++;
    // An account is counted per platform: the same name on X and on Instagram is two accounts.
    const identity = post.metrics?.author_id || post.author;
    if (identity) {
      const key = JSON.stringify([post.platform, String(identity)]);
      const row = accounts.get(key) || { author: post.author || '', platform: post.platform, posts: 0 };
      if (!row.author && post.author) row.author = post.author;
      row.posts++;
      accounts.set(key, row);
    }
    const own = postInteractions(post.metrics);
    if (own !== null) { interactions = (interactions ?? 0) + own; interactionCoverage++; }
    const time = timeOf(post.published_at);
    if (time !== null) { if (first === null || time < first) first = time; if (latest === null || time > latest) latest = time; }
  }
  const analysed = posts.length - tone.unknown;
  // The largest analysed share names the group. A tie goes to negative, then neutral: the reading that needs a look first.
  const lead = analysed ? ['negative', 'neutral', 'positive'].reduce((best, key) => tone[key] > tone[best] ? key : best) : 'unknown';
  return {
    id, posts, size: posts.length,
    title: posts.map(sourceText).find(Boolean) || 'Teks sumber belum tersedia',
    // Most posts first; accounts with the same number keep the order in which they first posted.
    accounts: [...accounts.values()].sort((a, b) => b.posts - a.posts),
    accountCount: accounts.size,
    platforms: [...platforms].map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count || byPlatformOrder(a.platform, b.platform)),
    sentiment: { ...tone, analysed, lead },
    // Interactions are what each post gathered itself. A repost gathers none; the share count it carries from
    // the original post is read once per group as `shares` and never enters `interactions`.
    interactions, interactionCoverage, shares: contentShares(posts),
    firstDay: dayOf(first), lastDay: dayOf(latest), latest,
  };
}

/** Every issue inside the project scope (period and platforms), single posts included, with the facts a row shows.
 * Posts inside a group run from the earliest published to the latest.
 * @returns {{groups: object[], totals: {posts: number, groups: number, groupedPosts: number, singlePosts: number, ungrouped: number}}}
 * `totals.groups` counts groups of two posts or more; `singlePosts` the posts that stand alone;
 * `ungrouped` the posts that have not been assigned to any issue yet. */
export function buildConversationGroups(posts = [], scope = {}) {
  const selected = filterPosts(posts || [], scope || {}), issues = new Map();
  let ungrouped = 0;
  for (const post of selected) {
    if (!post.issue_id) { ungrouped++; continue; }
    if (!issues.has(post.issue_id)) issues.set(post.issue_id, []);
    issues.get(post.issue_id).push(post);
  }
  const groups = [...issues].map(([id, items]) => describe(id, items));
  const real = groups.filter(group => group.size >= 2);
  const groupedPosts = real.reduce((sum, group) => sum + group.size, 0);
  return { groups, totals: { posts: selected.length, groups: real.length, groupedPosts, singlePosts: groups.length - real.length, ungrouped } };
}

/** The sentence under the heading: real groups apart from posts that stand alone. */
export function groupTotalsText(totals) {
  const { posts = 0, groups = 0, singlePosts = 0, ungrouped = 0 } = totals || {};
  if (!posts) return 'Belum ada posting pada pilihan ini';
  const parts = [groups ? `${formatCount(groups)} kelompok dari ${formatCount(posts)} posting` : `Belum ada kelompok dari ${formatCount(posts)} posting`];
  if (singlePosts) parts.push(`${formatCount(singlePosts)} posting berdiri sendiri`);
  if (ungrouped) parts.push(`${formatCount(ungrouped)} posting belum dikelompokkan`);
  return parts.join('; ');
}

/** "12 Nov 2026", "8–12 Nov 2026", "28 Okt – 3 Nov 2026" or "30 Des 2025 – 2 Jan 2026". Days are written by `pulseDay`. */
export function groupDayRange(firstDay, lastDay) {
  const first = firstDay || lastDay, last = lastDay || firstDay;
  if (!first) return '';
  if (first === last) return pulseDay(last);
  if (first.slice(0, 7) === last.slice(0, 7)) return `${Number(first.slice(8, 10))}–${pulseDay(last)}`;
  return `${first.slice(0, 4) === last.slice(0, 4) ? pulseDay(first).replace(/\s+\d{4}$/, '') : pulseDay(first)} – ${pulseDay(last)}`;
}

/** The sentiment mix of one group, read over the posts that have been analysed. Percentages are whole numbers that
 * add up to 100; posts still waiting are a count, never a share.
 * @returns {{total: number, analysed: number, unknown: number, parts: {key: string, count: number, percent: number}[]}} */
export function sentimentShares(sentiment) {
  const tone = sentiment || {};
  const rows = ['positive', 'neutral', 'negative'].map(key => ({ key, count: tone[key] || 0 })).filter(row => row.count > 0);
  const analysed = rows.reduce((sum, row) => sum + row.count, 0), unknown = tone.unknown || 0;
  const exact = rows.map(row => row.count / (analysed || 1) * 100), floors = exact.map(Math.floor);
  let left = analysed ? 100 - floors.reduce((sum, value) => sum + value, 0) : 0;
  // Largest remainder: the points lost to rounding go to the parts that were cut the most.
  for (const index of exact.map((value, i) => [value - floors[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i)) {
    if (left <= 0) break;
    floors[index]++; left--;
  }
  return { total: analysed + unknown, analysed, unknown, parts: rows.map((row, index) => ({ ...row, percent: floors[index] })) };
}

/** A selection the data can answer: unknown values dropped; nothing or everything selected means all (`null`). */
function normalize(selected, available) {
  if (!Array.isArray(selected)) return null;
  const kept = [...new Set(selected)].filter(value => !available || available.includes(value));
  return !kept.length || (available && available.every(value => kept.includes(value))) ? null : kept;
}

/** One click on a filter chip. From "all" it narrows to that value; removing the last one returns to "all". */
export function toggleGroupFilter(selected, value, available) {
  const current = selected || [];
  return normalize(current.includes(value) ? current.filter(item => item !== value) : [...current, value], available);
}

const haystacks = new WeakMap();
function haystack(group) {
  if (!haystacks.has(group)) haystacks.set(group, fold([group.title, ...group.posts.flatMap(post => [post.title, post.text, post.author])].filter(Boolean).join(' ')));
  return haystacks.get(group);
}
function matcher(query) {
  const words = fold(query).split(/\s+/).map(word => word.replace(/^@/, '')).filter(Boolean);
  return words.length ? group => { const text = haystack(group); return words.every(word => text.includes(word)); } : () => true;
}
const sizeOf = minPosts => Number.isFinite(Number(minPosts)) && Number(minPosts) >= 1 ? Math.floor(Number(minPosts)) : defaultGroupFilters.minPosts;
/** One test per filter, so a chip can be counted with every filter but its own. */
const tests = ({ platforms, sentiments, minPosts, query }) => ({
  size: group => group.size >= sizeOf(minPosts),
  platforms: group => !Array.isArray(platforms) || group.platforms.some(row => platforms.includes(row.platform)),
  sentiments: group => !Array.isArray(sentiments) || sentiments.includes(group.sentiment.lead),
  query: matcher(query),
});

/** Largest first by the chosen figure. An unknown figure sorts after every known one; ties fall to the number of
 * posts, then accounts, then the latest activity, so the order never depends on the order of the input. */
export function sortGroups(groups = [], sort = 'posts') {
  const figures = { posts: group => group.size, accounts: group => group.accountCount, interactions: group => group.interactions, recent: group => group.latest };
  const first = groupSorts.includes(sort) ? sort : 'posts';
  const order = [first, ...['posts', 'accounts', 'recent'].filter(key => key !== first)];
  return [...(groups || [])].sort((a, b) => {
    for (const key of order) {
      const left = figures[key](a), right = figures[key](b);
      const difference = (right === null ? -Infinity : right) - (left === null ? -Infinity : left);
      if (difference) return difference;   // NaN (both unknown) falls through to the next figure
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

/** The groups a reader asked for, in order, with the counts the filter chips show.
 * - `platforms`: groups that have at least one post on a selected platform. The group keeps all of its posts.
 * - `sentiments`: groups whose largest analysed share is a selected sentiment ("unknown": nothing analysed yet).
 * - `minPosts`: 2 by default, so single posts stay out. - `query`: every word typed, in the text or an account name.
 * Each chip's count is the number of groups it would show with the other filters kept, and a value with no
 * match stays in the list at zero so the chips do not move.
 * @returns {{groups: object[], total: number, facets: {platforms: {platform: string, count: number}[], sentiments: {sentiment: string, count: number}[], sizes: {size: number, count: number}[]}}}
 * `total` is the number of groups of two posts or more before any filter. */
export function filterConversationGroups(groups = [], filters = {}) {
  const all = groups || [], state = { ...defaultGroupFilters, ...filters }, checks = Object.entries(tests(state));
  const real = all.filter(group => group.size >= 2), matched = [];
  const platforms = new Map([...new Set(real.flatMap(group => group.platforms.map(row => row.platform)))].sort(byPlatformOrder).map(platform => [platform, 0]));
  const sentiments = new Map(groupSentiments.map(sentiment => [sentiment, 0])), sizes = new Map(groupSizes.map(size => [size, 0]));
  for (const group of all) {
    const failed = checks.filter(([, check]) => !check(group)).map(([name]) => name);
    if (failed.length > 1) continue;          // two filters reject it: no chip could bring it back alone
    const only = failed[0];                   // undefined when the group matches everything
    if (!only) matched.push(group);
    if (!only || only === 'platforms') for (const row of group.platforms) if (platforms.has(row.platform)) platforms.set(row.platform, platforms.get(row.platform) + 1);
    if (!only || only === 'sentiments') sentiments.set(group.sentiment.lead, sentiments.get(group.sentiment.lead) + 1);
    if (!only || only === 'size') for (const size of groupSizes) if (group.size >= size) sizes.set(size, sizes.get(size) + 1);
  }
  return {
    groups: sortGroups(matched, state.sort),
    total: real.length,
    facets: {
      platforms: [...platforms].map(([platform, count]) => ({ platform, count })),
      sentiments: [...sentiments].map(([sentiment, count]) => ({ sentiment, count })),
      sizes: [...sizes].map(([size, count]) => ({ size, count })),
    },
  };
}

/** The few largest real groups of the scope, whatever the list below is filtered to. */
export function leadingGroups(groups = [], count = 3) {
  return sortGroups((groups || []).filter(group => group.size >= 2), 'posts').slice(0, count);
}

/** Build and filter in one call.
 * @param {object[]} posts stored posts of the project
 * @param {{from?: string, to?: string, platforms?: string[]|null}} scope the project's period (WIB days) and platforms
 * @param {Partial<typeof defaultGroupFilters>} filters what the reader chose in this view */
export function conversationGroups(posts = [], scope = {}, filters = {}) {
  const built = buildConversationGroups(posts, scope);
  return { ...filterConversationGroups(built.groups, filters), totals: built.totals, leaders: leadingGroups(built.groups) };
}

/** True when anything narrows the list. The sort order alone is not a filter. */
export function isGroupFiltered(filters = {}) {
  const state = { ...defaultGroupFilters, ...filters };
  return Array.isArray(state.platforms) || Array.isArray(state.sentiments) || sizeOf(state.minPosts) !== defaultGroupFilters.minPosts || fold(state.query) !== '';
}

/** The slice on screen after `pages` loads, how many are still hidden, and how many the next load adds. */
export function pageOfGroups(rows = [], pages = 1, size = groupPageSize) {
  const visible = rows.slice(0, Math.max(1, pages) * size), remaining = rows.length - visible.length;
  return { visible, remaining, next: Math.min(size, remaining) };
}
