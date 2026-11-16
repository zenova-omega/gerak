// Beranda's issue radar, as pure functions: which issues are listed, how a province is shaded, and how a figure,
// a movement or the time of the last refresh is said. Nothing here fetches or reads the clock by itself; the page
// reads one stored refresh and every filter is answered from it, so looking never starts a collection.
import { formatCount } from './pulseData.js';
import { toneShares } from './pulseMeasures.js';
import { placesIn, provinceNames } from './pulsePlaces.js';
import { placePoint } from './pulseRegionMap.js';

/** Categories in the order of the switch. The first entry is "no filter". */
export const radarCategories = [['', 'Semua'], ['politik', 'Politik'], ['hukum', 'Hukum'], ['ekonomi', 'Ekonomi'], ['bencana', 'Bencana'], ['sosial', 'Sosial'],
  ['teknologi', 'Teknologi'], ['olahraga', 'Olahraga'], ['hiburan', 'Hiburan'], ['dunia', 'Dunia'], ['lainnya', 'Lainnya']];
/** Platforms the radar can say something about. Location only ever comes from searches and named places. */
export const radarPlatforms = [['', 'Semua platform'], ['news', 'Berita'], ['x', 'X'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['search', 'Google']];
/** Platforms whose figure is a sample: what a small search found, never how much there is. They never order a list. */
export const SAMPLED = ['tiktok', 'instagram'];
/** Platforms whose evidence is example posts, not a list that was read whole. */
export const SOCIAL = ['x', 'tiktok', 'instagram'];
export const LIST_LENGTH = 10;
export const categoryLabel = id => radarCategories.find(([key]) => key === id)?.[1] || 'Lainnya';
export const provinceName = code => provinceNames[code] || code;

/** The one number an issue is ordered by on a platform, or null when it has none there: it is not on it, it was found
 * on X but not counted, or the platform is only sampled. */
export function platformFigure(issue, platform) {
  const figures = issue?.platforms?.[platform];
  if (!figures) return null;
  const value = platform === 'news' || platform === 'x' ? figures.count : platform === 'youtube' ? figures.views : platform === 'search' ? figures.searches : null;
  return Number.isFinite(value) ? value : null;
}
// A picture is shown only as a link from the two places the lists themselves use (the server keeps the same rule).
const PICTURE = /^https:\/\/(?:encrypted-tbn\d\.gstatic\.com\/images\?q=tbn:[A-Za-z0-9_-]{10,200}(?:&[a-z]{1,10}(?:=[A-Za-z0-9_-]{0,40})?){0,4}|i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/(?:mq|hq|sd)?default\.jpg)$/;
/** An issue's picture as the page may show it, `{ url, source, kind }`, or null. */
export function issueImage(issue) {
  const image = issue?.image;
  if (!image || typeof image.url !== 'string' || !PICTURE.test(image.url)) return null;
  let source = typeof image.source === 'string' && image.source ? image.source : null;
  // The search list sometimes names a picture's source by its address: it is shown as the site's name.
  if (source && /^https?:\/\//i.test(source)) { try { source = new URL(source).hostname.replace(/^www\./, '') || source; } catch { /* keep the text */ } }
  return { url: image.url, source, kind: image.kind === 'video' ? 'video' : 'photo' };
}
/** The platform choices worth offering: those with an issue in this refresh, and the one already chosen (so it can be dropped). */
export function offeredPlatforms(issues, chosen = '') {
  const rows = Array.isArray(issues) ? issues : [];
  return radarPlatforms.filter(([id]) => !id || id === chosen || rows.some(issue => issue.platforms?.[id]));
}
const loudIn = (issue, province) => (issue.regions || []).some(region => region.code === province);

/** Every issue in scope, before category and platform: the country's issues, or the ones loud in one province
 * (national ones in their order, then those loud only there). */
function scoped(issues, province) {
  const rows = Array.isArray(issues) ? issues : [];
  const national = rows.filter(issue => issue.scope !== 'local'), local = rows.filter(issue => issue.scope === 'local');
  return province ? [...national.filter(issue => loudIn(issue, province)), ...local.filter(issue => loudIn(issue, province))] : national;
}

/** Every issue the choices keep, before the list is cut to ten. A platform keeps the issues that are on it, loudest there first. */
export function matchingIssues(issues, { category = '', platform = '', province = '' } = {}) {
  let rows = scoped(issues, province).filter(issue => !category || issue.category === category);
  // Loudest on that platform first; an issue with no figure there (sampled, or found but not counted) keeps the combined order, after the counted ones.
  if (platform) rows = rows.filter(issue => issue.platforms?.[platform]).sort((a, b) => (platformFigure(b, platform) ?? -1) - (platformFigure(a, platform) ?? -1) || a.rank - b.rank);
  return rows;
}

/** The rows on screen: at most ten. */
export function visibleIssues(issues, choices = {}) {
  return matchingIssues(issues, choices).slice(0, LIST_LENGTH);
}

/** How many issues each category holds in the scope on screen; '' is all of them. Categories with none are left out. */
export function categoryCounts(issues, province = '') {
  const rows = scoped(issues, province), counts = { '': rows.length };
  for (const issue of rows) counts[issue.category] = (counts[issue.category] || 0) + 1;
  return counts;
}

/** For each province, how many of the given issues are loud there. */
export function provinceCounts(issues) {
  const counts = {};
  for (const issue of issues || []) for (const region of issue.regions || []) counts[region.code] = (counts[region.code] || 0) + 1;
  return counts;
}
/** The map's shade for a count, 0 to 3. Up to three issues a step each. Beyond that the three steps are spread over
 * the busiest province (`most`): with several issues searched nearly everywhere, a fixed "three or more" turned the
 * whole map one colour. */
export function shadeOf(count, most) {
  const n = Math.floor(Number(count) || 0), top = Math.floor(Number(most) || 0);
  if (n <= 0 || top <= 0) return 0;
  return top <= 3 ? Math.min(3, n) : Math.max(1, Math.min(3, Math.ceil(n * 3 / top)));
}
/** The counts each shade covers, for the legend: [[1, '1–2'], [2, '3–4'], [3, '5–7']]. */
export function shadeRanges(most) {
  const top = Math.floor(Number(most) || 0), ranges = [];
  for (let step = 1; step <= 3; step++) {
    const counts = Array.from({ length: top }, (_, index) => index + 1).filter(count => shadeOf(count, top) === step);
    if (counts.length) ranges.push([step, counts.length > 1 ? `${counts[0]}–${counts.at(-1)}` : String(counts[0])]);
  }
  return ranges;
}

/** The table behind the map: every province, how many listed issues are loud there, and the first of them.
 * `provincesRead` is the list of provinces whose list was read in this refresh; null means none is known missing. */
export function provinceRows(issues, provincesRead) {
  const counts = provinceCounts(issues), read = Array.isArray(provincesRead) ? new Set(provincesRead) : null;
  return Object.keys(provinceNames).map(code => ({
    code, name: provinceNames[code], count: counts[code] || 0,
    top: (issues || []).find(issue => loudIn(issue, code))?.title || null, read: read ? read.has(code) : true,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));
}

/** Where one issue is: the provinces it is searched in, and a pin for each place its title or coverage names.
 * `point` is the place's spot on the map when the map knows it; otherwise the pin belongs on the province. */
export function issueFootprint(issue) {
  const regions = (issue?.regions || []).map(region => ({ code: region.code, name: provinceName(region.code), searches: region.searches }));
  const pins = [], seen = new Set();
  for (const text of [issue?.title, ...(issue?.evidence_titles || [])]) for (const found of placesIn(text || '')) for (const place of found.places) {
    if (seen.has(place)) continue;
    seen.add(place);
    pins.push({ place, code: found.code, point: placePoint(place) });
  }
  return { regions, pins };
}

const foundText = figures => `${formatCount(figures?.found || 0)}${figures?.capped ? '+' : ''}`;
const figureText = {
  news: issue => `Berita ${formatCount(issue.platforms.news.count)} artikel`,
  // The count on X is of posts since yesterday (the finest window it has) that were observed: a lower bound, written with a plus like the
  // searches. Without a count, only the posts that found the issue are known.
  x: issue => Number.isFinite(issue.platforms.x.count) ? `X ${formatCount(issue.platforms.x.count)}+ posting sejak kemarin` : `X ${formatCount(issue.platforms.x.posts || 0)} posting contoh`,
  tiktok: issue => `TikTok ${foundText(issue.platforms.tiktok)} posting ditemukan`,
  instagram: issue => `Instagram ${foundText(issue.platforms.instagram)} posting ditemukan`,
  // One figure for videos everywhere: the views of the issue's trending videos, which is what orders them. How many videos that is comes second.
  youtube: issue => `YouTube ${formatCount(issue.platforms.youtube.views)} tayangan (${formatCount(issue.platforms.youtube.count)} video tren)`,
  search: issue => `Google ${formatCount(issue.platforms.search.searches)}+ pencarian`,
};
/** A row's figures, each with its unit, the chosen platform first, then how widely it is searched. */
export function figureLine(issue, lead = '') {
  const order = ['news', 'x', 'tiktok', 'instagram', 'youtube', 'search'].sort((a, b) => (b === lead) - (a === lead));
  const parts = order.filter(platform => issue.platforms?.[platform]).map(platform => figureText[platform](issue));
  const provinces = (issue.regions || []).length;
  return provinces ? [...parts, `ramai di ${provinces} provinsi`] : parts;
}

export function movementText(movement) {
  if (!movement) return null;
  return movement.kind === 'new' ? 'Baru' : `${movement.kind === 'up' ? 'Naik' : 'Turun'} ${movement.places}`;
}

const asDate = value => typeof value === 'string' && value ? new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z') : null;
const wibDay = date => date.toLocaleDateString('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' });
const sourceNames = { news: 'Berita', youtube: 'YouTube', search: 'daftar pencarian nasional' };
const partNames = { x: 'X', tiktok: 'TikTok', instagram: 'Instagram' };      // asked issue by issue: some of it may be there
/** The time of the refresh on screen, in WIB: the clock alone today, with its date on another day. */
export function updatedText(payload, now = new Date()) {
  return clockText(payload?.updated_at, now);
}
/** A stored time in WIB: the clock alone when it is today, with its date on another day. Empty when it cannot be read. */
function clockText(value, now) {
  const date = asDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  return (wibDay(date) === wibDay(now) ? time : `${wibDay(date)}, ${time}`) + ' WIB';
}
/** When the list is made by itself, in words: "setiap hari pukul 08.00 WIB". Empty when the payload does not say. */
export function scheduleText(payload) {
  const at = payload?.daily_at;
  return typeof at === 'string' && /^\d\d:\d\d$/.test(at) ? `setiap hari pukul ${at.replace(':', '.')} WIB` : '';
}
/** When the list on screen was made, how often it is made, and what could not be read that time. */
export function freshnessText(payload, now = new Date()) {
  const when = updatedText(payload, now);
  if (!when) return '';
  const schedule = scheduleText(payload);
  let text = `Diperbarui ${when}` + (payload.enabled === false ? '; pembaruan otomatis mati' : schedule ? `, otomatis ${schedule}` : '');
  const missing = payload.missing || [], provinces = missing.filter(name => name.startsWith('ID-'));
  if (provinces.length === 1) text += `; ${provinceName(provinces[0])} tidak terbaca`;
  if (provinces.length > 1) text += `; ${provinces.length} provinsi tidak terbaca`;
  for (const name of missing) if (sourceNames[name]) text += `; ${sourceNames[name]} tidak terbaca`;
  for (const name of missing) if (partNames[name]) text += `; ${partNames[name]} belum lengkap`;
  // X is searched once a day (or when the refresh button is pressed), so the issues it found can be older than the list.
  const searched = clockText(payload.x_searched_at, now);
  if (searched) text += `; isu dari X dicari ${searched}`;
  return text;
}

const search = entries => new URLSearchParams(entries.filter(([, value]) => value)).toString();
/** Pencarian cepat with the proposed keywords filled in. Nothing is collected until the person searches there. */
export function searchHref(issue) {
  const query = issue?.query || {};
  return '/pulse/search?' + search([['q', query.q || issue?.title || ''], ['required', query.required], ['excluded', query.excluded]]);
}
export const projectHref = project => '/pulse/overview?' + search([['topic', project.id]]);

// ── Infographics: the figures strip, the rankings beside the map and the list, the meters in a row ─────────────────

const platformLabel = id => radarPlatforms.find(([key]) => key === id)?.[1] || id;
/** The number a platform's meter and its printed figure share. It is the figure the platform is ordered by, here and on
 * the server: articles, views of trending videos, searches, counted posts. Null where there is none to draw. */
const meterValue = platformFigure;
const METERS = ['news', 'youtube', 'search', 'x', 'tiktok', 'instagram'];       // the lists that are read whole, then the social platforms
const meterText = {
  x: value => `${formatCount(value)}+ posting`,
  news: value => `${formatCount(value)} artikel`,
  youtube: value => `${formatCount(value)} tayangan`,
  search: value => `${formatCount(value)}+ pencarian`,
};

/** What the figures strip says about the refresh on screen. A part the refresh did not report is null, never zero. */
export function radarFigures(payload) {
  const rows = Array.isArray(payload?.issues) ? payload.issues : [];
  const national = rows.filter(issue => issue.scope !== 'local'), listed = national.slice(0, LIST_LENGTH);
  const counted = ['news', 'search', 'youtube', 'x'].filter(platform => Number.isFinite(payload?.signals?.[platform]));
  const signals = counted.length ? { total: counted.reduce((sum, platform) => sum + payload.signals[platform], 0), ...Object.fromEntries(counted.map(platform => [platform, payload.signals[platform]])) } : null;
  const all = Object.keys(provinceNames).length, read = Array.isArray(payload?.provinces_read) ? payload.provinces_read.length : null;
  const covered = listed.filter(issue => issue.project).length;
  return {
    issues: { total: rows.length, national: national.length, local: rows.length - national.length },
    signals,
    provinces: read === null ? null : { read, of: all, share: read / all * 100 },
    covered: { count: covered, of: listed.length, share: listed.length ? covered / listed.length * 100 : null },
  };
}

/** Provinces by how many of the given issues are loud there, busiest first; provinces with none are left out. */
export function provinceRanking(issues, limit = 34) {
  return provinceRows(issues, null).filter(row => row.count > 0).slice(0, limit).map(({ code, name, count, top }) => ({ code, name, count, top }));
}

/** Categories of the scope on screen with their issue counts, largest first. */
export function categoryRows(issues, province = '') {
  const counts = categoryCounts(issues, province);
  return radarCategories.filter(([id]) => id && counts[id]).map(([id, label]) => ({ id, label, count: counts[id] })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'));
}

/** On how many of the given issues each platform has something to say, most first. */
export function platformCoverage(issues) {
  return ['news', 'x', 'tiktok', 'instagram', 'youtube', 'search'].map(id => ({ id, label: platformLabel(id), count: (issues || []).filter(issue => issue.platforms?.[id]).length }))
    .filter(row => row.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'));
}

/** One meter per platform an issue is on: its figure in words, and its length against the loudest of `listed` on that
 * platform. `ratio` is null where there is nothing to draw a length from: a sample (TikTok, Instagram) says what was
 * found, and an issue found on X but not counted says how many posts found it. `hint` says what a social figure is. */
export function platformMeters(issue, listed) {
  return METERS.filter(platform => issue?.platforms?.[platform]).map(platform => {
    const figures = issue.platforms[platform], label = platformLabel(platform), value = meterValue(issue, platform);
    if (SAMPLED.includes(platform)) return { id: platform, label, text: `${foundText(figures)} ditemukan`, ratio: null,
      hint: figures.capped ? `${label}: sampel ${formatCount(figures.found || 0)} posting terisi penuh, jumlah sebenarnya lebih banyak` : `${label}: ${formatCount(figures.found || 0)} posting ditemukan dalam sampel 3 hari terakhir` };
    if (value === null) return platform === 'x' ? { id: 'x', label, text: `${formatCount(figures.posts || 0)} posting contoh`, ratio: null, hint: `X: ditemukan lewat ${formatCount(figures.posts || 0)} posting, belum dihitung` } : null;
    const most = Math.max(value, ...(listed || []).map(other => meterValue(other, platform) || 0));
    const meter = { id: platform, label, text: meterText[platform](value), ratio: most > 0 ? value / most : 0 };
    return platform === 'x' ? { ...meter, hint: `X: sedikitnya ${formatCount(value)} posting terpantau sejak kemarin` } : meter;
  }).filter(Boolean);
}

const TOPS = ['news', 'x', 'youtube', 'search'];       // the platforms with a figure to order by, in the page's order
// One short line each, so the lists of a row start level. What a plus sign means is said by `hint`, on the figure.
const topBasis = { news: 'Jumlah artikel.', x: 'Terpantau sejak kemarin.', youtube: 'Tayangan video tren.', search: 'Pencarian, batas bawah.' };
const topHint = { x: value => `Sedikitnya ${formatCount(value)} posting terpantau sejak kemarin`, search: value => `Sedikitnya ${formatCount(value)} pencarian menurut daftar pencarian populer` };
/** For the row of ranked lists: the ten loudest issues of the page's scope on each platform that has a figure to order
 * by, as `[{ id, label, basis, rows: [{ key, title, text, ratio, hint }] }]`. `ratio` is against the first row of that
 * platform; `hint` says what a lower bound is, where the figure is one. A platform with nothing to order is left out, and TikTok and Instagram always are: a sample has no order.
 * Category and province narrow it; the platform that orders the main list does not. */
export function platformTops(issues, { category = '', province = '' } = {}, limit = LIST_LENGTH) {
  return TOPS.map(id => {
    const ordered = visibleIssues(issues, { category, province, platform: id }).filter(issue => platformFigure(issue, id) !== null).slice(0, limit);
    const most = ordered.length ? platformFigure(ordered[0], id) : 0;
    return { id, label: platformLabel(id), basis: topBasis[id],
      rows: ordered.map(issue => ({ key: issue.key, title: issue.title, category: issue.category, image: issueImage(issue), text: meterText[id](platformFigure(issue, id)), ratio: most > 0 ? platformFigure(issue, id) / most : 0,
        ...(topHint[id] ? { hint: topHint[id](platformFigure(issue, id)) } : {}) })) };
  }).filter(top => top.rows.length);
}

/** Beranda's address for a set of choices: the current ones with `changes` applied. An empty choice is left out. */
export function homeHref(filters, changes = {}) {
  const next = { ...filters, ...changes };
  const query = search([['cat', next.category], ['pf', next.platform], ['prov', next.province]]);
  return '/pulse' + (query ? '?' + query : '');
}

/** One sentence when the newest refresh did not give the list on screen, or the list is old. Null when there is nothing to say. */
export function attemptNotice(payload, now = new Date()) {
  const last = payload?.last_attempt, shownAt = payload?.updated_at;
  const lateFailure = Boolean(last && ['failed', 'raw'].includes(last.state) && (!shownAt || last.at > shownAt));
  if (payload?.state === 'empty') return lateFailure ? `Pembaruan terakhir (${updatedText({ updated_at: last.at }, now)}) tidak berhasil membaca daftar.` : null;
  if (payload?.state === 'raw') return null;
  if (lateFailure) return `Pembaruan ${updatedText({ updated_at: last.at }, now)} tidak berhasil. Daftar di bawah dari ${updatedText(payload, now)}.`;
  if (payload?.state === 'stale') return `Data terakhir ${updatedText(payload, now)}. ` + (payload.enabled === false ? 'Pembaruan otomatis mati.' : 'Pembaruan sesudahnya belum berjalan.');
  return null;
}

/** The brief as shown. Its numbers point at the rows of the unfiltered national list: under a category or platform the
 * rows are renumbered, so the numbers are taken out; a province shows its own list, so the national brief is not shown. */
export function briefText(brief, filters = {}) {
  if (typeof brief !== 'string' || !brief || filters.province) return '';
  return filters.category || filters.platform ? brief.replace(/\s*\[\d+\]/g, '') : brief;
}

/** A project's last 24 hours against the 24 before: the change in percent (null when there is nothing to compare with) and what it is compared with. */
export function projectChange(row) {
  const last = row?.posts_24h || 0, before = row?.posts_prev_24h || 0;
  if (!before) return { percent: null, note: last ? 'belum ada pada 24 jam sebelumnya' : '' };
  return { percent: Math.round((last - before) / before * 100), note: 'dari 24 jam sebelumnya' };
}

const toneLabels = { positive: 'Positif', neutral: 'Netral', negative: 'Negatif', unknown: 'Belum dianalisis' };
/** The tone of a project's last seven days as bar segments, always in the order positive, neutral, negative, unknown.
 * tone_share_v1 (`toneShares`): a tone's share is of the analysed posts; "belum dianalisis" has no share (null) and its
 * `shareText` is its count, so a project with nothing analysed prints no percentage at all. */
export function projectTones(row) {
  const counts = row?.sentiment_7d || {}, tone = toneShares(counts);
  return ['positive', 'neutral', 'negative', 'unknown'].filter(key => counts[key] > 0).map(key => ({
    key, label: toneLabels[key], value: counts[key],
    ...(key === 'unknown' ? { share: null, shareText: `${formatCount(counts.unknown)} posting` } : { share: tone.percent[key], shareText: tone.text[key] }),
    color: `var(--ps-sent-${key})`, ...(key === 'unknown' ? { hatch: true } : {}),
  }));
}
