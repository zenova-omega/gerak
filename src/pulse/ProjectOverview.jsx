import useHideUnknown from './useHideUnknown';
import { UnanalysedToggle } from './UnanalysedToggle';
import AiSummaryCard from './AiSummaryCard';
import { PulseArrow } from '../components/ui/PulseArrow';
import {EvidenceSheet} from './EvidencePosts';
import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import TrendChart from './TrendChart';
import PlatformPie from './PlatformPie';
import {bucketLabel,bucketPosts} from '../lib/pulseTrendSeries';
import {overviewEvidence,previousPeriod,reviewEvidence} from '../lib/pulseOverview';
import {sentimentDate} from '../lib/pulseSentiment';
import {formatCount,pulseDate} from '../lib/pulseData';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import useOverviewEvidence from './useOverviewEvidence';
import InfoTip from './InfoTip';
import './overview-analytics.css';
import './project-overview.css';
import TopMentions from './TopMentions';
import {Activity,Copy,MessagesSquare,Users,HeartPulse,Gauge} from 'lucide-react';
import {PulseStat,PulseStatGrid} from '../components/ui/PulseAnalytics';
import {recentChange,deltaIntent} from '../lib/pulseTrend';
import {netSentiment,netSentimentChange,accountConcentration} from '../lib/pulseInsightMetrics';
import {percentLabel} from '../lib/pulseEngagement';
import {sharePercent} from '../lib/pulseChartTheme';

/** Where each detail now lives: the overview answers "what is happening", the pages below answer "show me more". */
const detailPages=[['sentiment','Sentimen','Nada, platform, dan posting di balik angka'],['network','Jaringan','Narasi utama, penyebaran, kata, dan waktu terbit'],['accounts','Akun & sumber','Siapa yang bicara dan seberapa terpusat'],['posts','Posting','Semua posting, disaring dan diurutkan']];

export default function ProjectOverview({data,topic={},period={},platforms=null}){
 const [params]=useSearchParams();
 const [selection,setSelection]=useState(null);
 const extra=useOverviewEvidence(topic.id||params.get('topic'),period,data);
 const reviews=extra.reviews?.reviews||[];
 
 const r=overviewEvidence(data.posts||[],{platforms,previousPosts:extra.previousPosts??null});
 const total=r.posts.length;
 const quality=reviewEvidence(r.posts,reviews);
 const peak=[...r.days].sort((a,b)=>b.total-a.total)[0],comparison=previousPeriod(period),change=r.volumeChange;
 const open=(title,posts,options)=>{setSelection({title,posts,...options});};
 const page=view=>{const search=new URLSearchParams(params);search.set('topic',topic.id||params.get('topic')||'');return '/pulse/'+view+'?'+search;};
 const changeText=!comparison?'Pilih tanggal mulai dan akhir':extra.comparisonError?'Perbandingan belum tersedia':!change?'Memuat perbandingan…':change.percent===null?`${change.delta>0?'+':''}${change.delta} posting · basis sebelumnya 0`:`${change.percent>0?'+':''}${change.percent.toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
 const trend=key=>r.days.map(d=>d[key]);const recent=key=>recentChange(trend(key));
 const percentChange=change&&change.percent!==null?change.percent:null;
 // One baseline per card: with a chosen period the volume is compared with the period before it and nothing else. While that
 // comparison loads, fails or has an empty base the card says so, instead of quietly switching to the last-days window.
 const recentTotal=recent('total'),totalDelta=comparison?percentChange:recentTotal?.percent??null;
 const [hideUnknown]=useHideUnknown();
 const net=netSentiment(r.counts),netChange=netSentimentChange(r.days),concentration=accountConcentration(r.posts);
 const dayLabel=v=>{const d=new Date(v+'T00:00:00Z');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'UTC'});};
 const topNarrative=r.narratives[0],topPlatform=r.platforms[0];
 const signals=[
  peak&&{key:'peak',label:'Hari teramai',value:dayLabel(peak.date),note:`${formatCount(peak.total)} posting · ${sharePercent(peak.total,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open('Hari teramai '+peak.date,r.posts.filter(p=>sentimentDate(p)===peak.date))},
  topPlatform&&{key:'platform',label:'Sumber terbanyak',value:platformLabel(topPlatform.platform),note:`${formatCount(topPlatform.count)} posting · ${sharePercent(topPlatform.count,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open(platformLabel(topPlatform.platform),r.posts.filter(p=>p.platform===topPlatform.platform))},
  topNarrative&&{key:'narrative',label:'Narasi terbesar',value:topNarrative.title.slice(0,64)+(topNarrative.title.length>64?'…':''),note:`${formatCount(topNarrative.posts.length)} posting serupa`,action:'Periksa kelompok',onClick:()=>open('Kelompok percakapan',topNarrative.posts,{oneContent:true})},
  quality.needsReview.length>0&&{key:'review',label:'Perlu ditinjau',value:`${formatCount(quality.needsReview.length)} posting`,note:'Penilaian kurang yakin atau ditandai analis',action:'Tinjau sekarang',onClick:()=>open('Perlu ditinjau',quality.needsReview)},
 ].filter(Boolean);
 const netText=net===null?null:`${net>0?'+':net<0?'−':''}${Math.abs(Math.round(net))}`;
 return <div className="po-overview po-workbench">
  <section className="po-brief" aria-label="Ringkasan eksekutif">
   <header className="po-brief-head">
    <div className="po-brief-text"><span className="po-eyebrow">RINGKASAN PROJECT</span><h2>{total?`${formatCount(total)} posting dalam cakupan terpilih`:'Belum ada posting dalam cakupan ini'}</h2><p>{change&&change.previous>0?`Volume posting ${change.delta>0?'meningkat':change.delta<0?'menurun':'tetap'} dibanding periode sebelumnya (${formatCount(change.previous)} posting). `:''}{r.platforms[0]?`Percakapan paling banyak ditemukan di ${platformLabel(r.platforms[0].platform)} (${formatCount(r.platforms[0].count)} posting). `:''}{r.accounts[0]?.engagement!=null?`${r.accounts[0].author||'Akun tanpa nama'} mencatat interaksi tertinggi: ${formatCount(r.accounts[0].engagement)}. `:''}{!total?'Ubah periode atau pilihan platform untuk melihat hasil.':''}</p></div>
    <div className="po-context"><Link className="po-report-link" to={page('reports')}>Buat laporan <PulseArrow/></Link><span>Diperbarui {r.updatedAt?pulseDate(r.updatedAt):'belum tersedia'}</span></div>
   </header>
   <PulseStatGrid label="Ringkasan periode project">
    <PulseStat label="Penyebutan" icon={MessagesSquare} value={total} delta={totalDelta} deltaNote={comparison?`vs ${comparison.from} s.d. ${comparison.to}`:recentTotal?`${recentTotal.days} hari terakhir vs ${recentTotal.days} hari sebelumnya`:undefined} trend={trend('total')} note={totalDelta===null&&(comparison||!recentTotal)?changeText:undefined}/>
    <PulseStat label="Konten unik" icon={Copy} value={r.uniqueContent} share={total?r.uniqueContent/total*100:null} shareLabel="teks berbeda" note={`${formatCount(r.duplicates)} salinan teks identik`}/>
    <PulseStat label="Akun unik" icon={Users} value={r.accounts.length} note={total&&r.accounts.length?`${(total/r.accounts.length).toLocaleString('id-ID',{maximumFractionDigits:1})} posting per akun`:'Dihitung per platform'}/>
    <PulseStat label="Interaksi" icon={Activity} value={r.engagement} share={total?r.engagementCoverage/total*100:null} shareLabel="posting bermetrik"/>
    <PulseStat as={Link} to={page('sentiment')} label="Sentimen bersih" icon={HeartPulse} value={netText} delta={netChange?.delta??null} deltaUnit=" poin" deltaIntent={deltaIntent('positive',netChange?.delta)}
     deltaNote={netChange?`${netChange.days} hari terakhir vs ${netChange.days} hari sebelumnya`:undefined}
     note={net===null?'Belum ada posting yang dianalisis':`dari ${formatCount(r.analyzed)} posting dianalisis · skala −100 sampai +100`}/>
    <PulseStat as={Link} to={page('accounts')} label="Konsentrasi akun" icon={Gauge} value={concentration.topAccountShare===null?null:percentLabel(concentration.topAccountShare)}
     note={concentration.topAccountShare===null?'Belum ada akun bernama':`posting dari 3 akun teratas · dari ${formatCount(concentration.accounts)} akun`}/>
   </PulseStatGrid>
   {signals.length>0&&<ul className="po-signals" aria-label="Sorotan untuk diperiksa">{signals.map(s=><li key={s.key}><button type="button" onClick={s.onClick}><span className="po-signal-label">{s.label}</span><strong>{s.value}</strong><small>{s.note}</small><span className="po-signal-action">{s.action} <PulseArrow/></span></button></li>)}</ul>}
   <PlatformPie platforms={r.platforms} onOpen={id=>open(platformLabel(id),r.posts.filter(p=>p.platform===id))}/>
   <footer className="po-brief-foot">
    <span className="po-quality">{quality.paired?`${Math.round(quality.accuracy*100)}% sesuai penilaian analis · ${quality.correct}/${quality.paired} sampel`:'Belum ada sampel berlabel manual'} <InfoTip label="Tentang angka ringkasan">Kualitas analisis hanya dari sampel yang dinilai analis dalam pilihan ini; bukan ukuran akurasi seluruh data. Perlu ditinjau mencakup penilaian kurang yakin, perbedaan label, atau penandaan analis. Konten unik menggabungkan teks identik dengan perbedaan kapital dan spasi; kemiripan narasi tidak dihitung sebagai duplikat. Sentimen bersih = (positif − negatif) ÷ posting yang dianalisis; {hideUnknown?'posting belum dianalisis disembunyikan di halaman Sentimen, dan di sini juga tidak dihitung':'posting belum dianalisis tidak dihitung'}. Konsentrasi akun adalah porsi posting dari tiga akun paling aktif, bukan bukti akun terkoordinasi.</InfoTip></span>
    {extra.loaded&&!extra.reviews&&<small>Status koreksi analis belum tersedia; hasil belum disaring berdasarkan koreksi.</small>}
   </footer>
  </section>
  <AiSummaryCard key={params.get('topic')||''} topicId={params.get('topic')||''}/>
  <TopMentions posts={r.posts} onOpen={(title,posts)=>open(title,posts)}/>
  <EvidenceSheet selection={selection} onClose={()=>setSelection(null)}/>
  <section id="overview-development" className="lay-grid">
   <div className="lay-12">
   <TrendChart title="Perkembangan isu" description="Posting dan interaksi dari waktu ke waktu, atau dipilah menurut sentimen atau platform." posts={r.posts} period={period}
    footer="Tanggal publikasi WIB. Lonjakan bukan bukti peristiwa baru atau sebab perubahan." onPick={(row,unit)=>open('Posting '+bucketLabel(row,unit),bucketPosts(r.posts,row))}/>
   </div>
  </section>
  <nav className="po-detail-links" aria-label="Detail di halaman lain"><h2>Telusuri lebih jauh</h2><ul>{detailPages.map(([view,title,note])=><li key={view}><Link to={page(view)}><strong>{title}</strong><small>{note}</small><PulseArrow/></Link></li>)}</ul></nav>
 </div>;
}
