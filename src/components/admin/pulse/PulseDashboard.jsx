import { PulseArrow } from '../../ui/PulseArrow';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, RefreshCw, Download, Database, ExternalLink, MapPin, ShieldCheck, AlertCircle, Radio, Users, Layers } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTopics, useIssues, usePulseAnalytics } from '../../../hooks/usePulse';
import { allegationLabel, formatCount, observedAccounts, providerResults, pulseError } from '../../../lib/pulseData';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import PlatformCheckboxes from './PlatformCheckboxes';
import TopicManager from './TopicManager';
import IssueCard from './IssueCard';
import ConversationGroups from '../../../pulse/ConversationGroups';
import GeographicView from './GeographicView';
import PostFeed from './PostFeed';
import NetworkAnalysis from './NetworkAnalysis';
import CommentsPanel from './CommentsPanel';
import AccountSignal from './AccountSignal';
import MonitorRoom from './MonitorRoom';
import InfographicsPanel from './InfographicsPanel';
import './pulse.css';
import { PulseButton } from '../../ui/PulseUI';
import AnalysisNavigation from '../../../pulse/AnalysisNavigation';
import PageGuide from '../../../pulse/PageGuide';
import useProjectPeriod from '../../../pulse/useProjectPeriod';
import SentimentSummary from './SentimentSummary';
import SentimentProgress from '../../../pulse/SentimentProgress';
import SentimentEvaluation from '../../../pulse/SentimentEvaluation';
import AccountRankingRow from './AccountRankingRow';
import OverviewAnalytics from '../../../pulse/ProjectOverview';
import SentimentAnalytics from '../../../pulse/SentimentAnalytics';
import ProjectReport from '../../../pulse/ProjectReport';
import useProjectPlatforms from '../../../pulse/useProjectPlatforms';
import {scopeProjectData,projectPlatformOptions} from '../../../lib/pulseProjectFilters';
import ResponseAnalysisPanel, { ResponseAnalysisSummary } from '../../../pulse/ResponseAnalysisPanel';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';
import { PulseTag } from '../../ui/PulseTag';

function Empty({ children }) {
  return <div className="pulse-empty"><Database size={25} strokeWidth={1.3} /><p>{children}</p></div>;
}
function ErrorNotice({ error, retry, standalone }) {
  return <div className="pulse-error" role="alert"><AlertCircle size={20} /><div><strong>Data tidak tersedia</strong><p>{pulseError(error)}</p>{!standalone && <Link to="/login?returnTo=pulse">Masuk dengan akun admin</Link>}</div>{retry && <PulseButton variant="secondary" className="pulse-button" onClick={retry}>Coba lagi</PulseButton>}</div>;
}
function Panel({ title, note, children, className = '' }) {
  return <section className={'pulse-panel ' + className}><div className="pulse-panel-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div></div>{children}</section>;
}
function Analytics({ data, view = 'all', period, onPeriodChange, topic, selectedPlatforms=null, onPlatformsChange, availablePlatforms=projectPlatformOptions }) {
  const [analysisParams]=useSearchParams();
  const analysisNavigate=useNavigate();
  const sentiment=analysisParams.get('sentiment');
  const postAuthor=analysisParams.get('author') || '';
  const postPlatform=analysisParams.get('platform') || '';
  const openSentiment=value=>{const next=new URLSearchParams(analysisParams);next.set('sentiment',value);analysisNavigate('/pulse/posts?'+next.toString());};
  const [rankBy, setRankBy] = useState('engagement');
  const [accountQuery, setAccountQuery] = useState('');
  const [accountKind,setAccountKind]=useState('all');
  const allAccounts = observedAccounts(data.influencers, rankBy).filter(row=>accountKind==='all'||(accountKind==='social'?['x','instagram','tiktok','youtube','facebook'].includes(row.platform):row.platform==='news'));
  const accounts = allAccounts.filter(row => `${row.author || ''} ${row.platform || ''}`.toLowerCase().includes(accountQuery.trim().toLowerCase()));
  const totals = data.metric_totals || {};
  const coverage = key => `${formatCount(totals[key]?.coverage)} dari ${formatCount(data.total_mentions)} posting memiliki metrik`;
  const platforms = [...data.platforms].sort((a, b) => b.count - a.count);
  const maximum = Math.max(1, ...platforms.map(row => row.count));
  const timeline = [...data.timeline].sort((a, b) => a.date.localeCompare(b.date));
  const dateLabel = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const metrics = [
    { label: 'Posting terkumpul', value: data.total_mentions, note: `${platforms.length} platform · ${(period?.from||period?.to)?'periode project terpilih':'seluruh periode tersimpan'}`, Icon: Radio },
    { label: 'Akun / sumber unik', value: allAccounts.length, note: 'Per platform, termasuk penerbit berita', Icon: Users },
    { label: 'Interaksi teramati', value: totals.engagement?.value, note: coverage('engagement'), Icon: Activity },
    { label: 'Share / repost', value: totals.shares?.value, note: coverage('shares'), Icon: RefreshCw },
    { label: 'Views teramati', value: totals.views?.value, note: 'Tayangan, bukan audiens unik · ' + coverage('views'), Icon: Layers },
  ];
  const responsePanel=<ResponseAnalysisPanel posts={data.posts||[]} topicId={topic?.id||analysisParams.get('topic')}/>;
  const responseSummary=<ResponseAnalysisSummary posts={data.posts||[]} topicId={topic?.id||analysisParams.get('topic')}/>;
  if(view==='overview') return <><OverviewAnalytics data={data} topic={topic} period={period} platforms={selectedPlatforms} onPlatformsChange={onPlatformsChange} availablePlatforms={availablePlatforms}/>{responseSummary}</>;
  if(view==='sentiment') return <><SentimentAnalytics data={data}/>{responseSummary}<details className="pulse-evaluation-disclosure"><summary>Evaluasi dari koreksi analis</summary><SentimentEvaluation topicId={topic?.id||analysisParams.get('topic')} period={period} platforms={selectedPlatforms}/></details></>;
  if(view==='reports') return <ProjectReport data={data} topic={topic} period={period} selectedPlatforms={selectedPlatforms}/>;
  return <>
    {view === 'all' && <nav className="pulse-section-nav" aria-label="Bagian dashboard"><a href="#pulse-network">Jaringan & narasi</a><a href="#pulse-comments">Top comments</a><a href="#pulse-posts">Kartu posting</a><a href="#pulse-infographics-view">Infografik</a></nav>}
    {['all', 'overview'].includes(view) && <>
    <div className="pulse-kpis">{metrics.map(({ label, value, note, Icon: icon }) => <section className="pulse-kpi" key={label}><div><span>{label}</span>{React.createElement(icon, { size: 18 })}</div><strong>{formatCount(value)}</strong><small>{note}</small></section>)}</div>
    <div className="pulse-chart-grid">
      <Panel title="Dinamika percakapan" note="Hanya posting dengan waktu terbit tersedia; tanggal pengambilan bukan tanggal publikasi" className="pulse-timeline">
        {timeline.length ? <>
          <div className="pulse-chart" role="img" aria-label={'Grafik mention untuk ' + timeline.length + ' tanggal. Data tersedia pada tabel di bawah.'}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 18, right: 16, left: 0, bottom: 4 }}>
                <defs><linearGradient id="pulse-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#168577" stopOpacity={0.24} /><stop offset="100%" stopColor="#168577" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid stroke="#e7eeeb" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={30} tick={{ fill: '#66766e', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={45} tick={{ fill: '#66766e', fontSize: 11 }} />
                <Tooltip labelFormatter={dateLabel} formatter={value => [formatCount(value), 'Mention']} contentStyle={{ borderRadius: 10, borderColor: '#dce7e0', fontSize: 12 }} />
                <Area type="linear" dataKey="count" stroke="#168577" strokeWidth={2.5} fill="url(#pulse-area-fill)" dot={{ r: 3, fill: '#168577', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="pulse-data-table"><summary>Lihat data timeline</summary><table><thead><tr><th>Tanggal</th><th>Mention</th></tr></thead><tbody>{timeline.map(row => <tr key={row.date}><td>{row.date}</td><td>{formatCount(row.count)}</td></tr>)}</tbody></table></details>
          <p className="pulse-footnote">Tanggal tanpa data tidak diisi dengan estimasi.</p>
        </> : <Empty>Belum ada timeline. Jalankan crawl manual pada topik untuk mengumpulkan sumber.</Empty>}
      </Panel>
      <Panel title="Distribusi platform" note="Jumlah mention, bukan jangkauan audiens">
        {platforms.length ? <div className="pulse-platforms">{platforms.map(row => <div key={row.platform} className="pulse-platform-row"><div><span><PlatformIcon platform={row.platform} size={17} />{platformLabel(row.platform)}</span><strong>{formatCount(row.count)}</strong></div><div className="pulse-bar-track"><span style={{ width: (row.count / maximum * 100) + '%' }} /></div></div>)}</div> : <Empty>Belum ada sumber platform yang terkumpul.</Empty>}
      </Panel>
    </div>
    <SentimentSummary posts={data.posts||[]} onSelect={openSentiment}/>
    </>}
    {view === 'accounts' && <PulseStatGrid label="Ringkasan akun dan sumber"><PulseStat label="Akun / sumber unik" icon={Users} value={allAccounts.length} note="Per platform, termasuk penerbit berita" /><PulseStat label="Posting terkumpul" icon={Radio} value={data.total_mentions} note={`${platforms.length} platform`} /><PulseStat label="Interaksi teramati" icon={Activity} value={totals.engagement?.value ?? null} note={coverage('engagement')} /><PulseStat label="Views teramati" icon={Layers} value={totals.views?.value ?? null} note="Tayangan, bukan audiens unik" /></PulseStatGrid>}
    {['all', 'accounts'].includes(view) && <div className="pulse-detail-grid">
      <Panel title="Top influencers & sumber" note="Ranking dihitung ulang dari posting dalam periode project. Interaksi adalah snapshot terakhir yang tersedia, bukan pertambahan interaksi selama periode.">
        <label className="pulse-narrative-select">Jenis sumber ranking<select value={accountKind} onChange={e=>setAccountKind(e.target.value)}><option value="all">Semua akun & sumber</option><option value="social">Akun media sosial</option><option value="news">Sumber berita</option></select></label>
        <div className="pulse-filters ps-account-search"><label>Cari akun atau platform<input type="search" value={accountQuery} onChange={event => setAccountQuery(event.target.value)} placeholder="Nama akun, Instagram, YouTube…" /></label><span role="status">{accounts.length} dari {allAccounts.length} akun</span>{accountQuery && <PulseButton onClick={() => setAccountQuery('')}>Hapus pencarian</PulseButton>}</div>
        <div className="pulse-ranking-controls pu-tag-group" role="group" aria-label="Urutan ranking"><PulseTag size="lg" tone="accent" pressed={rankBy === 'engagement'} onClick={() => setRankBy('engagement')}>Interaksi tertinggi</PulseTag><PulseTag size="lg" tone="accent" pressed={rankBy === 'mentions'} onClick={() => setRankBy('mentions')}>Posting terbanyak</PulseTag></div>
        {!accountQuery.trim() && accounts.length > 0 && <div className="pulse-leader-strip"><PulseStatGrid label={'Tiga teratas menurut ' + (rankBy === 'mentions' ? 'jumlah posting' : 'interaksi')}>{accounts.slice(0, 3).map((row, i) => <PulseStat key={row.platform + row.author} label={`#${i + 1} · ${platformLabel(row.platform)}`} value={row[rankBy] ?? null} note={<><strong>{row.author || 'Penulis tidak diketahui'}</strong> · {rankBy === 'mentions' ? 'posting' : 'interaksi, snapshot terakhir'}</>} />)}</PulseStatGrid></div>}
        {accounts.length ? <div className="pulse-table-wrap"><table className="pulse-ranking"><thead><tr><th scope="col">Akun / sumber</th><th scope="col">Posting <PulseArrow/></th><th scope="col">Interaksi</th><th scope="col">Porsi posting</th><th scope="col"><span className="sr-only">Bukti</span></th></tr></thead><tbody>{accounts.map((row, index) => <AccountRankingRow key={row.platform + ':' + row.author + ':' + index} row={row} rank={allAccounts.indexOf(row)+1} posts={data.posts||[]} total={data.total_mentions} search={analysisParams.toString()}/>)}</tbody></table></div> : <Empty>{accountQuery ? "Tidak ada akun yang cocok. Ubah atau hapus pencarian." : "Belum ada akun untuk diperingkat. Metrik yang tidak tersedia bukan nol."}</Empty>}
        <p className="pulse-footnote">Porsi posting = jumlah posting akun ÷ seluruh posting project pada periode ini, termasuk posting tanpa nama akun. Penyebut tidak berubah saat pencarian atau jenis sumber disaring. Bukan jangkauan maupun skor pengaruh. “—” berarti metrik tidak tersedia, bukan nol.</p>
      </Panel>
      {view === 'all' && <Panel title="Cakupan geografis" note="Lokasi hanya ditampilkan jika tersedia dari sumber">
        <GeographicView locations={data.locations} unknownCount={data.unknown_location_count} />
      </Panel>}
    </div>}
    {['all', 'network'].includes(view) && <NetworkAnalysis key={'network-' + (data.posts?.[0]?.id || 'empty')} data={data.network} posts={data.posts || []} locations={data.locations||[]} unknownCount={data.unknown_location_count||0} />}
    {['all', 'comments'].includes(view) && <>{responsePanel}<CommentsPanel key={'comments-' + (data.posts?.[0]?.id || 'empty')} posts={data.posts || []} topicId={topic?.id||analysisParams.get('topic')} /></>}
    {['all', 'posts'].includes(view) && <PostFeed key={[analysisParams.get('topic'),sentiment,postAuthor,postPlatform,analysisParams.get('day')].join(':')} posts={data.posts || []} period={period} onPeriodChange={onPeriodChange} topicId={analysisParams.get('topic')||''} initialDay={analysisParams.get('day')||''} initialSentiment={sentiment} initialAuthor={postAuthor} initialPlatform={postPlatform} />}
    {['all', 'infographics'].includes(view) && <div id="pulse-infographics-view"><InfographicsPanel posts={data.posts || []} locations={data.locations || []} unknownCount={data.unknown_location_count} /></div>}
  </>;
}

export default function PulseDashboard({ standalone = false, view = 'all' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicId = searchParams.get('topic') || null;
  const [period,setPeriod]=useProjectPeriod(topicId);
  const [selectedPlatforms,setSelectedPlatforms]=useProjectPlatforms(topicId);
  const platformKey=JSON.stringify(selectedPlatforms);
  const alertId = searchParams.get('alert') || null;
  const [platform, setPlatform] = useState(null);
  const [sort, setSort] = useState('score');
  const [action, setAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');
  const [contentMode, setContentMode] = useState('posts');
  const topics = useTopics();
  const issues = useIssues({ topicId });
  const analytics = usePulseAnalytics(topicId, alertId, standalone?period:{});
  const scopedData=useMemo(()=>analytics.data&&standalone?scopeProjectData(analytics.data,{from:period.from,to:period.to,platforms:JSON.parse(platformKey)}):analytics.data,[analytics.data,standalone,period.from,period.to,platformKey]);
  const availablePlatforms=[...new Set([...projectPlatformOptions,...(analytics.data?.posts||[]).map(p=>p.platform),...(selectedPlatforms||[])])];
  useEffect(() => {
    if (!alertId || !analytics.data) return;
    const frame = requestAnimationFrame(() => document.getElementById('pulse-network')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [alertId, analytics.data]);
  const selected = topics.topics.find(topic => topic.id === topicId);
  const token = standalone ? null : localStorage.getItem('sinar_token');
  const needsLogin = !standalone && (!token || token === 'demo-token');
  const refresh = () => Promise.all([topics.refetch(), issues.refetch(), analytics.refetch()]);
  // Panels that add stored data (for example collected comments) ask for a reload without owning the fetch.
  const refetchAnalytics = analytics.refetch;
  useEffect(() => { const reload = () => refetchAnalytics(); window.addEventListener('pulse-data-changed', reload); return () => window.removeEventListener('pulse-data-changed', reload); }, [refetchAnalytics]);
  const run = async (kind) => {
    if (action || needsLogin) return;
    if (kind === 'crawl' && !window.confirm('Mulai crawl untuk topik ini? Provider yang dikonfigurasi dapat memakai kuota atau biaya.')) return;
    setAction(kind);
    setActionError(null);
    setResult(null);
    setNotice('');
    try {
      if (kind === 'bootstrap') {
        await topics.bootstrap();
        setNotice('Topik GERAK dan Isu Penyadapan Presiden siap. Bootstrap tidak menjalankan crawl.');
      } else {
        const response = await topics.crawlNow(topicId);
        setResult({ ...response, label: selected?.label });
      }
      await refresh();
    } catch (error) { setActionError(error); }
    finally { setAction(null); }
  };
  const filtered = issues.issues.filter(issue => platform === null || platform.some(p => issue.platforms?.includes(p))).sort((a, b) => sort === 'recent' ? new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0) : (b.score || 0) - (a.score || 0));
  const providers = providerResults(result?.providers || result?.provider_statuses);
  const issuePlatforms = [...new Set(issues.issues.flatMap(issue => issue.platforms || []))];
  const selectTopic = id => { setSearchParams(id ? { topic: id } : {}); setPlatform(null); };
  const openAlert = alert => {
    const params = alert.issue_id ? { topic: alert.topic_id, alert: alert.id } : { topic: alert.topic_id };
    if (standalone && alert.issue_id) navigate('/pulse/network?' + new URLSearchParams(params));
    else setSearchParams(params);
    setPlatform(null);
  };
  const titles = { sentiment: 'Sentimen', overview: 'Ikhtisar', monitor: 'Monitor Project', network: 'Jaringan & narasi', accounts: 'Akun & sumber', infographics: 'Infografik', posts: 'Posting', comments: 'Komentar' };
  const descriptions = { sentiment: 'Pahami nada percakapan, perubahan harian, dan posting di baliknya.', overview: 'Ringkasan aktivitas dan cakupan percakapan project.', monitor: 'Pantau alert, jadwal pengambilan, dan kesehatan antrean.', network: 'Telusuri hubungan akun dan kronologi berdasarkan bukti sumber.', accounts: 'Temukan akun penyebar dan bandingkan interaksi dalam sampel.', infographics: 'Jelajahi kata, waktu publikasi, dan cakupan geografis.', posts: 'Periksa konten asli, preview media, dan riwayat metrik.', comments: 'Baca respons publik dari komentar posting yang tersimpan.' };
  titles.reports='Laporan';
  descriptions.reports='Ringkasan eksekutif dan bukti sumber sesuai periode project, siap dicetak sebagai PDF.';
  if (standalone && !topicId) return <div className="pulse-empty"><Database size={28} /><h1>Pilih project untuk mulai memantau</h1><p>Gunakan picker di atas. Setiap project menyimpan satu topik beserta keyword, posting, dan alert-nya.</p></div>;
  if (standalone && !topics.loading && !topics.error && !selected) return <div className="pulse-empty"><h1>Project tidak tersedia</h1><p>Pilih project lain melalui picker di atas.</p></div>;
  return <div className="pulse-dashboard" id="pulse-dashboard" data-view={view}>
    <header className="pulse-header">
      <div className="pulse-brand"><span className="pulse-brand-icon"><Activity size={25} /></span><div><h1>{standalone ? titles[view] || 'Pulse' : 'Pulse'}</h1><p>{standalone ? descriptions[view] : 'Pantau percakapan. Telusuri buktinya.'}</p></div></div>
      <div className="pulse-header-actions"><span className="pulse-data-badge"><ShieldCheck size={14} />Sumber publik</span><PulseButton variant="secondary" className="pulse-button" disabled={!!action || analytics.loading || issues.loading || topics.loading} onClick={refresh}><RefreshCw size={15} />Muat ulang</PulseButton></div>
    </header>
    {standalone && <SentimentProgress key={topicId} topicId={topicId} posts={analytics.loading?undefined:scopedData?.posts} onChange={analytics.refetch} quiet/>}
    {needsLogin && <div className="pulse-auth-note"><ShieldCheck size={21} /><div><strong>Analytics live memerlukan login admin asli.</strong><p>Login demo tidak memberi akses API. Gunakan kredensial admin pada formulir login; data contoh tidak ditampilkan di Pulse.</p></div><Link className="pulse-button primary" to="/login?returnTo=pulse">Masuk dengan akun admin</Link></div>}
    <div className="pulse-layout">
      {!standalone && <div><TopicManager resource={topics} onSelectTopic={selectTopic} selectedTopicId={topicId} disabled={!!action || needsLogin} onChanged={refresh} />
        {!standalone && <div className="pulse-bootstrap"><Database size={20} /><strong>Mulai dari topik awal</strong><p>Siapkan GERAK dan Isu Penyadapan Presiden tanpa duplikasi.</p><PulseButton variant="secondary" className="pulse-button" disabled={!!action || needsLogin || topics.loading} onClick={() => run('bootstrap')}>{action === 'bootstrap' ? 'Menyiapkan…' : 'Siapkan topik awal'}</PulseButton><small>Tidak menjalankan crawl.</small></div>}
      </div>}
      <main className="pulse-main">
        {standalone&&<PageGuide view={view}/>}
        {view === 'posts' && <div className="ps-content-switch" role="group" aria-label="Jenis konten"><PulseButton aria-pressed={contentMode === 'posts'} onClick={()=>setContentMode('posts')}>Posting individual</PulseButton><PulseButton aria-pressed={contentMode === 'issues'} onClick={()=>setContentMode('issues')}>Kelompok percakapan</PulseButton></div>}
        {!standalone && <details className="ps-data-tools"><summary>Pengaturan pengumpulan</summary>
        <div className="pulse-scope"><div><h2>{selected ? selected.label : 'Ikhtisar semua topik'}</h2><p>Pengumpulan mengikuti query project, bukan filter tanggal analisis.</p></div><PulseButton variant="primary" className="pulse-button primary" disabled={!topicId || !!action || needsLogin || topics.loading} onClick={() => run('crawl')}><Download size={15} />{action === 'crawl' ? 'Mengumpulkan sumber…' : 'Crawl manual'}</PulseButton></div>
        <p className="pulse-crawl-hint">{selected ? 'Crawl hanya berjalan setelah konfirmasi Anda. Provider berbayar dapat memakai kuota.' : 'Pilih satu topik untuk menjalankan crawl manual.'}</p>
        <details className="pulse-methodology"><summary>Metodologi & cakupan data</summary><p>Pulse mengamati percakapan publik, bukan memverifikasi klaim dalam konten. Interaksi = likes + komentar + share yang tersedia; views tidak termasuk. Akun dihitung per platform, bukan identitas orang unik. Metrik kosong bukan nol; hubungan mention/kemiripan bukan rantai repost terverifikasi.</p></details>
        {standalone && <Link to={'/pulse/sources?' + new URLSearchParams({ topic: topicId })}>Periksa sumber & cakupan →</Link>}
        </details>}
        {['all', 'monitor'].includes(view) && <MonitorRoom key={topicId || 'all'} topicId={topicId} topics={topics.topics} onOpenAlert={openAlert} disabled={needsLogin} />}
        {alertId && <div className="pm-alert-scope"><strong>Analisis dari alert</strong><p>{analytics.data?.alert?.title || 'Memuat konteks alert…'}</p><p>Grafik, akun, komentar, dan posting di bawah dibatasi ke isu dan rentang publikasi alert. Daftar isu di bagian paling bawah tetap mencakup topik.</p><PulseButton variant="secondary" className="pulse-button" onClick={() => selectTopic(topicId)}>Kembali ke seluruh topik</PulseButton></div>}
        {topics.error && <ErrorNotice standalone={standalone} error={topics.error} retry={topics.refetch} />}
        {actionError && <ErrorNotice standalone={standalone} error={actionError} />}
        {notice && <p className="pulse-notice" role="status">{notice}</p>}
        {action === 'crawl' && <p className="pulse-notice" role="status">Crawl sedang berjalan. Hasil dan status provider akan ditampilkan setelah respons API diterima.</p>}
        {result && <section className="pulse-crawl-result" aria-label="Hasil crawl" role="status"><strong>Respons crawl diterima · {allegationLabel(result.label)}</strong><p>{formatCount(result.ingested)} item diingest. Periksa status tiap provider; respons selesai tidak berarti semua provider berhasil.</p><div className="pulse-provider-list">{providers.map((row, index) => <div key={row.provider || index}><strong>{row.provider || row.source || 'Provider'}</strong><span>{row.status || 'Status tidak tersedia'}</span>{row.ingested != null && <span>{formatCount(row.ingested)} item</span>}<small>{row.reason || row.error || row.message}</small></div>)}</div>{!providers.length && <p>Status provider tidak disertakan oleh API.</p>}</section>}
        {view !== 'monitor' && !(view === 'posts' && contentMode === 'issues') && (analytics.loading ? <div className="pulse-loading" role="status"><Activity size={22} /><span>Memuat analisis…</span></div> : analytics.error ? <ErrorNotice standalone={standalone} error={analytics.error} retry={analytics.refetch} /> : scopedData && <Analytics key={topicId+':'+period.from+':'+period.to+':'+platformKey} data={scopedData} view={view} topic={selected} period={standalone?period:null} onPeriodChange={standalone?setPeriod:null} selectedPlatforms={standalone?selectedPlatforms:null} onPlatformsChange={setSelectedPlatforms} availablePlatforms={availablePlatforms} />)}
        {standalone && view === 'posts' && contentMode === 'issues' && (analytics.loading ? <p className="pulse-loading" role="status">Memuat kelompok sesuai filter…</p> : analytics.error ? <ErrorNotice standalone error={analytics.error} retry={analytics.refetch}/> : scopedData && <ConversationGroups key={topicId+':'+period.from+':'+period.to+':'+platformKey} posts={scopedData.posts||[]} period={period} platforms={selectedPlatforms}/>)}
        {!standalone && (view === 'all' || (view === 'posts' && contentMode === 'issues')) && <section className="pulse-issues">
          <div className="pulse-issues-heading"><div><h2>Kelompok percakapan</h2><p>Dikelompokkan berdasarkan kemiripan teks, bukan hubungan antar akun. Maksimal 50 kelompok; cakupan seluruh data project, tidak mengikuti rentang tanggal posting. Buka kelompok untuk melihat metode dan sumber.</p></div><span>{issues.loading || issues.error ? '—' : filtered.length} kelompok ditampilkan</span></div>
          <div className="pulse-filters"><PlatformCheckboxes platforms={issuePlatforms} value={platform} onChange={setPlatform} /><label>Urutkan<select value={sort} onChange={e => setSort(e.target.value)}><option value="score">Skor isu</option><option value="recent">Terbaru</option></select></label><span>Filter ini hanya berlaku untuk daftar isu.</span></div>
          {issues.loading ? <p className="pulse-loading" role="status">Memuat isu…</p> : issues.error ? <ErrorNotice standalone={standalone} error={issues.error} retry={issues.refetch} /> : filtered.length ? <div className="pulse-issue-list">{filtered.map(issue => <IssueCard key={issue.id + ':' + issue.last_seen_at + ':' + issue.item_count} issue={issue} platformFilter={platform ?? "all"} dateMode="absolute" />)}</div> : <Empty>{issues.issues.length ? 'Tidak ada isu yang cocok dengan filter platform.' : 'Belum ada isu tersimpan. Siapkan topik lalu jalankan crawl manual.'}</Empty>}
        </section>}
        {standalone && view === 'overview' && <AnalysisNavigation />}
        <footer className="pulse-footer"><ShieldCheck size={14} />Sampel percakapan publik · bukan keseluruhan aktivitas media sosial</footer>
      </main>
    </div>
  </div>;
}
