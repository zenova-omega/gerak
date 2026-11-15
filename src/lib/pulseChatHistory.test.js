import test from 'node:test';
import assert from 'node:assert/strict';
import { pulseDate } from './pulseData.js';
import {
  askBody, conversationName, deleteName, historyFailed, historyLoaded, historyLoading, historyNote, rowMeta, threadView, turnFrom,
  withAnswered, withoutConversation,
} from './pulseChatHistory.js';

const row = (id, updated_at, extra = {}) => ({ id, title: 'Judul ' + id, updated_at, questions: 1, full: false, ...extra });

test('the history lists the newest conversation first, whatever order it arrived in', () => {
  const history = historyLoaded({ conversations: [row('a', '2026-11-12T03:00:00Z'), row('c', '2026-11-14T03:00:00Z'), row('b', '2026-11-13T03:00:00Z')], total: 3 });
  assert.equal(history.state, 'ready');
  assert.deepEqual(history.rows.map(item => item.id), ['c', 'b', 'a']);
  assert.equal(history.total, 3);
  // An answer without a list is an empty history, not a crash.
  assert.deepEqual(historyLoaded({}), { state: 'ready', rows: [], total: 0 });
  assert.deepEqual(historyLoaded(null), { state: 'ready', rows: [], total: 0 });
  assert.equal(historyLoading.state, 'loading');
  assert.deepEqual(historyFailed, { state: 'error', rows: [], total: 0 });
});

test('a row says when the conversation was last used, in WIB, and how many questions it holds', () => {
  const meta = rowMeta(row('a', '2026-11-14T05:35:00Z', { questions: 3 }));
  assert.equal(meta, `${pulseDate('2026-11-14T05:35:00Z')} · 3 pertanyaan`);
  assert.match(meta, /14 Nov 2026.*12\.35 WIB/);
  assert.match(rowMeta(row('a', '2026-11-14T05:35:00Z', { questions: 1234 })), /1\.234 pertanyaan$/);
  assert.match(rowMeta({ id: 'x' }), /^Waktu tidak tersedia · 0 pertanyaan$/);
});

test('a conversation always has a name, and its delete control says which one it removes', () => {
  assert.equal(conversationName({ title: '  Apa isu utama minggu ini?  ' }), 'Apa isu utama minggu ini?');
  assert.equal(conversationName({ title: '' }), 'Percakapan tanpa judul');
  assert.equal(conversationName(undefined), 'Percakapan tanpa judul');
  assert.equal(deleteName({ title: 'Apa isu utama minggu ini?' }), 'Hapus percakapan: Apa isu utama minggu ini?');
  assert.equal(deleteName({}), 'Hapus percakapan: Percakapan tanpa judul');
});

test('an answered question moves its conversation to the top, or adds it, and the total follows', () => {
  const history = historyLoaded({ conversations: [row('b', '2026-11-13T03:00:00Z'), row('a', '2026-11-12T03:00:00Z')], total: 2 });
  const continued = withAnswered(history, row('a', '2026-11-14T09:00:00Z', { questions: 2 }));
  assert.deepEqual(continued.rows.map(item => [item.id, item.questions]), [['a', 2], ['b', 1]]);
  assert.equal(continued.total, 2);
  const started = withAnswered(continued, row('n', '2026-11-14T10:00:00Z'));
  assert.deepEqual(started.rows.map(item => item.id), ['n', 'a', 'b']);
  assert.equal(started.total, 3);
  assert.deepEqual(history.rows.map(item => item.id), ['b', 'a'], 'the list that was passed in is left as it was');
  // The answer could not be kept: nothing to add.
  assert.equal(withAnswered(history, null), history);
  // The list never loaded: the answer still shows up there, and the state says the rest is unknown.
  assert.deepEqual(withAnswered(historyFailed, row('n', '2026-11-14T10:00:00Z')).rows.map(item => item.id), ['n']);
  assert.equal(withAnswered(historyFailed, row('n', '2026-11-14T10:00:00Z')).state, 'error');
});

test('a deleted conversation leaves the list and the total', () => {
  const history = historyLoaded({ conversations: [row('b', '2026-11-13T03:00:00Z'), row('a', '2026-11-12T03:00:00Z')], total: 2 });
  const after = withoutConversation(history, 'b');
  assert.deepEqual(after.rows.map(item => item.id), ['a']);
  assert.equal(after.total, 1);
  assert.equal(withoutConversation(history, 'not-there'), history);
  assert.equal(withoutConversation(historyLoaded({ conversations: [row('a', '2026-11-12T03:00:00Z')], total: 0 }), 'a').total, 0);
});

test('a list that was cut says how many there are; a whole list says nothing', () => {
  const fifty = Array.from({ length: 50 }, (_, index) => row('r' + index, `2026-11-01T00:${String(index).padStart(2, '0')}:00Z`));
  assert.equal(historyNote(historyLoaded({ conversations: fifty, total: 73 })), 'Menampilkan 50 percakapan terbaru dari 73. Hapus yang tidak diperlukan untuk melihat yang lebih lama.');
  assert.equal(historyNote(historyLoaded({ conversations: fifty, total: 50 })), '');
  assert.equal(historyNote(historyLoaded({ conversations: [], total: 0 })), '');
  assert.equal(historyNote(historyFailed), '');
});

test('the conversation column shows the open conversation, a wait, or why it cannot be shown', () => {
  const thread = { id: 'a', turns: [{ question: 'q' }], full: false };
  assert.deepEqual(threadView({ open: 'a', thread, failure: null }), { state: 'ready', turns: thread.turns, full: false });
  assert.deepEqual(threadView({ open: 'a', thread: { ...thread, full: true }, failure: null }), { state: 'ready', turns: thread.turns, full: true });
  // Another conversation was asked for and is on its way: the old turns are not shown under the new address.
  assert.deepEqual(threadView({ open: 'b', thread, failure: null }), { state: 'opening', turns: [], full: false });
  assert.deepEqual(threadView({ open: 'b', thread, failure: { id: 'b', kind: 'missing' } }), { state: 'missing', turns: [], full: false });
  assert.deepEqual(threadView({ open: 'b', thread, failure: { id: 'b', kind: 'failed' } }), { state: 'failed', turns: [], full: false });
  // A failure of some other conversation says nothing about this one.
  assert.equal(threadView({ open: 'a', thread, failure: { id: 'b', kind: 'missing' } }).state, 'ready');
  // "Percakapan baru": nothing is open, so the stored conversation still in memory is not shown.
  assert.deepEqual(threadView({ open: '', thread, failure: null }), { state: 'ready', turns: [], full: false });
  // A new conversation whose answers could not be kept stays on screen.
  const unsaved = { id: '', turns: [{ question: 'q', unsaved: true }], full: false };
  assert.deepEqual(threadView({ open: '', thread: unsaved, failure: null }), { state: 'ready', turns: unsaved.turns, full: false });
});

test('a turn is what the server answered plus the question, and remembers when it could not be kept', () => {
  const answer = { answer: 'Jawaban [P1].', sources: [{ code: 'P1' }], scope: { posts: 9 }, answered_at: '2026-11-14T05:00:00Z', conversation_id: 'a', conversation: row('a', '2026-11-14T05:00:00Z') };
  assert.deepEqual(turnFrom('Pertanyaan?', answer), { question: 'Pertanyaan?', answer: 'Jawaban [P1].', sources: [{ code: 'P1' }], groups: [], charts: [], scope: { posts: 9 }, answered_at: '2026-11-14T05:00:00Z', unsaved: false });
  assert.equal(turnFrom('Pertanyaan?', { ...answer, conversation_id: null }).unsaved, true);
  // A server from before conversations were kept sends no id at all.
  assert.equal(turnFrom('Pertanyaan?', { answer: 'x', answered_at: '2026-11-14T05:00:00Z' }).unsaved, true);
  assert.deepEqual(turnFrom('Pertanyaan?', { answer: 'x' }).sources, []);
});

test('a question carries the last six exchanges, the scope, and its conversation only when one is stored', () => {
  const turns = Array.from({ length: 8 }, (_, index) => ({ question: 'T' + index, answer: 'J' + index }));
  const body = askBody({ topicId: 'topic-a', question: '  Lalu bagaimana?  ', turns, conversationId: 'a', period: { from: '2026-11-01', to: '' }, platforms: ['x'], postId: 'post-1' });
  assert.deepEqual(Object.keys(body).sort(), ['conversation_id', 'from', 'history', 'platforms', 'post_id', 'question', 'topic_id']);
  assert.equal(body.question, 'Lalu bagaimana?');
  assert.equal(body.conversation_id, 'a');
  assert.equal(body.history.length, 12);
  assert.deepEqual(body.history.slice(0, 2), [{ role: 'user', content: 'T2' }, { role: 'assistant', content: 'J2' }]);
  assert.deepEqual(body.history.at(-1), { role: 'assistant', content: 'J7' });
  // The server refuses an empty or oversized earlier message, which would block every further question in a stored conversation.
  const odd = askBody({ topicId: 'topic-a', question: 'Lanjut?', turns: [{ question: 'T', answer: '' }, { question: 'U', answer: 'j'.repeat(5000) }], conversationId: '', period: {}, platforms: null, postId: '' });
  assert.deepEqual(odd.history.map(entry => [entry.role, entry.content.length]), [['user', 1], ['user', 1], ['assistant', 4000]]);
  // Nothing open, every platform, whole period: only what the server needs.
  assert.deepEqual(askBody({ topicId: 'topic-a', question: 'Apa isu utama?', turns: [], conversationId: '', period: {}, platforms: null, postId: '' }),
    { topic_id: 'topic-a', question: 'Apa isu utama?', history: [] });
});
