import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryCounts, figureLine, freshnessText, issueFootprint, movementText, projectHref, provinceCounts, provinceRows, radarCategories,
  radarPlatforms, searchHref, shadeOf, shadeRanges, updatedText, visibleIssues,
  categoryRows, homeHref, platformCoverage, platformMeters, provinceRanking, radarFigures,
  attemptNotice, briefText, projectChange, projectTones, offeredPlatforms, platformFigure, platformTops, issueImage, scheduleText,
} from './pulseRadar.js';

const issue = (rank, title, category, platforms, more = {}) => ({
  key: 'k' + rank, scope: 'national', rank, title, category, reason: 'Ramai.', platforms, regions: [], evidence_titles: [],
  query: { q: title.toLowerCase(), required: '', excluded: '' }, movement: null, project: null, ...more,
});
const region = (code, searches) => ({ code, searches });
const issues = [
  issue(1, 'Pengunduran diri Wapres', 'politik', { news: { count: 212 }, youtube: { count: 9, views: 9000000 }, search: { searches: 5000 } },
    { regions: [region('ID-JK', 2000), region('ID-JI', 1000), region('ID-JB', 500)] }),
  issue(2, 'Pertemuan di Bogor', 'politik', { news: { count: 64 } }, { evidence_titles: ['Isi pertemuan Prabowo di Istana Bogor dibuka'] }),
  issue(3, 'Timnas Indonesia', 'olahraga', { search: { searches: 10000 }, news: { count: 18 } }, { regions: [region('ID-JK', 200), region('ID-JI', 500)] }),
  issue(4, 'Perampokan di Malang', 'hukum', { news: { count: 22 } }, { regions: [region('ID-JI', 200)], evidence_titles: ['Dua perampok di Malang ditangkap'] }),
  issue(5, 'Polda Jawa Timur', 'hukum', { search: { searches: 200 } }, { scope: 'local', regions: [region('ID-JI', 200)] }),
  issue(6, 'Cek BSU', 'ekonomi', { search: { searches: 1000 } }, { scope: 'local', regions: [region('ID-BA', 1000)] }),
];
const titles = rows => rows.map(row => row.title);

test('the national list is the ten highest, and a category or a platform narrows and reorders it', () => {
  assert.deepEqual(titles(visibleIssues(issues, {})), ['Pengunduran diri Wapres', 'Pertemuan di Bogor', 'Timnas Indonesia', 'Perampokan di Malang'], 'local issues stay out of the country list');
  assert.deepEqual(titles(visibleIssues(issues, { category: 'politik' })), ['Pengunduran diri Wapres', 'Pertemuan di Bogor']);
  assert.deepEqual(titles(visibleIssues(issues, { platform: 'search' })), ['Timnas Indonesia', 'Pengunduran diri Wapres'], 'a platform keeps the issues on it, loudest there first');
  assert.deepEqual(titles(visibleIssues(issues, { platform: 'youtube' })), ['Pengunduran diri Wapres']);
  const many = Array.from({ length: 14 }, (_, index) => issue(index + 1, 'Isu ' + (index + 1), 'politik', { news: { count: 1 } }));
  assert.equal(visibleIssues(many, {}).length, 10);
  assert.deepEqual(visibleIssues(null, {}), []);
});

test('a province lists the national issues loud there in their order, then the ones loud only there', () => {
  assert.deepEqual(titles(visibleIssues(issues, { province: 'ID-JI' })), ['Pengunduran diri Wapres', 'Timnas Indonesia', 'Perampokan di Malang', 'Polda Jawa Timur']);
  assert.deepEqual(titles(visibleIssues(issues, { province: 'ID-BA' })), ['Cek BSU']);
  assert.deepEqual(titles(visibleIssues(issues, { province: 'ID-JI', category: 'hukum' })), ['Perampokan di Malang', 'Polda Jawa Timur']);
  assert.deepEqual(visibleIssues(issues, { province: 'ID-PA' }), []);
});

test('the switches count what each category holds in the list that is on screen', () => {
  assert.deepEqual(categoryCounts(issues, ''), { '': 4, politik: 2, olahraga: 1, hukum: 1 });
  assert.deepEqual(categoryCounts(issues, 'ID-JI'), { '': 4, politik: 1, olahraga: 1, hukum: 2 });
  assert.deepEqual(radarCategories.map(([id]) => id), ['', 'politik', 'hukum', 'ekonomi', 'bencana', 'sosial', 'teknologi', 'olahraga', 'hiburan', 'dunia', 'lainnya']);
  assert.deepEqual(radarPlatforms.map(([, label]) => label), ['Semua platform', 'Berita', 'X', 'TikTok', 'Instagram', 'YouTube', 'Google']);
});

test('a province is shaded by how many listed issues are loud in it, three or more sharing the darkest step', () => {
  assert.deepEqual(provinceCounts(visibleIssues(issues, {})), { 'ID-JK': 2, 'ID-JI': 3, 'ID-JB': 1 });
  assert.deepEqual([0, 1, 2, 3].map(count => shadeOf(count, 3)), [0, 1, 2, 3], 'up to three issues, a step each');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(count => shadeOf(count, 7)), [0, 1, 1, 2, 2, 3, 3, 3], 'beyond that the three steps are spread over the busiest province, so the map does not go one colour');
  assert.deepEqual([1, 5, 10].map(count => shadeOf(count, 10)), [1, 2, 3]);
  assert.equal(shadeOf(4, 0), 0);
  assert.deepEqual(shadeRanges(3), [[1, '1'], [2, '2'], [3, '3']]);
  assert.deepEqual(shadeRanges(2), [[1, '1'], [2, '2']]);
  assert.deepEqual(shadeRanges(7), [[1, '1–2'], [2, '3–4'], [3, '5–7']]);
  assert.deepEqual(shadeRanges(10), [[1, '1–3'], [2, '4–6'], [3, '7–10']]);
  assert.deepEqual(shadeRanges(4), [[1, '1'], [2, '2'], [3, '3–4']]);
  assert.deepEqual(shadeRanges(0), []);
  const rows = provinceRows(visibleIssues(issues, {}), ['ID-JK', 'ID-JI', 'ID-JB', 'ID-BA']);
  assert.equal(rows.length, 34, 'every province has a row, so the table says the same as the map');
  assert.deepEqual(rows.slice(0, 3).map(row => [row.name, row.count, row.top]), [['Jawa Timur', 3, 'Pengunduran diri Wapres'], ['DKI Jakarta', 2, 'Pengunduran diri Wapres'], ['Jawa Barat', 1, 'Pengunduran diri Wapres']]);
  assert.deepEqual(rows.find(row => row.code === 'ID-BA'), { code: 'ID-BA', name: 'Bali', count: 0, top: null, read: true });
  assert.equal(rows.find(row => row.code === 'ID-PA').read, false, 'a list that was not read is not a zero');
  assert.ok(provinceRows(visibleIssues(issues, {}), null).every(row => row.read), 'no list of read provinces means nothing is known to be missing');
});

test('an issue draws its provinces and a pin for each place its headlines name', () => {
  const footprint = issueFootprint(issues[3]);
  assert.deepEqual(footprint.regions, [{ code: 'ID-JI', name: 'Jawa Timur', searches: 200 }]);
  assert.equal(footprint.pins.length, 1);
  assert.equal(footprint.pins[0].place, 'Malang');
  assert.equal(footprint.pins[0].code, 'ID-JI');
  assert.ok(Array.isArray(footprint.pins[0].point) && footprint.pins[0].point.length === 2);
  assert.deepEqual(issueFootprint(issues[1]).pins.map(pin => pin.place), ['Bogor'], 'a place named only in the coverage is pinned too');
  assert.deepEqual(issueFootprint(issue(9, 'Harga beras', 'ekonomi', {})), { regions: [], pins: [] });
});

test('figures carry their unit and the chosen platform leads', () => {
  assert.deepEqual(figureLine(issues[0]), ['Berita 212 artikel', 'YouTube 9.000.000 tayangan (9 video tren)', 'Google 5.000+ pencarian', 'ramai di 3 provinsi']);
  assert.deepEqual(figureLine(issues[0], 'search'), ['Google 5.000+ pencarian', 'Berita 212 artikel', 'YouTube 9.000.000 tayangan (9 video tren)', 'ramai di 3 provinsi']);
  assert.deepEqual(figureLine(issues[1]), ['Berita 64 artikel']);
  assert.deepEqual(figureLine(issue(9, 'Satu', 'politik', { news: { count: 1 }, youtube: { count: 1, views: 10 } })), ['Berita 1 artikel', 'YouTube 10 tayangan (1 video tren)']);
});

test('movement and freshness are said in words, in WIB, naming what could not be read', () => {
  assert.equal(movementText({ kind: 'new', places: 0 }), 'Baru');
  assert.equal(movementText({ kind: 'up', places: 4 }), 'Naik 4');
  assert.equal(movementText({ kind: 'down', places: 2 }), 'Turun 2');
  assert.equal(movementText(null), null);
  const now = new Date('2026-11-15T01:30:00Z');
  const payload = { updated_at: '2026-11-15T01:10:00', daily_at: '08:00', enabled: true, missing: [] };
  assert.equal(freshnessText(payload, now), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB');
  assert.equal(freshnessText({ ...payload, missing: ['ID-PA'] }, now), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB; Papua tidak terbaca');
  assert.equal(freshnessText({ ...payload, missing: ['ID-PA', 'ID-MA', 'ID-GO', 'youtube'] }, now), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB; 3 provinsi tidak terbaca; YouTube tidak terbaca');
  assert.equal(freshnessText({ ...payload, enabled: false }, now), 'Diperbarui 08.10 WIB; pembaruan otomatis mati');
  assert.equal(freshnessText({ ...payload, updated_at: '2026-11-13T20:05:00' }, now), 'Diperbarui 14 Nov 2026, 03.05 WIB, otomatis setiap hari pukul 08.00 WIB', 'another day is named');
  assert.equal(freshnessText({ ...payload, updated_at: null }, now), '');
  assert.equal(freshnessText({ ...payload, daily_at: undefined }, now), 'Diperbarui 08.10 WIB', 'a payload that does not say when the list is made says nothing about it');
  assert.equal(scheduleText(payload), 'setiap hari pukul 08.00 WIB');
  assert.equal(scheduleText({ daily_at: '8 pagi' }), '');
  assert.equal(scheduleText(null), '');
  assert.equal(updatedText(payload, now), '08.10 WIB');
  assert.equal(updatedText({ updated_at: '2026-11-13T20:05:00' }, now), '14 Nov 2026, 03.05 WIB');
  assert.equal(updatedText({ updated_at: 'entah' }, now), '');
});

test('the links carry the proposed keywords, or the project, and nothing else', () => {
  assert.equal(searchHref({ query: { q: 'gibran mundur, wapres mundur', required: 'Indonesia', excluded: '' } }), '/pulse/search?q=gibran+mundur%2C+wapres+mundur&required=Indonesia');
  assert.equal(searchHref({ title: 'Harga beras', query: {} }), '/pulse/search?q=Harga+beras');
  assert.equal(projectHref({ id: 't 1', label: 'x' }), '/pulse/overview?topic=t+1');
});

test('the figures strip says how big the refresh was, how much of the country was read and how much is already monitored', () => {
  const covered = issues.map((row, index) => index === 0 ? { ...row, project: { id: 't1', label: 'Isu Gibran' } } : row);
  const figures = radarFigures({ issues: covered, signals: { news: 122, search: 54, youtube: 51 }, provinces_read: ['ID-JK', 'ID-JI'], missing: ['ID-PA'] });
  assert.deepEqual(figures.issues, { total: 6, national: 4, local: 2 });
  assert.deepEqual(figures.signals, { total: 227, news: 122, search: 54, youtube: 51 });
  assert.deepEqual(figures.provinces, { read: 2, of: 34, share: 2 / 34 * 100 });
  assert.deepEqual(figures.covered, { count: 1, of: 4, share: 25 }, 'of the national issues on the list, at most ten');
  const bare = radarFigures({ issues: [], signals: {}, provinces_read: null });
  assert.equal(bare.signals, null, 'a refresh that did not say what it read shows no figure, not a zero');
  assert.equal(bare.provinces, null);
  assert.deepEqual(bare.covered, { count: 0, of: 0, share: null });
});

test('provinces are ranked by how many listed issues are loud there, and only those with any', () => {
  const rows = provinceRanking(visibleIssues(issues, {}), 2);
  assert.deepEqual(rows, [{ code: 'ID-JI', name: 'Jawa Timur', count: 3, top: 'Pengunduran diri Wapres' }, { code: 'ID-JK', name: 'DKI Jakarta', count: 2, top: 'Pengunduran diri Wapres' }]);
  assert.deepEqual(provinceRanking([], 5), []);
  assert.equal(provinceRanking(visibleIssues(issues, {})).length, 3);
});

test('categories and platforms are counted for the scope on screen, largest first', () => {
  assert.deepEqual(categoryRows(issues, ''), [{ id: 'politik', label: 'Politik', count: 2 }, { id: 'hukum', label: 'Hukum', count: 1 }, { id: 'olahraga', label: 'Olahraga', count: 1 }]);
  assert.deepEqual(categoryRows(issues, 'ID-JI').map(row => [row.id, row.count]), [['hukum', 2], ['olahraga', 1], ['politik', 1]]);
  assert.deepEqual(platformCoverage(visibleIssues(issues, {})), [{ id: 'news', label: 'Berita', count: 4 }, { id: 'search', label: 'Google', count: 2 }, { id: 'youtube', label: 'YouTube', count: 1 }]);
});

test('a row draws one meter per platform it is on, each against the loudest listed issue on that platform', () => {
  const listed = visibleIssues(issues, {});
  assert.deepEqual(platformMeters(listed[0], listed), [
    { id: 'news', label: 'Berita', text: '212 artikel', ratio: 1 },
    { id: 'youtube', label: 'YouTube', text: '9.000.000 tayangan', ratio: 1 },      // the figure that orders videos, the same one the YouTube column shows
    { id: 'search', label: 'Google', text: '5.000+ pencarian', ratio: 0.5 },
  ]);
  assert.deepEqual(platformMeters(listed[1], listed), [{ id: 'news', label: 'Berita', text: '64 artikel', ratio: 64 / 212 }]);
  assert.deepEqual(platformMeters(issue(9, 'Kosong', 'politik', {}), listed), []);
});

test('a link back to Beranda keeps the other choices and drops what is cleared', () => {
  const filters = { category: 'politik', platform: 'news', province: 'ID-JI' };
  assert.equal(homeHref(filters, { province: 'ID-BA' }), '/pulse?cat=politik&pf=news&prov=ID-BA');
  assert.equal(homeHref(filters, { category: '' }), '/pulse?pf=news&prov=ID-JI');
  assert.equal(homeHref({ category: '', platform: '', province: '' }, {}), '/pulse');
});

test('a refresh that did not work is said, and never looks like a radar that never ran', () => {
  const now = new Date('2026-11-15T04:00:00Z');
  const shown = { state: 'ok', updated_at: '2026-11-15T02:50:00', enabled: true, last_attempt: { state: 'ok', at: '2026-11-15T02:50:00' } };
  assert.equal(attemptNotice(shown, now), null);
  assert.equal(attemptNotice({ ...shown, last_attempt: { state: 'failed', at: '2026-11-15T03:40:00' } }, now), 'Pembaruan 10.40 WIB tidak berhasil. Daftar di bawah dari 09.50 WIB.');
  assert.equal(attemptNotice({ ...shown, last_attempt: { state: 'raw', at: '2026-11-15T03:40:00' } }, now), 'Pembaruan 10.40 WIB tidak berhasil. Daftar di bawah dari 09.50 WIB.');
  assert.equal(attemptNotice({ ...shown, state: 'stale' }, now), 'Data terakhir 09.50 WIB. Pembaruan sesudahnya belum berjalan.');
  assert.equal(attemptNotice({ ...shown, state: 'stale', enabled: false }, now), 'Data terakhir 09.50 WIB. Pembaruan otomatis mati.', 'a switch that is off is not a failure');
  assert.equal(attemptNotice({ state: 'empty', updated_at: null, enabled: true, last_attempt: { state: 'failed', at: '2026-11-15T03:40:00' }, missing: ['news', 'search'] }, now),
    'Pembaruan terakhir (10.40 WIB) tidak berhasil membaca daftar.');
  assert.equal(attemptNotice({ state: 'empty', updated_at: null, enabled: true, last_attempt: null }, now), null);
});

test('the brief keeps its row numbers only while the rows are the ones it was written about', () => {
  const brief = 'Wapres mundur mendominasi [1]. Bola juga ramai [2][3].';
  const none = { category: '', platform: '', province: '' };
  assert.equal(briefText(brief, none), brief);
  assert.equal(briefText(brief, { ...none, category: 'politik' }), 'Wapres mundur mendominasi. Bola juga ramai.', 'under a filter the rows are renumbered, so the numbers go');
  assert.equal(briefText(brief, { ...none, platform: 'news' }), 'Wapres mundur mendominasi. Bola juga ramai.');
  assert.equal(briefText(brief, { ...none, province: 'ID-JI' }), '', 'a province has its own list; the national brief is not shown');
  assert.equal(briefText(null, none), '');
});

test('a project card says its last day against the day before and how its last week felt', () => {
  assert.deepEqual(projectChange({ posts_24h: 412, posts_prev_24h: 349 }), { percent: 18, note: 'dari 24 jam sebelumnya' });
  assert.deepEqual(projectChange({ posts_24h: 96, posts_prev_24h: 123 }), { percent: -22, note: 'dari 24 jam sebelumnya' });
  assert.deepEqual(projectChange({ posts_24h: 50, posts_prev_24h: 50 }), { percent: 0, note: 'dari 24 jam sebelumnya' });
  assert.deepEqual(projectChange({ posts_24h: 7, posts_prev_24h: 0 }), { percent: null, note: 'belum ada pada 24 jam sebelumnya' });
  assert.deepEqual(projectChange({ posts_24h: 0, posts_prev_24h: 0 }), { percent: null, note: '' });
  const tones = projectTones({ sentiment_7d: { positive: 6, neutral: 59, negative: 35, unknown: 0 } });
  assert.deepEqual(tones.map(row => [row.key, row.label, row.value, row.share]), [['positive', 'Positif', 6, 6], ['neutral', 'Netral', 59, 59], ['negative', 'Negatif', 35, 35]],
    'always positive, neutral, negative; a tone with nothing in it is left out');
  assert.equal(projectTones({ sentiment_7d: { positive: 1, neutral: 0, negative: 0, unknown: 3 } }).at(-1).hatch, true, 'unknown is hatched, never a flat grey');
  assert.deepEqual(projectTones({ sentiment_7d: { positive: 0, neutral: 0, negative: 0, unknown: 0 } }), []);
  assert.deepEqual(projectTones({}), []);
  // tone_share_v2: "belum dianalisis" is the fourth part of the 100, and one post of 1000 is a sliver.
  assert.deepEqual(projectTones({ sentiment_7d: { positive: 0, neutral: 999, negative: 0, unknown: 1 } }).map(row => row.shareText), ['100%', '<1%'], 'a sliver is not printed as nothing');
  assert.equal(tones[0].shareText, '6%');
});

test('a project card\'s week of tone is tone_share_v2: shares of every post of the week, "belum dianalisis" the fourth part', () => {
  const tones = projectTones({ sentiment_7d: { positive: 1, neutral: 1, negative: 2, unknown: 1996 } });
  assert.deepEqual(tones.map(row => [row.key, row.share, row.shareText]), [['positive', 0, '<1%'], ['neutral', 0, '<1%'], ['negative', 0, '<1%'], ['unknown', 100, '100%']]);
  assert.deepEqual(projectTones({ sentiment_7d: { positive: 1, neutral: 299, negative: 0, unknown: 0 } }).map(row => row.shareText), ['<1%', '100%'], 'one post of 300 is a sliver');
  // Nothing analysed yet: "belum dianalisis" is the whole 100.
  const waiting = projectTones({ sentiment_7d: { positive: 0, neutral: 0, negative: 0, unknown: 12 } });
  assert.deepEqual(waiting.map(row => [row.key, row.value, row.share, row.shareText]), [['unknown', 12, 100, '100%']]);
  assert.doesNotMatch(JSON.stringify(waiting), /NaN/);
});

// ── X, TikTok and Instagram: a count on X, samples on the other two ─────────────────────────────────────────────────

const social = [
  issue(1, 'Antrean BBM', 'ekonomi', { news: { count: 40 }, x: { count: 625 }, tiktok: { found: 20, capped: true }, instagram: { found: 12, capped: false } }),
  issue(2, 'Tagar BBM', 'ekonomi', { x: { posts: 3 } }),
  issue(3, 'Laga bola', 'olahraga', { news: { count: 90 }, x: { count: 9700 }, tiktok: { found: 4, capped: false } }),
  issue(4, 'Harga beras', 'ekonomi', { news: { count: 12 } }),
];

test('X orders by its count, an issue only found there comes after the counted ones, and a sampled platform keeps the combined order', () => {
  assert.deepEqual(titles(visibleIssues(social, { platform: 'x' })), ['Laga bola', 'Antrean BBM', 'Tagar BBM']);
  assert.deepEqual(titles(visibleIssues(social, { platform: 'tiktok' })), ['Antrean BBM', 'Laga bola'], 'twenty sampled posts are not a figure to order by');
  assert.deepEqual(titles(visibleIssues(social, { platform: 'instagram' })), ['Antrean BBM']);
  assert.equal(platformFigure(social[0], 'x'), 625);
  assert.equal(platformFigure(social[1], 'x'), null, 'the posts that found an issue are not a count');
  assert.equal(platformFigure(social[0], 'tiktok'), null);
});

test('only platforms with an issue in the refresh are offered, and the chosen one always is', () => {
  assert.deepEqual(offeredPlatforms(issues, '').map(([id]) => id), ['', 'news', 'youtube', 'search']);
  assert.deepEqual(offeredPlatforms(social, '').map(([id]) => id), ['', 'news', 'x', 'tiktok', 'instagram']);
  assert.deepEqual(offeredPlatforms(social.slice(3), 'tiktok'), [['', 'Semua platform'], ['news', 'Berita'], ['tiktok', 'TikTok']], 'so a choice that has no issues any more can still be dropped');
  assert.deepEqual(offeredPlatforms(null, ''), [['', 'Semua platform']]);
});

test('X has a bar when it was counted; TikTok and Instagram say what a sample found and draw no bar', () => {
  assert.deepEqual(platformMeters(social[0], social), [
    { id: 'news', label: 'Berita', text: '40 artikel', ratio: 40 / 90 },
    { id: 'x', label: 'X', text: '625+ posting', ratio: 625 / 9700, hint: 'X: sedikitnya 625 posting terpantau sejak kemarin' },
    { id: 'tiktok', label: 'TikTok', text: '20+ ditemukan', ratio: null, hint: 'TikTok: sampel 20 posting terisi penuh, jumlah sebenarnya lebih banyak' },
    { id: 'instagram', label: 'Instagram', text: '12 ditemukan', ratio: null, hint: 'Instagram: 12 posting ditemukan dalam sampel 3 hari terakhir' },
  ]);
  assert.deepEqual(platformMeters(social[1], social), [{ id: 'x', label: 'X', text: '3 posting contoh', ratio: null, hint: 'X: ditemukan lewat 3 posting, belum dihitung' }]);
});

test('social figures say what they are: a count since yesterday, or what a sample found', () => {
  assert.deepEqual(figureLine(social[0]), ['Berita 40 artikel', 'X 625+ posting sejak kemarin', 'TikTok 20+ posting ditemukan', 'Instagram 12 posting ditemukan']);
  assert.deepEqual(figureLine(social[1]), ['X 3 posting contoh']);
  assert.equal(figureLine(social[0], 'tiktok')[0], 'TikTok 20+ posting ditemukan');
  assert.deepEqual(platformCoverage(social), [{ id: 'news', label: 'Berita', count: 3 }, { id: 'x', label: 'X', count: 3 }, { id: 'tiktok', label: 'TikTok', count: 2 }, { id: 'instagram', label: 'Instagram', count: 1 }]);
});

test('signals found on X are counted with the rest, and a social platform that was not read in full is said so', () => {
  assert.deepEqual(radarFigures({ issues: social, signals: { news: 122, search: 54, youtube: 51, x: 7 }, provinces_read: [] }).signals, { total: 234, news: 122, search: 54, youtube: 51, x: 7 });
  const payload = { updated_at: '2026-11-15T01:10:00', daily_at: '08:00', enabled: true, missing: ['ID-PA', 'x', 'tiktok'] };
  assert.equal(freshnessText(payload, new Date('2026-11-15T01:30:00Z')), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB; Papua tidak terbaca; X belum lengkap; TikTok belum lengkap');
  const carried = { updated_at: '2026-11-15T01:10:00', daily_at: '08:00', enabled: true, missing: [], x_searched_at: '2026-11-15T00:40:00' };
  assert.equal(freshnessText(carried, new Date('2026-11-15T01:30:00Z')), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB; isu dari X dicari 07.40 WIB', 'X is searched once a day: its issues can be older than the list');
  assert.equal(freshnessText({ ...carried, x_searched_at: '2026-11-14T02:00:00' }, new Date('2026-11-15T01:30:00Z')), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB; isu dari X dicari 14 Nov 2026, 09.00 WIB');
  assert.equal(freshnessText({ ...carried, x_searched_at: null }, new Date('2026-11-15T01:30:00Z')), 'Diperbarui 08.10 WIB, otomatis setiap hari pukul 08.00 WIB');
});

// ── A top ten per platform ──────────────────────────────────────────────────────────────────────────────────────────

test('each platform with a figure to order by gets its own top ten, loudest first; the sampled platforms get none', () => {
  const tops = platformTops(issues, {});
  assert.deepEqual(tops.map(top => [top.id, top.label, top.basis]), [['news', 'Berita', 'Jumlah artikel.'], ['youtube', 'YouTube', 'Tayangan video tren.'], ['search', 'Google', 'Pencarian, batas bawah.']]);
  assert.deepEqual(tops[0].rows.map(row => [row.key, row.title, row.text, row.ratio]), [['k1', 'Pengunduran diri Wapres', '212 artikel', 1], ['k2', 'Pertemuan di Bogor', '64 artikel', 64 / 212],
    ['k4', 'Perampokan di Malang', '22 artikel', 22 / 212], ['k3', 'Timnas Indonesia', '18 artikel', 18 / 212]]);
  assert.deepEqual(tops[1].rows.map(row => [row.title, row.text, row.ratio]), [['Pengunduran diri Wapres', '9.000.000 tayangan', 1]], 'videos are ordered by views, so views are what the row says');
  assert.deepEqual(tops[2].rows.map(row => [row.title, row.text, row.ratio]), [['Timnas Indonesia', '10.000+ pencarian', 1], ['Pengunduran diri Wapres', '5.000+ pencarian', 0.5]]);
  const withX = platformTops(social, {});
  assert.deepEqual(withX.map(top => [top.id, top.basis]), [['news', 'Jumlah artikel.'], ['x', 'Terpantau sejak kemarin.']], 'TikTok and Instagram are samples: there is no order to list');
  assert.deepEqual(withX[1].rows.map(row => [row.title, row.text]), [['Laga bola', '9.700+ posting'], ['Antrean BBM', '625+ posting']], 'an issue found on X but not counted has no place in an order; a count is a lower bound and says so');
});

test('a top ten follows the category and the province of the page, holds ten rows at most, and is absent when nothing has a figure', () => {
  assert.deepEqual(platformTops(issues, { category: 'hukum' }).map(top => [top.id, top.rows.map(row => row.title)]), [['news', ['Perampokan di Malang']]]);
  assert.deepEqual(platformTops(issues, { province: 'ID-BA' }).map(top => [top.id, top.rows.map(row => row.title)]), [['search', ['Cek BSU']]]);
  assert.deepEqual(platformTops(issues, { platform: 'search' }).map(top => top.id), ['news', 'youtube', 'search'], 'the platform that orders the main list does not narrow this row');
  const many = Array.from({ length: 14 }, (_, index) => issue(index + 1, 'Isu ' + (index + 1), 'politik', { news: { count: 100 - index } }));
  assert.deepEqual(platformTops(many, {})[0].rows.map(row => row.title), many.slice(0, 10).map(row => row.title));
  assert.deepEqual(platformTops(null, {}), []);
  assert.deepEqual(platformTops([issue(1, 'Hanya sampel', 'politik', { tiktok: { found: 3, capped: false }, x: { posts: 2 } })], {}), []);
});

test('an issue picture is shown only when it is a link from a host the lists use, and a column row carries it', () => {
  const thumb = 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg', photo = 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcTerm000000000';
  assert.deepEqual(issueImage({ image: { url: thumb, source: 'Kanal Bola', kind: 'video' } }), { url: thumb, source: 'Kanal Bola', kind: 'video' });
  assert.deepEqual(issueImage({ image: { url: photo, source: 7, kind: 'lain' } }), { url: photo, source: null, kind: 'photo' });
  for (const url of ['https://evil.example/a.png', 'http://i.ytimg.com/vi/vid00000001/mqdefault.jpg', 'javascript:alert(1)', 'https://i.ytimg.com/vi/vid00000001/../x.jpg',
    'https://encrypted-tbn2.gstatic.com.evil.example/images?q=tbn:ANd9GcTerm000000000', photo + '"onerror="x']) assert.equal(issueImage({ image: { url } }), null, url);
  assert.equal(issueImage({}), null);
  assert.equal(issueImage(null), null);
  assert.equal(issueImage({ image: { url: photo, source: 'https://www.janalokajournal.id/' } }).source, 'janalokajournal.id', 'a source given as an address is named by its site');
  assert.equal(issueImage({ image: { url: photo, source: 'javascript:alert(1)' } }).source, 'javascript:alert(1)', 'and anything else is text, never a link');
  const row = platformTops([issue(1, 'A', 'olahraga', { news: { count: 4 } }, { image: { url: thumb, source: 'K', kind: 'video' } })], {})[0].rows[0];
  assert.deepEqual([row.category, row.image], ['olahraga', { url: thumb, source: 'K', kind: 'video' }]);
});
