import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { PulsePageHead } from '../components/ui/PulsePatterns';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { visibleIssues } from '../lib/pulseRadar';
import { pageMeta } from './pageMeta';
import AnalyticsPanel from './AnalyticsPanel';
import HomeProjects from './HomeProjects';
import { CategoryMix, ProvinceRanking } from './RadarBreakdowns';
import RadarFigures from './RadarFigures';
import RadarIssueDrawer from './RadarIssueDrawer';
import RadarIssues from './RadarIssues';
import RadarLead from './RadarLead';
import RadarMap, { MAP_SOURCE } from './RadarMap';
import RadarPlatformTops from './RadarPlatformTops';
import './ds/home.css';

const OFFLINE = 'Tidak dapat terhubung ke server PULSE. Periksa koneksi lalu coba lagi.';
const STORE = 'pulse-home-filters';
const SLOW_MS = 300000, FAST_MS = 8000;

/**
 * Beranda as it is drawn, on the product's twelve-column grid:
 * the answer card (12) · the figures strip (12) · the map with the province ranking (8 + 4) · the issue list with
 * the composition of the scope (8 + 4) · a top ten per platform (three or four columns) · the project cards (4 + 4 + 4).
 * Everything comes in as props.
 */
export function HomeView({ radar, projects, error = '', notice = '', filters, selectedKey = '', canCreate = false, refreshing = false, now = new Date(), onFilters = () => {}, onSelect = () => {}, onRefresh = () => {}, onRetry = () => {} }) {
  const meta = pageMeta.home;
  const head = <PulsePageHead icon={meta.icon} title={meta.title} tagline={meta.tagline} guide={meta.guide}><a className="hm-jump" href="#hm-projects">Project aktif</a></PulsePageHead>;
  if (error) return <section className="hm">{head}<div className="hm-error"><PulseNotice role="alert"><p>{error}</p><PulseButton onClick={onRetry}>Coba lagi</PulseButton></PulseNotice></div></section>;
  const listed = Boolean(radar?.issues?.length), raw = radar?.state === 'raw';
  const selected = listed ? radar.issues.find(issue => issue.key === selectedKey) || null : null;
  // The map answers "where", whatever platform orders the list: it follows the category and nothing else.
  const mapped = listed ? visibleIssues(radar.issues, { category: filters.category }) : [];
  const rows = listed ? visibleIssues(radar.issues, filters) : [];
  return <section className="hm">{head}
    {notice && <div className="hm-error"><PulseNotice role="alert"><p>{notice}</p></PulseNotice></div>}
    <div className="lay-grid"><div className="lay-12"><RadarLead payload={radar} filters={filters} onFilters={onFilters} canCreate={canCreate} onRefresh={onRefresh} refreshing={refreshing} now={now} /></div></div>
    {listed && <RadarFigures payload={radar} />}
    {listed && <div className="lay-grid">
      <div className="lay-8"><AnalyticsPanel title="Peta sebaran isu" description="Provinsi tempat isu pada daftar masuk pencarian populer. Pilih provinsi, atau buka satu isu untuk melihat sebarannya." footer={MAP_SOURCE}>
        <RadarMap issues={mapped} selectedIssue={selected} province={filters.province} provincesRead={radar.provinces_read} onProvince={province => onFilters({ ...filters, province })} />
      </AnalyticsPanel></div>
      <div className="lay-4"><ProvinceRanking issues={mapped} filters={filters} /></div>
    </div>}
    {(listed || raw) && <div className="lay-grid">
      <div className={listed ? 'lay-8' : 'lay-12'}><RadarIssues payload={radar} filters={filters} onFilters={onFilters} selectedKey={selected ? selectedKey : ''} onSelect={onSelect} canCreate={canCreate} /></div>
      {listed && <div className="lay-4"><CategoryMix payload={radar} filters={filters} listed={rows} /></div>}
    </div>}
    {listed && <RadarPlatformTops issues={radar.issues} filters={filters} selectedKey={selected ? selectedKey : ''} onSelect={onSelect} />}
    <HomeProjects rows={projects} canCreate={canCreate} now={now} />
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
  // A choice made through a link (the rankings beside the map and the list) is remembered like one made on a switch.
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ cat: filters.category, pf: filters.platform })); } catch { /* Preference storage may be disabled. */ }
  }, [filters.category, filters.platform]);

  const write = (changes, replace) => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [name, value] of Object.entries(changes)) { if (value) next.set(name, value); else next.delete(name); }
    return next;
  }, { replace });
  const onFilters = next => write({ cat: next.category, pf: next.platform, prov: next.province, ...(next.province !== filters.province ? { issue: '' } : {}) }, true);
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
