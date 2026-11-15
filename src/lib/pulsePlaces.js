// Places named in the text of a post, by province, for the spread map on Jaringan.
//
// This reads what a post TALKS ABOUT, never where its author is: no source in use reports a location per post.
// The list is hand-kept: the 34 provinces of the 2017 outlines (src/pulse/indonesia-provinces.json) with their short
// forms, cities and regencies. The four provinces split from Papua in 2022 are listed under Papua and Papua Barat,
// because that is where the outlines draw them. Pure: no clock, no network.
import { sentimentDate } from './pulseSentiment.js';
import { postInteractions } from './pulseEngagement.js';

// Marks after a name:  ?  also an ordinary word or a person's name: counts with a capital letter or after a place word
//                      !  mostly something else: counts only after a place word (see STRONG and WEAK below)
const PLACES = {
  'ID-AC': 'Aceh|Banda Aceh|Lhokseumawe|Langsa|Sabang|Meulaboh|Pidie|Bireuen|Takengon|Simeulue|Singkil|Nagan Raya|Aceh Besar',
  'ID-SU': 'Sumatera Utara|Sumatra Utara|Sumut|Medan?|Binjai|Deli Serdang|Pematangsiantar|Pematang Siantar|Siantar|Sibolga|Nias|Tapanuli|Danau Toba|Samosir|Asahan|Langkat|Tebing Tinggi|Tanjungbalai|Padangsidimpuan|Padang Sidempuan|Padang Sidimpuan|Padang Lawas|Labuhanbatu|Mandailing Natal|Serdang Bedagai|Humbang Hasundutan|Dairi|Belawan|Kualanamu',
  'ID-SB': 'Sumatera Barat|Sumatra Barat|Sumbar|Padang?|Bukittinggi|Payakumbuh|Solok|Pariaman|Padang Pariaman|Padang Panjang|Mentawai|Pasaman|Tanah Datar|Limapuluh Kota|Pesisir Selatan|Dharmasraya|Sijunjung|Sawahlunto',
  'ID-RI': 'Riau|Pekanbaru|Dumai|Siak|Kampar|Bengkalis|Rokan Hulu|Rokan Hilir|Rohil|Rohul|Indragiri|Inhil|Inhu|Pelalawan|Kuansing|Kuantan Singingi|Meranti',
  'ID-KR': 'Kepulauan Riau|Kep Riau|Kepri|Batam|Tanjungpinang|Tanjung Pinang|Bintan|Karimun|Natuna|Anambas|Rempang',
  'ID-JA': 'Jambi|Kerinci|Muaro Jambi|Batanghari|Tanjung Jabung|Sarolangun|Merangin|Sungai Penuh',
  'ID-SS': 'Sumatera Selatan|Sumatra Selatan|Sumsel|Palembang|Prabumulih|Lubuklinggau|Lubuk Linggau|Musi Banyuasin|Banyuasin|Ogan Ilir|Ogan Komering|Muara Enim|Lahat|Pagar Alam|Pagaralam|Empat Lawang|Musi Rawas',
  'ID-BB': 'Kepulauan Bangka Belitung|Bangka Belitung|Babel?|Pangkalpinang|Pangkal Pinang|Bangka|Belitung|Belitong|Tanjung Pandan|Tanjungpandan|Sungailiat',
  'ID-BE': 'Bengkulu|Rejang Lebong|Mukomuko|Kepahiang|Seluma|Curup',
  'ID-LA': 'Lampung|Bandar Lampung|Pringsewu|Way Kanan|Pesawaran|Tanggamus|Tulang Bawang|Mesuji|Kalianda|Kotabumi',
  'ID-JK': 'DKI Jakarta|Jakarta|DKI|DKJ|Jaksel|Jakbar|Jaktim|Jakut|Jakpus|Kepulauan Seribu',
  'ID-JB': 'Jawa Barat|Jabar|Bandung|Bekasi|Bogor|Depok|Cirebon|Tasikmalaya|Sukabumi|Karawang|Garut|Cianjur|Cimahi|Purwakarta|Subang|Indramayu|Majalengka|Sumedang|Ciamis|Pangandaran|Cikarang|Cibinong|Jatinangor',
  'ID-BT': 'Banten|Tangerang|Tangsel|Serang!|Cilegon|Pandeglang|Rangkasbitung|Lebak!|Anyer',
  'ID-JT': 'Jawa Tengah|Jateng|Semarang|Solo?|Surakarta|Magelang|Pekalongan|Tegal|Banyumas|Purwokerto|Kudus!|Cilacap|Kebumen|Klaten|Boyolali|Sukoharjo|Wonogiri|Sragen|Karanganyar|Pati!|Jepara|Demak|Rembang?|Blora|Brebes|Pemalang|Kendal|Salatiga|Temanggung|Wonosobo|Purbalingga|Banjarnegara|Purworejo|Grobogan|Purwodadi|Ungaran',
  'ID-YO': 'DI Yogyakarta|Yogyakarta|Jogja|Jogjakarta|Yogya|Jogya|DIY!|Sleman|Bantul|Gunungkidul|Gunung Kidul|Kulon Progo|Kulonprogo',
  'ID-JI': 'Jawa Timur|Jatim|Surabaya|Malang?|Sidoarjo|Kediri|Madiun|Jember|Banyuwangi|Gresik|Madura|Bangkalan|Sampang|Pamekasan|Sumenep|Pasuruan|Probolinggo|Mojokerto|Jombang|Blitar|Tulungagung|Trenggalek|Ponorogo|Pacitan|Ngawi|Magetan|Nganjuk|Lamongan|Tuban|Bojonegoro|Lumajang|Bondowoso|Situbondo',
  'ID-BA': 'Bali?|Denpasar|Badung|Gianyar|Ubud|Buleleng|Singaraja|Tabanan|Karangasem|Klungkung|Jembrana|Bangli|Nusa Dua|Sanur|Canggu|Uluwatu|Nusa Penida|Seminyak',
  'ID-NB': 'Nusa Tenggara Barat|NTB|Mataram?|Lombok?|Sumbawa|Bima!|Dompu|Mandalika|Sembalun|Rinjani',
  'ID-NT': 'Nusa Tenggara Timur|NTT|Kupang|Flores|Labuan Bajo|Sumba|Sikka|Maumere|Alor|Rote|Lembata|Larantuka|Atambua|Ngada|Nagekeo|Timor Tengah Selatan|Timor Tengah Utara',
  'ID-KB': 'Kalimantan Barat|Kalbar|Pontianak|Singkawang|Sambas|Sintang|Sanggau|Kapuas Hulu|Kubu Raya|Mempawah|Bengkayang|Kayong Utara',
  'ID-KT': 'Kalimantan Tengah|Kalteng|Palangkaraya|Palangka Raya|Sampit|Kotawaringin|Pangkalan Bun|Katingan|Seruyan|Lamandau',
  'ID-KS': 'Kalimantan Selatan|Kalsel|Banjarmasin|Banjarbaru|Tanah Bumbu|Tabalong|Hulu Sungai|Tanah Laut|Batulicin',
  'ID-KI': 'Kalimantan Timur|Kaltim|Samarinda|Balikpapan|Bontang|Kutai|Kukar|Berau|Penajam|IKN|Ibu Kota Nusantara|Sangatta|Mahakam Ulu',
  'ID-KU': 'Kalimantan Utara|Kaltara|Tarakan|Nunukan|Bulungan|Malinau|Tanjung Selor|Sebatik',
  'ID-SA': 'Sulawesi Utara|Sulut|Manado|Bitung|Tomohon|Minahasa|Kotamobagu|Bolaang Mongondow|Sangihe|Talaud',
  'ID-GO': 'Gorontalo',
  'ID-ST': 'Sulawesi Tengah|Sulteng|Palu?|Poso|Morowali|Luwuk|Banggai|Donggala|Sigi|Tolitoli|Parigi Moutong',
  'ID-SR': 'Sulawesi Barat|Sulbar|Mamuju|Majene|Polewali|Polman|Mamasa|Pasangkayu',
  'ID-SN': 'Sulawesi Selatan|Sulsel|Makassar|Gowa|Bone?|Maros|Pangkep|Parepare|Palopo|Luwu|Toraja|Bulukumba|Bantaeng|Jeneponto|Takalar|Sinjai|Wajo|Soppeng|Pinrang|Enrekang|Sidrap|Selayar',
  'ID-SG': 'Sulawesi Tenggara|Sultra|Kendari|Baubau|Wakatobi|Konawe|Kolaka|Buton|Bombana',
  'ID-MA': 'Maluku|Ambon|Tual|Banda Neira|Saparua|Tanimbar|Masohi',
  'ID-MU': 'Maluku Utara|Malut|Ternate|Tidore|Halmahera|Morotai|Sofifi|Bacan',
  'ID-PA': 'Papua|Papua Selatan|Papua Tengah|Papua Pegunungan|Jayapura|Merauke|Timika|Mimika|Nabire|Wamena|Biak|Sentani|Asmat|Boven Digoel|Yahukimo|Puncak Jaya|Intan Jaya|Nduga|Jayawijaya|Paniai|Mappi|Keerom|Sarmi|Yapen|Serui|Dogiyai|Deiyai|Lanny Jaya|Tolikara|Pegunungan Bintang',
  'ID-PB': 'Papua Barat|Papua Barat Daya|Manokwari|Sorong|Raja Ampat|Fakfak|Kaimana|Bintuni|Wondama|Maybrat|Tambrauw',
};

// Province names as English texts and the location field of a profile write them ("West Java, Indonesia").
const ENGLISH = {
  'ID-SU': 'North Sumatra|North Sumatera', 'ID-SB': 'West Sumatra|West Sumatera', 'ID-SS': 'South Sumatra|South Sumatera', 'ID-KR': 'Riau Islands',
  'ID-JB': 'West Java', 'ID-JT': 'Central Java', 'ID-JI': 'East Java', 'ID-NB': 'West Nusa Tenggara', 'ID-NT': 'East Nusa Tenggara',
  'ID-KB': 'West Kalimantan', 'ID-KT': 'Central Kalimantan', 'ID-KS': 'South Kalimantan', 'ID-KI': 'East Kalimantan', 'ID-KU': 'North Kalimantan',
  'ID-SA': 'North Sulawesi', 'ID-ST': 'Central Sulawesi', 'ID-SR': 'West Sulawesi', 'ID-SN': 'South Sulawesi', 'ID-SG': 'Southeast Sulawesi|South East Sulawesi',
  'ID-MU': 'North Maluku', 'ID-PA': 'South Papua|Central Papua|Highland Papua', 'ID-PB': 'West Papua|Southwest Papua|South West Papua',
};

// Short forms people write in the location field of a profile. They are read there only: in a post "SBY" is a former
// president and "YK" can be anything.
const PROFILE_SHORT = { jkt: ['ID-JK', 'Jakarta'], bdg: ['ID-JB', 'Bandung'], bgr: ['ID-JB', 'Bogor'], bks: ['ID-JB', 'Bekasi'], dpk: ['ID-JB', 'Depok'], tng: ['ID-BT', 'Tangerang'],
  smg: ['ID-JT', 'Semarang'], yk: ['ID-YO', 'Yogyakarta'], sby: ['ID-JI', 'Surabaya'], mlg: ['ID-JI', 'Malang'], dps: ['ID-BA', 'Denpasar'],
  mdn: ['ID-SU', 'Medan'], pku: ['ID-RI', 'Pekanbaru'], plg: ['ID-SS', 'Palembang'], mks: ['ID-SN', 'Makassar'] };

// Word pairs that look like a place and are not: an idiom, a dish, a symbol, a person. They are skipped as a whole.
const NOT_PLACES = ('sabang sampai merauke|papua nugini|papua new guinea|lebak bulus|bima arya|bima sakti|menara babel|bank bali|medan satria|'
  + 'nasib malang|bernasib malang|malang nian|sungguh malang|malang benar|malang betul|malang melintang|malang tak|pria malang|wanita malang|bocah malang|anak malang|gadis malang|korban malang|'
  + 'karier solo|karir solo|solo karier|solo karir|album solo|penyanyi solo|debut solo|lagu solo|single solo|solo traveling|solo travelling|solo trip|solo player|solo leveling|solo riding|solo touring|solo hiking|gitar solo|solo gitar|han solo|'
  + 'palu hakim|palu arit|palu sidang|ketok palu|ketuk palu|ketukan palu|'
  + 'nasi padang|masakan padang|rumah makan padang|rm padang|warung padang|padang pasir|padang rumput|padang golf|padang mahsyar|padang bulan|padang savana|padang ilalang|'
  + 'medan merdeka|medan perang|medan tempur|medan pertempuran|medan laga|medan magnet|medan juang|medan listrik|medan berat|medan sulit|medan terjal|medan pertarungan|medan politik|medan dakwah|medan kurusetra|medan gaya|medan operasi|'
  + 'kerajaan mataram|kesultanan mataram|mataram kuno|mataram islam|rembang petang|roh kudus|tanah kudus').split('|');

const WEAK = new Set(['di', 'ke', 'dari']);
// A place right after or right before one of these words is the name of a news outlet ("Lombok Post", "Radar Bogor"),
// and a place followed by a number and a band is a line of a channel list ("Bali 39 UHF"): neither is what the text is about.
const OUTLET_BEFORE = new Set('tribun tribunnews radar harian koran kompastv tv inews tvri rri radio posmetro pos suara kabar warta metro haluan viva biro'.split(' '));
const OUTLET_AFTER = new Set('post pos tv ekspres express news today times globe daily tribune fm radio'.split(' '));
const BANDS = new Set(['uhf', 'vhf', 'mhz', 'khz', 'fm', 'am']);
const STRONG = new Set(('kota kabupaten kab provinsi prov wilayah daerah warga asal polda polres polresta polrestabes kapolda kapolres kodam kodim korem pangdam dandim '
  + 'pemprov pemkot pemkab pemda gubernur wagub bupati wabup walikota wawali dprd kejati kejari kajati kajari bandara pelabuhan kpu kpud bawaslu se').split(' '));

/** The province's own name is the first of its list. */
export const provinceNames = Object.freeze(Object.fromEntries(Object.entries(PLACES).map(([code, names]) => [code, names.split('|')[0].replace(/[?!]$/, '')])));

const fold = name => name.toLowerCase();
const entries = new Map();    // 'jawa barat' -> { code, place: 'Jawa Barat', kind: 'plain' | 'capital' | 'cue' }
let longest = 1;
for (const [code, names] of Object.entries(PLACES)) for (const raw of (ENGLISH[code] ? names + '|' + ENGLISH[code] : names).split('|')) {
  const place = raw.replace(/[?!]$/, ''), kind = raw.endsWith('?') ? 'capital' : raw.endsWith('!') ? 'cue' : 'plain';
  entries.set(fold(place), { code, place, kind });
  longest = Math.max(longest, place.split(' ').length);
}
const profileShort = new Map(Object.entries(PROFILE_SHORT).map(([short, [code, place]]) => [short, { code, place, kind: 'plain' }]));
const notPlaces = new Set(NOT_PLACES);
const longestNot = Math.max(...NOT_PLACES.map(phrase => phrase.split(' ').length));

/** Every name the list knows, by province code. For checks and for the method note. */
export function placeAliases() {
  const out = {};
  for (const { code, place } of entries.values()) (out[code] ||= []).push(place);
  return out;
}

const HASHTAG = /#[\p{L}\p{N}_]+/gu, MANY_HASHTAGS = 5;

/** Words of a text, without links, account names and markup. A #CamelCase hashtag is read as its words, unless the
 * text carries a long row of hashtags: those are there to be found by a search, not to say where something happens. */
function words(text) {
  const tagged = (text.match(HASHTAG) || []).length > MANY_HASHTAGS ? text.replace(HASHTAG, ' ') : text;
  const clean = tagged.replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+|www\.\S+/gi, ' ').replace(/@[\w.]+/g, ' ')
    .replace(/[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|id|tv|co|news|info)\b/gi, ' ')   // a site named without its scheme: tribun-medan.com
    .replace(/#([\p{L}\p{N}_]+)/gu, (_, tag) => entries.has(fold(tag)) ? tag : tag.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2').replace(/_/g, ' '));
  return [...clean.matchAll(/[\p{L}\p{N}]+/gu)].map(match => ({ raw: match[0], low: fold(match[0]) }));
}

const phrase = (tokens, start, length) => { let out = tokens[start].low; for (let i = 1; i < length; i++) out += ' ' + tokens[start + i].low; return out; };

function counts(entry, tokens, at, length) {
  const before = at > 0 ? tokens[at - 1].low : '', after = tokens[at + length]?.low || '';
  if (OUTLET_BEFORE.has(before) || OUTLET_AFTER.has(after) || (/^\d+$/.test(after) && BANDS.has(tokens[at + length + 1]?.low))) return false;
  if (entry.kind === 'plain') return true;
  // A word typed all in capitals says nothing by its capitals, unless the name is a short form that is always typed so.
  const raw = tokens[at].raw, shouted = raw.length > 1 && raw === raw.toUpperCase() && entry.place !== entry.place.toUpperCase();
  const capital = !shouted && raw[0] !== raw[0].toLowerCase();
  if (entry.kind === 'capital') return capital || WEAK.has(before) || STRONG.has(before);
  return STRONG.has(before) || (capital && WEAK.has(before));
}

/**
 * Provinces a text names, in the order it names them, each with the names that were found.
 * @param {string} text
 * @param {{loose?: boolean}} options `loose` is for a field that holds a location by nature (a profile's "Lokasi"):
 *   every name counts however it is typed, and the short forms of profiles are read too.
 * @returns {{code: string, name: string, places: string[]}[]}
 */
export function placesIn(text, { loose = false } = {}) {
  if (typeof text !== 'string' || !text) return [];
  const tokens = words(text), found = new Map();
  for (let at = 0; at < tokens.length; ) {
    let step = 0;
    for (let length = Math.min(longestNot, tokens.length - at); length >= 2 && !step; length--) if (notPlaces.has(phrase(tokens, at, length))) step = length;
    for (let length = Math.min(longest, tokens.length - at); length >= 1 && !step; length--) {
      const entry = entries.get(phrase(tokens, at, length)) || (loose && length === 1 ? profileShort.get(tokens[at].low) : undefined);
      if (!entry || (!loose && !counts(entry, tokens, at, length))) continue;
      const row = found.get(entry.code) || { code: entry.code, name: provinceNames[entry.code], places: [] };
      if (!row.places.includes(entry.place)) row.places.push(entry.place);
      found.set(entry.code, row);
      step = length;
    }
    at += step || 1;
  }
  return [...found.values()];
}

/**
 * The province a profile's location text names, or null when it names none ("Indonesia", "Bumi", empty).
 * The text is the owner's own words about the account. It never says where a post was written.
 * @returns {{code: string, name: string, place: string} | null} `place` is the first name found, as the list spells it
 */
export function provinceOfLocation(text) {
  const [first] = placesIn(text, { loose: true });
  return first ? { code: first.code, name: first.name, place: first.places[0] } : null;
}

// From the first call to subscribe or follow onwards, a description is the channel talking about itself ("KompasTV Biro
// Jember"), and after "Baca juga" it lists other stories. Neither is about this post. The title is always read in full.
const SIGN_OFF = /baca juga|jangan lupa (?:like|subscribe|follow|klik)|subscribe|official channel|aktifkan (?:juga )?lonceng|(?:download|unduh) aplikasi|follow (?:us|kami|akun)|ikuti (?:kami|akun)/i;

const read = new WeakMap();   // a post is read once: a map redraws on every step of its timeline

/** A text without the name of the account that posted it. A news title ends in its publisher ("… - ANTARA News Sumbar")
 * and a video description repeats its channel; neither is the post talking about a place. A one-word name is kept:
 * it is too likely to be an ordinary word of the text. */
function withoutAuthor(value, author) {
  const name = typeof author === 'string' ? author.trim() : '';
  if (typeof value !== 'string' || !/\s/.test(name)) return typeof value === 'string' ? value : '';
  return value.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'gi'), ' ');
}

/** Provinces one post names: its title, and its text up to the sign-off. Same shape as `placesIn`. */
export function postPlaces(post) {
  if (!post || typeof post !== 'object') return [];
  if (read.has(post)) return read.get(post);
  const title = withoutAuthor(post.title, post.author), text = withoutAuthor(post.text, post.author);
  const end = text.search(SIGN_OFF), found = placesIn(title + '\n' + (end < 0 ? text : text.slice(0, end)));
  read.set(post, found);
  return found;
}

const addDays = (date, count) => new Date(Date.parse(date + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
const MAX_DAYS = 1100;   // the same guard as the trend chart: a stray date must not draw an endless timeline

/**
 * Where a conversation is named over time.
 * @param {object[]} posts posts already scoped to the project's period and platforms
 * @returns {{
 *   total: number, named: number, undatedNamed: number, days: string[],
 *   postsByDay: Record<string, number>, namedByDay: Record<string, number>,
 *   provinces: {code: string, name: string, total: number, first: string, byDay: Record<string, number>, places: [string, number][], posts: object[]}[],
 * }}
 *   `days` is every day (WIB) from the first to the last dated post, so a quiet day is a step of the timeline too.
 *   `named` counts dated posts that name at least one place; a post naming two provinces is counted in both rows.
 *   `provinces` is in order of first appearance; each row's posts are sorted by interactions, most first.
 */
export function spreadByDay(posts = []) {
  const rows = new Map(), postsByDay = {}, namedByDay = {};
  let named = 0, undatedNamed = 0, first = null, last = null;
  for (const post of posts) {
    const day = sentimentDate(post), found = postPlaces(post);
    if (day) { postsByDay[day] = (postsByDay[day] || 0) + 1; if (!first || day < first) first = day; if (!last || day > last) last = day; }
    if (!found.length) continue;
    if (!day) { undatedNamed++; continue; }
    named++;
    namedByDay[day] = (namedByDay[day] || 0) + 1;
    for (const place of found) {
      const row = rows.get(place.code) || { code: place.code, name: place.name, total: 0, first: day, byDay: {}, places: new Map(), posts: [] };
      row.total++;
      row.byDay[day] = (row.byDay[day] || 0) + 1;
      if (day < row.first) row.first = day;
      for (const name of place.places) row.places.set(name, (row.places.get(name) || 0) + 1);
      row.posts.push(post);
      rows.set(place.code, row);
    }
  }
  const days = [];
  if (first) for (let day = addDays(first, MAX_DAYS) < last ? addDays(last, -MAX_DAYS) : first; day <= last; day = addDays(day, 1)) days.push(day);
  const weight = post => { const value = postInteractions(post.metrics); return Number.isFinite(value) ? value : -1; };
  const provinces = [...rows.values()].map(row => ({ ...row,
    places: [...row.places.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    posts: row.posts.sort((a, b) => weight(b) - weight(a) || String(b.published_at).localeCompare(String(a.published_at))),
  })).sort((a, b) => a.first.localeCompare(b.first) || b.byDay[b.first] - a.byDay[a.first] || b.total - a.total || a.name.localeCompare(b.name));
  return { total: posts.length, named, undatedNamed, days, postsByDay, namedByDay, provinces };
}

/**
 * The map at one day of the timeline: everything named up to and including that day.
 * @returns {{day: string, rows: {code: string, name: string, count: number, today: number, fresh: boolean}[], named: number, posts: number}}
 *   `rows` holds only provinces named so far, most posts first. `fresh` marks a province named for the first time on this day.
 */
export function spreadFrame(spread, day) {
  const upTo = byDay => Object.entries(byDay || {}).reduce((sum, [date, count]) => date <= day ? sum + count : sum, 0);
  const rows = (spread?.provinces || []).filter(row => row.first <= day)
    .map(row => ({ code: row.code, name: row.name, count: upTo(row.byDay), today: row.byDay[day] || 0, fresh: row.first === day }))
    .sort((a, b) => b.count - a.count);
  return { day, rows, named: upTo(spread?.namedByDay), posts: upTo(spread?.postsByDay) };
}

/**
 * One province at one day of the timeline: the posts that named it up to that day and the names they used.
 * @returns {{code: string, name: string, first: string|null, posts: object[], places: [string, number][]} | null}
 *   null for a code that is not drawn. `first` is null when nothing in the spread names the province.
 */
export function provinceDetail(spread, code, day) {
  if (!provinceNames[code]) return null;
  const row = (spread?.provinces || []).find(item => item.code === code);
  const posts = row ? row.posts.filter(post => sentimentDate(post) <= day) : [], names = new Map();
  for (const post of posts) for (const name of postPlaces(post).find(item => item.code === code)?.places || []) names.set(name, (names.get(name) || 0) + 1);
  return { code, name: provinceNames[code], first: row ? row.first : null, posts, places: [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}

const plain = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : '';

/**
 * The part of a post where one of `names` stands, for showing why the post was counted for a province.
 * The title is looked at first, then the text. `match` is the name as the post typed it; it is '' when none of
 * the names is found as a whole word, and `before` is then the start of the post.
 * @param {{title?: string, text?: string}} post
 * @param {string[]} names place names as `placesIn` returns them
 * @param {number} width about how many characters to return
 * @returns {{before: string, match: string, after: string}}
 */
export function placeSnippet(post, names = [], width = 220) {
  const parts = [plain(withoutAuthor(post?.title, post?.author)), plain(withoutAuthor(post?.text, post?.author))].filter(Boolean);
  if (names.length) {
    const any = [...names].sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s-]+')).join('|');
    // First a name that stands in a sentence, then one that is a hashtag.
    for (const before of ['#', '']) for (const part of parts) {
      const found = new RegExp('(?<![\\p{L}\\p{N}' + before + '])(?:' + any + ')(?![\\p{L}\\p{N}])', 'iu').exec(part);
      if (!found) continue;
      const start = Math.max(0, found.index - Math.floor(Math.max(0, width - found[0].length) / 2)), end = Math.min(part.length, start + width);
      return { before: (start > 0 ? '…' : '') + part.slice(start, found.index), match: found[0], after: part.slice(found.index + found[0].length, end) + (end < part.length ? '…' : '') };
    }
  }
  const head = parts[0] || '';
  return { before: head.slice(0, width) + (head.length > width ? '…' : ''), match: '', after: '' };
}

/**
 * X accounts by the province their profile location names, over time. The shape follows `spreadByDay`, so
 * `spreadFrame` reads it as it is, but everything is counted in accounts: an account joins on the day (WIB) of its
 * first post, and stays. A post carries its author's profile location as `metrics.author_location`: a text, '' when
 * the owner wrote none, and no key at all while the account has not been asked yet.
 * @param {object[]} posts posts already scoped to the project's period and platforms (other platforms are skipped)
 * @returns {{
 *   total: number, located: number, named: number, unasked: number, days: string[],
 *   postsByDay: Record<string, number>, namedByDay: Record<string, number>,
 *   provinces: {code: string, name: string, total: number, first: string, byDay: Record<string, number>, places: [string, number][],
 *     accounts: {author: string, platform: 'x', location: string, place: string, first: string, posts: number, interactions: number|null, followers: number|null, post: object}[]}[],
 * }}
 *   `total` X accounts with a dated post, `located` those with a location text, `named` those on the map, `unasked`
 *   those not asked yet. `postsByDay` and `namedByDay` count accounts by the day they join. `days` spans every dated
 *   post given, of any platform, so the map's two views share one timeline. Accounts are sorted by interactions.
 */
export function accountSpread(posts = []) {
  const accounts = new Map();
  let first = null, last = null;
  for (const post of posts) {
    const day = sentimentDate(post);
    if (!day) continue;
    if (!first || day < first) first = day;
    if (!last || day > last) last = day;
    if (post.platform !== 'x') continue;
    const key = String(post.metrics?.author_id ?? post.author ?? '');
    if (!key) continue;
    const row = accounts.get(key) || { author: post.author || '', platform: 'x', location: undefined, first: day, posts: 0, interactions: null, followers: null, post, newest: '' };
    row.posts++;
    if (day < row.first) row.first = day;
    const stamp = String(post.published_at);
    if (stamp >= row.newest) { row.newest = stamp; row.post = post; row.author = post.author || row.author; }
    const value = postInteractions(post.metrics);
    if (Number.isFinite(value)) row.interactions = (row.interactions || 0) + value;
    if (typeof post.metrics?.author_location === 'string') row.location = post.metrics.author_location;
    if (Number.isFinite(post.metrics?.author_followers)) row.followers = post.metrics.author_followers;
    accounts.set(key, row);
  }
  const rows = new Map(), postsByDay = {}, namedByDay = {};
  let located = 0, named = 0, unasked = 0;
  for (const { newest, ...account } of accounts.values()) {
    void newest;
    postsByDay[account.first] = (postsByDay[account.first] || 0) + 1;
    if (account.location === undefined) { unasked++; continue; }
    if (!account.location.trim()) continue;
    located++;
    const where = provinceOfLocation(account.location);
    if (!where) continue;
    named++;
    namedByDay[account.first] = (namedByDay[account.first] || 0) + 1;
    const row = rows.get(where.code) || { code: where.code, name: where.name, total: 0, first: account.first, byDay: {}, places: new Map(), accounts: [] };
    row.total++;
    row.byDay[account.first] = (row.byDay[account.first] || 0) + 1;
    if (account.first < row.first) row.first = account.first;
    row.places.set(where.place, (row.places.get(where.place) || 0) + 1);
    row.accounts.push({ ...account, place: where.place });
    rows.set(where.code, row);
  }
  const days = [];
  if (first) for (let day = addDays(first, MAX_DAYS) < last ? addDays(last, -MAX_DAYS) : first; day <= last; day = addDays(day, 1)) days.push(day);
  const provinces = [...rows.values()].map(row => ({ ...row,
    places: [...row.places.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    accounts: row.accounts.sort((a, b) => (b.interactions ?? -1) - (a.interactions ?? -1) || b.posts - a.posts || a.author.localeCompare(b.author)),
  })).sort((a, b) => a.first.localeCompare(b.first) || b.byDay[b.first] - a.byDay[a.first] || b.total - a.total || a.name.localeCompare(b.name));
  return { total: accounts.size, located, named, unasked, days, postsByDay, namedByDay, provinces };
}

/**
 * One province of `accountSpread` at one day: the accounts that had posted by then and the names their profiles use.
 * @returns {{code: string, name: string, first: string|null, accounts: object[], places: [string, number][]} | null} null for a code that is not drawn
 */
export function accountDetail(spread, code, day) {
  if (!provinceNames[code]) return null;
  const row = (spread?.provinces || []).find(item => item.code === code);
  const accounts = row ? row.accounts.filter(account => account.first <= day) : [], names = new Map();
  for (const account of accounts) names.set(account.place, (names.get(account.place) || 0) + 1);
  return { code, name: provinceNames[code], first: row ? row.first : null, accounts, places: [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}

/**
 * The provinces of a spread (`spreadByDay` or `accountSpread`) ranked for a summary: most first, equal counts by name.
 * @returns {{code: string, name: string, count: number, first: string, places: [string, number][]}[]}
 */
export function spreadTotals(spread) {
  return (spread?.provinces || []).map(row => ({ code: row.code, name: row.name, count: row.total, first: row.first, places: row.places }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Whether a post names a province in its title or text; true for every post when no province is asked for. */
export function namesProvince(post, code) {
  return !code || postPlaces(post).some(place => place.code === code);
}

/** The lists and word sets as plain data. scripts/build-pulse-places.mjs writes them to the server, whose reader
 * (server/app/services/pulse_places.py) follows the same rules for what the AI is told. Change a list here, then
 * run the script; a test fails while the server's copy differs. */
export const placeTables = Object.freeze({
  places: PLACES, english: ENGLISH, profileShort: PROFILE_SHORT, notPlaces: NOT_PLACES,
  weak: [...WEAK], strong: [...STRONG], outletBefore: [...OUTLET_BEFORE], outletAfter: [...OUTLET_AFTER], bands: [...BANDS],
  signOff: SIGN_OFF.source, manyHashtags: MANY_HASHTAGS,
});
