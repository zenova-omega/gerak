/** Filtering, sorting and paging for the "Akun & sumber teratas" ranking. Pure: no React, no DOM.
 * A row is one account on one platform: {key, author, platform, mentions, engagement, followers?, url?}; `key` is account_v1.
 * An unknown number is `null` and is never read as zero. */
import { accountKey, postAccount } from './pulseMeasures.js';

export const accountPageSize = 50;
export const accountSorts = ['engagement', 'mentions', 'followers'];
export const defaultAccountFilters = { platforms: null, query: '', sort: 'engagement' };
export const socialPlatforms = ['x', 'instagram', 'tiktok', 'youtube', 'facebook', 'threads', 'reddit'];

// Chip order: social platforms first, publishers after, anything else alphabetically at the end.
const platformOrder = [...socialPlatforms, 'news', 'web'];
// Words a reader may type for a platform besides its key.
const platformWords = { news: 'news berita', x: 'x twitter' };
// Query keys are prefixed so they never collide with the project scope (`platforms`) or the Posting drilldown (`platform`, `find`).
const keys = { platforms: 'acc_platforms', query: 'acc_find', sort: 'acc_sort' };

const fold = value => String(value ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const known = value => typeof value === 'number' && Number.isFinite(value);
const platformOf = row => row?.platform || 'unknown';
const byPlatformOrder = (a, b) => {
  const left = platformOrder.indexOf(a), right = platformOrder.indexOf(b);
  return (left < 0 ? platformOrder.length : left) - (right < 0 ? platformOrder.length : right) || a.localeCompare(b);
};

/** The follower count each account (account_v1 key) last reported, read from `metrics.author_followers` on its posts.
 * The most recently collected post wins; without a collection time the larger figure does. */
export function followerIndex(posts = []) {
  const index = new Map();
  for (const post of posts || []) {
    const count = post?.metrics?.author_followers;
    if (!known(count) || count < 0) continue;
    const seen = Date.parse(post.crawled_at || post.first_observed_at || '') || 0;
    const key = postAccount(post);
    if (!key) continue;
    const current = index.get(key);
    if (!current || seen > current.seen || (seen === current.seen && count > current.count)) index.set(key, { count, seen });
  }
  return index;
}

/** Rows with `followers` filled in where a post of that account carries the figure; `null` where none does.
 * A row is matched by its `key`; a row from before rows carried one, by its platform and name. */
export function withFollowers(rows = [], posts = []) {
  const index = followerIndex(posts);
  return (rows || []).map(row => ({ ...row, followers: known(row.followers) ? row.followers : index.get(row.key ?? accountKey(row))?.count ?? null }));
}

/** Platforms that have at least one account, in chip order. */
export function accountPlatforms(rows = []) {
  return [...new Set((rows || []).map(platformOf))].sort(byPlatformOrder);
}

/** A selection the data can answer: unknown platforms dropped; nothing or everything selected means all (`null`). */
export function normalizePlatforms(selected, available) {
  if (!Array.isArray(selected)) return null;
  const kept = [...new Set(selected)].filter(platform => !available || available.includes(platform)).sort(byPlatformOrder);
  return !kept.length || (available && available.every(platform => kept.includes(platform))) ? null : kept;
}

/** One click on a platform chip. From "all" it narrows to that platform; removing the last one returns to "all". */
export function togglePlatform(selected, platform, available) {
  const current = selected || [];
  return normalizePlatforms(current.includes(platform) ? current.filter(value => value !== platform) : [...current, platform], available);
}

function matcher(query) {
  const words = fold(query).split(/\s+/).map(word => word.replace(/^@/, '')).filter(Boolean);
  if (!words.length) return () => true;
  return row => { const text = fold(`${row.author || ''} ${platformWords[row.platform] || row.platform || ''}`); return words.every(word => text.includes(word)); };
}

/** Rows on the selected platforms whose name (or platform) contains every word typed. Order is kept. */
export function filterAccounts(rows = [], { platforms = null, query = '' } = {}) {
  const matches = matcher(query);
  return (rows || []).filter(row => (platforms === null || platforms.includes(platformOf(row))) && matches(row));
}

/** Largest first by the chosen figure. Unknown figures sort after every known one, then the other figures break ties. */
export function sortAccounts(rows = [], sort = 'engagement') {
  const first = accountSorts.includes(sort) ? sort : 'engagement';
  const order = [first, ...accountSorts.filter(key => key !== first)];
  return [...(rows || [])].sort((a, b) => {
    for (const key of order) {
      const difference = (known(b[key]) ? b[key] : -1) - (known(a[key]) ? a[key] : -1);
      if (difference) return difference;
    }
    return fold(a.author).localeCompare(fold(b.author)) || platformOf(a).localeCompare(platformOf(b));
  });
}

/** The ranking the table shows. Rank is the position among the selected platforms in the chosen order, so a
 * search narrows the list without renumbering it. An account whose figure is unknown has no rank (`null`).
 * @returns {{rows: object[], scoped: number, total: number}} `scoped` counts the selected platforms before the search. */
export function accountRanking(rows = [], filters = {}) {
  const { platforms, query, sort } = { ...defaultAccountFilters, ...filters };
  const key = accountSorts.includes(sort) ? sort : 'engagement';
  const scoped = sortAccounts(filterAccounts(rows, { platforms }), key).map((row, index) => ({ ...row, rank: known(row[key]) ? index + 1 : null }));
  return { rows: filterAccounts(scoped, { query }), scoped: scoped.length, total: (rows || []).length };
}

/** One entry per platform that has accounts, with the number that match the search. A platform with no match
 * stays in the list at zero so the chips do not move while typing. */
export function platformFacets(rows = [], query = '') {
  const counts = new Map(accountPlatforms(rows).map(platform => [platform, 0]));
  for (const row of filterAccounts(rows, { query })) counts.set(platformOf(row), counts.get(platformOf(row)) + 1);
  return [...counts].map(([platform, count]) => ({ platform, count }));
}

/** The slice on screen after `pages` loads, how many are still hidden, and how many the next load adds. */
export function pageOf(rows = [], pages = 1, size = accountPageSize) {
  const visible = rows.slice(0, Math.max(1, pages) * size), remaining = rows.length - visible.length;
  return { visible, remaining, next: Math.min(size, remaining) };
}

/** True when a platform or a search narrows the list. The sort order alone is not a filter. */
export function isAccountFiltered({ platforms = null, query = '' } = {}) {
  return platforms !== null || fold(query) !== '';
}

/** Filter state from the URL query. Anything unreadable falls back to the default. */
export function readAccountFilters(search, available) {
  const params = new URLSearchParams(search);
  const sort = params.get(keys.sort);
  return {
    platforms: normalizePlatforms(params.has(keys.platforms) ? params.get(keys.platforms).split(',').map(value => value.trim()).filter(Boolean) : null, available),
    query: (params.get(keys.query) || '').slice(0, 80),
    sort: accountSorts.includes(sort) ? sort : defaultAccountFilters.sort,
  };
}

/** The query with `patch` applied on top of the filters it already holds. Defaults are left out of the URL. */
export function writeAccountFilters(search, patch = {}) {
  const params = new URLSearchParams(search);
  const next = { ...readAccountFilters(params), ...patch };
  const platforms = normalizePlatforms(next.platforms), query = String(next.query || '').trim().slice(0, 80);
  if (platforms) params.set(keys.platforms, platforms.join(',')); else params.delete(keys.platforms);
  if (query) params.set(keys.query, query); else params.delete(keys.query);
  if (accountSorts.includes(next.sort) && next.sort !== defaultAccountFilters.sort) params.set(keys.sort, next.sort); else params.delete(keys.sort);
  return params;
}

/** The query without any ranking filter, for links that leave this section. */
export function withoutAccountFilters(search) {
  const params = new URLSearchParams(search);
  for (const key of Object.values(keys)) params.delete(key);
  return params;
}
