import { MostSeenPanel, EmojiPanel, TagPanel } from './OverviewInsights';
import useHideUnknown from './useHideUnknown';
import { UnanalysedToggle } from './UnanalysedToggle';
import InfographicsPanel from '../components/admin/pulse/InfographicsPanel';
import AiSummaryCard from './AiSummaryCard';
import { contentShares, postInteractions } from '../lib/pulseEngagement';
import { PulseArrow } from '../components/ui/PulseArrow';
import EvidenceDrawer from './EvidenceDrawer';
import {PulseSourceHeading} from '../components/ui/PulsePatterns';
import {createElement,lazy,Suspense,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import AnalyticsPanel from './AnalyticsPanel';
import TrendChart from './TrendChart';
import {bucketLabel,bucketPosts} from '../lib/pulseTrendSeries';
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
// The spread card brings the province outlines with it, so both are fetched after the page.
const RegionSpreadSummary = lazy(() => import('./RegionSpreadSummary'));
import './project-overview.css';
import {Activity,Copy,MessagesSquare,Users} from 'lucide-react';
import {PulseStat,PulseStatGrid,PulseDistribution,PulseBreakdown,PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {SentimentTag} from '../components/ui/PulseTag';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {PulseShare,PulseView,PulseBeat} from '../components/ui/PulseMetricIcons';
import {PulseMetricRow} from '../components/ui/PulseMetricRow';
import {recentChange,deltaIntent} from '../lib/pulseTrend';
import {sentimentColor,sentimentOrder,platformColor,sharePercent} from '../lib/pulseChartTheme';

const sumOf=(posts,key)=>{const values=posts.map(p=>key==='interactions'?postInteractions(p.metrics):p.metrics?.[key]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0):null;};
/** What a set of posts amounts to, before reading them one by one. */
function EvidenceSummary({posts}){
 const tone={positive:0,neutral:0,negative:0};
 for(const p of posts){const key=postSentiment(p);if(key in tone)tone[key]++;}
 const analysed=tone.positive+tone.neutral+tone.negative,accounts=new Set(posts.map(p=>p.platform+'|'+p.author)).size;
 const figures=[['posting',posts.length],['akun',accounts],['interaksi',sumOf(posts,'interactions')],['dibagikan',sumOf(posts,'shares')],['tayangan',sumOf(posts,'views')]].filter(([,value])=>value!=null);
 const tones=['negative','neutral','positive'].filter(key=>tone[key]>0),range=dateRange(posts);
 return <section className="ped-summary sig" aria-label="Ringkasan posting pilihan">
  <div className="sig-figures">{figures.map(([label,value])=><div className="sig-figure" key={label}><strong>{formatCount(value)}</strong><span>{label}</span></div>)}{range&&<div className="sig-figure"><strong data-kind="text">{range}</strong><span>terbit</span></div>}</div>
  {analysed>0&&(tones.length===1?<SentimentTag value={tones[0]}/>:<div className="ped-tone"><div className="sig-bar" role="img" aria-label={tones.map(key=>`${sentimentLabels[key]} ${Math.round(tone[key]/analysed*100)}%`).join(', ')}>{tones.map(key=><span key={key} style={{flexGrow:tone[key],background:sentimentColor[key]}}/>)}</div><ul>{tones.map(key=><li key={key}><i style={{background:sentimentColor[key]}}/><strong>{Math.round(tone[key]/analysed*100)}%</strong><span>{sentimentLabels[key].toLowerCase()}</span></li>)}</ul></div>)}
 </section>;
}
const sameText=p=>(sourceText(p)||'').replace(/\s+/g,' ').trim().toLowerCase();
function EvidencePosts({posts,limit=20}){
 // Posts that carry the same words (reposts, copies) are read once, with the accounts that shared them listed under the text.
 const groups=[];const byText=new Map();
 for(const p of posts.slice(0,limit)){const key=sameText(p);if(key&&byText.has(key))byText.get(key).push(p);else{const group=[p];if(key)byText.set(key,group);groups.push(group);}}
 return <><EvidenceSummary posts={posts}/><ol className="po-evidence-list">{groups.map(group=>group.length>1?<EvidenceCopies key={group[0].id} posts={group}/>:<EvidencePost key={group[0].id} post={group[0]}/>)}</ol></>;
}
function EvidenceCopies({posts}){
 const [open,setOpen]=useState(false),first=posts[0],caption=sourceText(first)||'Teks belum tersedia';
 const totals={likes:sumOf(posts,'likes'),comments:sumOf(posts,'comments'),shares:sumOf(posts,'shares'),views:sumOf(posts,'views')};
 const accounts=new Set(posts.map(p=>p.platform+'|'+p.author)).size,oneAccount=accounts===1;
 return <li className="ped-copies">
  <header><span className="ped-copies-mark" aria-hidden="true"><Copy size={16}/></span><div><strong>{formatCount(posts.length)} posting dengan teks yang sama</strong><small>{oneAccount?`Semuanya dari ${first.author||'satu akun'} · ${platformLabel(first.platform)}`:`Dari ${formatCount(accounts)} akun`} · {dateRange(posts)}</small></div><SentimentTag value={postSentiment(first)}/></header>
  <p className="ped-text">{caption.slice(0,420)}{caption.length>420?'…':''}</p>
  <PulseMetricRow metrics={totals} platform={first.platform}/>
  <table className="ped-accounts"><caption className="pu-sr">Posting dengan teks ini</caption><thead><tr><th scope="col">{oneAccount?'Waktu terbit':'Akun'}</th><th scope="col">Interaksi</th><th scope="col"><span className="pu-sr">Tautan</span></th></tr></thead>
   <tbody>{posts.slice(0,open?posts.length:4).map(p=><tr key={p.id}><th scope="row">{oneAccount?<span className="ped-when">{pulseDate(p.published_at)}</span>:<span className="ped-who"><PostAvatar post={p}/><span><strong>{p.author||'Nama tidak tersedia'}</strong><small>{platformLabel(p.platform)} · {pulseDate(p.published_at)}</small></span></span>}</th><td>{postInteractions(p.metrics)==null?'—':formatCount(postInteractions(p.metrics))}</td><td>{safeSourceUrl(p.url)&&<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka posting '+(p.author||'')+' '+pulseDate(p.published_at)}><PulseArrow/></a>}</td></tr>)}</tbody></table>
  {posts.length>4&&<PulseButton size="sm" variant="quiet" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Ringkas daftar':`Lihat ${formatCount(posts.length-4)} posting lainnya`}</PulseButton>}
 </li>;
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
 if(!items.length)return null;
 return <details className="ped-comments" aria-label={'Komentar pada posting '+(post.author||'')}>
  <summary>{formatCount(items.length)} komentar tersimpan</summary>
  <ol>{items.slice(0,3+limit).map(row)}</ol>
  {items.length>3+limit&&<PulseButton size="sm" variant="quiet" onClick={()=>setLimit(value=>value+20)}>Tampilkan lebih banyak</PulseButton>}
 </details>;
}
function EvidencePost({post:p}){
 const [expanded,setExpanded]=useState(false);
 const caption=sourceText(p)||'Teks belum tersedia';
 return <li><PulseSourceHeading post={p}><SentimentTag value={postSentiment(p)}/>{safeSourceUrl(p.url)&&<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka posting '+(p.author||'')+' di sumbernya'}><PulseArrow/></a>}</PulseSourceHeading>
  <p className="ped-text">{expanded?caption:caption.slice(0,420)}{!expanded&&caption.length>420?'…':''}</p>
  {caption.length>420&&<PulseButton size="sm" variant="quiet" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Ringkas':'Baca selengkapnya'}</PulseButton>}
  <PostMediaPreview post={p} links={false}/>
  <PulseMetricRow metrics={p.metrics} platform={p.platform} hideEmpty/>
  <EvidenceComments post={p}/>
 </li>;
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
 const trend=key=>r.days.map(d=>d[key]);const recent=key=>recentChange(trend(key));
 const percentChange=change&&change.percent!==null?change.percent:null;
 const [hideUnknown,setHideUnknown]=useHideUnknown();
 const shownOrder=sentimentOrder.filter(key=>!(hideUnknown&&key==='unknown'));
 const unknownToggle=<UnanalysedToggle hidden={hideUnknown} onChange={setHideUnknown} count={r.counts.unknown}/>;
 const segments=shownOrder.map(key=>({key,label:sentimentLabels[key],value:r.counts[key],color:sentimentColor[key],hatch:key==='unknown',onClick:()=>open(sentimentLabels[key],r.posts.filter(p=>postSentiment(p)===key))}));
 const dayLabel=v=>{const d=new Date(v+'T00:00:00Z');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'UTC'});};
 const topNarrative=r.narratives[0],topPlatform=r.platforms[0];
 const signals=[
  peak&&{key:'peak',label:'Puncak volume',value:dayLabel(peak.date),note:`${formatCount(peak.total)} posting · ${sharePercent(peak.total,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open('Puncak '+peak.date,r.posts.filter(p=>sentimentDate(p)===peak.date))},
  topPlatform&&{key:'platform',label:'Sumber terbanyak',value:platformLabel(topPlatform.platform),note:`${formatCount(topPlatform.count)} posting · ${sharePercent(topPlatform.count,total)||'0%'} dari cakupan`,action:'Lihat posting',onClick:()=>open(platformLabel(topPlatform.platform),r.posts.filter(p=>p.platform===topPlatform.platform))},
  topNarrative&&{key:'narrative',label:'Narasi terbesar',value:topNarrative.title.slice(0,64)+(topNarrative.title.length>64?'…':''),note:`${formatCount(topNarrative.posts.length)} posting serupa`,action:'Periksa kelompok',onClick:()=>open('Kelompok percakapan',topNarrative.posts)},
  quality.needsReview.length>0&&{key:'review',label:'Perlu ditinjau',value:`${formatCount(quality.needsReview.length)} posting`,note:'Penilaian kurang yakin atau ditandai analis',action:'Tinjau sekarang',onClick:()=>open('Perlu ditinjau',quality.needsReview)},
 ].filter(Boolean);
 return <div className="po-overview po-workbench">
  <AiSummaryCard key={params.get('topic')||''} topicId={params.get('topic')||''} period={period} platforms={platforms} posts={total}/>
  <section className="po-brief" aria-label="Ringkasan eksekutif">
   <header className="po-brief-head">
    <div className="po-brief-text"><span className="po-eyebrow">RINGKASAN PROJECT</span><h2>{total?`${formatCount(total)} posting dalam cakupan terpilih`:'Belum ada posting dalam cakupan ini'}</h2><p>{change&&change.previous>0?`Volume posting ${change.delta>0?'meningkat':change.delta<0?'menurun':'tetap'} dibanding periode sebelumnya (${formatCount(change.previous)} posting). `:''}{r.platforms[0]?`Percakapan paling banyak ditemukan di ${platformLabel(r.platforms[0].platform)} (${formatCount(r.platforms[0].count)} posting). `:''}{r.accounts[0]?.engagement!=null?`${r.accounts[0].author} mencatat interaksi tertinggi: ${formatCount(r.accounts[0].engagement)}. `:''}{!total?'Ubah periode atau pilihan platform untuk melihat hasil.':''}</p></div>
    <div className="po-context"><Link className="po-report-link" to={page('reports')}>Buat laporan <PulseArrow/></Link><span>Diperbarui {r.updatedAt?pulseDate(r.updatedAt):'belum tersedia'}</span></div>
   </header>
   <PulseStatGrid label="Ringkasan periode project">
    <PulseStat label="Penyebutan" icon={MessagesSquare} value={total} delta={percentChange??recent('total')?.percent??null} deltaNote={percentChange!==null?`vs ${comparison.from} s.d. ${comparison.to}`:recent('total')?`${recent('total').days} hari terakhir vs ${recent('total').days} hari sebelumnya`:undefined} trend={trend('total')} note={percentChange===null&&!recent('total')?changeText:undefined}/>
    <PulseStat label="Konten unik" icon={Copy} value={r.uniqueContent} share={total?r.uniqueContent/total*100:null} shareLabel="teks berbeda" note={`${formatCount(r.duplicates)} salinan teks identik`}/>
    <PulseStat label="Akun unik" icon={Users} value={r.accounts.length} note={total&&r.accounts.length?`${(total/r.accounts.length).toLocaleString('id-ID',{maximumFractionDigits:1})} posting per akun`:'Dihitung per platform'}/>
    <PulseStat label="Interaksi" icon={Activity} value={r.engagement} share={total?r.engagementCoverage/total*100:null} shareLabel="posting bermetrik"/>
    <PulseStat label="Positif" tone="positive" value={r.counts.positive} share={(hideUnknown?r.analyzed:total)?r.counts.positive/(hideUnknown?r.analyzed:total)*100:null} shareLabel={hideUnknown?"dari yang dianalisis":"dari seluruh posting"} delta={recent('positive')?.delta??null} deltaUnit="" deltaIntent={deltaIntent('positive',recent('positive')?.delta)} deltaNote={recent('positive')?`${recent('positive').days} hari terakhir vs ${recent('positive').days} hari sebelumnya`:undefined} trend={trend('positive')} onClick={segments[0].onClick}/>
    <PulseStat label="Negatif" tone="negative" value={r.counts.negative} share={(hideUnknown?r.analyzed:total)?r.counts.negative/(hideUnknown?r.analyzed:total)*100:null} shareLabel={hideUnknown?"dari yang dianalisis":"dari seluruh posting"} delta={recent('negative')?.delta??null} deltaUnit="" deltaIntent={deltaIntent('negative',recent('negative')?.delta)} deltaNote={recent('negative')?`${recent('negative').days} hari terakhir vs ${recent('negative').days} hari sebelumnya`:undefined} trend={trend('negative')} onClick={segments.find(segment=>segment.key==='negative')?.onClick}/>
   </PulseStatGrid>
   {signals.length>0&&<ul className="po-signals" aria-label="Sorotan untuk diperiksa">{signals.map(s=><li key={s.key}><button type="button" onClick={s.onClick}><span className="po-signal-label">{s.label}</span><strong>{s.value}</strong><small>{s.note}</small><span className="po-signal-action">{s.action} <PulseArrow/></span></button></li>)}</ul>}
   <footer className="po-brief-foot">
    <label className="po-relevance"><input type="checkbox" role="switch" className="pu-switch-input" checked={includeIrrelevant} onChange={e=>{setIncludeIrrelevant(e.target.checked);setSelection(null);}}/> Sertakan posting yang ditandai tidak relevan</label>
    <span className="po-quality">{quality.paired?`${Math.round(quality.accuracy*100)}% sesuai penilaian analis · ${quality.correct}/${quality.paired} sampel`:'Belum ada sampel berlabel manual'} <InfoTip label="Tentang angka ringkasan">Kualitas analisis hanya dari sampel yang dinilai analis dalam pilihan ini; bukan ukuran akurasi seluruh data. Perlu ditinjau mencakup penilaian kurang yakin, perbedaan label, atau penandaan analis. Konten unik menggabungkan teks identik dengan perbedaan kapital dan spasi; kemiripan narasi tidak dihitung sebagai duplikat.</InfoTip></span>
    {extra.loaded&&!extra.reviews&&<small>Status koreksi analis belum tersedia; hasil belum disaring berdasarkan koreksi.</small>}
   </footer>
  </section>
  <nav className="po-section-links" aria-label="Bagian ikhtisar">{[['development','Perkembangan'],['narratives','Narasi'],['insights','Top posting'],['drivers','Penggerak'],['spread','Penyebaran'],['words','Kata & waktu']].map(([id,label])=><a key={id} href={'#overview-'+id}>{label}</a>)}</nav>
  <EvidenceDrawer open={Boolean(selection)} onClose={()=>setSelection(null)} title={selection?.title||'Posting sumber'} description={selection?selection.posts.length+' posting sesuai pilihan. Tutup untuk kembali ke grafik.':''}>{selection&&<><EvidencePosts posts={selection.posts}/>{selection.posts.length>20&&<p>Menampilkan 20 posting pertama dari {selection.posts.length} hasil.</p>}</>}</EvidenceDrawer>
  {/* Layout: what happened and how it feels first, then what is said, who drives it, then detail. */}
  <section id="overview-development" className="lay-grid">
   <div className="lay-8">
   <TrendChart title="Perkembangan isu" description="Posting dan interaksi dari waktu ke waktu, atau dipilah menurut sentimen." posts={r.posts} period={period}
    footer="Tanggal publikasi WIB. Puncak volume bukan bukti peristiwa baru atau sebab perubahan." onPick={(row,unit)=>open('Posting '+bucketLabel(row,unit),bucketPosts(r.posts,row))}/>
   </div>
   <div className="lay-4">
    <AnalyticsPanel title="Sentimen" description={`${formatCount(r.analyzed)} dari ${formatCount(total)} posting berlabel.`} actions={unknownToggle} footer="Sikap terhadap isu dibahas terpisah. Sentimen negatif tidak otomatis berarti membantah klaim.">
     <PulseDistribution segments={segments} total={hideUnknown?r.analyzed:total}/>
     <Link className="po-more" to={page('sentiment')}>Analisis sentimen lengkap <PulseArrow/></Link>
    </AnalyticsPanel>
   </div>
  </section>
  <section id="overview-narratives" className="lay-grid">
   <div className="lay-8"><AnalyticsPanel title="Narasi utama" description="Kelompok percakapan serupa dan seberapa jauh masing-masing menyebar." footer="Dibagikan dan tayangan hanya dihitung dari posting yang membawa angkanya. Pada repost, angka dibagikan milik posting aslinya: dihitung sekali per narasi dan tidak masuk interaksi. Jangkauan akun unik tidak tersedia dari platform.">{r.narratives.length?<ol className="po-narrative-list">{r.narratives.slice(0,6).map((g,i)=>{const accounts=new Set(g.posts.map(p=>p.platform+'|'+p.author)).size,kpis=[['Interaksi',sumOf(g.posts,'interactions'),PulseBeat],['Dibagikan',contentShares(g.posts),PulseShare],['Tayangan',sumOf(g.posts,'views'),PulseView]],tone=g.posts.reduce((t,p)=>{t[postSentiment(p)]=(t[postSentiment(p)]||0)+1;return t;},{}),lead=['negative','neutral','positive'].sort((a,b)=>(tone[b]||0)-(tone[a]||0))[0];
     return <li key={g.id}><button type="button" onClick={()=>open('Kelompok percakapan',g.posts)} aria-label={`Narasi ${i+1}: ${g.title.slice(0,140)}. ${g.posts.length} posting dari ${accounts} akun. Periksa posting.`}><span className="po-narrative-rank" aria-hidden="true">{i+1}</span><span className="po-narrative-body"><strong>{g.title.slice(0,140)}{g.title.length>140?'…':''}</strong><small>{dateRange(g.posts)&&<time>{dateRange(g.posts)}</time>}{dateRange(g.posts)?' · ':''}{formatCount(g.posts.length)} posting · {formatCount(accounts)} akun{change&&g.posts.length-g.previous>0?` · +${g.posts.length-g.previous} dari periode sebelumnya`:''}</small><span className="po-narrative-kpis">{kpis.map(([label,value,icon])=><span key={label} title={label}>{createElement(icon,{size:14})}<b>{value==null?'—':formatCount(value)}</b>{label.toLowerCase()}</span>)}{tone[lead]>0&&<SentimentTag size="sm" value={lead}/>}</span></span><PulseArrow/></button></li>;})}</ol>:<PulsePanelEmpty title="Belum ada narasi berulang" action={<Link className="po-more" to={page('posts')}>Buka semua posting <PulseArrow/></Link>}>Belum ada kelompok berisi lebih dari satu posting pada pilihan ini.</PulsePanelEmpty>}</AnalyticsPanel></div>
   <div className="lay-4">
    <AnalyticsPanel title="Sumber percakapan" description="Jumlah posting per platform, bukan estimasi audiens.">
     {r.platforms.length?<PulseBreakdown total={total} rows={r.platforms.map(row=>({key:row.platform,label:platformLabel(row.platform),value:row.count,color:platformColor(row.platform),leading:<PlatformIcon platform={row.platform} size={16}/>,onClick:()=>open(platformLabel(row.platform),r.posts.filter(p=>p.platform===row.platform))}))}/>:<PulsePanelEmpty action={<PulseButton onClick={()=>onPlatformsChange(null)}>Tampilkan semua platform</PulseButton>}>Belum ada sumber dalam pilihan ini.</PulsePanelEmpty>}
    </AnalyticsPanel>
   </div>
  </section>
  <section id="overview-insights" className="lay-grid">
   <div className="lay-6"><MostSeenPanel posts={r.posts}/></div>
   <div className="lay-6"><AnalyticsPanel title="Posting teratas" description="Konten yang paling banyak memperoleh interaksi."><div className="po-top-posts">{r.topPosts.map(p=><TopPostSummary key={p.id} post={p} onOpen={()=>open('Posting teratas',[p])}/>)}</div></AnalyticsPanel></div>
   <div className="lay-8"><TagPanel posts={r.posts} search={params.toString()}/></div>
   <div className="lay-4"><EmojiPanel posts={r.posts}/></div>
  </section>
  <section id="overview-drivers" className="lay-grid">
   <div className="lay-6"><AnalyticsPanel title="Penggerak percakapan" description="Akun dengan interaksi tertinggi dalam pilihan ini."><ol className="po-leaders">{r.accounts.slice(0,5).map((a,i)=><li key={a.platform+a.author}><button onClick={()=>open('Posting '+a.author,r.posts.filter(p=>p.author===a.author&&p.platform===a.platform))}><span className="po-rank">{i+1}</span><PostAvatar post={a.post}/><span className="po-account"><strong>{a.author}</strong><small>{platformLabel(a.platform)} · {a.mentions} posting</small></span><span className="po-account-metric"><strong>{formatCount(a.engagement)}</strong><small>interaksi <PulseArrow/></small></span></button></li>)}</ol>{!r.accounts.length&&<p>Belum ada akun tersedia.</p>}<small>Interaksi bukan jumlah orang unik atau bukti pengaruh kausal.</small></AnalyticsPanel></div>
   <div id="overview-interactions" className="lay-6 po-eng-stack"><AnalyticsPanel title="Rincian interaksi" description="Jenis interaksi pada posting dalam pilihan ini, beserta dua indikator turunannya." footer="Snapshot terakhir tiap posting. Metrik yang tidak dikirim sumber tidak dihitung sebagai nol, sehingga jumlah posting per metrik dapat berbeda."><PulseEngagement posts={r.posts}/></AnalyticsPanel></div>
  </section>
  <div className="lay-grid"><div className="lay-12"><GrowthEvidence data={extra.growth} posts={r.posts} onOpen={open} loaded={extra.loaded}/></div></div>
  <section id="overview-spread" className="lay-grid">
   <div className="lay-12"><Suspense fallback={<AnalyticsPanel title="Sebaran tempat" description="Memuat peta…"><p className="po-empty" role="status">Memuat peta…</p></AnalyticsPanel>}><RegionSpreadSummary posts={r.posts} to={page('network') + '&focus=map'}/></Suspense></div>
   <div className="lay-6"><AnalyticsPanel title="Penyebaran percakapan" description="Urutan publikasi paling awal yang tersedia pada setiap platform."><ol className="po-spread">{r.platformTimeline.map(p=><li key={p.platform}><PlatformIcon platform={p.platform}/><strong>{platformLabel(p.platform)}</strong><span>Publikasi awal: {pulseDate(p.firstPublished)}</span><small>Pertama ditemukan: {pulseDate(p.firstObserved)}</small><PulseButton onClick={()=>open(platformLabel(p.platform),r.posts.filter(post=>post.platform===p.platform))}>{p.count} posting <PulseArrow/></PulseButton></li>)}</ol><p className="po-panel-note">Urutan waktu tidak membuktikan platform asal. Hubungan repost harus didukung tautan atau bukti langsung.</p><Link to={page('network')}>Buka timeline & network akun <PulseArrow/></Link></AnalyticsPanel></div>
   <div id="overview-response" className="lay-6"><AnalyticsPanel title="Suara di komentar" description={`${formatCount(comments.length)} komentar tersedia pada posting pilihan ini.`}>{comments.slice(0,3).map(c=><blockquote key={c.post.id+c.id}><p>{c.text}</p><footer>{c.author||'Penulis'} · {formatCount(c.likes)} suka</footer></blockquote>)}{!comments.length&&<p className="po-empty">Komentar belum tersedia untuk pilihan ini. Sentimen caption tidak digunakan sebagai pengganti sentimen komentar.</p>}<Link to={page('comments')}>Lihat komentar <PulseArrow/></Link></AnalyticsPanel></div>
  </section>
 <section id="overview-words"><InfographicsPanel posts={r.posts}/></section>
 </div>;
}
import TopPostSummary from './TopPostSummary';
