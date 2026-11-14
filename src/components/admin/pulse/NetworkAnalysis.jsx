import { PulseButton } from '../../ui/PulseUI';
import { PulseTag } from '../../ui/PulseTag';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';
import { PlatformLabel } from "./PlatformIcon";
import React, { useState } from 'react';
import { GitBranch, Clock, ScanSearch } from 'lucide-react';

const assessments={insufficient_data:['unknown','Data belum cukup'],review_signals:['warning','Perlu ditinjau']};
import NetworkExplorer from './NetworkExplorer';
import AccountSignal from './AccountSignal';
import { formatCount, safeSourceUrl, pulseDate } from '../../../lib/pulseData';

function Evidence({ rows = [] }) {
  return <ul className="pulse-evidence-list">{rows.map((p, index) => <li key={p.id + ':' + index}><strong>{p.author || 'Tanpa akun'} <small><PlatformLabel platform={p.platform} /></small></strong><time>{pulseDate(p.published_at)}</time>{safeSourceUrl(p.url) ? <a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer">{p.title || 'Buka posting sumber'}</a> : <span>{p.title}</span>}</li>)}</ul>;
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
  const accounts = data.accounts.filter(a => (accountFilter === 'all' || a.signals.length) && `${a.label} ${a.platform}`.toLowerCase().includes(accountSearch.trim().toLowerCase()));
  return <section id="pulse-network" className="pulse-network-analysis" aria-label="Analisis penyebaran narasi">
    <PulseStatGrid label="Ringkasan analisis jaringan"><PulseStat label="Posting dianalisis" value={data.analyzed_posts ?? null} note={`dari ${formatCount(data.total_posts)} posting dalam sampel`}/><PulseStat label="Akun teramati" value={data.accounts.length}/><PulseStat label="Kelompok konten serupa" value={data.narratives.length} note="Lintas akun, bukan bukti koordinasi"/><PulseStat label="Akun dengan sinyal" value={flagged} note="Perlu ditinjau, bukan penetapan bot"/></PulseStatGrid>
    <div className="ps-network-switch pu-tag-group" role="group" aria-label="Fokus analisis"><PulseTag size="lg" tone="accent" icon={GitBranch} pressed={section==='network'} onClick={()=>setSection('network')}>Hubungan akun</PulseTag><PulseTag size="lg" tone="accent" icon={Clock} pressed={section==='origins'} onClick={()=>setSection('origins')}>Awal & konten serupa</PulseTag><PulseTag size="lg" tone="accent" icon={ScanSearch} pressed={section==='signals'} onClick={()=>setSection('signals')}>Sinyal akun</PulseTag></div>
    <p className="ps-network-scope">Hubungan akun bukan lokasi geografis atau bukti koordinasi.</p>
    {section==='network'&&<NetworkExplorer data={data} posts={posts} />}
    {section==='origins'&&<div className="pulse-narrative-grid">
      <section className="pulse-panel"><div className="pulse-panel-heading"><div><h2><Clock size={18} /> Awal yang teramati</h2><p>10 posting bertanggal paling awal dalam sampel, bukan pencetus asli.</p></div></div><Evidence rows={data.earliest} /></section>
      <section className="pulse-panel"><div className="pulse-panel-heading"><div><h2>Pengulangan & amplifikasi potensial</h2><p>{data.narratives.length} kelompok konten serupa lintas akun.</p></div></div>
        {narrative ? <><label className="pulse-narrative-select">Pilih kelompok narasi<select aria-label="Kelompok narasi" value={narrative.id} onChange={e => setNarrativeId(e.target.value)}>{data.narratives.map(n => <option key={n.id} value={n.id}>{n.account_count} akun · {(n.title || '').slice(0, 85)}</option>)}</select></label><div className="pulse-narrative-strip"><PulseStatGrid label="Ukuran kelompok narasi"><PulseStat label="Posting" value={narrative.post_count ?? null}/><PulseStat label="Akun" value={narrative.account_count ?? null}/><PulseStat label="Akun muncul kemudian" value={narrative.later_accounts ?? null}/></PulseStatGrid></div><p className="pulse-analysis-note">Paling awal: {narrative.first_observed?.author || 'waktu tidak tersedia'} · {pulseDate(narrative.first_observed?.published_at)}{narrative.tied_first_count > 1 ? ` · ${narrative.tied_first_count} posting berbagi waktu paling awal` : ''}. Urutan ini tidak membuktikan siapa menyalin siapa.</p><Evidence rows={narrative.timeline} /></> : <p className="pulse-empty">Belum ada kelompok yang memenuhi ambang kemiripan lintas akun.</p>}
      </section>
    </div>}
    {section==='signals'&&<section className="pulse-panel pulse-account-signals"><div className="pulse-panel-heading"><div><h2><ScanSearch size={18} /> Akun yang perlu ditinjau</h2><p>Pola aktivitas dalam sampel, bukan kepastian bahwa akun adalah bot.</p></div></div><details className="pulse-analysis-note"><summary>Bagaimana sinyal dihitung?</summary><p>Sinyal: ≥3 teks identik setelah normalisasi, atau ≥5 posting dalam 10 menit. Akun dengan &lt;5 posting tetap “data belum cukup”. Aktivitas media, penjadwalan sah, dan manusia juga dapat memicu sinyal. Tidak ada inferensi identitas asli, afiliasi, maupun persentase bot.</p></details>
      <label className="ps-signal-search">Cari nama akun<input type="search" value={accountSearch} onChange={e=>{setAccountSearch(e.target.value);setAccountLimit(20)}} placeholder="Contoh: Kompas"/></label>
      <div className="pulse-filters"><label>Tampilkan akun<select aria-label="Filter sinyal akun" value={accountFilter} onChange={e => {setAccountFilter(e.target.value);setAccountLimit(20)}}><option value="all">Semua akun ({data.accounts.length})</option><option value="signals">Dengan sinyal ({flagged})</option></select></label></div><div className="pulse-signals-list">{accounts.slice(0,accountLimit).map(a => <details key={a.id}><summary><strong>{a.label}</strong>{a.signals.length > 0 && <AccountSignal kind="automation" compact />}<span><PlatformLabel platform={a.platform} /> · {a.posts} posting</span><PulseTag tone={(assessments[a.assessment]||['neutral'])[0]} dot={a.assessment==='review_signals'}>{(assessments[a.assessment]||[0,'Sinyal tidak teramati'])[1]}</PulseTag></summary>{a.signals.map(s => <p key={s.kind}>{s.detail}</p>)}{!a.signals.length && <p>Tidak ada sinyal yang memenuhi ambang pada sampel ini; bukan bukti akun manusia/asli.</p>}<Evidence rows={a.evidence} /></details>)}{!accounts.length && <p className="pulse-analysis-note">Tidak ada akun yang cocok dengan filter.</p>}</div>
      <div className="pulse-pagination"><span role="status">{Math.min(accountLimit,accounts.length)} dari {accounts.length} akun cocok</span>{accounts.length>accountLimit&&<PulseButton onClick={()=>setAccountLimit(accountLimit+20)}>Tampilkan 20 akun berikutnya</PulseButton>}</div>
    </section>}
  </section>;
}
