import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pageMeta } from './pageMeta';
import { PulsePageHead } from '../components/ui/PulsePatterns';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useTopics } from '../hooks/usePulse';
import { balanceAgeHours, canManageSources, collectionBlock, collectionResult, formatSourceCount as count, formatSourceTime as time, lookbackRange, safeSourceError, threadsStatus } from './sourcesCoverage.js';
import './sources-coverage.css';
import { PulseBadge, PulseButton, PulseNotice } from '../components/ui/PulseUI';
import { PulseStat, PulseStatGrid } from '../components/ui/PulseAnalytics';

/** A figure the source reported, or null (PulseStat prints it as unavailable, never as zero). */
const known = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
import SourceDisclosure from './SourceDisclosure';
import { CoverageDetail } from './CoverageBadge';
import useProjectSelection from './useProjectSelection';
import { coverage } from '../lib/pulseReadings';

const names = { x: 'X', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', news: 'Berita', threads:'Threads', reddit:'Reddit' };
export default function SourcesCoverage({ user, readOnly = false, projectPicker = true }) {
  const [params, setParams] = useSearchParams();
  const topicId = params.get('topic') || '';
  const topics = useTopics();
  const selectedTopic = topics.topics.find(topic => topic.id === topicId);
  const isReadOnly = readOnly || !canManageSources(user);
  const [state, setState] = useState({ topicId, loading: true, data: null, error: null });
  const [action, setAction] = useState('');
  const [notice, setNotice] = useState(null);
  const generation = useRef(0);
  const actionLock = useRef(false);
  const mounted = useRef(false);
  const currentTopic = useRef(topicId);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setState({ topicId, loading: true, data: null, error: null });
    try {
      const data = await api.get('/admin/pulse/sources', topicId ? { topic_id: topicId } : undefined);
      if (mounted.current && request === generation.current) setState({ topicId, loading: false, data, error: null });
    } catch (error) {
      if (mounted.current && request === generation.current) setState({ topicId, loading: false, data: null, error: safeSourceError(error) });
    }
  }, [topicId]);
  useEffect(() => {
    currentTopic.current = topicId;
    const requests = generation;
    let active = true;
    Promise.resolve().then(() => { if (active) reload(); });
    return () => { active = false; requests.current++; };
  }, [topicId, reload]);
  const visible = state.topicId === topicId ? state : { loading: true, data: null, error: null };
  // coverage_v1 of the project bar's selection. This page holds no posts of its own, so it takes the ones a project
  // page shared, or loads them once the way those pages do.
  const selection = useProjectSelection(topicId, { load: true });
  const coverageReading = useMemo(() => (selection.posts ? coverage(selection.posts) : null), [selection.posts]);
  const data = visible.data;
  const busy = Boolean(action) || visible.loading;

  // Everything the source has for the project's own range of days, through the complete pull. No row cap of ours.
  async function collectEverything(id, platform) {
    const lookback = await api.get('/admin/pulse/topics/' + encodeURIComponent(id) + '/lookback').catch(() => ({ days: 7 }));
    const range = lookbackRange(lookback.days || 7);
    const pulled = await api.post('/admin/pulse/topics/' + encodeURIComponent(id) + '/backfill', { platform, ...range });
    return { status: pulled.stopped ? 'failed' : pulled.fetched ? 'succeeded' : 'empty', fetched: pulled.fetched, ingested: pulled.ingested, error: pulled.stopped };
  }
  async function runAction(source, mode) {
    if (actionLock.current || isReadOnly || busy) return;
    const threads = source?.platform === 'threads';
    const searching = threads && mode === 'collect';
    if (source && !threads && collectionBlock({ source, budget: data?.budget, topicId: selectedTopic?.id, readOnly: isReadOnly, busy })) return;
    if (searching && !threadsStatus(source, { topicId: selectedTopic?.id, readOnly: isReadOnly, busy }).canCollect) return;
    actionLock.current = true;
    setAction(source ? source.platform : 'check');
    setNotice(null);
    try {
      const result = searching ? await api.post('/admin/pulse/sources/threads/collect', { topic_id: topicId }) : threads ? await api.post('/admin/pulse/sources/threads/check') : source
        ? await collectEverything(topicId, source.platform)
        : await api.post('/admin/pulse/sources/check');
      if (mounted.current && currentTopic.current === topicId) setNotice({ topicId, error: source ? result.status === 'failed' : false, text: searching ? (result.status === 'failed' ? 'Threads: pengumpulan ditolak.' : `Threads: ${collectionResult(result)}`) : threads ? 'Pemeriksaan Threads selesai.' : source ? `${names[source.platform]}: ${collectionResult(result)}` : 'Verifikasi selesai.' });
    } catch (error) {
      if (mounted.current && currentTopic.current === topicId) setNotice({ topicId, error: true, text: safeSourceError(error) });
    } finally {
      // POST /check may return global data: always GET the selected scope instead.
      if (mounted.current && currentTopic.current === topicId) await reload();
      actionLock.current = false;
      if (mounted.current) setAction('');
    }
  }

  return <section className="sc-page" aria-labelledby="sc-title">
    <PulsePageHead icon={pageMeta.sources.icon} title={pageMeta.sources.title} tagline={pageMeta.sources.tagline} guide={pageMeta.sources.guide}><PulseButton disabled={busy} onClick={() => { reload(); topics.refetch(); }}><RefreshCw size={16} aria-hidden="true" />Perbarui tampilan</PulseButton></PulsePageHead>
    {projectPicker && <section className="sc-controls" aria-label="Cakupan topik"><div><label htmlFor="sc-topic">Topik pantauan</label><select id="sc-topic" value={topicId} disabled={Boolean(action) || topics.loading} onChange={event => { const next = new URLSearchParams(params); if (event.target.value) next.set('topic', event.target.value); else next.delete('topic'); setParams(next); }}><option value="">Semua topik · hanya lihat</option>{topicId && !selectedTopic && <option value={topicId}>Topik tidak tersedia</option>}{topics.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.label}</option>)}</select></div></section>}
    {topics.loading && <p role="status">Memuat topik…</p>}
    {topics.error && <PulseNotice tone="warning" role="alert">Topik gagal dimuat.</PulseNotice>}
    {!topics.loading && !topics.error && !topics.topics.length && <PulseNotice>Belum ada topik.</PulseNotice>}
    {isReadOnly && <PulseNotice>Mode baca saja.</PulseNotice>}
    {notice?.topicId === topicId && <PulseNotice tone={notice.error ? 'warning' : 'neutral'} role={notice.error ? 'alert' : 'status'}>{notice.text}</PulseNotice>}
    {action && <p role="status">{action === 'check' ? 'Membaca saldo…' : `Mengumpulkan posting ${names[action]}…`}</p>}
    {visible.loading ? <div className="sc-loading" role="status"><span>Memuat cakupan…</span><div className="sc-skeleton" aria-hidden="true" /><div className="sc-skeleton" aria-hidden="true" /><div className="sc-skeleton" aria-hidden="true" /></div> : visible.error ? <PulseNotice tone="warning" role="alert"><p>{visible.error}</p><PulseButton onClick={reload}>Coba lagi</PulseButton></PulseNotice> : data && <>
      <section className="sc-account" aria-label="Akun dan batas penggunaan">
        <div className="sc-account-overview"><div><h2>Saldo sumber data</h2><PulseBadge tone={data.account?.status === 'verified' ? 'success' : data.account?.status === 'error' ? 'warning' : 'neutral'}>{data.account?.status === 'verified' ? 'Terverifikasi' : 'Belum terverifikasi'}</PulseBadge></div><PulseStatGrid compact label="Saldo dan pemakaian" className="sc-account-figures">
          <PulseStat label="Paket" value={data.account?.plan || 'Tidak diketahui'} />
          <PulseStat label="Sisa kredit" value={known(data.account?.credits_remaining)} note={`dibaca ${time(data.checked_at)}`} />
          <PulseStat label="Permintaan hari ini" value={known(data.budget?.used)} note={data.budget?.daily_limit<0?'tanpa batas harian':`dari ${count(data.budget?.daily_limit)} per hari`} />
        </PulseStatGrid></div>
        <details className="sc-account-detail"><summary>Rincian saldo</summary><div><p className="sc-small">Terakhir dibaca {time(data.checked_at)}. Kredit tambahan: {count(data.account?.extra_credits_remaining)}. Reset kredit: {data.account?.credit_reset_frequency === 'never' ? 'tidak berkala' : data.account?.credit_reset_frequency || 'tidak diketahui'}.</p><PulseButton disabled={busy || isReadOnly} onClick={() => runAction()}>Baca saldo sekarang</PulseButton></div></details>
        {balanceAgeHours(data.checked_at) >= 24 && <PulseNotice tone="warning">Saldo terakhir dibaca {Math.floor(balanceAgeHours(data.checked_at) / 24)} hari lalu.</PulseNotice>}
        {data.account?.error && <PulseNotice tone="warning">Metadata akun belum terverifikasi.</PulseNotice>}
        {data.budget?.blocked_reason && <PulseNotice tone="warning" role="status">Pengumpulan diblokir. Periksa Monitor.</PulseNotice>}
      </section>
      <section aria-labelledby="sc-coverage-heading"><div className="sc-section-heading"><h2 id="sc-coverage-heading">Cakupan sumber</h2><span>{data.sources?.length || 0} sumber</span></div><div className="sc-source-list">{(data.sources || []).map(source => <SourceDisclosure key={`${topicId}:${source.platform}`} source={source} budget={data.budget} topicId={!topics.error && !topics.loading ? selectedTopic?.id : null} readOnly={isReadOnly} busy={busy} onCollect={runAction} />)}</div>{!data.sources?.length && <PulseNotice>Belum ada informasi sumber.</PulseNotice>}<p className="sc-footnote">Cakupan: {selectedTopic?.label || (topicId ? 'Topik tidak tersedia' : 'Semua topik')}. Data tersimpan bukan keseluruhan percakapan publik. Membuka detail tidak memakai kuota.</p>
        {topicId && <div className="pcv-section" role="group" aria-labelledby="sc-selection-heading"><h3 id="sc-selection-heading">Kelengkapan data pada pilihan ini</h3>
          <div className="pcv-frame">{coverageReading?.level ? <CoverageDetail reading={coverageReading} />
            : selection.status === 'error' ? <p className="sc-small" role="alert">Posting belum dapat dimuat.</p>
            : selection.status === 'ready' ? <p className="sc-small">Belum ada posting pada pilihan ini.</p>
            : <p className="sc-small" role="status">Menghitung…</p>}</div>
        </div>}</section>
    </>}
  </section>;
}
