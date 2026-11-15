import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const turn = {
  question: 'Apa isu utama?',
  answer: 'Isu utamanya **pengunduran diri** Gibran.\n\n- Kelompok terbesar [I1] berisi **39 posting**.\n- Bukti tertinggi [P1] terbit 12 Nov.\n- Dukungan: 6.811 posting.',
  sources: [{ code: 'P1', id: 'p1', author: 'gibran_rakabuming', platform: 'instagram', url: 'https://www.instagram.com/p/abc', text: 'Saya menyampaikan keputusan', published_at: '2026-11-12T00:00:00', interactions: 8140573 }],
  groups: [{ code: 'I1', title: 'Dokumen dan pencalonan', posts: 39, accounts: 12, interactions: 157814, first_published_at: '2026-11-10 12:13' }],
  charts: [
    { key: 'sentimen7', kind: 'bars', title: 'Sentimen posting, 7 hari terakhir', unit: 'posting', note: null, rows: [{ tone: 'positive', value: 171 }, { tone: 'neutral', value: 2360 }, { tone: 'negative', value: 385 }] },
    { key: 'harian', kind: 'days', title: 'Posting per hari (WIB)', unit: 'posting', note: null, rows: [{ date: '2026-11-09', value: 300 }, { date: '2026-11-10', value: 1714 }, { date: '2026-11-11', value: 0 }] },
  ],
};

async function render(props) {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { default: ChatAnswer } = await server.ssrLoadModule('/src/pulse/ChatAnswer.jsx');
    return renderToStaticMarkup(React.createElement(ChatAnswer, props));
  } finally { await server.close(); }
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('the answer opens with its lead, sets key words in bold and lists the supporting facts', async () => {
  const html = await render({ turn, index: 0 });
  assert.match(html, /<p class="pca-lead">Isu utamanya <strong>pengunduran diri<\/strong> Gibran\.<\/p>/);
  const list = html.match(/<ul class="pca-list">[\s\S]*?<\/ul>/)[0];
  assert.equal((list.match(/<li/g) || []).length, 3);
  assert.match(list, /berisi <strong>39 posting<\/strong>\./);
  assert.match(list, /<strong>Dukungan:<\/strong> 6\.811 posting\./, 'a label is bold without the model asking for it');
  assert.doesNotMatch(html, /\*\*|\[I1\]|\[P1\]/, 'no raw marks reach the reader');
});

test('a cited post or group is a round numbered mark in the text and the same mark on its row below', async () => {
  const html = await render({ turn, index: 2 });
  assert.match(html, /Kelompok terbesar <a class="pca-mark" href="#pc-2-1" aria-label="Bukti 1: kelompok percakapan Dokumen dan pencalonan"[^>]*>1<\/a> berisi/);
  assert.match(html, /Bukti tertinggi <a class="pca-mark" href="#pc-2-2" aria-label="Bukti 2: posting gibran_rakabuming"[^>]*>2<\/a> terbit 12 Nov\./);
  const rows = [...html.match(/<ol class="pc-sources"[\s\S]*?<\/ol>/)[0].matchAll(/<li id="(pc-2-\d)"[^>]*>([\s\S]*?)<\/li>/g)];
  assert.deepEqual(rows.map(row => row[1]), ['pc-2-1', 'pc-2-2']);
  assert.match(rows[0][2], /<span class="pca-mark pca-mark-row"[^>]*>1<\/span>/);
  assert.match(text(rows[0][2]), /Kelompok percakapan Dokumen dan pencalonan 39 posting · 12 akun · 157\.814 interaksi · mulai 10 Nov, 12\.13 WIB/);
  assert.match(rows[1][2], /<span class="pca-mark pca-mark-row"[^>]*>2<\/span>/);
  assert.match(text(rows[1][2]), /gibran_rakabuming Saya menyampaikan keputusan .*8\.140\.573 interaksi/);
  assert.match(rows[1][2], /<a class="pc-source-link" href="https:\/\/www\.instagram\.com\/p\/abc"/);
});

test('a chart shows the numbers the server sent, with words for every bar', async () => {
  const html = await render({ turn, index: 0 });
  const charts = html.match(/<figure class="pcc[\s\S]*?<\/figure>/g);
  assert.equal(charts.length, 2);
  assert.match(charts[0], /<figcaption><strong>Sentimen posting, 7 hari terakhir<\/strong>/);
  assert.deepEqual([...charts[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(row => text(row[1])), ['Positif 171 6%', 'Netral 2.360 81%', 'Negatif 385 13%']);
  assert.match(charts[0], /style="width:100%;background:var\(--ps-sent-neutral\)"/);
  assert.match(charts[1], /role="img" aria-label="Posting per hari \(WIB\), 9 Nov sampai 11 Nov\. Tertinggi 1\.714 posting pada 10 Nov\."/);
  assert.match(text(charts[1]), /9 Nov .*tertinggi 1\.714 pada 10 Nov .*11 Nov/);
});

test('an answer without lists, charts or evidence is still a calm paragraph', async () => {
  const html = await render({ turn: { answer: 'Data belum cukup untuk menjawab.', sources: [] }, index: 0 });
  assert.match(html, /<p class="pca-lead">Data belum cukup untuk menjawab\.<\/p>/);
  assert.doesNotMatch(html, /pc-sources|pcc|pca-list/);
});

test('a cited group says over how many posts its interactions are counted, and an unknown total reads as a dash', async () => {
  const counted = await render({ turn: { ...turn, groups: [{ ...turn.groups[0], interaction_posts: 30 }] }, index: 2 });
  assert.match(text(counted), /39 posting · 12 akun · 157\.814 interaksi dari 30 posting · mulai/);
  const unknown = await render({ turn: { ...turn, groups: [{ ...turn.groups[0], interactions: null, interaction_posts: 0 }] }, index: 2 });
  assert.match(text(unknown), /12 akun · — interaksi · mulai/);
  assert.doesNotMatch(text(unknown), /dari 0 posting/);
});

test('a group\'s first time names the installation zone (day_v1), never WIB written by hand', async () => {
  const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  try {
    const { setZone, zone } = await server.ssrLoadModule('/src/lib/pulseMeasures.js');
    const { default: ChatAnswer } = await server.ssrLoadModule('/src/pulse/ChatAnswer.jsx');
    const before = zone();
    setZone({ offset_minutes: 540, name: 'WIT' });
    try {
      const html = renderToStaticMarkup(React.createElement(ChatAnswer, { turn: { ...turn, charts: [] }, index: 2 }));
      assert.match(text(html), /mulai 10 Nov, 12\.13 WIT/);
      assert.doesNotMatch(html, /\bWIB\b/);
    } finally { setZone(before); }
  } finally { await server.close(); }
});
