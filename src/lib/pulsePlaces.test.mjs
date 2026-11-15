import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accountDetail, accountSpread, namesProvince, placeAliases, placeTables, placeSnippet, placesIn, postPlaces, provinceDetail, provinceNames, provinceOfLocation, spreadByDay, spreadFrame, spreadTotals } from './pulsePlaces.js';
import { accountOrigin } from './pulseDemography.js';

const codes = text => placesIn(text).map(row => row.code);
const outline = JSON.parse(readFileSync(new URL('../pulse/indonesia-provinces.json', import.meta.url), 'utf8'));

test('a province is found by its name, its short form or one of its cities, once per post', () => {
  assert.deepEqual(placesIn('Demo mahasiswa di Bandung dan Bekasi ricuh'), [{ code: 'ID-JB', name: 'Jawa Barat', places: ['Bandung', 'Bekasi'] }]);
  assert.deepEqual(codes('Gubernur Jatim tinjau banjir'), ['ID-JI']);
  assert.deepEqual(codes('Banjir Jakarta meluas ke Tangerang, warga Sumut ikut menggalang bantuan'), ['ID-JK', 'ID-BT', 'ID-SU'], 'in the order the text names them');
  assert.deepEqual(placesIn('JAKARTA, jakarta, Jaksel')[0].places, ['Jakarta', 'Jaksel'], 'a name is listed once, however it is typed');
  assert.deepEqual(codes('Warga Bangka-Belitung dan Pangkal Pinang'), ['ID-BB']);
  assert.deepEqual(codes(''), []);
  assert.deepEqual(codes(null), []);
});

test('the longest name wins, so a part of a longer name is not counted as another province', () => {
  assert.deepEqual(codes('Kunjungan ke Kepulauan Riau'), ['ID-KR']);
  assert.deepEqual(codes('Banjir di Riau'), ['ID-RI']);
  assert.deepEqual(codes('Maluku Utara dan Papua Barat Daya'), ['ID-MU', 'ID-PB'], 'the provinces split from Papua after 2022 are drawn inside the 2017 outlines');
  assert.deepEqual(codes('Papua Pegunungan, Papua Selatan dan Papua Tengah'), ['ID-PA']);
  assert.deepEqual(codes('Padang Sidempuan diguyur hujan'), ['ID-SU']);
  assert.deepEqual(codes('Bandar Lampung macet'), ['ID-LA']);
  assert.deepEqual(codes('Ibu Kota Nusantara dan IKN'), ['ID-KI']);
});

test('only whole words count, and an island or a region is not a province', () => {
  assert.deepEqual(codes('Balikpapan'), ['ID-KI'], 'not Bali');
  assert.deepEqual(codes('Pemalang dan Semarang'), ['ID-JT'], 'not Malang, not Serang');
  assert.deepEqual(codes('Sumbawa'), ['ID-NB'], 'not Sumba');
  assert.deepEqual(codes('Pulau Jawa, Sumatera dan Kalimantan, seluruh nusantara'), []);
  assert.deepEqual(codes('Papua Nugini'), []);
});

test('a name that is also an ordinary word needs a capital letter or a place word before it', () => {
  assert.deepEqual(codes('nasib malang menimpa keluarga itu'), []);
  assert.deepEqual(codes('Nasib Malang Keluarga Korban'), [], 'a headline in capitals is still the ordinary word');
  assert.deepEqual(codes('kuliah di malang'), ['ID-JI']);
  assert.deepEqual(codes('Arema Malang menang'), ['ID-JI']);
  assert.deepEqual(codes('karier solo sang penyanyi'), []);
  assert.deepEqual(codes('Wali Kota Solo meresmikan pasar'), ['ID-JT']);
  assert.deepEqual(codes('palu hakim diketuk, Palu Arit jadi isu'), []);
  assert.deepEqual(codes('Gempa Palu dikenang'), ['ID-ST']);
  assert.deepEqual(codes('nasi padang dan padang pasir'), []);
  assert.deepEqual(codes('Gempa mengguncang Padang'), ['ID-SB']);
  assert.deepEqual(codes('medan perang politik, Medan Tempur'), []);
  assert.deepEqual(codes('Demo buruh di Medan'), ['ID-SU']);
  assert.deepEqual(codes('ayo bali'), [], 'Javanese for going home');
  assert.deepEqual(codes('Wisata Bali sepi, liburan ke bali'), ['ID-BA']);
});

test('a few names are so often something else that only a place word before them counts', () => {
  assert.deepEqual(codes('serang balik lawan politik'), []);
  assert.deepEqual(codes('SERANG BALIK'), []);
  assert.deepEqual(codes('Prabowo di serang isu penyadapan'), [], 'the passive written as two words');
  assert.deepEqual(codes('Banjir di Serang'), ['ID-BT']);
  assert.deepEqual(codes('warga kota serang mengungsi'), ['ID-BT']);
  assert.deepEqual(codes('Bima Arya dan Bima Sakti'), []);
  assert.deepEqual(codes('Bupati Bima'), ['ID-NB']);
  assert.deepEqual(codes('DIY skincare'), []);
  assert.deepEqual(codes('Polda DIY'), ['ID-YO']);
  assert.deepEqual(codes('Stasiun Lebak Bulus'), []);
});

test('a saying that names two ends of the country names no place', () => {
  assert.deepEqual(codes('Dari Sabang sampai Merauke rakyat menolak'), []);
  assert.deepEqual(codes('Bandara Sabang dan Kota Merauke'), ['ID-AC', 'ID-PA']);
});

test('account names and links are not text about a place, hashtags are', () => {
  assert.deepEqual(codes('via @infobandung https://jakarta.go.id/berita'), []);
  assert.deepEqual(codes('#SaveRajaAmpat #jakarta'), ['ID-PB', 'ID-JK']);
  assert.deepEqual(codes('<p>Banjir di <b>Semarang</b></p>'), ['ID-JT']);
});

test('the name of a news outlet, a site, a street or a broadcast channel is not a place the text talks about', () => {
  assert.deepEqual(codes('Gibran Diminta Mundur - Lombok Post'), []);
  assert.deepEqual(codes('TRIBUN-MEDAN.COM - Relawan berkumpul'), []);
  assert.deepEqual(codes('Simak di Kompas TV Medan, Radar Bogor dan Harian Jogja'), []);
  assert.deepEqual(codes('selengkapnya di babel.antaranews.com dan Harianjogja.com'), []);
  assert.deepEqual(placesIn('Bali Post memberitakan demo di Denpasar'), [{ code: 'ID-BA', name: 'Bali', places: ['Denpasar'] }]);
  assert.deepEqual(codes('Istana Wapres di Jalan Medan Merdeka Selatan'), []);
  assert.deepEqual(codes('Saluran: SumUt 28 UHF | Bali 39 UHF | Lampung 42 UHF'), []);
  assert.deepEqual(codes('Antara Jakarta dan Bandung macet'), ['ID-JK', 'ID-JB'], 'an ordinary word before a place is not an outlet');
});

test('a word typed all in capitals says nothing by its capitals', () => {
  assert.deepEqual(codes('SIAPAKAH GENK SOLO'), []);
  assert.deepEqual(codes('MENGETUK PALU SIDANG'), []);
  assert.deepEqual(codes('HARI INI PRABOWO KE PALU'), ['ID-ST'], 'a place word before it still counts');
  assert.deepEqual(codes('BANJIR JAKARTA'), ['ID-JK'], 'a name that is only a place is not affected');
  assert.deepEqual(codes('Unjuk rasa di DIY'), ['ID-YO'], 'a short form is written in capitals by nature');
});

test('a post is read by its title and its text, up to the lines that ask to subscribe', () => {
  const read = post => postPlaces(post).map(row => row.code);
  assert.deepEqual(read({ title: 'Aksi di Surabaya', text: 'Massa datang dari Bandung.' }), ['ID-JI', 'ID-JB']);
  assert.deepEqual(read({ title: 'Gibran mundur', text: 'Pernyataan disampaikan di Jakarta. Jangan lupa like, share, dan subscribe kanal YouTube KompasTV Biro Jember.' }), ['ID-JK'],
    'where a channel is based is not what the video is about');
  assert.deepEqual(read({ title: 'Siaran malam', text: 'Tonton kami. KompasTV Dewata Official Channel. Inspirasi Bali. Berita Terpercaya.' }), []);
  assert.deepEqual(read({ title: 'Subscribe kanal Medan Hari Ini', text: null }), ['ID-SU'], 'a title is always read in full');
  assert.deepEqual(read({}), []);
});

test('a long row of hashtags is there to be found, not to say where something happens', () => {
  assert.deepEqual(codes('Aksi hari ini #SaveRajaAmpat #papua'), ['ID-PB', 'ID-PA'], 'a few hashtags are part of what the post says');
  assert.deepEqual(codes('Cerita rakyat #film #fyp #viral #papua #jakarta #wedding #indonesia'), [], 'more than five hashtags: none of them is read');
  assert.deepEqual(codes('Banjir di Semarang #fyp #viral #papua #jakarta #wedding #indonesia'), ['ID-JT'], 'the words outside the hashtags still count');
});

test('lines that point to other stories are not read', () => {
  const read = post => postPlaces(post).map(row => row.code);
  assert.deepEqual(read({ title: 'Klarifikasi Presiden', text: 'Pernyataan di Jakarta. Baca Juga Kontak Tembak di Yahukimo Papua di kompas.tv' }), ['ID-JK']);
});

test('the name of the account that posted is not a place the post talks about', () => {
  const read = post => postPlaces(post).map(row => row.code);
  assert.deepEqual(read({ author: 'ANTARA News Sumbar', title: 'Jokowi soal surat pengunduran diri Wapres - ANTARA News Sumbar',
    text: '<a href="https://news.example/x">Jokowi soal surat pengunduran diri Wapres</a>&nbsp;&nbsp;<font color="#6f6f6f">ANTARA News Sumbar</font>' }), []);
  assert.deepEqual(read({ author: 'Lensa Medan', title: 'Demo di Padang meluas - Lensa Medan' }), ['ID-SB']);
  assert.deepEqual(read({ author: 'Info Bandung', title: 'INFO BANDUNG: banjir di Bandung selatan' }), ['ID-JB'], 'only the name itself is left out, in any case');
  assert.deepEqual(read({ author: 'Bandung', title: 'Banjir Bandung' }), ['ID-JB'], 'a one-word account name is too common a word to remove');
  assert.deepEqual(placeSnippet({ author: 'Lensa Medan', title: 'Kabar dari Medan - Lensa Medan' }, ['Medan'], 60), { before: 'Kabar dari ', match: 'Medan', after: ' -' });
});

test('the list covers exactly the provinces that are drawn, and a name belongs to one province', () => {
  assert.deepEqual(Object.keys(provinceNames).sort(), outline.provinces.map(province => province.code).sort());
  for (const province of outline.provinces) assert.equal(provinceNames[province.code], province.name);
  const seen = new Map();
  for (const [code, names] of Object.entries(placeAliases())) for (const name of names) {
    assert.ok(!seen.has(name.toLowerCase()), `${name} is listed for ${seen.get(name.toLowerCase())} and ${code}`);
    seen.set(name.toLowerCase(), code);
  }
  assert.ok(seen.size > 300);
});

const post = (id, published_at, title, text = '', metrics = {}) => ({ id, published_at, title, text, platform: 'x', author: 'akun_' + id, metrics });
const posts = [
  post('a', '2026-11-03T05:00:00Z', 'Demo di Bandung', '', { likes: 5 }),
  post('b', '2026-11-03T18:30:00Z', 'Aksi serupa di Surabaya'),                 // 01:30 WIB on 4 Nov
  post('c', '2026-11-05T05:00:00Z', 'Bandung dan Bekasi kembali ramai', 'Massa dari Surabaya ikut datang', { likes: 90 }),
  post('d', '2026-11-05T06:00:00Z', 'Tidak menyebut tempat'),
  post('e', '2026-11-07T06:00:00Z', 'Pernyataan resmi'),
  post('f', null, 'Tanpa tanggal, di Medan'),
];

test('the spread is counted per province and per day in WIB, over every day of the conversation', () => {
  const spread = spreadByDay(posts);
  assert.deepEqual(spread.days, ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
  assert.equal(spread.total, 6);
  assert.equal(spread.named, 3, 'dated posts that name a place');
  assert.equal(spread.undatedNamed, 1, 'a post without a date cannot be placed on the timeline');
  assert.deepEqual(spread.provinces.map(row => [row.code, row.first, row.total]), [['ID-JB', '2026-11-03', 2], ['ID-JI', '2026-11-04', 2]], 'in order of first appearance');
  assert.deepEqual(spread.provinces[0].byDay, { '2026-11-03': 1, '2026-11-05': 1 });
  assert.deepEqual(spread.provinces[0].places, [['Bandung', 2], ['Bekasi', 1]], 'the names behind a province, most used first');
  assert.deepEqual(spread.provinces[1].posts.map(row => row.id), ['c', 'b'], 'its posts, the most interaction first');
});

test('a frame of the timeline holds what was named up to that day and what is new on it', () => {
  const spread = spreadByDay(posts);
  const first = spreadFrame(spread, '2026-11-03');
  assert.deepEqual(first.rows.map(row => [row.code, row.count, row.today, row.fresh]), [['ID-JB', 1, 1, true]]);
  assert.equal(first.named, 1);
  const third = spreadFrame(spread, '2026-11-05');
  assert.deepEqual(third.rows.map(row => [row.code, row.count, row.today, row.fresh]), [['ID-JB', 2, 1, false], ['ID-JI', 2, 1, false]]);
  assert.equal(third.named, 3);
  assert.equal(third.posts, 4, 'all dated posts up to the day, named or not');
  assert.deepEqual(spreadFrame(spread, '2026-11-01').rows, []);
  assert.deepEqual(spreadFrame(spreadByDay([]), '2026-11-01'), { day: '2026-11-01', rows: [], named: 0, posts: 0 });
  assert.deepEqual(spreadByDay([]).days, []);
});

test('the detail of one province holds its names and posts up to the chosen day', () => {
  const spread = spreadByDay(posts);
  const early = provinceDetail(spread, 'ID-JB', '2026-11-03');
  assert.deepEqual([early.name, early.first, early.posts.map(row => row.id), early.places], ['Jawa Barat', '2026-11-03', ['a'], [['Bandung', 1]]]);
  const late = provinceDetail(spread, 'ID-JB', '2026-11-07');
  assert.deepEqual([late.posts.map(row => row.id), late.places], [['c', 'a'], [['Bandung', 2], ['Bekasi', 1]]]);
  assert.deepEqual(provinceDetail(spread, 'ID-JI', '2026-11-03'), { code: 'ID-JI', name: 'Jawa Timur', first: '2026-11-04', posts: [], places: [] }, 'not named yet on that day');
  assert.deepEqual(provinceDetail(spread, 'ID-PA', '2026-11-07'), { code: 'ID-PA', name: 'Papua', first: null, posts: [], places: [] });
  assert.equal(provinceDetail(spread, 'ID-XX', '2026-11-07'), null);
});

test('the excerpt of a post is cut around the place it names, so the reader can check the reading', () => {
  const filler = 'kata '.repeat(120);
  const snippet = placeSnippet({ title: 'Judul', text: filler + 'Jokowi hidup tenang di Solo sambil membina partai. ' + filler }, ['Solo'], 60);
  assert.equal(snippet.match, 'Solo');
  assert.ok(snippet.before.startsWith('…') && snippet.before.endsWith('tenang di '), snippet.before);
  assert.ok(snippet.after.startsWith(' sambil') && snippet.after.endsWith('…'), snippet.after);
  assert.ok((snippet.before + snippet.match + snippet.after).length <= 62);
  assert.deepEqual(placeSnippet({ title: 'Demo di Bandung', text: 'Bandung ramai' }, ['Bandung'], 60), { before: 'Demo di ', match: 'Bandung', after: '' }, 'the title is looked at first');
  assert.deepEqual(placeSnippet({ title: '', text: '<b>BALIKPAPAN</b> dan bali' }, ['Bali'], 60), { before: 'BALIKPAPAN dan ', match: 'bali', after: '' }, 'whole words, as typed, without markup');
  assert.deepEqual(placeSnippet({ title: '', text: 'Warga Bangka-Belitung resah' }, ['Bangka Belitung'], 60), { before: 'Warga ', match: 'Bangka-Belitung', after: ' resah' });
  assert.deepEqual(placeSnippet({ title: 'Judul saja', text: '' }, ['Solo'], 60), { before: 'Judul saja', match: '', after: '' }, 'nothing found: the start of the post');
  assert.deepEqual(placeSnippet({ title: '#bandung #viral', text: 'Banjir di Bandung' }, ['Bandung'], 60), { before: 'Banjir di ', match: 'Bandung', after: '' }, 'a name in the sentence is preferred to a hashtag');
  assert.deepEqual(placeSnippet({ title: 'Aksi #bandung', text: '' }, ['Bandung'], 60), { before: 'Aksi #', match: 'bandung', after: '' });
  assert.deepEqual(placeSnippet({}, [], 60), { before: '', match: '', after: '' });
});

// ── Profile locations of X accounts ─────────────────────────────────────────────────────────────────────────────────

test('a profile location is read as a place whatever its capitals, in Indonesian, English or a common short form', () => {
  assert.deepEqual(provinceOfLocation('Jakarta Selatan, Indonesia'), { code: 'ID-JK', name: 'DKI Jakarta', place: 'Jakarta' });
  const code = text => provinceOfLocation(text)?.code ?? null;
  assert.equal(code('solo'), 'ID-JT', 'in a location field an ordinary word is a place');
  assert.equal(code('malang, jawa timur'), 'ID-JI');
  assert.equal(code('serang'), 'ID-BT');
  assert.equal(code('DIY'), 'ID-YO');
  assert.equal(code('West Java, Indonesia'), 'ID-JB');
  assert.equal(code('Special Region of Yogyakarta'), 'ID-YO');
  assert.equal(code('Jakarta Capital Region'), 'ID-JK');
  assert.equal(code('Riau Islands'), 'ID-KR');
  assert.equal(code('North Sumatra'), 'ID-SU');
  assert.equal(code('Southwest Papua'), 'ID-PB');
  assert.deepEqual(provinceOfLocation('SBY'), { code: 'ID-JI', name: 'Jawa Timur', place: 'Surabaya' }, 'a short form people write on a profile');
  assert.equal(code('jkt | bdg'), 'ID-JK', 'the first place named');
  assert.equal(code('📍Bandung'), 'ID-JB');
  for (const none of ['Indonesia', 'Bumi Allah', 'Pulau Jawa', 'Papua Nugini', '', null, 42]) assert.equal(provinceOfLocation(none), null, String(none));
  // The short forms belong to profiles only: in a post "SBY" is a former president, not Surabaya.
  assert.deepEqual(codes('SBY disadap, kata warga Bandung'), ['ID-JB']);
  assert.deepEqual(codes('Aksi di West Java dan East Kalimantan'), ['ID-JB', 'ID-KI'], 'English province names are read in posts too');
});

const xpost = (id, published_at, author, location, metrics = {}) => ({ id, published_at, platform: 'x', author, title: '', text: 'teks',
  metrics: { author_id: author, ...(location === undefined ? {} : { author_location: location }), ...metrics } });
const accountPosts = [
  xpost('1', '2026-11-03T05:00:00Z', '@a', 'Bandung, Jawa Barat', { likes: 5, author_followers: 900 }),
  xpost('2', '2026-11-05T05:00:00Z', '@a', 'Bandung, Jawa Barat', { likes: 7, author_followers: 900 }),
  xpost('3', '2026-11-04T05:00:00Z', '@b', 'bdg'),
  xpost('4', '2026-11-04T06:00:00Z', '@c', 'Bumi'),            // a location that names no province
  xpost('5', '2026-11-05T06:00:00Z', '@d', ''),                // asked: the owner wrote none
  xpost('6', '2026-11-05T07:00:00Z', '@e', undefined),         // not asked yet
  xpost('7', '2026-11-06T07:00:00Z', '@f', 'Surabaya'),
  { id: '8', published_at: '2026-11-07T07:00:00Z', platform: 'news', author: 'Media', title: 'Di Medan', metrics: { author_location: 'Medan' } },   // not an X account
  xpost('9', null, '@g', 'Medan'),                             // no date: counted, but on no day of the timeline
];

test('X accounts are counted by the province their profile names, joining on the day of their first post', () => {
  const spread = accountSpread(accountPosts);
  assert.deepEqual(spread.days, ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'], 'the same days as the posts, so both views of the map share one timeline');
  assert.deepEqual([spread.total, spread.located, spread.named, spread.unasked], [7, 5, 4, 1], 'X accounts, with a location text, whose location names a province, not asked yet (account_origin_v1)');
  assert.deepEqual(spread.provinces.map(row => [row.code, row.first, row.total]), [['ID-JB', '2026-11-03', 2], ['ID-JI', '2026-11-06', 1], ['ID-SU', null, 1]]);
  // An account without a dated post is in the totals and on no day.
  const sum = byDay => Object.values(byDay).reduce((total, value) => total + value, 0);
  assert.deepEqual([sum(spread.postsByDay), sum(spread.namedByDay)], [6, 3]);
  assert.deepEqual(spread.provinces[2].byDay, {});
  assert.deepEqual(spreadFrame(spread, '2026-11-07').rows.map(row => row.code), ['ID-JB', 'ID-JI']);
  assert.deepEqual(accountDetail(spread, 'ID-SU', '2026-11-07'), { code: 'ID-SU', name: 'Sumatera Utara', first: null, accounts: [], places: [] });
  // One account (account_v1) whatever way its handle is written.
  const twoWays = accountSpread([xpost('b1', '2026-11-03T05:00:00Z', '@Budi', 'Bandung', { likes: 2 }), xpost('b2', '2026-11-04T05:00:00Z', 'budi', 'Bandung', { likes: 3 })]);
  assert.deepEqual([twoWays.total, twoWays.located, twoWays.named, twoWays.unasked], [1, 1, 1, 0]);
  assert.deepEqual(twoWays.postsByDay, { '2026-11-03': 1 });
  assert.deepEqual(twoWays.provinces[0].accounts.map(row => [row.author, row.platform, row.posts, row.interactions, row.first, row.post.id]), [['budi', 'x', 2, 5, '2026-11-03', 'b2']]);
  assert.deepEqual(spread.provinces[0].byDay, { '2026-11-03': 1, '2026-11-04': 1 });
  assert.deepEqual(spread.provinces[0].places, [['Bandung', 2]]);
  assert.deepEqual(spread.provinces[0].accounts.map(row => [row.author, row.posts, row.interactions, row.followers, row.location, row.place, row.first]),
    [['@a', 2, 12, 900, 'Bandung, Jawa Barat', 'Bandung', '2026-11-03'], ['@b', 1, null, null, 'bdg', 'Bandung', '2026-11-04']], 'most interaction first');
  assert.equal(spread.provinces[0].accounts[0].post.id, '2', 'the newest post of the account, for its picture');
  const frame = spreadFrame(spread, '2026-11-04');
  assert.deepEqual(frame.rows.map(row => [row.code, row.count, row.today, row.fresh]), [['ID-JB', 2, 1, false]]);
  assert.deepEqual([frame.named, frame.posts], [2, 3], 'accounts on the map and X accounts seen, up to the day');
  assert.deepEqual(accountSpread([]).days, []);
});

test('the detail of one province lists the accounts that had posted by the chosen day', () => {
  const spread = accountSpread(accountPosts);
  const early = accountDetail(spread, 'ID-JB', '2026-11-03');
  assert.deepEqual([early.name, early.first, early.accounts.map(row => row.author), early.places], ['Jawa Barat', '2026-11-03', ['@a'], [['Bandung', 1]]]);
  assert.deepEqual(accountDetail(spread, 'ID-JB', '2026-11-07').accounts.map(row => row.author), ['@a', '@b']);
  assert.deepEqual(accountDetail(spread, 'ID-PA', '2026-11-07'), { code: 'ID-PA', name: 'Papua', first: null, accounts: [], places: [] });
  assert.equal(accountDetail(spread, 'ID-XX', '2026-11-07'), null);
});

test('the totals of a spread rank the provinces for a summary, with the names behind each', () => {
  assert.deepEqual(spreadTotals(spreadByDay(posts)), [
    { code: 'ID-JB', name: 'Jawa Barat', count: 2, first: '2026-11-03', places: [['Bandung', 2], ['Bekasi', 1]] },
    { code: 'ID-JI', name: 'Jawa Timur', count: 2, first: '2026-11-04', places: [['Surabaya', 2]] },
  ], 'most first; equal counts by name');
  assert.deepEqual(spreadTotals(accountSpread(accountPosts)).map(row => [row.name, row.count]), [['Jawa Barat', 2], ['Jawa Timur', 1], ['Sumatera Utara', 1]], 'an account without a dated post counts here too');
  assert.deepEqual(spreadTotals(spreadByDay([])), []);
  assert.deepEqual(spreadTotals(null), []);
});

test('posts can be narrowed to the ones that name a province', () => {
  const rows = [{ id: 'a', title: 'Aksi di Bandung', text: '' }, { id: 'b', title: 'Aksi di Surabaya dan Bandung', text: '' }, { id: 'c', title: 'Pernyataan resmi', text: '' }];
  const ids = code => rows.filter(row => namesProvince(row, code)).map(row => row.id);
  assert.deepEqual(ids('ID-JB'), ['a', 'b']);
  assert.deepEqual(ids('ID-JI'), ['b']);
  assert.deepEqual(ids('ID-PA'), []);
  assert.deepEqual(ids(''), ['a', 'b', 'c'], 'no province: no narrowing');
});

// account_origin_v1 is the one rule the map and the Jaringan card count by: on every shared origin case, the spread's
// totals and province counts are the origin reading's own (the server checks location_summary the same way).
const demography = JSON.parse(readFileSync(new URL('../../shared/pulse-demography.cases.json', import.meta.url), 'utf8'));
const expand = rows => rows.flatMap(row => Array.from({ length: row.times ?? 1 }, (_, index) => {
  const { times, ...post } = row;
  if (typeof post.author === 'string') post.author = post.author.replace('{i}', String(index + 1).padStart(2, '0'));
  return post;
}));
for (const item of demography.origin) {
  test(`accountSpread counts by account_origin_v1: ${item.note}`, () => {
    const rows = expand(item.in), spread = accountSpread(rows), origin = accountOrigin(rows);
    assert.deepEqual({ total: spread.total, located: spread.located, named: spread.named, unasked: spread.unasked },
      { total: origin.accounts, located: origin.with_location, named: origin.province_read, unasked: origin.unasked });
    assert.equal(spread.provinces.reduce((sum, row) => sum + row.total, 0), origin.province_read);
    for (const province of origin.provinces) assert.equal(spread.provinces.find(row => row.code === province.code)?.total, province.accounts, province.code);
  });
}

// ── The server's twin ───────────────────────────────────────────────────────────────────────────────────────────────

const shared = JSON.parse(readFileSync(new URL('./pulsePlaces.cases.json', import.meta.url), 'utf8'));

test('every shared case reads the same here as it must on the server', () => {
  for (const [text, expected] of shared.texts) assert.deepEqual(codes(text), expected, text);
  for (const [text, expected] of shared.locations) assert.equal(provinceOfLocation(text)?.code ?? null, expected, text);
  for (const [post, expected] of shared.posts) assert.deepEqual(postPlaces({ ...post }).map(row => row.code), expected, JSON.stringify(post));
  assert.ok(shared.texts.length >= 60 && shared.locations.length >= 20 && shared.posts.length >= 10);
});

test('the list the server reads is the list of this module', () => {
  const stored = JSON.parse(readFileSync(new URL('../../server/app/services/pulse_places_data.json', import.meta.url), 'utf8'));
  assert.deepEqual(stored, JSON.parse(JSON.stringify(placeTables)), 'run: node scripts/build-pulse-places.mjs');
  assert.equal(Object.keys(placeTables.places).length, 34);
});
