import test from 'node:test';
import assert from 'node:assert/strict';
import { spikeFacts, spikeLines } from './pulseTrendSpikes.js';

// Which buckets are spikes is decided on the server; the cases that used to be here are the first tests of
// server/tests/test_pulse_spikes.py, with the same figures. What follows is how a spike is described.

const post = (id, platform, author, interactions, text = 'Isi posting ' + id, when = '2026-11-12T05:00:00Z') => ({ id, platform, author, text, published_at: when,
  metrics: interactions === null ? {} : { likes: interactions } });
const row = { key: '2026-11-12', from: '2026-11-12', to: '2026-11-12' };
const name = platform => ({ x: 'X', tiktok: 'TikTok', news: 'Berita' })[platform] || platform;

test('what is said about a spike in interactions is who brought them: the posts with the most, and their share', () => {
  const posts = [
    post('a', 'tiktok', 'kabar.viral', 6000, 'Video penyadapan yang ramai dibagikan ulang oleh banyak akun sepanjang hari ini dan terus naik'),
    post('b', 'x', 'warga', 2500), post('c', 'x', 'warga', 1000), post('d', 'news', 'Kompas.com', 500),
    post('z', 'x', 'lain', 9999, 'hari lain', '2026-11-10T05:00:00Z'),          // another day: not part of this spike
    post('n', 'x', 'tanpa_angka', null),                                         // no figures reported: adds nothing, claims nothing
  ];
  const facts = spikeFacts(posts, row);
  assert.equal(facts.posts, 5);
  assert.deepEqual(facts.platforms[0], { platform: 'x', count: 3, share: 0.6 });
  assert.deepEqual(facts.top.map(item => [item.id, item.interactions]), [['a', 6000], ['b', 2500], ['c', 1000]]);
  assert.equal(facts.top[0].share, 0.6);
  assert.equal(facts.topShare, 0.95);
  const lines = spikeLines(facts, { key: row.key, value: 10000, usual: 2000, times: 5 }, 'interactions', { unit: 'day', platformName: name });
  assert.deepEqual(lines, [
    '10.000 interaksi, 5× hari biasa pada rentang ini.',
    '60% dari satu posting: @kabar.viral di TikTok, “Video penyadapan yang ramai dibagikan ulang oleh banyak akun sepanjang hari ini…”',
    'Tiga posting teratas menyumbang 95%.',
  ]);
});

test('what is said about a spike in posts is where they came from and who posted most', () => {
  const posts = [post('a', 'x', 'warga', 10), post('b', 'x', 'warga', 5), post('c', 'x', 'Warga', 1), post('d', 'x', 'lain', 900), post('e', 'news', 'Kompas.com', null), post('f', 'news', 'Kompas.com', null)];
  const facts = spikeFacts(posts, row);
  assert.deepEqual(facts.accounts.slice(0, 2), [{ author: 'warga', platform: 'x', count: 3 }, { author: 'Kompas.com', platform: 'news', count: 2 }]);
  const lines = spikeLines(facts, { key: row.key, value: 6, usual: 0, times: null }, 'posts', { unit: 'week', platformName: name });
  assert.deepEqual(lines, [
    '6 posting, sementara minggu lain pada rentang ini umumnya kosong.',
    'Terbanyak dari X: 4 posting (67%).',
    'Paling banyak memposting: @warga (3), Kompas.com (2).',
    'Posting paling ramai: @lain di X, 900 interaksi.',
  ]);
  // One post per account and no figures: only what is known is said.
  const plain = spikeLines(spikeFacts([post('a', 'x', 'satu', null), post('b', 'x', 'dua', null)], row), { key: row.key, value: 2, usual: 1, times: 2 }, 'posts', { platformName: name });
  assert.deepEqual(plain, ['2 posting, 2× hari biasa pada rentang ini.', 'Terbanyak dari X: 2 posting (100%).']);
});

test('nothing is said in words of cause, and a number is never split across what is not known', () => {
  const facts = spikeFacts([post('a', 'x', 'warga', 100)], row);
  const lines = spikeLines(facts, { key: row.key, value: 100, usual: 10, times: 10 }, 'interactions', { platformName: name });
  assert.deepEqual(lines, ['100 interaksi, 10× hari biasa pada rentang ini.', 'Seluruhnya dari satu posting: @warga di X, “Isi posting a”']);
  assert.doesNotMatch(lines.join(' '), /karena|penyebab|akibat|dipicu/i);
  assert.deepEqual(spikeLines(spikeFacts([], row), { key: row.key, value: 0, usual: 0, times: null }, 'interactions'), []);
});

test('the parts of a spike add up to the whole and name only what is known', async () => {
  const { spikeSegments } = await import('./pulseTrendSpikes.js');
  const posts = [
    ...Array.from({ length: 6 }, (_, index) => post('x' + index, 'x', 'akun' + index, 10)),
    post('t1', 'tiktok', 'video', 6000), post('t2', 'tiktok', 'video2', 2000),
    post('n1', 'news', 'Kompas.com', 1000), post('y1', 'youtube', 'Kanal', 500), post('r1', 'reddit', 'u_satu', 440),
  ];
  const facts = spikeFacts(posts, row);
  const byPlatform = spikeSegments(facts, 'posts');
  assert.deepEqual(byPlatform.map(part => [part.id, part.count]), [['x', 6], ['tiktok', 2], ['news', 1], ['rest', 2]], 'three platforms by name, the others together');
  assert.equal(Math.round(byPlatform.reduce((sum, part) => sum + part.share, 0) * 1000), 1000);
  const bySource = spikeSegments(facts, 'interactions');
  assert.deepEqual(bySource.map(part => part.id), ['top', 'next', 'rest']);
  assert.equal(bySource[0].share, 0.6);
  assert.equal(Math.round(bySource[1].share * 100), 30);          // the second and third post together
  assert.equal(bySource[1].posts, 2);
  assert.equal(Math.round(bySource[2].share * 100), 10);
  // One post carries everything: one part, nothing invented around it.
  assert.deepEqual(spikeSegments(spikeFacts([post('a', 'x', 'warga', 100)], row), 'interactions').map(part => [part.id, part.share]), [['top', 1]]);
  assert.deepEqual(spikeSegments(spikeFacts([post('a', 'x', 'warga', null)], row), 'interactions'), [], 'no figures reported: no bar');
  assert.deepEqual(spikeSegments(spikeFacts([], row), 'posts'), []);
});

// ── How a spike began: six hours, read together ─────────────────────────────────────────────────────────────────────
// 10 Nov 2026 in WIB. A post is written with its WIB hour and minute; date-only posts carry midnight UTC, as the
// sources that give no clock store them.
let serial = 0;
const at = (hour, minute, platform, author, group, extra = {}) => ({ id: 'p' + (++serial), platform, author, issue_id: group, text: extra.text || `Isi ${group || 'lepas'}`,
  published_at: new Date(Date.UTC(2026, 10, 10, hour - 7, minute)).toISOString(), metrics: extra.metrics || {} });
const many = (count, hour, platform, group, prefix) => Array.from({ length: count }, (_, index) => at(hour, 10 + index, platform, `${prefix}${index}`, group));
const spikeDay = { key: '2026-11-10', from: '2026-11-10', to: '2026-11-10' };
const dayPosts = () => [
  ...[9, 10, 11, 12].flatMap(hour => many(2, hour, 'news', null, 'media' + hour)),            // an ordinary morning
  at(13, 4, 'x', 'awal', 'g1', { text: 'Kabar pengunduran diri mulai beredar di linimasa' }),  // the first of the group that starts
  ...many(4, 13, 'x', 'g1', 'ikut'),
  ...many(8, 14, 'x', 'g1', 'lagi'),
  ...many(12, 15, 'x', null, 'ramai'), ...many(8, 15, 'tiktok', 'g2', 'video'),
  ...many(20, 16, 'tiktok', 'g2', 'viral'), ...many(10, 16, 'x', null, 'puncak'),
  ...many(15, 17, 'tiktok', null, 'sisa'), ...many(10, 18, 'x', null, 'malam'), ...many(3, 20, 'x', null, 'larut'),
  ...Array.from({ length: 4 }, (_, index) => ({ id: 'd' + index, platform: 'tiktok', author: 'tanpa_jam' + index, issue_id: 'g9', text: 'Hanya bertanggal', published_at: '2026-11-10T00:00:00Z', metrics: { likes: 9000 } })),
];

test('the start of a spike is read in six hours: when it rose, where it moved first, and which group came first', async () => {
  const { spikeOnset } = await import('./pulseTrendSpikes.js');
  const onset = spikeOnset(dayPosts(), spikeDay);
  // Hours 13 to 16 each reach 15% of the peak hour (30 posts at 16), 12 does not: the rise starts at 13, and the
  // window opens one hour earlier so that whoever moved first is inside it.
  assert.deepEqual([onset.startHour, onset.endHour, onset.peakHour], [12, 18, 16]);
  assert.deepEqual(onset.hours, [{ hour: 12, count: 2 }, { hour: 13, count: 5 }, { hour: 14, count: 8 }, { hour: 15, count: 20 }, { hour: 16, count: 30 }, { hour: 17, count: 15 }]);
  assert.deepEqual([onset.posts, onset.timed, onset.dateOnly], [80, 99, 4], 'date-only posts cannot be put in an hour: counted, and left out');
  assert.deepEqual(onset.early, { platform: 'x', count: 5, of: 7 }, 'the first two hours of the window');
  assert.deepEqual(onset.platforms.map(part => [part.id, part.count]), [['tiktok', 43], ['x', 35], ['news', 2]]);
  assert.deepEqual({ id: onset.starter.id, time: onset.starter.time, author: onset.starter.author, platform: onset.starter.platform, count: onset.starter.count },
    { id: 'g1', time: '13.04', author: 'awal', platform: 'x', count: 13 });
  assert.equal(onset.starter.title, 'Kabar pengunduran diri mulai beredar di linimasa');
  assert.deepEqual([onset.largest.id, onset.largest.count, onset.largest.time], ['g2', 28, '15.10']);
  assert.deepEqual(onset.first.map(post => [post.time, post.author]), [['12.10', 'media120'], ['12.11', 'media121'], ['13.04', 'awal']]);
});

test('what cannot be read by the hour is not guessed', async () => {
  const { spikeOnset } = await import('./pulseTrendSpikes.js');
  assert.equal(spikeOnset(dayPosts(), { key: '2026-11-09', from: '2026-11-09', to: '2026-11-15' }), null, 'a week has no single start hour');
  assert.equal(spikeOnset(dayPosts().filter(post => !post.published_at.endsWith('T00:00:00.000Z')).slice(0, 6), spikeDay), null, 'too few posts with a clock');
  const dateOnly = Array.from({ length: 40 }, (_, index) => ({ id: 'o' + index, platform: 'tiktok', author: 'a' + index, published_at: '2026-11-10T00:00:00Z', metrics: {} }));
  assert.equal(spikeOnset(dateOnly, spikeDay), null, 'no post of the day carries a clock');
  // No group stands out: the platform and the first posts are still said, the group is left empty.
  const loose = spikeOnset(dayPosts().map(post => ({ ...post, issue_id: null })), spikeDay);
  assert.equal(loose.starter, null);
  assert.equal(loose.largest, null);
  assert.equal(loose.early.platform, 'x');
});

test('the six hours are told as one combined reading, in order of time and without a cause', async () => {
  const { spikeOnset, onsetLines } = await import('./pulseTrendSpikes.js');
  const lines = onsetLines(spikeOnset(dayPosts(), spikeDay), { platformName: name });
  assert.deepEqual(lines, [
    'Awal lonjakan, 12.00 sampai 18.00 WIB: 80 dari 99 posting berjam hari itu, tertinggi pukul 16.00.',
    'Lebih dulu ramai di X (5 dari 7 posting pada dua jam pertama); selama enam jam terbanyak dari TikTok (54%).',
    'Kelompok percakapan paling awal: “Kabar pengunduran diri mulai beredar di linimasa”, pertama pukul 13.04 oleh @awal di X, 13 posting dalam enam jam.',
    'Kelompok terbesar pada enam jam itu: “Isi g2”, 28 posting, pertama pukul 15.10.',
    '4 posting hanya bertanggal tanpa jam, jadi tidak ikut dibaca per jam.',
  ]);
  assert.doesNotMatch(lines.join(' '), /karena|penyebab|dipicu|memicu/i);
  assert.deepEqual(onsetLines(null), []);
});
