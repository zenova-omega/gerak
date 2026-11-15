// Posts that hold stored comments, prepared for the post picker on Komentar: which rows exist, in what order,
// which of them a search finds, and which part of a caption to show for it. Pure: no React, no DOM, no network.

const oneLine = value => String(value ?? '').replace(/\s+/g, ' ').trim();
/** Lower case without accents, so "berita" finds "Bérita". `foldMap` applies it one character at a time. */
const foldChar = text => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const fold = value => foldChar(oneLine(value));

/** One line of what a post says: its title, otherwise its text. Empty when the post has neither. */
export function postCaption(post) {
  return oneLine(post?.title || post?.text);
}

/** How many comments are stored for a post. A post without a snapshot has none. */
export function storedComments(post) {
  const items = post?.metrics?.comment_snapshot?.items;
  return Array.isArray(items) ? items.length : 0;
}

const time = value => { const at = value ? Date.parse(value) : NaN; return Number.isNaN(at) ? -Infinity : at; };

/** One row per post that has stored comments, busiest first. Equal counts fall back to the newer post, then to
 * the id, so the order never changes between renders.
 * @returns {{id:string, post:object, author:string, platform:string, caption:string, comments:number, published_at:string|null, haystack:string}[]} */
export function commentPostRows(posts = []) {
  return posts
    .map(post => ({ id: post.id, post, author: oneLine(post.author), platform: post.platform || '', caption: postCaption(post), comments: storedComments(post), published_at: post.published_at || null }))
    .filter(row => row.comments > 0)
    .map(row => ({ ...row, haystack: fold(row.author) + '\n' + fold(row.caption) }))
    .sort((a, b) => b.comments - a.comments || time(b.published_at) - time(a.published_at) || String(a.id).localeCompare(String(b.id)));
}

/** Words of a query as they are matched: folded, without the "@" people type before an account name. */
export function searchTerms(query) {
  return fold(query).split(' ').map(term => term.replace(/^@+/, '')).filter(Boolean);
}

/** Rows whose account name or caption holds every word of the query, on the chosen platforms. An empty
 * `platforms` means every platform. The order of `rows` is kept, so results stay busiest first.
 * @param {{query?: string, platforms?: string[]}} [filter] */
export function searchCommentPosts(rows = [], { query = '', platforms = [] } = {}) {
  const terms = searchTerms(query), only = new Set(platforms);
  return rows.filter(row => (!only.size || only.has(row.platform)) && terms.every(term => row.haystack.includes(term)));
}

/** Every platform among `rows`, largest first, with how many of the `found` posts sit on it. Pass the rows a
 * query found (before the platform choice) as `found`, so a chip keeps its place and says how many matches it holds.
 * @returns {{platform:string, posts:number}[]} */
export function commentPostPlatforms(rows = [], found = rows) {
  const total = new Map(), matched = new Map();
  for (const row of rows) total.set(row.platform, (total.get(row.platform) || 0) + 1);
  for (const row of found) matched.set(row.platform, (matched.get(row.platform) || 0) + 1);
  return [...total].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([platform]) => ({ platform, posts: matched.get(platform) || 0 }));
}

const lowSurrogate = (text, index) => { const code = text.charCodeAt(index); return code >= 0xDC00 && code <= 0xDFFF; };

/** Folded text with, for every folded character, where it starts and ends in the original. */
function foldMap(text) {
  let folded = '', index = 0;
  const from = [], to = [];
  for (const char of text) {
    const piece = foldChar(char);
    for (let unit = 0; unit < piece.length; unit++) { from.push(index); to.push(index + char.length); }
    folded += piece;
    index += char.length;
  }
  return { folded, from, to };
}

/** The text cut into parts, the ones a query word matched marked `hit`. With `max`, the text is a snippet of at
 * most that many characters: it starts shortly before the first match when that match is not near the start,
 * with "…" where text was left out, so a one-line result shows why it was found even when the word sits deep
 * in a caption. Without `max` nothing is cut.
 * @param {{max?: number, lead?: number}} [options] `lead` is how much text is kept before the first match.
 * @returns {{text:string, hit:boolean}[]} */
export function matchParts(text, query, { max = Infinity, lead = 24 } = {}) {
  const source = oneLine(text), terms = searchTerms(query);
  if (!source) return [];
  const { folded, from, to } = foldMap(source), ranges = [];
  for (const term of terms) for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) ranges.push([from[at], to[at + term.length - 1]]);
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const hits = [];
  for (const [start, end] of ranges) { const last = hits.at(-1); if (last && start <= last[1]) last[1] = Math.max(last[1], end); else hits.push([start, end]); }
  // The window: from a word boundary shortly before the first match, `max` characters on.
  let start = 0;
  if (Number.isFinite(max) && hits.length && hits[0][0] > lead) {
    start = hits[0][0] - lead;
    const space = source.indexOf(' ', start);
    if (space !== -1 && space < hits[0][0]) start = space + 1;
    else if (lowSurrogate(source, start)) start += 1;
  }
  let end = Math.min(source.length, start + max);
  if (end < source.length && lowSurrogate(source, end)) end -= 1;   // never cut an emoji in half
  const parts = [];
  const push = (a, b, hit) => { if (b > a) parts.push({ text: source.slice(a, b), hit }); };
  let cursor = start;
  for (const [a, b] of hits) {
    if (b <= start) continue;
    if (a >= end) break;
    push(cursor, Math.max(a, start), false);
    push(Math.max(a, start), Math.min(b, end), true);
    cursor = Math.min(b, end);
  }
  push(cursor, end, false);
  if (start > 0) parts.unshift({ text: '…', hit: false });
  if (end < source.length) parts.push({ text: '…', hit: false });
  return parts;
}
