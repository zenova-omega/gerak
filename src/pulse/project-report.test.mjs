import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = () => createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
const sheets = html => html.match(/<article class="rp-page[\s\S]*?<\/article>/g) || [];
const sheet = (html, section) => sheets(html).find(page => page.includes(`data-section="${section}"`)) || '';
/** Everything inside the element that is sent to the PDF renderer: it is the last thing in the workspace. */
const printed = html => html.slice(html.indexOf('<div class="rp-doc'));
const titles = ['Ringkasan eksekutif', 'Volume dan sentimen', 'Suara warganet dan pemberitaan', 'Opini publik dari komentar', 'Platform dan akun teratas', 'Sebaran tempat', 'Posting teratas', 'Konten yang paling banyak diulang', 'Cakupan dan batasan'];

test('the report is a stack of A4 pages, each with the period, the brand mark and a page number, and nothing to freeze first', async () => {
  const server = await vite();
  try {
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const html = renderToStaticMarkup(React.createElement(Report, {
      topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period: { from: '2026-11-01', to: '2026-11-12' },
      data: { posts: [{ id: 'one', author: 'Source', platform: 'x', url: 'https://x.com/i/status/1', text: 'Isi posting', metrics: { engagement: 8 }, published_at: '2026-11-03T00:00:00Z' }] },
    }));
    const pages = sheets(html);
    assert.equal(pages.length, 10, 'cover plus nine sections, one page each');
    pages.forEach((page, index) => {
      assert.match(page, /<header class="rp-head"><span class="rp-pill">1–12 Nov 2026<\/span>/, 'the period pill opens every page');
      assert.match(page, /class="rp-brand"/, 'every page carries the brand mark');
      assert.ok(page.includes(`<strong>Project Uji</strong><span>Laporan PULSE</span></span><span class="rp-folio">${index + 1} / 10</span>`), `page ${index + 1} is numbered in its footer`);
    });
    assert.match(pages[0], /<h2 class="rp-cover-title">Project Uji<\/h2>/);
    assert.match(pages[0], /<dt>Periode<\/dt><dd>1–12 Nov 2026<\/dd>/);
    assert.deepEqual(pages.slice(1).map(page => page.match(/<div class="rp-title"><h2>(.*?)<\/h2>/)?.[1]), titles);
    assert.doesNotMatch(html, /2026-11-01|2026-11-12|2026-11-03/, 'dates read like every other date, never as raw ISO');

    // Conclusions first: without a stored summary the page writes plain sentences from the data.
    const summary = sheet(html, 'summary');
    assert.match(summary, /Disusun otomatis dari angka dalam laporan ini\./);
    assert.match(summary, /Terkumpul 1 posting dari 1 akun dan sumber di 1 platform, semuanya terbit pada 3 Nov 2026\./);
    assert.match(summary, /<dt>Posting<\/dt>[\s\S]*<dt>Akun dan sumber<\/dt>[\s\S]*<dt>Interaksi<\/dt><dd>8<\/dd>[\s\S]*<dt>Komentar dianalisis<\/dt>/);
    assert.doesNotMatch(summary, /Batasan|bukan seluruh percakapan/, 'the caveats moved out of the summary');
    // The honest fine print has its own page.
    const method = sheet(html, 'method');
    for (const line of [/bukan seluruh percakapan di tiap platform/, /tidak dianggap netral/, /tidak memuat perkiraan jangkauan/, /tidak memeriksa kebenaran klaim/, /<dt>Kata kunci<\/dt><dd class="rp-clamp" title="kata kunci">kata kunci<\/dd>/]) assert.match(method, line);

    // An account is its avatar with initials underneath, and a post keeps the link to its source.
    const posts = sheet(html, 'posts');
    assert.match(posts, /<span class="rp-face" data-size="md" data-initials="SO"><span class="ps-profile-avatar psi-avatar">/);
    assert.match(posts, /<a class="rp-source" href="https:\/\/x.com\/i\/status\/1">x.com\/i\/status\/1<\/a>/);
    assert.match(posts, /Belum dianalisis/);
    assert.match(posts, /<dt>Interaksi<\/dt><dd>8<\/dd>/);

    // One click to a file; the old two-step flow is gone.
    assert.match(html, /Unduh PDF/);
    assert.match(html, />Cetak<\/button>/);
    assert.doesNotMatch(html, /Buat &amp; bekukan|Draf langsung|Laporan dibekukan|Save as PDF/i);
    assert.match(html, /<style>@page\{size:A4;margin:0\}<\/style>/, 'the paper has no margin while the report is open');

    // What is on screen only is marked, and none of it is inside the element that gets printed.
    assert.match(html, /<div class="pr-bar" data-screen-only=""/);
    assert.match(html, /<aside class="rb" data-screen-only=""/);
    assert.match(html, /<details class="pr-more" data-screen-only=""><summary>Arsip dan data mentah<\/summary>/, 'the archive is a closed disclosure');
    assert.match(html, /Unduh JSON/);
    assert.match(html, /Arsip laporan/);
    assert.ok(html.indexOf('<aside class="rb"') < html.indexOf('<div class="rp-doc'), 'the builder comes before the pages');
    assert.doesNotMatch(printed(html), /data-screen-only|<button|<input|<select|<textarea|<canvas|<script|<iframe|<form|<link|foreignObject/);
    assert.doesNotMatch(printed(html), /style="[^"]*url\(/);

    // The builder: a switch and two real buttons per section, and the brand fields.
    assert.equal((html.match(/role="switch"/g) || []).length, 10);
    assert.match(html, /aria-label="Naikkan Ringkasan eksekutif"/);
    assert.match(html, /aria-label="Turunkan Ringkasan eksekutif"/);
    assert.match(html, /10 bagian dicetak, 10 halaman/);
    for (const field of [/type="file"[^>]*accept="image\/png,image\/jpeg,image\/webp"/, /id="rb-accent" type="color"[^>]*value="#544380"/, /id="rb-organisation"[^>]*maxLength="80"/, /<textarea id="rb-description"[^>]*maxLength="600"/]) assert.match(html, field);
  } finally { await server.close(); }
});

test('a page without data says so in one sentence instead of drawing an empty chart', async () => {
  const server = await vite();
  try {
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const html = renderToStaticMarkup(React.createElement(Report, { selectedPlatforms: [], topic: { id: 'p' }, data: { posts: [{ id: 'excluded', author: 'Excluded author', platform: 'x', metrics: {} }] } }));
    assert.match(sheet(html, 'cover'), /<dt>Platform<\/dt><dd>Tidak ada platform dipilih<\/dd>/);
    assert.doesNotMatch(html, /Excluded author/);
    assert.equal(sheets(html).length, 10, 'an empty section keeps its page');
    assert.match(sheet(html, 'places'), /<p class="rp-empty">Belum ada posting yang menyebut provinsi, kota atau kabupaten pada periode ini\.<\/p>/);
    assert.match(sheet(html, 'summary'), /Belum ada posting pada periode dan platform yang dipilih\./);
    assert.match(sheet(html, 'trend'), /<p class="rp-empty">Belum ada posting pada periode ini, jadi tren belum dapat digambar\.<\/p>/);
    assert.match(sheet(html, 'opinion'), /<p class="rp-empty">Belum ada komentar tersimpan/);
    assert.match(sheet(html, 'posts'), /<p class="rp-empty">Belum ada posting pada periode ini untuk diperingkat\.<\/p>/);
    assert.match(sheet(html, 'narratives'), /<p class="rp-empty">Belum ada konten yang diulang/);
    assert.doesNotMatch(printed(html), /<svg class="rp-trend"|class="rp-bar/);
    assert.equal((printed(html).match(/<table/g) || []).length, 1, 'only the coverage table is left');
    assert.match(sheet(html, 'method'), /<th scope="row">Seluruh laporan<\/th><td class="rp-num">0<\/td><td class="rp-num">—<\/td><td>Tidak ada posting pada periode ini<\/td>/);
  } finally { await server.close(); }
});

test('sections, order, brand and a stored summary shape the pages', async () => {
  const server = await vite();
  try {
    const { default: ReportPages } = await server.ssrLoadModule('/src/pulse/ReportPages.jsx');
    const { buildReport } = await server.ssrLoadModule('/src/lib/pulseReport.js');
    const lib = await server.ssrLoadModule('/src/lib/pulseReportPages.js');
    const posts = Array.from({ length: 6 }, (_, index) => ({
      id: 'p' + index, author: 'akun ' + (index % 3), platform: index === 5 ? 'news' : 'instagram', issue_id: index < 3 ? 'same' : null, text: index < 3 ? 'Teks yang diulang' : 'Teks ' + index,
      published_at: `2026-11-0${index + 1}T02:00:00Z`, metrics: { likes: 10 * (index + 1), sentiment: { label: ['negative', 'neutral', 'positive'][index % 3] }, ...(index === 0 ? { repost: true, original_shares: 3600 } : {}) },
    }));
    const report = buildReport({ posts }, { id: 't', label: 'Isu Uji' }, {}, '2026-11-14T03:00:00Z', null, { loaded: true, error: false, response: null });
    let sections = lib.switchSection(lib.resolveSections([]), 'opinion', false);
    sections = lib.moveSection(sections, 'method', -1);
    const pages = lib.reportPages(sections, { topPosts: report.topPosts });
    const summary = lib.storedSummary({ summaries: { executive: { created_at: '2026-11-14T02:00:00Z', scope: { posts: 6, comments: 0 }, sections: [
      { title: 'Ringkasan', kind: 'overview', paragraphs: ['Isu ramai sejak 1 Nov [P1].'], bullets: [] }, { title: 'Perlu diperhatikan', kind: 'watch', paragraphs: [], bullets: ['Akun besar [A1].'] }] } } });
    const brand = { logo: 'data:image/png;base64,AAAA', accent: '#0e746e', organisation: 'Dinas Uji', description: 'Untuk rapat pimpinan.' };
    const html = renderToStaticMarkup(React.createElement(ReportPages, { report, pages, data: lib.reportData(report), summary, brand }));

    assert.match(html, /^<div class="rp-doc pr-document" style="--rp-accent:#0e746e">/, 'the accent is a variable on the document root');
    assert.deepEqual(sheets(html).map(page => page.match(/data-section="(\w+)"/)[1]), ['cover', 'summary', 'trend', 'voices', 'sources', 'places', 'posts', 'posts', 'method', 'narratives']);
    assert.match(html, /<span class="rp-folio">10 \/ 10<\/span>/);
    assert.equal((html.match(/<img class="rp-brand" src="data:image\/png;base64,AAAA" alt="Logo Dinas Uji"\/>/g) || []).length, 10, 'the logo replaces the PULSE mark on every page');
    assert.match(sheet(html, 'cover'), /<div class="rp-cover-org"><strong>Dinas Uji<\/strong><p>Untuk rapat pimpinan\.<\/p><\/div>/);

    const written = sheet(html, 'summary');
    assert.match(written, /Ringkasan AI, ditulis 14 Nov 2026, 09\.00 WIB dari 6 posting dan 0 komentar\./);
    assert.match(written, /<h3>Ringkasan<\/h3><div><p>Isu ramai sejak 1 Nov\.<\/p><\/div>/, 'evidence codes are not printed');
    assert.match(written, /<ol><li>Akun besar\.<\/li><\/ol>/);
    assert.doesNotMatch(written, /Disusun otomatis/);
    assert.match(sheet(html, 'method'), /Ringkasan eksekutif dirangkai AI/);

    const [first, second] = sheets(html).filter(page => page.includes('data-section="posts"'));
    assert.equal((first.match(/class="rp-post"/g) || []).length, 4);
    assert.equal((second.match(/class="rp-post"/g) || []).length, 2);
    assert.match(second, /<h2>Posting teratas \(lanjutan\)<\/h2><p>Peringkat 5 sampai 6\.<\/p>/);
    assert.match(html, /<dt>Repost<\/dt><dd>posting asli dibagikan 3\.600×<\/dd>/, 'a repost names the original post’s shares');

    // Every chart names its colours, and the chart is real DOM.
    const trend = sheet(html, 'trend');
    assert.match(trend, /<svg class="rp-trend"[^>]*role="img" aria-label="Grafik batang jumlah posting per hari dari 1 Nov 2026 sampai 6 Nov 2026/);
    for (const label of ['Positif', 'Netral', 'Negatif', 'Belum dianalisis']) assert.match(trend, new RegExp(`<ul class="rp-legend"[\\s\\S]*<span>${label}</span>`));
    assert.match(trend, /Persentase dihitung dari 6 posting yang sudah dianalisis \(100% dari 6 posting\)/);
    const groups = sheet(html, 'narratives');
    assert.match(groups, /<dt>Dibagikan<\/dt><dd>3\.600×<\/dd>/);
    assert.match(groups, /<dt>Interaksi<\/dt><dd>60<\/dd>/, 'the original post’s shares stay out of the interactions');
    assert.doesNotMatch(html, /jangkauan (?!dan bukan|\.)|reach/i, 'no reach figure anywhere');
  } finally { await server.close(); }
});

test('the page styles keep every sheet exactly one A4 page and never make the PDF renderer fetch', async () => {
  const read = name => readFile(new URL(name, import.meta.url), 'utf8');
  const [pagesCss, workspaceCss, builderCss] = await Promise.all([read('./ds/report-pages.css'), read('./project-report.css'), read('./report-brand.css')]);
  const sheetRule = pagesCss.match(/\n\.rp-page \{([^}]*)\}/)[1];
  for (const part of ['width: 210mm', 'height: 297mm', 'overflow: hidden', 'break-after: page', 'margin: 0']) assert.ok(sheetRule.includes(part), part);
  assert.match(pagesCss, /\.rp-page:last-child \{ break-after: auto;/);
  assert.match(pagesCss, /print-color-adjust: exact/);
  assert.match(pagesCss, /font-family: Arial, "Liberation Sans", Helvetica, sans-serif/);
  // Scale, gap and edge belong to the on-screen preview only.
  const start = pagesCss.indexOf('@media screen {'), end = pagesCss.indexOf('\n}\n', start);
  assert.ok(start > 0 && end > start);
  const screenOnly = pagesCss.slice(start, end), everywhere = pagesCss.slice(0, start) + pagesCss.slice(end);
  assert.match(screenOnly, /transform: scale\(var\(--rp-scale, 1\)\)/);
  assert.doesNotMatch(everywhere, /(?<![-\w])transform:|--rp-scale|box-shadow:|outline: 1px solid oklch/);
  assert.doesNotMatch(pagesCss, /@media[^{]*(min|max)-width/, 'a sheet never depends on the width of the window');
  // The words below make the server refuse the document, or the browser drop the rule that holds them.
  for (const css of [pagesCss, workspaceCss, builderCss]) assert.doesNotMatch(css, /url\(|@import|@font-face|@namespace|expression\(|-moz-binding|behavior\s*:|image-set\(|\bsrc\(|\bimage\(|element\(|paint\(/i);
  // Printing from the browser shows the sheets and nothing else.
  assert.match(workspaceCss, /\[data-screen-only\] \{ display: none !important; \}/);
  assert.match(workspaceCss, /html:has\(\.rp-doc\) :not\(:has\(\.rp-doc\), \.rp-doc, \.rp-doc \*\) \{ display: none !important; \}/);
});

test('the place page draws the provinces the posts name, lists them, and adds where X accounts say they are', async () => {
  const server = await vite();
  try {
    const { default: ReportPages } = await server.ssrLoadModule('/src/pulse/ReportPages.jsx');
    const { buildReport } = await server.ssrLoadModule('/src/lib/pulseReport.js');
    const lib = await server.ssrLoadModule('/src/lib/pulseReportPages.js');
    const news = (id, title) => ({ id, author: 'Media ' + id, platform: 'news', title, text: '', published_at: '2026-11-05T02:00:00Z', metrics: {} });
    const posts = [news('1', 'Aksi di Jakarta'), news('2', 'Jakarta dan Bandung bergerak'), news('3', 'Pernyataan resmi'),
      { id: '4', author: '@a', platform: 'x', text: 'teks', published_at: '2026-11-05T03:00:00Z', metrics: { author_id: '1', author_location: 'Surabaya' } },
      { id: '5', author: '@b', platform: 'x', text: 'teks', published_at: '2026-11-05T04:00:00Z', metrics: { author_id: '2' } }];
    const report = buildReport({ posts }, { id: 't', label: 'Isu Uji' }, {}, '2026-11-14T03:00:00Z', null, { loaded: true, error: false, response: null });
    const pages = lib.reportPages(lib.resolveSections([]), { topPosts: report.topPosts });
    const html = renderToStaticMarkup(React.createElement(ReportPages, { report, pages, data: lib.reportData(report), summary: null, brand: { logo: null, accent: null, organisation: '', description: '' } }));
    const page = sheet(html, 'places'), text = page.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(page, /<h2>Sebaran tempat<\/h2>/);
    assert.match(page, /bukan lokasi penulis/);
    assert.match(page, /<svg[^>]*role="img"[^>]*aria-label="Peta Indonesia: 2 dari 34 provinsi disebut\. Terbanyak: DKI Jakarta 2, Jawa Barat 1\."/);
    assert.equal((page.match(/class="rm-province"/g) || []).length, 34);
    assert.match(page, /<td class="rp-cell-rank">1<\/td><th scope="row">DKI Jakarta<\/th><td class="rp-num"><strong>2<\/strong><\/td><td class="rp-num">100%<\/td><td>Jakarta 2<\/td>/);
    assert.match(text, /2 dari 5 posting menyebut tempat;/);
    assert.match(page, /<th scope="row">Jawa Timur<\/th><td class="rp-num"><strong>1<\/strong><\/td><td>Surabaya 1<\/td>/);
    assert.match(text, /1 dari 2 akun X menulis lokasi yang bisa dipetakan; 1 akun belum diperiksa\./);
    assert.match(text, /bukan posisi saat memposting/);
    assert.doesNotMatch(page, /<button|onclick|foreignObject/i, 'the picture is static: nothing in it to press');
  } finally { await server.close(); }
});

test('the report\'s account table says over how many posts each interaction total is counted, and an unknown total reads "—"', async () => {
  const server = await vite();
  try {
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const html = renderToStaticMarkup(React.createElement(Report, {
      topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period: { from: '2026-11-01', to: '2026-11-12' },
      data: { posts: [
        { id: 'a', author: 'Hitung', platform: 'x', url: 'https://x.com/i/status/1', text: 'satu', metrics: { likes: '5' }, published_at: '2026-11-03T01:00:00Z' },
        { id: 'b', author: 'Hitung', platform: 'x', url: 'https://x.com/i/status/2', text: 'dua', metrics: { likes: true }, published_at: '2026-11-03T02:00:00Z' },
        { id: 'c', author: 'Kosong', platform: 'x', url: 'https://x.com/i/status/3', text: 'tiga', metrics: { views: 4 }, published_at: '2026-11-03T03:00:00Z' },
      ] },
    }));
    const page = sheet(html, 'sources');
    assert.match(page, /<span>Hitung<\/span>[\s\S]*?<td class="rp-num">2<\/td><td class="rp-num"><strong>5<\/strong><small class="rp-count">dari 1 posting<\/small><\/td>/);
    assert.match(page, /<span>Kosong<\/span>[\s\S]*?<td class="rp-num">1<\/td><td class="rp-num"><strong>—<\/strong><\/td>/);
  } finally { await server.close(); }
});

test('the report\'s account table has one row per account by account_v1, under its most recently published name', async () => {
  const server = await vite();
  try {
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const post = (id, platform, author, day, metrics = {}) => ({ id, platform, author, url: `https://example.com/${id}`, text: 'teks ' + id, published_at: `2026-11-${day}T03:00:00Z`, metrics: { likes: 1, ...metrics } });
    const html = renderToStaticMarkup(React.createElement(Report, {
      topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period: { from: '2026-11-01', to: '2026-11-12' },
      data: { posts: [
        post('1', 'x', 'Okezonenews', '10'), post('2', 'x', '@okezonenews', '11'),
        post('3', 'youtube', 'Kanal Lama', '09', { author_id: 'UC1' }), post('4', 'youtube', 'Kanal Baru', '12', { author_id: 'UC1' }),
        post('5', 'youtube', 'Kanal Baru', '08', { author_id: 'UC2' }),   // another channel with the same title
        post('6', 'threads', '@Warga.Solo', '12', { author_id: '1789' }), post('7', 'threads', 'warga.solo', '08'),
      ] },
    }));
    const page = sheet(html, 'sources');
    const rows = [...page.matchAll(/<th scope="row"><span class="rp-account">[\s\S]*?<span>([^<]*)<\/span><\/span><\/th><td>([^<]*)<\/td><td class="rp-num">(\d+)<\/td>/g)].map(found => [found[1], found[2], found[3]]);
    assert.deepEqual(rows.sort(), [['@Warga.Solo', 'Threads', '2'], ['@okezonenews', 'X', '2'], ['Kanal Baru', 'YouTube', '1'], ['Kanal Baru', 'YouTube', '2']]);
  } finally { await server.close(); }
});

test('an account row\'s link opens every post of that account on the Posting page, whatever name each carries', async () => {
  const server = await vite();
  try {
    const { default: Row } = await server.ssrLoadModule('/src/components/admin/pulse/AccountRankingRow.jsx');
    const { default: PostFeed } = await server.ssrLoadModule('/src/components/admin/pulse/PostFeed.jsx');
    const { MemoryRouter } = await import('react-router-dom');
    const row = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement('table', null, React.createElement('tbody', null, React.createElement(Row, { row: { key: 'x:okezonenews', author: '@okezonenews', platform: 'x', mentions: 2, engagement: 3, interaction_posts: 2, followers: null, rank: 1 }, sort: 'engagement', search: 'topic=p1' })))));
    assert.match(row, /aria-label="Lihat 2 posting dari @okezonenews" href="\/pulse\/posts\?topic=p1&amp;platform=x&amp;account=x%3Aokezonenews"/);
    const posts = [
      { id: '1', platform: 'x', author: 'Okezonenews', text: 'teks pertama akun', published_at: '2026-11-10T03:00:00Z', metrics: { likes: 1 } },
      { id: '2', platform: 'x', author: '@okezonenews', text: 'teks kedua akun', published_at: '2026-11-11T03:00:00Z', metrics: { likes: 2 } },
      { id: '3', platform: 'x', author: 'Lain', text: 'teks akun lain', published_at: '2026-11-11T04:00:00Z', metrics: { likes: 3 } },
    ];
    const feed = renderToStaticMarkup(React.createElement(PostFeed, { posts, initialAccount: 'x:okezonenews', initialPlatform: 'x' }));
    assert.ok(feed.includes('teks pertama akun') && feed.includes('teks kedua akun'), 'both names of the account');
    assert.ok(!feed.includes('teks akun lain'));
    assert.match(feed, /Akun terpilih: @okezonenews/, 'the filter is named by the account\'s latest name, not its key');
  } finally { await server.close(); }
});

test('an account no post names is printed as "Nama tidak tersedia" in the report and in the ranking', async () => {
  const server = await vite();
  try {
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const html = renderToStaticMarkup(React.createElement(Report, {
      topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period: { from: '2026-11-01', to: '2026-11-12' },
      data: { posts: [{ id: 'n1', platform: 'youtube', author: '', url: 'https://example.com/n1', text: 'video', published_at: '2026-11-10T03:00:00Z', metrics: { author_id: 'UC9', likes: 3 } }] },
    }));
    assert.match(sheet(html, 'sources'), /<span class="rp-account">[\s\S]*?<span>Nama tidak tersedia<\/span><\/span><\/th><td>YouTube<\/td><td class="rp-num">1<\/td>/);
    const { default: Row } = await server.ssrLoadModule('/src/components/admin/pulse/AccountRankingRow.jsx');
    const { MemoryRouter } = await import('react-router-dom');
    const row = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement('table', null, React.createElement('tbody', null, React.createElement(Row, { row: { key: 'youtube:UC9', author: null, platform: 'youtube', mentions: 1, engagement: 3, interaction_posts: 1, followers: null, rank: 1 }, sort: 'engagement', search: '' })))));
    assert.match(row, /<strong>Penulis tidak diketahui<\/strong>/);
    assert.match(row, /<a class="pm-account-drilldown" aria-label="Lihat 1 posting dari Penulis tidak diketahui" href="\/pulse\/posts\?platform=youtube&amp;account=youtube%3AUC9"/, 'a nameless account still opens its posts, by its key');
  } finally { await server.close(); }
});

test('the accounts ranking prints each interaction total with its post count', async () => {
  const server = await vite();
  try {
    const { default: Row } = await server.ssrLoadModule('/src/components/admin/pulse/AccountRankingRow.jsx');
    const { MemoryRouter } = await import('react-router-dom');
    const row = values => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement('table', null, React.createElement('tbody', null, React.createElement(Row, { row: { author: 'A', platform: 'x', mentions: 3, followers: null, rank: 1, ...values }, sort: 'engagement', search: '' })))));
    assert.match(row({ engagement: 12, interaction_posts: 2 }), /<td class="pa-sorted">12<small class="pa-count">dari 2 posting<\/small><\/td>/);
    assert.match(row({ engagement: null, interaction_posts: 0 }), /<td class="pa-sorted"><span aria-label="Tidak tersedia">—<\/span><\/td>/);
  } finally { await server.close(); }
});

test('the account table keeps inside the A4 sheet: a long account name is cut, the number columns keep their width', async () => {
  const css = await readFile(new URL('./ds/report-pages.css', import.meta.url), 'utf8');
  const server = await vite();
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const posts = name => [1, 2, 3].map(index => ({ id: name + index, author: name, platform: 'x', url: `https://x.com/i/status/${index}`, text: 'isi', metrics: { likes: 1234567 + index }, published_at: '2026-11-03T01:00:00Z' }));
    const render = name => printed(renderToStaticMarkup(React.createElement(Report, {
      topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period: { from: '2026-11-01', to: '2026-11-12' },
      data: { posts: [...posts(name), { id: 'u', author: 'Akun tanpa angka', platform: 'x', url: 'https://x.com/i/status/9', text: 'isi', metrics: { likes: true }, published_at: '2026-11-03T02:00:00Z' }] },
    })));
    const page = await browser.newPage();
    const measure = async name => {
      await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${render(name)}</body></html>`);
      return page.evaluate(() => {
        const sheet = document.querySelector('.rp-page[data-section=sources]'), body = sheet.querySelector('.rp-body') || sheet;
        const table = sheet.querySelector('.rp-table-tight'), row = table.querySelector('tbody tr'), last = row.lastElementChild;
        return { tableRight: table.getBoundingClientRect().right, bodyRight: body.getBoundingClientRect().right,
          lastRight: last.getBoundingClientRect().right, rowHeight: row.getBoundingClientRect().height, lastWidth: last.getBoundingClientRect().width };
      });
    };
    const short = await measure('Akun pendek');
    const long = await measure('Akun dengan nama yang sangat panjang sekali untuk diuji di A4');
    assert.ok(long.tableRight <= long.bodyRight + 0.5, `table ends inside the sheet (${long.tableRight} > ${long.bodyRight})`);
    assert.ok(long.lastRight <= long.bodyRight + 0.5, 'the Interaksi column is not cut off');
    assert.equal(long.rowHeight, short.rowHeight, 'the row keeps its height');
    assert.ok(Math.abs(long.lastWidth - short.lastWidth) < 1, 'the number column keeps its width');
    assert.match(css, /\.rp-page\[data-section=sources\] \.rp-table-tight th\[scope=row\] \{[^}]*max-width: 0;[^}]*overflow: hidden;/,
      'the name cell takes the room left by the numbers (the places table does the same)');
  } finally { await browser.close(); await server.close(); }
});

test('report pages print tone shares as tone_share_v1 writes them: of the analysed posts, one post of 300 is <1%, never 0%', async () => {
  const server = await vite();
  try {
    const { default: ReportPages } = await server.ssrLoadModule('/src/pulse/ReportPages.jsx');
    const { buildReport } = await server.ssrLoadModule('/src/lib/pulseReport.js');
    const lib = await server.ssrLoadModule('/src/lib/pulseReportPages.js');
    const post = (id, sentiment) => ({ id, author: 'akun ' + id, platform: 'x', text: 'Teks ' + id, published_at: '2026-11-03T02:00:00Z', metrics: sentiment ? { sentiment } : {} });
    const posts = [post('p', { label: 'positive' }), ...Array.from({ length: 299 }, (_, index) => post('n' + index, 'neutral')), post('u')];
    const report = buildReport({ posts }, { id: 't', label: 'Isu Uji' }, {}, '2026-11-14T03:00:00Z', null, { loaded: true, error: false, response: null });
    const pages = lib.reportPages(lib.resolveSections([]), { topPosts: report.topPosts });
    const html = renderToStaticMarkup(React.createElement(ReportPages, { report, pages, data: lib.reportData(report), brand: {} }));
    const trend = sheet(html, 'trend'), voices = sheet(html, 'voices');
    assert.match(trend, /<span>Positif<\/span><b>1<\/b><em>&lt;1%<\/em>/, 'the legend of the trend');
    assert.match(voices, /aria-label="Posting warganet: Positif &lt;1%, Netral 100%, Negatif 0%, 1 belum dianalisis"/);
    assert.match(voices, /<span>Positif<\/span><b>1<\/b><em>&lt;1%<\/em>/, 'the legend of the voice');
    assert.match(voices, /<td class="rp-num">&lt;1%<\/td><td class="rp-num">100%<\/td><td class="rp-num">0%<\/td>/, 'the platform row');
    assert.doesNotMatch(trend + voices, /Positif<\/span><b>1<\/b><em>0%|Positif 0%/, 'a tone with a post never prints 0%');
  } finally { await server.close(); }
});

test('an opened archive says its figures were recounted only when it was filed under older rules, and nothing else changes', async () => {
  const server = await vite();
  try {
    const { ArchivedContext } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const { RULES } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
    const line = '<span class="pr-archived-rules">Angka laporan ini dihitung ulang dengan aturan perhitungan terbaru.</span>';
    const draw = snapshot => renderToStaticMarkup(React.createElement(ArchivedContext, { archive: { title: 'Laporan November', created_at: '2026-11-13T02:00:00Z', snapshot }, onBack: () => {} }));
    const filedBefore = draw({ posts: [] }), current = draw({ posts: [], rules: { ...RULES } }), older = draw({ posts: [], rules: { ...RULES, interactions: 'interactions_v0' } });
    assert.ok(filedBefore.includes(line), 'a report filed before rule versions were recorded has none');
    assert.ok(older.includes(line), 'one rule is older than today');
    assert.ok(!current.includes(line), 'filed under the rules in force today');
    assert.match(current, /Menampilkan arsip <strong>Laporan November<\/strong>/);
    assert.equal(filedBefore.replace(line, ''), current, 'the line is the only difference');
    assert.equal(older.replace(line, ''), current);
  } finally { await server.close(); }
});

test('the report names the installation zone in its date labels (day_v1), never WIB written by hand', async () => {
  const server = await vite();
  try {
    const { setZone, zone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
    const { default: Report } = await server.ssrLoadModule('/src/pulse/ProjectReport.jsx');
    const before = zone();
    setZone({ offset_minutes: 540, name: 'WIT' });
    try {
      const html = printed(renderToStaticMarkup(React.createElement(Report, {
        topic: { id: 'p1', label: 'Project Uji', query: 'kata kunci' }, period: { from: '2026-11-01', to: '2026-11-12' },
        data: { posts: [{ id: 'one', author: 'Source', platform: 'x', url: 'https://x.com/i/status/1', text: 'Isi posting', metrics: { engagement: 8 }, published_at: '2026-11-03T00:00:00Z' }] },
      })));
      assert.match(html, /menurut tanggal terbit \(WIT\)/, 'the trend page');
      assert.match(html, /tanggal terbit dalam WIT/, 'the data page');
      assert.doesNotMatch(html, /\bWIB\b/);
    } finally { setZone(before); }
  } finally { await server.close(); }
});
