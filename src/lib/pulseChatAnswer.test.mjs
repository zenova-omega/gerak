import test from 'node:test';
import assert from 'node:assert/strict';
import { answerView, chartRows } from './pulseChatAnswer.js';

const source = (code, author) => ({ code, id: code.toLowerCase(), author, platform: 'x', url: 'https://x.com/a/status/' + code, text: 'Teks ' + code, published_at: '2026-11-12T00:00:00', interactions: 10 });
const group = (code, title) => ({ code, title, posts: 39, accounts: 12, interactions: 157814, first_published_at: '2026-11-10 12:13' });
const flat = parts => parts.map(part => part.mark ? `(${part.mark})` : part.bold ? `<b>${part.text}</b>` : part.text).join('');

test('an answer is read as a lead sentence, then paragraphs and bullet lists', () => {
  const view = answerView({ answer: 'Isu utamanya **pengunduran diri**.\n\n- Volume tertinggi **1.714 posting** pada 10 Nov.\n- Sentimen didominasi netral.\n\nCatatan penutup.', sources: [] });
  assert.equal(flat(view.lead), 'Isu utamanya <b>pengunduran diri</b>.');
  assert.deepEqual(view.blocks.map(block => block.type), ['list', 'p']);
  assert.deepEqual(view.blocks[0].items.map(flat), ['Volume tertinggi <b>1.714 posting</b> pada 10 Nov.', 'Sentimen didominasi netral.']);
  assert.equal(flat(view.blocks[1].parts), 'Catatan penutup.');
  assert.deepEqual(view.evidence, []);
});

test('every cited post and group gets one number, in the order the answer cites them, and the same number wherever it returns', () => {
  const view = answerView({
    answer: 'Kelompok terbesar [I1] berisi 39 posting.\n\n- Bukti tertinggi [P2] lalu [P1].\n- Kelompok itu lagi [I1] dan kode liar [P9][K3].',
    sources: [source('P1', 'akun_satu'), source('P2', 'akun_dua')], groups: [group('I1', 'Dokumen dan pencalonan')],
  });
  assert.equal(flat(view.lead), 'Kelompok terbesar (1) berisi 39 posting.');
  assert.deepEqual(view.blocks[0].items.map(flat), ['Bukti tertinggi (2) lalu (3).', 'Kelompok itu lagi (1) dan kode liar.'], 'a code the answer has no evidence for is left out, with the space before it');
  assert.deepEqual(view.evidence.map(row => [row.number, row.kind, row.code, row.kind === 'post' ? row.source.author : row.group.title]),
    [[1, 'group', 'I1', 'Dokumen dan pencalonan'], [2, 'post', 'P2', 'akun_dua'], [3, 'post', 'P1', 'akun_satu']]);
});

test('a source the text never cites still stands in the list, after the cited ones', () => {
  const view = answerView({ answer: 'Jawaban [P2].', sources: [source('P1', 'akun_satu'), source('P2', 'akun_dua')] });
  assert.deepEqual(view.evidence.map(row => [row.number, row.code]), [[1, 'P2'], [2, 'P1']]);
});

test('a label at the start of a line is set in bold when the answer set nothing in bold itself', () => {
  const view = answerView({ answer: 'Jawaban singkat.\n\n- Dukungan: 6.811 posting.\n- Terbit 12 Nov pukul 07:00: ramai.\n- **Puncak:** 10 Nov.\n\nSentimen: netral 2.360.', sources: [] });
  assert.deepEqual(view.blocks[0].items.map(flat), ['<b>Dukungan:</b> 6.811 posting.', 'Terbit 12 Nov pukul 07:00: ramai.', '<b>Puncak:</b> 10 Nov.']);
  assert.equal(flat(view.blocks[1].parts), '<b>Sentimen:</b> netral 2.360.');
  assert.equal(flat(answerView({ answer: 'Jawaban: ya.', sources: [] }).lead), 'Jawaban: ya.', 'the lead is already strong as a whole');
});

test('an answer stored before answers had a shape still reads well: plain paragraphs with numbered marks', () => {
  const view = answerView({ answer: 'Isu utama adalah pengunduran diri.\n\nBukti tertinggi [P1] terbit 2026-11-12 07:00, interaksi 8.140.573; [P2] pernyataan resmi.', sources: [source('P1', 'a'), source('P2', 'b')] });
  assert.equal(flat(view.lead), 'Isu utama adalah pengunduran diri.');
  assert.equal(flat(view.blocks[0].parts), 'Bukti tertinggi (1) terbit 2026-11-12 07:00, interaksi 8.140.573; (2) pernyataan resmi.');
  assert.deepEqual(answerView({}).lead, []);
  assert.deepEqual(answerView({ answer: '- hanya butir', sources: [] }).lead, [], 'a list that opens the answer is not a lead');
  assert.equal(flat(answerView({ answer: 'Tanda *bintang* liar ** tidak tampil.', sources: [] }).lead), 'Tanda bintang liar tidak tampil.');
});

test('charts come from the server as rows; the page only names and orders what it draws', () => {
  const tones = chartRows({ key: 'sentimen', kind: 'bars', unit: 'posting', rows: [{ tone: 'positive', value: 10 }, { tone: 'neutral', value: 60 }, { tone: 'negative', value: 30 }, { tone: 'unknown', value: 0 }] });
  assert.deepEqual(tones.map(row => [row.label, row.value, row.share, row.width]), [['Positif', 10, '10%', 17], ['Netral', 60, '60%', 100], ['Negatif', 30, '30%', 50], ['Belum dianalisis', 0, '0%', 0]]);
  assert.ok(tones.every(row => row.color.startsWith('var(--ps-sent-')), 'sentiment keeps its own colours');
  const platforms = chartRows({ key: 'platform', kind: 'bars', rows: [{ platform: 'youtube', value: 3 }, { platform: 'x', value: 1 }] }, name => ({ youtube: 'YouTube', x: 'X' })[name]);
  assert.deepEqual(platforms.map(row => [row.label, row.share]), [['YouTube', '75%'], ['X', '25%']]);
  const places = chartRows({ key: 'tempat', kind: 'bars', rows: [{ label: 'DKI Jakarta', value: 422 }, { label: 'Jawa Tengah', value: 178 }] });
  assert.deepEqual(places.map(row => [row.label, row.share, row.width]), [['DKI Jakarta', null, 100], ['Jawa Tengah', null, 42]], 'provinces overlap and are a top list: no share of a whole');
  const days = chartRows({ key: 'harian', kind: 'days', rows: [{ date: '2026-11-09', value: 5 }, { date: '2026-11-10', value: 20 }, { date: '2026-11-11', value: 0 }] });
  assert.deepEqual(days.map(row => [row.label, row.value, row.width, row.peak]), [['9 Nov', 5, 25, false], ['10 Nov', 20, 100, true], ['11 Nov', 0, 0, false]]);
  assert.deepEqual(chartRows(null), []);
});
