import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../lib/api.js', import.meta.url), 'utf8')).replaceAll('import.meta.env', '({})');
async function client(path = '/pulse', configured, pulseOnly = false, Channel) {
  globalThis.window = Object.assign(new EventTarget(), { location: { pathname: path, hostname: '127.0.0.1', protocol: 'http:', origin: 'http://127.0.0.1:5173' } });
  globalThis.localStorage = { getItem: () => { throw Error('Standalone accessed GERAK storage'); } };
  window.BroadcastChannel = Channel;
  const code = source.replaceAll('({})', `(${JSON.stringify({ VITE_API_URL: configured, VITE_PULSE_ONLY: pulseOnly ? 'true' : undefined })})`);
  return (await import(`data:text/javascript;base64,${Buffer.from(code + '\n//' + Math.random()).toString('base64')}`)).default;
}
test('standalone uses current hostname, cookies and in-memory CSRF without GERAK storage', async () => {
  const api = await client();
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, ...options }); return Response.json({ csrf_token: 'test-csrf' }); };
  await api.get('/pulse/auth/me');
  await api.post('/admin/pulse/topics', { label: 'Test' });
  assert.equal(requests[0].url, 'http://127.0.0.1:8000/api/pulse/auth/me');
  assert.equal(requests[1].credentials, 'include');
  assert.equal(requests[1].headers['X-Pulse-CSRF'], 'test-csrf');
  assert.equal(requests[1].headers.Authorization, undefined);
});
test('delayed old 401 cannot expire a newly logged-in session', async () => {
  const api = await client();
  let release, expired = 0;
  window.addEventListener('pulse-session-expired', () => expired++);
  globalThis.fetch = () => new Promise(resolve => { release = resolve; });
  const old = api.get('/admin/pulse/topics');
  globalThis.fetch = async () => Response.json({ id: 'new', csrf_token: 'new-csrf' });
  await api.post('/pulse/auth/login', { email: 'test@example.invalid', password: 'fixture' });
  release(Response.json({ detail: 'Expired old request' }, { status: 401 }));
  await assert.rejects(old);
  assert.equal(expired, 0);
  assert.equal(api.csrfToken, 'new-csrf');
});
test('delayed old me cannot return an identity or overwrite CSRF after login', async () => {
  const api = await client();
  let release;
  globalThis.fetch = () => new Promise(resolve => { release = resolve; });
  const old = api.get('/pulse/auth/me');
  globalThis.fetch = async () => Response.json({ id: 'new', csrf_token: 'new-csrf' });
  await api.post('/pulse/auth/login', {});
  release(Response.json({ id: 'old', csrf_token: 'old-csrf' }));
  await assert.rejects(old, { status: 409 });
  assert.equal(api.csrfToken, 'new-csrf');
});
test('login logout and password change broadcast only a session-changed signal', async () => {
  const sent = [];
  class Channel { postMessage(data) { sent.push(data); } }
  const api = await client('/pulse', undefined, false, Channel);
  globalThis.fetch = async () => Response.json({ id: 'private-user', email: 'private@example.invalid', csrf_token: 'secret' });
  await api.post('/pulse/auth/login', { password: 'not-shared' });
  await api.post('/pulse/auth/logout');
  await api.post('/pulse/auth/password', { new_password: 'not-shared' });
  assert.deepEqual(sent, [{ type: 'session-changed' }, { type: 'session-changed' }, { type: 'session-changed' }]);
  assert.equal(api.csrfToken, null);
});
test('cross-tab notification invalidates in-flight data before revalidation', async () => {
  let channel, release, changed = 0;
  class Channel { constructor() { channel = this; } postMessage() {} }
  const api = await client('/pulse', undefined, false, Channel);
  window.addEventListener('pulse-session-changed', () => changed++);
  globalThis.fetch = () => new Promise(resolve => { release = resolve; });
  const old = api.get('/pulse/auth/me');
  assert.ok(channel, 'cross-tab channel is connected');
  channel.onmessage({ data: { type: 'session-changed' } });
  release(Response.json({ id: 'old', csrf_token: 'old-csrf' }));
  await assert.rejects(old, { status: 409 });
  assert.equal(changed, 1);
  assert.equal(api.csrfToken, null);
});
test('standalone 401 expires session without refresh and clears CSRF', async () => {
  const api = await client('/pulse/settings');
  let expired = 0;
  window.addEventListener('pulse-session-expired', () => expired++);
  globalThis.fetch = async () => Response.json({ detail: 'Expired' }, { status: 401 });
  await assert.rejects(api.get('/admin/pulse/topics'), { status: 401 });
  assert.equal(expired, 1);
});
test('standalone never sends cookies to non-PULSE API paths', async () => {
  const api = await client();
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(api.get('/missions'));
  assert.equal(called, false);
});
test('configured API base and empty success responses are supported', async () => {
  const api = await client('/pulse', 'https://pulse.example/api');
  globalThis.fetch = async url => { assert.equal(url, 'https://pulse.example/api/pulse/auth/logout'); return new Response(null, { status: 204 }); };
  assert.equal(await api.post('/pulse/auth/logout'), null);
});
test('GERAK keeps bearer auth without cookie-backed mode', async () => {
  const api = await client('/admin');
  globalThis.localStorage = { getItem: key => key === 'sinar_token' ? 'legacy-token' : null };
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, 'Bearer legacy-token'); assert.notEqual(options.credentials, 'include'); return Response.json({ ok: true }); };
  assert.deepEqual(await api.get('/missions'), { ok: true });
});
test('PULSE-only build uses cookie auth even at the root path', async () => {
  const api = await client('/', undefined, true);
  globalThis.fetch = async (url, options) => { assert.equal(options.credentials, 'include'); assert.equal(options.headers.Authorization, undefined); return Response.json({}); };
  await api.get('/pulse/auth/me');
});
test('relative configured API base resolves against current origin', async () => {
  const api = await client('/pulse', '/api');
  globalThis.fetch = async url => { assert.equal(url, 'http://127.0.0.1:5173/api/pulse/auth/me'); return Response.json({}); };
  await api.get('/pulse/auth/me');
});
