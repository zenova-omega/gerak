// Readings of part 3 of the calculation dictionary: who is speaking. An account's follower count, and the size of
// the speakers behind a selection. Built on part 1's rules (account, interactions, tone) and never counting an
// account, an interaction or a tone a second way. This file and server/app/services/pulse_demography.py are the
// only homes of these readings; both are tested against shared/pulse-demography.cases.json.
// Every function takes posts already scoped to the project's period and platforms.
import { formatCount } from './pulseData.js';
import { accountName, interactionsTotal, postMeasures, readTime, reported, toneShares } from './pulseMeasures.js';
import { voiceOf } from './pulseVoice.js';
import { provinceOfLocation } from './pulsePlaces.js';

export const RULES = Object.freeze({ followers: 'followers_v1', tier: 'account_tier_v1', origin: 'account_origin_v1', lead: 'group_lead_v1' });
export const RULE_TEXT = Object.freeze({
  followers: 'Pengikut sebuah akun adalah angka pada postingan akun itu yang paling baru dikumpulkan dan melaporkan jumlah pengikut; tanpa waktu pengumpulan, angka yang lebih besar; angka yang bukan bilangan bulat nol atau lebih dianggap tidak dilaporkan.',
  tier: 'Postingan berita membentuk baris Pemberitaan; postingan media sosial masuk ke golongan menurut pengikut akunnya: 1 jt atau lebih, 100 rb sampai di bawah 1 jt, 10 rb sampai di bawah 100 rb, 1 rb sampai di bawah 10 rb, di bawah 1 rb, atau pengikut tidak diketahui.',
  origin: 'Asal akun X dibaca dari lokasi yang ditulis pemiliknya dan negara tempat tinggal yang disebut platform, pada postingan akun itu yang paling baru dikumpulkan; akun yang belum ditanyakan, yang tidak menulis lokasi, dan yang lokasinya tidak menyebut provinsi dihitung terpisah.',
  lead: 'Kalimat pembuka disusun dari angka golongan akun, tanpa model, bila sedikitnya dua golongan bisa dibandingkan. Golongan dengan posting terbanyak atau interaksi terbesar disebut hanya bila selisihnya dengan golongan berikutnya lebih besar dari bagian akun yang pengikutnya tidak diketahui; bila bagian itu sama dengan atau lebih besar dari golongan teratas, yang disebut adalah bagian itu dan dua platform terbesarnya. Golongan paling negatif disebut bila sedikitnya dua golongan punya 20 postingan yang dianalisis atau lebih dan golongan itu punya postingan negatif; bila akun yang pengikutnya tidak diketahui juga punya 20 postingan yang dianalisis, golongan itu disebut paling negatif di luar akun yang pengikutnya tidak diketahui, dan nada akun tersebut ditambahkan bila lebih negatif. Provinsi dengan akun X terbanyak disebut bila sedikitnya 10 akun terbaca provinsinya.',
});

/** account_tier_v1: the rows, in the order they are shown. A tier with a `min` holds the accounts with at least that
 * many followers and fewer than the `min` of the tier above. */
export const TIERS = Object.freeze([
  { key: 'news', label: 'Pemberitaan' },
  { key: '1m', label: '≥1 jt', min: 1000000 },
  { key: '100k', label: '100 rb–1 jt', min: 100000 },
  { key: '10k', label: '10–100 rb', min: 10000 },
  { key: '1k', label: '1–10 rb', min: 1000 },
  { key: 'small', label: '<1 rb', min: 0 },
  { key: 'unknown', label: 'Pengikut tidak diketahui' },
]);
/** account_tier_v1: accounts named in a row. */
export const TOP_ACCOUNTS = 3;
const TONES = ['positive', 'neutral', 'negative', 'unknown'];

/** The account (account_v1 key) of a post, or null when it has none. */
const keyOf = post => { const key = postMeasures(post).account; return typeof key === 'string' && key.includes(':') ? key : null; };
/** Code point order, as the server sorts text. */
const compare = (a, b) => {
  const x = [...a], y = [...b];
  for (let index = 0; index < x.length && index < y.length; index++) {
    const step = x[index].codePointAt(0) - y[index].codePointAt(0);
    if (step) return step;
  }
  return x.length - y.length;
};

/** The larger of two values `latestBy` reads: a number by size, a text by code point (its readers return nothing else). */
const larger = (a, b) => (typeof a === 'number' ? a > b : compare(a, b) > 0);
/** The platform of a post as stored; `unknown` when it has none. */
const platformOf = post => (typeof post?.platform === 'string' && post.platform ? post.platform : 'unknown');
/**
 * Per account (account_v1 key), what `read` finds on its most recently collected post that carries something
 * (`crawled_at`, then `first_observed_at`). A post with a collection time is later than one without; on the same time,
 * or with no time on either, the larger value wins (a number by size, a text by code point), and `read` returning
 * `undefined` means the post carries nothing. The one rule behind followers_v1 and account_origin_v1.
 * @returns {Map<string, {seen: number, value: *, post: object}>}
 */
function latestBy(posts, read) {
  const best = new Map();
  for (const post of posts || []) {
    const value = read(post), key = keyOf(post);
    if (value === undefined || key === null) continue;
    const seen = readTime(post.crawled_at) ?? readTime(post.first_observed_at) ?? -Infinity, current = best.get(key);
    if (!current || seen > current.seen || (seen === current.seen && larger(value, current.value))) best.set(key, { seen, value, post });
  }
  return best;
}

/**
 * followers_v1: the follower count of each account (account_v1 key), read from `metrics.author_followers`. The
 * figure on the account's most recently collected post that carries one wins (`crawled_at`, then `first_observed_at`); a
 * post with a collection time is later than one without, and on the same time, or with no time on either, the larger
 * figure wins. A figure that is not a whole number of zero or more is not reported (part 1's `reported`).
 * @returns {Map<string, number>}
 */
export function followersOf(posts) {
  const best = latestBy(posts, post => reported(post?.metrics?.author_followers) ?? undefined);
  return new Map([...best].map(([key, { value }]) => [key, value]));
}

/**
 * account_tier_v1: the tier key of one post, given the follower counts of its selection (`followersOf` of the whole
 * selection, so every post of an account sits in one tier). A post of voice `news` is Pemberitaan whatever its
 * followers; a social media post is in the tier of its account's figure, by the lower bounds of TIERS (inclusive), or
 * `unknown` when the post has no account or the account has no figure. The one grouping `accountTiers` counts by.
 * @param {object} post @param {Map<string, number>} followers @returns {string}
 */
export function tierOf(post, followers) {
  if (voiceOf(post) === 'news') return 'news';
  const count = followers?.get(keyOf(post));
  return count === undefined ? 'unknown' : TIERS.find(tier => 'min' in tier && count >= tier.min).key;
}

/**
 * account_tier_v1: the size of the speakers. Posts of voice `news` form the row Pemberitaan whatever their
 * followers; a social media post is in the tier of its account's `followers_v1` figure, or in "unknown" when the
 * account has none or the post has no account (`tierOf`). Per row: accounts, posts and their share of every post, the
 * interactions (interactions_v1, with the posts they rest on) and their share of the selection's known
 * interactions (null when the row's are unknown or the selection's total is 0), the tone, its `platforms` (the posts
 * and known interactions of each platform, by posts, larger first, ties by platform; `unknown` for a post without one)
 * and the `top` accounts (three at most):
 * by the interactions of their posts, known before unknown, larger first, ties by account key; Pemberitaan by posts,
 * ties by account key. Rows are in the order of TIERS and only those with posts are listed.
 * @returns {{total: number, social_posts: number, followers_known_posts: number, known_interactions: number|null,
 *   rows: {key: string, label: string, accounts: number, posts: number, post_share: number,
 *     interactions: {value: number|null, posts: number}, interaction_share: number|null, tone: object,
 *     platforms: {platform: string, posts: number, interactions: number|null}[],
 *     top: {account: string, name: string|null, platform: string, interactions: number|null}[]}[]}}
 */
export function accountTiers(posts) {
  const list = [...(posts || [])], followers = followersOf(list), groups = new Map(TIERS.map(tier => [tier.key, []]));
  let social = 0, known = 0;
  for (const post of list) {
    const key = tierOf(post, followers);
    if (key !== 'news') { social++; if (key !== 'unknown') known++; }
    groups.get(key).push(post);
  }
  const all = interactionsTotal(list).value;
  const rows = TIERS.filter(tier => groups.get(tier.key).length).map(tier => {
    const own = groups.get(tier.key), accounts = new Map(), platforms = new Map(), counts = Object.fromEntries(TONES.map(name => [name, 0]));
    for (const post of own) {
      counts[postMeasures(post).tone]++;
      const key = keyOf(post), platform = platformOf(post);
      if (key !== null) (accounts.has(key) ? accounts.get(key) : accounts.set(key, []).get(key)).push(post);
      (platforms.has(platform) ? platforms.get(platform) : platforms.set(platform, []).get(platform)).push(post);
    }
    const named = [...accounts].map(([account, rows]) => ({ account, name: accountName(rows), platform: account.slice(0, account.indexOf(':')), posts: rows.length, interactions: interactionsTotal(rows).value }));
    const order = tier.key === 'news' ? (a, b) => b.posts - a.posts || compare(a.account, b.account)
      : (a, b) => (a.interactions === null) - (b.interactions === null) || (b.interactions ?? 0) - (a.interactions ?? 0) || compare(a.account, b.account);
    const total = interactionsTotal(own);
    return {
      key: tier.key, label: tier.label, accounts: accounts.size, posts: own.length, post_share: own.length / list.length,
      interactions: total, interaction_share: total.value !== null && all ? total.value / all : null,
      tone: toneShares(counts),
      platforms: [...platforms].map(([platform, list]) => ({ platform, posts: list.length, interactions: interactionsTotal(list).value }))
        .sort((a, b) => b.posts - a.posts || compare(a.platform, b.platform)),
      top: named.sort(order).slice(0, TOP_ACCOUNTS).map(({ account, name, platform, interactions }) => ({ account, name, platform, interactions })),
    };
  });
  return { total: list.length, social_posts: social, followers_known_posts: known, known_interactions: all, rows };
}

/** account_tier_v1: the share of social media posts whose account's follower count is known (the base every tier but
 * Pemberitaan rests on), from an `accountTiers` reading; null when there is no social media post. */
export const followersKnownShare = tiers => (tiers?.social_posts ? tiers.followers_known_posts / tiers.social_posts : null);

/** account_tier_v1: the share of the known interactions of social media posts that come from accounts whose follower
 * count is known (Pemberitaan left out), from an `accountTiers` reading; null when no social media interaction is
 * known. Beside `followersKnownShare` it says how much of the interaction column the tiers can place. */
export function followersKnownInteractionShare(tiers) {
  let social = 0, known = 0;
  for (const row of tiers?.rows || []) {
    const value = row.interactions?.value;
    if (row.key === 'news' || value === null || value === undefined) continue;
    social += value;
    if (row.key !== 'unknown') known += value;
  }
  return social ? known / social : null;
}


/** account_origin_v1: "based in" values that name a region, not a country (compared ignoring case and outer spaces). */
export const REGIONS = Object.freeze(['Southeast Asia', 'East Asia', 'East Asia & Pacific', 'South Asia', 'West Asia', 'Central Asia', 'Asia', 'Asia Pacific',
  'Middle East', 'Europe', 'North America', 'South America', 'Latin America', 'Africa', 'Oceania']);
const REGION_SET = new Set(REGIONS.map(name => name.toLowerCase()));
/** The most recently published post of an account, by the rule that picks its name (account_v1): the latest readable
 * `published_at`; a post without one comes after every dated post; on a tie the first post given wins. */
function publishedOf(own) {
  let found = null, latest = null;
  for (const post of own) {
    const time = readTime(post.published_at);
    if (found === null || (time !== null && (latest === null || time > latest))) { found = post; latest = time; }
  }
  return found;
}
/** account_origin_v1: provinces listed. */
export const ORIGIN_PROVINCES = 8;
const COUNTRIES = ['indonesia', 'abroad', 'region_only', 'unknown'];

/** The text of a profile field the owner or the platform stated, or undefined when the post does not carry the key. */
const textOf = field => post => { const value = post?.metrics?.[field]; return typeof value === 'string' ? value : undefined; };
/** account_origin_v1: the country group a "based in" value puts an account in: `indonesia`, `region_only` (a name in
 * REGIONS: a region can include Indonesia, so it is never abroad), `abroad` (any other text) or `unknown` (missing,
 * blank or not a text); compared ignoring case and outer spaces. The one grouping `accountOrigin` counts by.
 * @returns {'indonesia'|'abroad'|'region_only'|'unknown'} */
export function countryOf(basedIn) {
  const name = typeof basedIn === 'string' ? basedIn.trim().toLowerCase() : '';
  return !name ? 'unknown' : name === 'indonesia' ? 'indonesia' : REGION_SET.has(name) ? 'region_only' : 'abroad';
}
/** Accounts and posts with the tone of those posts. */
const standing = rows => {
  const counts = Object.fromEntries(TONES.map(name => [name, 0]));
  for (const post of rows.flatMap(row => row.list)) counts[postMeasures(post).tone]++;
  return { accounts: rows.length, posts: rows.reduce((sum, row) => sum + row.posts, 0), tone: toneShares(counts) };
};

/**
 * account_origin_v1: where the X accounts speaking are from. X posts only; an account is `account_v1`. Its location
 * (`metrics.author_location`) and its "based in" (`metrics.author_based_in`) are each read from the account's most
 * recently collected post that carries it, as followers_v1 reads a follower count. No post carries a location: the
 * account is `unasked`; an empty text: `no_location`; any other text: `with_location`, of which `province_read` name a
 * province (provinceOfLocation). "Based in" sorts every account into `country` by `countryOf`: Indonesia, `abroad` (a
 * country), `region_only` (a name in REGIONS) or `unknown` (missing or empty). Provinces: the eight with most accounts, then most
 * posts, then name; places of a province by accounts, then name. Accounts are by known interactions, larger first,
 * unknown last, ties by key; `post` is the account's most recently published post (the rule of its name), `based_in` is returned as stored, untrimmed. An account without a dated post is
 * counted and has `first_day: null`.
 * @returns {{accounts: number, unasked: number, no_location: number, with_location: number, province_read: number,
 *   country: Record<'indonesia'|'abroad'|'region_only'|'unknown', {accounts: number, posts: number, tone: object}>,
 *   provinces: {code: string, name: string, accounts: number, posts: number, tone: object, places: [string, number][]}[],
 *   rows: {key: string, author: string|null, location: string|undefined, based_in: string|undefined,
 *     province: {code: string, name: string, place: string}|null, first_day: string|null, posts: number,
 *     interactions: {value: number|null, posts: number}, followers: number|null, post: object}[]}}
 */
export function accountOrigin(posts) {
  const list = (posts || []).filter(post => keyOf(post)?.startsWith('x:'));
  const locations = latestBy(list, textOf('author_location')), basedIn = latestBy(list, textOf('author_based_in'));
  const followers = followersOf(list), byAccount = new Map();
  for (const post of list) { const key = keyOf(post); (byAccount.get(key) || byAccount.set(key, []).get(key)).push(post); }
  const rows = [...byAccount].map(([key, own]) => {
    const location = locations.get(key)?.value, days = own.map(post => postMeasures(post).day).filter(Boolean).sort();
    return {
      key, author: accountName(own), location, based_in: basedIn.get(key)?.value,
      province: location?.trim() ? provinceOfLocation(location) : null,
      first_day: days[0] ?? null, posts: own.length, interactions: interactionsTotal(own),
      followers: followers.get(key) ?? null, post: publishedOf(own), list: own,
    };
  }).sort((a, b) => (a.interactions.value === null) - (b.interactions.value === null) || (b.interactions.value ?? 0) - (a.interactions.value ?? 0) || compare(a.key, b.key));
  const country = Object.fromEntries(COUNTRIES.map(name => [name, standing(rows.filter(row => countryOf(row.based_in) === name))]));
  const places = new Map();
  for (const row of rows) if (row.province) (places.get(row.province.code) || places.set(row.province.code, []).get(row.province.code)).push(row);
  const provinces = [...places.values()].map(own => {
    const counts = new Map();
    for (const row of own) counts.set(row.province.place, (counts.get(row.province.place) || 0) + 1);
    return { code: own[0].province.code, name: own[0].province.name, ...standing(own),
      places: [...counts].sort((a, b) => b[1] - a[1] || compare(a[0], b[0])) };
  }).sort((a, b) => b.accounts - a.accounts || b.posts - a.posts || compare(a.name, b.name)).slice(0, ORIGIN_PROVINCES);
  const asked = rows.filter(row => row.location !== undefined);
  return {
    accounts: rows.length, unasked: rows.length - asked.length, no_location: asked.filter(row => !row.location.trim()).length,
    with_location: asked.filter(row => row.location.trim()).length, province_read: rows.filter(row => row.province).length,
    country, provinces, rows: rows.map(({ list, ...row }) => (void list, row)),
  };
}

/** account_origin_v1: the share of every X account in the selection held by a country group or a province of an
 * `accountOrigin` reading; null when there is no X account. Every share of the origin is over that one base. */
export const accountShare = (group, origin) => (origin?.accounts ? group.accounts / origin.accounts : null);
/** account_origin_v1: the share of every X account whose province is read; null when there is no X account. */
export const provinceReadShare = origin => (origin?.accounts ? origin.province_read / origin.accounts : null);

/** group_lead_v1: groups are compared only when at least this many can be named: one group alone carries everything
 * and is the most and least negative at once, which says nothing the row does not. */
export const COMPARE_MIN_ROWS = 2;
/** group_lead_v1: a row needs this many analysed posts to be named the most negative. */
export const NEGATIVE_MIN_ANALYSED = 20;
/** group_lead_v1: the province is named when at least this many accounts have one. */
export const WHERE_MIN_ACCOUNTS = 10;
/** group_lead_v1: the platforms a gap is said to sit on, largest first. */
export const GAP_PLATFORMS = 2;

/** group_lead_v1 on one measure, `value` of a row being its posts or its known interactions (unknown counted as 0):
 * the nameable row with the largest value (on equal values the earlier row of TIERS) is named only when its lead over
 * the next is larger than the unknown row's value, so a tie is no lead; `gap` when the unknown row's value is above 0
 * and at least the leader's. Whole counts, so both runtimes decide alike. */
function measureLead(rows, unknown, value) {
  let first = null, second = null;
  for (const row of rows) {
    if (!first || value(row) > value(first)) { second = first; first = row; }
    else if (!second || value(row) > value(second)) second = row;
  }
  const top = first ? value(first) : 0, lead = top - (second ? value(second) : 0), gap = unknown ? value(unknown) : 0;
  return { row: first && lead > gap ? first.key : null, gap: gap > 0 && gap >= top };
}
/** group_lead_v1: the platforms the unknown row's `value` (its posts, or its known interactions) mostly sits on: the
 * GAP_PLATFORMS largest above 0, ties by platform, each with its share of the row's `total`. */
function gapPlatforms(unknown, value, total) {
  return unknown.platforms.map(platform => ({ platform: platform.platform, amount: value(platform) ?? 0 })).filter(platform => platform.amount > 0)
    .sort((a, b) => b.amount - a.amount || compare(a.platform, b.platform)).slice(0, GAP_PLATFORMS)
    .map(({ platform, amount }) => ({ platform, share: amount / total }));
}

/**
 * group_lead_v1: what the readings above say first, without a model. The rows that may be named are every `TIERS` row
 * but `unknown` ("Pengikut tidak diketahui" names a gap in the data, not a kind of speaker).
 * `carrier`: when at least COMPARE_MIN_ROWS rows may be named (else null), on each measure (posts; known interactions):
 * `posts_row` / `interactions_row`, the row with the most, named only when its lead over the next nameable row is
 * larger than the unknown row's count on that measure (else null: the gap could overturn it); `posts_gap` /
 * `interactions_gap` when the unknown row's count is above 0 and at least the leader's: its share (of every post, of
 * the known interactions) and the GAP_PLATFORMS platforms it mostly sits on, with their shares of the row's own.
 * `negative`: when at least COMPARE_MIN_ROWS nameable rows have NEGATIVE_MIN_ANALYSED analysed posts or more, the one
 * of them with the largest tone_share_v2 negative percent (`share`, of the row's `total` posts), ties by more analysed posts,
 * then by TIERS order; null when there is none or that row has no negative post. `unknown` is the unknown row's tone when it has
 * NEGATIVE_MIN_ANALYSED analysed posts (the comparison then leaves out the accounts whose follower count is unknown), with
 * `more_negative` when its negative percent is higher; else null. `where`: the first province of `origin` when at
 * least WHERE_MIN_ACCOUNTS accounts have a province, with `read_share` the share of X accounts whose province is read.
 * @returns {{carrier: {posts_row: string|null, interactions_row: string|null,
 *     posts_gap: {share: number, platforms: {platform: string, share: number}[]}|null,
 *     interactions_gap: {share: number, platforms: {platform: string, share: number}[]}|null}|null,
 *   negative: {row: string, share: number, analysed: number, total: number, unknown: {share: number, analysed: number, total: number, more_negative: boolean}|null}|null,
 *   where: {code: string, name: string, accounts: number, read_share: number}|null}}
 */
export function groupLead(tiers, origin) {
  const every = tiers?.rows || [], rows = every.filter(row => row.key !== 'unknown'), unknown = every.find(row => row.key === 'unknown') || null;
  let carrier = null;
  if (rows.length >= COMPARE_MIN_ROWS) {
    const posts = measureLead(rows, unknown, row => row.posts), interactions = measureLead(rows, unknown, row => row.interactions.value ?? 0);
    carrier = {
      posts_row: posts.row, interactions_row: interactions.row,
      posts_gap: posts.gap ? { share: unknown.post_share, platforms: gapPlatforms(unknown, platform => platform.posts, unknown.posts) } : null,
      interactions_gap: interactions.gap
        ? { share: unknown.interaction_share, platforms: gapPlatforms(unknown, platform => platform.interactions, unknown.interactions.value) } : null,
    };
  }
  let negative = null, best = null;
  const compared = rows.filter(row => row.tone?.analysed >= NEGATIVE_MIN_ANALYSED && row.tone.percent);
  for (const row of compared.length >= COMPARE_MIN_ROWS ? compared : []) {
    if (!best || row.tone.percent.negative > best.tone.percent.negative || (row.tone.percent.negative === best.tone.percent.negative && row.tone.analysed > best.tone.analysed)) best = row;
  }
  if (best && best.tone.text.negative !== '0%') {
    const gap = unknown && unknown.tone.analysed >= NEGATIVE_MIN_ANALYSED ? unknown.tone : null;
    negative = { row: best.key, share: best.tone.percent.negative, analysed: best.tone.analysed, total: best.tone.total,
      unknown: gap && { share: gap.percent.negative, analysed: gap.analysed, total: gap.total, more_negative: gap.percent.negative > best.tone.percent.negative } };
  }
  const province = origin?.provinces?.[0];
  const where = province && origin.province_read >= WHERE_MIN_ACCOUNTS
    ? { code: province.code, name: province.name, accounts: province.accounts, read_share: provinceReadShare(origin) } : null;
  return { carrier, negative, where };
}

/** A share (0 to 1) in words, as every figure of these readings is written: a whole percent cut and never rounded up,
 * as coverage_v1 writes it, so a sentence and the bar beside it always agree. Above 0 and cut to 0 it is "<1%"; a share
 * nobody can state (null) is "—", never 0%. */
export function shareText(share) {
  if (typeof share !== 'number') return '—';
  const percent = Math.floor(share * 100 + 1e-9);
  return percent === 0 && share > 0 ? '<1%' : `${percent}%`;
}

/**
 * group_lead_v1: the sentences that open "Siapa yang bicara", from a `groupLead` reading; it decides, this only writes.
 * In order: posts (the group named, or the gap), interactions (the same; one sentence when both name a group), most
 * negative, province. A tier is "akun <label>", Pemberitaan "pemberitaan"; an interaction share is said to be of the
 * known interactions; a gap is "akun yang pengikutnya tidak diketahui", never a kind of speaker, with its platforms
 * named by `platformName` (how the page names a platform key). The tone percents of the negative sentence are
 * tone_share_v2's own (of the group's posts, the ones not analysed yet included), the other shares are cut. With `sentimentFiltered` (the page shows one sentiment only) the most
 * negative group is not written.
 * @param {{sentimentFiltered?: boolean, platformName?: (platform: string) => string}} options
 * @returns {string[]}
 */
export function leadSentences(lead, tiers, origin, { sentimentFiltered = false, platformName = key => key } = {}) {
  const rows = new Map((tiers?.rows || []).map(row => [row.key, row]));
  const name = key => (key === 'news' ? 'pemberitaan' : `akun ${TIERS.find(tier => tier.key === key)?.label ?? key}`);
  const KNOWN = 'dari interaksi yang tercatat';
  const gapSaid = (gap, what) => {
    const [top, next] = gap.platforms;
    const sits = !top ? '' : next ? `; dari bagian ini, ${shareText(top.share)} di ${platformName(top.platform)} dan ${shareText(next.share)} di ${platformName(next.platform)}`
      : `; seluruhnya di ${platformName(top.platform)}`;
    return `Sebanyak ${shareText(gap.share)} ${what} berasal dari akun yang pengikutnya tidak diketahui${sits}.`;
  };
  const out = [];
  const { carrier, negative, where } = lead || {};
  const first = carrier?.posts_row ? rows.get(carrier.posts_row) : null, second = carrier?.interactions_row ? rows.get(carrier.interactions_row) : null;
  if (first && second) {
    out.push(first.key === second.key
      ? `Paling banyak ditulis dan paling besar interaksinya dari ${name(first.key)} (${shareText(first.post_share)} posting, ${shareText(second.interaction_share)} ${KNOWN}).`
      : `Paling banyak ditulis ${name(first.key)} (${shareText(first.post_share)} posting), tetapi interaksi terbesar dari ${name(second.key)} (${shareText(second.interaction_share)} ${KNOWN}).`);
  } else {
    if (first) out.push(`Paling banyak ditulis ${name(first.key)} (${shareText(first.post_share)} posting).`);
    else if (carrier?.posts_gap) out.push(gapSaid(carrier.posts_gap, 'posting'));
    if (second) out.push(`Interaksi terbesar dari ${name(second.key)} (${shareText(second.interaction_share)} ${KNOWN}).`);
    else if (carrier?.interactions_gap) out.push(gapSaid(carrier.interactions_gap, KNOWN));
  }
  const row = !sentimentFiltered && negative && rows.get(negative.row);
  if (row) {
    const among = negative.unknown ? ' di luar akun yang pengikutnya tidak diketahui' : '';
    const unknown = negative.unknown?.more_negative
      ? `; akun yang pengikutnya tidak diketahui lebih negatif (${rows.get('unknown')?.tone?.text?.negative ?? `${negative.unknown.share}%`} dari ${formatCount(negative.unknown.total)} posting)` : '';
    out.push(`Paling negatif${among}: ${name(row.key)}, ${row.tone.text.negative} dari ${formatCount(negative.total)} posting${unknown}.`);
  }
  if (where) out.push(`Akun X paling banyak dari ${where.name} (${formatCount(where.accounts)} akun); provinsi terbaca pada ${shareText(where.read_share)} akun X.`);
  return out;
}
