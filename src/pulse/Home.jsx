import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Card } from '../components/ui/shadcn/card';
import { PulsePageHead } from '../components/ui/PulsePatterns';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { visibleIssues } from '../lib/pulseRadar';
import { pageMeta } from './pageMeta';
import HomeProjects from './HomeProjects';
import RadarIssueDrawer from './RadarIssueDrawer';
import RadarIssues from './RadarIssues';
import RadarMap from './RadarMap';
import './ds/home.css';

const OFFLINE = 'Tidak dapat terhubung ke server PULSE. Periksa koneksi lalu coba lagi.';
const STORE = 'pulse-home-filters';
const SLOW_MS = 300000, FAST_MS = 8000;

/** Beranda as it is drawn: the map, the issue list, the projects. Everything comes in as props. */
export function HomeView({ radar, projects, error = '', notice = '', filters, selectedKey = '', canCreate = false, refreshing = false, now = new Date(), onFilters = () => {}, onSelect = () => {}, onRefresh = () => {}, onRetry = () => {} }) {
  const meta = pageMeta.home;
  const head = <PulsePageHead icon={meta.icon} title={meta.title} tagline={meta.tagline} guide={meta.guide}><a className="hm-jump" href="#hm-projects">Project aktif</a></PulsePageHead>;
  if (error) return <section className="hm">{head}<div className="hm-error"><PulseNotice role="alert"><p>{error}</p><PulseButton onClick={onRetry}>Coba lagi</PulseButton></PulseNotice></div></section>;
  const drawable = Boolean(radar?.issues?.length);
  const selected = drawable ? radar.issues.find(issue => issue.key === selectedKey) || null : null;
  return <section className="hm">{head}
    <Card className="hm-card hm-radar" data-map={drawable ? '' : undefined}>
      {notice && <PulseNotice role="alert"><p>{notice}</p></PulseNotice>}
      {drawable && <div className="hm-map"><RadarMap issues={visibleIssues(radar.issues, { category: filters.category, platform: filters.platform })} selectedIssue={selected}
        province={filters.province} provincesRead={radar.provinces_read} onProvince={province => onFilters({ ...filters, province })} /></div>}
      <div className="hm-list"><RadarIssues payload={radar} filters={filters} onFilters={onFilters} selectedKey={selected ? selectedKey : ''} onSelect={onSelect} canCreate={canCreate}
        onRefresh={onRefresh} refreshing={refreshing} now={now} /></div>
    </Card>
    <Card className="hm-card" id="hm-projects"><HomeProjects rows={projects} canCreate={canCreate} now={now} /></Card>
  </section>;
}

/** Beranda. Reads the last stored refresh of the radar and the project rows; nothing here starts a collection
 * except the refresh button, which only people who may change settings are given. */
export default function Home({ canCreate = false }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ radar: null, projects: null });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const started = useRef(0), loaded = useRef(false);
  const filters = { category: params.get('cat') || '', platform: params.get('pf') || '', province: params.get('prov') || '' };
  const selectedKey = params.get('issue') || '';
  const fast = refreshing || Boolean(data.radar?.running);

  useEffect(() => {
    let active = true;
    const load = () => Promise.all([api.get('/admin/pulse/radar'), api.get('/admin/pulse/home/projects')]).then(([radar, projects]) => {
      if (!active) return;
      loaded.current = true;
      setData({ radar, projects });
      setError('');
      if (!radar.running && Date.now() - started.current > 5000) setRefreshing(false);
    }).catch(failure => { if (active && !loaded.current) setError(failure.status ? failure.message : OFFLINE); });
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, fast ? FAST_MS : SLOW_MS);
    return () => { active = false; clearInterval(timer); };
  }, [attempt, fast]);

  // The last category and platform a person chose come back when the address names none.
  useEffect(() => {
    if (params.has('cat') || params.has('pf')) return;
    let kept = null;
    try { kept = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { /* Preference storage may be disabled. */ }
    if (!kept || (!kept.cat && !kept.pf)) return;
    setParams(previous => { const next = new URLSearchParams(previous); if (kept.cat) next.set('cat', kept.cat); if (kept.pf) next.set('pf', kept.pf); return next; }, { replace: true });
  // Only on arrival: later changes are the person's own.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const write = (changes, replace) => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [name, value] of Object.entries(changes)) { if (value) next.set(name, value); else next.delete(name); }
    return next;
  }, { replace });
  function onFilters(next) {
    try { localStorage.setItem(STORE, JSON.stringify({ cat: next.category, pf: next.platform })); } catch { /* Preference storage may be disabled. */ }
    write({ cat: next.category, pf: next.platform, prov: next.province, ...(next.province !== filters.province ? { issue: '' } : {}) }, true);
  }
  const onSelect = key => write({ issue: key === selectedKey ? '' : key }, false);
  async function onRefresh() {
    setNotice('');
    started.current = Date.now();
    setRefreshing(true);
    try { await api.post('/admin/pulse/radar/refresh'); }
    catch (failure) {
      if (failure.status === 409) return;       // one is already running: keep watching it
      setRefreshing(false);
      setNotice(failure.status ? failure.message : OFFLINE);
    }
  }
  const selected = data.radar?.issues?.find(issue => issue.key === selectedKey) || null;
  return <>
    <HomeView radar={data.radar} projects={data.projects} error={error} notice={notice} filters={filters} selectedKey={selectedKey} canCreate={canCreate} refreshing={refreshing}
      onFilters={onFilters} onSelect={onSelect} onRefresh={onRefresh} onRetry={() => { setError(''); setAttempt(value => value + 1); }} />
    <RadarIssueDrawer issueKey={selected ? selectedKey : ''} summary={selected} canCreate={canCreate} onClose={() => write({ issue: '' }, false)} />
  </>;
}
