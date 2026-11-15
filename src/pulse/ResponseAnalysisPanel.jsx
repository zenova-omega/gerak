import { readingNeedsReview } from '../lib/pulseCommentReview';
import { PulseArrow } from '../components/ui/PulseArrow';
import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {PulseStat,PulseStatGrid} from '../components/ui/PulseAnalytics';
import {analysedShares,responseEvidence,stanceLabels,commentLabels} from '../lib/pulseResponse';
import {safeSourceUrl} from '../lib/pulseData';
import {sourceText} from '../lib/pulseOverview';
import {PulseButton} from '../components/ui/PulseUI';
import useResponseAnalysis from './useResponseAnalysis';
import './response-analysis.css';
import InfoTip from './InfoTip';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from '../components/ui/shadcn/card';

const scopeNote='Cakupan komentar mengikuti platform dan tanggal publikasi posting induknya (WIB), bukan tanggal komentar.';
const stanceNote='Mendukung atau menolak berarti sikap yang dinyatakan dalam teks terhadap isu, bukan identitas atau afiliasi penulis. Berita dan kutipan tanpa sikap eksplisit masuk “Tidak jelas / hanya membahas”. Sentimen negatif tidak otomatis berarti menolak.';

const num=value=>value.toLocaleString('id-ID');
/** One breakdown card. Shares are read over the analysed rows; the rows still waiting are shown as a count, without a share. */
function Breakdown({title,counts,labels,onSelect,printable,foldUniform=false}){
 const shares=analysedShares(counts),noun=title.includes('posting')?'posting':'komentar';
 const top=Object.keys(labels).filter(key=>key!=='unknown').sort((a,b)=>(counts[b]||0)-(counts[a]||0))[0],topShare=shares.analysed?(counts[top]||0)/shares.analysed:0;
 const uniform=foldUniform&&!printable&&shares.analysed>=20&&topShare>=.95;
 const card=<Card className="pra-breakdown"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{shares.analysed<shares.total?`${num(shares.analysed)} dari ${num(shares.total)} ${noun} sudah dianalisis`:`${num(shares.total)} ${noun} dianalisis`}</CardDescription></CardHeader><CardContent>{Object.entries(labels).map(([key,label])=>{
  const value=counts[key]||0,percent=shares.percent(key),share=percent==null?null:percent.toLocaleString('id-ID',{maximumFractionDigits:1})+'%';
  if(key==='unknown'&&!value)return null;
  const content=<><span>{label}</span><strong>{num(value)}{share&&<> <small>{share}</small></>}</strong>{percent!=null&&<span className="pra-track" aria-hidden="true"><i style={{width:`${percent}%`}}/></span>}</>;
  const spoken=`${label}: ${num(value)}${share?`, ${share} dari yang sudah dianalisis`:''}`;
  return printable?<div className={'pra-row '+key} key={key}>{content}</div>:<button type="button" aria-label={`${spoken}. Lihat sumber`} className={'pra-row '+key} key={key} onClick={()=>onSelect(key)}>{content}</button>;
 })}</CardContent>{!printable&&<CardFooter><span className="pra-chart-hint">{shares.analysed?'Persentase dari yang sudah dianalisis. ':''}Klik kategori untuk membaca sumber <PulseArrow/></span></CardFooter>}</Card>;
 return uniform?<details className="pra-uniform"><summary><strong>{title}</strong><span>{Math.round(topShare*100)}% {labels[top].toLowerCase()}; tidak ada perbedaan sikap yang terbaca</span></summary>{card}</details>:card;
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
  {printable&&<p className="pra-coverage">{num(analyzedComments)} dari {num(total)} komentar memiliki hasil sentimen. {num(analyzedPosts)} dari {num(postTotal)} posting memiliki hasil sikap.{analyzedComments<total||analyzedPosts<postTotal?' Analisis belum lengkap.':''}</p>}
  {progress&&(progress.pending||progress.running||progress.failed)?<p className="pra-status">Analisis berjalan otomatis: {num((progress.pending||0)+(progress.running||0))} menunggu giliran{progress.failed?`, ${num(progress.failed)} perlu diulang`:''}. Angka di bawah mengikuti posting dalam filter.</p>:null}
  <div className="pra-columns">
   <Breakdown title="Sentimen komentar" counts={r.commentCounts} labels={commentLabels} printable={printable} onSelect={label=>select('sentiment',label)}/>
   <Breakdown title="Sikap dalam posting" counts={r.stanceCounts} labels={stanceLabels} printable={printable} foldUniform onSelect={label=>select('post',label)}/>
   <Breakdown title="Sikap dalam komentar" counts={r.commentStanceCounts} labels={stanceLabels} printable={printable} foldUniform onSelect={label=>select('comment',label)}/>
  </div>
  {!total&&<p>Belum ada isi komentar pada posting yang dipilih. Statistik jumlah komentar tidak menggantikan teks komentar.</p>}
  {printable&&<><p className="pra-note">{scopeNote}</p><p className="pra-note">{stanceNote}</p></>}
  {choice&&!printable&&<section className="pra-evidence" aria-label="Sumber analisis respons"><header><h3>{choice.kind==='sentiment'?commentLabels[choice.label]:stanceLabels[choice.label]} · {num(rows.length)} {choice.kind==='post'?'posting':'komentar'}</h3><PulseButton onClick={()=>setChoice(null)}>Tutup rincian</PulseButton></header><ol>{rows.slice(0,20).map(row=>{
   const result=choice.kind==='sentiment'?row.sentiment:row.stance,url=safeSourceUrl(row.url);
   return <li key={(row.post?.id||row.id)+':'+row.id}><span className="pu-account-line"><AccountAvatar size="sm" author={row.author} platform={row.platform||row.post?.platform} photo={row.profile_image_url} /><strong>{row.author||'Penulis tidak tersedia'}</strong></span><p>{sourceText(row)||'Teks tidak tersedia'}</p><p className="pra-reason"><b>Alasan: </b>{result?.reason||'Belum ada hasil analisis.'}</p>{readingNeedsReview(result,choice.kind==='sentiment'?'sentiment':'stance')&&<span className="pra-review">Perlu ditinjau</span>}{url&&<a href={url} target="_blank" rel="noopener noreferrer">Buka sumber asli <PulseArrow/></a>}</li>;
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
 const shares=analysedShares(counts);
 return known.length?{label:labels[known[0][0]],count:known[0][1],share:Math.round(shares.percent(known[0][0])||0)}:null;
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
   <PulseStat as={Link} to={to} label="Komentar dianalisis" value={state.loaded?analyzed.toLocaleString('id-ID'):'Memuat…'} note={total?`dari ${total.toLocaleString('id-ID')} komentar tersimpan`:'Belum ada isi komentar tersimpan'}/>
   <PulseStat as={Link} to={to} label="Nada komentar terbanyak" value={tone?tone.label:'Belum tersedia'} note={tone?`${tone.count.toLocaleString('id-ID')} komentar · ${tone.share}% dari yang dianalisis`:'Menunggu hasil analisis'}/>
   <PulseStat as={Link} to={to} label="Sikap posting terbanyak" value={stance?stance.label:'Belum tersedia'} note={stance?`${stance.count.toLocaleString('id-ID')} posting · ${stance.share}% dari yang dianalisis`:'Menunggu hasil analisis'}/>
  </PulseStatGrid>
 </section>;
}
