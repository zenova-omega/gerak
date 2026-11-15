import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { accountPins, bubbleRadius, mapViews, panBox, placePoint, shadeRanges, shadeStep, viewOf, zoomBox } from '../lib/pulseRegionMap.js';

const post = (id, published_at, title, text = '', metrics = {}) => ({ id, published_at, title, text, platform: 'x', author: 'akun_' + id, url: 'https://x.com/akun/status/' + id, metrics });
const posts = [
  post('a', '2026-11-03T05:00:00Z', 'Demo di Bandung', '', { likes: 5 }),
  post('b', '2026-11-03T18:30:00Z', 'Aksi serupa di Surabaya'),
  post('c', '2026-11-05T05:00:00Z', 'Bandung dan Bekasi kembali ramai', 'Massa dari Surabaya ikut datang', { likes: 90 }),
  post('d', '2026-11-05T06:00:00Z', 'Tidak menyebut tempat'),
  post('e', '2026-11-07T06:00:00Z', 'Pernyataan resmi'),
];

async function render(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: RegionSpreadMap } = await server.ssrLoadModule('/src/pulse/RegionSpreadMap.jsx');
    return renderToStaticMarkup(React.createElement(RegionSpreadMap, props));
  } finally { await server.close(); }
}
const group = (html, name) => html.match(new RegExp(`<div[^>]*role="group"[^>]*aria-label="${name}"[^>]*>[\\s\\S]*?</div>`))?.[0] || '';
const pressed = markup => [...markup.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map(match => match[1]);
const count = (html, pattern) => (html.match(pattern) || []).length;
const status = html => html.match(/<p[^>]*class="rm-status"[^>]*>([\s\S]*?)<\/p>/)?.[1].replace(/<[^>]+>/g, '') ?? null;
const ranked = html => [...(html.match(/<ol[^>]*class="rm-rank"[\s\S]*?<\/ol>/)?.[0] || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

test('a bubble grows with the square root of its count, between a smallest and a largest size', () => {
  assert.equal(bubbleRadius(0, 100), 0);
  assert.equal(bubbleRadius(100, 100), 17);
  assert.equal(bubbleRadius(1, 100), 4, 'one post is still visible');
  assert.ok(Math.abs(bubbleRadius(25, 100) - 8.5) < 0.01, 'a quarter of the posts is half the radius, so the area tells the count');
  assert.equal(bubbleRadius(3, 3), 17);
  assert.equal(mapViews.all.box[2] / mapViews.all.box[3], mapViews.java.box[2] / mapViews.java.box[3], 'both views share one shape, so switching does not move the page');
});

test('a province is shaded in five steps, darker with more, and the legend can say which counts each step covers', () => {
  assert.deepEqual([0, 1, 15, 16, 60, 61, 136, 137, 241, 242, 378].map(count => shadeStep(count, 378)), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual(shadeRanges(378), [{ step: 1, from: 1, to: 15 }, { step: 2, from: 16, to: 60 }, { step: 3, from: 61, to: 136 }, { step: 4, from: 137, to: 241 }, { step: 5, from: 242, to: 378 }]);
  assert.deepEqual(shadeRanges(3), [{ step: 3, from: 1, to: 1 }, { step: 5, from: 2, to: 3 }], 'steps that hold no whole number are left out');
  assert.deepEqual(shadeRanges(0), []);
  assert.equal(shadeStep(5, 0), 0);
});

test('the map can be brought closer around a point and moved, and never leaves the drawing', () => {
  assert.deepEqual(viewOf(mapViews.all.box).zoom, 1);
  assert.deepEqual(viewOf(mapViews.java.box).zoom, 4);
  assert.deepEqual(zoomBox(mapViews.all.box, 2), [190, 82.5, 380, 165], 'twice as close around the middle');
  assert.deepEqual(zoomBox(mapViews.all.box, 2, [0, 0]), [0, 0, 380, 165], 'a corner stays inside');
  assert.deepEqual(zoomBox(mapViews.all.box, 0.5), [0, 0, 760, 330], 'not farther than the whole country');
  assert.equal(viewOf(zoomBox(mapViews.all.box, 1000)).zoom, 16, 'not closer than sixteen times');
  assert.deepEqual(zoomBox([190, 82.5, 380, 165], 0.5), [0, 0, 760, 330]);
  assert.deepEqual(panBox([190, 82.5, 380, 165], 50, -20), [240, 62.5, 380, 165]);
  assert.deepEqual(panBox([190, 82.5, 380, 165], 5000, 5000), [380, 165, 380, 165]);
});

test('accounts are pinned on their city or province, and pins that would overlap are counted together until the map is closer', () => {
  const [x, y] = placePoint('Bandung');
  assert.ok(Math.abs(x - 224.2) < 0.6 && Math.abs(y - 228.7) < 0.6, `Bandung at ${x}, ${y}`);
  assert.equal(placePoint('Kota Entah'), null);
  assert.equal(placePoint('Jakarta'), null, 'a city that fills its province uses the province point');
  const points = { 'ID-JB': [229.2, 229.8], 'ID-JK': [212.5, 218.2], 'ID-JI': [292, 239.5], 'ID-PA': [695.5, 185.2] };
  const account = (author, place, interactions) => ({ author, place, interactions });
  const rows = [
    { code: 'ID-JB', name: 'Jawa Barat', accounts: [account('@a', 'Bandung', 90), account('@b', 'Bogor', 40), account('@c', 'Jawa Barat', 30), account('@d', 'Cimahi', 5)] },
    { code: 'ID-JK', name: 'DKI Jakarta', accounts: [account('@j', 'Jakarta', 70)] },
    { code: 'ID-JI', name: 'Jawa Timur', accounts: [account('@e', 'Surabaya', 10)] },
    { code: 'ID-PA', name: 'Papua', accounts: [account('@f', 'Jayapura', 1)] },
  ];
  const whole = accountPins(rows, points, viewOf(mapViews.all.box));
  assert.deepEqual(whole.map(pin => [pin.label, pin.total, pin.code, pin.faces.map(face => face.author), pin.spots]),
    [['Bandung dan sekitarnya', 5, 'ID-JB', ['@a'], 5], ['Surabaya', 1, 'ID-JI', ['@e'], 1], ['Jayapura', 1, 'ID-PA', ['@f'], 1]],
    'from afar West Java and Jakarta are one pin with the strongest account; a pin shows one picture');
  assert.deepEqual(whole[0].faces[0].code, 'ID-JB');
  const close = accountPins(rows, points, viewOf(mapViews.java.box));
  assert.deepEqual(close.map(pin => [pin.label, pin.total, pin.faces.map(face => face.author)]),
    [['Bandung dan sekitarnya', 3, ['@a', '@c', '@d']], ['DKI Jakarta dan sekitarnya', 2, ['@j', '@b']], ['Surabaya', 1, ['@e']]],
    'closer, Bandung and Jakarta come apart (Bogor still touches Jakarta); a pin with room around it shows more of its accounts; Papua lies outside the view');
  const closest = accountPins(rows, points, viewOf(zoomBox(mapViews.all.box, 16, [224, 229])));
  assert.deepEqual(closest.map(pin => [pin.label, pin.total]), [['Bandung dan sekitarnya', 2], ['Bogor', 1], ['Jawa Barat', 1]],
    'at the closest view places stand alone, except towns that touch each other (Cimahi borders Bandung)');
  assert.deepEqual(accountPins([], points, viewOf(mapViews.all.box)), []);
});

test('the map opens on the last day with everything named so far, one outline per province and one bubble per named one', async () => {
  const html = await render({ posts });
  assert.match(html, /role="region"[^>]*aria-label="Peta sebaran tempat"/);
  assert.equal(count(html, /class="rm-province"/g), 34);
  assert.equal(count(html, /class="rm-bubble"/g), 2);
  assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="Peta Indonesia: 2 dari 34 provinsi disebut sampai 7 Nov 2026\. Terbanyak: Jawa Barat 2, Jawa Timur 2\."/);
  assert.equal(status(html), 'Sampai 7 Nov 2026: 3 dari 5 posting menyebut tempat, di 2 provinsi.');
  assert.deepEqual(ranked(html), ['Jawa Barat 2 posting sejak 3 Nov', 'Jawa Timur 2 posting sejak 4 Nov']);
  assert.match(html, /<input[^>]*type="range"[^>]*min="0"[^>]*max="4"[^>]*value="4"/);
  assert.match(html, /aria-valuetext="7 Nov 2026, hari ke-5 dari 5"/);
  assert.match(html, /<button[^>]*>(?:<svg[\s\S]*?<\/svg>)?Putar<\/button>/);
  assert.deepEqual(pressed(group(html, 'Tampilan peta')), ['Indonesia']);
  assert.deepEqual(pressed(group(html, 'Rentang waktu Peta sebaran tempat')), ['Semua']);
});

test('an earlier day shows only what was named by then, and marks what is new on it', async () => {
  const html = await render({ posts, initialDay: '2026-11-04' });
  assert.equal(status(html), 'Sampai 4 Nov 2026: 2 dari 2 posting menyebut tempat, di 2 provinsi. Baru hari ini: Jawa Timur.');
  // Many new provinces on one day are named up to four, the rest counted.
  const busy = ['Bandung', 'Surabaya', 'Medan', 'Makassar', 'Denpasar', 'Pontianak'].map((city, index) => post('n' + index, '2026-11-03T05:00:00Z', 'Aksi di ' + city));
  assert.match(status(await render({ posts: busy })), /Baru hari ini: Bali, Jawa Barat, Jawa Timur, Kalimantan Barat dan 2 lainnya\.$/, 'provinces with the same count are named in alphabetical order');
  assert.deepEqual(ranked(html), ['Jawa Barat 1 posting sejak 3 Nov', 'Jawa Timur 1 posting baru hari ini']);
  assert.equal(count(html, /class="rm-province"[^>]*data-state="fresh"/g), 1);
  assert.equal(count(html, /class="rm-province"[^>]*data-state="named"/g), 1);
  assert.match(html, /<input[^>]*type="range"[^>]*value="1"/);
  const first = await render({ posts, initialDay: '2026-11-03' });
  assert.equal(count(first, /class="rm-bubble"/g), 1);
});

test('a province is drawn darker the more it is named, and the map can be brought closer', async () => {
  const many = [...Array.from({ length: 9 }, (_, index) => post('j' + index, '2026-11-03T05:00:00Z', 'Aksi di Jakarta')), post('s', '2026-11-03T06:00:00Z', 'Aksi di Surabaya')];
  const html = await render({ posts: many });
  const shades = Object.fromEntries([...html.matchAll(/class="rm-province"[^>]*data-shade="(\d)"/g)].map(match => match[1]).reduce((tally, shade) => tally.set(shade, (tally.get(shade) || 0) + 1), new Map()));
  assert.deepEqual(shades, { 0: 32, 2: 1, 5: 1 }, 'the most named province is the darkest, one named once is light, the rest are not shaded');
  const ramp = html.match(/<li[^>]*class="rm-ramp"[\s\S]*?<\/li>/)[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(ramp, 'Makin gelap, makin banyak posting: 1 2–3 4–5 6–9', 'the legend says which counts each shade covers');
  const zoom = group(html, 'Perbesaran peta');
  assert.match(zoom, /<button[^>]*aria-label="Perbesar peta"/);
  assert.match(zoom, /<button[^>]*aria-label="Perkecil peta"[^>]*disabled=""/, 'the whole country cannot be made smaller');
});

test('the reader is told what the map shows and what it does not', async () => {
  const html = await render({ posts });
  assert.match(html, /bukan lokasi penulis/);
  assert.match(html, /Posting yang tidak menyebut tempat tidak digambar/);
  assert.match(html, /OpenStreetMap/);
  assert.match(html, /<ul[^>]*class="rm-legend"/);
  for (const label of ['Makin gelap, makin banyak posting', 'Baru hari ini', 'Belum disebut']) assert.match(html, new RegExp(`class="rm-legend"[\\s\\S]*?${label}`));
});

test('choosing a province lists the names found and the posts behind it, most interaction first', async () => {
  const html = await render({ posts, initialSelected: 'ID-JB' });
  const detail = html.match(/<section[^>]*class="rm-detail"[\s\S]*?<\/section>/)[0];
  assert.match(detail, /<h3[^>]*>Jawa Barat<\/h3>/);
  assert.match(detail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), /Bandung 2 .*Bekasi 1/);
  const links = [...detail.matchAll(/<a[^>]*href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(links, ['https://x.com/akun/status/c', 'https://x.com/akun/status/a', '/pulse/posts?province=ID-JB'], 'the two posts, then the way to all of them on Posting');
  assert.match(detail, /<a[^>]*><mark>Bandung<\/mark> dan Bekasi kembali ramai<\/a>/, 'the excerpt marks the name that put the post there');
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*aria-label="Jawa Barat, 2 posting[^"]*"/);
  // A province nobody named can be chosen too: the panel says so instead of staying empty.
  assert.match(await render({ posts, initialSelected: 'ID-PA' }), /Belum ada posting yang menyebut Papua sampai 7 Nov 2026/);
  // Before the day a province is first named, its posts are not listed yet.
  assert.match(await render({ posts, initialSelected: 'ID-JI', initialDay: '2026-11-03' }), /Belum ada posting yang menyebut Jawa Timur sampai 3 Nov 2026/);
});

test('the numbers behind the map are a table', async () => {
  const html = await render({ posts });
  const table = html.match(/<table[\s\S]*?<\/table>/)[0];
  for (const head of ['Provinsi', 'Pertama disebut', 'Sampai 7 Nov', 'Nama yang disebut']) assert.match(table, new RegExp(`<th[^>]*scope="col"[^>]*>${head}</th>`));
  assert.match(table, /<th[^>]*scope="row"[^>]*>Jawa Barat<\/th><td>3 Nov<\/td><td>2<\/td><td>Bandung 2, Bekasi 1<\/td>/);
});

test('the Java and Bali view draws the same data closer', async () => {
  const html = await render({ posts, initialView: 'java' });
  assert.deepEqual(pressed(group(html, 'Tampilan peta')), ['Jawa &amp; Bali']);
  assert.match(html, new RegExp(`<svg[^>]*viewBox="${mapViews.java.box.join(' ')}"`));
  assert.match(html, /aria-label="Peta Jawa dan Bali: /);
});

test('posts that name no place, or carry no date, leave a plain explanation and no empty map', async () => {
  const none = await render({ posts: [post('x', '2026-11-03T05:00:00Z', 'Pernyataan resmi')] });
  assert.match(none, /Belum ada posting yang menyebut provinsi, kota atau kabupaten/);
  assert.doesNotMatch(none, /class="rm-bubble"|type="range"|<table/);
  const undated = await render({ posts: [{ id: 'y', title: 'Demo di Bandung', metrics: {} }] });
  assert.match(undated, /Belum ada posting bertanggal/);
  assert.doesNotMatch(undated, /<svg[^>]*role="img"/);
  const mixed = await render({ posts: [...posts, { id: 'z', title: 'Demo di Medan', metrics: {} }] });
  assert.match(mixed, /1 posting yang menyebut tempat tidak bertanggal dan tidak masuk garis waktu/);
});

test('a range narrows the days of the timeline', async () => {
  const html = await render({ posts, initialRange: { key: 'custom', from: '2026-11-05', to: '2026-11-07' } });
  assert.deepEqual(pressed(group(html, 'Rentang waktu Peta sebaran tempat')), ['Rentang']);
  assert.match(html, /<input[^>]*type="range"[^>]*min="0"[^>]*max="2"[^>]*value="2"/);
  assert.equal(status(html), 'Sampai 7 Nov 2026: 1 dari 3 posting menyebut tempat, di 2 provinsi.');
});

test('the Jaringan page offers the map as one of its views', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: NetworkAnalysis } = await server.ssrLoadModule('/src/components/admin/pulse/NetworkAnalysis.jsx');
    const html = renderToStaticMarkup(React.createElement(NetworkAnalysis, { data: { nodes: [], edges: [], accounts: [], narratives: [], earliest: [], analyzed_posts: 0, total_posts: 0 }, posts }));
    const focus = group(html, 'Fokus analisis');
    assert.match(focus, /Peta sebaran/);
    assert.deepEqual([...focus.matchAll(/aria-pressed="true"/g)].length, 1, 'the page still opens on the account network');
  } finally { await server.close(); }
});

// ── The account view: X accounts by the location on their profile ───────────────────────────────────────────────────

const xpost = (id, published_at, author, location, metrics = {}) => ({ id, published_at, platform: 'x', author, title: '', text: 'teks', url: 'https://x.com/akun/status/' + id,
  metrics: { author_id: author, ...(location === undefined ? {} : { author_location: location }), ...metrics } });
const people = [
  xpost('1', '2026-11-03T05:00:00Z', '@a', 'Bandung, Jawa Barat', { likes: 5, author_followers: 900, profile_image_url: 'https://pbs.twimg.com/profile_images/1/a_200x200.jpg' }),
  xpost('2', '2026-11-05T05:00:00Z', '@a', 'Bandung, Jawa Barat', { likes: 7, author_followers: 900, profile_image_url: 'https://pbs.twimg.com/profile_images/1/a_200x200.jpg' }),
  xpost('3', '2026-11-04T05:00:00Z', '@b', 'bdg'),
  xpost('4', '2026-11-04T06:00:00Z', '@c', 'Bumi'),
  xpost('5', '2026-11-05T06:00:00Z', '@d', ''),
  xpost('6', '2026-11-05T07:00:00Z', '@e', undefined),
  xpost('7', '2026-11-06T07:00:00Z', '@f', 'Surabaya'),
  { ...post('8', '2026-11-07T07:00:00Z', 'Demo di Medan'), platform: 'news', author: 'Media' },
];

test('the account view pins X accounts on the province their profile names, with their picture', async () => {
  const html = await render({ posts: people, initialLayer: 'accounts' });
  assert.deepEqual(pressed(group(html, 'Isi peta')), ['Lokasi akun X']);
  assert.equal(status(html), 'Sampai 7 Nov 2026: 3 dari 6 akun X menulis lokasi profil yang bisa dipetakan, di 2 provinsi.');
  assert.equal(count(html, /class="rm-pin"/g), 2);
  assert.equal(count(html, /class="rm-bubble"/g), 0, 'accounts are pins, not bubbles');
  assert.match(html, /<span[^>]*class="rm-pin"[^>]*>(?:(?!<\/span><\/span>)[\s\S])*<img[^>]*class="rm-face"[^>]*src="https:\/\/pbs\.twimg\.com\/profile_images\/1\/a_200x200\.jpg"/, 'the strongest account of the province shows its picture');
  assert.match(html, /<b[^>]*class="rm-pin-count"[^>]*>2<\/b>/, 'and the pin counts the accounts there');
  assert.deepEqual(ranked(html), ['Jawa Barat 2 akun sejak 3 Nov', 'Jawa Timur 1 akun sejak 6 Nov']);
  assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="Peta Indonesia: 2 dari 34 provinsi punya akun X berlokasi profil sampai 7 Nov 2026\. Terbanyak: Jawa Barat 2, Jawa Timur 1\."/);
  assert.match(html, /bukan posisi saat memposting/);
  assert.match(html, /1 akun X belum diperiksa lokasinya/);
  assert.match(html, /1 akun menulis lokasi yang tidak menyebut provinsi/);
  // The other view is one press away and keeps the same day.
  assert.deepEqual(pressed(group(await render({ posts: people }), 'Isi peta')), ['Tempat disebut']);
});

test('the timeline of the account view adds accounts on the day of their first post', async () => {
  const html = await render({ posts: people, initialLayer: 'accounts', initialDay: '2026-11-04' });
  assert.equal(status(html), 'Sampai 4 Nov 2026: 2 dari 3 akun X menulis lokasi profil yang bisa dipetakan, di 1 provinsi.');
  assert.deepEqual(ranked(html), ['Jawa Barat 2 akun sejak 3 Nov']);
});

test('choosing a province in the account view lists its accounts with what they wrote', async () => {
  const html = await render({ posts: people, initialLayer: 'accounts', initialSelected: 'ID-JB' });
  const detail = html.match(/<section[^>]*class="rm-detail"[\s\S]*?<\/section>/)[0], text = detail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(detail, /<h3[^>]*>Jawa Barat<\/h3>/);
  assert.match(text, /2 akun X menulis lokasi di sini sampai 7 Nov 2026/);
  assert.match(text, /@a .*Bandung, Jawa Barat .*900 pengikut .*2 posting .*12 interaksi/);
  assert.match(text, /@b .*bdg .*1 posting/);
  assert.deepEqual([...detail.matchAll(/<a[^>]*href="([^"]+)"/g)].map(match => match[1]), ['/pulse/posts?author=%40a&amp;platform=x', '/pulse/posts?author=%40b&amp;platform=x']);
  assert.match(await render({ posts: people, initialLayer: 'accounts', initialSelected: 'ID-PA' }), /Belum ada akun X yang menulis lokasi di Papua sampai 7 Nov 2026/);
});

test('the numbers of the account view are a table too', async () => {
  const table = (await render({ posts: people, initialLayer: 'accounts' })).match(/<table[\s\S]*?<\/table>/)[0];
  for (const head of ['Provinsi', 'Pertama muncul', 'Akun sampai 7 Nov', 'Lokasi yang ditulis']) assert.match(table, new RegExp(`<th[^>]*scope="col"[^>]*>${head}</th>`));
  assert.match(table, /<th[^>]*scope="row"[^>]*>Jawa Barat<\/th><td>3 Nov<\/td><td>2<\/td><td>Bandung 2<\/td>/);
});

test('an account view without pins says why, and the other view stays in reach', async () => {
  const unasked = await render({ posts: [xpost('1', '2026-11-03T05:00:00Z', '@a', undefined), { ...post('2', '2026-11-04T05:00:00Z', 'Demo di Bandung'), platform: 'news' }], initialLayer: 'accounts' });
  assert.match(unasked, /Lokasi profil 1 akun X pada rentang ini belum diperiksa/);
  assert.doesNotMatch(unasked, /class="rm-pin"|<table/);
  assert.match(group(unasked, 'Isi peta'), /Tempat disebut/);
  const none = await render({ posts: [xpost('1', '2026-11-03T05:00:00Z', '@a', 'Bumi')], initialLayer: 'accounts' });
  assert.match(none, /Belum ada akun X yang menulis lokasi profil yang menyebut provinsi/);
  const other = await render({ posts: [{ ...post('2', '2026-11-04T05:00:00Z', 'Demo di Bandung'), platform: 'news' }], initialLayer: 'accounts' });
  assert.match(other, /Belum ada akun X pada rentang ini/);
});
