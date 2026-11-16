/** What the paged report is made of: which pages, in what order, and the figures and sentences printed on them.
 * Pure: no React, no DOM. The page components only lay out what this module returns.
 * A figure nobody observed is `null` and is never read as zero; a share is read over what has been analysed. */
import { pulseDay } from './pulseData.js';
import { sentimentCounts } from './pulsePostFilters.js';
import { engagementSummary } from './pulseEngagement.js';
import { inVoice, leading, neutralBreakdown, publicOpinion, shares } from './pulseVoice.js';
import { responseEvidence } from './pulseResponse.js';
import { buildConversationGroups, groupDayRange, leadingGroups } from './pulseConversationGroups.js';
import { accountSpread, spreadByDay, spreadTotals } from './pulsePlaces.js';
import { accountCount, toneShares } from './pulseMeasures.js';
import { trendSeries } from './pulseTrendSeries.js';
import { accountConcentration } from './pulseInsightMetrics.js';
import { coverage } from './pulseReadings.js';

/** Every section of the report, in the default order. A section is one page; `posts` may take two. */
export const reportSections = [
  { key: 'cover', title: 'Sampul' },
  { key: 'summary', title: 'Ringkasan eksekutif' },
  { key: 'insights', title: 'AI Insights' },
  { key: 'trend', title: 'Volume dan sentimen' },
  { key: 'voices', title: 'Suara warganet dan pemberitaan' },
  { key: 'opinion', title: 'Opini publik dari komentar' },
  { key: 'sources', title: 'Platform dan akun teratas' },
  { key: 'places', title: 'Sebaran tempat' },
  { key: 'posts', title: 'Posting teratas' },
  { key: 'narratives', title: 'Konten yang paling banyak diulang' },
  { key: 'method', title: 'Cakupan dan batasan' },
];
export const postsPerPage = 4;
export const maxTopPosts = 8;
/** The PULSE accent as "#rrggbb" (the light value of `--ps-accent`), for the colour field and its reset. */
export const defaultAccent = '#544380';
export const logoMaxBytes = 300 * 1024;
export const logoTypes = ['image/png', 'image/jpeg', 'image/webp'];
export const organisationMax = 80;
export const descriptionMax = 600;

const tones = ['positive', 'neutral', 'negative'];
const titles = Object.fromEntries(reportSections.map(section => [section.key, section.title]));
const defaultKeys = reportSections.map(section => section.key);
/** Sections that wait until they are chosen: a page of stored AI text is printed only when someone asks for it. */
const offByDefault = new Set(['insights']);
const count = value => (typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('id-ID') : '0');

/** The saved list as a complete one: known sections in the saved order (the first mention wins), sections the saved
 * list does not know yet placed after their neighbour in the default order and switched on (AI Insights off), unknown
 * keys dropped. Nothing saved means the default order with everything on but AI Insights. */
export function resolveSections(saved) {
  const result = [];
  for (const row of Array.isArray(saved) ? saved : []) {
    if (!row || !titles[row.key] || result.some(item => item.key === row.key)) continue;
    result.push({ key: row.key, on: row.on !== false });
  }
  if (!result.length) return defaultKeys.map(key => ({ key, on: !offByDefault.has(key) }));
  defaultKeys.forEach((key, index) => {
    if (result.some(item => item.key === key)) return;
    // The nearest earlier default section that is in the list; a new section goes right after it.
    let at = -1;
    for (let before = index - 1; before >= 0 && at < 0; before--) at = result.findIndex(item => item.key === defaultKeys[before]);
    result.splice(at + 1, 0, { key, on: !offByDefault.has(key) });
  });
  return result;
}
export const sectionTitle = key => titles[key] || key;
/** Move one section one place up (`step` -1) or down (+1). The same list comes back when it is already at the edge. */
export function moveSection(sections, key, step) {
  const from = sections.findIndex(item => item.key === key), to = from + step;
  if (from < 0 || to < 0 || to >= sections.length) return sections;
  const next = [...sections];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
export function switchSection(sections, key, on) {
  return sections.map(item => (item.key === key ? { ...item, on: Boolean(on) } : item));
}

/** Top posts in pages of four, eight posts at most. */
export function splitPosts(posts = [], perPage = postsPerPage, limit = maxTopPosts) {
  const shown = posts.slice(0, limit), pages = [];
  for (let start = 0; start < shown.length; start += perPage) pages.push(shown.slice(start, start + perPage));
  return pages;
}

/** The pages to print, numbered. A section that is switched off has none; `posts` continues on a second page when
 * there are more than four. A section without data still gets its page: the page says so in one sentence.
 * @returns {{id:string, key:string, title:string, number:number, total:number, part:number, parts:number, posts?:object[], rank?:number}[]} */
export function reportPages(sections, { topPosts = [] } = {}) {
  const pages = [];
  for (const { key, on } of resolveSections(sections)) {
    if (!on) continue;
    if (key !== 'posts') { pages.push({ id: key, key, title: titles[key], part: 1, parts: 1 }); continue; }
    const chunks = splitPosts(topPosts);
    if (!chunks.length) chunks.push([]);
    chunks.forEach((posts, index) => pages.push({
      id: `posts-${index + 1}`, key, title: index ? `${titles.posts} (lanjutan)` : titles.posts,
      part: index + 1, parts: chunks.length, posts, rank: index * postsPerPage + 1,
    }));
  }
  return pages.map((page, index) => ({ ...page, number: index + 1, total: pages.length }));
}
/** Where a section lands: "hlm. 3", "hlm. 7–8", or null when it is switched off. */
export function sectionPageLabel(pages, key) {
  const numbers = pages.filter(page => page.key === key).map(page => page.number);
  if (!numbers.length) return null;
  return numbers.length > 1 ? `hlm. ${numbers[0]}–${numbers.at(-1)}` : `hlm. ${numbers[0]}`;
}

/** The period as the report states it: the chosen range, or the range the stored posts cover when none was chosen. */
export function periodLabel(period = {}, days = []) {
  const { from, to } = period || {};
  if (from && to) return groupDayRange(from, to);
  if (from) return `Sejak ${pulseDay(from)}`;
  if (to) return `Sampai ${pulseDay(to)}`;
  const first = days[0]?.date, last = days.at(-1)?.date;
  return first ? groupDayRange(first, last) : 'Semua periode';
}

/** Posts per day, the series of the trend chart on Ikhtisar (`trendSeries`): an unbroken axis from the first day with
 * data, or the chosen period's first day, to the last, so a day without stored posts is an empty column, not a gap.
 * A range longer than `maxBars` days is drawn per week, Monday to Sunday (day_v1), the first and last week clipped to
 * the days covered. The rows are the very buckets the server is asked about for spikes (spike_v1); `date`, `end` and
 * `total` name their first day, last day and posts for the page.
 * @returns {{unit:'day'|'week', rows:object[], max:number, peak:object|null}} `peak` is the earliest of the largest. */
export function trendBuckets(posts = [], range = {}, maxBars = 92) {
  const days = trendSeries(posts, 'day', range || {});
  if (!days.length) return { unit: 'day', rows: [], max: 0, peak: null };
  const unit = days.length <= maxBars ? 'day' : 'week';
  const rows = (unit === 'day' ? days : trendSeries(posts, 'week', range || {})).map(row => ({ ...row, date: row.from, end: row.to, total: row.posts }));
  const peak = rows.reduce((best, row) => (row.total > best.total ? row : best), rows[0]);
  return { unit, rows, max: peak.total, peak: peak.total ? peak : null };
}
/** Round axis values from zero to at least `max`, about `target` steps. */
export function axisTicks(max, target = 4) {
  if (!(max > 0)) return [0, 1];
  const rough = max / target, power = 10 ** Math.floor(Math.log10(rough)), unit = rough / power;
  const step = Math.max(1, (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => index * step);
}

/** One voice or one platform: how many posts, how many analysed, and the split of the analysed ones in whole
 * percentages that add up to 100 (tone_share_v1). `shareText` is what to print ("<1%" for a sliver), null until
 * something is analysed. `lead` is null until something is analysed. */
function reading(posts) {
  const counts = sentimentCounts(posts), analysed = posts.length - counts.unknown;
  return { total: posts.length, analysed, unknown: counts.unknown, counts, shares: shares(counts, tones), shareText: toneShares(counts).text, lead: leading(counts), kinds: neutralBreakdown(posts) };
}

/** Everything the pages print, worked out once from a report made by `buildReport`. */
const placeRows = 6, placeAccountRows = 3;   // what fits one A4 sheet under the map
const placeNames = places => places.slice(0, 3).map(([name, times]) => `${name} ${count(times)}`).join(', ');
/** What the "Sebaran tempat" page prints: the provinces the posts name (src/lib/pulsePlaces.js) and, for X accounts,
 * the province their profile location names. `share` is of the posts that name a place; a post may name two
 * provinces, so the shares can add up to more than 100. `map` holds every named province, for the picture. */
function placeFigures(posts) {
  const spread = spreadByDay(posts), people = accountSpread(posts), named = spreadTotals(spread), homes = spreadTotals(people);
  return {
    total: posts.length, named: spread.named, provinces: named.length,
    rows: named.slice(0, placeRows).map(row => ({ code: row.code, name: row.name, count: row.count, share: spread.named ? Math.round(row.count / spread.named * 100) : 0, names: placeNames(row.places) })),
    map: named.map(row => ({ code: row.code, name: row.name, count: row.count })),
    accounts: { total: people.total, named: people.named, unasked: people.unasked, provinces: homes.length,
      rows: homes.slice(0, placeAccountRows).map(row => ({ code: row.code, name: row.name, count: row.count, names: placeNames(row.places) })) },
  };
}

export function reportData(report) {
  const posts = report?.posts || [], total = posts.length;
  const counts = sentimentCounts(posts), analysed = total - counts.unknown;
  const days = report?.days || [];
  const trend = trendBuckets(posts, report?.period);
  const peakDay = days.reduce((best, day) => (!best || day.total > best.total ? day : best), null);
  const engagement = engagementSummary(posts);
  const platformCounts = {};
  for (const post of posts) platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
  const platformKeys = Object.keys(platformCounts).sort((a, b) => platformCounts[b] - platformCounts[a] || a.localeCompare(b));
  const platformShare = shares(platformCounts, platformKeys);
  const platforms = platformKeys.map(platform => ({ platform, share: platformShare[platform], ...reading(posts.filter(post => post.platform === platform)) }));
  const evidence = responseEvidence(posts, report?.responseAnalysis?.response);
  const opinion = publicOpinion(evidence.comments);
  const stanceRead = opinion.stance.supports + opinion.stance.opposes + opinion.stance.unclear;
  const liked = evidence.comments.filter(comment => (comment.text || '').trim())
    .sort((a, b) => (Number.isFinite(b.likes) ? b.likes : -1) - (Number.isFinite(a.likes) ? a.likes : -1)).slice(0, 4);
  const built = buildConversationGroups(posts);
  return {
    total, analysed, unknown: counts.unknown, counts, shares: shares(counts, tones), shareText: toneShares(counts).text, lead: leading(counts),
    coverage: total ? Math.round(analysed / total * 100) : 0,
    accounts: accountCount(posts),   // account_v1
    interactions: engagement.interactions, interactionPosts: engagement.interactionPosts,
    days: days.length, undated: total - days.reduce((sum, day) => sum + day.total, 0), peakDay, trend,
    voices: { public: reading(inVoice(posts, 'public')), news: reading(inVoice(posts, 'news')) },
    platforms,
    places: placeFigures(posts),
    concentration: accountConcentration(posts),   // concentration_v1, as Ikhtisar and Akun & sumber read it
    completeness: coverage(posts),                 // coverage_v1, the reading behind the project bar's badge
    opinion: {
      ...opinion, target: evidence.target, loaded: Boolean(report?.responseAnalysis?.loaded) && !report?.responseAnalysis?.error,
      shares: shares(opinion.counts, tones), shareText: toneShares(opinion.counts).text, stanceRead, stanceShares: shares(opinion.stance, ['supports', 'opposes', 'unclear']),
      liked,
    },
    groups: {
      total: built.totals.groups,
      rows: leadingGroups(built.groups, 5).map(group => ({
        id: group.id, title: group.title, posts: group.size, accounts: group.accountCount, faces: group.accounts.slice(0, 5),
        range: groupDayRange(group.firstDay, group.lastDay), shares: group.shares, interactions: group.interactions, lead: group.sentiment.lead,
      })),
    },
  };
}

const toneWords = { positive: 'positif', neutral: 'netral', negative: 'negatif' };
const clip = (text, length) => (text.length > length ? text.slice(0, length - 1).trimEnd() + '…' : text);
/** Three or four plain sentences for the executive summary when no written summary is stored: volume and its peak
 * day, the leading tone among the public's posts, the largest source, the most repeated content.
 * `platformName` turns a platform key into the name people know. One sentence when there is nothing to report. */
export function fallbackSummary(data, { platformName = key => key } = {}) {
  if (!data?.total) return ['Belum ada posting pada periode dan platform yang dipilih.'];
  const sentences = [];
  const volume = `Terkumpul ${count(data.total)} posting dari ${count(data.accounts)} akun dan sumber di ${count(data.platforms.length)} platform`;
  const peak = data.peakDay;
  sentences.push(!peak ? `${volume}.` : data.days > 1
    ? `${volume}; hari paling ramai adalah ${pulseDay(peak.date)} dengan ${count(peak.total)} posting.`
    : `${volume}, semuanya terbit pada ${pulseDay(peak.date)}.`);
  const voice = data.voices.public;
  if (!voice.total) sentences.push('Seluruh posting berasal dari pemberitaan; belum ada posting warganet pada periode ini.');
  else if (!voice.lead) sentences.push(`Nada posting warganet belum dapat disimpulkan karena ${count(voice.total)} posting itu belum dianalisis.`);
  else {
    const rest = tones.filter(key => key !== voice.lead).sort((a, b) => voice.shares[b] - voice.shares[a]);
    sentences.push(`Dari ${count(voice.analysed)} posting warganet yang sudah dianalisis, nada ${toneWords[voice.lead]} paling banyak (${voice.shareText[voice.lead]}), disusul ${rest.map(key => `${toneWords[key]} ${voice.shareText[key]}`).join(' dan ')}.`);
  }
  const top = data.platforms[0];
  if (top) sentences.push(data.platforms.length > 1
    ? `Sumber terbesar adalah ${platformName(top.platform)} dengan ${count(top.total)} posting (${top.share}% dari seluruh posting).`
    : `Seluruh posting berasal dari ${platformName(top.platform)}.`);
  const group = data.groups.rows[0];
  if (group) sentences.push(`Konten yang paling banyak diulang muncul di ${count(group.posts)} posting dari ${count(group.accounts)} akun: “${clip(group.title, 90)}”.`);
  return sentences;
}

const withoutCodes = text => String(text ?? '').replace(/\s*\[[PANKIT]\d{1,2}\]/g, '').replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
/** The formats of the summary card on Ikhtisar the report can print, in the card's words. */
export const summaryFormats = [{ key: 'executive', label: 'Eksekutif' }, { key: 'brief', label: 'Ringkas' }, { key: 'timeline', label: 'Kronologi' }];
const summaryChoices = new Set(['off', ...summaryFormats.map(format => format.key)]);
/** The written summary to print, from the stored ones. `choice` is the report's setting: null for the first stored of
 * `executive` and `brief` (written for a reader in a hurry), one format for that format only, 'off' for none. Evidence
 * codes such as [P1] point at a source list the report does not carry, so they are taken out. Null when none is stored.
 * @returns {{format:string, createdAt:string|null, scope:object, sections:{title:string, kind:string, paragraphs:string[], bullets:string[]}[]}|null} */
export function storedSummary(payload, choice = null) {
  if (choice === 'off') return null;
  for (const format of choice ? [choice] : ['executive', 'brief']) {
    const summary = payload?.summaries?.[format];
    if (!Array.isArray(summary?.sections)) continue;
    const sections = summary.sections.map(section => ({
      title: withoutCodes(section?.title), kind: section?.kind || 'text',
      paragraphs: (section?.paragraphs || []).map(withoutCodes).filter(Boolean),
      bullets: (section?.bullets || []).map(withoutCodes).filter(Boolean),
    })).filter(section => section.paragraphs.length || section.bullets.length);
    if (sections.length) return { format, createdAt: summary.created_at || null, scope: summary.scope || {}, sections };
  }
  return null;
}

const sameValue = (a, b) => (a || null) === (b || null);
const platformList = value => (Array.isArray(value) && value.length ? [...value].sort().join(',') : null);
/** Whether a stored text was written for the report's period and platforms. Null when the scope does not say. */
function sameScope(scope, report) {
  if (!scope || !('from' in scope || 'to' in scope || 'platforms' in scope)) return null;
  return sameValue(scope.from, report?.period?.from) && sameValue(scope.to, report?.period?.to) && platformList(scope.platforms) === platformList(report?.selectedPlatforms);
}

/** One sentence when a written text covers something else than the report it is printed in: another period, another
 * choice of platforms, or simply fewer or more posts. Empty when they agree or when it cannot be told. `noun` names the
 * text ("Ringkasan itu", "AI Insights itu"). */
export function summaryScopeNote(scope, report, total, noun = 'Ringkasan itu') {
  if (sameScope(scope, report) === false) {
    const selection = platformList(scope.platforms) !== platformList(report?.selectedPlatforms);
    const written = scope.from || scope.to ? `periode ${periodLabel({ from: scope.from, to: scope.to })}` : 'semua periode';
    return `${noun} ditulis untuk ${written}${selection ? ' dengan pilihan platform yang berbeda' : ''}, bukan untuk cakupan laporan ini.`;
  }
  if (Number.isFinite(scope?.posts) && scope.posts !== total) return `Laporan ini memuat ${count(total)} posting, jadi angka di halaman lain dapat berbeda dari ${noun === 'Ringkasan itu' ? 'ringkasan' : 'insight'}.`;
  return '';
}

/**
 * What the "Isi AI" group of the builder says about the two written texts the report can carry. Reading never writes:
 * `canWrite` only offers a button, for a summary format that is not stored yet, or for AI Insights that are missing or
 * were written for another period or other platforms than the report's.
 * @param {object|null} payload the stored summaries of the project (GET …/summary), null while they load, `{failed: true}`
 *   when they could not be read
 * @param {{choice?: string|null, report: object, archived?: boolean}} options `choice` is the report's `ai.summary`
 */
export function aiStatus(payload, { choice = null, report, archived = false } = {}) {
  const loaded = Boolean(payload), failed = Boolean(payload?.failed), available = loaded && !failed ? payload.available !== false : null;
  const summary = storedSummary(payload, choice);
  const format = choice === 'off' ? null : choice || summary?.format || 'executive';
  const insights = Array.isArray(payload?.summaries?.insights?.sections) && payload.summaries.insights.sections.length ? payload.summaries.insights : null;
  const differs = insights ? sameScope(insights.scope, report) === false : false;
  const open = loaded && available && !archived;
  return {
    loaded, failed, available, archived,
    summary: { choice, format, stored: summary ? { createdAt: summary.createdAt, scope: summary.scope } : null, canWrite: Boolean(open && format && !summary) },
    insights: { stored: insights ? { createdAt: insights.created_at || null, scope: insights.scope || {} } : null, differs, canWrite: Boolean(open && (!insights || differs)) },
  };
}

const logoPattern =/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const text = (value, limit) => (typeof value === 'string' ? value.slice(0, limit) : '');
/** Saved report settings as the page uses them: the sections, the brand and which written summary is printed. Anything missing or not acceptable falls back to the default,
 * so a failed or empty answer from the server is simply "nothing saved yet". */
export function reportSettings(saved) {
  const brand = saved?.brand || {};
  return {
    ai: { summary: summaryChoices.has(saved?.ai?.summary) ? saved.ai.summary : null },
    sections: resolveSections(saved?.sections),
    brand: {
      logo: typeof brand.logo === 'string' && brand.logo.length <= 420000 && logoPattern.test(brand.logo) ? brand.logo : null,
      accent: typeof brand.accent === 'string' && /^#[0-9a-f]{6}$/i.test(brand.accent) && brand.accent.toLowerCase() !== defaultAccent ? brand.accent.toLowerCase() : null,
      organisation: text(brand.organisation, organisationMax),
      description: text(brand.description, descriptionMax),
    },
  };
}
/** The body of the save request. Text is trimmed here, not while it is typed. */
export function settingsPayload({ sections, brand, ai }) {
  return {
    ai: { summary: summaryChoices.has(ai?.summary) ? ai.summary : null },
    sections: sections.map(({ key, on }) => ({ key, on: Boolean(on) })),
    brand: { logo: brand.logo || null, accent: brand.accent || null, organisation: (brand.organisation || '').trim(), description: (brand.description || '').trim() },
  };
}
/** Why a chosen logo file cannot be used, in a sentence; an empty string when it can. */
export function logoProblem(file) {
  if (!file) return 'Berkas logo tidak terbaca.';
  if (!logoTypes.includes(file.type)) return 'Logo harus berupa gambar PNG, JPEG, atau WebP.';
  if (file.size > logoMaxBytes) return `Logo paling besar 300 KB; berkas ini ${count(Math.ceil(file.size / 1024))} KB.`;
  return '';
}

/** How many account rows fit under the platform table on the "Platform dan akun teratas" page. The sheet has a fixed
 * height: ten rows fit beside up to five platforms, every further platform row takes the room of one account row, and
 * the concentration lines under the table (concentration_v1) take the room of two. At least three accounts are listed.
 * @param {number} platformCount @param {{concentration?: boolean}} options */
export function accountRowsThatFit(platformCount, { concentration = false } = {}) {
  return Math.max(concentration ? 3 : 5, Math.max(5, 10 - Math.max(0, (Number(platformCount) || 0) - 5)) - (concentration ? 2 : 0));
}
