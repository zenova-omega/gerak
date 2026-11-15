// The strongest negative and positive mentions of a project's chosen scope, for Ikhtisar: posts from every platform,
// news included, whose tone has been analysed. A post's tone and interactions are the calculation dictionary's
// (tone_share_v1, interactions_v1 through postMeasures), and the order is the one every list by interactions uses
// (byInteractions: known first, most first, then the earlier post). News reports no interactions, so an article comes
// after the posts whose interactions are known. A platform filter lists one platform at a time, news included.
import { byInteractions, postMeasures } from './pulseMeasures.js';

const ANALYSED = new Set(['positive', 'neutral', 'negative']);

/** The same story printed by several outlets ("… - Kompas.com", "… | ROSI - Kompas.tv"), or the same text posted by
 * several accounts, reads as one mention: the outlet's tail is cut, then case, spacing and punctuation are ignored. */
export function mentionKey(post) {
  let text = String(post?.title || post?.text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const bar = text.indexOf(' | ');
  if (bar > 0) text = text.slice(0, bar);
  const dash = text.lastIndexOf(' - ');
  if (dash > 20 && text.length - dash <= 40) text = text.slice(0, dash);
  return text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * @param {object[]} posts the posts of the chosen scope
 * @param {'negative'|'positive'} tone
 * @param {{platform?: string, limit?: number}} options `platform` is 'all' or one platform key ('x', 'tiktok', 'news', …)
 * @returns {{tone: string, platform: string, analysed: number, matching: number, rows: object[], all: object[]}}
 *   `analysed` the posts of the platform with a tone, `matching` those of `tone`, `rows` at most `limit` mentions (each a
 *   post with `also`: how many more posts carried the same story or text), `all` every matching post in order
 */
export function topMentions(posts = [], tone, { platform = 'all', limit = 5 } = {}) {
  const analysed = (posts || []).filter(post => (platform === 'all' || post?.platform === platform) && ANALYSED.has(postMeasures(post).tone));
  const all = analysed.filter(post => postMeasures(post).tone === tone).sort(byInteractions);
  const mentions = new Map();
  for (const post of all) {
    const key = mentionKey(post) || `id:${post.id}`;
    if (mentions.has(key)) mentions.get(key).also += 1; else mentions.set(key, { post, also: 0 });
  }
  const rows = [...mentions.values()].slice(0, limit).map(({ post, also }) => ({ ...post, also }));
  return { tone, platform, analysed: analysed.length, matching: all.length, rows, all };
}

/** The platforms the filter offers: those with at least one analysed post in the scope, most analysed posts first,
 * ties by the platform's key. @returns {{platform: string, count: number}[]} */
export function mentionPlatforms(posts = []) {
  const counts = new Map();
  for (const post of posts || []) {
    if (!post?.platform || !ANALYSED.has(postMeasures(post).tone)) continue;
    counts.set(post.platform, (counts.get(post.platform) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([platform, count]) => ({ platform, count }));
}
