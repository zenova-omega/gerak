import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { insightView, openingFormat, periodBadge, scopeDiffers, splitLead } from './summaryModel.js';

const post = (code, author, platform, url, extra = {}) => ({ code, id: 'post-' + code, author, platform, url, published_at: '2026-11-03T00:00:00Z', interactions: 665, text: 'Teks ' + code, ...extra });
const stored = (overrides = {}) => ({
  format: 'insights', created_at: '2026-11-14T02:27:00Z',
  sections: [
    { title: 'Judul', kind: 'headline', paragraphs: ['Isu penyadapan melonjak pada 8 Nov [A1].'], bullets: [] },
    { title: 'Insight', kind: 'insights', paragraphs: [], bullets: [
      'Lonjakan terjadi pada 8 Nov. Posting dengan interaksi tertinggi muncul hari itu [I2][K3].',
      'Posting negatif mendominasi, dengan 50% dari posting yang dianalisis [N1]. Komentar teratas menyindir penegak hukum [K3][K2].',
      'Akun orangdalam.update menjadi penggerak dengan 317.599 interaksi [P2].',
    ] },
  ],
  facts: {},
  sources: [
    post('A1', 'padarincang2026', 'tiktok', 'https://www.tiktok.com/@padarincang2026/video/1'),
    post('K3', 'sanioce_', 'tiktok', 'https://www.tiktok.com/@putra.ajisujati/video/7', { comment: true, published_at: null, interactions: 15865 }),
    post('N1', 'gemathebillionaire', 'instagram', 'https://www.instagram.com/p/DfcEm4XSuuS/', { published_at: null }),
    post('K2', 'cah.kalem075', 'tiktok', 'https://www.tiktok.com/@putra.ajisujati/video/7', { comment: true, published_at: null }),
    post('P2', 'orangdalam.update', 'tiktok', 'javascript:alert(1)'),
  ],
  scope: { posts: 3000, comments: 17514, truncated: true, from: '2026-11-03', to: '2026-11-09', platforms: null },
  ...overrides,
});
const loaded = (summary, extra = {}) => ({ available: true, posts_now: 3200, min_posts: 30, formats: [], summaries: summary ? { insights: summary } : {}, ...extra });
const week = { from: '2026-11-03', to: '2026-11-09' };
/** The one button with this label, as markup, so its own attributes can be checked. */
const button = (html, label) => { const found = html.match(new RegExp('<button[^>]*>(?:(?!</button>).)*' + label + '</button>', 'g')) || []; assert.equal(found.length, 1, `one "${label}" button`); return found[0]; };

test('the period badge names a week, a month, or a chosen period', () => {
  assert.equal(periodBadge('2026-11-03', '2026-11-09'), 'Mingguan');
  assert.equal(periodBadge('2026-11-03', '2026-11-10'), 'Periode pilihan');
  assert.equal(periodBadge('2026-11-03', '2026-11-08'), 'Periode pilihan');
  for (const to of ['2026-11-28', '2026-11-30', '2026-12-01']) assert.equal(periodBadge('2026-11-01', to), 'Bulanan');   // 28, 30 and 31 days
  assert.equal(periodBadge('2026-11-01', '2026-11-27'), 'Periode pilihan');
  assert.equal(periodBadge('2026-11-01', '2026-12-02'), 'Periode pilihan');
  assert.equal(periodBadge('', ''), 'Periode pilihan');
  assert.equal(periodBadge('2026-11-03', ''), 'Periode pilihan');
});

test('an insight is split into its first sentence and the explanation after it', () => {
  assert.deepEqual(splitLead('Lonjakan terjadi pada 8 Nov. Posting tertinggi muncul hari itu [K3].'), ['Lonjakan terjadi pada 8 Nov.', 'Posting tertinggi muncul hari itu [K3].']);
  // Evidence codes that close the first sentence stay with it, before or after its full stop.
  assert.deepEqual(splitLead('Dibuka akun_a pada 1 Nov [A1]. Baru 3 interaksi [A1].'), ['Dibuka akun_a pada 1 Nov [A1].', 'Baru 3 interaksi [A1].']);
  assert.deepEqual(splitLead('Dibuka akun_a pada 1 Nov. [A1][N2] Baru 3 interaksi.'), ['Dibuka akun_a pada 1 Nov. [A1][N2]', 'Baru 3 interaksi.']);
  // Thousands, clock times, titles and initials are not sentence ends.
  assert.deepEqual(splitLead('Akun x mendapat 317.599 interaksi pada pukul 19.30 WIB. Itu yang tertinggi.'), ['Akun x mendapat 317.599 interaksi pada pukul 19.30 WIB.', 'Itu yang tertinggi.']);
  assert.deepEqual(splitLead('Jend. Listyo Sigit dan H. Ahmad disebut paling sering. Keduanya muncul di 40 posting.'), ['Jend. Listyo Sigit dan H. Ahmad disebut paling sering.', 'Keduanya muncul di 40 posting.']);
  assert.deepEqual(splitLead('Apakah ini rekayasa? Pertanyaan itu muncul di 12 komentar.'), ['Apakah ini rekayasa?', 'Pertanyaan itu muncul di 12 komentar.']);
  assert.deepEqual(splitLead('Satu kalimat saja [P2].'), ['Satu kalimat saja [P2].', '']);
  assert.deepEqual(splitLead(''), ['', '']);
});

test('evidence is renumbered from 1 in the order the page first cites it, and each number keeps its source', () => {
  const view = insightView(stored());
  assert.equal(view.headline, 'Isu penyadapan melonjak pada 8 Nov.');                       // the headline carries no reference
  assert.deepEqual(view.evidence.map(row => [row.number, row.source.code]), [[1, 'K3'], [2, 'N1'], [3, 'K2'], [4, 'P2']]);   // A1 is cited by the headline only
  assert.equal(view.insights.length, 3);
  const [first, second, third] = view.insights;
  assert.deepEqual(first.lead, [{ text: 'Lonjakan terjadi pada 8 Nov.' }]);
  assert.deepEqual(first.body, [{ text: 'Posting dengan interaksi tertinggi muncul hari itu.' }, { number: 1 }]);   // [I2] has no source and is dropped
  assert.deepEqual(second.lead, [{ text: 'Posting negatif mendominasi, dengan 50% dari posting yang dianalisis.' }, { number: 2 }]);
  assert.deepEqual(second.body, [{ text: 'Komentar teratas menyindir penegak hukum.' }, { number: 1 }, { number: 3 }]);
  assert.deepEqual(third, { lead: [{ text: 'Akun orangdalam.update menjadi penggerak dengan 317.599 interaksi.' }, { number: 4 }], body: [] });
});

test('an answer that ignored the format is still shown, without a made-up headline', () => {
  const view = insightView({ sections: [{ title: 'Ringkasan', kind: 'overview', paragraphs: ['Isu ramai sejak 3 Nov [A1]. Negatif 50% [N1].'], bullets: [] }], sources: [{ code: 'A1' }, { code: 'N1' }] });
  assert.equal(view.headline, '');
  assert.deepEqual(view.insights, [{ lead: [{ text: 'Isu ramai sejak 3 Nov.' }, { number: 1 }], body: [{ text: 'Negatif 50%.' }, { number: 2 }] }]);
  assert.deepEqual(insightView(null), { headline: '', insights: [], evidence: [] });
  // A comment quoted inside an insight keeps its own spacing; only the dropped code and the space before it go.
  const quoted = insightView({ sections: [{ title: 'Insight', kind: 'insights', paragraphs: [], bullets: ['Komentar teratas berbunyi "nyadap presiden pinter . nyadap bandar sulit" [I9][K2].'] }], sources: [{ code: 'K2' }] });
  assert.deepEqual(quoted.insights[0].lead, [{ text: 'Komentar teratas berbunyi "nyadap presiden pinter . nyadap bandar sulit".' }, { number: 1 }]);
});

test('a stored insight is compared with the period and platforms chosen in the project bar', () => {
  const scope = { from: '2026-11-03', to: '2026-11-09', platforms: ['x', 'tiktok'] };
  assert.equal(scopeDiffers(scope, week, ['tiktok', 'x']), false);
  assert.equal(scopeDiffers(scope, week, null), true);
  assert.equal(scopeDiffers(scope, { from: '2026-11-04', to: '2026-11-09' }, ['x', 'tiktok']), true);
  assert.equal(scopeDiffers({ from: null, to: null, platforms: null }, { from: '', to: '' }, null), false);
  assert.equal(scopeDiffers({ from: null, to: null, platforms: null }, { from: '', to: '' }, []), false);   // no platform chosen means all
});

test('the summary card on Ikhtisar never opens on a format it does not list', () => {
  const formats = [{ key: 'brief', label: 'Ringkas' }, { key: 'timeline', label: 'Kronologi' }, { key: 'executive', label: 'Eksekutif' }];
  assert.equal(openingFormat({ formats, summaries: { insights: {} } }), 'brief');            // only AI Insights was written
  assert.equal(openingFormat({ formats, summaries: { insights: {}, executive: {} } }), 'executive');
  assert.equal(openingFormat({ formats, summaries: { timeline: {}, brief: {} } }), 'brief');
  assert.equal(openingFormat({ formats, summaries: {} }), 'brief');
  assert.equal(openingFormat({ summaries: { timeline: {} } }), 'timeline');                  // an older server that sent no list
  const card = readFileSync(new URL('./AiSummaryCard.jsx', import.meta.url), 'utf8');
  assert.match(card, /setFormat\(openingFormat\(merged\)\)/);           // what the server sent, with answers kept since
  assert.doesNotMatch(card, /insights/);
});

test('AI Insights is a page in the Ringkasan group, right after Ikhtisar, with a mark of its own', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { pageMeta, pageOrder, pageGroups } = await server.ssrLoadModule('/src/pulse/pageMeta.js');
    const meta = pageMeta.insights;
    assert.equal(meta.title, 'AI Insights');
    assert.ok(meta.tagline.split(/\s+/).length <= 5 && !/[.—]/.test(meta.tagline), 'tagline is five words or fewer, no full stop');
    assert.equal(meta.guide.length, 2);
    assert.equal(Object.values(pageMeta).filter(page => page.icon === meta.icon).length, 1, 'no other page uses this icon');
    assert.equal(pageOrder[pageOrder.indexOf('overview') + 1], 'insights');
    assert.deepEqual(pageGroups[0], ['Ringkasan', ['overview', 'insights', 'chat', 'reports']]);
    const app = readFileSync(new URL('./PulseApp.jsx', import.meta.url), 'utf8');
    assert.match(app, /id === 'insights' \? <AiInsights chart=\{<InsightsTrend \/>\} \/>/, 'the page is routed, with the trend chart in its side column');
  } finally { await server.close(); }
});

test('the AI Insights page shows every state in plain Indonesian and never names an engine', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { InsightsView } = await server.ssrLoadModule('/src/pulse/AiInsights.jsx');
    const render = props => renderToStaticMarkup(React.createElement(InsightsView, { topicId: 'topic-a', projectName: 'Penyadapan Presiden', period: week, platforms: null, onMake() {}, onRetry() {}, ...props }));
    const pages = {};

    // A stored insight: headline, numbered insights, references that open the source, the period card, an empty chart slot.
    const html = pages.stored = render({ state: loaded(stored()) });
    assert.match(html, /<h1[^>]*>AI Insights<\/h1>/);
    assert.match(html, /<h2[^>]*>Isu penyadapan melonjak pada 8 Nov\.<\/h2>/);
    assert.equal(html.match(/<li class="ain-insight"/g).length, 3);
    assert.match(html, /<strong>Lonjakan terjadi pada 8 Nov\.<\/strong>/);
    const reference = html.match(/<a [^>]*aria-label="Bukti 1: [^"]*"[^>]*>1<\/a>/)[0];
    assert.match(reference, /aria-label="Bukti 1: komentar akun sanioce_ pada posting di TikTok"/);
    assert.match(reference, /href="https:\/\/www\.tiktok\.com\/@putra\.ajisujati\/video\/7"/);   // a comment opens its post
    assert.match(reference, /target="_blank"/);
    assert.match(reference, /rel="noopener noreferrer"/);
    assert.match(html, /aria-label="Bukti 2: posting akun gemathebillionaire di Instagram"/);
    assert.equal(html.match(/aria-label="Bukti 1: /g).length, 2, 'the same source keeps its number when cited again');
    assert.doesNotMatch(html, /javascript:/);                                                    // an unsafe address is never linked
    assert.match(html, /href="#ain-bukti-4"[^>]*aria-label="Bukti 4: posting akun orangdalam\.update di TikTok"|aria-label="Bukti 4: posting akun orangdalam\.update di TikTok"[^>]*href="#ain-bukti-4"/);
    assert.doesNotMatch(html, /\[[PANKI]\d\]/);                                                  // no raw evidence code reaches the page
    assert.equal(html.match(/<li id="ain-bukti-\d"/g).length, 4);
    assert.match(html, /<h2 class="[^"]*ain-project"[^>]*>Penyadapan Presiden<\/h2>/);
    assert.match(html, /class="ain-range">3 Nov 2026 – 9 Nov 2026</);
    assert.match(html, /class="[^"]*ain-badge">Mingguan</);
    assert.match(html, /class="ain-platforms">Semua platform</);
    assert.match(html, /<div class="ain-chart"><\/div>/);
    assert.match(html, /Ditulis 14 Nov 2026, 09\.27 WIB dari 3\.000 posting terbaru dan 17\.514 komentar\. Posting yang lebih lama tidak dibaca\./);
    assert.match(render({ state: loaded(stored({ scope: { ...stored().scope, truncated: false } })) }), /dari 3\.000 posting dan 17\.514 komentar\.<\/p>/);
    assert.doesNotMatch(button(html, 'Perbarui insight'), / disabled=""/);
    assert.doesNotMatch(html, /Buat insight|role="alert"|ain-differs/);
    assert.match(render({ state: loaded(stored()), chart: React.createElement('figure', null, 'grafik') }), /<div class="ain-chart"><figure>grafik<\/figure><\/div>/);

    // The badge follows the length of the period.
    assert.match(render({ state: loaded(stored({ scope: { ...stored().scope, from: '2026-10-11', to: '2026-11-09' } })), period: { from: '2026-10-11', to: '2026-11-09' } }), /ain-badge">Bulanan</);
    assert.match(render({ state: loaded(stored({ scope: { ...stored().scope, from: null, to: null } })), period: {} }), /ain-range">Seluruh periode tersimpan<[\s\S]*ain-badge">Periode pilihan</);

    // No project chosen.
    pages.none = render({ topicId: '', projectName: '', state: null });
    assert.match(pages.none, /Pilih project terlebih dahulu/);
    assert.doesNotMatch(pages.none, /<button[^>]*>[^<]*(Buat|Perbarui) insight/);

    // Nothing written yet: one action, and the period card shows what it will cover.
    pages.empty = render({ state: loaded(null) });
    assert.match(pages.empty, /Belum ada insight untuk project ini/);
    assert.doesNotMatch(button(pages.empty, 'Buat insight'), / disabled=""/);
    assert.match(pages.empty, /ain-range">3 Nov 2026 – 9 Nov 2026<[\s\S]*ain-badge">Mingguan</);
    assert.doesNotMatch(pages.empty, /Perbarui insight/);

    // AI not available: the stored insight stays readable, the action is off and says why.
    pages.off = render({ state: loaded(stored(), { available: false }) });
    assert.match(pages.off, /belum diaktifkan di instalasi ini/);
    assert.match(button(pages.off, 'Perbarui insight'), /disabled=""/);
    assert.match(pages.off, /Lonjakan terjadi pada 8 Nov\./);
    const offEmpty = render({ state: loaded(null, { available: false }) });
    assert.match(button(offEmpty, 'Buat insight'), /disabled=""/);
    assert.match(offEmpty, /belum diaktifkan di instalasi ini/);

    // Fewer posts than the floor: a warning, never a block.
    pages.thin = render({ state: loaded(null, { posts_now: 12 }) });
    assert.match(pages.thin, /Baru 12 posting terkumpul/);
    assert.doesNotMatch(button(pages.thin, 'Buat insight'), / disabled=""/);
    const noPosts = render({ state: loaded(null, { posts_now: 0 }) });
    assert.match(button(noPosts, 'Buat insight'), /disabled=""/);
    assert.match(noPosts, /Belum ada posting tersimpan untuk project ini/);
    assert.doesNotMatch(noPosts, /Baru 0 posting/);

    // Writing: the pulse with honest wording; a previous insight stays on screen.
    pages.writing = render({ state: loaded(null), busy: true });
    assert.match(pages.writing, /aria-busy="true"/);
    assert.match(pages.writing, /class="pu-loader"[^>]*role="status"[\s\S]*?sekitar satu menit/);
    assert.match(pages.writing, /<button[^>]*disabled=""[^>]*aria-busy="true"[^>]*>(?:(?!<\/button>).)*Menulis insight…<\/button>/);
    pages.rewriting = render({ state: loaded(stored()), busy: true });
    assert.match(pages.rewriting, /class="pu-loader"[\s\S]*?Insight sebelumnya tetap tampil/);
    assert.match(pages.rewriting, /Lonjakan terjadi pada 8 Nov\./);

    // Failed: said once as an alert, the previous insight is kept.
    pages.failed = render({ state: loaded(stored()), error: 'Insight belum berhasil ditulis. Insight sebelumnya tetap ditampilkan.' });
    assert.match(pages.failed, /role="alert"[^>]*>Insight belum berhasil ditulis\. Insight sebelumnya tetap ditampilkan\./);
    assert.match(pages.failed, /Lonjakan terjadi pada 8 Nov\./);

    // Written for another period or other platforms than the project bar shows now: one line and the action.
    pages.differs = render({ state: loaded(stored()), period: { from: '2026-11-08', to: '2026-11-14' }, platforms: ['x', 'tiktok'] });
    const line = pages.differs.match(/<div class="[^"]*ain-differs[\s\S]*?<\/div>/)[0];
    assert.match(line, /ditulis untuk 3 Nov 2026 – 9 Nov 2026, semua platform/);
    assert.match(line, /8 Nov 2026 – 14 Nov 2026, TikTok dan X/);
    assert.doesNotMatch(button(pages.differs, 'Perbarui insight'), / disabled=""/);                   // one action, not two with the same name
    assert.match(pages.differs, /class="ain-range">3 Nov 2026 – 9 Nov 2026</, 'the period card describes the insight on screen');

    // The stored insight could not be read.
    pages.unreadable = render({ state: { failed: true } });
    assert.match(pages.unreadable, /tidak dapat dimuat/);
    assert.match(pages.unreadable, /<button[^>]*>Coba lagi<\/button>/);
    assert.match(render({ state: { failed: true, missing: true } }), /Project tidak tersedia/);
    assert.match(render({ state: null }), /role="status"/);                                      // still loading

    for (const [name, page] of Object.entries(pages)) {
      assert.doesNotMatch(page, /—/, `${name}: no em dash in the copy`);
      assert.doesNotMatch(page, /ollama|qwen|claude|anthropic|openai|gpt|gemini|llama|\bLLM\b|\bmodel\b/i, `${name}: no engine, vendor or model named`);
    }
  } finally { await server.close(); }
});

test('two codes that point at the same post share one number and one row of evidence', async () => {
  const { insightView } = await import('./summaryModel.js');
  const post = { id: 'p1', author: 'akun_ramai', platform: 'instagram', url: 'https://example.test/p1', text: 'Teks posting' };
  const view = insightView({
    sections: [{ kind: 'insights', bullets: ['Akun ini paling ramai [P1][N1]. Komentar terbanyak ada di bawahnya [K1].'] }],
    sources: [{ ...post, code: 'P1' }, { ...post, code: 'N1' }, { id: 'p1', code: 'K1', comment: true, author: 'warga', platform: 'instagram', url: post.url, text: 'Setuju' }],
  });
  assert.deepEqual(view.evidence.map(row => [row.number, row.source.author]), [[1, 'akun_ramai'], [2, 'warga']], 'the comment under that post is its own evidence');
  const numbers = [...view.insights[0].lead, ...view.insights[0].body].filter(part => part.number).map(part => part.number);
  assert.deepEqual(numbers, [1, 2], 'the same number is not printed twice in a row');
});

test('a sentence about a place cites the post behind it with its own code, like any other evidence', async () => {
  const { insightView } = await import('./summaryModel.js');
  const view = insightView({
    sections: [{ kind: 'insights', bullets: ['Jakarta paling sering disebut, 378 posting [T1]. Akun ini paling ramai [P1].'] }],
    sources: [{ id: 'p9', code: 'T1', author: 'Media Kota', platform: 'news', url: 'https://example.test/p9', text: 'Aksi di Jakarta' },
      { id: 'p1', code: 'P1', author: 'akun_ramai', platform: 'x', url: 'https://example.test/p1', text: 'Teks' }],
  });
  assert.deepEqual(view.evidence.map(row => [row.number, row.source.author]), [[1, 'Media Kota'], [2, 'akun_ramai']]);
  const words = [...view.insights[0].lead, ...view.insights[0].body].map(part => part.text ?? '').join('');
  assert.doesNotMatch(words, /\[T1\]/, 'the code is shown as a numbered mark, never as raw text');
});

test('each piece of evidence shows the account picture the server sends, and initials when there is none', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { InsightsView } = await server.ssrLoadModule('/src/pulse/AiInsights.jsx');
    const summary = stored();
    summary.sources = summary.sources.map(source => (source.code === 'N1' ? { ...source, photo: 'https://cdn.example.com/gema.jpg' } : { ...source, photo: null }));
    const html = renderToStaticMarkup(React.createElement(InsightsView, { topicId: 'topic-a', projectName: 'Penyadapan', period: week, platforms: null, state: loaded(summary), onMake() {}, onRetry() {} }));
    const rows = [...html.matchAll(/<li id="ain-bukti-\d+"[\s\S]*?<\/li>/g)].map(match => match[0]);
    const withPhoto = rows.find(row => row.includes('gemathebillionaire'));
    assert.match(withPhoto, /<img[^>]*src="https:\/\/cdn\.example\.com\/gema\.jpg"[^>]*alt="Foto profil gemathebillionaire"/);
    const without = rows.find(row => row.includes('sanioce_'));
    assert.doesNotMatch(without, /<img/);
    assert.match(without, />SA</, 'initials stand in when no picture is known');
  } finally { await server.close(); }
});

test('the summary card says it read the whole project, and names an older summary that read only part of it', async () => {
  const { cardScope } = await import('./summaryModel.js');
  assert.deepEqual(cardScope({ posts: 7875, from: null, to: null, platforms: null, span: { from: '2026-05-22', to: '2026-11-15' } }, 7875),
    { whole: true, text: 'Seluruh periode project (22 Mei 2026 – 15 Nov 2026), semua platform', newer: 0 });
  assert.equal(cardScope({ posts: 7000, from: null, to: null, platforms: null, span: null }, 7875).newer, 875, 'posts stored since it was written');
  assert.equal(cardScope({ posts: 7000, span: null }, 7875).text, 'Seluruh periode project, semua platform');
  const narrow = cardScope({ posts: 7163, from: '2026-11-08', to: '2026-11-14', platforms: null }, 7875);
  assert.deepEqual([narrow.whole, narrow.newer], [false, 0]);
  assert.equal(narrow.text, 'Hanya 8 Nov 2026 – 14 Nov 2026, semua platform');
  assert.equal(cardScope({ posts: 9, from: null, to: null, platforms: ['x', 'news'] }, 20).text, 'Hanya seluruh periode tersimpan, 2 platform');
});

test('a summary being written or already read outlives the card when the page reloads for another filter', async () => {
  const store = await import('./summaryStore.js');
  store.forget('t1');
  assert.equal(store.stored('t1'), null);
  store.keep('t1', { posts_now: 5, summaries: {} });
  let finish;
  const writing = store.write('t1', 'brief', () => new Promise(resolve => { finish = resolve; }));
  assert.equal(store.writing('t1', 'brief'), writing, 'a card mounted again finds the request still running');
  finish({ sections: [], scope: { posts: 5 } });
  await writing;
  assert.equal(store.writing('t1', 'brief'), null);
  assert.deepEqual(store.stored('t1').summaries.brief, { sections: [], scope: { posts: 5 } }, 'the answer is kept even when no card was there to take it');
  const failed = store.write('t1', 'timeline', () => Promise.reject(new Error('down')));
  await assert.rejects(failed);
  assert.equal(store.writing('t1', 'timeline'), null);
  assert.equal(store.stored('t1').summaries.timeline, undefined);
});

test('the summary card asks for the whole project and counts against the whole project', () => {
  const card = readFileSync(new URL('./AiSummaryCard.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(card, /period\.(from|to)|body\.platforms|body\.from|body\.to/, 'the bar\'s period and platforms are never sent');
  assert.match(card, /posts_now/, 'stale and thin are measured against every stored post');
  const overview = readFileSync(new URL('./ProjectOverview.jsx', import.meta.url), 'utf8');
  assert.match(overview, /<AiSummaryCard key=\{params\.get\('topic'\)\|\|''\} topicId=\{params\.get\('topic'\)\|\|''\}\/>/);
});
