import { useCallback, useEffect, useRef, useState } from 'react';
import { pageMeta } from './pageMeta';
import { PulsePageHead } from '../components/ui/PulsePatterns';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import { useTopics } from '../hooks/usePulse';
import { canManageSources, collectionBlock, collectionResult, formatSourceCount as count, formatSourceTime as time, safeSourceError } from './sourcesCoverage.js';
import './sources-coverage.css';
import { PulseBadge, PulseButton, PulseNotice } from '../components/ui/PulseUI';
import SourceDisclosure from './SourceDisclosure';

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
  const data = visible.data;
  const busy = Boolean(action) || visible.loading;

  async function runAction(source) {
    if (actionLock.current || isReadOnly || busy) return;
    if (source && source.platform!=='threads' && collectionBlock({ source, budget: data?.budget, topicId: selectedTopic?.id, readOnly: isReadOnly, busy })) return;
    actionLock.current = true;
    setAction(source ? source.platform : 'check');
    setNotice(null);
    try {
      const result = source?.platform==='threads' ? await api.post('/admin/pulse/sources/threads/check') : source
        ? await api.post('/admin/pulse/sources/collect', { topic_id: topicId, platform: source.platform, limit: 300 })
        : await api.post('/admin/pulse/sources/check');
      if (mounted.current && currentTopic.current === topicId) setNotice({ topicId, error: source ? result.status === 'failed' : false, text: source?.platform==='threads'?'Pemeriksaan Threads selesai. Lihat status koneksi dan batas cakupannya.':source ? `${names[source.platform]}: ${collectionResult(result)}` : 'Verifikasi metadata selesai. Status tersimpan dimuat ulang.' });
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
    {projectPicker && <section className="sc-controls" aria-label="Cakupan topik"><div><label htmlFor="sc-topic">Topik pantauan</label><select id="sc-topic" value={topicId} disabled={Boolean(action) || topics.loading} onChange={event => { const next = new URLSearchParams(params); if (event.target.value) next.set('topic', event.target.value); else next.delete('topic'); setParams(next); }}><option value="">Semua topik · hanya lihat</option>{topicId && !selectedTopic && <option value={topicId}>Topik tidak tersedia</option>}{topics.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.label}</option>)}</select></div><p className="sc-safe-label"><ShieldCheck size={16} aria-hidden="true" />Membaca data tersimpan, tanpa pengambilan baru</p></section>}
    {topics.loading && <p role="status">Memuat daftar topik…</p>}
    {topics.error && <PulseNotice tone="warning" role="alert">Daftar topik gagal dimuat. Perbarui tampilan untuk mencoba lagi.</PulseNotice>}
    {!topics.loading && !topics.error && !topics.topics.length && <PulseNotice>Belum ada topik. Minta administrator menyiapkan topik sebelum pengumpulan.</PulseNotice>}
    {isReadOnly && <PulseNotice>Mode baca saja. Pengumpulan hanya tersedia untuk pemilik atau admin.</PulseNotice>}
    {notice?.topicId === topicId && <PulseNotice tone={notice.error ? 'warning' : 'neutral'} role={notice.error ? 'alert' : 'status'}>{notice.text}</PulseNotice>}
    {action && <p role="status">{action === 'check' ? 'Memeriksa metadata Xpoz…' : `Mengumpulkan ${names[action]}…`} Tidak ada pengulangan otomatis.</p>}
    {visible.loading ? <div className="sc-loading" role="status"><span>Memuat cakupan tersimpan…</span><div className="sc-skeleton" aria-hidden="true" /><div className="sc-skeleton" aria-hidden="true" /><div className="sc-skeleton" aria-hidden="true" /></div> : visible.error ? <PulseNotice tone="warning" role="alert"><p>{visible.error}</p><PulseButton onClick={reload}>Coba muat ulang</PulseButton></PulseNotice> : data && <>
      <section className="sc-account" aria-label="Akun dan batas penggunaan">
        <div className="sc-account-overview"><div><h2>Akun Xpoz</h2><PulseBadge tone={data.account?.status === 'verified' ? 'success' : data.account?.status === 'error' ? 'warning' : 'neutral'}>{data.account?.status === 'verified' ? 'Terverifikasi' : 'Belum terverifikasi'}</PulseBadge></div><dl><div><dt>Paket</dt><dd>{data.account?.plan || 'Tidak diketahui'}</dd></div><div><dt>Sisa kredit</dt><dd>{count(data.account?.credits_remaining)}</dd></div><div><dt>Percobaan lokal</dt><dd>{count(data.budget?.used)} / {data.budget?.daily_limit<0?'tanpa batas':count(data.budget?.daily_limit)}<small>hari UTC {data.budget?.day_utc}</small></dd></div></dl></div>
        <details className="sc-account-detail"><summary>Kuota &amp; pengaturan koneksi</summary><div><p className="sc-small">Diperiksa: {time(data.checked_at)}. Saldo kredit provider berbeda dari batas percobaan lokal. Kredit tambahan: {count(data.account?.extra_credits_remaining)}. Reset kredit: {data.account?.credit_reset_frequency === 'never' ? 'tidak berkala' : data.account?.credit_reset_frequency || 'tidak diketahui'}.</p><p className="sc-small">Instagram dan TikTok: manual saja, maksimal 5 posting per permintaan. Pemeriksaan metadata menghubungi Xpoz, tetapi tidak mengumpulkan posting.</p><PulseButton disabled={busy || isReadOnly} onClick={() => runAction()}>Periksa metadata Xpoz</PulseButton></div></details>
        {data.account?.error && <PulseNotice tone="warning">Metadata akun belum dapat diverifikasi. Hubungi administrator.</PulseNotice>}
        {data.budget?.blocked_reason && <PulseNotice tone="warning" role="status">Pengumpulan diblokir. Minta administrator memeriksa status pengumpulan di Monitor.</PulseNotice>}
      </section>
      <section aria-labelledby="sc-coverage-heading"><div className="sc-section-heading"><h2 id="sc-coverage-heading">Cakupan sumber</h2><span>{data.sources?.length || 0} sumber</span></div><p className="sc-description">Buka sumber untuk melihat kelengkapan metrik, akses, dan riwayat pengambilan.</p><div className="sc-source-list">{(data.sources || []).map(source => <SourceDisclosure key={`${topicId}:${source.platform}`} source={source} budget={data.budget} topicId={!topics.error && !topics.loading ? selectedTopic?.id : null} readOnly={isReadOnly} busy={busy} onCollect={runAction} />)}</div>{!data.sources?.length && <PulseNotice>Belum ada informasi sumber. Perbarui tampilan atau minta admin memeriksa koneksi.</PulseNotice>}<p className="sc-footnote">Cakupan: {selectedTopic?.label || (topicId ? 'Topik tidak tersedia' : 'Semua topik')}. Data tersimpan bukan keseluruhan percakapan publik. Membuka detail tidak memakai kuota.</p></section>
    </>}
  </section>;
}
