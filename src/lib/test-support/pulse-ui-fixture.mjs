import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const origin = 'http://127.0.0.1:5173';
const identity = { id: 'fixture-user', name: 'Fixture analyst', email: 'analyst@example.test', role: 'owner', csrf_token: 'fixture-csrf' };
const topic = { id: 'topic-a', label: 'GERAK', query: 'GERAK', sources: ['rss'], is_active: true, last_crawled_at: null, seed_post: null };
const post = {
  id: 'post-a', issue_id: 'issue-a', platform: 'news', url: 'https://example.test/evidence',
  title: 'Stored GERAK evidence', text: 'Public evidence from the stored project sample.', author: 'Test account',
  published_at: '2026-11-11T09:00:00Z', crawled_at: '2026-11-11T10:00:00Z', first_observed_at: '2026-11-11T10:00:00Z',
  metrics: { likes: null, comments: null, shares: null, views: null, engagement: null },
};

function analytics(updated, extra = []) {
  const posts = [...(updated ? [post, { ...post, id: 'post-b', author: 'New stored account', title: 'New stored evidence', url: 'https://example.test/new' }] : [post]), ...extra.map(row => ({ ...post, ...row }))];
  return {
    total_mentions: posts.length, posts,
    metric_totals: Object.fromEntries(['likes', 'comments', 'shares', 'views', 'engagement'].map(key => [key, { value: null, coverage: 0 }])),
    platforms: [{ platform: 'news', count: posts.length }], timeline: [{ date: '2026-11-11', count: posts.length }],
    influencers: posts.map(p => ({ author: p.author, platform: p.platform, mentions: 1, engagement: null, url: p.url })),
    locations: [], unknown_location_count: posts.length,
    network: { nodes: [], edges: [], accounts: [], narratives: [], earliest: posts, total_posts: posts.length, analyzed_posts: 0 },
  };
}

/** Tanya AI as the server answers it, kept in memory: no model is ever asked. Put the result on `state.chat` to switch the chat
 * routes on; without it they stay blocked like any other unmocked request. `conversations` are whole stored conversations
 * (`{ id, topic_id, title, updated_at, turns }`). The knobs: `listStatus`, `openStatus`, `deleteStatus`, `answerStatus` force a
 * failure, `keep = false` answers without storing, `total` overrides the count of the list, and `holdList` / `holdAnswer`
 * are promises the matching answer waits for. */
export function chatStore(conversations = []) {
  return { conversations, asked: [], deleted: [], listStatus: 200, openStatus: 200, deleteStatus: 200, answerStatus: 200, keep: true, total: null, holdList: null, holdAnswer: null, made: 0, configured: true };
}
export const chatTurn = (question, answer, minute = 0) => ({
  question, answer,
  sources: [{ code: 'P1', id: 'post-a', author: 'Test account', platform: 'news', url: 'https://example.test/evidence', published_at: '2026-11-11T09:00:00', interactions: 665, text: 'Stored GERAK evidence' }],
  scope: { posts: 12, from: null, to: null, platforms: null, truncated: false },
  answered_at: `2026-11-14T05:${String(minute).padStart(2, '0')}:00Z`,
});
const chatRow = conversation => ({ id: conversation.id, title: conversation.title, updated_at: conversation.updated_at, questions: conversation.turns.length, full: conversation.turns.length >= 40 });
const chatMissing = { status: 404, body: { detail: 'Percakapan ini tidak ditemukan atau sudah dihapus. Mulai percakapan baru untuk bertanya lagi.' } };

async function chatApi(chat, method, path, url, request) {
  const base = '/api/admin/pulse/chat';
  if (method === 'GET' && path === base + '/status') return { status: 200, body: { configured: chat.configured } };
  if (method === 'POST' && path === base + '/prepare') return { status: 202, body: { preparing: false } };
  if (method === 'GET' && path === base + '/conversations') {
    await chat.holdList;
    if (chat.listStatus !== 200) return { status: chat.listStatus, body: { detail: 'Riwayat tidak tersedia.' } };
    const mine = chat.conversations.filter(row => row.topic_id === url.searchParams.get('topic_id')).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { status: 200, body: { conversations: mine.slice(0, 50).map(chatRow), total: chat.total ?? mine.length } };
  }
  const id = path.startsWith(base + '/conversations/') ? decodeURIComponent(path.slice((base + '/conversations/').length)) : null;
  if (id && method === 'GET') {
    if (chat.openStatus !== 200) return { status: chat.openStatus, body: { detail: 'Percakapan tidak tersedia.' } };
    const found = chat.conversations.find(row => row.id === id && (!url.searchParams.get('topic_id') || row.topic_id === url.searchParams.get('topic_id')));
    return found ? { status: 200, body: { ...found, created_at: found.turns[0]?.answered_at || found.updated_at, full: found.turns.length >= 40 } } : chatMissing;
  }
  if (id && method === 'DELETE') {
    if (chat.deleteStatus !== 200) return { status: chat.deleteStatus, body: { detail: 'Tidak berhasil.' } };
    if (!chat.conversations.some(row => row.id === id)) return chatMissing;
    chat.conversations = chat.conversations.filter(row => row.id !== id);
    chat.deleted.push({ id, csrf: request.headers()['x-pulse-csrf'] });
    return { status: 200, body: { deleted: id } };
  }
  if (method === 'POST' && path === base) {
    const asked = request.postDataJSON();
    chat.asked.push(asked);
    await chat.holdAnswer;
    if (chat.answerStatus !== 200) return { status: chat.answerStatus, body: { detail: 'Model AI tidak menjawab. Coba lagi; tidak ada data yang berubah.' } };
    let conversation = asked.conversation_id ? chat.conversations.find(row => row.id === asked.conversation_id && row.topic_id === asked.topic_id) : null;
    if (asked.conversation_id && !conversation) return chatMissing;
    if (conversation && conversation.turns.length >= 40) return { status: 409, body: { detail: 'Percakapan ini sudah berisi 40 pertanyaan. Mulai percakapan baru untuk bertanya lagi.' } };
    chat.made += 1;
    const turn = { ...chatTurn(asked.question, `Jawaban uji ${chat.made} dari data tersimpan [P1].`), answered_at: `2026-11-15T03:${String(chat.made).padStart(2, '0')}:00Z` };
    const { question: _question, ...shown } = turn;
    if (!chat.keep) return { status: 200, body: { ...shown, conversation_id: null, conversation: null } };
    if (!conversation) {
      conversation = { id: 'made-' + chat.made, topic_id: asked.topic_id, title: asked.question.slice(0, 80), updated_at: turn.answered_at, turns: [] };
      chat.conversations.push(conversation);
    }
    conversation.turns = [...conversation.turns, turn];
    conversation.updated_at = turn.answered_at;
    return { status: 200, body: { ...shown, conversation_id: conversation.id, conversation: chatRow(conversation) } };
  }
  return null;
}

const SPIKES = '/api/admin/pulse/spikes';
/** The requests of a page that are not reads. The trend chart's question about its spikes is left out: it is a POST
 * only because it carries the chart's numbers, and it is answered from those numbers alone. */
export const nonReads = state => state.requests.filter(request => request.method !== 'GET' && request.path !== SPIKES);

export async function pulseUI(t, { authenticated = true } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const state = { authenticated, loginAllowed: false, analyticsStatus: 200, updated: false, requests: [], unexpected: [], errors: [], spikes: {}, spikesStatus: 200, spikeQuestions: [], balance: { state: 'ok', credits_remaining: 5832, checked_at: '2026-11-14T09:00:00', until: null }, monitor: { unread: 0 }, chat: null };
  t.after(async () => {
    await browser.close();
    assert.deepEqual(state.unexpected, [], 'Unmocked API or non-local request was blocked');
    assert.deepEqual(state.errors, [], 'React must not crash on fixture responses');
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => state.errors.push(error.message));
  // Fail closed: no API calls, including unexpected writes, reach a live backend.
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      if (url.origin === origin) return route.continue();
      state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    const path = url.pathname;
    const method = request.method();
    state.requests.push({ path, method, topic: url.searchParams.get('topic_id'), csrf: request.headers()['x-pulse-csrf'], authorization: request.headers().authorization });
    let body;
    let status = 200;
    if (method === 'GET' && path === '/api/pulse/auth/me') {
      status = state.authenticated ? 200 : 401;
      body = state.authenticated ? identity : { detail: 'Not authenticated' };
    } else if (method === 'GET' && path === '/api/pulse/auth/status') body = { configured: true };
    else if (method === 'POST' && path === '/api/pulse/auth/login') {
      assert.deepEqual(request.postDataJSON(), { email: 'analyst@example.test', password: 'fixture-only-password' });
      state.authenticated = state.loginAllowed;
      status = state.authenticated ? 200 : 401;
      body = state.authenticated ? identity : { detail: 'Invalid credentials' };
    } else if (method === 'POST' && path === '/api/pulse/auth/logout') {
      assert.equal(request.headers()['x-pulse-csrf'], 'fixture-csrf');
      state.authenticated = false;
      body = { ok: true };
    } else if (method === 'GET' && path === '/api/admin/pulse/topics') body = [topic];
    else if (method === 'GET' && path === '/api/admin/pulse/analytics') {
      status = state.analyticsStatus;
      body = status === 200 ? analytics(state.updated, state.extraPosts) : { detail: status === 401 ? 'Session expired' : 'Analytics offline' };
    } else if (method === 'GET' && path === '/api/admin/pulse/sentiment/progress') {
      body = { total: state.updated ? 2 : 1, analyzed: 0, pending: state.updated ? 2 : 1, failed: 0, last_finished_at: null, scope: 'project_all_dates' };
    } else if (method === 'GET' && path === '/api/admin/pulse/reviews') body = { reviews: [] };
    else if (method === 'GET' && path === '/api/admin/pulse/growth') body = { posts: [], availability: { source: 'stored_metric_snapshots', total_posts: 0 } };   // Akun & sumber shows growth
    else if (method === 'GET' && path === '/api/admin/pulse/issues') body = [];
    else if (method === 'GET' && path === '/api/admin/pulse/sources/balance') body = state.balance;
    else if (method === 'GET' && path === '/api/admin/pulse/monitor') body = state.monitor;   // the unread-alert badge on the Monitor nav item
    else if (method === 'POST' && path === SPIKES) {
      // The trend chart asks which of its buckets are spikes. `state.spikes` is what the server answers per line
      // (none unless a test says so) and `state.spikesStatus` makes the call fail; every question is kept.
      const asked = request.postDataJSON();
      state.spikeQuestions.push({ ...asked, csrf: request.headers()['x-pulse-csrf'] });
      status = state.spikesStatus;
      body = status === 200 ? { rule: { id: 'spike_v1' }, spikes: Object.fromEntries(Object.keys(asked.series).map(name => [name, state.spikes[name] || []])) } : { detail: 'Tidak berhasil.' };
    }
    else if (state.chat && path.startsWith('/api/admin/pulse/chat')) {
      const answer = await chatApi(state.chat, method, path, url, request);
      if (!answer) { state.unexpected.push(`${method} ${path}`); return route.abort(); }
      ({ status, body } = answer);
    }
    else {
      state.unexpected.push(`${method} ${path}`);
      return route.abort();
    }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { page, state, open: path => page.goto(origin + path) };
}
