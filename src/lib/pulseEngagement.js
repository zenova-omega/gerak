// Interaction detail from stored metrics only. Missing values stay unknown, never zero.
// Every figure follows the rules of pulseMeasures.js (interactions_v1, shares_total_v1, content_shares_v1).
import { contentShares as contentSharesRule, interactions, interactionsTotal, reported, sharesTotal } from './pulseMeasures.js';
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
  const posts = Array.isArray(input) ? input : [{ metrics: input || {} }];
  const rows = posts.map(post => post?.metrics || {});
  const totals = Object.fromEntries(keys.map(key => [key, null]));
  const coverage = Object.fromEntries(keys.map(key => [key, 0]));
  let rateInteractions = 0, rateViews = 0, ratePosts = 0;
  for (const metrics of rows) {
    for (const key of keys) {
      const value = reported(metrics[key]);
      if (value === null) continue;
      totals[key] = (totals[key] ?? 0) + value;
      coverage[key]++;
    }
    const own = interactions(metrics), views = reported(metrics.views);
    if (own !== null && views > 0) { rateInteractions += own; rateViews += views; ratePosts++; }
  }
  totals.shares = sharesTotal(posts);
  const { value: total, posts: interactionPosts } = interactionsTotal(posts);
  // A post with no breakdown still counts its reported total.
  const unbroken = rows.filter(metrics => !['likes', 'comments', 'shares'].some(key => reported(metrics[key]) !== null) && reported(metrics.engagement) !== null);
  const comparable = totals.likes !== null && (totals.comments !== null || totals.shares !== null);
  const active = (totals.comments ?? 0) + (totals.shares ?? 0);
  return {
    posts: rows.length, totals, coverage, interactions: total, interactionPosts, unbrokenPosts: unbroken.length,
    activeShare: comparable && total > 0 ? active / total : null,
    rate: rateViews > 0 ? rateInteractions / rateViews : null, ratePosts,
  };
}
/** Interactions of one post (interactions_v1): reported likes + comments + shares; only when the source reported
 * none of the three does its own total stand in; otherwise null. Kept under this name for its many importers. */
export const postInteractions = metrics => interactions(metrics);
/** How often one piece of content was shared (content_shares_v1). Kept under this name for its many importers. */
export const contentShares = posts => contentSharesRule(posts);
export function percentLabel(value, digits = 0) {
  return finite(value) ? (value * 100).toLocaleString('id-ID', { maximumFractionDigits: digits }) + '%' : null;
}
