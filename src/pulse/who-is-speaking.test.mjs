import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const MAP = '/pulse/network?topic=t1&focus=map&layer=accounts';
const many = (count, make) => Array.from({ length: count }, (_, index) => make(index));
const xPosts = (prefix, count, metrics) => many(count, index => ({ id: `${prefix}-${index}`, platform: 'x', author: `${prefix}${index}`, published_at: '2026-11-10T05:00:00Z', metrics: { ...metrics } }));
const news = (author, count) => many(count, index => ({ id: `${author}-${index}`, platform: 'news', author, published_at: '2026-11-10T06:00:00Z', metrics: { sentiment: 'neutral' } }));
const tiktok = metrics => metrics.map((own, index) => ({ id: `tk-${index}`, platform: 'tiktok', author: `tk${index}`, published_at: '2026-11-10T07:00:00Z', metrics: own }));

// 115 posts. Tiers: Pemberitaan 10, ≥1 jt 20, 10–100 rb 20, <1 rb 60, unknown 5 (TikTok without followers).
// Interactions: ≥1 jt 80, 10–100 rb 20, <1 rb 60, unknown 8 on 4 of its 5 posts, news none: 168 known.
// X accounts: 100. Based in: Indonesia 60, a region 20, Malaysia 12, none 8. Province read on 72 (Bandung 60, Jakarta Selatan 12).
const full = [
  ...xPosts('s', 60, { author_followers: 100, likes: 1, author_location: 'Bandung', author_based_in: 'Indonesia', sentiment: 'neutral' }),
  ...xPosts('big', 20, { author_followers: 2000000, likes: 4, author_location: '', author_based_in: 'Southeast Asia', sentiment: 'positive' }),
  ...xPosts('t', 12, { author_followers: 20000, likes: 1, author_location: 'Jakarta Selatan', author_based_in: 'Malaysia', sentiment: 'negative' }),
  ...xPosts('v', 8, { author_followers: 20000, likes: 1, sentiment: 'positive' }),
  ...news('kompas.com', 5), ...news('detik.com', 5),
  ...tiktok([{ likes: 2 }, { likes: 2 }, { likes: 2, sentiment: 'neutral' }, { likes: 2, sentiment: 'neutral' }, { sentiment: 'neutral' }]),
];
const thin = news('kompas.com', 3);

async function load(run) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: WhoIsSpeaking } = await server.ssrLoadModule('/src/pulse/WhoIsSpeaking.jsx');
    const { default: InfoTip } = await server.ssrLoadModule('/src/pulse/InfoTip.jsx');
    const render = (posts, props = {}) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(WhoIsSpeaking, { posts, onOpen() {}, mapLink: MAP, ...props })));
    const tips = (posts, props = {}) => tipsOf(WhoIsSpeaking({ posts, onOpen() {}, mapLink: MAP, ...props }), InfoTip);
    return await run({ render, tips, WhoIsSpeaking, module: path => server.ssrLoadModule(path) });
  } finally { await server.close(); }
}
const decode = html => html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const text = html => decode(html.replace(/<\/?(?:b|strong)>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const section = (html, name) => html.match(new RegExp(`<(ul|div)[^>]*class="${name}"[\\s\\S]*?<\\/\\1>(?=<(?:p|div|section|ul|footer)|$)`))?.[0] || '';
const buttons = (html, kind) => [...html.matchAll(new RegExp(`<button type="button" class="${kind}"[^>]*>([\\s\\S]*?)<\\/button>`, 'g'))].map(match => match[0]);
/** The cells of one row button, by name, as text. */
const cells = row => Object.fromEntries(row.split(/(?=<span class="pws-cell" data-cell=")/).slice(1).map(part => [part.match(/data-cell="(\w+)"/)[1], text(part)]));
const names = row => [...row.matchAll(/class="pws-name"[^>]*>([^<]*)</g)].map(match => decode(match[1]));
/** The name a row button is read by. */
const label = row => decode(row.match(/^<button[^>]*aria-label="([^"]*)"/)[1]);
const lead = html => [...(html.match(/<ul class="pws-lead"[^>]*>([\s\S]*?)<\/ul>/)?.[1] || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => text(match[1]));
/** One place tile of the origin block, by its parts, as text. */
const tile = button => ({
  place: text(button.match(/<strong>([^<]*)<\/strong>/)?.[1] || ''),
  share: text(button.match(/<span class="pws-tile-share">([\s\S]*?)<\/span>/)?.[1] || ''),
  counts: text(button.match(/<small class="pws-tile-counts">([\s\S]*?)<\/small>/)?.[1] || ''),
  tone: text(button.match(/<span class="pws-tile-tone">([\s\S]*?)<\/span><\/span>/)?.[1] || ''),
});
/** The arcs a tile's donut is drawn with: [tone or ring, share] in drawing order. */
const arcs = button => [...button.matchAll(/<circle class="pws-arc" data-(tone|ring)="(\w+)" data-share="([\d.]+)"/g)].map(match => [match[2], match[3]]);

/** Every InfoTip in a returned element tree, as {label, text}. A tooltip's text is drawn only when it opens, so a
 * static render never holds it: the tree is walked instead, through every prop (a panel title carries one). */
function tipsOf(tree, InfoTip) {
  const found = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node.props) return;
    if (node.type === InfoTip) found.push({ label: node.props.label, text: text(renderToStaticMarkup(React.createElement(React.Fragment, null, node.props.children))) });
    for (const value of Object.values(node.props)) walk(value);
  })(tree);
  return found;
}

/** Walk an element tree as it is returned (no render), calling every row's click. */
function clicks(tree, kind) {
  const found = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'button' && node.props?.className === kind) found.push(node.props.onClick);
    walk(node.props?.children);
  })(tree);
  return found;
}

test('nothing loaded or an empty selection draws nothing at all', async () => {
  await load(({ render }) => {
    assert.equal(render([]), '');
    assert.equal(render(undefined), '');
  });
});

test('thin data (news only): one row, no sentence that compares groups, no follower line and no origin block', async () => {
  await load(({ render, tips }) => {
    const html = render(thin);
    assert.match(html, /aria-label="Siapa yang bicara"/);
    const rows = buttons(html, 'pws-row');
    assert.equal(rows.length, 1);
    assert.match(cells(rows[0]).group, /^Pemberitaan/);
    assert.doesNotMatch(text(html), /Paling banyak ditulis|Paling negatif/);
    assert.doesNotMatch(text(html), /Pengikut diketahui pada/);
    assert.doesNotMatch(tips(thin).map(tip => tip.text).join(' '), /Pengikut diketahui pada/);
    assert.doesNotMatch(text(html), /Asal akun X/);
    assert.deepEqual(tips(thin).map(tip => tip.label), ['Tentang siapa yang bicara'], 'no origin block, so no tip for it');
  });
});

test('full data: the three sentences first, then one row per tier with posts, in TIERS order, each with its figures', async () => {
  await load(({ render, tips }) => {
    const html = render(full);
    assert.deepEqual(lead(html), [
      'Paling banyak ditulis akun <1 rb (52% posting), tetapi interaksi terbesar dari akun ≥1 jt (47% dari interaksi yang tercatat).',
      'Paling negatif: akun 10–100 rb, 60% dari 20 posting.',
      'Akun X paling banyak dari Jawa Barat (60 akun); provinsi terbaca pada 72% akun X.',
    ]);
    const rows = buttons(html, 'pws-row').map(cells);
    assert.deepEqual(rows.map(row => row.group.split(' ')[0]), ['Pemberitaan', '≥1', '10–100', '<1', 'Pengikut']);
    assert.deepEqual(rows.map(row => row.accounts), ['Akun 2', 'Akun 20', 'Akun 20', 'Akun 60', 'Akun 5']);
    assert.deepEqual(rows.map(row => row.posts), ['Posting 8% 10 posting', 'Posting 17% 20 posting', 'Posting 17% 20 posting', 'Posting 52% 60 posting', 'Posting 4% 5 posting']);
    assert.deepEqual(rows.map(row => row.interactions), [
      'Interaksi — tidak dilaporkan', 'Interaksi 47% 80 interaksi', 'Interaksi 11% 20 interaksi', 'Interaksi 35% 60 interaksi', 'Interaksi 4% 8 interaksi, diketahui pada 4 dari 5 posting',
    ]);
    assert.deepEqual(rows.map(row => row.tone), [
      'Nada negatif 0% · netral 100% · positif 0%', 'Nada negatif 0% · netral 0% · positif 100%', 'Nada negatif 60% · netral 0% · positif 40%',
      'Nada negatif 0% · netral 100% · positif 0%', 'Nada negatif 0% · netral 60% · positif 0% · belum dianalisis 40% dari 5 posting',
    ]);
    // Coverage of the follower count on posts and on the known interactions of social media, both from the module,
    // said in the panel's tip rather than as a line of its own.
    const about = tips(full).find(tip => tip.label === 'Tentang siapa yang bicara');
    assert.match(about.text, /Pengikut diketahui pada 95% posting media sosial dan 95% interaksi media sosial yang tercatat\./);
    assert.doesNotMatch(text(html), /Pengikut diketahui pada/, 'not drawn a second time');
    assert.match(html, /<button type="button" class="ps-info-trigger" aria-label="Tentang siapa yang bicara"/);
  });
});

// The shared case shaped like the largest project: the gap on interactions sits on Instagram and TikTok.
const CASES = JSON.parse(readFileSync(new URL('../../shared/pulse-demography.cases.json', import.meta.url), 'utf8'));
const expand = rows => rows.flatMap(row => Array.from({ length: row.times ?? 1 }, (_, index) => {
  const { times, ...post } = row;
  return { ...post, id: `${post.platform}-${post.author}-${index}`, author: post.author.replace('{i}', String(index + 1).padStart(2, '0')) };
}));
const projectShaped = CASES.lead_sentences.find(item => item.note.startsWith('shaped like the largest project') && !item.sentiment_filtered);

test('a gap the follower count leaves is said, with its platforms, instead of a group it could overturn', async () => {
  await load(({ render, tips }) => {
    const html = render(expand(projectShaped.in));
    assert.deepEqual(lead(html), projectShaped.out, 'exactly what leadSentences writes, with the platforms named as the page names them');
    assert.deepEqual(lead(html), [
      'Sebanyak 69% dari interaksi yang tercatat berasal dari akun yang pengikutnya tidak diketahui; dari bagian ini, 68% di Instagram dan 31% di TikTok.',
      'Paling negatif di luar akun yang pengikutnya tidak diketahui: akun <1 rb, 37% dari 68 posting; akun yang pengikutnya tidak diketahui lebih negatif (50% dari 44 posting).',
    ]);
    assert.doesNotMatch(text(html), /Paling banyak ditulis|interaksi terbesar/, 'no group is named for posts or interactions');
    assert.match(tips(expand(projectShaped.in))[0].text, /Pengikut diketahui pada 87% posting media sosial dan 30% interaksi media sosial yang tercatat\./);
  });
});

test('every bar has its number in words, and colour never stands alone', async () => {
  await load(({ render, tips }) => {
    const html = render(full);
    const rows = buttons(html, 'pws-row');
    // The two share bars use two chart series colours. The column heads carry the key (a swatch beside "Posting" and
    // "Interaksi", the three tone dots beside "Nada"); the base each share is over is said in the panel's tip.
    const head = section(html, 'pws-head');
    assert.match(head, /--swatch:var\(--ps-chart-1\)"[^>]*><\/i>Posting/);
    assert.match(head, /--swatch:var\(--ps-chart-2\)"[^>]*><\/i>Interaksi/);
    assert.match(head, /data-tone="negative"[\s\S]*data-tone="neutral"[\s\S]*data-tone="positive"[\s\S]*Nada/);
    assert.doesNotMatch(html, /class="pws-keys"/, 'no separate key line');
    const about = tips(full).find(tip => tip.label === 'Tentang siapa yang bicara').text;
    for (const key of ['Posting: bagian dari semua posting.', 'Interaksi: bagian dari interaksi yang tercatat.', 'Nada: negatif, netral, positif dan belum dianalisis, dari total posting.']) assert.ok(about.includes(key), key);
    assert.match(html, /--ps-chart-1/);
    assert.match(html, /--ps-chart-2/);
    // A tone bar is drawn in the sentiment colours, with its shares in words beside it; inside a button only the
    // button's name is read, so the bar itself is hidden from assistive technology and the name says it all.
    assert.match(rows[2], /<span class="pws-tone-bar" aria-hidden="true">/);
    assert.doesNotMatch(rows[2], /pws-tone-bar"[^>]*role=/);
    assert.match(rows[2], /var\(--ps-sent-negative\)/);
    assert.match(rows[2], /var\(--ps-sent-positive\)/);
    // A row's name starts with its visible label (WCAG 2.5.3) and carries every figure with its base.
    assert.deepEqual(rows.map(label), [
      'Pemberitaan. 2 akun. 10 posting, 8% dari semua posting. Interaksi tidak dilaporkan. Nada negatif 0%, netral 100%, positif 0%, dari 10 posting. Akun teratas: detik.com, kompas.com. Lihat postingnya.',
      '≥1 jt pengikut. 20 akun. 20 posting, 17% dari semua posting. 80 interaksi, 47% dari interaksi yang tercatat. Nada negatif 0%, netral 0%, positif 100%, dari 20 posting. Akun teratas: big0, big1, big10. Lihat postingnya.',
      '10–100 rb pengikut. 20 akun. 20 posting, 17% dari semua posting. 20 interaksi, 11% dari interaksi yang tercatat. Nada negatif 60%, netral 0%, positif 40%, dari 20 posting. Akun teratas: t0, t1, t10. Lihat postingnya.',
      '<1 rb pengikut. 60 akun. 60 posting, 52% dari semua posting. 60 interaksi, 35% dari interaksi yang tercatat. Nada negatif 0%, netral 100%, positif 0%, dari 60 posting. Akun teratas: s0, s1, s10. Lihat postingnya.',
      'Pengikut tidak diketahui. 5 akun. 5 posting, 4% dari semua posting. 8 interaksi, 4% dari interaksi yang tercatat, diketahui pada 4 dari 5 posting. Nada negatif 0%, netral 60%, positif 0%, belum dianalisis 40%, dari 5 posting. Akun teratas: tk0, tk1, tk2. Lihat postingnya.',
    ]);
    for (const row of rows) assert.ok(label(row).startsWith(text(row.match(/<strong>([^<]*)<\/strong>/)[1])), 'the visible label starts the name');
    // The news row has no interaction figure: the share is a dash, not a 0.
    assert.match(rows[0], /data-cell="interactions"[\s\S]*?—/);
  });
});

test('each row names its top accounts (three at most) with their pictures', async () => {
  await load(({ render }) => {
    const rows = buttons(render(full), 'pws-row');
    assert.deepEqual(rows.map(names), [['detik.com', 'kompas.com'], ['big0', 'big1', 'big10'], ['t0', 't1', 't10'], ['s0', 's1', 's10'], ['tk0', 'tk1', 'tk2']]);
    assert.deepEqual(rows.map(row => (row.match(/class="ps-profile-avatar psi-avatar psi-xs"/g) || []).length), [2, 3, 3, 3, 3]);
  });
});

test('the origin of X accounts: a tile per place, country by what X says, provinces, and a way to the map', async () => {
  await load(({ render, tips }) => {
    const html = render(full);
    const block = html.slice(html.indexOf('<section class="pws-origin"'));
    assert.ok(block.length > 0);
    // Tiles side by side: the countries in one grid, the provinces in another.
    assert.equal((block.match(/<ul class="pws-tiles" role="list">/g) || []).length, 2);
    const placeButtons = buttons(block, 'pws-place'), places = placeButtons.map(tile);
    assert.deepEqual(places.map(row => row.place), ['Indonesia', 'hanya wilayah', 'luar negeri', 'tidak diketahui', 'Jawa Barat', 'DKI Jakarta']);
    // A place states its share of every X account, then its accounts and posts, so its tone always has a base in view.
    assert.deepEqual(places.map(row => row.share), ['60% akun X', '20% akun X', '12% akun X', '8% akun X', '60% akun X', '12% akun X']);
    assert.deepEqual(places.map(row => row.counts), ['60 akun · 60 posting', '20 akun · 20 posting', '12 akun · 12 posting', '8 akun · 8 posting', '60 akun · 60 posting', '12 akun · 12 posting']);
    // Tone in figures beside the donut (negative, neutral, positive), coloured by the dot before each.
    assert.deepEqual(places.map(row => row.tone), ['0% 100% 0%', '0% 0% 100%', '100% 0% 0%', '0% 0% 100%', '0% 100% 0%', '100% 0% 0%']);
    assert.equal(label(placeButtons[2]), 'luar negeri. 12 akun X, 12% dari semua akun X. 12 posting. Nada negatif 100%, netral 0%, positif 0%, dari 12 posting. Lihat postingnya.');
    assert.equal(label(placeButtons[4]), 'Jawa Barat. 60 akun X, 60% dari semua akun X. 60 posting. Nada negatif 0%, netral 100%, positif 0%, dari 60 posting. Lihat postingnya.');
    placeButtons.forEach((button, index) => assert.ok(label(button).startsWith(places[index].place + '.'), 'the visible name starts the name, with no second colon'));
    // The donut is a picture of what the name already says.
    assert.ok(placeButtons.every(button => /<svg class="pws-donut"[^>]*aria-hidden="true"/.test(button)));
    // The block is named by its own heading, which has the tip beside it.
    assert.match(html, /<section class="pws-origin" aria-labelledby="pws-origin-heading"><div class="pws-origin-head"><h3 id="pws-origin-heading">Asal akun X<\/h3>/);
    assert.match(text(block), /Negara menurut X/);
    assert.match(text(block), /Provinsi menurut lokasi profil/);
    // Every explanation is in the tip, none as a paragraph of the block.
    const about = tips(full).find(tip => tip.label === 'Tentang asal akun X')?.text || '';
    assert.match(about, /hanya tersedia dari profil X; profil TikTok, Instagram, dan YouTube tidak memberikannya\./);
    assert.match(about, /bagian dari 100 akun X dalam pilihan ini/);
    assert.match(about, /Hanya wilayah: X menyebut kawasan, misalnya Asia Tenggara, yang bisa mencakup Indonesia\./);
    assert.match(about, /provinsi terbaca pada 72 dari 100 akun X \(72%\)/);
    assert.match(about, /Menulis lokasi: 72 akun\. Tanpa lokasi: 20 akun\. Profil belum diambil: 8 akun\./);
    assert.doesNotMatch(text(block), /provinsi terbaca pada|Menulis lokasi|Hanya wilayah:|bagian dari 100 akun X/);
    assert.doesNotMatch(block, /class="pws-note"/);
    assert.match(block, /<a[^>]*href="\/pulse\/network\?topic=t1&amp;focus=map&amp;layer=accounts"[^>]*>Buka peta lokasi akun X/);
  });
});

// Four X accounts in Bandung, all based in Indonesia: two negative posts, one neutral, one positive.
const mixed = xPosts('m', 4, { author_followers: 100, author_location: 'Bandung', author_based_in: 'Indonesia' })
  .map((post, index) => ({ ...post, metrics: { ...post.metrics, sentiment: ['negative', 'negative', 'neutral', 'positive'][index] } }));

test('a tile draws its tone as a donut: one arc per tone present, in the order negative, neutral, positive', async () => {
  await load(({ render }) => {
    const [indonesia, province] = buttons(render(mixed), 'pws-place');
    assert.deepEqual(arcs(indonesia), [['negative', '50'], ['neutral', '25'], ['positive', '25']], 'sized by the module\'s own percents');
    assert.match(indonesia, /var\(--ps-sent-negative\)[\s\S]*var\(--ps-sent-neutral\)[\s\S]*var\(--ps-sent-positive\)/);
    assert.equal(tile(indonesia).tone, '50% 25% 25%');
    assert.deepEqual(arcs(province), [['negative', '50'], ['neutral', '25'], ['positive', '25']]);
    // A tone that is absent draws no arc.
    assert.deepEqual(arcs(buttons(render(full), 'pws-place')[0]), [['neutral', '100']]);
    // tone_share_v2: a post not analysed yet is the fourth arc, so the arcs still close the ring, and its share is said.
    const waiting = mixed.map((post, index) => (index === 3 ? { ...post, metrics: { ...post.metrics, sentiment: undefined } } : post));
    const [partly] = buttons(render(waiting), 'pws-place');
    assert.deepEqual(arcs(partly), [['negative', '50'], ['neutral', '25'], ['unknown', '25']]);
    assert.equal(tile(partly).tone, '50% 25% 0% 25%');
    assert.match(label(partly), /Nada negatif 50%, netral 25%, positif 0%, belum dianalisis 25%, dari 4 posting\./);
    // One key for every tile of the block, beside its heading, never one per tile.
    const html = render(mixed);
    assert.equal((html.match(/class="pws-legend"/g) || []).length, 1);
    assert.equal(text(html.match(/<ul class="pws-legend"[\s\S]*?<\/ul>/)[0]), 'negatif netral positif');
  });
});

test('without tone the donut is one ring of the share of X accounts, in the accounts series colour', async () => {
  await load(({ render }) => {
    // The page shows one sentiment only.
    const narrowed = buttons(render(full, { sentimentFiltered: true }), 'pws-place');
    assert.deepEqual(arcs(narrowed[0]), [['accounts', '60']]);
    assert.deepEqual(arcs(narrowed[2]), [['accounts', '12']]);
    assert.ok(narrowed.every(button => /var\(--ps-chart-5\)/.test(button) && !/--ps-sent-/.test(button)));
    assert.ok(narrowed.every(button => tile(button).tone === ''), 'no tone figures');
    // No post of these accounts has been analysed yet.
    const unread = xPosts('q', 3, { author_followers: 100, author_location: '', author_based_in: 'Indonesia' });
    const [only] = buttons(render(unread), 'pws-place');
    assert.deepEqual(arcs(only), [['accounts', '100']]);
    assert.equal(tile(only).tone, '');
    assert.match(label(only), /Nada belum dianalisis\./);
  });
});

test('narrowed to one sentiment: no tone column, no most-negative sentence, and a line that says why', async () => {
  await load(({ render, tips }) => {
    const html = render(full, { sentimentFiltered: true });
    assert.match(text(html), /Nada per kelompok butuh semua sentimen\./);
    assert.doesNotMatch(tips(full, { sentimentFiltered: true }).map(tip => tip.text).join(' '), /Nada:|nada negatif/, 'the tips do not explain a tone that is not drawn');
    assert.doesNotMatch(html, /class="pws-legend"/, 'no tone key for the tiles');
    assert.deepEqual(lead(html), [
      'Paling banyak ditulis akun <1 rb (52% posting), tetapi interaksi terbesar dari akun ≥1 jt (47% dari interaksi yang tercatat).',
      'Akun X paling banyak dari Jawa Barat (60 akun); provinsi terbaca pada 72% akun X.',
    ]);
    assert.doesNotMatch(html, /data-cell="tone"|pws-tone-bar|--ps-sent-/);
    assert.doesNotMatch(text(section(html, 'pws-head')), /Nada/);
    assert.doesNotMatch(section(html, 'pws-head'), /data-tone/);
    assert.equal(buttons(html, 'pws-row').length, 5, 'the groups themselves stay');
    assert.ok([...buttons(html, 'pws-row'), ...buttons(html, 'pws-place')].every(row => !/Nada/.test(label(row))), 'no tone in a row\'s name either');
    assert.ok(buttons(html, 'pws-row').every(row => !/dianalisis/.test(row)), 'no tone base in a row');
  });
});

test('a row is a button that opens exactly the posts it counts, the most interacted first', async () => {
  await load(({ WhoIsSpeaking }) => {
    const opened = [];
    const tree = WhoIsSpeaking({ posts: full, mapLink: MAP, onOpen: (title, posts, ...rest) => opened.push({ title, ids: posts.map(post => post.id), rest }) });
    const rows = clicks(tree, 'pws-row'), places = clicks(tree, 'pws-place');
    assert.equal(rows.length, 5);
    rows.forEach(click => click());
    assert.deepEqual(opened.map(call => call.title), ['Pemberitaan', 'Akun dengan ≥1 jt pengikut', 'Akun dengan 10–100 rb pengikut', 'Akun dengan <1 rb pengikut', 'Akun yang pengikutnya tidak diketahui']);
    assert.deepEqual(opened.map(call => call.ids.length), [10, 20, 20, 60, 5]);
    assert.ok(opened[1].ids.every(id => id.startsWith('big-')));
    assert.deepEqual(new Set(opened[2].ids.map(id => id.split('-')[0])), new Set(['t', 'v']));
    assert.deepEqual(opened[4].ids.slice(0, 4).sort(), ['tk-0', 'tk-1', 'tk-2', 'tk-3'], 'known interactions first');
    assert.equal(opened[4].ids[4], 'tk-4', 'a post without interactions comes last');
    assert.ok(opened.every(call => call.rest.length === 0), 'a set of posts, not one piece of content');
    opened.length = 0;
    places.forEach(click => click());
    assert.deepEqual(opened.map(call => call.title), ['Akun X: Indonesia', 'Akun X: hanya wilayah', 'Akun X: luar negeri', 'Akun X: negara tidak diketahui', 'Akun X di Jawa Barat', 'Akun X di DKI Jakarta']);
    assert.deepEqual(opened.map(call => call.ids.length), [60, 20, 12, 8, 60, 12]);
    assert.ok(opened[5].ids.every(id => id.startsWith('t-')));
  });
});

test('Akun & sumber draws the section first, scoped like the page, with the map link that keeps the page query', async () => {
  await load(async ({ module }) => {
    const { AccountsInsights } = await module('/src/pulse/PageExtras.jsx');
    const page = url => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(AccountsInsights, { posts: full })));
    const plain = page('/pulse/accounts?topic=t1');
    assert.ok(plain.indexOf('aria-label="Siapa yang bicara"') > -1);
    assert.ok(plain.indexOf('aria-label="Siapa yang bicara"') < plain.indexOf('aria-label="Konsentrasi percakapan"'), 'above Konsentrasi percakapan');
    assert.match(plain, /href="\/pulse\/network\?topic=t1&amp;focus=map&amp;layer=accounts"/);
    assert.doesNotMatch(plain, /Nada per kelompok butuh semua sentimen/);
    const narrowed = page('/pulse/accounts?topic=t1&sentiment=negative');
    assert.match(narrowed, /Nada per kelompok butuh semua sentimen/);
    assert.match(narrowed, /href="\/pulse\/network\?topic=t1&amp;sentiment=negative&amp;focus=map&amp;layer=accounts"/);
    assert.doesNotMatch(page('/pulse/accounts?topic=t1&sentiment=entah'), /Nada per kelompok butuh semua sentimen/, 'a value the page does not apply narrows nothing');
  });
});

test('Jaringan opens the map on the account layer when the link asks for it', () => {
  const source = readFileSync(new URL('../components/admin/pulse/NetworkAnalysis.jsx', import.meta.url), 'utf8');
  const line = source.match(/<RegionSpreadMap [^\n]*\/>/)?.[0] || '';
  assert.match(line, /initialLayer=\{/);
  assert.match(line, /window\.location\.search/);
  assert.match(line, /get\('layer'\)==='accounts'\?'accounts'/);
});

test('the section is drawn from tokens only, stacks at phone width and keeps text at 12px or more', () => {
  const css = readFileSync(new URL('./ds/who-is-speaking.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i, 'colours come from tokens');
  assert.doesNotMatch(css, /font-size:\s*(?:\.[0-6]\d*rem|1[01]px|[0-9]px)/, 'no text under 12px');
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*\.pws-row[\s\S]*grid-template-columns: minmax\(0, 1fr\)/, 'a row stacks its figures on a phone');
  // The answer reads first: only the first sentence at full size, the rest smaller and close together.
  assert.match(css, /\.pws-lead > li \+ li \{[^}]*font-size: \.8125rem/);
  // Places are tiles side by side, four or more across a wide panel and two on a phone.
  assert.match(css, /\.pws-tiles \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(/);
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*\.pws-tiles \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  // A group's top accounts fit one line: the pictures side by side, the names after them cut with an ellipsis.
  assert.match(css, /\.pws-names \{[^}]*white-space: nowrap[^}]*\}/);
  assert.match(css, /\.pws-names \{[^}]*text-overflow: ellipsis/);
  assert.doesNotMatch(css, /overflow-x:\s*(?:auto|scroll)/, 'nothing scrolls sideways');
  const source = readFileSync(new URL('./WhoIsSpeaking.jsx', import.meta.url), 'utf8');
  assert.match(source, /sentimentColor/, 'tone uses the sentiment colours of the Sentimen page');
  assert.match(source, /chartSeries/, 'the share bars use the chart series, from the one source of data colours');
  assert.match(source, /AccountAvatar/);
  // A row's posts are placed by the module's own groupings: no second copy of either rule lives here.
  assert.match(source, /tierOf\(post, followers\)/);
  assert.match(source, /countryOf\(row\.based_in\)/);
  assert.doesNotMatch(source, /REGIONS|'min' in|voiceOf|\.min\b/);
  assert.doesNotMatch(source, /carrier|negative: null/, 'the sentences are exactly what leadSentences returns');
  // Every share is worked out and written by the module: no second way of cutting a percent or dividing a base.
  assert.match(source, /shareText/);
  assert.match(source, /followersKnownShare\(tiers\)/);
  assert.match(source, /followersKnownInteractionShare\(tiers\)/);
  assert.match(source, /platformName: platformLabel/, 'platforms in the sentences are named as everywhere on the page');
  assert.match(source, /provinceReadShare\(origin\)/);
  assert.match(source, /accountShare\(/);
  assert.doesNotMatch(source, /Math\.floor|const cut\b|\/ (?:total|origin\.accounts|tiers\.social_posts)/);
});
