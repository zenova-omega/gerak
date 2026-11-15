// Three reader-facing figures, counted from the posts already on screen: the net sentiment score, how concentrated
// the speaking is in a few accounts and posts, and the points of the narrative bubble chart. Pure: no clock, no network.
// A figure nobody observed is null and never read as zero.
import { postSentiment } from './pulsePostFilters.js';
import { postInteractions } from './pulseEngagement.js';
import { recentShareChange } from './pulseTrend.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);

/** Net sentiment: (positive − negative) ÷ analysed posts, from −100 (all negative) to +100 (all positive).
 * Posts not analysed yet are outside the base. Null when none is analysed.
 * @param {{positive?: number, neutral?: number, negative?: number}} counts */
export function netSentiment(counts = {}) {
  const positive = counts.positive || 0, neutral = counts.neutral || 0, negative = counts.negative || 0, analysed = positive + neutral + negative;
  return analysed ? (positive - negative) / analysed * 100 : null;
}

/** Change of the net score, in points: the last `window` days of `rows` against the ones before, shares of analysed posts.
 * Null when either window has nothing analysed. @param {{positive:number, neutral:number, negative:number}[]} rows oldest first */
export function netSentimentChange(rows, window = 7) {
  const positive = recentShareChange(rows, 'positive', window), negative = recentShareChange(rows, 'negative', window);
  return positive && negative ? { delta: positive.delta - negative.delta, days: positive.days } : null;
}

/** One bubble per narrative (a group of posts that carry the same issue or the same text).
 * x = posts, y = net sentiment, size = interactions the sources reported (null when none reported any).
 * A narrative with no analysed post has no y: it is counted in `unrated`, not drawn at zero.
 * @param {{id: string, title: string, posts: object[]}[]} narratives
 * @returns {{points: {id: string, title: string, posts: object[], count: number, accounts: number, net: number, interactions: number|null}[], unrated: number}} */
export function narrativeBubbles(narratives = [], limit = 12) {
  const points = [];
  let unrated = 0;
  for (const group of narratives.slice(0, limit)) {
    const counts = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    let interactions = null;
    for (const post of group.posts) {
      counts[postSentiment(post)]++;
      const own = postInteractions(post.metrics);
      if (finite(own)) interactions = (interactions ?? 0) + own;
    }
    const net = netSentiment(counts);
    if (net === null) { unrated++; continue; }
    points.push({ id: group.id, title: group.title, posts: group.posts, count: group.posts.length, net, interactions,
      accounts: new Set(group.posts.map(post => post.platform + '|' + post.author)).size });
  }
  return { points, unrated };
}

/** How concentrated the speaking is: the share of posts written by the three most active accounts, and the share of
 * interactions held by the three posts with the most. An account is one author on one platform. Neither share says
 * anything about intent: a news publisher writing often is concentrated and ordinary.
 * @returns {{accounts: number, posts: number, topAccounts: {author: string, platform: string, count: number, share: number}[], topAccountShare: number|null,
 *   interactions: number|null, topPosts: {id: string, author: string, platform: string, interactions: number, share: number}[], topPostShare: number|null}} */
export function accountConcentration(posts = []) {
  const accounts = new Map(), ranked = [];
  let named = 0, interactions = 0;
  for (const post of posts) {
    const author = typeof post.author === 'string' ? post.author.trim() : '';
    if (author) {
      named++;
      const key = (post.platform || '') + '|' + author.replace(/^@/, '').toLowerCase();
      const row = accounts.get(key) || { author: author.replace(/^@/, ''), platform: post.platform || '', count: 0 };
      row.count++;
      accounts.set(key, row);
    }
    const own = postInteractions(post.metrics);
    if (finite(own) && own > 0) { interactions += own; ranked.push({ id: post.id, author, platform: post.platform || '', interactions: own }); }
  }
  const topAccounts = [...accounts.values()].sort((a, b) => b.count - a.count || a.author.localeCompare(b.author)).slice(0, 3)
    .map(row => ({ ...row, share: row.count / named }));
  const topPosts = ranked.sort((a, b) => b.interactions - a.interactions).slice(0, 3).map(row => ({ ...row, share: row.interactions / interactions }));
  return {
    accounts: accounts.size, posts: named, topAccounts,
    topAccountShare: named ? topAccounts.reduce((sum, row) => sum + row.share, 0) : null,
    interactions: interactions || null, topPosts,
    topPostShare: interactions ? topPosts.reduce((sum, row) => sum + row.share, 0) : null,
  };
}

/** One platform's tone as a diverging bar: negative runs left of a centre line, positive right, and the neutral posts
 * are split evenly across the line, so a balanced platform is symmetrical. Shares are percent of the analysed posts.
 * `left` and `right` list segments from the centre outwards. Null when nothing is analysed.
 * @returns {{left: {key: string, share: number}[], right: {key: string, share: number}[], leftTotal: number, rightTotal: number, net: number}|null} */
export function divergingSplit(counts = {}) {
  const positive = counts.positive || 0, neutral = counts.neutral || 0, negative = counts.negative || 0, analysed = positive + neutral + negative;
  if (!analysed) return null;
  const share = value => value / analysed * 100, half = share(neutral) / 2;
  const left = [{ key: 'neutral', share: half }, { key: 'negative', share: share(negative) }].filter(row => row.share > 0);
  const right = [{ key: 'neutral', share: half }, { key: 'positive', share: share(positive) }].filter(row => row.share > 0);
  return { left, right, leftTotal: share(negative) + half, rightTotal: share(positive) + half, net: netSentiment(counts) };
}

/** The longest side among several platforms' bars (percent), so every bar is drawn on one scale and lengths can be compared. */
export const divergingScale = splits => Math.max(1, ...splits.filter(Boolean).flatMap(split => [split.leftTotal, split.rightTotal]));
