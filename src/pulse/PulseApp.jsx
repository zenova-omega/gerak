import { createElement, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Radio, Network, Newspaper, MessageCircle, Settings, LogOut, Moon, Sun, Users, Database, Sparkles, Search, HeartPulse, FileText, ChartPie } from 'lucide-react';
import api from '../lib/api';
import PulseDashboard from '../components/admin/pulse/PulseDashboard';
import SourcesCoverage from './SourcesCoverage.jsx';
import ProjectBar from './ProjectBar.jsx';
import ProjectChat from './ProjectChat.jsx';
import { PulseLogo } from '../components/ui/PulseLogo';
import './shadcn.css';
import './pulse-app.css';
import './pulse-tokens.css';
import './dashboard-polish.css';
import './brand-system.css';
import { PulseButton } from '../components/ui/PulseUI';
import DesignSystemGallery from './DesignSystemGallery';
import QuickSearch from './TaggedSearch';
import { pageMeta, pageOrder, pageGroups } from './pageMeta';
import { PulseLoader } from '../components/ui/PulseLoader';
import { quickSearchDestination } from './projectQuery';
import WorkspaceNavigation from './WorkspaceNavigation';
import './workspace-layout.css';
import './ds/analytics-kit.css';

function Brand() {
  const { search } = useLocation();
  return <Link className="ps-brand" to={`/pulse${search}`} aria-label="PULSE beranda"><PulseLogo height={30} title="PULSE" /></Link>;
}

function errorMessage(error) {
  return error.status ? error.message : 'Tidak dapat terhubung ke server PULSE. Periksa koneksi lalu coba lagi.';
}

function Login({ onLogin, message }) {
  const [status, setStatus] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/pulse/auth/status').then(data => { if (active) setStatus(data); }).catch(error => { if (active) setStatus({ error: errorMessage(error) }); });
    return () => { active = false; };
  }, [attempt]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError('');
    try {
      const user = await api.post('/pulse/auth/login', { email: data.get('email').trim(), password: data.get('password') });
      form.reset(); onLogin(user);
    } catch (error) { setError(error.status === 401 ? 'Email atau kata sandi tidak sesuai.' : errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="ps-login-layout">
    <section className="ps-intro"><Brand /><div className="ps-intro-pitch">
      <h1>Social Media Listening</h1>
      <p className="ps-intro-lead">Satu ruang kerja untuk memantau percakapan publik.</p>
      <ul className="ps-intro-points">
        <li><Radio size={18} aria-hidden="true" />Alert saat isu melonjak</li>
        <li><Sparkles size={18} aria-hidden="true" />Jawaban AI dengan sumbernya</li>
        <li><Newspaper size={18} aria-hidden="true" />Laporan siap cetak</li>
      </ul>
    </div><p className="ps-deployment">PULSE / instalasi organisasi</p></section>
    <main className="ps-login-main"><section className="ps-auth-card"><h2>Masuk ke PULSE</h2><p>Gunakan akun dari administrator organisasi Anda.</p>
      {message && <p className="ps-notice" role="status">{message}</p>}
      {status.loading ? <p role="status">Memeriksa instalasi…</p> : status.error ? <div className="ps-error" role="alert"><p>{status.error}</p><PulseButton onClick={() => { setStatus({ loading: true }); setAttempt(value => value + 1); }}>Coba lagi</PulseButton></div> : !status.configured ? <div className="ps-notice"><h3>Instalasi belum dikonfigurasi</h3><p>Minta administrator membuat akun pemilik pertama melalui CLI lokal di server. Tidak ada pendaftaran publik.</p><PulseButton onClick={() => { setStatus({ loading: true }); setAttempt(value => value + 1); }}>Periksa kembali</PulseButton></div> : <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="ps-email">Email</label><input id="ps-email" name="email" type="email" autoComplete="username" required disabled={busy} />
        <label htmlFor="ps-password">Kata sandi</label><input id="ps-password" name="password" type="password" autoComplete="current-password" required disabled={busy} aria-describedby={error ? 'ps-login-error' : undefined} />
        {error && <p id="ps-login-error" className="ps-error" role="alert">{error}</p>}
        <PulseButton variant="primary" type="submit" busy={busy} busyLabel="Memeriksa akun…">Masuk</PulseButton>
      </form>}
      <p className="ps-help">Butuh akses atau lupa kata sandi? Hubungi administrator organisasi Anda.</p>
    </section></main>
  </div>;
}

function PasswordSettings({ user, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('new_password') !== data.get('confirm_password')) { setError('Konfirmasi kata sandi tidak cocok.'); return; }
    if (data.get('new_password') === data.get('current_password')) { setError('Pilih kata sandi yang berbeda dari kata sandi saat ini.'); return; }
    setBusy(true); setError('');
    try {
      await api.post('/pulse/auth/password', { current_password: data.get('current_password'), new_password: data.get('new_password') });
      form.reset(); onChanged();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="ps-settings"><h1>Pengaturan akun</h1><p>{user.name} / {user.email}</p><div className="ps-auth-card"><h2>Ubah kata sandi</h2><p>Setelah berhasil, semua sesi akan berakhir, termasuk sesi ini. Masuk kembali dengan kata sandi baru.</p><form onSubmit={submit} aria-busy={busy}>
    <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
    <label htmlFor="ps-current">Kata sandi saat ini</label><input id="ps-current" name="current_password" type="password" autoComplete="current-password" maxLength={128} required disabled={busy} />
    <label htmlFor="ps-new">Kata sandi baru</label><input id="ps-new" name="new_password" type="password" autoComplete="new-password" minLength={12} maxLength={128} aria-describedby="ps-password-length" required disabled={busy} />
    <p id="ps-password-length">12–128 karakter</p>
    <label htmlFor="ps-confirm">Konfirmasi kata sandi baru</label><input id="ps-confirm" name="confirm_password" type="password" autoComplete="new-password" minLength={12} maxLength={128} aria-describedby="ps-password-length" required disabled={busy} />
    {error && <p className="ps-error" role="alert">{error}</p>}
    <PulseButton variant="primary" type="submit" busy={busy} busyLabel="Menyimpan…">Ubah kata sandi &amp; keluar</PulseButton>
  </form></div><DesignSystemGallery/></section>;
}

const sections = pageOrder.map(id => [id, pageMeta[id].title, pageMeta[id].icon]);

export default function PulseApp() {
  const [session, setSession] = useState({ loading: true, user: null });
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('pulse-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const quickDestination = quickSearchDestination(location.pathname, location.search);
  const navigationSearch = location.pathname === '/pulse/search' ? '' : location.search;
  useEffect(() => {
    document.title = 'PULSE — Pemantauan percakapan';
    const icon = document.querySelector('link[rel~="icon"]'); if (icon) icon.href = '/pulse-icon.svg';
    try { localStorage.setItem('pulse-theme', theme); } catch { /* Preference storage may be disabled. */ }
  }, [theme]);
  useEffect(() => {
    let active = true;
    let revalidation = 0;
    const expired = () => {
      if (!active) return;
      setSession(previous => {
        if (!previous.user) return previous;
        return { user: null, loading: false };
      });
      setMessage('Sesi berakhir. Silakan masuk kembali.');
    };
    const validate = () => {
      const request = ++revalidation;
      api.clearTokens();
      const generation = api.sessionGeneration;
      setSession({ user: null, loading: true });
      api.get('/pulse/auth/me').then(user => {
        if (active && request === revalidation && generation === api.sessionGeneration) setSession({ user, loading: false });
      }).catch(error => {
        if (active && request === revalidation && generation === api.sessionGeneration) {
          setSession({ user: null, loading: false, error: error.status === 401 ? null : errorMessage(error) });
          if (error.status === 401) setMessage('');
        }
      });
    };
    window.addEventListener('pulse-session-expired', expired);
    window.addEventListener('focus', validate);
    window.addEventListener('pulse-session-changed', validate);
    // Defer the initial state update out of the effect's synchronous body.
    Promise.resolve().then(() => { if (active) validate(); });
    return () => {
      active = false;
      revalidation++;
      window.removeEventListener('pulse-session-expired', expired);
      window.removeEventListener('focus', validate);
      window.removeEventListener('pulse-session-changed', validate);
    };
  }, [attempt]);
  useEffect(() => {
    if (!session.user || !location.hash) return;
    const scroll = () => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
    scroll();
    const observer = new MutationObserver(scroll);
    observer.observe(document.getElementById('ps-content'), { childList: true, subtree: true });
    const timeout = setTimeout(() => observer.disconnect(), 10000);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [location.hash, location.pathname, session.user]);
  const endSession = notice => { api.clearTokens(); setSession({ user: null, loading: false }); setMessage(notice); navigate('/pulse/login', { replace: true }); };
  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true); setLogoutError('');
    try { await api.post('/pulse/auth/logout'); endSession('Anda telah keluar.'); }
    catch (error) { if (error.status !== 401) setLogoutError(errorMessage(error)); }
    finally { setLogoutBusy(false); }
  }
  const themeButton = <PulseButton className="ps-theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Gunakan tema terang' : 'Gunakan tema gelap'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span>Tema {theme === 'dark' ? 'terang' : 'gelap'}</span></PulseButton>;
  return <div className="pulse-standalone" data-theme={theme}>
    {session.loading ? <main className="ps-loading"><Brand /><PulseLoader size="lg" label="Memeriksa sesi PULSE…" /></main> : session.error ? <main className="ps-loading"><Brand /><p role="alert">{session.error}</p><PulseButton onClick={() => { setSession({ loading: true, user: null }); setAttempt(value => value + 1); }}>Coba lagi</PulseButton></main> : !session.user ? <><div className="ps-login-theme">{themeButton}</div><Login message={message} onLogin={user => { setSession({ user, loading: false }); setMessage(''); if (location.pathname === '/pulse/login') navigate('/pulse', { replace: true }); }} /></> : <div className="ps-workspace" key={`${session.user.id}:${session.user.csrf_token}`}>
      <a className="ps-skip" href="#ps-content">Lewati ke konten</a>
      <WorkspaceNavigation key={location.pathname} brand={<Brand />} label={sections.find(([id]) => location.pathname === `/pulse/${id}`)?.[1] || (location.pathname === '/pulse/settings' ? 'Pengaturan' : location.pathname === '/pulse/search' ? 'Pencarian cepat' : 'Ikhtisar')}>
        <nav aria-label="Navigasi PULSE"><Link to="/pulse/search" aria-current={location.pathname === '/pulse/search' ? 'page' : undefined}>{createElement(pageMeta.search.icon, { size: 19 })}{pageMeta.search.title}</Link>{pageGroups.map(([group, ids]) => <div className="ps-nav-group" key={group} role="group" aria-label={group}><span className="ps-nav-group-label" aria-hidden="true">{group}</span>{ids.map(id => [id, pageMeta[id].title, pageMeta[id].icon]).map(([id, label, icon]) => <Link key={id} to={`/pulse/${id}${navigationSearch}`} aria-current={location.pathname === `/pulse/${id}` || (id === 'overview' && location.pathname === '/pulse') ? 'page' : undefined}>{createElement(icon, { size: 19 })}{label}</Link>)}</div>)}</nav><div className="ps-sidebar-bottom"><Link to={`/pulse/settings${location.search}`} aria-current={location.pathname === '/pulse/settings' ? 'page' : undefined}><Settings size={19} />Pengaturan</Link>{themeButton}<div className="ps-user"><strong>{session.user.name || session.user.email}</strong><span>{session.user.role}</span></div><PulseButton onClick={logout} disabled={logoutBusy}><LogOut size={18} />{logoutBusy ? 'Keluar…' : 'Keluar'}</PulseButton>{logoutError && <p role="alert" className="ps-error">{logoutError}</p>}</div>
      </WorkspaceNavigation>
      <div className="ps-content" id="ps-content" tabIndex={-1}><div className="ps-topline"><span>Pemantauan percakapan</span><span>Instalasi privat</span></div>{location.pathname !== '/pulse/search' && !quickDestination && <ProjectBar readOnly={!["owner", "admin"].includes(session.user.role)} />}<Routes><Route path="/pulse/search" element={<QuickSearch/>}/><Route path="/pulse" element={<PulseDashboard standalone view="overview" />} />{sections.map(([id]) => <Route key={id} path={`/pulse/${id}`} element={id === 'posts' && quickDestination ? <Navigate to={quickDestination} replace/> : id === 'chat' ? <ProjectChat /> : id === 'sources' ? <SourcesCoverage projectPicker={false} user={session.user} readOnly={!['owner', 'admin'].includes(session.user.role)} /> : <PulseDashboard standalone view={id} />} />)}<Route path="/pulse/infographics" element={<Navigate to={`/pulse/overview${location.search}#overview-words`} replace/>}/><Route path="/pulse/settings" element={<PasswordSettings user={session.user} onChanged={() => endSession('Kata sandi diperbarui. Semua sesi telah berakhir. Silakan masuk kembali.')} />} /><Route path="*" element={<Navigate to={`/pulse${location.search}`} replace />} /></Routes></div>
    </div>}
  </div>;
}
