import { PulseArrow } from '../components/ui/PulseArrow';
import EvidenceDrawer from './EvidenceDrawer';
import {PulseSourceHeading} from '../components/ui/PulsePatterns';
import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import {overviewEvidence,previousPeriod,reviewEvidence,sourceText} from '../lib/pulseOverview';
import {sentimentDate} from '../lib/pulseSentiment';
import {sentimentLabels,postSentiment} from '../lib/pulsePostFilters';
import {formatCount,pulseDate,safeSourceUrl} from '../lib/pulseData';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import PostMediaPreview from '../components/admin/pulse/PostMediaPreview';
import {PulseButton} from '../components/ui/PulseUI';
import useOverviewEvidence from './useOverviewEvidence';
import InfoTip from './InfoTip';
import GrowthEvidence from './GrowthEvidence';
import './overview-analytics.css';
import './project-overview.css';
import {Activity,Copy,MessagesSquare,Users} from 'lucide-react';
import {PulseStat,PulseStatGrid,PulseLegend,PulseChartTooltip,PulseDistribution,PulseBreakdown,PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {SentimentTag} from '../components/ui/PulseTag';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {sentimentColor,sentimentOrder,platformColor,sharePercent} from '../lib/pulseChartTheme';

const sentimentFill=key=>key==='unknown'?'url(#po-hatch-unknown)':sentimentColor[key];

function EvidencePosts({posts}){
 return <ol className="po-evidence-list">{posts.map(p=><EvidencePost key={p.id} post={p}/>)}</ol>;
}
const shortDay=value=>new Date(value).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'});
/** First and last publication day of a group, in WIB. Empty when no post carries a date. */
function dateRange(posts){
 const times=posts.map(p=>Date.parse(p.published_at)).filter(Number.isFinite).sort((a,b)=>a-b);
 if(!times.length)return '';
 const first=shortDay(times[0]),last=shortDay(times.at(-1));
 return first===last?first:`${first} – ${last}`;
}
/** Stored comments of one post: the most liked first, the rest behind a disclosure. */
function EvidenceComments({post}){
 const [limit,setLimit]=useState(10);
 const snapshot=post.metrics?.comment_snapshot;
 const items=snapshot?.status==='success'?[...(snapshot.items||[])].sort((a,b)=>(b.likes??-1)-(a.likes??-1)):[];
 const row=c=><li key={c.id}><p>{c.text}</p><span>{c.author||'Penulis tidak tersedia'}{c.likes!=null&&<> · {formatCount(c.likes)} suka</>}{c.published_at&&<> · {pulseDate(c.published_at)}</>}</span></li>;
 if(!items.length)return <p className="ped-comments-empty">{snapshot?.status==='success'?'Belum ada komentar tersimpan untuk posting ini.':'Isi komentar posting ini belum diambil. Ambil dari halaman Komentar; angka komentar tetap tampil di rincian interaksi.'}</p>;
 return <section className="ped-comments" aria-label={'Komentar pada posting '+(post.author||'')}>
  <h3>Komentar teratas <small>{formatCount(items.length)} tersimpan · diambil {pulseDate(snapshot.fetched_at)}</small></h3>
  <ol>{items.slice(0,3).map(row)}</ol>
  {items.length>3&&<details><summary>Lihat semua {formatCount(items.length)} komentar</summary><ol>{items.slice(3,3+limit).map(row)}</ol>{items.length>3+limit&&<PulseButton onClick={()=>setLimit(value=>value+20)}>Tampilkan lebih banyak</PulseButton>}</details>}
 </section>;
}
function EvidencePost({post:p}){
 const [expanded,setExpanded]=useState(false);
 const caption=sourceText(p)||'Teks belum tersedia';
 return <li><PulseSourceHeading post={p}><SentimentTag value={postSentiment(p)}/></PulseSourceHeading><div className="ped-caption"><span className="ptp-source-label">Caption asli</span><p>{expanded?caption:caption.slice(0,420)}{!expanded&&caption.length>420?'…':''}</p>{caption.length>420&&<PulseButton aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Ringkas caption':'Baca caption lengkap'}</PulseButton>}</div><PostMediaPreview post={p}/><EvidenceComments post={p}/><div className="ped-interactions"><PulseEngagement metrics={p.metrics} platform={p.platform} compact label={'Rincian interaksi posting '+(p.author||'')}/></div><footer>{safeSourceUrl(p.url)&&<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}</footer></li>;
}
export default function ProjectOverview({data,topic={},period={},platforms=null,onPlatformsChange=()=>{}}){
 const [params]=useSearchParams();
 const [includeIrrelevant,setIncludeIrrelevant]=useState(false),[selection,setSelection]=useState(null);
 const extra=useOverviewEvidence(topic.id||params.get('topic'),period,data);
 const reviews=extra.reviews?.reviews||[];
 const excludedIds=includeIrrelevant?[]:reviews.filter(r=>r.relevance==='irrelevant').map(r=>r.post_id);
 const r=overviewEvidence(data.posts||[],{platforms,excludedIds,previousPosts:extra.previousPosts??null});
 const total=r.posts.length;
 const quality=reviewEvidence(r.posts,reviews);
 const peak=[...r.days].sort((a,b)=>b.total-a.total)[0],comparison=previousPeriod(period),change=r.volumeChange;
 const open=(title,posts)=>{setSelection({title,posts});};
 const page=view=>{const search=new URLSearchParams(params);search.set('topic',topic.id||params.get('topic')||'');return '/pulse/'+view+'?'+search;};
 const changeText=!comparison?'Pilih tanggal mulai dan akhir':extra.comparisonError?'Perbandingan belum tersedia':!change?'Memuat perbandingan…':change.percent===null?`${change.delta>0?'+':''}${change.delta} posting · basis sebelumnya 0`:`${change.percent>0?'+':''}${change.percent.toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
 const comments=r.posts.flatMap(p=>(p.metrics?.comment_snapshot?.items||[]).map(c=>({...c,post:p}))).sort((a,b)=>(b.likes??-1)-(a.likes??-1));
 const trend=key=>r.days.map(d=>d[key]);
 const percentChange=change&&change.percent!==null?change.percent:null;
 const segments=sentimentOrder.map(key=>({key,label:sentimentLabels[key],value:r.counts[key],color:sentimentColor[key],hatch:key==='unknown',onClick:()=>open(sentimentLabels[key],r.posts.filter(p=>postSentiment(p)===key))}));
 const dayLabel=v=>{const d=new Date(v+'T00:00:00Z');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'UTC'});};
 const topNarrative=r.narratives[0],topPlatform=r.platforms[0];
 const signals=[
  peak&&{key:'peak',label:'Puncak volume',value:dayLabel(peak.date),note:`${formatCount(peak.total)} posting · ${sharePercent(peak.total,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open('Puncak '+peak.date,r.posts.filter(p=>sentimentDate(p)===peak.date))},
  topPlatform&&{key:'platform',label:'Sumber terbanyak',value:platformLabel(topPlatform.platform),note:`${formatCount(topPlatform.count)} posting · ${sharePercent(topPlatform.count,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open(platformLabel(topPlatform.platform),r.posts.filter(p=>p.platform===topPlatform.platform))},
  topNarrative&&{key:'narrative',label:'Narasi terbesar',value:topNarrative.title.slice(0,64)+(topNarrative.title.length>64?'…':''),note:`${formatCount(topNarrative.posts.length)} posting serupa`,action:'Periksa kelompok',onClick:()=>open('Kelompok percakapan',topNarrative.posts)},
  quality.needsReview.length>0&&{key:'review',label:'Perlu ditinjau',value:`${formatCount(quality.needsReview.length)} posting`,note:'Penilaian kurang yakin atau ditandai analis',action:'Tinjau sekarang',onClick:()=>open('Perlu ditinjau',quality.needsReview)},
 ].filter(Boolean);
 return <div className="po-overview po-workbench">
  <section className="po-brief" aria-label="Ringkasan eksekutif">
   <header className="po-brief-head">
    <div className="po-brief-text"><span className="po-eyebrow">RINGKASAN PROJECT</span><h2>{total?`${formatCount(total)} posting dalam cakupan terpilih`:'Belum ada posting dalam cakupan ini'}</h2><p>{change&&change.previous>0?`Volume posting ${change.delta>0?'meningkat':change.delta<0?'menurun':'tetap'} dibanding periode sebelumnya (${formatCount(change.previous)} posting). `:''}{r.platforms[0]?`Percakapan paling banyak ditemukan di ${platformLabel(r.platforms[0].platform)} (${formatCount(r.platforms[0].count)} posting). `:''}{r.accounts[0]?.engagement!=null?`${r.accounts[0].author} mencatat interaksi tertinggi: ${formatCount(r.accounts[0].engagement)}. `:''}{!total?'Ubah periode atau pilihan platform untuk melihat hasil.':''}</p></div>
    <div className="po-context"><Link className="po-report-link" to={page('reports')}>Buat laporan <PulseArrow/></Link><span>Diperbarui {r.updatedAt?pulseDate(r.updatedAt):'belum tersedia'}</span></div>
   </header>
   <PulseStatGrid label="Ringkasan periode project">
    <PulseStat label="Penyebutan" icon={MessagesSquare} value={total} delta={percentChange} trend={trend('total')} note={percentChange!==null?`vs ${comparison.from} s.d. ${comparison.to}`:changeText}/>
    <PulseStat label="Konten unik" icon={Copy} value={r.uniqueContent} note={`${formatCount(r.duplicates)} salinan teks identik`}/>
    <PulseStat label="Akun unik" icon={Users} value={r.accounts.length} note="Dihitung per platform"/>
    <PulseStat label="Interaksi" icon={Activity} value={r.engagement} note={`${formatCount(r.engagementCoverage)} posting memiliki metrik`}/>
    <PulseStat label="Positif" tone="positive" value={r.counts.positive} trend={trend('positive')} note={total?`${sharePercent(r.counts.positive,total)||'0%'} dari seluruh posting`:'Belum ada posting'} onClick={segments[0].onClick}/>
    <PulseStat label="Negatif" tone="negative" value={r.counts.negative} trend={trend('negative')} note={total?`${sharePercent(r.counts.negative,total)||'0%'} dari seluruh posting`:'Belum ada posting'} onClick={segments[2].onClick}/>
   </PulseStatGrid>
   {signals.length>0&&<ul className="po-signals" aria-label="Sorotan untuk diperiksa">{signals.map(s=><li key={s.key}><button type="button" onClick={s.onClick}><span className="po-signal-label">{s.label}</span><strong>{s.value}</strong><small>{s.note}</small><span className="po-signal-action">{s.action} <PulseArrow/></span></button></li>)}</ul>}
   <footer className="po-brief-foot">
    <label className="po-relevance"><input type="checkbox" checked={includeIrrelevant} onChange={e=>{setIncludeIrrelevant(e.target.checked);setSelection(null);}}/> Sertakan posting yang ditandai tidak relevan</label>
    <span className="po-quality">{quality.paired?`${Math.round(quality.accuracy*100)}% sesuai penilaian analis · ${quality.correct}/${quality.paired} sampel`:'Belum ada sampel berlabel manual'} <InfoTip label="Tentang angka ringkasan">Kualitas analisis hanya dari sampel yang dinilai analis dalam pilihan ini; bukan ukuran akurasi seluruh data. Perlu ditinjau mencakup penilaian kurang yakin, perbedaan label, atau penandaan analis. Konten unik menggabungkan teks identik dengan perbedaan kapital dan spasi; kemiripan narasi tidak dihitung sebagai duplikat.</InfoTip></span>
    {extra.loaded&&!extra.reviews&&<small>Status koreksi analis belum tersedia; hasil belum disaring berdasarkan koreksi.</small>}
   </footer>
  </section>
  <nav className="po-section-links" aria-label="Bagian ikhtisar">{[['development','Perkembangan'],['interactions','Interaksi'],['narratives','Narasi'],['drivers','Penggerak'],['spread','Penyebaran'],['response','Respons']].map(([id,label])=><a key={id} href={'#overview-'+id}>{label}</a>)}</nav>
  <EvidenceDrawer open={Boolean(selection)} onClose={()=>setSelection(null)} title={selection?.title||'Posting sumber'} description={selection?selection.posts.length+' posting sesuai pilihan. Tutup untuk kembali ke grafik.':''}>{selection&&<><EvidencePosts posts={selection.posts.slice(0,20)}/>{selection.posts.length>20&&<p>Menampilkan 20 posting pertama dari {selection.posts.length} hasil.</p>}</>}</EvidenceDrawer>
  <section id="overview-development" className="po-lead-grid">
   <AnalyticsPanel title="Perkembangan isu" description="Volume posting per hari, dipilah menurut sentimen. Klik tanggal untuk melihat postingnya." footer="Tanggal publikasi WIB. Puncak volume bukan bukti peristiwa baru atau sebab perubahan.">{r.days.length?<>
    <PulseLegend items={sentimentOrder.map(key=>({key,label:sentimentLabels[key],color:sentimentColor[key],hatch:key==='unknown'}))}/>
    <div className="po-chart po-chart-lead" role="img" aria-label="Tren posting harian menurut sentimen; daftar tanggal tersedia di bawah"><ResponsiveContainer width="100%" height="100%"><BarChart data={r.days} barCategoryGap="22%" onClick={s=>{if(s?.activeLabel)open('Posting '+s.activeLabel,r.posts.filter(p=>sentimentDate(p)===s.activeLabel));}}>
     <defs><pattern id="po-hatch-unknown" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--ps-sent-unknown)"/></pattern></defs>
     <CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={24} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} width={40} tickLine={false} axisLine={false}/>
     <Tooltip cursor={{fill:'var(--ps-soft)'}} content={<PulseChartTooltip labelFormatter={dayLabel} total/>}/>
     {sentimentOrder.map(key=><Bar key={key} dataKey={key} name={sentimentLabels[key]} stackId="sentiment" fill={sentimentFill(key)} isAnimationActive={false} cursor="pointer" maxBarSize={44}/>)}
    </BarChart></ResponsiveContainer></div>
    <details className="po-data"><summary>Lihat semua tanggal</summary><div>{r.days.map(d=><PulseButton key={d.date} onClick={()=>open(d.date,r.posts.filter(p=>sentimentDate(p)===d.date))}>{d.date} · {d.total} posting</PulseButton>)}</div></details>
   </>:<PulsePanelEmpty title="Belum ada waktu publikasi" action={<Link className="po-more" to={page('sources')}>Periksa Sumber &amp; Cakupan <PulseArrow/></Link>}>Posting tanpa tanggal terbit tidak dapat ditempatkan pada grafik.</PulsePanelEmpty>}</AnalyticsPanel>
   <div className="po-lead-side">
    <AnalyticsPanel title="Sentimen" description={`${formatCount(r.analyzed)} dari ${formatCount(total)} posting berlabel.`} footer="Sikap terhadap isu dibahas terpisah. Sentimen negatif tidak otomatis berarti membantah klaim.">
     <PulseDistribution segments={segments} total={total}/>
     <Link className="po-more" to={page('sentiment')}>Analisis sentimen lengkap <PulseArrow/></Link>
    </AnalyticsPanel>
    <AnalyticsPanel title="Sumber percakapan" description="Jumlah posting per platform, bukan estimasi audiens.">
     {r.platforms.length?<PulseBreakdown total={total} rows={r.platforms.map(row=>({key:row.platform,label:platformLabel(row.platform),value:row.count,color:platformColor(row.platform),leading:<PlatformIcon platform={row.platform} size={16}/>,onClick:()=>open(platformLabel(row.platform),r.posts.filter(p=>p.platform===row.platform))}))}/>:<PulsePanelEmpty action={<PulseButton onClick={()=>onPlatformsChange(null)}>Tampilkan semua platform</PulseButton>}>Belum ada sumber dalam pilihan ini.</PulsePanelEmpty>}
    </AnalyticsPanel>
   </div>
  </section>
  <div className="po-duo">
   <section id="overview-narratives"><AnalyticsPanel title="Narasi utama" description="Kelompok percakapan serupa, diurutkan menurut jumlah posting.">{r.narratives.length?<ol className="po-narrative-list">{r.narratives.slice(0,6).map((g,i)=><li key={g.id}><button type="button" onClick={()=>open('Kelompok percakapan',g.posts)} aria-label={`Narasi ${i+1}: ${g.title.slice(0,140)}. ${g.posts.length} posting. Periksa posting.`}><span className="po-narrative-rank" aria-hidden="true">{i+1}</span><span className="po-narrative-body"><strong>{g.title.slice(0,140)}{g.title.length>140?'…':''}</strong><small>{dateRange(g.posts)&&<time>{dateRange(g.posts)}</time>}{dateRange(g.posts)?' · ':''}{formatCount(g.posts.length)} posting · {sharePercent(g.posts.length,total)||'0%'} dari cakupan{change?` · ${g.posts.length-g.previous>=0?'+':''}${g.posts.length-g.previous} dibanding periode sebelumnya`:''}</small><span className="po-narrative-track" aria-hidden="true"><i style={{width:`${g.posts.length/Math.max(1,...r.narratives.slice(0,6).map(g=>g.posts.length))*100}%`}}/></span></span><PulseArrow/></button></li>)}</ol>:<PulsePanelEmpty title="Belum ada narasi berulang" action={<Link className="po-more" to={page('posts')}>Buka semua posting <PulseArrow/></Link>}>Belum ada kelompok berisi lebih dari satu posting pada pilihan ini.</PulsePanelEmpty>}</AnalyticsPanel></section>
   <section id="overview-interactions" className="po-eng-stack"><AnalyticsPanel title="Rincian interaksi" description="Jenis interaksi pada posting dalam pilihan ini, beserta dua indikator turunannya." footer="Snapshot terakhir tiap posting. Metrik yang tidak dikirim sumber tidak dihitung sebagai nol, sehingga jumlah posting per metrik dapat berbeda."><PulseEngagement posts={r.posts}/></AnalyticsPanel></section>
  </div>
  <section id="overview-drivers" className="po-panel-grid"><AnalyticsPanel title="Penggerak percakapan" description="Akun dengan interaksi tertinggi dalam pilihan ini."><ol className="po-leaders">{r.accounts.slice(0,5).map((a,i)=><li key={a.platform+a.author}><button onClick={()=>open('Posting '+a.author,r.posts.filter(p=>p.author===a.author&&p.platform===a.platform))}><span className="po-rank">{i+1}</span><PostAvatar post={a.post}/><span className="po-account"><strong>{a.author}</strong><small>{platformLabel(a.platform)} · {a.mentions} posting</small></span><span className="po-account-metric"><strong>{formatCount(a.engagement)}</strong><small>interaksi <PulseArrow/></small></span></button></li>)}</ol>{!r.accounts.length&&<p>Belum ada akun tersedia.</p>}<small>Interaksi bukan jumlah orang unik atau bukti pengaruh kausal.</small></AnalyticsPanel><AnalyticsPanel title="Posting teratas" description="Konten yang paling banyak memperoleh interaksi."><div className="po-top-posts">{r.topPosts.map(p=><TopPostSummary key={p.id} post={p} onOpen={()=>open('Posting teratas',[p])}/>)}</div></AnalyticsPanel></section>
  <GrowthEvidence data={extra.growth} posts={r.posts} onOpen={open} loaded={extra.loaded}/>
  <div className="po-duo">
   <section id="overview-spread"><AnalyticsPanel title="Penyebaran percakapan" description="Urutan publikasi paling awal yang tersedia pada setiap platform."><ol className="po-spread">{r.platformTimeline.map(p=><li key={p.platform}><PlatformIcon platform={p.platform}/><strong>{platformLabel(p.platform)}</strong><span>Publikasi awal: {pulseDate(p.firstPublished)}</span><small>Pertama ditemukan: {pulseDate(p.firstObserved)}</small><PulseButton onClick={()=>open(platformLabel(p.platform),r.posts.filter(post=>post.platform===p.platform))}>{p.count} posting <PulseArrow/></PulseButton></li>)}</ol><p className="po-panel-note">Urutan waktu tidak membuktikan platform asal. Hubungan repost harus didukung tautan atau bukti langsung.</p><Link to={page('network')}>Buka timeline & network akun <PulseArrow/></Link></AnalyticsPanel></section>
   <section id="overview-response"><AnalyticsPanel title="Suara di komentar" description={`${comments.length} komentar tersedia pada posting pilihan ini.`}>{comments.slice(0,3).map(c=><blockquote key={c.post.id+c.id}><p>{c.text}</p><footer>{c.author||'Penulis'} · {formatCount(c.likes)} likes</footer></blockquote>)}{!comments.length&&<p className="po-empty">Komentar belum tersedia untuk pilihan ini. Sentimen caption tidak digunakan sebagai pengganti sentimen komentar.</p>}<Link to={page('comments')}>Lihat komentar <PulseArrow/></Link></AnalyticsPanel></section>
  </div>
 </div>;
}
import TopPostSummary from './TopPostSummary';
