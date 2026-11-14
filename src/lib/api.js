/**
 * SCOUT API Client
 * Wraps fetch with JWT auth, token refresh, and error handling.
 *
 * Usage:
 *   import api from './api';
 *   const missions = await api.get('/missions');
 *   await api.post('/missions/123/join');
 */

const standalone = import.meta.env.VITE_PULSE_ONLY === 'true' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/pulse'));
const defaultBase = standalone ? `${window.location.protocol}//${window.location.hostname}:8000/api` : 'http://localhost:8000/api';
const API_BASE = (import.meta.env.VITE_API_URL || defaultBase).replace(/\/$/, '');

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.csrfToken = null;
    this.sessionGeneration = 0;
    if (standalone && window.BroadcastChannel) {
      try {
        this.sessionChannel = new window.BroadcastChannel('pulse-session');
        this.sessionChannel.onmessage = ({ data }) => {
          if (data?.type !== 'session-changed') return;
          this.clearTokens();
          window.dispatchEvent(new Event('pulse-session-changed'));
        };
      } catch { /* Focus revalidation remains available when channels are blocked. */ }
    }
  }

  getToken() {
    if (standalone) return null;
    return localStorage.getItem('sinar_token');
  }

  getRefreshToken() {
    if (standalone) return null;
    return localStorage.getItem('sinar_refresh');
  }

  setTokens(access, refresh) {
    if (standalone) return;
    localStorage.setItem('sinar_token', access);
    if (refresh) localStorage.setItem('sinar_refresh', refresh);
  }

  clearTokens() {
    if (standalone) { this.sessionGeneration++; this.csrfToken = null; return; }
    localStorage.removeItem('sinar_token');
    localStorage.removeItem('sinar_refresh');
  }

  async request(method, path, { body, params, file } = {}) {
    const generation = this.sessionGeneration;
    const assertCurrentSession = () => {
      if (standalone && generation !== this.sessionGeneration) throw new ApiError(409, 'Session changed; stale response discarded');
    };
    const url = new URL(`${this.baseUrl}${path}`, typeof window !== 'undefined' ? window.location.origin : undefined);
    if (standalone && !/^\/api\/(admin\/pulse(?:\/|$)|pulse\/auth(?:\/|$))/.test(url.pathname)) {
      throw new ApiError(403, 'Standalone PULSE cannot access this API path');
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const headers = {};
    if (standalone && !['GET', 'HEAD', 'OPTIONS'].includes(method) && this.csrfToken) headers['X-Pulse-CSRF'] = this.csrfToken;
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let fetchBody;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (body) {
        Object.entries(body).forEach(([k, v]) => {
          if (v !== undefined) formData.append(k, v);
        });
      }
      fetchBody = formData;
    } else if (body) {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }

    let res = await fetch(url.toString(), { method, headers, body: fetchBody, ...(standalone ? { credentials: 'include' } : {}) });
    assertCurrentSession();
    if (standalone && res.status === 401) {
      this.csrfToken = null;
      window.dispatchEvent(new Event('pulse-session-expired'));
    }

    // Auto-refresh on 401
    if (res.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        res = await fetch(url.toString(), { method, headers, body: fetchBody });
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Network error' }));
      throw new ApiError(res.status, typeof error.detail === 'string' ? error.detail : 'Request failed. Check your entries and try again.');
    }

    const data = res.status === 204 ? null : await res.json();
    assertCurrentSession();
    if (standalone && path === '/pulse/auth/login') this.clearTokens();
    if (standalone && /^\/pulse\/auth\/(me|login)$/.test(path) && data?.csrf_token) this.csrfToken = data.csrf_token;
    if (standalone && /^\/pulse\/auth\/(logout|password)$/.test(path)) this.clearTokens();
    if (standalone && /^\/pulse\/auth\/(login|logout|password)$/.test(path)) {
      try { this.sessionChannel?.postMessage({ type: 'session-changed' }); } catch { /* No credentials or fallback storage. */ }
    }
    return data;
  }

  async refreshToken() {
    if (standalone) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.getRefreshToken() }),
      });
      if (!res.ok) {
        this.clearTokens();
        return false;
      }
      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  get(path, params) { return this.request('GET', path, { params }); }
  post(path, body) { return this.request('POST', path, { body }); }
  put(path, body) { return this.request('PUT', path, { body }); }
  delete(path) { return this.request('DELETE', path); }
  upload(path, file, body) { return this.request('POST', path, { file, body }); }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const api = new ApiClient();
export default api;
export { ApiError };
