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

function analytics(updated) {
  const posts = updated ? [post, { ...post, id: 'post-b', author: 'New stored account', title: 'New stored evidence', url: 'https://example.test/new' }] : [post];
  return {
    total_mentions: posts.length, posts,
    metric_totals: Object.fromEntries(['likes', 'comments', 'shares', 'views', 'engagement'].map(key => [key, { value: null, coverage: 0 }])),
    platforms: [{ platform: 'news', count: posts.length }], timeline: [{ date: '2026-11-11', count: posts.length }],
    influencers: posts.map(p => ({ author: p.author, platform: p.platform, mentions: 1, engagement: null, url: p.url })),
    locations: [], unknown_location_count: posts.length,
    network: { nodes: [], edges: [], accounts: [], narratives: [], earliest: posts, total_posts: posts.length, analyzed_posts: 0 },
  };
}

export async function pulseUI(t, { authenticated = true } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const state = { authenticated, loginAllowed: false, analyticsStatus: 200, updated: false, requests: [], unexpected: [], errors: [] };
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
      body = status === 200 ? analytics(state.updated) : { detail: status === 401 ? 'Session expired' : 'Analytics offline' };
    } else if (method === 'GET' && path === '/api/admin/pulse/sentiment/progress') {
      body = { total: state.updated ? 2 : 1, analyzed: 0, pending: state.updated ? 2 : 1, failed: 0, last_finished_at: null, scope: 'project_all_dates' };
    } else if (method === 'GET' && path === '/api/admin/pulse/reviews') body = { reviews: [] };
    else if (method === 'GET' && path === '/api/admin/pulse/issues') body = [];
    else {
      state.unexpected.push(`${method} ${path}`);
      return route.abort();
    }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { page, state, open: path => page.goto(origin + path) };
}
