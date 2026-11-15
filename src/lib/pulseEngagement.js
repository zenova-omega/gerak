// Interaction detail from stored metrics only. Missing values stay unknown, never zero.
const keys = ['likes', 'comments', 'shares', 'views'];
const finite = value => typeof value === 'number' && Number.isFinite(value);

/** Summarise one post's metrics object or a list of posts.
 * - `interactions` = likes + comments + shares that were observed (views are exposure, not interaction).
 * - `activeShare`  = (comments + shares) / interactions. Writing a comment or passing a post on takes
 *   more effort than a like, so this is the share of interactions that needed effort. It needs likes
 *   plus at least one of comments/shares; otherwise it is null rather than a flattering 100%.
 * - `rate` = interactions / views, counted only on posts that report both.
 */
export function engagementSummary(input) {
  const rows = Array.isArray(input) ? input.map(post => post?.metrics || {}) : [input || {}];
  const totals = Object.fromEntries(keys.map(key => [key, null]));
  const coverage = Object.fromEntries(keys.map(key => [key, 0]));
  let rateInteractions = 0, rateViews = 0, ratePosts = 0;
  for (const metrics of rows) {
    let own = null;
    for (const key of keys) {
      if (!finite(metrics[key])) continue;
      totals[key] = (totals[key] ?? 0) + metrics[key];
      coverage[key]++;
      if (key !== 'views') own = (own ?? 0) + metrics[key];
    }
    if (own !== null && finite(metrics.views) && metrics.views > 0) { rateInteractions += own; rateViews += metrics.views; ratePosts++; }
  }
  const parts = ['likes', 'comments', 'shares'].filter(key => totals[key] !== null);
  // Same definition as postInteractions, summed: a post with no breakdown still counts its reported total.
  const unbroken = rows.filter(metrics => !['likes', 'comments', 'shares'].some(key => finite(metrics[key])) && finite(metrics.engagement));
  const interactions = parts.length || unbroken.length ? parts.reduce((sum, key) => sum + totals[key], 0) + unbroken.reduce((sum, metrics) => sum + metrics.engagement, 0) : null;
  const comparable = totals.likes !== null && (totals.comments !== null || totals.shares !== null);
  const active = (totals.comments ?? 0) + (totals.shares ?? 0);
  return {
    posts: rows.length, totals, coverage, interactions, unbrokenPosts: unbroken.length,
    activeShare: comparable && interactions > 0 ? active / interactions : null,
    rate: rateViews > 0 ? rateInteractions / rateViews : null, ratePosts,
  };
}
/** Interactions of one post: observed likes + comments + shares. Only when the source reported
 * none of the three does the provider's own total stand in. Every total, ranking and card uses
 * this one definition, so the same post never shows two different interaction counts. */
export function postInteractions(metrics) {
  const parts = ['likes', 'comments', 'shares'].map(key => metrics?.[key]).filter(finite);
  if (parts.length) return parts.reduce((sum, value) => sum + value, 0);
  return finite(metrics?.engagement) ? metrics.engagement : null;
}
/** How often one piece of content was shared, for posts that carry the same text.
 * A repost has no shares of its own and brings the original post's count as `metrics.original_shares`.
 * That count belongs to one post, so it is taken once (the largest observation), and only where it
 * exceeds what the collected posts add up to themselves. Null when no post carries a share figure. */
export function contentShares(posts) {
  const own = posts.map(post => post.metrics?.shares).filter(finite);
  const carried = Math.max(0, ...posts.map(post => (post.metrics?.repost && finite(post.metrics.original_shares) ? post.metrics.original_shares : 0)));
  if (!own.length && !carried) return null;
  return Math.max(own.reduce((sum, value) => sum + value, 0), carried);
}
export function percentLabel(value, digits = 0) {
  return finite(value) ? (value * 100).toLocaleString('id-ID', { maximumFractionDigits: digits }) + '%' : null;
}
