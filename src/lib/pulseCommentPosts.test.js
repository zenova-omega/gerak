import test from 'node:test';
import assert from 'node:assert/strict';
import { commentPostPlatforms, commentPostRows, matchParts, postCaption, searchCommentPosts, searchTerms, storedComments } from './pulseCommentPosts.js';

const comments = count => ({ comment_snapshot: { status: 'success', items: Array.from({ length: count }, (_, i) => ({ id: 'c' + i })) } });
const posts = [
  { id: 'quiet', platform: 'instagram', author: 'Warga Kota', text: 'Jalan  rusak\n di depan pasar', published_at: '2026-11-01T02:00:00Z', metrics: comments(2) },
  { id: 'none', platform: 'x', author: 'tanpa_komentar', text: 'Tidak ada komentar tersimpan', published_at: '2026-11-02T02:00:00Z', metrics: {} },
  { id: 'busy', platform: 'tiktok', author: '@Berita.Jakarta', title: 'Banjir di Kémang', text: 'teks yang tidak dipakai', published_at: '2026-11-03T02:00:00Z', metrics: comments(40) },
  { id: 'tie-old', platform: 'instagram', author: 'akun_lama', text: 'Banjir surut', published_at: '2026-11-04T02:00:00Z', metrics: comments(7) },
  { id: 'tie-new', platform: 'youtube', author: 'Kanal Kota', title: 'Liputan banjir', published_at: '2026-11-05T02:00:00Z', metrics: comments(7) },
  { id: 'failed', platform: 'x', author: 'gagal', text: 'Pengambilan gagal', metrics: { comment_snapshot: { status: 'error' } } },
];
const rows = commentPostRows(posts);
const ids = list => list.map(row => row.id);

test('only posts with stored comments become rows, busiest first with a stable tie order', () => {
  assert.deepEqual(ids(rows), ['busy', 'tie-new', 'tie-old', 'quiet']);
  assert.deepEqual(rows.map(row => row.comments), [40, 7, 7, 2]);
  assert.deepEqual(ids(commentPostRows([...posts].reverse())), ['busy', 'tie-new', 'tie-old', 'quiet']);
  assert.deepEqual(ids(commentPostRows([{ id: 'b', metrics: comments(1) }, { id: 'a', metrics: comments(1) }])), ['a', 'b']);
  assert.deepEqual(commentPostRows(), []);
});

test('a row carries the post, a one-line caption and the title before the text', () => {
  const [busy, , , quiet] = rows;
  assert.equal(busy.post, posts[2]);
  assert.equal(busy.caption, 'Banjir di Kémang');
  assert.equal(quiet.caption, 'Jalan rusak di depan pasar');
  assert.equal(postCaption({}), '');
  assert.equal(postCaption(null), '');
  assert.equal(storedComments({ metrics: { comment_snapshot: { items: 'bukan daftar' } } }), 0);
  assert.equal(commentPostRows([{ id: 'n', metrics: comments(1) }])[0].author, '');
});

test('search matches caption and account name, ignoring case, accents and a leading @', () => {
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'BANJIR' })), ['busy', 'tie-new', 'tie-old']);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'kemang' })), ['busy']);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: '@berita.jakarta' })), ['busy']);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'kota' })), ['tie-new', 'quiet']);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'tidak dipakai' })), [], 'text hidden behind a title is not searched');
});

test('every word must match, in any order, across account and caption', () => {
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'pasar  warga' })), ['quiet']);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'banjir pasar' })), []);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: '   ' })), ids(rows));
  assert.deepEqual(ids(searchCommentPosts(rows)), ids(rows));
  assert.deepEqual(searchTerms('  @Akun   Béta '), ['akun', 'beta']);
  assert.deepEqual(searchTerms('@'), []);
});

test('platform choice narrows the results and keeps the busiest-first order', () => {
  assert.deepEqual(ids(searchCommentPosts(rows, { platforms: ['instagram'] })), ['tie-old', 'quiet']);
  assert.deepEqual(ids(searchCommentPosts(rows, { platforms: ['instagram', 'tiktok'] })), ['busy', 'tie-old', 'quiet']);
  assert.deepEqual(ids(searchCommentPosts(rows, { query: 'banjir', platforms: ['instagram'] })), ['tie-old']);
  assert.deepEqual(ids(searchCommentPosts(rows, { platforms: [] })), ids(rows));
  assert.deepEqual(ids(searchCommentPosts(rows, { platforms: ['facebook'] })), []);
});

test('platform chips keep their place and count the posts a query found', () => {
  assert.deepEqual(commentPostPlatforms(rows), [{ platform: 'instagram', posts: 2 }, { platform: 'tiktok', posts: 1 }, { platform: 'youtube', posts: 1 }]);
  assert.deepEqual(commentPostPlatforms(rows, searchCommentPosts(rows, { query: 'banjir' })), [{ platform: 'instagram', posts: 1 }, { platform: 'tiktok', posts: 1 }, { platform: 'youtube', posts: 1 }]);
  assert.deepEqual(commentPostPlatforms(rows, searchCommentPosts(rows, { query: 'pasar' })), [{ platform: 'instagram', posts: 1 }, { platform: 'tiktok', posts: 0 }, { platform: 'youtube', posts: 0 }]);
  assert.deepEqual(commentPostPlatforms(), []);
});

const joined = parts => parts.map(part => part.hit ? `[${part.text}]` : part.text).join('');

test('matched words are marked in the original spelling', () => {
  assert.equal(joined(matchParts('Banjir di Kémang, banjir lagi', 'banjir kemang')), '[Banjir] di [Kémang], [banjir] lagi');
  assert.equal(joined(matchParts('@Berita.Jakarta', '@berita')), '@[Berita].Jakarta');
  assert.equal(joined(matchParts('Tanpa kecocokan', 'banjir')), 'Tanpa kecocokan');
  assert.equal(joined(matchParts('Tanpa kata kunci', '')), 'Tanpa kata kunci');
  assert.equal(joined(matchParts('aaaa', 'aa aaa')), '[aaaa]', 'overlapping matches merge');
  assert.deepEqual(matchParts('', 'banjir'), []);
  assert.deepEqual(matchParts(null, 'banjir'), []);
});

test('a long caption is cut around the first match so the reason for the result stays visible', () => {
  const long = 'Pembukaan yang panjang sekali tentang hal lain sebelum akhirnya menyebut banjir di ujung kalimat dan masih berlanjut lama setelahnya';
  const cut = joined(matchParts(long, 'banjir', { max: 48, lead: 16 }));
  assert.match(cut, /^…/);
  assert.match(cut, /\[banjir\]/);
  assert.match(cut, /…$/);
  assert.ok(cut.replace(/[[\]…]/g, '').length <= 48);
  assert.ok(!/^…\S*\s?$/.test(cut) && long.includes(cut.replace(/[[\]…]/g, '')), 'the cut is a real stretch of the caption');
  assert.equal(joined(matchParts(long, '', { max: 20 })), 'Pembukaan yang panja…', 'without a query the caption starts at the beginning');
  assert.equal(joined(matchParts('Banjir pendek', 'banjir', { max: 48 })), '[Banjir] pendek');
  assert.equal(joined(matchParts('Contoh caption tentang topik yang dipantau', 'dipantau', { max: 140, lead: 16 })), '…topik yang [dipantau]', 'a short caption is cut the same way, so every result leads with its match');
  assert.equal(joined(matchParts('Contoh caption tentang topik yang dipantau', 'dipantau')), 'Contoh caption tentang topik yang [dipantau]', 'no max, no cut');
  assert.equal(joined(matchParts('Contoh caption tentang topik', 'akun', { max: 140 })), 'Contoh caption tentang topik', 'a match in the account name leaves the caption whole');
  assert.equal(joined(matchParts('Kata banjir di awal ' + 'x'.repeat(80), 'banjir', { max: 30 })), 'Kata [banjir] di awal ' + 'x'.repeat(10) + '…', 'a match near the start keeps the start');
});

test('cutting never splits an emoji', () => {
  const text = 'ab😀cd';
  for (let max = 1; max <= text.length; max++) for (const part of matchParts(text, '', { max })) assert.ok(part.text.isWellFormed(), `max ${max}: ${JSON.stringify(part.text)}`);
  assert.equal(joined(matchParts('😀😀😀 banjir besar', 'banjir', { max: 8, lead: 3 })).includes('[banjir]'), true);
});
