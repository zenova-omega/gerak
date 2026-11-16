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
import {overviewEvidence,reviewEvidence} from '../lib/pulseOverview';
import {sentimentDate} from '../lib/pulseSentiment';
import {formatCount,pulseDate} from '../lib/pulseData';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import useOverviewEvidence from './useOverviewEvidence';
import InfoTip from './InfoTip';
import './overview-analytics.css';
import './project-overview.css';
import './ds/overview-brief.css';
import TopMentions from './TopMentions';
import {Activity,Copy,MessagesSquare,Users,HeartPulse,Gauge} from 'lucide-react';
import {PulseStat,PulseStatGrid} from '../components/ui/PulseAnalytics';
import {projectKpis} from '../lib/pulseKpis';
import {sharePercent} from '../lib/pulseChartTheme';
import ProjectHighlight from './ProjectHighlight';

const kpiIcons={mentions:MessagesSquare,unique:Copy,accounts:Users,interactions:Activity,net:HeartPulse,concentration:Gauge};
/** The two figures that open the page that explains them. */
const kpiLinks={net:'sentiment',concentration:'accounts'};
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
 const peak=[...r.days].sort((a,b)=>b.total-a.total)[0],change=r.volumeChange;
 const open=(title,posts,options)=>{setSelection({title,posts,...options});};
 const page=view=>{const search=new URLSearchParams(params);search.set('topic',topic.id||params.get('topic')||'');return '/pulse/'+view+'?'+search;};
 const [hideUnknown]=useHideUnknown();
 // The six figures are worked out once (pulseKpis.js) and printed the same way in the report.
 const kpis=projectKpis(r,{period,comparisonError:Boolean(extra.comparisonError)});
 const dayLabel=v=>{const d=new Date(v+'T00:00:00Z');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'UTC'});};
 const topNarrative=r.narratives[0],topPlatform=r.platforms[0];
 const signals=[
  peak&&{key:'peak',label:'Hari teramai',value:dayLabel(peak.date),note:`${formatCount(peak.total)} posting · ${sharePercent(peak.total,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open('Hari teramai '+peak.date,r.posts.filter(p=>sentimentDate(p)===peak.date))},
  topPlatform&&{key:'platform',label:'Sumber terbanyak',value:platformLabel(topPlatform.platform),note:`${formatCount(topPlatform.count)} posting · ${sharePercent(topPlatform.count,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open(platformLabel(topPlatform.platform),r.posts.filter(p=>p.platform===topPlatform.platform))},
  topNarrative&&{key:'narrative',label:'Narasi terbesar',value:topNarrative.title.slice(0,64)+(topNarrative.title.length>64?'…':''),note:`${formatCount(topNarrative.posts.length)} posting serupa`,action:'Periksa kelompok',onClick:()=>open('Kelompok percakapan',topNarrative.posts,{oneContent:true})},
  quality.needsReview.length>0&&{key:'review',label:'Perlu ditinjau',value:`${formatCount(quality.needsReview.length)} posting`,note:'Penilaian kurang yakin atau ditandai analis',action:'Tinjau sekarang',onClick:()=>open('Perlu ditinjau',quality.needsReview)},
 ].filter(Boolean);
 return <div className="po-overview po-workbench">
  <ProjectHighlight posts={data.posts||[]} topic={{...topic,id:topic.id||params.get('topic')||''}} period={period}/>
  <section className="po-brief" aria-label="Ringkasan eksekutif">
   <header className="po-brief-head">
    <div className="po-brief-text"><span className="po-eyebrow">RINGKASAN PROJECT</span><h2>{total?`${formatCount(total)} posting dalam cakupan terpilih`:'Belum ada posting dalam cakupan ini'}</h2><p>{change&&change.previous>0?`Volume posting ${change.delta>0?'meningkat':change.delta<0?'menurun':'tetap'} dibanding periode sebelumnya (${formatCount(change.previous)} posting). `:''}{r.platforms[0]?`Percakapan paling banyak ditemukan di ${platformLabel(r.platforms[0].platform)} (${formatCount(r.platforms[0].count)} posting). `:''}{r.accounts[0]?.engagement!=null?`${r.accounts[0].author||'Akun tanpa nama'} mencatat interaksi tertinggi: ${formatCount(r.accounts[0].engagement)}. `:''}{!total?'Ubah periode atau pilihan platform untuk melihat hasil.':''}</p></div>
    <div className="po-context"><Link className="po-report-link" to={page('reports')}>Buat laporan <PulseArrow/></Link><span>Diperbarui {r.updatedAt?pulseDate(r.updatedAt):'belum tersedia'}</span></div>
   </header>
   <PulseStatGrid label="Ringkasan periode project">
    {kpis.map(({key,...kpi})=>{const link=kpiLinks[key];return <PulseStat key={key} {...kpi} icon={kpiIcons[key]} {...(link?{as:Link,to:page(link)}:{})}/>;})}
   </PulseStatGrid>
   {signals.length>0&&<ul className="po-signals" aria-label="Sorotan untuk diperiksa">{signals.map(s=><li key={s.key}><button type="button" onClick={s.onClick}><span className="po-signal-label">{s.label}</span><strong>{s.value}</strong><small>{s.note}</small><span className="po-signal-action">{s.action} <PulseArrow/></span></button></li>)}</ul>}
   <PlatformPie platforms={r.platforms} onOpen={id=>open(platformLabel(id),r.posts.filter(p=>p.platform===id))}/>
   <footer className="po-brief-foot">
    <span className="po-quality">{quality.paired?`${Math.round(quality.accuracy*100)}% sesuai penilaian analis · ${quality.correct}/${quality.paired} sampel`:'Belum ada sampel berlabel manual'} <InfoTip label="Tentang angka ringkasan">Akurasi hanya dari sampel yang dinilai analis, bukan seluruh data. Sentimen bersih = (positif − negatif) ÷ posting dianalisis. Konsentrasi akun bukan bukti koordinasi.</InfoTip></span>
    {extra.loaded&&!extra.reviews&&<small>Status koreksi analis belum tersedia.</small>}
   </footer>
  </section>
  <AiSummaryCard key={params.get('topic')||''} topicId={params.get('topic')||''}/>
  <TopMentions posts={r.posts} onOpen={(title,posts)=>open(title,posts)}/>
  <EvidenceSheet selection={selection} onClose={()=>setSelection(null)}/>
  <section id="overview-development" className="lay-grid">
   <div className="lay-12">
   <TrendChart title="Perkembangan isu" posts={r.posts} period={period}
    onPick={(row,unit)=>open('Posting '+bucketLabel(row,unit),bucketPosts(r.posts,row))}/>
   </div>
  </section>
  <nav className="po-detail-links" aria-label="Detail di halaman lain"><h2>Telusuri lebih jauh</h2><ul>{detailPages.map(([view,title])=><li key={view}><Link to={page(view)}><strong>{title}</strong><PulseArrow/></Link></li>)}</ul></nav>
 </div>;
}
