import test from 'node:test';
import assert from 'node:assert/strict';
import { compactCount, highlightWindow, projectHighlight } from './pulseHighlight.js';

const post = (id, day, likes, extra = {}) => ({
  id, platform: 'x', author: 'akun_' + id, text: 'Teks ' + id, url: 'https://x.com/' + id, published_at: `${day}T03:00:00Z`,
  metrics: { sentiment: { label: 'negative' }, ...(likes == null ? {} : { likes }) }, ...extra,
});

test('big figures read short in Indonesian: ribu, juta, miliar, one decimal, a comma', () => {
  assert.equal(compactCount(950), '950');
  assert.equal(compactCount(15800), '15,8 ribu');
  assert.equal(compactCount(33929370), '33,9 juta');
  assert.equal(compactCount(18316600000), '18,3 miliar');
  assert.equal(compactCount(2000000), '2 juta', 'no ",0"');
  assert.equal(compactCount(null), '—');
});

test('without a chosen period the highlight reads the last seven days against the seven before; with one, that period against the one before', () => {
  assert.deepEqual(highlightWindow({}, '2026-11-16'),
    { from: '2026-11-10', to: '2026-11-16', before: { from: '2026-11-03', to: '2026-11-09' }, chosen: false, label: '7 hari terakhir', compare: '7 hari sebelumnya' });
  assert.deepEqual(highlightWindow({ from: '2026-11-01', to: '2026-11-03' }, '2026-11-16'),
    { from: '2026-11-01', to: '2026-11-03', before: { from: '2026-10-29', to: '2026-10-31' }, chosen: true, label: 'periode ini', compare: 'periode sebelumnya' });
});

test('interactions, posts and their change are counted by the dictionary, unknown is never 0, and the lead is said in words', () => {
  const window = highlightWindow({}, '2026-11-16');
  const posts = [post('a', '2026-11-15', 300), post('b', '2026-11-12', 100), post('c', '2026-11-11', null, { platform: 'news', author: 'Kompas' }),
    post('o', '2026-11-05', 200), post('p', '2026-11-04', null)];
  const reading = projectHighlight(posts, posts, window);
  assert.deepEqual([reading.interactions.value, reading.interactions.posts, reading.posts, reading.platforms], [400, 2, 3, 2]);
  assert.equal(reading.interactionChange, 1, 'from 200 to 400 is +100%');
  assert.equal(reading.postChange, 0.5, 'from 2 posts to 3');
  assert.deepEqual(reading.lead, ['Interaksi naik.', 'Lebih banyak percakapan.']);
  assert.equal(reading.measured, 2 / 3);
  const quiet = projectHighlight([post('a', '2026-11-15', 50), post('o', '2026-11-05', 200), post('p', '2026-11-04', 1)], null, window);
  assert.equal(quiet.interactionChange, null, 'no posts of the period before were given: no change is claimed');
  const none = projectHighlight([post('c', '2026-11-11', null)], [], window);
  assert.deepEqual([none.interactions.value, none.interactionChange], [null, null]);
  assert.deepEqual(none.lead, ['Interaksi belum tercatat.']);
});

test('the mentions worth a look are the five with the most interactions, one per story; the sources are the accounts that posted most', () => {
  const window = highlightWindow({}, '2026-11-16');
  const posts = [...['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => post(id, '2026-11-14', (index + 1) * 10)),
    post('g', '2026-11-14', 5, { author: 'akun_f' }), post('h', '2026-11-14', 4, { author: 'akun_f' }),
    post('dup', '2026-11-14', 1, { text: 'Teks f' })];
  const reading = projectHighlight(posts, posts, window);
  assert.deepEqual(reading.mentions.map(row => row.id), ['f', 'e', 'd', 'c', 'b']);
  assert.equal(reading.mentions[0].also, 1, 'the same text posted again is counted on the first');
  assert.deepEqual(reading.sources.map(row => [row.name, row.posts]), [['akun_f', 3], ['akun_a', 1], ['akun_b', 1]]);
});

test('an empty period says so instead of drawing zeros', () => {
  const reading = projectHighlight([post('o', '2026-11-01', 9)], [], highlightWindow({}, '2026-11-16'));
  assert.equal(reading.empty, true);
  assert.deepEqual(reading.mentions, []);
});
