import { trendSeries } from './pulseTrendSeries.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from './pulseReport.js';
import {
  accountRowsThatFit, axisTicks, defaultAccent, fallbackSummary, logoProblem, moveSection, periodLabel, reportData, reportPages, reportSections, reportSettings,
  resolveSections, sectionPageLabel, settingsPayload, splitPosts, storedSummary, summaryScopeNote, switchSection, trendBuckets, aiStatus, summaryFormats,
} from './pulseReportPages.js';

const keys = list => list.map(item => item.key);
const post = (id, platform, day, { label, author = 'akun_' + id, issue, likes, text = 'Teks ' + id } = {}) => ({
  id, platform, author, text, issue_id: issue, published_at: `2026-11-${String(day).padStart(2, '0')}T03:00:00Z`,
  metrics: { ...(likes == null ? {} : { likes }), ...(label ? { sentiment: { label } } : {}) },
});
const names = { instagram: 'Instagram', x: 'X', news: 'Berita' };
const platformName = key => names[key] || key;

test('the default report has every section on, cover first and the fine print last', () => {
  const sections = resolveSections([]);
  assert.deepEqual(keys(sections), ['cover', 'summary', 'insights', 'trend', 'voices', 'opinion', 'sources', 'places', 'posts', 'narratives', 'method']);
  assert.ok(sections.every(section => section.on === (section.key !== 'insights')), 'AI Insights waits until it is chosen');
  assert.deepEqual(resolveSections(undefined), sections);
  assert.deepEqual(resolveSections('nonsense'), sections);
  assert.deepEqual(keys(sections), keys(reportSections));
});

test('a saved order is kept; unknown keys are dropped and sections it does not know join after their neighbour', () => {
  const saved = [{ key: 'posts', on: false }, { key: 'made_up', on: true }, { key: 'cover' }, { key: 'posts', on: true }, null];
  const sections = resolveSections(saved);
  assert.deepEqual(keys(sections), ['posts', 'narratives', 'method', 'cover', 'summary', 'insights', 'trend', 'voices', 'opinion', 'sources', 'places']);
  assert.equal(sections[0].on, false, 'the first mention of a section wins');
  assert.equal(sections.find(section => section.key === 'cover').on, true, 'a row without `on` is on');
  assert.ok(sections.slice(1).every(section => section.on === (section.key !== 'insights')), 'a section the saved list did not know is switched on, except AI Insights');
  // A section missing from the front of the default order goes to the front.
  assert.deepEqual(keys(resolveSections([{ key: 'method', on: true }, { key: 'summary', on: true }])).slice(0, 3), ['cover', 'method', 'summary']);
  assert.deepEqual(resolveSections(sections), sections, 'a complete list comes back unchanged');
});

test('sections move one place at a time and stop at the edges', () => {
  const sections = resolveSections([]);
  const down = moveSection(sections, 'cover', 1);
  assert.deepEqual(keys(down).slice(0, 3), ['summary', 'cover', 'insights']);
  assert.deepEqual(keys(moveSection(down, 'cover', -1)), keys(sections));
  assert.equal(moveSection(sections, 'cover', -1), sections);
  assert.equal(moveSection(sections, 'method', 1), sections);
  assert.equal(moveSection(sections, 'made_up', 1), sections);
  assert.deepEqual(keys(sections)[0], 'cover', 'the list passed in is not changed');
});

test('a section that is switched off has no page and the rest are renumbered', () => {
  const sections = switchSection(switchSection(resolveSections([]), 'voices', false), 'cover', false);
  const pages = reportPages(sections, { topPosts: [1, 2, 3] });
  assert.deepEqual(keys(pages), ['summary', 'trend', 'opinion', 'sources', 'places', 'posts', 'narratives', 'method']);
  assert.deepEqual(pages.map(page => page.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(pages.every(page => page.total === 8));
  assert.equal(sectionPageLabel(pages, 'voices'), null);
  assert.equal(sectionPageLabel(pages, 'posts'), 'hlm. 6');
  assert.deepEqual(reportPages(sections.map(section => ({ ...section, on: false }))), []);
});

test('top posts are printed four a page, eight at most, and an empty list still has its page', () => {
  const ten = Array.from({ length: 10 }, (_, index) => ({ id: index }));
  assert.deepEqual(splitPosts(ten).map(page => page.map(item => item.id)), [[0, 1, 2, 3], [4, 5, 6, 7]]);
  assert.deepEqual(splitPosts(ten.slice(0, 4)).length, 1);
  assert.deepEqual(splitPosts(ten.slice(0, 5)).map(page => page.length), [4, 1]);
  assert.deepEqual(splitPosts([]), []);

  const pages = reportPages([], { topPosts: ten });
  assert.equal(pages.length, 11);
  const posts = pages.filter(page => page.key === 'posts');
  assert.deepEqual(posts.map(page => [page.id, page.title, page.part, page.parts, page.rank, page.posts.length]),
    [['posts-1', 'Posting teratas', 1, 2, 1, 4], ['posts-2', 'Posting teratas (lanjutan)', 2, 2, 5, 4]]);
  assert.equal(sectionPageLabel(pages, 'posts'), 'hlm. 8–9');
  assert.equal(pages.at(-1).number, 11);

  const none = reportPages([], { topPosts: [] }).filter(page => page.key === 'posts');
  assert.equal(none.length, 1);
  assert.deepEqual(none[0].posts, []);
});

test('without a stored summary the report writes plain sentences from the data', () => {
  const posts = [
    post('a', 'instagram', 3, { label: 'negative', issue: 'i1', likes: 10, text: 'Harga beras naik lagi' }),
    post('b', 'instagram', 3, { label: 'negative', issue: 'i1', likes: 5, text: 'Harga beras naik lagi' }),
    post('c', 'instagram', 3, { label: 'neutral', issue: 'i1', author: 'akun_a' }),
    post('d', 'x', 4, { label: 'positive' }),
    post('e', 'x', 5),
    post('f', 'news', 5, { label: 'neutral', author: 'Media A' }),
  ];
  const data = reportData(buildReport({ posts }, { id: 't', label: 'Uji' }, {}, '2026-11-14T00:00:00Z'));
  assert.equal(data.total, 6);
  assert.equal(data.accounts, 5);
  assert.equal(data.interactions, 15);
  assert.deepEqual([data.voices.public.total, data.voices.public.analysed, data.voices.news.total], [5, 4, 1]);
  // tone_share_v2: of the public's 5 posts, the one not analysed yet is the fourth part (was 25/25/50 of the 4 analysed).
  assert.deepEqual(data.voices.public.shares, { positive: 20, neutral: 20, negative: 40, unknown: 20 });
  assert.deepEqual(data.platforms.map(row => [row.platform, row.total, row.share]), [['instagram', 3, 50], ['x', 2, 33], ['news', 1, 17]]);
  assert.deepEqual(fallbackSummary(data, { platformName }), [
    'Terkumpul 6 posting dari 5 akun dan sumber di 3 platform; hari paling ramai adalah 3 Nov 2026 dengan 3 posting.',
    'Dari 5 posting warganet, nada negatif paling banyak (40%), disusul positif 20% dan netral 20%; 20% belum dianalisis.',
    'Sumber terbesar adalah Instagram dengan 3 posting (50% dari seluruh posting).',
    'Konten yang paling banyak diulang muncul di 3 posting dari 2 akun: “Harga beras naik lagi”.',
  ]);
  for (const sentence of fallbackSummary(data, { platformName })) assert.doesNotMatch(sentence, /—|undefined|NaN|null/);
});

test('the report prints tone shares as tone_share_v2 writes them: of every post, belum dianalisis included, a sliver is <1%', () => {
  const posts = [post('p', 'x', 3, { label: 'positive' }), ...Array.from({ length: 299 }, (_, index) => post('n' + index, 'x', 3, { label: 'neutral' })), post('u', 'x', 3)];
  const data = reportData(buildReport({ posts }, { id: 't', label: 'Uji' }, {}, '2026-11-14T00:00:00Z'));
  const sliver = { positive: '<1%', neutral: '100%', negative: '0%', unknown: '<1%' };
  assert.deepEqual(data.shares, { positive: 0, neutral: 100, negative: 0, unknown: 0 });
  assert.deepEqual(data.shareText, sliver);
  assert.deepEqual(data.voices.public.shareText, sliver);
  assert.deepEqual(data.platforms[0].shareText, sliver);
  assert.equal(fallbackSummary(data)[1], 'Dari 301 posting warganet, nada netral paling banyak (100%), disusul positif <1% dan negatif 0%; <1% belum dianalisis.');
  const waiting = reportData(buildReport({ posts: [post('a', 'x', 2)] }, {}, {}, '2026-11-14T00:00:00Z'));
  assert.deepEqual(waiting.shareText, { positive: '0%', neutral: '0%', negative: '0%', unknown: '100%' }, 'nothing analysed: all of it is belum dianalisis');
  assert.equal(waiting.voices.public.shareText.unknown, '100%');
  const none = reportData(buildReport({ posts: [] }, {}, {}, '2026-11-14T00:00:00Z'));
  assert.equal(none.shareText, null, 'no post at all: no percentage to print');
});

test('the fallback summary says what is missing instead of guessing', () => {
  const empty = reportData(buildReport({ posts: [] }, {}, {}, '2026-11-14T00:00:00Z'));
  assert.deepEqual(fallbackSummary(empty), ['Belum ada posting pada periode dan platform yang dipilih.']);

  const press = reportData(buildReport({ posts: [post('n', 'news', 2, { label: 'neutral' })] }, {}, {}, '2026-11-14T00:00:00Z'));
  assert.deepEqual(fallbackSummary(press, { platformName }), [
    'Terkumpul 1 posting dari 1 akun dan sumber di 1 platform, semuanya terbit pada 2 Nov 2026.',
    'Seluruh posting berasal dari pemberitaan; belum ada posting warganet pada periode ini.',
    'Seluruh posting berasal dari Berita.',
  ]);

  const waiting = reportData(buildReport({ posts: [post('a', 'x', 2), post('b', 'x', 3)] }, {}, {}, '2026-11-14T00:00:00Z'));
  assert.equal(fallbackSummary(waiting, { platformName })[1], 'Nada posting warganet belum dapat disimpulkan karena 2 posting itu belum dianalisis.');
  assert.equal(fallbackSummary(waiting, { platformName }).length, 3, 'no sentence about repeated content when nothing repeats');
});

test('comments are a sample: their tone is read over what has been analysed (sampleToneShares), and the most liked come first', () => {
  const posts = [{ ...post('a', 'x', 2, { label: 'neutral' }), metrics: { comment_snapshot: { items: [
    { id: 'c1', author: 'satu', text: 'Setuju', likes: 3 }, { id: 'c2', author: 'dua', text: 'Tidak setuju', likes: 40 },
    { id: 'c3', author: 'tiga', text: 'Belum dibaca', likes: null }, { id: 'c4', author: 'empat', text: '   ', likes: 99 },
  ] } } }];
  const response = { target: 'Isu', posts: [{ post_id: 'a', comments: [
    { id: 'c1', sentiment: { label: 'positive' }, stance: { label: 'supports' } }, { id: 'c2', sentiment: { label: 'negative' }, stance: { label: 'opposes' } },
  ] }] };
  const data = reportData(buildReport({ posts }, { id: 't' }, {}, '2026-11-14T00:00:00Z', null, { loaded: true, error: false, response }));
  assert.deepEqual([data.opinion.total, data.opinion.analysed, data.opinion.stanceRead], [4, 2, 2]);
  assert.deepEqual(data.opinion.shares, { positive: 50, neutral: 0, negative: 50 });
  assert.deepEqual(data.opinion.stanceShares, { supports: 50, opposes: 50, unclear: 0 });
  assert.equal(data.opinion.target, 'Isu');
  assert.deepEqual(data.opinion.liked.map(comment => comment.id), ['c2', 'c1', 'c3'], 'a comment without text is not quoted');
});

test('the trend is the series of the trend chart on Ikhtisar: no gaps, stretched to the chosen period, per week when long', () => {
  const at = (id, date, likes) => ({ id, platform: 'x', author: 'a' + id, published_at: `${date}T03:00:00Z`, metrics: { sentiment: { label: 'positive' }, ...(likes == null ? {} : { likes }) } });
  const many = (date, count, likes) => Array.from({ length: count }, (_, index) => at(`${date}-${index}`, date, likes));
  const posts = [...many('2026-11-01', 2, 3), ...many('2026-11-04', 5), ...many('2026-11-05', 5)];
  const short = trendBuckets(posts);
  assert.equal(short.unit, 'day');
  assert.deepEqual(short.rows.map(row => [row.date, row.total]), [['2026-11-01', 2], ['2026-11-02', 0], ['2026-11-03', 0], ['2026-11-04', 5], ['2026-11-05', 5]]);
  assert.deepEqual(short.rows.map(row => row.key), trendSeries(posts, 'day').map(row => row.key), 'the buckets the server is asked about');
  assert.deepEqual(short.rows.map(row => row.interactions), [6, 0, 0, null, null], 'interactions_v1 per bucket, unknown is never 0');
  assert.equal(short.peak.date, '2026-11-04', 'the earliest of the largest days');
  assert.equal(short.max, 5);

  const stretched = trendBuckets(posts, { from: '2026-10-30', to: '2026-11-07' });
  assert.deepEqual([stretched.rows.length, stretched.rows[0].date, stretched.rows.at(-1).end], [9, '2026-10-30', '2026-11-07'], 'a chosen period is drawn whole, as on Ikhtisar');

  const long = trendBuckets([...many('2026-01-01', 1), ...many('2026-01-03', 2), ...many('2026-06-30', 4)]);
  assert.equal(long.unit, 'week');
  // Weeks run Monday to Sunday (day_v1); they used to start on the first day with data (1 Jan, a Thursday, to 7 Jan).
  assert.deepEqual([long.rows[0].date, long.rows[0].end, long.rows[0].total], ['2026-01-01', '2026-01-04', 3]);
  assert.equal(long.rows.at(-1).end, '2026-06-30');
  assert.equal(long.rows.reduce((sum, row) => sum + row.total, 0), 7);
  assert.deepEqual(trendBuckets([]), { unit: 'day', rows: [], max: 0, peak: null });

  assert.deepEqual(axisTicks(32), [0, 10, 20, 30, 40]);
  assert.deepEqual(axisTicks(3), [0, 1, 2, 3]);
  assert.deepEqual(axisTicks(1200), [0, 500, 1000, 1500]);
  assert.deepEqual(axisTicks(0), [0, 1]);
});

test('the period reads as dates, chosen or taken from the data', () => {
  assert.equal(periodLabel({ from: '2026-11-01', to: '2026-11-14' }), '1–14 Nov 2026');
  assert.equal(periodLabel({ from: '2026-11-01' }), 'Sejak 1 Nov 2026');
  assert.equal(periodLabel({ to: '2026-11-14' }), 'Sampai 14 Nov 2026');
  assert.equal(periodLabel({}, [{ date: '2026-10-28' }, { date: '2026-11-03' }]), '28 Okt – 3 Nov 2026');
  assert.equal(periodLabel({}, []), 'Semua periode');
});

test('the stored executive summary is preferred and printed without evidence codes', () => {
  const brief = { created_at: '2026-11-13T02:00:00Z', scope: { posts: 9 }, sections: [{ title: 'Awal', kind: 'start', paragraphs: ['Terbit 1 Nov [A1].'], bullets: [] }] };
  const executive = { created_at: '2026-11-14T02:00:00Z', scope: { posts: 140, comments: 24 }, sections: [
    { title: 'Ringkasan', kind: 'overview', paragraphs: ['Isu ramai sejak 1 Nov [P1] dan memuncak 10 Nov [P12] .'], bullets: [] },
    { title: 'Kosong', kind: 'text', paragraphs: [' [K1] '], bullets: [] },
    { title: 'Perlu diperhatikan', kind: 'watch', paragraphs: [], bullets: ['Akun besar [A2].', ''] },
  ] };
  const picked = storedSummary({ summaries: { brief, executive, timeline: executive } });
  assert.equal(picked.format, 'executive');
  assert.equal(picked.createdAt, '2026-11-14T02:00:00Z');
  assert.deepEqual(picked.scope, { posts: 140, comments: 24 });
  assert.deepEqual(picked.sections, [
    { title: 'Ringkasan', kind: 'overview', paragraphs: ['Isu ramai sejak 1 Nov dan memuncak 10 Nov.'], bullets: [] },
    { title: 'Perlu diperhatikan', kind: 'watch', paragraphs: [], bullets: ['Akun besar.'] },
  ]);
  assert.equal(storedSummary({ summaries: { brief } }).format, 'brief');
  assert.equal(storedSummary({ summaries: { timeline: executive } }), null, 'only the two formats written for a reader in a hurry');
  assert.equal(storedSummary({ summaries: {} }), null);
  assert.equal(storedSummary(null), null);
});

test('a summary written for another scope says so', () => {
  const report = { period: { from: '2026-11-01', to: '2026-11-14' }, selectedPlatforms: null };
  assert.equal(summaryScopeNote({ posts: 140, comments: 24 }, report, 140), '');
  assert.equal(summaryScopeNote({ posts: 140 }, report, 152), 'Laporan ini memuat 152 posting, jadi angka di halaman lain dapat berbeda dari ringkasan.');
  assert.equal(summaryScopeNote({ posts: 140, from: '2026-11-01', to: '2026-11-14', platforms: null }, report, 140), '');
  assert.equal(summaryScopeNote({ posts: 900, from: null, to: null, platforms: null }, report, 152), 'Ringkasan itu ditulis untuk semua periode, bukan untuk cakupan laporan ini.');
  assert.equal(summaryScopeNote({ posts: 40, from: '2026-11-01', to: '2026-11-07', platforms: ['x'] }, report, 152),
    'Ringkasan itu ditulis untuk periode 1–7 Nov 2026 dengan pilihan platform yang berbeda, bukan untuk cakupan laporan ini.');
  assert.equal(summaryScopeNote({ posts: 152, from: '2026-11-01', to: '2026-11-14', platforms: ['x', 'news'] }, { ...report, selectedPlatforms: ['news', 'x'] }, 152), '');
  assert.equal(summaryScopeNote(undefined, report, 152), '');
});

test('saved settings are taken as they are only when they are acceptable', () => {
  const logo = 'data:image/png;base64,AAAA';
  const good = reportSettings({ sections: [{ key: 'summary', on: true }, { key: 'cover', on: false }], brand: { logo, accent: '#AA3355', organisation: 'Dinas Kominfo', description: 'Laporan mingguan.' } });
  assert.ok(keys(good.sections).indexOf('summary') < keys(good.sections).indexOf('cover'), 'the saved order is kept');
  assert.equal(good.sections.find(section => section.key === 'cover').on, false);
  assert.equal(good.sections.length, reportSections.length);
  assert.deepEqual(good.brand, { logo, accent: '#aa3355', organisation: 'Dinas Kominfo', description: 'Laporan mingguan.' });

  const bad = reportSettings({ sections: 'x', brand: { logo: 'https://example.test/logo.png', accent: 'red', organisation: 7, description: 'a'.repeat(700) } });
  assert.deepEqual(keys(bad.sections), keys(reportSections));
  assert.deepEqual([bad.brand.logo, bad.brand.accent, bad.brand.organisation, bad.brand.description.length], [null, null, '', 600]);
  assert.equal(reportSettings({ brand: { logo: 'data:image/svg+xml;base64,AAAA' } }).brand.logo, null);
  assert.equal(reportSettings({ brand: { accent: defaultAccent.toUpperCase() } }).brand.accent, null, 'the PULSE colour is the absence of a choice');
  assert.deepEqual(reportSettings(null).brand, { logo: null, accent: null, organisation: '', description: '' });

  const body = settingsPayload({ sections: good.sections, brand: { ...good.brand, organisation: '  Dinas  ', accent: null } });
  assert.deepEqual(body.sections[0], { key: 'summary', on: true });
  assert.deepEqual(body.brand, { logo, accent: null, organisation: 'Dinas', description: 'Laporan mingguan.' });
});

test('a logo file is refused in a sentence when it is the wrong kind or too large', () => {
  assert.equal(logoProblem({ type: 'image/png', size: 300 * 1024 }), '');
  assert.equal(logoProblem({ type: 'image/webp', size: 10 }), '');
  assert.equal(logoProblem({ type: 'image/svg+xml', size: 10 }), 'Logo harus berupa gambar PNG, JPEG, atau WebP.');
  assert.equal(logoProblem({ type: 'image/jpeg', size: 300 * 1024 + 1 }), 'Logo paling besar 300 KB; berkas ini 301 KB.');
  assert.equal(logoProblem(null), 'Berkas logo tidak terbaca.');
});

test('the accounts table gives up one row for every platform past the fifth, so the sheet never overflows', () => {
  assert.deepEqual([0, 3, 5, 6, 7, 9, 12].map(accountRowsThatFit), [10, 10, 10, 9, 8, 6, 5]);
  assert.equal(accountRowsThatFit(undefined), 10);
});

test('the place figures of the report: provinces the posts name, and where the X accounts say they are', () => {
  const named = (id, title, extra = {}) => ({ id, platform: 'news', author: 'Media ' + id, title, text: '', published_at: '2026-11-05T02:00:00Z', metrics: {}, ...extra });
  const account = (id, author, location) => ({ id, platform: 'x', author, title: '', text: 'teks', published_at: '2026-11-05T03:00:00Z', metrics: { author_id: author, ...(location === undefined ? {} : { author_location: location }) } });
  const posts = [named('1', 'Aksi di Jakarta'), named('2', 'Jakarta dan Bandung bergerak'), named('3', 'Warga Jakarta menolak'), named('4', 'Pernyataan resmi'),
    account('5', '@a', 'Jakarta'), account('6', '@b', 'Bumi'), account('7', '@c', undefined)];
  const { places } = reportData({ posts, days: [] });
  assert.deepEqual([places.total, places.named, places.provinces], [7, 3, 2]);
  assert.deepEqual(places.rows, [
    { code: 'ID-JK', name: 'DKI Jakarta', count: 3, share: 100, names: 'Jakarta 3' },
    { code: 'ID-JB', name: 'Jawa Barat', count: 1, share: 33, names: 'Bandung 1' },
  ], 'the share is of the posts that name a place; a post may name two provinces, so shares can add up to more than 100');
  assert.deepEqual(places.accounts, { total: 3, named: 1, unasked: 1, provinces: 1, rows: [{ code: 'ID-JK', name: 'DKI Jakarta', count: 1, names: 'Jakarta 1' }] });
  const many = reportData({ posts: Array.from({ length: 12 }, (_, index) => named('m' + index, 'Aksi di ' + ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Pontianak', 'Kupang', 'Ambon', 'Jayapura', 'Padang', 'Manado'][index])), days: [] }).places;
  assert.deepEqual([many.provinces, many.rows.length], [12, 6], 'the page lists six provinces and says how many there are');
  assert.deepEqual(reportData({ posts: [], days: [] }).places, { total: 0, named: 0, provinces: 0, rows: [], map: [], accounts: { total: 0, named: 0, unasked: 0, provinces: 0, rows: [] } });
});

test('long reports count weeks from Monday to Sunday, clipped to the days with data', () => {
  const many = (date, count) => Array.from({ length: count }, (_, index) => ({ id: `${date}-${index}`, platform: 'x', published_at: `${date}T03:00:00Z`, metrics: {} }));
  const long = trendBuckets([...many('2026-01-01', 1), ...many('2026-01-03', 2), ...many('2026-01-05', 4), ...many('2026-06-30', 4)]);
  assert.equal(long.unit, 'week');
  assert.deepEqual([long.rows[0].date, long.rows[0].end, long.rows[0].total, long.rows[0].unknown], ['2026-01-01', '2026-01-04', 3, 3], 'Thursday to Sunday');
  assert.deepEqual([long.rows[1].date, long.rows[1].end, long.rows[1].total], ['2026-01-05', '2026-01-11', 4]);
  assert.deepEqual([long.rows.at(-1).date, long.rows.at(-1).end], ['2026-06-29', '2026-06-30']);
});

test('the report\'s interaction total and its post count come from one rule, reading the server\'s measures', () => {
  const posts = [
    { id: 'm', platform: 'x', author: 'A', published_at: '2026-11-10T03:00:00Z', metrics: {}, measures: { interactions: 9 } },
    { id: 'n', platform: 'x', author: 'B', published_at: '2026-11-10T04:00:00Z', metrics: { likes: true } },
  ];
  const data = reportData(buildReport({ posts }, { id: 't', label: 'Uji' }, {}, '2026-11-14T00:00:00Z'));
  assert.equal(data.interactions, 9);
  assert.equal(data.interactionPosts, 1);
});

test('the report counts accounts by account_v1: a handle written two ways, a renamed channel and a Threads id on one row are one account each', () => {
  const posts = [
    { ...post('k1', 'x', 10, { author: 'Okezonenews' }) }, { ...post('k2', 'x', 11, { author: '@okezonenews' }) },
    { ...post('k3', 'youtube', 9, { author: 'Kanal Lama' }), metrics: { author_id: 'UC1' } },
    { ...post('k4', 'youtube', 12, { author: 'Kanal Baru' }), metrics: { author_id: 'UC1' } },
    { ...post('k5', 'threads', 12, { author: '@Warga.Solo' }), metrics: { author_id: '1789' } },
    { ...post('k6', 'threads', 8, { author: 'warga.solo' }) },
    { ...post('k7', 'x', 8, { author: '' }) },
  ];
  assert.equal(reportData(buildReport({ posts }, { id: 't', label: 'Uji' }, {}, '2026-11-14T00:00:00Z')).accounts, 3);
});

test('the report counts a channel whose posts have no name as one account, and a post with neither name nor id as none', () => {
  const posts = [
    { ...post('n1', 'youtube', 12, { author: null }), metrics: { author_id: 'UC1' } },
    { ...post('n2', 'youtube', 10, { author: 'Kanal' }), metrics: { author_id: 'UC1' } },
    { ...post('n3', 'youtube', 11, { author: '' }), metrics: { author_id: 'UC9' } },
    { ...post('n4', 'x', 11, { author: '' }) },
  ];
  assert.equal(reportData(buildReport({ posts }, { id: 't', label: 'Uji' }, {}, '2026-11-14T00:00:00Z')).accounts, 2);
});

test('the report keeps which written summary it prints: the first stored, one format, or none', () => {
  assert.deepEqual(reportSettings(null).ai, { summary: null });
  for (const choice of ['off', 'executive', 'brief', 'timeline']) assert.deepEqual(reportSettings({ ai: { summary: choice } }).ai, { summary: choice });
  for (const wrong of [{ summary: 'insights' }, { summary: 7 }, 'brief', null]) assert.deepEqual(reportSettings({ ai: wrong }).ai, { summary: null });
  assert.deepEqual(settingsPayload({ sections: [], brand: {}, ai: { summary: 'timeline' } }).ai, { summary: 'timeline' });
  assert.deepEqual(settingsPayload({ sections: [], brand: {} }).ai, { summary: null });
  assert.deepEqual(summaryFormats.map(row => [row.key, row.label]), [['executive', 'Eksekutif'], ['brief', 'Ringkas'], ['timeline', 'Kronologi']]);

  const made = (format, at) => ({ created_at: at, scope: { posts: 9 }, sections: [{ title: format, kind: 'text', paragraphs: [`${format} [P1].`], bullets: [] }] });
  const payload = { summaries: { brief: made('brief', '2026-11-13T02:00:00Z'), timeline: made('timeline', '2026-11-12T02:00:00Z') } };
  assert.equal(storedSummary(payload).format, 'brief', 'nothing chosen: executive, then brief');
  assert.equal(storedSummary(payload, 'timeline').format, 'timeline');
  assert.deepEqual(storedSummary(payload, 'timeline').sections[0].paragraphs, ['timeline.']);
  assert.equal(storedSummary(payload, 'executive'), null, 'a chosen format that is not written yet is not swapped for another');
  assert.equal(storedSummary(payload, 'off'), null);
});

test('the concentration lines take the room of two account rows on the sources page', () => {
  assert.equal(accountRowsThatFit(6), 9);
  assert.equal(accountRowsThatFit(6, { concentration: true }), 7);
  assert.equal(accountRowsThatFit(12, { concentration: true }), 3, 'a long platform table leaves at least three accounts');
});

test('the AI choices say what is stored, for which scope, and offer to write only what is missing or for another period', () => {
  const report = { period: { from: '2026-11-01', to: '2026-11-07' }, selectedPlatforms: null };
  const insights = (scope) => ({ created_at: '2026-11-08T02:00:00Z', scope, sections: [{ title: 'Judul', kind: 'headline', paragraphs: ['Isu naik.'], bullets: [] }] });
  const executive = { created_at: '2026-11-14T02:00:00Z', scope: { posts: 40 }, sections: [{ title: 'Ringkasan', kind: 'overview', paragraphs: ['Ringkas.'], bullets: [] }] };

  const loading = aiStatus(null, { report });
  assert.equal(loading.loaded, false);
  assert.equal(loading.summary.canWrite, false);

  const none = aiStatus({ available: true, summaries: {} }, { report });
  assert.deepEqual([none.summary.format, none.summary.stored, none.summary.canWrite], ['executive', null, true]);
  assert.deepEqual([none.insights.stored, none.insights.canWrite], [null, true]);

  const stored = aiStatus({ available: true, summaries: { executive, insights: insights({ posts: 30, from: '2026-11-01', to: '2026-11-07', platforms: null }) } }, { report });
  assert.deepEqual([stored.summary.format, stored.summary.stored.createdAt, stored.summary.canWrite], ['executive', '2026-11-14T02:00:00Z', false]);
  assert.deepEqual([stored.insights.stored.createdAt, stored.insights.differs, stored.insights.canWrite], ['2026-11-08T02:00:00Z', false, false]);

  const elsewhere = aiStatus({ available: true, summaries: { insights: insights({ posts: 90, from: '2026-10-01', to: '2026-10-31', platforms: ['x'] }) } }, { report });
  assert.deepEqual([elsewhere.insights.differs, elsewhere.insights.canWrite], [true, true], 'insights for another period can be written for this one');
  assert.equal(aiStatus({ available: true, summaries: {} }, { report, choice: 'off' }).summary.canWrite, false, 'nothing to write when the summary is off');

  const unavailable = aiStatus({ available: false, summaries: {} }, { report });
  assert.deepEqual([unavailable.available, unavailable.summary.canWrite, unavailable.insights.canWrite], [false, false, false]);
  const failed = aiStatus({ failed: true, summaries: {} }, { report });
  assert.deepEqual([failed.loaded, failed.failed, failed.summary.canWrite, failed.insights.canWrite], [true, true, false, false], 'a failed read offers nothing to write');
  const archived = aiStatus({ available: true, summaries: {} }, { report, archived: true });
  assert.deepEqual([archived.summary.canWrite, archived.insights.canWrite], [false, false], 'an archive is printed as it was filed');
});

test('insights written for another scope say so in the report, in the words of the summary note', () => {
  const report = { period: { from: '2026-11-01', to: '2026-11-07' }, selectedPlatforms: null };
  assert.equal(summaryScopeNote({ posts: 30, from: '2026-10-01', to: '2026-10-31', platforms: null }, report, 30, 'AI Insights itu'),
    'AI Insights itu ditulis untuk periode 1–31 Okt 2026, bukan untuk cakupan laporan ini.');
});
