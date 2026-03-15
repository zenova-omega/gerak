import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

// Standalone login page — works with both API backend and demo mode
export default function LoginPage() {
  const [nrp, setNrp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const C = {
    primary: '#1B4332', accent: '#B8860B', bg: '#F5F3EE',
    text: '#1A1814', textMuted: '#6B6555', border: '#DDD9D0',
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/auth/login', { nrp, password });
      login(data.user, data.access_token, data.refresh_token);
      navigate(data.user.role === 'admin' ? '/admin' : '/app');
    } catch (err) {
      // Fallback: demo mode (no backend)
      if (nrp === 'ADMIN001' && password === 'admin2026') {
        login({ id: 'admin-001', nrp: 'ADMIN001', name: 'Super Admin', role: 'admin', rank: 4, xp: 99999, tier: 'Gold' }, 'demo-token', 'demo-refresh');
        navigate('/admin');
      } else if (nrp && password === 'sinar2026') {
        login({ id: 'usr-0', nrp, name: 'Mayor Arif Santoso', role: 'prajurit', account_type: 'prajurit', rank: 1, xp: 4820, tier: 'Silver' }, 'demo-token', 'demo-refresh');
        navigate('/app');
      } else {
        setError(err.message || 'NRP atau password salah');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo quick login
  const demoLogin = (role) => {
    if (role === 'admin') {
      login({ id: 'admin-001', nrp: 'ADMIN001', name: 'Super Admin', role: 'admin', rank: 4, xp: 99999, tier: 'Gold' }, 'demo-token', 'demo-refresh');
      navigate('/admin');
    } else {
      login({ id: 'usr-0', nrp: '31200456', name: 'Mayor Arif Santoso', role: 'prajurit', account_type: 'prajurit', rank: 1, xp: 4820, tier: 'Silver' }, 'demo-token', 'demo-refresh');
      navigate('/app');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: 380, padding: 40, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: `1px solid ${C.border}` }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary}, #2D6A4F)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(27,67,50,0.2)' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#D4A843' }}>S</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: 4 }}>SINAR</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Sistem Informasi Narasi Aktif Rakyat</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 6 }}>NRP / ID Pengguna</label>
            <input
              type="text" value={nrp} onChange={e => setNrp(e.target.value)}
              placeholder="Masukkan NRP"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12, textAlign: 'center' }}>{error}</p>}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.primary}, #2D6A4F)`, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 200ms' }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Demo quick access */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>Demo Mode (tanpa backend)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => demoLogin('member')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Masuk sebagai Prajurit
            </button>
            <button onClick={() => demoLogin('admin')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${C.accent}30`, background: `${C.accent}08`, color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Masuk sebagai Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
