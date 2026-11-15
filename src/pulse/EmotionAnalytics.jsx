import { PulseArrow } from '../components/ui/PulseArrow';
import {useState} from 'react';
import {BarChart,Bar,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {emotionEvidence,emotionFaces,emotionLabels,postEmotion} from '../lib/pulseEmotion';
import {safeSourceUrl,pulseDate} from '../lib/pulseData';
import {sourceText} from '../lib/pulseOverview';
import {sentimentDate} from '../lib/pulseSentiment';
import {PlatformLabel} from '../components/admin/pulse/PlatformIcon';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import {PulseRange} from '../components/ui/PulseRange';
import {allRange,rangeBounds,resolveRange,withinRange} from '../lib/pulseRange';
import './emotion-analytics.css';

const faces=emotionFaces;
const emotionalKeys=Object.keys(emotionLabels).filter(key=>key!=='none');
export default function EmotionAnalytics({posts=[]}){
 // The range filter narrows the whole card, so the tiles, the daily bars and the sources always count the same posts.
 // Its days are the days that have an emotion result; "Semua" keeps every post, dated or not.
 const whole=emotionEvidence(posts),bounds=rangeBounds(whole.days.map(row=>row.date));
 const [range,setRange]=useState(allRange),shown=resolveRange(bounds,range);
 const data=shown&&shown.key!=='all'?emotionEvidence(withinRange(posts,shown,sentimentDate)):whole;
 const [selected,setSelected]=useState(null),[day,setDay]=useState(null),[limit,setLimit]=useState(10);
 const choose=(key,date=null)=>{setSelected(key);setDay(date);setLimit(10);};
 const rows=selected?(data.rows[selected]||[]).filter(post=>!day||sentimentDate(post)===day):[];
 return <AnalyticsPanel title={<span>Emosi percakapan <InfoTip label="Tentang analisis emosi">Emosi yang dinyatakan dalam teks, bukan kondisi psikologis penulis atau opini seluruh publik. Satu emosi dominan per posting. Sentimen negatif tidak otomatis marah. Persentase dihitung dari posting yang sudah memiliki hasil emosi, termasuk Tidak jelas. Ilustrasi hanya penanda kategori.</InfoTip></span>} label="Emosi percakapan" description="Apa nada emosional di balik percakapan?" className="pea-panel"
  actions={bounds&&<PulseRange chart="Emosi percakapan" bounds={bounds} value={range} onChange={next=>{setRange(next);setDay(null);setLimit(10);}}/>}>
  {data.analyzed?<>
  <div className="pea-emotions">{emotionalKeys.map(key=>{const count=data.counts[key],percent=data.analyzed?count/data.analyzed*100:0;return <button type="button" key={key} className={'pea-emotion '+key} aria-pressed={selected===key&&!day} aria-label={`${emotionLabels[key]}: ${count} posting. Lihat sumber`} onClick={()=>choose(key)}><span className="pea-face" aria-hidden="true">{faces[key]}</span><span className="pea-label">{emotionLabels[key]}</span><strong>{data.analyzed?count.toLocaleString('id-ID'):'—'}</strong><small>{data.analyzed?`${percent.toLocaleString('id-ID',{maximumFractionDigits:1})}%`:'Belum tersedia'}</small><span className="pea-bar" aria-hidden="true"><i style={{width:`${percent}%`}}/></span></button>;})}</div>
  <div className="pea-other"><button type="button" onClick={()=>choose('none')} aria-pressed={selected==='none'}><span aria-hidden="true">{faces.none}</span> Tidak jelas / tanpa emosi <strong>{data.counts.none}</strong></button><span>{data.unknown} belum dianalisis</span>{data.review>0&&<span>{data.review} perlu ditinjau</span>}</div>
  </>:<p className="pea-empty">Hasil emosi belum tersedia pada filter ini{data.unknown>0?` (${data.unknown.toLocaleString('id-ID')} posting belum dianalisis)`:''}. Analisis berikutnya akan mengisi kategori secara otomatis; label sentimen lama tidak diubah menjadi emosi.</p>}
  {data.days.length>0&&<div className="pea-trend"><h3>Perkembangan emosi</h3><div className="pea-chart" role="img" aria-label="Jumlah posting per emosi dan tanggal WIB. Tautan kategori dan data harian tersedia di bawah."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.days}><CartesianGrid vertical={false} stroke="var(--ps-line)"/><XAxis dataKey="date" tickFormatter={v=>v.slice(5)} tick={{fill:'var(--ps-muted)',fontSize:12}}/><YAxis allowDecimals={false} width={32} tick={{fill:'var(--ps-muted)',fontSize:12}}/><Tooltip contentStyle={{background:'var(--ps-panel)',color:'var(--ps-ink)',borderColor:'var(--ps-line)'}}/>{Object.keys(emotionLabels).map(key=><Bar key={key} dataKey={key} name={emotionLabels[key]} stackId="emotions" fill={`var(--emotion-${key})`} isAnimationActive={false} cursor="pointer" onClick={row=>choose(key,row.date)}/>)}</BarChart></ResponsiveContainer></div><details><summary>Data harian · WIB</summary><div className="pea-table"><table><thead><tr><th>Tanggal</th>{Object.values(emotionLabels).map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{data.days.map(row=><tr key={row.date}><th>{row.date}</th>{Object.keys(emotionLabels).map(key=><td key={key}><button type="button" onClick={()=>choose(key,row.date)} aria-label={`${row.date}, ${emotionLabels[key]}: ${row[key]} posting`}>{row[key]}</button></td>)}</tr>)}</tbody></table></div></details></div>}
  {selected&&<section className="pea-evidence" aria-label="Posting sumber emosi"><header><h3>{emotionLabels[selected]}{day?` · ${day}`:''} <span>{rows.length} posting</span></h3><button type="button" onClick={()=>choose(null)}>Tutup rincian</button></header>{!rows.length?<p>Belum ada posting dengan label emosi ini dalam filter terpilih.</p>:<ol>{rows.slice(0,limit).map(post=>{const value=postEmotion(post),url=safeSourceUrl(post.url);return <li key={post.id}><div className="pea-identity"><PostAvatar post={post}/><div><strong>{post.author||'Sumber tanpa nama'}</strong><span><PlatformLabel platform={post.platform}/> · {pulseDate(post.published_at)}</span></div></div><p>{sourceText(post)}</p><p className="pea-reason"><strong>Alasan label:</strong> {value.reason}</p>{(value.review_needed||value.confidence<.7)&&<span className="pea-review">Perlu ditinjau</span>}{url&&<a href={url} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow/></a>}</li>;})}</ol>}{rows.length>limit&&<button type="button" onClick={()=>setLimit(v=>v+10)}>Tampilkan 10 sumber berikutnya</button>}</section>}
 </AnalyticsPanel>;
}
