import { PulseArrow } from '../components/ui/PulseArrow';
import {useMemo,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {BarChart,Bar,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import {sentimentCounts,sentimentLabels,postSentiment} from '../lib/pulsePostFilters';
import {topEmoji} from '../lib/pulseEmoji';
import EmojiCloud from './EmojiCloud';
import {postInteractions} from '../lib/pulseEngagement';
import {PulseTag} from '../components/ui/PulseTag';
import {formatCount} from '../lib/pulseData';
import {sentimentTimeline,sentimentRangeEvidence,sentimentRanges,sentimentDate as sentimentDayOf} from '../lib/pulseSentiment';
import {postsEvidenceLink} from '../lib/pulseDrilldown';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import SentimentEvidenceCard from './SentimentEvidenceCard';
import './overview-analytics.css';
import './sentiment-analytics.css';
import EmotionAnalytics from './EmotionAnalytics';
import useHideUnknown from './useHideUnknown';
import { UnanalysedToggle } from './UnanalysedToggle';
import {PulseLegend,PulseChartTooltip,PulseStat,PulseStatGrid} from '../components/ui/PulseAnalytics';
import {recentChange,deltaIntent} from '../lib/pulseTrend';
import VoiceOverview from './VoiceOverview';
import useResponseAnalysis from './useResponseAnalysis';
import {responseEvidence} from '../lib/pulseResponse';
import {inVoice,kindHints,kindLabels,kindOrder,neutralBreakdown,neutralKind,publicOpinion,voiceLabels,voiceOf} from '../lib/pulseVoice';
import {sentimentColor,sentimentOrder,sentimentTone} from '../lib/pulseChartTheme';

const colors=sentimentColor;
const labels=sentimentOrder.map(key=>[key,sentimentLabels[key]]);
const fill=key=>key==='unknown'?'url(#psa-hatch-unknown)':colors[key];
export default function SentimentAnalytics({data,topicId}) {
  const [params,setParams]=useSearchParams();
  const navigate=useNavigate();
  const allPosts=useMemo(()=>data.posts||[],[data.posts]);
  // Public opinion is read from analysed comments; the two post voices are compared beside it.
  const analysis=useResponseAnalysis(topicId);
  const opinion=useMemo(()=>publicOpinion(responseEvidence(allPosts,analysis.response).comments),[allPosts,analysis.response]);
  // Everything below the top card details one voice: the public's posts unless the reader picks the press or both.
  const hasPublic=allPosts.some(post=>voiceOf(post)==='public');
  const voice=['public','news','all'].includes(params.get('voice'))?params.get('voice'):hasPublic?'public':'all';
  const setVoice=value=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('voice',value);return next;},{replace:true});
  const posts=useMemo(()=>inVoice(allPosts,voice),[allPosts,voice]);
  const voicePlatforms=voice==='all'?'':voice==='news'?'news':[...new Set(posts.map(post=>post.platform).filter(Boolean))].sort().join(',');
  const days=sentimentTimeline(posts);
  const counts=sentimentCounts(posts);
  const [selectedDay,setSelectedDay]=useState('');
  const [selectedLabel,setSelectedLabel]=useState('negative');
  const date=days.some(row=>row.date===selectedDay)?selectedDay:days.at(-1)?.date||'';
  // Evidence range: a preset anchored on the last day with data, one chosen day, or a custom range.
  const presets=sentimentRanges(days);
  const [rangeKey,setRangeKey]=useState('7');
  const [custom,setCustom]=useState({from:'',to:''});
  const active=rangeKey==='day'?{from:date,to:date}:rangeKey==='custom'?{from:custom.from||days[0]?.date||'',to:custom.to||days.at(-1)?.date||''}:presets.find(row=>row.key===rangeKey)||presets[0]||{from:'',to:''};
  const [selectedKind,setSelectedKind]=useState('');
  const ranged=sentimentRangeEvidence(posts,active.from,active.to,selectedLabel);
  const rangedKinds=selectedLabel==='neutral'?neutralBreakdown(ranged.posts):null;
  const kindFilter=selectedLabel==='neutral'&&rangedKinds[selectedKind]>0?selectedKind:'';
  const evidence=kindFilter?{...ranged,posts:ranged.posts.filter(post=>neutralKind(post)===kindFilter)}:ranged;
  const oneDay=active.from===active.to;
  const dated=days.reduce((sum,row)=>sum+row.total,0);
  // Links open exactly the posts a number counts: the chosen voice travels as its list of platforms.
  const link=filters=>postsEvidenceLink(params.toString(),{...(voicePlatforms?{platform:voicePlatforms}:{}),...filters});
  const platforms=[...new Set(posts.map(post=>post.platform||'unknown'))].map(platform=>({platform,counts:sentimentCounts(posts.filter(post=>(post.platform||'unknown')===platform))})).map(row=>({...row,total:Object.values(row.counts).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.total-a.total);
  const analysed=counts.positive+counts.neutral+counts.negative;
  const [hideUnknown,setHideUnknown]=useHideUnknown();
  const shown=labels.filter(([key])=>!(hideUnknown&&key==='unknown'));
  // The switch decides the base of every percentage on this page: only analysed posts, or all posts.
  const base=hideUnknown?analysed:posts.length;

  const dayLabel=value=>{const d=new Date(value+'T00:00:00Z');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'UTC'});};
  const dayOf=post=>days.length?sentimentDayOf(post):null;
  const topOfDay=day=>posts.filter(post=>dayOf(post)===day).map(post=>({id:post.id,author:post.author,text:(post.title||post.text||'').replace(/\s+/g,' ').trim().slice(0,70),value:postInteractions(post.metrics)})).sort((a,b)=>(b.value??-1)-(a.value??-1)).slice(0,3);
  // Emoji around each sentiment: taken from a post's own text and the comments under it, grouped by the post's sentiment.
  const emojiBySentiment=['negative','neutral','positive'].map(key=>{const rows=posts.filter(post=>postSentiment(post)===key);return {key,posts:rows.length,emoji:topEmoji(rows.flatMap(post=>[`${post.title||''} ${post.text||''}`,...((post.metrics?.comment_snapshot?.items||[]).map(comment=>comment.text))]),14)};});
  return <div className="po-overview psa-page">
    <VoiceOverview posts={allPosts} opinion={opinion} loaded={analysis.loaded||!topicId} hideUnknown={hideUnknown} onHideUnknown={setHideUnknown} voice={voice} onVoice={setVoice} commentsLink={'/pulse/comments?'+params}/>
    <PulseStatGrid label={`Jumlah posting per sentimen, ${voiceLabels[voice].toLowerCase()}`} className="psa-scope-stats">{shown.map(([key,label])=>{const change=recentChange(days.map(row=>row[key]));return <PulseStat key={key} as={Link} to={link({sentiment:key})} tone={sentimentTone[key]} label={label} value={counts[key]}
        share={base?counts[key]/base*100:null} shareLabel={hideUnknown?'dari yang dianalisis':'dari seluruh posting'}
        delta={key==='unknown'?null:change?.delta??null} deltaUnit="" deltaIntent={deltaIntent(key,change?.delta)} deltaNote={change?`vs ${change.days} hari sebelumnya`:undefined} trend={days.map(row=>row[key])}/>;})}</PulseStatGrid>
    <div className="lay-grid"><div className="lay-8">
    <AnalyticsPanel title="Tren harian" description="Arahkan kursor ke batang untuk melihat posting teratas hari itu. Klik warna untuk membuka postingnya." footer={`Tanggal publikasi WIB.${posts.length-dated>0?` ${formatCount(posts.length-dated)} posting tanpa tanggal tidak masuk grafik.`:''}`}>
      {days.length?<><PulseLegend items={shown.map(([key,label])=>({key,label,color:colors[key],hatch:key==='unknown',value:counts[key]}))}/>
      <div className="po-chart psa-chart" role="img" aria-label="Grafik sentimen harian. Tabel tautan yang dapat diakses tersedia di bawah."><ResponsiveContainer width="100%" height="100%"><BarChart data={days} barCategoryGap="22%"><defs><pattern id="psa-hatch-unknown" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--ps-sent-unknown)"/></pattern></defs><CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={28} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/><Tooltip cursor={{fill:'var(--ps-soft)'}} content={<PulseChartTooltip labelFormatter={dayLabel} total percent top={topOfDay}/>}/>{shown.map(([key,label])=><Bar key={key} dataKey={key} name={label} stackId="sentiment" fill={fill(key)} maxBarSize={44} isAnimationActive={false} cursor="pointer" onClick={row=>{if(row?.date)navigate(link({day:row.date,sentiment:key}));}}/>)}</BarChart></ResponsiveContainer></div>
      <details className="po-data"><summary>Data harian & tautan posting</summary><div className="psa-table"><table><thead><tr><th>Tanggal WIB</th>{labels.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{days.map(row=><tr key={row.date}><th><button type="button" onClick={()=>{setSelectedDay(row.date);setRangeKey('day');}} aria-label={`Telusuri perubahan ${row.date}`}>{dayLabel(row.date)}</button></th>{labels.map(([key,label])=><td key={key}><Link aria-label={`${row.date}, ${label}: ${row[key]} posting`} to={link({day:row.date,sentiment:key})}>{row[key]} <PulseArrow/></Link></td>)}</tr>)}</tbody></table></div></details></>:<p className="po-empty">Belum ada posting bertanggal pada periode ini. Pilih rentang lain atau periksa Sumber & Cakupan.</p>}
    </AnalyticsPanel>
    </div><div className="lay-4">
    <AnalyticsPanel title="Sentimen per platform" description="Jumlah posting, bukan jangkauan. Klik angka untuk membuka postingnya.">
      {platforms.length?<ul className="psa-platforms">{platforms.map(({platform,counts:row,total})=>{const known=row.positive+row.neutral+row.negative,whole=hideUnknown?known:total,keys=['positive','neutral','negative',...(hideUnknown?[]:['unknown'])].filter(key=>row[key]>0);return <li key={platform}>
        <span className="psa-platform-name"><PlatformIcon platform={platform}/> {platformLabel(platform)}<small>{formatCount(total)} posting</small></span>
        <span className="psa-platform-bar" role="img" aria-label={whole?keys.map(key=>`${sentimentLabels[key]} ${Math.round(row[key]/whole*100)}%`).join(', '):'Belum dianalisis'}>{whole?keys.map(key=><i key={key} className={key==='unknown'?'empty':undefined} style={{flexGrow:row[key],background:key==='unknown'?undefined:colors[key]}}/>):<i className="empty"/>}</span>
        <span className="psa-platform-counts">{shown.map(([key,label])=><Link key={key} aria-label={`${platformLabel(platform)}, ${label}: ${row[key]} posting`} title={label} to={link({platform,sentiment:key})}><span className="psa-dot" data-tone={key} aria-hidden="true"/>{formatCount(row[key])}</Link>)}</span>
      </li>;})}</ul>:<p className="po-empty">Belum ada data platform pada periode terpilih.</p>}
    </AnalyticsPanel>
    </div></div>
    <AnalyticsPanel title="Posting di balik angka" description="Pilih sentimen dan tanggal, lalu baca posting yang paling ramai." footer="Dihitung dari posting terkumpul, bukan bukti sebab-akibat atau opini seluruh publik. Sentimen teks tidak otomatis menunjukkan sikap terhadap tokoh.">
      {date?<><div className="psa-controls">
        <div className="pu-tag-group" role="group" aria-label="Pilih sentimen">{labels.map(([key,label])=><PulseTag key={key} size="lg" dot tone={sentimentTone[key]} pressed={selectedLabel===key} onClick={()=>setSelectedLabel(key)}>{label}</PulseTag>)}</div>
        <div className="psa-range"><div className="pu-tag-group" role="group" aria-label="Pilih rentang waktu">{presets.map(row=><PulseTag key={row.key} size="lg" tone="accent" pressed={rangeKey===row.key} onClick={()=>setRangeKey(row.key)}>{row.label}</PulseTag>)}<PulseTag size="lg" tone="accent" pressed={rangeKey==='day'} onClick={()=>setRangeKey('day')}>Satu hari</PulseTag><PulseTag size="lg" tone="accent" pressed={rangeKey==='custom'} onClick={()=>setRangeKey('custom')}>Rentang</PulseTag></div>
          {rangeKey==='day'&&<label>Tanggal<select aria-label="Tanggal publikasi" value={date} onChange={event=>setSelectedDay(event.target.value)}>{[...days].reverse().map(row=><option key={row.date} value={row.date}>{dayLabel(row.date)} · {row.total} posting</option>)}</select></label>}
          {rangeKey==='custom'&&<div className="psa-range-custom"><label>Dari<input type="date" aria-label="Dari tanggal" min={days[0]?.date} max={custom.to||days.at(-1)?.date} value={active.from} onChange={event=>setCustom(value=>({...value,from:event.target.value}))}/></label><label>Sampai<input type="date" aria-label="Sampai tanggal" min={custom.from||days[0]?.date} max={days.at(-1)?.date} value={active.to} onChange={event=>setCustom(value=>({...value,to:event.target.value}))}/></label></div>}
        </div>
        {rangedKinds&&ranged.posts.length>0&&<div className="pu-tag-group psa-kinds" role="group" aria-label="Pilih bentuk posting netral"><PulseTag size="lg" tone="neutral-sentiment" pressed={!kindFilter} onClick={()=>setSelectedKind('')} count={ranged.posts.length}>Semua netral</PulseTag>{kindOrder.filter(key=>rangedKinds[key]>0).map(key=><PulseTag key={key} size="lg" tone="neutral-sentiment" pressed={kindFilter===key} onClick={()=>setSelectedKind(key)} count={rangedKinds[key]} title={kindHints[key]}>{kindLabels[key]}</PulseTag>)}</div>}
      </div>
      <div className="psa-change"><span className="psa-dot lg" data-tone={selectedLabel} aria-hidden="true"/><div><strong>{formatCount(kindFilter?evidence.posts.length:evidence.count)} posting {sentimentLabels[selectedLabel].toLowerCase()}{kindFilter?`, ${kindLabels[kindFilter].toLowerCase()}`:''} · {oneDay?dayLabel(active.from):`${dayLabel(active.from)} sampai ${dayLabel(active.to)}`}</strong><p>{kindFilter?`Bagian dari ${formatCount(ranged.count)} posting netral pada rentang ini. ${kindHints[kindFilter]}`:evidence.delta===null?(evidence.previous===null?`Belum dapat dibandingkan: tidak ada data ${evidence.days===1?dayLabel(evidence.previousTo):`${evidence.days} hari sebelumnya`} dalam cakupan terpilih.`:'Belum dapat dibandingkan: salah satu rentang belum memiliki hasil analisis sentimen.'):`${evidence.delta>0?'Naik ':evidence.delta<0?'Turun ':'Sama dengan '}${evidence.delta?formatCount(Math.abs(evidence.delta))+' posting dari ':''}${evidence.days===1?dayLabel(evidence.previousTo):`${evidence.days} hari sebelumnya`} (${formatCount(evidence.previous)} posting).`}</p></div><Link to={link(oneDay?{day:active.from,sentiment:selectedLabel}:{sentiment:selectedLabel})}>Lihat {formatCount(evidence.posts.length)} posting <PulseArrow/></Link></div>
      <ol className="psa-evidence">{evidence.posts.slice(0,5).map(post=><SentimentEvidenceCard key={post.id} post={post} selectedLabel={selectedLabel} accountLink={link({...(oneDay?{day:active.from}:{}),sentiment:selectedLabel,author:post.author,platform:post.platform})}/>)}</ol>{evidence.posts.length>5&&<p className="po-panel-note">Lima posting dengan interaksi tertinggi dari {evidence.posts.length}.</p>}{!evidence.posts.length&&<p className="po-empty">Tidak ada posting dengan sentimen ini pada rentang terpilih. Pilih kategori atau rentang lain.</p>}</>:<p className="po-empty">Perbandingan akan tersedia setelah ada posting bertanggal.</p>}
    </AnalyticsPanel>
    <AnalyticsPanel title="Emotikon menurut sentimen" description="Emotikon di posting dan komentarnya, dikelompokkan menurut sentimen postingnya." footer="Ukuran mengikuti jumlah posting dan komentar yang memakainya. Emotikon menunjukkan reaksi yang tertulis, bukan hasil analisis sentimen tersendiri.">
      {emojiBySentiment.some(group=>group.emoji.length)?<div className="psa-emoji-groups">{emojiBySentiment.map(group=><section key={group.key} aria-label={`Emotikon di sekitar posting ${sentimentLabels[group.key].toLowerCase()}`}>
        <h3><span className="psa-dot" data-tone={group.key} aria-hidden="true"/>{sentimentLabels[group.key]}<small>{formatCount(group.posts)} posting</small></h3>
        {group.emoji.length?<EmojiCloud rows={group.emoji} width={360} height={220} largest={96} keyCount={4}/>:<p className="po-empty">Tidak ada emotikon.</p>}
      </section>)}</div>:<p className="po-empty">Posting dan komentar dalam cakupan ini tidak memakai emotikon.</p>}
    </AnalyticsPanel>
    <EmotionAnalytics key={params.toString()} posts={posts}/>
  </div>;
}
