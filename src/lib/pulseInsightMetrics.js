// Three reader-facing figures, counted from the posts already on screen: the net sentiment score, how concentrated
// the speaking is in a few accounts and posts, and the points of the narrative bubble chart. Pure: no clock, no network.
// A figure nobody observed is null and never read as zero.
// A post's tone, interactions and account are read through pulseMeasures.js, the one home of those rules; how
// concentrated the accounts are is the reading `concentration_v1` of pulseReadings.js.
import { byInteractions, interactionsTotal, postMeasures, reported, toneShares } from './pulseMeasures.js';
import { concentration } from './pulseReadings.js';
import { recentShareChange } from './pulseTrend.js';

/** Net sentiment: (positive − negative) ÷ analysed posts, from −100 (all negative) to +100 (all positive).
 * Posts not analysed yet are outside the base. Null when none is analysed.
 * @param {{positive?: number, neutral?: number, negative?: number}} counts */
export function netSentiment(counts = {}) {
  // The base is the one tone_share_v1 names: the analysed posts.
  const { analysed } = toneShares(counts);
  return analysed ? ((reported(counts?.positive) ?? 0) - (reported(counts?.negative) ?? 0)) / analysed * 100 : null;
}

/** Change of the net score, in points: the last `window` days of `rows` against the ones before, shares of analysed posts.
 * Null when either window has nothing analysed. @param {{positive:number, neutral:number, negative:number}[]} rows oldest first */
export function netSentimentChange(rows, window = 7) {
  const positive = recentShareChange(rows, 'positive', window), negative = recentShareChange(rows, 'negative', window);
  return positive && negative ? { delta: positive.delta - negative.delta, days: positive.days } : null;
}

/** One bubble per narrative (a group of posts that carry the same issue or the same text).
 * x = posts, y = net sentiment, size = interactions the sources reported (interactions_v1 over the narrative's posts: null when
 * none reported any), with `interaction_posts`, the posts that total rests on.
 * A narrative with no analysed post has no y: it is counted in `unrated`, not drawn at zero.
 * @param {{id: string, title: string, posts: object[]}[]} narratives
 * @returns {{points: {id: string, title: string, posts: object[], count: number, accounts: number, net: number, interactions: number|null, interaction_posts: number}[], unrated: number}} */
export function narrativeBubbles(narratives = [], limit = 12) {
  const points = [];
  let unrated = 0;
  for (const group of narratives.slice(0, limit)) {
    const counts = { positive: 0, neutral: 0, negative: 0, unknown: 0 }, accounts = new Set();
    for (const post of group.posts) {
      const own = postMeasures(post);
      counts[own.tone in counts ? own.tone : 'unknown']++;
      if (own.account) accounts.add(own.account);
    }
    const net = netSentiment(counts);
    if (net === null) { unrated++; continue; }
    const total = interactionsTotal(group.posts);
    points.push({ id: group.id, title: group.title, posts: group.posts, count: group.posts.length, net, interactions: total.value, interaction_posts: total.posts, accounts: accounts.size });
  }
  return { points, unrated };
}

/** How concentrated the speaking is: the share of posts written by the three most active accounts (the reading
 * `concentration_v1`, which also holds the 80% point and the curve), and the share of interactions held by the three
 * posts with the most (ordered as every list by interactions is). An account is account_v1. Neither share says
 * anything about intent: a news publisher writing often is concentrated and ordinary.
 * @returns {{accounts: number, posts: number, topAccounts: {key: string, author: string, platform: string, count: number, share: number}[], topAccountShare: number|null,
 *   interactions: number|null, topPosts: {id: string, author: string, platform: string, interactions: number, share: number}[], topPostShare: number|null,
 *   reading: ReturnType<typeof concentration>}} `posts` counts the posts that have an account */
export function accountConcentration(posts = []) {
  const reading = concentration(posts);
  const ranked = posts.filter(post => postMeasures(post).interactions > 0).sort(byInteractions);
  const interactions = ranked.reduce((sum, post) => sum + postMeasures(post).interactions, 0);
  const topAccounts = reading.posts.top.map(row => ({ key: row.account, author: (row.name ?? row.account.slice(row.platform.length + 1)).replace(/^@/, ''),
    platform: row.platform, count: row.value, share: row.share }));
  const topPosts = ranked.slice(0, 3).map(post => ({ id: post.id, author: typeof post.author === 'string' ? post.author.trim() : '', platform: post.platform || '',
    interactions: postMeasures(post).interactions, share: postMeasures(post).interactions / interactions }));
  return {
    accounts: reading.posts.accounts, posts: reading.posts.total, topAccounts, topAccountShare: reading.posts.top_share,
    interactions: interactions || null, topPosts,
    topPostShare: interactions ? topPosts.reduce((sum, row) => sum + row.share, 0) : null,
    reading,
  };
}

/** One platform's tone as a diverging bar: negative runs left of a centre line, positive right, and the neutral posts
 * are split evenly across the line, so a balanced platform is symmetrical. Shares are percent of the analysed posts.
 * `left` and `right` list segments from the centre outwards. Null when nothing is analysed.
 * @returns {{left: {key: string, share: number}[], right: {key: string, share: number}[], leftTotal: number, rightTotal: number, net: number}|null} */
export function divergingSplit(counts = {}) {
  const { analysed } = toneShares(counts);
  if (!analysed) return null;
  const [positive, neutral, negative] = ['positive', 'neutral', 'negative'].map(key => reported(counts?.[key]) ?? 0);
  const share = value => value / analysed * 100, half = share(neutral) / 2;
  const left = [{ key: 'neutral', share: half }, { key: 'negative', share: share(negative) }].filter(row => row.share > 0);
  const right = [{ key: 'neutral', share: half }, { key: 'positive', share: share(positive) }].filter(row => row.share > 0);
  return { left, right, leftTotal: share(negative) + half, rightTotal: share(positive) + half, net: netSentiment(counts) };
}

/** The longest side among several platforms' bars (percent), so every bar is drawn on one scale and lengths can be compared. */
export const divergingScale = splits => Math.max(1, ...splits.filter(Boolean).flatMap(split => [split.leftTotal, split.rightTotal]));
