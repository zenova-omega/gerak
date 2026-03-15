/**
 * SINAR API Client
 * Wraps fetch with JWT auth, token refresh, and error handling.
 *
 * Usage:
 *   import api from './api';
 *   const missions = await api.get('/missions');
 *   await api.post('/missions/123/join');
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('sinar_token');
  }

  getRefreshToken() {
    return localStorage.getItem('sinar_refresh');
  }

  setTokens(access, refresh) {
    localStorage.setItem('sinar_token', access);
    if (refresh) localStorage.setItem('sinar_refresh', refresh);
  }

  clearTokens() {
    localStorage.removeItem('sinar_token');
    localStorage.removeItem('sinar_refresh');
  }

  async request(method, path, { body, params, file } = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const headers = {};
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

    let res = await fetch(url.toString(), { method, headers, body: fetchBody });

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
      throw new ApiError(res.status, error.detail || 'Request failed');
    }

    return res.json();
  }

  async refreshToken() {
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
