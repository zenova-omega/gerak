// Spikes on the trend chart: what the posts of a bucket that stands out show about it.
// Which buckets are spikes is not decided here. That is the product's one rule (spike_v1), counted on the server in
// server/app/services/pulse_spikes.py. The chart asks for it (POST /api/admin/pulse/spikes, see pulseSpikeAnswers.js),
// and the same rule raises the `volume_spike` alert and names the spike days in the AI summary's facts, so the
// browser holds no copy of it. Everything here describes a spike the server found, counted from the posts already on
// screen, and nothing is said about causes: a line names what the number is made of (which platform, which accounts,
// which posts), so a reader can open the day and judge for themselves. Pure: no clock, no network.
import { bucketPosts } from './pulseTrendSeries.js';
import { postInteractions } from './pulseEngagement.js';
import { hasClock, readTime, zone } from './pulseMeasures.js';
import { sourceText } from './pulseOverview.js';

const QUOTE = 80;                                   // characters of a post's text quoted in a hint
const HANDLES = new Set(['x', 'instagram', 'tiktok', 'threads', 'reddit']);   // platforms whose author is a username

/**
 * What the posts inside one bucket show: how many, from which platforms, by which accounts, and which posts carry
 * the most interactions. A post whose source reported no figures counts as a post and adds no interactions.
 * @returns {{posts: number, interactions: number, platforms: {platform: string, count: number, share: number}[],
 *   accounts: {author: string, platform: string, count: number}[],
 *   top: {id: string, author: string, platform: string, text: string, interactions: number, share: number}[], topShare: number}}
 *   `top` holds up to three posts; `share` and `topShare` are parts of the bucket's interactions (0 when it has none).
 */
export function spikeFacts(posts = [], row) {
  const inside = row ? bucketPosts(posts, row) : [];
  const platforms = new Map(), accounts = new Map(), ranked = [];
  let interactions = 0;
  for (const post of inside) {
    const platform = post.platform || '';
    platforms.set(platform, (platforms.get(platform) || 0) + 1);
    const author = typeof post.author === 'string' ? post.author.trim() : '';
    if (author) {
      // One account whatever the capitals; the first spelling seen is the one shown.
      const id = platform + ':' + author.replace(/^@/, '').toLowerCase();
      const entry = accounts.get(id) || { author: author.replace(/^@/, ''), platform, count: 0 };
      entry.count++;
      accounts.set(id, entry);
    }
    const own = postInteractions(post.metrics);
    if (Number.isFinite(own) && own > 0) {
      interactions += own;
      ranked.push({ id: post.id, author: author.replace(/^@/, ''), platform, text: typeof post.text === 'string' ? post.text : '', interactions: own });
    }
  }
  const top = ranked.sort((a, b) => b.interactions - a.interactions).slice(0, 3).map(item => ({ ...item, share: interactions ? item.interactions / interactions : 0 }));
  return {
    posts: inside.length, interactions,
    platforms: [...platforms].map(([platform, count]) => ({ platform, count, share: count / inside.length })).sort((a, b) => b.count - a.count),
    accounts: [...accounts.values()].sort((a, b) => b.count - a.count),
    top, topShare: interactions ? top.reduce((sum, item) => sum + item.interactions, 0) / interactions : 0,
  };
}

/**
 * The parts a spike is drawn from, for one proportion bar; the shares add up to 1.
 * For posts: the three platforms with the most posts, and the others together. For interactions: the post with the
 * most, the next two together, and every other post. Empty when there is nothing to divide.
 * @returns {{id: string, share: number, count?: number, posts?: number}[]} `id` is a platform, or 'top', 'next', 'rest'
 */
export function spikeSegments(facts, key = 'posts') {
  if (!facts?.posts) return [];
  if (key === 'interactions') {
    const [first, ...others] = facts.top;
    if (!first) return [];
    const parts = [{ id: 'top', share: first.share }];
    if (others.length) parts.push({ id: 'next', share: facts.topShare - first.share, posts: others.length });
    if (1 - facts.topShare > 0.005) parts.push({ id: 'rest', share: 1 - facts.topShare });
    return parts;
  }
  const named = facts.platforms.slice(0, 3).map(row => ({ id: row.platform, share: row.share, count: row.count }));
  const rest = facts.platforms.slice(3).reduce((sum, row) => sum + row.count, 0);
  return rest ? [...named, { id: 'rest', share: rest / facts.posts, count: rest }] : named;
}

const whole = new Intl.NumberFormat('id-ID'), tenth = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const percent = share => Math.round(share * 100) + '%';
const UNIT_WORD = { day: 'hari', week: 'minggu', month: 'bulan' };

function quote(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  if (flat.length <= QUOTE) return `“${flat}”`;
  const cut = flat.slice(0, QUOTE + 1), end = cut.lastIndexOf(' ');
  return `“${(end > 20 ? cut.slice(0, end) : flat.slice(0, QUOTE)).replace(/[.,;:!?…-]+$/, '')}…”`;
}

/** An account as it is written: with '@' where the platform's author is a username, as it is for a channel or a publisher. */
export function spikeAuthor(item) {
  return (HANDLES.has(item?.platform) && item.author && !/\s/.test(item.author) ? '@' : '') + (item?.author || 'akun tanpa nama');
}

/**
 * The facts of a spike as short Indonesian sentences (the chart's table shows them), most telling first. Says what the number is made of and
 * never why: no "karena", no "dipicu". An empty bucket gives no lines.
 * @param {ReturnType<typeof spikeFacts>} facts
 * @param {{value: number, usual: number, times: number|null}} spike as the server answered it; `times` is null when the usual bucket is empty
 * @param {'posts'|'interactions'} key
 * @param {{unit?: 'day'|'week'|'month', platformName?: (platform: string) => string}} options
 */
export function spikeLines(facts, spike, key = 'posts', { unit = 'day', platformName = name => name } = {}) {
  if (!facts?.posts) return [];
  const word = UNIT_WORD[unit] || UNIT_WORD.day, noun = key === 'interactions' ? 'interaksi' : 'posting';
  const who = spikeAuthor;
  const where = item => `${who(item)} di ${platformName(item.platform)}`;
  const lines = [spike.times
    ? `${whole.format(spike.value)} ${noun}, ${tenth.format(spike.times)}× ${word} biasa pada rentang ini.`
    : `${whole.format(spike.value)} ${noun}, sementara ${word} lain pada rentang ini umumnya kosong.`];
  const [first] = facts.top;
  if (key === 'interactions') {
    if (first) {
      const said = quote(first.text);
      lines.push(`${first.share >= 0.995 ? 'Seluruhnya' : percent(first.share)} dari satu posting: ${where(first)}${said ? ', ' + said : '.'}`);
    }
    if (facts.top.length >= 3 && facts.topShare - first.share > 0.005) lines.push(`Tiga posting teratas menyumbang ${percent(facts.topShare)}.`);
    return lines;
  }
  const [lead] = facts.platforms;
  if (lead) lines.push(`Terbanyak dari ${platformName(lead.platform)}: ${whole.format(lead.count)} posting (${percent(lead.share)}).`);
  const busy = facts.accounts.filter(account => account.count >= 2).slice(0, 2);
  if (busy.length) lines.push(`Paling banyak memposting: ${busy.map(account => `${who(account)} (${whole.format(account.count)})`).join(', ')}.`);
  if (first) lines.push(`Posting paling ramai: ${where(first)}, ${whole.format(first.interactions)} interaksi.`);
  return lines;
}

// ── How a spike began ───────────────────────────────────────────────────────────────────────────────────────────────
// The wall clock of the installation's zone (day_v1 in the calculation dictionary), never a fixed seven hours.
const local = time => new Date(time + zone().offset_minutes * 60000);
const ONSET_HOURS = 6;        // the window that is read: long enough to hold the rise, short enough to say who was first
const RISING = 0.15;          // an hour belongs to the rise when it reaches this part of the peak hour
const ENOUGH_TIMED = 10;      // posts of the day that carry a clock; with fewer an hourly reading says nothing
const A_GROUP = 3;            // posts of one conversation group inside the window before it is named
const two = value => String(value).padStart(2, '0');
const clock = time => `${two(local(time).getUTCHours())}.${two(local(time).getUTCMinutes())}`;

/**
 * How the spike of one day began, read in six hours and as one picture: when the posts started to rise, on which
 * platform they moved first, and which conversation group (`issue_id`) came first.
 *
 * The rise is the unbroken run of hours up to the day's peak hour in which every hour reaches 15% of the peak. The
 * window opens one hour before that run, so whoever moved first is inside it, and lasts six hours. Only posts whose
 * source gave a clock time take part: a post that carries a date alone (most Instagram and TikTok posts) cannot be
 * put in an hour, and is counted in `dateOnly` instead. Hours are those of the installation's zone, which the answer
 * names in `zone`.
 * @returns {null | {startHour: number, endHour: number, peakHour: number, hours: {hour: number, count: number}[],
 *   posts: number, timed: number, dateOnly: number, early: {platform: string, count: number, of: number} | null,
 *   platforms: {id: string, count: number, share: number}[],
 *   starter: object | null, largest: object | null, first: {time: string, author: string, platform: string}[]}}
 *   null when the bucket is not a single day or fewer than ten of its posts carry a clock. `starter` is the group of
 *   three posts or more whose first post is the earliest; `largest` the group with the most posts, when it is another.
 */
export function spikeOnset(posts = [], row) {
  if (!row || row.from !== row.to) return null;
  const inside = bucketPosts(posts, row), timed = [];
  for (const post of inside) {
    if (!hasClock(post.published_at)) continue;
    const time = readTime(post.published_at);
    if (time !== null) timed.push({ post, time, hour: local(time).getUTCHours() });
  }
  if (timed.length < ENOUGH_TIMED) return null;
  const perHour = Array(24).fill(0);
  for (const item of timed) perHour[item.hour]++;
  const peakHour = perHour.indexOf(Math.max(...perHour));
  let rise = peakHour;
  while (rise > 0 && perHour[rise - 1] >= perHour[peakHour] * RISING) rise--;
  const startHour = Math.max(0, Math.min(rise - 1, 24 - ONSET_HOURS)), endHour = startHour + ONSET_HOURS;
  const windowed = timed.filter(item => item.hour >= startHour && item.hour < endHour).sort((a, b) => a.time - b.time);
  const count = (items, key) => { const tally = new Map(); for (const item of items) tally.set(key(item), (tally.get(key(item)) || 0) + 1); return [...tally].sort((a, b) => b[1] - a[1]); };
  const opening = windowed.filter(item => item.hour < startHour + 2), [lead] = count(opening, item => item.post.platform || '');
  const groups = new Map();
  for (const item of windowed) {
    const id = item.post.issue_id;
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(item);                    // already in time order
  }
  const named = [...groups].filter(([, items]) => items.length >= A_GROUP).map(([id, items]) => ({
    id, count: items.length, time: clock(items[0].time), at: items[0].time,
    author: (items[0].post.author || '').replace(/^@/, ''), platform: items[0].post.platform || '',
    title: items.map(item => sourceText(item.post)).find(Boolean) || '',
    platforms: count(items, item => item.post.platform || '').map(([platform]) => platform),
  }));
  const starter = [...named].sort((a, b) => a.at - b.at)[0] || null;
  const biggest = [...named].sort((a, b) => b.count - a.count || a.at - b.at)[0] || null;
  return {
    zone: zone().name, startHour, endHour, peakHour, hours: Array.from({ length: ONSET_HOURS }, (_, index) => ({ hour: startHour + index, count: perHour[startHour + index] })),
    posts: windowed.length, timed: timed.length, dateOnly: inside.length - timed.length,
    early: lead ? { platform: lead[0], count: lead[1], of: opening.length } : null,
    platforms: count(windowed, item => item.post.platform || '').map(([id, total]) => ({ id, count: total, share: total / windowed.length })),
    starter, largest: biggest && biggest.id !== starter?.id ? biggest : null,
    first: windowed.slice(0, 3).map(item => ({ time: clock(item.time), author: (item.post.author || '').replace(/^@/, ''), platform: item.post.platform || '' })),
  };
}

/** The six hours as one combined reading, in order of time: when, where first, which group first. Sentences for the
 * chart's table; the tooltip draws the same facts. Says who was earlier, never what caused what. */
export function onsetLines(onset, { platformName = name => name } = {}) {
  if (!onset) return [];
  const hour = value => `${two(value)}.00`;
  const lines = [`Awal lonjakan, ${hour(onset.startHour)} sampai ${hour(onset.endHour)} ${onset.zone || zone().name}: ${whole.format(onset.posts)} dari ${whole.format(onset.timed)} posting berjam hari itu, tertinggi pukul ${hour(onset.peakHour)}.`];
  const [most] = onset.platforms;
  if (onset.early && most) lines.push(`Lebih dulu ramai di ${platformName(onset.early.platform)} (${whole.format(onset.early.count)} dari ${whole.format(onset.early.of)} posting pada dua jam pertama); selama enam jam terbanyak dari ${platformName(most.id)} (${percent(most.share)}).`);
  const said = group => quote(group.title) || 'tanpa teks';
  if (onset.starter) lines.push(`Kelompok percakapan paling awal: ${said(onset.starter)}, pertama pukul ${onset.starter.time} oleh ${spikeAuthor(onset.starter)} di ${platformName(onset.starter.platform)}, ${whole.format(onset.starter.count)} posting dalam enam jam.`);
  if (onset.largest) lines.push(`Kelompok terbesar pada enam jam itu: ${said(onset.largest)}, ${whole.format(onset.largest.count)} posting, pertama pukul ${onset.largest.time}.`);
  if (onset.dateOnly > 0) lines.push(`${whole.format(onset.dateOnly)} posting hanya bertanggal tanpa jam, jadi tidak ikut dibaca per jam.`);
  return lines;
}

