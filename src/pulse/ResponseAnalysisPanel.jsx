import { PulseArrow } from '../components/ui/PulseArrow';
import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {PulseStat,PulseStatGrid} from '../components/ui/PulseAnalytics';
import {responseEvidence,stanceLabels,commentLabels} from '../lib/pulseResponse';
import {safeSourceUrl} from '../lib/pulseData';
import {sourceText} from '../lib/pulseOverview';
import {PulseButton} from '../components/ui/PulseUI';
import useResponseAnalysis from './useResponseAnalysis';
import './response-analysis.css';
import InfoTip from './InfoTip';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from '../components/ui/shadcn/card';

const scopeNote='Cakupan komentar mengikuti platform dan tanggal publikasi posting induknya (WIB), bukan tanggal komentar.';
const stanceNote='Mendukung atau menolak berarti sikap yang dinyatakan dalam teks terhadap isu, bukan identitas atau afiliasi penulis. Berita dan kutipan tanpa sikap eksplisit masuk “Tidak jelas / hanya membahas”. Sentimen negatif tidak otomatis berarti menolak.';

function Breakdown({title,counts,labels,onSelect,printable}){
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 return <Card className="pra-breakdown"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{total.toLocaleString('id-ID')} {title.includes('posting')?'posting':'komentar'} dalam filter</CardDescription></CardHeader><CardContent>{Object.entries(labels).map(([key,label])=>{
  const value=counts[key]||0,percent=total?value/total*100:0;
  const content=<><span>{label}</span><strong>{value.toLocaleString('id-ID')} <small>{percent.toLocaleString('id-ID',{maximumFractionDigits:1})}%</small></strong><span className="pra-track" aria-hidden="true"><i style={{width:`${percent}%`}}/></span></>;
  return printable?<div className={'pra-row '+key} key={key}>{content}</div>:<button type="button" aria-label={`${label}: ${value}, ${percent.toFixed(1)}%. Lihat sumber`} className={'pra-row '+key} key={key} onClick={()=>onSelect(key)}>{content}</button>;
 })}</CardContent>{!printable&&<CardFooter><span className="pra-chart-hint">Klik kategori untuk membaca sumber <PulseArrow/></span></CardFooter>}</Card>;
}
export function ResponseAnalysisView({posts=[],response,loaded=false,error=false,printable=false}){
 const [choice,setChoice]=useState(null);
 const r=responseEvidence(posts,response),total=r.comments.length,postTotal=r.posts.length;
 const analyzedComments=total-r.commentCounts.unknown,analyzedPosts=postTotal-r.stanceCounts.unknown;
 const select=(kind,label)=>setChoice({kind,label});
 const rows=choice?(choice.kind==='post'?r.posts:r.comments).filter(row=>(choice.kind==='sentiment'?row.sentiment:row.stance)?.label===choice.label||(choice.label==='unknown'&&!(choice.kind==='sentiment'?row.sentiment:row.stance))):[];
 const progress=response?.progress;
 return <section className={'pra-analysis '+(printable?'pra-print':'')} aria-label="Analisis respons dan sikap">
  <header><div><h2>Respons & sikap terhadap isu {!printable&&<InfoTip label="Tentang respons dan sikap"><p>{scopeNote}</p><p>{stanceNote}</p></InfoTip>}</h2><p>Target analisis: <strong>{r.target||'Menunggu konteks project'}</strong></p></div></header>
  {!loaded&&<p role="status">Memuat hasil analisis respons…</p>}
  {error&&<p role="alert">Hasil analisis respons belum dapat dimuat. Angka belum dianalisis di bawah bukan hasil model.</p>}
  {printable&&<p className="pra-coverage">{analyzedComments} dari {total} komentar memiliki hasil sentimen. {analyzedPosts} dari {postTotal} posting memiliki hasil sikap.{analyzedComments<total||analyzedPosts<postTotal?' Analisis belum lengkap.':''}</p>}
  {progress&&<p className="pra-status">Antrean project: {progress.running||0} diproses · {progress.pending||0} menunggu · {progress.failed||0} perlu dicoba kembali. Angka hasil di bawah mengikuti posting dalam filter.</p>}
  <div className="pra-columns">
   <Breakdown title="Sentimen komentar" counts={r.commentCounts} labels={commentLabels} printable={printable} onSelect={label=>select('sentiment',label)}/>
   <Breakdown title="Sikap dalam posting" counts={r.stanceCounts} labels={stanceLabels} printable={printable} onSelect={label=>select('post',label)}/>
   <Breakdown title="Sikap dalam komentar" counts={r.commentStanceCounts} labels={stanceLabels} printable={printable} onSelect={label=>select('comment',label)}/>
  </div>
  {!total&&<p>Belum ada isi komentar pada posting yang dipilih. Statistik jumlah komentar tidak menggantikan teks komentar.</p>}
  {printable&&<><p className="pra-note">{scopeNote}</p><p className="pra-note">{stanceNote}</p></>}
  {choice&&!printable&&<section className="pra-evidence" aria-label="Sumber analisis respons"><header><h3>{choice.kind==='sentiment'?commentLabels[choice.label]:stanceLabels[choice.label]} · {rows.length} {choice.kind==='post'?'posting':'komentar'}</h3><PulseButton onClick={()=>setChoice(null)}>Tutup rincian</PulseButton></header><ol>{rows.slice(0,20).map(row=>{
   const result=choice.kind==='sentiment'?row.sentiment:row.stance,url=safeSourceUrl(row.url);
   return <li key={(row.post?.id||row.id)+':'+row.id}><strong>{row.author||'Penulis tidak tersedia'}</strong><p>{sourceText(row)||'Teks tidak tersedia'}</p><p className="pra-reason"><b>Alasan: </b>{result?.reason||'Belum ada hasil analisis.'}</p>{result&&(result.review_needed||result.confidence<0.65)&&<span className="pra-review">Perlu ditinjau</span>}{url&&<a href={url} target="_blank" rel="noopener noreferrer">Buka sumber asli <PulseArrow/></a>}</li>;
  })}</ol>{!rows.length&&<p>Tidak ada hasil dalam kategori ini pada filter terpilih.</p>}{rows.length>20&&<p>Menampilkan 20 sumber pertama dari {rows.length}.</p>}</section>}
 </section>;
}
export default function ResponseAnalysisPanel({posts=[],topicId,printable=false}){
 const state=useResponseAnalysis(topicId);
 return <ResponseAnalysisView key={topicId} posts={posts} {...state} printable={printable}/>;
}

/** Leading figure of a breakdown: the largest known category, or null when nothing is analysed. */
function leading(counts,labels){
 const known=Object.entries(counts).filter(([key,value])=>key!=='unknown'&&value>0).sort((a,b)=>b[1]-a[1]);
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 return known.length?{label:labels[known[0][0]],count:known[0][1],share:total?Math.round(known[0][1]/total*100):0}:null;
}
/** Three figures and a link. The full breakdown lives on Komentar; other pages only point to it. */
export function ResponseAnalysisSummary({posts=[],topicId}){
 const [params]=useSearchParams();
 const state=useResponseAnalysis(topicId);
 const r=responseEvidence(posts,state.response),total=r.comments.length;
 const analyzed=total-r.commentCounts.unknown;
 const tone=leading(r.commentCounts,commentLabels),stance=leading(r.stanceCounts,stanceLabels);
 const to='/pulse/comments?'+params;
 return <section className="pra-summary" aria-label="Ringkasan respons dan sikap">
  <header><h2>Respons &amp; sikap</h2><Link to={to}>Buka analisis lengkap di Komentar <PulseArrow/></Link></header>
  <PulseStatGrid label="Ringkasan respons dan sikap">
   <PulseStat as={Link} to={to} label="Komentar dianalisis" value={state.loaded?analyzed:'Memuat…'} note={total?`dari ${total.toLocaleString('id-ID')} komentar tersimpan`:'Belum ada isi komentar tersimpan'}/>
   <PulseStat as={Link} to={to} label="Nada komentar terbanyak" value={tone?tone.label:'Belum tersedia'} note={tone?`${tone.count.toLocaleString('id-ID')} komentar · ${tone.share}%`:'Menunggu hasil analisis'}/>
   <PulseStat as={Link} to={to} label="Sikap posting terbanyak" value={stance?stance.label:'Belum tersedia'} note={stance?`${stance.count.toLocaleString('id-ID')} posting · ${stance.share}%`:'Menunggu hasil analisis'}/>
  </PulseStatGrid>
 </section>;
}
