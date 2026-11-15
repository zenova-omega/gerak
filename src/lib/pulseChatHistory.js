/** Tanya AI history: what the panel lists, what the conversation column shows, and what a question carries.
 * Pure: no React, no requests. A conversation row is `{ id, title, updated_at, questions, full }` as the server lists it;
 * a history is `{ state: 'loading' | 'ready' | 'error', rows, total }`, where `total` can be larger than the rows that were sent. */
import { formatCount, pulseDate } from './pulseData.js';

export const historyLoading = { state: 'loading', rows: [], total: 0 };
export const historyFailed = { state: 'error', rows: [], total: 0 };

const newestFirst = rows => [...rows].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || String(a.id).localeCompare(String(b.id)));

/** The server's list as the panel keeps it. */
export function historyLoaded(data) {
  const rows = newestFirst(Array.isArray(data?.conversations) ? data.conversations : []);
  return { state: 'ready', rows, total: Math.max(Number(data?.total) || 0, rows.length) };
}

export function conversationName(row) {
  return (row?.title || '').trim() || 'Percakapan tanpa judul';
}

/** The accessible name of a row's delete control. */
export function deleteName(row) {
  return `Hapus percakapan: ${conversationName(row)}`;
}

/** Second line of a row: when it was last used (WIB) and how many questions it holds. */
export function rowMeta(row) {
  return `${pulseDate(row?.updated_at)} · ${formatCount(Number(row?.questions) || 0)} pertanyaan`;
}

/** After an answer was kept: its conversation leads the list, new or continued. `conversation` is null when it was not kept. */
export function withAnswered(history, conversation) {
  if (!conversation?.id) return history;
  const known = history.rows.some(row => row.id === conversation.id);
  return { ...history, rows: newestFirst([conversation, ...history.rows.filter(row => row.id !== conversation.id)]), total: history.total + (known ? 0 : 1) };
}

export function withoutConversation(history, id) {
  if (!history.rows.some(row => row.id === id)) return history;
  return { ...history, rows: history.rows.filter(row => row.id !== id), total: Math.max(0, history.total - 1) };
}

/** Said under a list the server cut, so no conversation is hidden without a word. */
export function historyNote(history) {
  if (history.state !== 'ready' || history.total <= history.rows.length) return '';
  return `Menampilkan ${formatCount(history.rows.length)} percakapan terbaru dari ${formatCount(history.total)}. Hapus yang tidak diperlukan untuk melihat yang lebih lama.`;
}

/** What the conversation column shows for the conversation the address names (`open`, '' for a new one).
 * `thread` is the conversation held in memory; `failure` the last one that could not be opened.
 * Turns are shown only under their own address: while another conversation is on its way the column waits. */
export function threadView({ open, thread, failure }) {
  if (open === thread.id) return { state: 'ready', turns: thread.turns, full: Boolean(thread.full) };
  if (!open) return { state: 'ready', turns: [], full: false };
  return { state: failure?.id === open ? failure.kind : 'opening', turns: [], full: false };
}

/** One answered question as the page keeps it. `unsaved` when the server could not keep it (or does not keep conversations). */
export function turnFrom(question, data) {
  return { question, answer: data.answer, sources: data.sources || [], groups: data.groups || [], charts: data.charts || [], scope: data.scope, answered_at: data.answered_at, unsaved: !data.conversation_id };
}

/** The request for one question. Earlier exchanges give the model its thread; `conversation_id` goes along only
 * when the open conversation is stored, so a first question starts a new one. */
export function askBody({ topicId, question, turns, conversationId, period, platforms, postId }) {
  const history = turns.flatMap(turn => [{ role: 'user', content: turn.question }, { role: 'assistant', content: turn.answer }])
    .filter(entry => entry.content).map(entry => ({ ...entry, content: entry.content.slice(0, 4000) })).slice(-12);
  const body = { topic_id: topicId, question: question.trim(), history };
  if (conversationId) body.conversation_id = conversationId;
  if (period?.from) body.from = period.from;
  if (period?.to) body.to = period.to;
  if (platforms) body.platforms = platforms;
  if (postId) body.post_id = postId;
  return body;
}
