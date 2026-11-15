import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const issue = (rank, title, category, platforms, more = {}) => ({
  key: 'k' + rank, scope: 'national', rank, title, category, reason: 'Ramai di berita nasional.', platforms, regions: [], evidence_titles: [],
  query: { q: title.toLowerCase(), required: '', excluded: '' }, movement: null, project: null, ...more,
});
const region = (code, searches) => ({ code, searches });
const issues = [
  issue(1, 'Pengunduran diri Wapres', 'politik', { news: { count: 212 }, search: { searches: 5000 } },
    { regions: [region('ID-JK', 2000), region('ID-JI', 1000)], project: { id: 't1', label: 'Isu Gibran' }, movement: { kind: 'up', places: 4 } }),
  issue(2, 'Pertemuan di Bogor', 'politik', { news: { count: 64 } }, { movement: { kind: 'new', places: 0 } }),
  issue(3, 'Timnas Indonesia', 'olahraga', { search: { searches: 10000 } }, { regions: [region('ID-JI', 500)], movement: { kind: 'down', places: 2 } }),
  ...Array.from({ length: 9 }, (_, index) => issue(index + 4, 'Isu politik ' + (index + 4), 'politik', { news: { count: 9 - index } })),
  issue(13, 'Polda Jawa Timur', 'hukum', { search: { searches: 200 } }, { scope: 'local', regions: [region('ID-JI', 200)] }),
  issue(14, 'Kosovo lawan Israel', 'olahraga', { search: { searches: 500 } }, { scope: 'local', regions: [region('ID-JI', 500), region('ID-BA', 200), region('ID-SU', 200)] }),
];
const payload = { state: 'ok', updated_at: '2026-11-15T01:10:00', interval_minutes: 30, enabled: true, running: false, missing: [], provinces_read: ['ID-JK', 'ID-JI'],
  signals: { news: 122, search: 54, youtube: 51 }, last_attempt: { state: 'ok', at: '2026-11-15T01:10:00' }, brief: 'Pengunduran diri Wapres mendominasi [1].', issues, raw: null };
const now = new Date('2026-11-15T01:30:00Z');
const none = { category: '', platform: '', province: '' };

async function load(path) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    return { module: await server.ssrLoadModule(path), close: () => server.close() };
  } catch (error) { await server.close(); throw error; }
}
async function render(props, path = '/src/pulse/RadarIssues.jsx', name = 'default') {
  const { module, close } = await load(path);
  try {
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/pulse'] }, React.createElement(module[name], { now, canCreate: true, filters: none, onFilters() {}, onSelect() {}, ...props })));
  } finally { await close(); }
}
const lead = props => render(props, '/src/pulse/RadarLead.jsx');
const rows = html => (html.match(/<ol[^>]*class="rdi-list"[\s\S]*?<\/ol>/)?.[0] || '').split(/(?=<li[^>]*class="rdi-row")/).slice(1);
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const group = (html, name) => html.match(new RegExp(`<div[^>]*role="group"[^>]*aria-label="${name}"[^>]*>[\\s\\S]*?</div>`))?.[0] || '';
const buttons = markup => [...markup.matchAll(/<button[^>]*>([^<]*)</g)].map(match => match[1]);

// ── The first card: what the page answers, when it was made, and the choices that apply to the whole page ────────────

test('the first card names the scope, says when the list was made, carries the brief and the page-wide switches', async () => {
  const html = await lead({ payload });
  assert.match(html, /<h2[^>]*>Isu yang ramai di Indonesia<\/h2>/);
  assert.match(text(html), /Diperbarui 08\.10 WIB, tiap 30 menit/);
  assert.match(text(html), /Pengunduran diri Wapres mendominasi \[1\]\./);
  const categories = group(html, 'Kategori isu');
  assert.match(categories, /class="pu-segmented"/);
  assert.deepEqual(buttons(categories), ['Semua 12', 'Politik 11', 'Olahraga 1'], 'a category with nothing in it is not offered');
  assert.deepEqual(buttons(group(html, 'Platform')), ['Semua platform', 'Berita', 'Google'], 'a platform with no issue in this refresh is not offered');
  assert.match(html, /<button[^>]*>(?:<svg[\s\S]*?<\/svg>)?Perbarui sekarang<\/button>/);
  assert.match(await lead({ payload: { ...payload, running: true } }), /<button[^>]*disabled=""[^>]*>[\s\S]*?Memperbarui…/);
  assert.doesNotMatch(await lead({ payload, canCreate: false }), /Perbarui sekarang/, 'a viewer cannot start a refresh');
});

test('a filter is shown as pressed, takes the row numbers out of the brief, and a province is a chip that can be dropped', async () => {
  const filtered = await lead({ payload, filters: { ...none, category: 'politik' } });
  assert.match(group(filtered, 'Kategori isu'), /<button[^>]*aria-pressed="true"[^>]*>Politik 11</);
  assert.match(text(filtered), /Pengunduran diri Wapres mendominasi\./);
  assert.doesNotMatch(text(filtered), /\[1\]/);
  const province = await lead({ payload, filters: { ...none, province: 'ID-JI' } });
  assert.match(province, /<h2[^>]*>Isu yang ramai di Jawa Timur<\/h2>/);
  assert.match(province, /<button[^>]*aria-label="Kembali ke seluruh Indonesia"[^>]*>[\s\S]*?Provinsi: Jawa Timur/);
  assert.doesNotMatch(text(province), /mendominasi/, 'the national brief is not shown over a province list');
  assert.deepEqual(buttons(group(province, 'Kategori isu')), ['Semua 4', 'Politik 1', 'Hukum 1', 'Olahraga 2']);
});

test('each state of the radar has its own words in the first card', async () => {
  const empty = { ...payload, state: 'empty', updated_at: null, issues: [], brief: null, last_attempt: null };
  assert.match(text(await lead({ payload: empty })), /Radar belum pernah berjalan\. Pembaruan pertama dimulai dalam beberapa menit\./);
  const off = text(await lead({ payload: { ...empty, enabled: false } }));
  assert.match(off, /Radar belum pernah berjalan\. Pembaruan otomatis mati/);
  assert.match(off, /Jalankan sekarang/);
  assert.doesNotMatch(text(await lead({ payload: { ...empty, enabled: false }, canCreate: false })), /Jalankan sekarang/);
  const failed = text(await lead({ payload: { ...empty, last_attempt: { state: 'failed', at: '2026-11-15T01:20:00' } } }));
  assert.match(failed, /Pembaruan terakhir \(08\.20 WIB\) tidak berhasil membaca daftar\./);
  assert.doesNotMatch(failed, /belum pernah berjalan/, 'attempts that failed are not a radar that never ran');
  assert.match(failed, /Coba lagi sekarang/);
  assert.match(text(await lead({ payload: { ...payload, state: 'stale' } })), /Data terakhir 08\.10 WIB\. Pembaruan sesudahnya belum berjalan\./);
  assert.match(text(await lead({ payload: { ...payload, state: 'stale', enabled: false } })), /Data terakhir 08\.10 WIB\. Pembaruan otomatis mati\./);
  assert.match(text(await lead({ payload: { ...payload, last_attempt: { state: 'raw', at: '2026-11-15T01:25:00' } } })), /Pembaruan 08\.25 WIB tidak berhasil\. Daftar di bawah dari 08\.10 WIB\./);
  const raw = await lead({ payload: { ...payload, state: 'raw', issues: [], brief: null } });
  assert.match(text(raw), /Daftar mentah per platform\. Isu belum bisa disusun pada pembaruan ini/);
  assert.doesNotMatch(raw, /role="group"/, 'raw lists have no categories to switch');
  assert.match(text(await lead({ payload: null })), /Memuat isu/);
});

test('the figures strip counts the refresh, with meters for coverage', async () => {
  const html = await render({ payload }, '/src/pulse/RadarFigures.jsx');
  const cells = html.split(/(?=<div class="pu-stat")/).slice(1).map(text);
  assert.equal(cells.length, 4);
  assert.match(cells[0], /^Isu tersusun 14 12 nasional, 2 lokal$/);
  assert.match(cells[1], /^Sinyal dibaca 227 berita 122, pencarian 54, video 51$/);
  assert.match(cells[2], /^Daftar provinsi terbaca 2 dari 34 6% terbaca$/);
  assert.match(cells[3], /^Isu teratas dipantau 1 dari 10 10% dicakup project$/);
  assert.match(html, /role="group"[^>]*aria-label="Angka pembaruan ini"/);
  const bare = await render({ payload: { ...payload, signals: {}, provinces_read: null } }, '/src/pulse/RadarFigures.jsx');
  assert.match(text(bare), /Sinyal dibaca —/, 'a figure the refresh did not report is unavailable, not zero');
});

// ── The list ────────────────────────────────────────────────────────────────────────────────────────────────────────

test('ten ordered rows, each with rank, title, category, movement, reason, a meter per platform and one action', async () => {
  const html = await render({ payload });
  const list = rows(html);
  assert.equal(list.length, 10);
  assert.match(text(list[0]), /^1 Pengunduran diri Wapres Politik Naik 4 Sudah dipantau Ramai di berita nasional\. Berita 212 artikel Google 5\.000\+ pencarian ramai di 2 provinsi Buka project$/);
  assert.match(text(list[1]), /^2 Pertemuan di Bogor Politik Baru Ramai di berita nasional\. Berita 64 artikel Pantau$/);
  assert.match(text(list[2]), /Olahraga Turun 2/);
  assert.match(list[0], /<button[^>]*class="rdi-title"[^>]*>Pengunduran diri Wapres<\/button>/, 'the title opens the evidence');
  assert.match(html, /<h2[^>]*>Isu teratas<\/h2>/);
  const meters = [...list[0].matchAll(/<i[^>]*style="width:([\d.]+)%"/g)].map(match => Number(match[1]));
  assert.deepEqual(meters, [100, 50], 'each meter is drawn against the loudest listed issue on that platform');
  assert.match(list[0], /<ul[^>]*class="rdi-meters"[^>]*aria-label="Angka per platform"/);
});

test('an issue a project covers says so and opens that project; the others offer Pantau; a viewer gets no Pantau', async () => {
  const list = rows(await render({ payload }));
  assert.match(list[0], /<a[^>]*href="\/pulse\/overview\?topic=t1"[^>]*>Buka project/);
  assert.doesNotMatch(list[0], /Pantau/);
  assert.match(list[1], /<a[^>]*href="\/pulse\/search\?q=pertemuan\+di\+bogor"[^>]*>Pantau/);
  const viewer = await render({ payload, canCreate: false });
  assert.doesNotMatch(viewer, /Pantau/);
  assert.match(rows(viewer)[0], /Buka project/, 'opening an existing project is reading');
});

test('a chosen category or platform narrows the list, and movement is told only for the combined order', async () => {
  const politics = await render({ payload, filters: { ...none, category: 'politik' } });
  assert.equal(rows(politics).length, 10);
  assert.ok(rows(politics).every(row => /Politik/.test(row)));
  assert.match(text(rows(politics)[0]), /Naik 4/, 'a category keeps the combined order, so movement still means something');
  const google = await render({ payload, filters: { ...none, platform: 'search' } });
  assert.deepEqual(rows(google).map(row => text(row).split(' ').slice(0, 3).join(' ')), ['1 Timnas Indonesia', '2 Pengunduran diri']);
  assert.doesNotMatch(text(rows(google).join(' ')), /Naik|Turun|Baru/, 'ordered by one platform, the combined movement is not shown');
  assert.match(text(google), /Diurutkan menurut angka Google/);
});

test('with a province chosen the list is that province, and local issues say on how many province lists they are', async () => {
  const html = await render({ payload, filters: { ...none, province: 'ID-JI' } });
  const list = rows(html);
  assert.deepEqual(list.map(row => text(row).split(' ').slice(0, 3).join(' ')), ['1 Pengunduran diri', '2 Timnas Indonesia', '3 Polda Jawa', '4 Kosovo lawan']);
  assert.match(text(list[2]), /hanya ramai di provinsi ini/);
  assert.match(text(list[3]), /hanya ramai di 3 provinsi/);
  assert.doesNotMatch(text(list[0]), /hanya ramai/);
  assert.match(text(html), /Isu yang masuk pencarian populer Jawa Timur/);
});

test('a list with nothing in it says why: no such category, or a province whose list was not read', async () => {
  const nothing = await render({ payload, filters: { ...none, category: 'bencana' } });
  assert.match(text(nothing), /Belum ada isu Bencana pada pembaruan ini\./);
  assert.match(nothing, /<button[^>]*>Tampilkan semua<\/button>/);
  const read = await render({ payload: { ...payload, issues: issues.slice(1, 2) }, filters: { ...none, province: 'ID-JK' } });
  assert.match(text(read), /Belum ada isu yang masuk pencarian populer DKI Jakarta pada pembaruan ini\./);
  const unread = await render({ payload, filters: { ...none, province: 'ID-PA' } });
  assert.match(text(unread), /Daftar pencarian populer Papua tidak terbaca pada pembaruan ini\./, 'a list that was not read is not a province without issues');
  assert.doesNotMatch(text(unread), /Belum ada isu/);
});

test('raw lists are shown per platform when nothing was composed', async () => {
  const raw = await render({ payload: { ...payload, state: 'raw', issues: [], brief: null, raw: { news: [{ title: 'Judul berita', url: 'https://news.example/a', source: 'Kompas', figure: 4 }], youtube: [],
    search: [{ title: 'bahan bakar', url: null, source: null, figure: 1000 }] } } });
  assert.match(raw, /<h2[^>]*>Daftar mentah per platform<\/h2>/);
  assert.match(raw, /<a[^>]*href="https:\/\/news\.example\/a"[^>]*>Judul berita<\/a>/);
  assert.match(text(raw), /bahan bakar 1\.000\+ pencarian/);
  assert.match(text(raw), /YouTube Tidak terbaca pada pembaruan ini\./);
  assert.doesNotMatch(raw, /class="rdi-list"/);
});

test('a title is text: markup in it is not rendered', async () => {
  const html = await render({ payload: { ...payload, issues: [issue(1, '<img src=x onerror=alert(1)> Judul', 'politik', { news: { count: 1 } })] } });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; Judul/);
});

// ── The evidence view ───────────────────────────────────────────────────────────────────────────────────────────────

test('the evidence view shows why, the sources by platform, the proposed keywords and the same action', async () => {
  const summary = issues[1];
  const detail = { ...summary, evidence: [
    { platform: 'news', title: 'Isi pertemuan dibuka', url: 'https://news.example/b', source: 'Kompas', figure: 4 },
    { platform: 'news', title: 'Tautan aneh', url: 'javascript:alert(1)', source: 'Entah', figure: null },
    { platform: 'youtube', title: 'Video pertemuan', url: 'https://www.youtube.com/watch?v=vid00000001', source: 'Kanal Berita', figure: 2104721 },
    { platform: 'search', title: 'pertemuan bogor', url: null, source: null, figure: 1000 }] };
  const html = await render({ summary, detail }, '/src/pulse/RadarIssueDrawer.jsx', 'RadarIssueDetail');
  assert.match(text(html), /Ramai di berita nasional\./);
  assert.match(html, /<h3[^>]*>Berita<\/h3>[\s\S]*<h3[^>]*>YouTube<\/h3>[\s\S]*<h3[^>]*>Google<\/h3>/);
  assert.match(html, /<a[^>]*href="https:\/\/news\.example\/b"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>Isi pertemuan dibuka/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(text(html), /Tautan aneh Entah/, 'a row whose link cannot be followed is still shown, as text');
  assert.match(text(html), /Video pertemuan Kanal Berita 2\.104\.721 tayangan/);
  assert.match(text(html), /pertemuan bogor 1\.000\+ pencarian/);
  assert.match(text(html), /Keyword yang disarankan pertemuan di bogor/);
  assert.match(html, /<a[^>]*href="\/pulse\/search\?q=pertemuan\+di\+bogor"[^>]*>Buat project dari isu ini/);
  const loading = await render({ summary, detail: null }, '/src/pulse/RadarIssueDrawer.jsx', 'RadarIssueDetail');
  assert.match(text(loading), /Memuat bukti/);
  const failed = await render({ summary, detail: null, error: true }, '/src/pulse/RadarIssueDrawer.jsx', 'RadarIssueDetail');
  assert.match(text(failed), /Bukti isu ini tidak dapat dimuat\./);
  const viewer = await render({ summary, detail, canCreate: false }, '/src/pulse/RadarIssueDrawer.jsx', 'RadarIssueDetail');
  assert.doesNotMatch(viewer, /Buat project/);
});

// ── X, TikTok and Instagram ─────────────────────────────────────────────────────────────────────────────────────────

const socialIssues = [
  issue(1, 'Antrean BBM', 'ekonomi', { news: { count: 40 }, x: { count: 625 }, tiktok: { found: 20, capped: true }, instagram: { found: 12, capped: false } }),
  issue(2, 'Tagar BBM', 'ekonomi', { x: { posts: 3 } }),
  issue(3, 'Laga bola', 'olahraga', { news: { count: 90 }, x: { count: 9700 }, tiktok: { found: 4, capped: false } }),
];
const socialPayload = { ...payload, signals: { news: 122, search: 54, youtube: 51, x: 7 }, issues: socialIssues };

test('a row shows X with a bar when it was counted, and TikTok and Instagram as found, without a bar', async () => {
  const list = rows(await render({ payload: socialPayload }));
  assert.match(text(list[0]), /Berita 40 artikel X 625\+ posting TikTok 20\+ ditemukan Instagram 12 ditemukan/);
  const meter = name => list[0].match(new RegExp(`<li[^>]*data-platform="${name}"[\\s\\S]*?</li>`))?.[0] || '';
  assert.match(meter('x'), /title="X: sedikitnya 625 posting terpantau sejak kemarin"/);
  assert.match(meter('x'), /<span class="rdi-track"[^>]*><i style="width:6\.4%"/, 'drawn against the loudest listed issue on X');
  assert.doesNotMatch(meter('tiktok'), /rdi-track/, 'a sample is not a length');
  assert.match(meter('tiktok'), /title="TikTok: sampel 20 posting terisi penuh, jumlah sebenarnya lebih banyak"/);
  assert.match(meter('tiktok') + meter('instagram') + meter('x'), /<svg/, 'each platform is named by its mark');
  assert.match(text(list[1]), /X 3 posting contoh/);
  const html = await render({ payload: socialPayload });
  assert.match(text(html), /Tanda \+ berarti batas bawah: sedikitnya sebanyak itu yang tercatat\./, 'what the plus means is on the page, not only on hover');
  assert.doesNotMatch(text(await render({ payload: { ...payload, issues: [issue(1, 'Hanya berita', 'politik', { news: { count: 4 } })] } })), /Tanda \+/);
  assert.match(html, /<ol[^>]*class="rdi-list"[^>]*role="list"/, 'a list without markers is still announced as a list');
  assert.doesNotMatch(list[1], /rdi-track/, 'found on X but not counted: no bar');
});

test('the platform switch offers the social platforms when the refresh has them, and each orders or keeps the list as it should', async () => {
  assert.deepEqual(buttons(group(await lead({ payload: socialPayload }), 'Platform')), ['Semua platform', 'Berita', 'X', 'TikTok', 'Instagram']);
  const onX = await render({ payload: socialPayload, filters: { ...none, platform: 'x' } });
  assert.deepEqual(rows(onX).map(row => text(row).split(' ').slice(1, 3).join(' ')), ['Laga bola', 'Antrean BBM', 'Tagar BBM']);
  assert.match(text(onX), /Diurutkan menurut posting di X yang terpantau sejak kemarin\./);
  const onTiktok = await render({ payload: socialPayload, filters: { ...none, platform: 'tiktok' } });
  assert.deepEqual(rows(onTiktok).map(row => text(row).split(' ').slice(1, 3).join(' ')), ['Antrean BBM', 'Laga bola']);
  assert.match(text(onTiktok), /Isu yang ditemukan di TikTok, dalam urutan gabungan\./);
  const none_ = await render({ payload, filters: { ...none, platform: 'instagram' } });
  assert.match(text(none_), /Belum ada isu yang ditemukan di Instagram pada pembaruan ini\./);
});

test('the figures strip counts what X found, and the raw view lists X only when it was searched', async () => {
  const cells = (await render({ payload: socialPayload }, '/src/pulse/RadarFigures.jsx')).split(/(?=<div class="pu-stat")/).slice(1).map(text);
  assert.match(cells[1], /^Sinyal dibaca 234 berita 122, pencarian 54, video 51, X 7$/);
  const lists = { news: [{ title: 'Judul berita', url: null, source: 'Kompas', figure: 4 }], youtube: [], search: [] };
  const raw = await render({ payload: { ...payload, state: 'raw', issues: [], brief: null, raw: lists } });
  assert.doesNotMatch(raw, /<h3[^>]*>(X|TikTok|Instagram)<\/h3>/, 'a platform that has no list of its own is not shown as unread');
  const withX = await render({ payload: { ...payload, state: 'raw', issues: [], brief: null, raw: { ...lists, x: [{ title: 'Tagar soal BBM', url: 'https://x.com/a/status/11111', source: null, figure: null }] } } });
  assert.match(withX, /<h3[^>]*>X, isu yang ditemukan<\/h3>[\s\S]*<a[^>]*href="https:\/\/x\.com\/a\/status\/11111"[^>]*>Tagar soal BBM<\/a>/, 'these are names of issues, not a list read from X');
});

test('the evidence view lists sampled posts by platform, with the account and the interactions, and says they are examples', async () => {
  const summary = socialIssues[0];
  const detail = { ...summary, evidence: [
    { platform: 'news', title: 'Antre BBM di Medan', url: 'https://news.example/b', source: 'Tempo', figure: 2 },
    { platform: 'x', title: 'Antre sejak subuh', url: 'https://x.com/i/status/33333', source: 'warga_medan', figure: 80 },
    { platform: 'x', title: 'Posting dari @akun_a', url: 'https://x.com/akun_a/status/11111', source: null, figure: null },
    { platform: 'tiktok', title: 'Antrean di SPBU', url: 'https://www.tiktok.com/@warga/video/44444', source: 'warga', figure: 900 },
    { platform: 'instagram', title: 'Foto antrean', url: 'https://www.instagram.com/p/ABC/', source: 'kabar.medan', figure: null }] };
  const html = await render({ summary, detail }, '/src/pulse/RadarIssueDrawer.jsx', 'RadarIssueDetail');
  assert.match(html, /<h3[^>]*>Berita<\/h3>[\s\S]*<h3[^>]*>X, posting contoh<\/h3>[\s\S]*<h3[^>]*>TikTok, posting contoh<\/h3>[\s\S]*<h3[^>]*>Instagram, posting contoh<\/h3>/);
  assert.match(text(html), /Berita 40 artikel X 625\+ posting sejak kemarin TikTok 20\+ posting ditemukan Instagram 12 posting ditemukan/);
  assert.match(text(html), /Antre sejak subuh @warga_medan 80 interaksi/);
  assert.match(text(html), /Posting dari @akun_a(?! @)/, 'a post known only by its link has no account or figure to repeat');
  assert.match(text(html), /Antrean di SPBU @warga 900 interaksi/);
  assert.match(text(html), /Foto antrean @kabar\.medan(?! \d)/);
  assert.match(html, /<a[^>]*href="https:\/\/www\.tiktok\.com\/@warga\/video\/44444"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
});

// ── A top ten per platform, in columns ──────────────────────────────────────────────────────────────────────────────

const tops = props => render({ issues, ...props }, '/src/pulse/RadarPlatformTops.jsx');
const columns = html => html.split(/(?=<div[^>]*role="region"[^>]*aria-label="Teratas di )/).slice(1);
const topRows = card => (card.match(/<ol[^>]*class="rpt-list"[\s\S]*?<\/ol>/)?.[0] || '').split(/(?=<li)/).slice(1);

test('each platform with a figure has its own ranked column: position, issue, its figure there and a bar against the first', async () => {
  const html = await tops();
  assert.match(html, /<div[^>]*class="rpt"[^>]*data-columns="2"[^>]*role="group"[^>]*aria-label="Isu teratas per platform"/);
  const cards = columns(html);
  assert.deepEqual(cards.map(card => text(card.match(/<h2[^>]*>[\s\S]*?<\/h2>/)[0])), ['Teratas di Berita', 'Teratas di Google']);
  assert.match(text(cards[0]), /Jumlah artikel\./);
  const news = topRows(cards[0]);
  assert.equal(news.length, 10);
  assert.equal(text(news[0]), '1 Pengunduran diri Wapres 212 artikel');
  assert.equal(text(news[1]), '2 Pertemuan di Bogor 64 artikel');
  assert.deepEqual([...cards[0].matchAll(/<i[^>]*style="width:([\d.]+)%"/g)].slice(0, 2).map(match => Number(match[1])), [100, 30.2]);
  assert.deepEqual(topRows(cards[1]).map(text), ['1 Timnas Indonesia 10.000+ pencarian', '2 Pengunduran diri Wapres 5.000+ pencarian']);
  assert.match(news[0], /<button[^>]*class="rpt-title"[^>]*aria-pressed="false"[^>]*>Pengunduran diri Wapres<\/button>/, 'a row opens the same evidence as the main list');
  assert.match(cards[0], /<h2[^>]*><svg/, 'the platform is named by its mark as well');
  assert.match(cards[0], /<ol[^>]*class="rpt-list"[^>]*role="list"/);
});

test('with X counted there are four columns; an issue opened elsewhere is marked here; scope follows the page', async () => {
  const four = await tops({ issues: [...socialIssues, issue(4, 'Video viral', 'hiburan', { youtube: { count: 2, views: 5000000 }, search: { searches: 2000 } })], selectedKey: 'k3' });
  assert.match(four, /class="rpt"[^>]*data-columns="4"/);
  assert.deepEqual(columns(four).map(card => text(card.match(/<h2[^>]*>[\s\S]*?<\/h2>/)[0])), ['Teratas di Berita', 'Teratas di X', 'Teratas di YouTube', 'Teratas di Google']);
  const onX = columns(four)[1];
  assert.deepEqual(topRows(onX).map(text), ['1 Laga bola 9.700+ posting', '2 Antrean BBM 625+ posting']);
  assert.match(text(onX), /Terpantau sejak kemarin\./);
  assert.match(onX, /title="Sedikitnya 9\.700 posting terpantau sejak kemarin"/, 'what the plus sign means is one hover away');
  assert.match(topRows(onX)[0], /<li[^>]*data-selected=""[\s\S]*aria-pressed="true"/);
  assert.doesNotMatch(four, /Teratas di (TikTok|Instagram)/, 'a sample has no order');
  assert.deepEqual(columns(await tops({ filters: { ...none, category: 'olahraga' } })).map(card => topRows(card).map(text)), [['1 Timnas Indonesia 10.000+ pencarian']]);
  assert.equal(await tops({ issues: [] }), '', 'nothing to rank: no row at all');
});
