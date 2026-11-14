import { PulseArrow } from '../components/ui/PulseArrow';
import {useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {BarChart,Bar,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import {sentimentCounts,sentimentLabels} from '../lib/pulsePostFilters';
import {sentimentTimeline,sentimentDayEvidence} from '../lib/pulseSentiment';
import {postsEvidenceLink} from '../lib/pulseDrilldown';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import SentimentEvidenceCard from './SentimentEvidenceCard';
import './overview-analytics.css';
import './sentiment-analytics.css';
import EmotionAnalytics from './EmotionAnalytics';
import {PulseStat,PulseStatGrid,PulseLegend,PulseChartTooltip} from '../components/ui/PulseAnalytics';
import {sentimentColor,sentimentOrder,sentimentTone,sharePercent} from '../lib/pulseChartTheme';

const colors=sentimentColor;
const labels=sentimentOrder.map(key=>[key,sentimentLabels[key]]);
const fill=key=>key==='unknown'?'url(#psa-hatch-unknown)':colors[key];
export default function SentimentAnalytics({data}) {
  const [params]=useSearchParams();
  const navigate=useNavigate();
  const posts=data.posts||[];
  const days=sentimentTimeline(posts);
  const counts=sentimentCounts(posts);
  const [selectedDay,setSelectedDay]=useState('');
  const [selectedLabel,setSelectedLabel]=useState('negative');
  const date=days.some(row=>row.date===selectedDay)?selectedDay:days.at(-1)?.date||'';
  const evidence=sentimentDayEvidence(posts,date,selectedLabel);
  const dated=days.reduce((sum,row)=>sum+row.total,0);
  const link=filters=>postsEvidenceLink(params.toString(),filters);
  const platforms=[...new Set(posts.map(post=>post.platform||'unknown'))];
  return <div className="po-overview psa-page">
    <PulseStatGrid label="Jumlah posting per sentimen" className="psa-stats">{labels.map(([key,label])=><PulseStat key={key} as={Link} to={link({sentiment:key})} tone={sentimentTone[key]} label={label} value={counts[key]} trend={days.map(row=>row[key])} note={key==='unknown'?'Belum tersedia':`${sharePercent(counts[key],Object.values(counts).reduce((sum,value)=>sum+value,0))||'0%'} dari seluruh posting`}/>)}</PulseStatGrid>
    <EmotionAnalytics key={params.toString()} posts={posts}/>
    <AnalyticsPanel title="Tren sentimen" description="Klik segmen warna untuk membuka posting pada tanggal dan sentimen tersebut." footer={`Tanggal publikasi dalam WIB, bukan waktu analisis AI. ${posts.length-dated} posting tanpa tanggal valid tidak masuk grafik. Tanggal tanpa data bukan berarti tidak ada percakapan.`}>
      {days.length?<><div className="po-chart psa-chart" role="img" aria-label="Grafik sentimen harian. Tabel tautan yang dapat diakses tersedia di bawah."><ResponsiveContainer width="100%" height="100%"><BarChart data={days} barCategoryGap="22%"><defs><pattern id="psa-hatch-unknown" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--ps-sent-unknown)"/></pattern></defs><CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={value=>value.slice(5)} minTickGap={28} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/><Tooltip cursor={{fill:'var(--ps-soft)'}} content={<PulseChartTooltip total/>}/>{labels.map(([key,label])=><Bar key={key} dataKey={key} name={label} stackId="sentiment" fill={fill(key)} maxBarSize={44} isAnimationActive={false} cursor="pointer" onClick={row=>{if(row?.date)navigate(link({day:row.date,sentiment:key}));}}/>)}</BarChart></ResponsiveContainer></div>
      <PulseLegend items={labels.map(([key,label])=>({key,label,color:colors[key],hatch:key==='unknown',value:counts[key]}))}/>
      <details className="po-data"><summary>Data harian & tautan posting</summary><div className="psa-table"><table><thead><tr><th>Tanggal WIB</th>{labels.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{days.map(row=><tr key={row.date}><th><button type="button" onClick={()=>setSelectedDay(row.date)} aria-label={`Telusuri perubahan ${row.date}`}>{row.date}</button></th>{labels.map(([key,label])=><td key={key}><Link aria-label={`${row.date}, ${label}: ${row[key]} posting`} to={link({day:row.date,sentiment:key})}>{row[key]} <PulseArrow/></Link></td>)}</tr>)}</tbody></table></div></details></>:<p className="po-empty">Belum ada posting bertanggal pada periode ini. Pilih rentang lain atau periksa Sumber & Cakupan.</p>}
    </AnalyticsPanel>
    <AnalyticsPanel title="Apa yang berkontribusi pada perubahan?" description="Telusuri posting di balik angka, lalu periksa konteks sumbernya." footer="Kontribusi dihitung dari posting terkumpul, bukan bukti sebab-akibat atau opini seluruh publik. Sentimen teks tidak otomatis menunjukkan sikap terhadap tokoh.">
      {date?<><div className="psa-controls"><label>Tanggal publikasi<select value={date} onChange={event=>setSelectedDay(event.target.value)}>{days.map(row=><option key={row.date}>{row.date}</option>)}</select></label><label>Sentimen<select value={selectedLabel} onChange={event=>setSelectedLabel(event.target.value)}>{labels.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><Link to={link({day:date,sentiment:selectedLabel})}>Lihat {evidence.posts.length} posting terkait <PulseArrow/></Link></div>
      <div className="psa-change"><strong>{evidence.current?.[selectedLabel]||0} posting {sentimentLabels[selectedLabel].toLowerCase()} · {date}</strong><p>{evidence.delta===null?(evidence.previous?'Belum dapat dibandingkan: salah satu hari belum memiliki hasil analisis sentimen.':`Belum dapat dibandingkan: tidak ada data ${evidence.previousDate} dalam cakupan terpilih.`):`${evidence.delta>0?'+':''}${evidence.delta} posting dibanding ${evidence.previousDate} (${evidence.previous[selectedLabel]} posting).`}</p><p>Perbandingan berdasarkan hasil sentimen yang tersedia pada masing-masing hari.</p></div>
      <p className="po-panel-note">Maksimal 5 posting, diurutkan berdasarkan interaksi teramati.</p>
      <ol className="psa-evidence">{evidence.posts.slice(0,5).map(post=><SentimentEvidenceCard key={post.id} post={post} selectedLabel={selectedLabel} accountLink={link({day:date,sentiment:selectedLabel,author:post.author,platform:post.platform})}/>)}</ol>{!evidence.posts.length&&<p className="po-empty">Tidak ada posting dengan sentimen ini pada tanggal terpilih. Pilih kategori atau tanggal lain.</p>}</>:<p className="po-empty">Perbandingan akan tersedia setelah ada posting bertanggal.</p>}
    </AnalyticsPanel>
    <AnalyticsPanel title="Sentimen per platform" description="Jumlah posting, bukan estimasi jangkauan. Klik angka untuk memeriksa sumber."><div className="psa-table"><table><thead><tr><th>Platform</th>{labels.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{platforms.map(platform=>{const row=sentimentCounts(posts.filter(post=>post.platform===platform));return <tr key={platform}><th><PlatformIcon platform={platform}/> {platformLabel(platform)}</th>{labels.map(([key,label])=><td key={key}><Link aria-label={`${platformLabel(platform)}, ${label}: ${row[key]} posting`} to={link({platform,sentiment:key})}>{row[key]} <PulseArrow/></Link></td>)}</tr>;})}</tbody></table></div>{!posts.length&&<p className="po-empty">Belum ada data platform pada periode terpilih.</p>}</AnalyticsPanel>
  </div>;
}
