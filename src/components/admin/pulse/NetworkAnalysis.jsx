import { PulseButton } from '../../ui/PulseUI';
import { PulseTag } from '../../ui/PulseTag';
import { PulseStat, PulseStatGrid, PulseBreakdown } from '../../ui/PulseAnalytics';
import { PlatformLabel, PlatformIcon } from "./PlatformIcon";
import { platformColor } from '../../../lib/pulseChartTheme';
import React, { useState } from 'react';
import { GitBranch, Clock, ScanSearch } from 'lucide-react';

const assessments={insufficient_data:['unknown','Data belum cukup'],review_signals:['warning','Perlu ditinjau']};
import NetworkExplorer from './NetworkExplorer';
import AccountAvatar from './AccountAvatar';
import AccountSignal, { PatternTag } from './AccountSignal';
import { formatCount, safeSourceUrl, pulseDate } from '../../../lib/pulseData';

function Evidence({ rows = [] }) {
  return <ul className="pulse-evidence-list">{rows.map((p, index) => <li key={p.id + ':' + index}><strong className="pu-account-line"><AccountAvatar size="xs" author={p.author} platform={p.platform} />{p.author || 'Tanpa akun'}</strong><time>{pulseDate(p.published_at)}</time>{safeSourceUrl(p.url) ? <a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer">{p.title || 'Buka posting sumber'}</a> : <span>{p.title}</span>}</li>)}</ul>;
}

/** The two answers people open this page for, before any map: who sits at the centre, and what is being repeated. */
function NetworkInsights({ data, onOpenNarrative }) {
  const hubs = [...data.nodes].filter(node => node.connections > 0).sort((a, b) => b.connections - a.connections || b.posts - a.posts).slice(0, 6);
  const kinds = data.edges.reduce((tally, edge) => { tally[edge.kind] = (tally[edge.kind] || 0) + 1; return tally; }, {});
  const mentions = kinds.mention || 0, similar = kinds.similarity || 0, links = mentions + similar;
  const repeated = [...data.narratives].sort((a, b) => b.account_count - a.account_count || b.post_count - a.post_count).slice(0, 5);
  const most = Math.max(1, ...repeated.map(row => row.account_count));
  return <div className="lay-grid pn-insights">
    <div className="lay-6"><section className="pulse-panel pn-card" aria-label="Akun paling terhubung"><div className="pulse-panel-heading"><div><h2>Akun paling terhubung</h2><p>Paling banyak disebut atau berbagi konten serupa dengan akun lain.</p></div></div>
      {hubs.length ? <PulseBreakdown scale="max" rows={hubs.map(node => ({ key: node.id, label: node.label, value: node.connections, color: platformColor(node.platform), leading: <AccountAvatar size="sm" author={node.label} platform={node.platform} /> }))} total={links || undefined} /> : <p className="pulse-analysis-note">Belum ada hubungan antar akun pada sampel ini.</p>}
      {links > 0 && <div className="pn-mix"><div className="sig-bar" role="img" aria-label={`${mentions} hubungan menyebut akun, ${similar} hubungan konten serupa`}>{mentions > 0 && <span style={{ flexGrow: mentions, background: 'var(--ps-chart-1)' }} />}{similar > 0 && <span style={{ flexGrow: similar, background: 'var(--ps-chart-3)' }} />}</div><ul><li><i style={{ background: 'var(--ps-chart-1)' }} /><strong>{formatCount(mentions)}</strong> menyebut akun</li><li><i style={{ background: 'var(--ps-chart-3)' }} /><strong>{formatCount(similar)}</strong> konten serupa</li></ul></div>}
    </section></div>
    <div className="lay-6"><section className="pulse-panel pn-card" aria-label="Konten yang paling banyak diulang"><div className="pulse-panel-heading"><div><h2>Konten yang paling banyak diulang</h2><p>Teks serupa yang muncul di beberapa akun. Bukan bukti koordinasi.</p></div></div>
      {repeated.length ? <ol className="pn-repeated">{repeated.map(row => <li key={row.id}><button type="button" onClick={() => onOpenNarrative(row.id)} aria-label={`${row.account_count} akun mengulang: ${(row.title || '').slice(0, 80)}. Lihat urutannya.`}><span className="pn-repeated-text">{(row.title || 'Tanpa teks').slice(0, 110)}</span><b>{formatCount(row.account_count)} akun</b><i style={{ width: `${row.account_count / most * 100}%` }} /></button></li>)}</ol> : <p className="pulse-analysis-note">Belum ada kelompok yang memenuhi ambang kemiripan lintas akun.</p>}
    </section></div>
  </div>;
}

export default function NetworkAnalysis({ data, posts }) {
  const [narrativeId, setNarrativeId] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [section,setSection]=useState('network');
  const [accountSearch,setAccountSearch]=useState('');
  const [accountLimit,setAccountLimit]=useState(20);
  if (!data) return null;
  const narrative = data.narratives.find(n => n.id === narrativeId) || data.narratives[0];
  const flagged = data.accounts.filter(a => a.signals.length).length;
  const patterned = data.accounts.filter(a => a.pattern).length;
  const accounts = data.accounts.filter(a => (accountFilter === 'all' || (accountFilter === 'pattern' ? a.pattern : a.signals.length)) && `${a.label} ${a.platform}`.toLowerCase().includes(accountSearch.trim().toLowerCase()));
  return <section id="pulse-network" className="pulse-network-analysis" aria-label="Analisis penyebaran narasi">
    <PulseStatGrid label="Ringkasan analisis jaringan"><PulseStat label="Posting dianalisis" value={data.analyzed_posts ?? null} share={data.total_posts && data.analyzed_posts != null ? data.analyzed_posts / data.total_posts * 100 : null} shareLabel={`dari ${formatCount(data.total_posts)} posting`}/><PulseStat label="Akun teramati" value={data.accounts.length}/><PulseStat label="Kelompok konten serupa" value={data.narratives.length} note="Lintas akun, bukan bukti koordinasi"/><PulseStat label="Akun dengan sinyal" value={flagged} share={data.accounts.length ? flagged / data.accounts.length * 100 : null} shareLabel="dari akun teramati" note={patterned ? `${formatCount(patterned)} berpola mirip buzzer` : 'Perlu ditinjau, bukan penetapan bot'} onClick={() => { setSection('signals'); setAccountFilter(patterned ? 'pattern' : 'signals'); }}/></PulseStatGrid>
    <NetworkInsights data={data} onOpenNarrative={id => { setNarrativeId(id); setSection('origins'); }} />
    <div className="ps-network-switch pu-tag-group" role="group" aria-label="Fokus analisis"><PulseTag size="lg" tone="accent" icon={GitBranch} pressed={section==='network'} onClick={()=>setSection('network')}>Hubungan akun</PulseTag><PulseTag size="lg" tone="accent" icon={Clock} pressed={section==='origins'} onClick={()=>setSection('origins')}>Awal & konten serupa</PulseTag><PulseTag size="lg" tone="accent" icon={ScanSearch} pressed={section==='signals'} onClick={()=>setSection('signals')}>Sinyal akun</PulseTag></div>
    <p className="ps-network-scope">Hubungan akun bukan lokasi geografis atau bukti koordinasi.</p>
    {section==='network'&&<NetworkExplorer data={data} posts={posts} />}
    {section==='origins'&&<div className="pulse-narrative-grid">
      <section className="pulse-panel"><div className="pulse-panel-heading"><div><h2><Clock size={18} /> Awal yang teramati</h2><p>10 posting bertanggal paling awal dalam sampel, bukan pencetus asli.</p></div></div><Evidence rows={data.earliest} /></section>
      <section className="pulse-panel"><div className="pulse-panel-heading"><div><h2>Pengulangan & amplifikasi potensial</h2><p>{data.narratives.length} kelompok konten serupa lintas akun.</p></div></div>
        {narrative ? <><label className="pulse-narrative-select">Pilih kelompok narasi<select aria-label="Kelompok narasi" value={narrative.id} onChange={e => setNarrativeId(e.target.value)}>{data.narratives.map(n => <option key={n.id} value={n.id}>{n.account_count} akun · {(n.title || '').slice(0, 85)}</option>)}</select></label><div className="pulse-narrative-strip"><PulseStatGrid label="Ukuran kelompok narasi"><PulseStat label="Posting" value={narrative.post_count ?? null}/><PulseStat label="Akun" value={narrative.account_count ?? null}/><PulseStat label="Akun muncul kemudian" value={narrative.later_accounts ?? null}/></PulseStatGrid></div><p className="pulse-analysis-note">Paling awal: {narrative.first_observed?.author || 'waktu tidak tersedia'} · {pulseDate(narrative.first_observed?.published_at)}{narrative.tied_first_count > 1 ? ` · ${narrative.tied_first_count} posting berbagi waktu paling awal` : ''}. Urutan ini tidak membuktikan siapa menyalin siapa.</p><Evidence rows={narrative.timeline} /></> : <p className="pulse-empty">Belum ada kelompok yang memenuhi ambang kemiripan lintas akun.</p>}
      </section>
    </div>}
    {section==='signals'&&<section className="pulse-panel pulse-account-signals"><div className="pulse-panel-heading"><div><h2><ScanSearch size={18} /> Akun yang perlu ditinjau</h2><p>Pola aktivitas dalam sampel, bukan kepastian bahwa akun adalah bot.</p></div></div><details className="pulse-analysis-note"><summary>Bagaimana sinyal dihitung?</summary><p>Tiga pola dipantau: tiga atau lebih teks identik dari akun yang sama, lima atau lebih posting dalam 10 menit, dan teks yang serupa dengan akun lain di dua atau lebih kelompok konten. Satu pola berarti “perlu ditinjau”. Dua pola atau lebih diberi tanda “Pola mirip buzzer”. Media, admin akun resmi, dan penjadwalan yang sah juga bisa memicu pola ini; tanda ini tidak menyimpulkan identitas, bayaran, atau otomatisasi, dan PULSE tidak menilai apakah teks ditulis AI.</p></details>
      <label className="ps-signal-search">Cari nama akun<input type="search" value={accountSearch} onChange={e=>{setAccountSearch(e.target.value);setAccountLimit(20)}} placeholder="Contoh: Kompas"/></label>
      <div className="pulse-filters"><label>Tampilkan akun<select aria-label="Filter sinyal akun" value={accountFilter} onChange={e => {setAccountFilter(e.target.value);setAccountLimit(20)}}><option value="all">Semua akun ({data.accounts.length})</option><option value="signals">Dengan sinyal ({flagged})</option><option value="pattern">Pola mirip buzzer ({patterned})</option></select></label></div><div className="pulse-signals-list">{accounts.slice(0,accountLimit).map(a => <details key={a.id}><summary><AccountAvatar size="sm" author={a.label} platform={a.platform} /><strong>{a.label}</strong>{a.pattern ? <PatternTag signals={a.signals} /> : a.signals.length > 0 && <AccountSignal kind="automation" compact />}<span><PlatformLabel platform={a.platform} /> · {a.posts} posting</span><PulseTag tone={(assessments[a.assessment]||['neutral'])[0]} dot={a.assessment==='review_signals'}>{(assessments[a.assessment]||[0,'Sinyal tidak teramati'])[1]}</PulseTag></summary>{a.signals.map(s => <p key={s.kind}>{s.detail}</p>)}{!a.signals.length && <p>Tidak ada sinyal yang memenuhi ambang pada sampel ini; bukan bukti akun manusia/asli.</p>}<Evidence rows={a.evidence} /></details>)}{!accounts.length && <p className="pulse-analysis-note">Tidak ada akun yang cocok dengan filter.</p>}</div>
      <div className="pulse-pagination"><span role="status">{Math.min(accountLimit,accounts.length)} dari {accounts.length} akun cocok</span>{accounts.length>accountLimit&&<PulseButton onClick={()=>setAccountLimit(accountLimit+20)}>Tampilkan 20 akun berikutnya</PulseButton>}</div>
    </section>}
  </section>;
}
