import { PulseButton } from '../../ui/PulseUI';
import { PulseCard, PulseFilterBar, PulseFilterSelect } from '../../ui/PulseSurface';
import { PulseTag } from '../../ui/PulseTag';
import { PulseStat, PulseStatGrid, PulseBreakdown } from '../../ui/PulseAnalytics';
import { PlatformLabel, PlatformIcon } from "./PlatformIcon";
import { platformColor } from '../../../lib/pulseChartTheme';
import React, { useState, lazy, Suspense } from 'react';
import { GitBranch, Clock, ScanSearch, MapPinned } from 'lucide-react';
import { PulseSkeleton } from '../../ui/PulsePatterns';
import InfoTip from '../../../pulse/InfoTip';

const assessments={insufficient_data:['unknown','Data belum cukup'],review_signals:['warning','Perlu ditinjau']};
import NetworkExplorer from './NetworkExplorer';
import AccountAvatar from './AccountAvatar';
import { PulseMetricRow } from '../../ui/PulseMetricRow';
import AccountSignal, { PatternTag } from './AccountSignal';
import { formatCount, safeSourceUrl, pulseDate } from '../../../lib/pulseData';
import { focusFromSearch } from '../../../lib/pulseDrilldown';
import { accountName, postAccount } from '../../../lib/pulseMeasures';

// The map brings the province outlines with it, so it is fetched only when its view is opened.
const RegionSpreadMap = lazy(() => import('../../../pulse/RegionSpreadMap'));

/** The distinct accounts (account_v1) of one group of similar posts, in order of appearance, each under its latest
 * name. A timeline entry carries no metrics, so its key is read from the full post with the same id. */
function repeatedAccounts(row, byId) {
  const seen = new Map();
  for (const post of row.timeline || []) {
    const key = postAccount(byId.get(String(post.id)) ?? post);
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, { key, platform: post.platform, rows: [] });
    seen.get(key).rows.push(post);
  }
  return [...seen.values()].map(({ rows, ...face }) => ({ ...face, author: accountName(rows) }));
}

function Evidence({ rows = [] }) {
  return <ul className="pulse-evidence-list">{rows.map((p, index) => <li key={p.id + ':' + index}><strong className="pu-account-line"><AccountAvatar size="xs" author={p.author} platform={p.platform} />{p.author || 'Tanpa akun'}</strong><time>{pulseDate(p.published_at)}</time>{safeSourceUrl(p.url) ? <a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer">{p.title || 'Buka posting sumber'}</a> : <span>{p.title}</span>}</li>)}</ul>;
}

/** The two answers people open this page for, before any map: who sits at the centre, and what is being repeated. */
function NetworkInsights({ data, posts, onOpenNarrative }) {
  const byId = new Map((posts || []).map(post => [String(post.id), post]));
  const hubs = [...data.nodes].filter(node => node.connections > 0).sort((a, b) => b.connections - a.connections || b.posts - a.posts).slice(0, 6);
  const kinds = data.edges.reduce((tally, edge) => { tally[edge.kind] = (tally[edge.kind] || 0) + 1; return tally; }, {});
  const mentions = kinds.mention || 0, similar = kinds.similarity || 0, links = mentions + similar;
  const repeated = [...data.narratives].sort((a, b) => b.account_count - a.account_count || b.post_count - a.post_count).slice(0, 5);
  return <div className="lay-grid pn-insights">
    <div className="lay-6"><PulseCard className="pulse-panel pn-card" aria-label="Akun paling terhubung" padding="none" level={2} title={<>Akun paling terhubung</>}>
      {hubs.length ? <PulseBreakdown scale="max" rows={hubs.map(node => ({ key: node.id, label: node.label, value: node.connections, color: platformColor(node.platform), leading: <AccountAvatar size="sm" author={node.label} platform={node.platform} /> }))} total={links || undefined} /> : <p className="pulse-analysis-note">Belum ada hubungan antar akun pada sampel ini.</p>}
      {links > 0 && <div className="pn-mix"><div className="sig-bar" role="img" aria-label={`${mentions} hubungan menyebut akun, ${similar} hubungan konten serupa`}>{mentions > 0 && <span style={{ flexGrow: mentions, background: 'var(--ps-chart-1)' }} />}{similar > 0 && <span style={{ flexGrow: similar, background: 'var(--ps-chart-3)' }} />}</div><ul><li><i style={{ background: 'var(--ps-chart-1)' }} /><strong>{formatCount(mentions)}</strong> menyebut akun</li><li><i style={{ background: 'var(--ps-chart-3)' }} /><strong>{formatCount(similar)}</strong> konten serupa</li></ul></div>}
    </PulseCard></div>
    <div className="lay-6"><PulseCard className="pulse-panel pn-card" aria-label="Konten yang paling banyak diulang" padding="none" level={2} title={<>Konten yang paling banyak diulang<InfoTip label="Tentang konten berulang">Teks serupa di beberapa akun. Bukan bukti koordinasi.</InfoTip></>}>
      {repeated.length ? <ol className="pn-repeated">{repeated.map(row => { const faces = repeatedAccounts(row, byId); return <li key={row.id}>
        <button type="button" className="pn-repeated-text" onClick={() => onOpenNarrative(row.id)} aria-label={`${row.account_count} akun mengulang: ${(row.title || '').slice(0, 80)}. Lihat urutannya.`}>{(row.title || 'Tanpa teks').slice(0, 110)}</button>
        <div className="pn-repeated-facts">
          <span className="pn-repeated-who"><span className="pn-faces" aria-hidden="true">{faces.slice(0, 5).map(face => <AccountAvatar key={face.key} size="xs" author={face.author} platform={face.platform} />)}</span><b>{formatCount(row.account_count)} akun</b><span>· {formatCount(row.post_count)} posting</span></span>
          <PulseMetricRow hideEmpty metrics={row.metrics} label={`Interaksi gabungan ${formatCount(row.post_count)} posting dalam kelompok ini`} />
        </div>
      </li>; })}</ol> : <p className="pulse-analysis-note">Belum ada kelompok serupa.</p>}
    </PulseCard></div>
  </div>;
}

export default function NetworkAnalysis({ data, posts }) {
  const [narrativeId, setNarrativeId] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [section,setSection]=useState(()=>focusFromSearch(typeof window==='undefined'?'':window.location.search));
  const [accountSearch,setAccountSearch]=useState('');
  const [accountLimit,setAccountLimit]=useState(20);
  if (!data) return null;
  const narrative = data.narratives.find(n => n.id === narrativeId) || data.narratives[0];
  const flagged = data.accounts.filter(a => a.signals.length).length;
  const patterned = data.accounts.filter(a => a.pattern).length;
  const accounts = data.accounts.filter(a => (accountFilter === 'all' || (accountFilter === 'pattern' ? a.pattern : a.signals.length)) && `${a.label} ${a.platform}`.toLowerCase().includes(accountSearch.trim().toLowerCase()));
  // The figures below are counted over the sample the server analysed, not every post on the page above.
  const analysed = data.analyzed_posts, all = data.total_posts;
  const basis = analysed == null || all == null ? null : analysed < all
    ? `${formatCount(analysed)} dari ${formatCount(all)} posting dianalisis`
    : null;
  return <section id="pulse-network" className="pulse-network-analysis" aria-label="Analisis penyebaran narasi">
    <header className="pn-section-head"><h2>Hubungan antar akun</h2>{basis && <p>{basis}</p>}</header>
    <PulseStatGrid label="Ringkasan analisis jaringan"><PulseStat label="Posting dianalisis" value={data.analyzed_posts ?? null} share={data.total_posts && data.analyzed_posts != null ? data.analyzed_posts / data.total_posts * 100 : null} shareLabel={`dari ${formatCount(data.total_posts)} posting`}/><PulseStat label="Akun teramati" value={data.accounts.length}/><PulseStat label="Kelompok konten serupa" value={data.narratives.length} note="Lintas akun"/><PulseStat label="Akun dengan sinyal" value={flagged} share={data.accounts.length ? flagged / data.accounts.length * 100 : null} shareLabel="dari akun teramati" note={patterned ? `${formatCount(patterned)} berpola mirip buzzer` : 'Perlu ditinjau'} onClick={() => { setSection('signals'); setAccountFilter(patterned ? 'pattern' : 'signals'); }}/></PulseStatGrid>
    <NetworkInsights data={data} posts={posts} onOpenNarrative={id => { setNarrativeId(id); setSection('origins'); }} />
    <div className="ps-network-switch pu-tag-group" role="group" aria-label="Fokus analisis"><PulseTag size="lg" tone="accent" icon={GitBranch} pressed={section==='network'} onClick={()=>setSection('network')}>Hubungan akun</PulseTag><PulseTag size="lg" tone="accent" icon={Clock} pressed={section==='origins'} onClick={()=>setSection('origins')}>Awal & konten serupa</PulseTag><PulseTag size="lg" tone="accent" icon={ScanSearch} pressed={section==='signals'} onClick={()=>setSection('signals')}>Sinyal akun</PulseTag><PulseTag size="lg" tone="accent" icon={MapPinned} pressed={section==='map'} onClick={()=>setSection('map')}>Peta sebaran</PulseTag></div>
    {section==='map'&&<Suspense fallback={<PulseSkeleton label="Memuat peta sebaran…" stats={0} panels={1} rows={0} />}><RegionSpreadMap posts={posts} initialLayer={new URLSearchParams(typeof window==='undefined'?'':window.location.search).get('layer')==='accounts'?'accounts':undefined} /></Suspense>}
    {section==='network'&&<NetworkExplorer data={data} posts={posts} />}
    {section==='origins'&&<div className="pulse-narrative-grid">
      <PulseCard className="pulse-panel" padding="none" level={2} title={<><Clock size={18} /> Awal yang teramati</>}><Evidence rows={data.earliest} /></PulseCard>
      <PulseCard className="pulse-panel" padding="none" level={2} title={<>Pengulangan & amplifikasi potensial</>}>
        {narrative ? <><label className="pulse-narrative-select">Pilih kelompok narasi<select aria-label="Kelompok narasi" value={narrative.id} onChange={e => setNarrativeId(e.target.value)}>{data.narratives.map(n => <option key={n.id} value={n.id}>{n.account_count} akun · {(n.title || '').slice(0, 85)}</option>)}</select></label><div className="pulse-narrative-strip"><PulseStatGrid label="Ukuran kelompok narasi"><PulseStat label="Posting" value={narrative.post_count ?? null}/><PulseStat label="Akun" value={narrative.account_count ?? null}/><PulseStat label="Akun muncul kemudian" value={narrative.later_accounts ?? null}/></PulseStatGrid></div><p className="pulse-analysis-note">Paling awal: {narrative.first_observed?.author || 'waktu tidak tersedia'} · {pulseDate(narrative.first_observed?.published_at)}{narrative.tied_first_count > 1 ? ` · ${narrative.tied_first_count} posting berbagi waktu paling awal` : ''}</p><Evidence rows={narrative.timeline} /></> : <p className="pulse-empty">Belum ada kelompok serupa.</p>}
      </PulseCard>
    </div>}
    {section==='signals'&&<PulseCard className="pulse-panel pulse-account-signals" padding="none" level={2} title={<><ScanSearch size={18} /> Akun yang perlu ditinjau<InfoTip label="Tentang sinyal akun">Satu pola berarti “perlu ditinjau”; dua atau lebih diberi tanda “Pola mirip buzzer”. Bukan penetapan bot, identitas, atau bayaran.</InfoTip></>}>
      <label className="ps-signal-search">Cari nama akun<input type="search" value={accountSearch} onChange={e=>{setAccountSearch(e.target.value);setAccountLimit(20)}} placeholder="Contoh: Kompas"/></label>
      <PulseFilterBar label="Filter sinyal akun"><PulseFilterSelect label="Tampilkan akun" value={accountFilter} onChange={value => {setAccountFilter(value);setAccountLimit(20)}} options={[{value:'all',label:`Semua akun (${data.accounts.length})`},{value:'signals',label:`Dengan sinyal (${flagged})`},{value:'pattern',label:`Pola mirip buzzer (${patterned})`}]} /></PulseFilterBar><div className="pulse-signals-list">{accounts.slice(0,accountLimit).map(a => <details key={a.id}><summary><AccountAvatar size="sm" author={a.label} platform={a.platform} /><strong>{a.label}</strong>{a.pattern ? <PatternTag signals={a.signals} /> : a.signals.length > 0 && <AccountSignal kind="automation" compact />}<span><PlatformLabel platform={a.platform} /> · {a.posts} posting</span><PulseTag tone={(assessments[a.assessment]||['neutral'])[0]} dot={a.assessment==='review_signals'}>{(assessments[a.assessment]||[0,'Sinyal tidak teramati'])[1]}</PulseTag></summary>{a.signals.map(s => <p key={s.kind}>{s.detail}</p>)}{!a.signals.length && <p>Tidak ada sinyal pada sampel ini.</p>}<Evidence rows={a.evidence} /></details>)}{!accounts.length && <p className="pulse-analysis-note">Tidak ada akun yang cocok dengan filter.</p>}</div>
      <div className="pulse-pagination"><span role="status">{Math.min(accountLimit,accounts.length)} dari {accounts.length} akun cocok</span>{accounts.length>accountLimit&&<PulseButton onClick={()=>setAccountLimit(accountLimit+20)}>Tampilkan 20 akun berikutnya</PulseButton>}</div>
    </PulseCard>}
  </section>;
}
