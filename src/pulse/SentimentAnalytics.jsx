import { PulseArrow } from '../components/ui/PulseArrow';
import {useMemo,useRef,useState} from 'react';
import {LayoutGrid,List} from 'lucide-react';
import {PulseButton} from '../components/ui/PulseUI';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {BarChart,Bar,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import useMasonry from './useMasonry';
import {sentimentCounts,sentimentLabels,postSentiment} from '../lib/pulsePostFilters';
import {topEmoji} from '../lib/pulseEmoji';
import EmojiCloud from './EmojiCloud';
import {postInteractions} from '../lib/pulseEngagement';
import {accountPhoto} from '../lib/pulseAccountPhoto';
import {PulseTag} from '../components/ui/PulseTag';
import {formatCount} from '../lib/pulseData';
import {sentimentTimeline,sentimentRangeEvidence,sentimentDate as sentimentDayOf} from '../lib/pulseSentiment';
import {PulseRange} from '../components/ui/PulseRange';
import {allRange,rangeBounds,resolveRange,withinRange} from '../lib/pulseRange';
import {postsEvidenceLink} from '../lib/pulseDrilldown';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import SentimentEvidenceCard from './SentimentEvidenceCard';
import InfoTip from './InfoTip';
import './overview-analytics.css';
import './sentiment-analytics.css';
import EmotionAnalytics from './EmotionAnalytics';
import useHideUnknown from './useHideUnknown';
import { UnanalysedToggle } from './UnanalysedToggle';
import {PulseLegend,PulseChartTooltip,PulseStat,PulseStatGrid} from '../components/ui/PulseAnalytics';
import {recentShareChange,deltaIntent} from '../lib/pulseTrend';
import VoiceOverview from './VoiceOverview';
import useResponseAnalysis from './useResponseAnalysis';
import {responseEvidence} from '../lib/pulseResponse';
import {inVoice,kindHints,kindLabels,kindOrder,neutralBreakdown,neutralKind,publicOpinion,voiceLabels,voiceOf} from '../lib/pulseVoice';
import {sentimentColor,sentimentOrder,sentimentTone} from '../lib/pulseChartTheme';
import {divergingSplit,divergingScale} from '../lib/pulseInsightMetrics';
import {toneShares,zone} from '../lib/pulseMeasures';

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
  const [selectedLabel,setSelectedLabel]=useState('negative');
  // Two range filters, each its own: the daily chart starts on everything, the evidence on the last seven days with data
  // so there is a week before to compare with. A date opened from the chart's table becomes a one-day range of the evidence.
  const bounds=rangeBounds(days.map(row=>row.date));
  const [chartRange,setChartRange]=useState(allRange);
  const chartShown=resolveRange(bounds,chartRange);
  const chartDays=withinRange(days,chartShown);
  const chartCounts=chartDays===days?counts:Object.fromEntries(sentimentOrder.map(key=>[key,chartDays.reduce((sum,row)=>sum+row[key],0)]));
  const [evidenceRange,setEvidenceRange]=useState({key:'7'});
  const active=resolveRange(bounds,evidenceRange)||{from:'',to:''};
  const [selectedKind,setSelectedKind]=useState('');
  // List or grid for the evidence cards: a reading preference, kept in this browser only.
  const [layout,setLayoutState]=useState(()=>{try{return localStorage.getItem('pulse-evidence-layout')==='grid'?'grid':'list';}catch{return 'list';}});
  const setLayout=value=>{setLayoutState(value);try{localStorage.setItem('pulse-evidence-layout',value);}catch{/* stays for this view only */}};
  const evidenceLimit=layout==='grid'?9:5;
  // The grid packs its cards by their own heights (the owner, 15 Nov 2026: "tinggi grid disini engga usah sama semua").
  const evidenceList=useRef(null);
  const ranged=sentimentRangeEvidence(posts,active.from,active.to,selectedLabel);
  const rangedKinds=selectedLabel==='neutral'?neutralBreakdown(ranged.posts):null;
  const kindFilter=selectedLabel==='neutral'&&rangedKinds[selectedKind]>0?selectedKind:'';
  const evidence=kindFilter?{...ranged,posts:ranged.posts.filter(post=>neutralKind(post)===kindFilter)}:ranged;
  useMasonry(evidenceList,layout==='grid',[evidence.posts,evidenceLimit]);
  const oneDay=active.from===active.to;
  const dated=days.reduce((sum,row)=>sum+row.total,0);
  // Links open exactly the posts a number counts: the chosen voice travels as its list of platforms.
  const link=filters=>postsEvidenceLink(params.toString(),{...(voicePlatforms?{platform:voicePlatforms}:{}),...filters});
  const platforms=[...new Set(posts.map(post=>post.platform||'unknown'))].map(platform=>({platform,counts:sentimentCounts(posts.filter(post=>(post.platform||'unknown')===platform))})).map(row=>({...row,total:Object.values(row.counts).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.total-a.total);
  const [hideUnknown,setHideUnknown]=useHideUnknown();
  const shown=labels.filter(([key])=>!(hideUnknown&&key==='unknown'));
  // tone_share_v1: a tone's share is always of the analysed posts. The switch only shows or hides "belum dianalisis",
  // which is a count with its part of all posts, never a share beside the three.
  const tone=toneShares(counts);

  const dayLabel=value=>{const d=new Date(value+'T00:00:00Z');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'UTC'});};
  const dayOf=post=>days.length?sentimentDayOf(post):null;
  const topOfDay=day=>posts.filter(post=>dayOf(post)===day).map(post=>({id:post.id,author:post.author,platform:post.platform,photo:accountPhoto(post),text:(post.title||post.text||'').replace(/\s+/g,' ').trim().slice(0,70),value:postInteractions(post.metrics)})).sort((a,b)=>(b.value??-1)-(a.value??-1)).slice(0,3);
  // Emoji around each sentiment: taken from a post's own text and the comments under it, grouped by the post's sentiment.
  const emojiBySentiment=['negative','neutral','positive'].map(key=>{const rows=posts.filter(post=>postSentiment(post)===key);return {key,posts:rows.length,emoji:topEmoji(rows.flatMap(post=>[`${post.title||''} ${post.text||''}`,...((post.metrics?.comment_snapshot?.items||[]).map(comment=>comment.text))]),14)};});
  return <div className="po-overview psa-page">
    <VoiceOverview posts={allPosts} opinion={opinion} loaded={analysis.loaded||!topicId} hideUnknown={hideUnknown} onHideUnknown={setHideUnknown} voice={voice} onVoice={setVoice} commentsLink={'/pulse/comments?'+params}/>
    <p className="psa-scope-caption">Rincian: <strong>{voiceLabels[voice]}</strong></p>
    <PulseStatGrid label={`Jumlah posting per sentimen, ${voiceLabels[voice].toLowerCase()}`} className="psa-scope-stats">{shown.map(([key,label])=>{const change=key==='unknown'?null:recentShareChange(days,key);return <PulseStat key={key} as={Link} to={link({sentiment:key})} tone={sentimentTone[key]} label={label} value={counts[key]}
        share={key==='unknown'?(posts.length?counts.unknown/posts.length*100:null):tone.percent?.[key]??null} shareText={key==='unknown'?undefined:tone.text?.[key]} shareLabel={key==='unknown'?'dari seluruh posting':'dari yang dianalisis'}
        delta={change?.delta??null} deltaUnit=" poin" deltaIntent={deltaIntent(key,change?.delta)} deltaNote={change?`${change.days} hari terakhir vs sebelumnya`:undefined} trend={days.map(row=>row[key])}/>;})}</PulseStatGrid>
    <div className="lay-grid"><div className="lay-8">
    <AnalyticsPanel title="Tren harian" actions={bounds&&<PulseRange chart="Tren harian" bounds={bounds} value={chartRange} onChange={setChartRange}/>} footer={posts.length-dated>0?`${formatCount(posts.length-dated)} posting tanpa tanggal tidak masuk grafik.`:null}>
      {days.length?<><PulseLegend items={shown.map(([key,label])=>({key,label,color:colors[key],hatch:key==='unknown',value:chartCounts[key]}))}/>
      <div className="po-chart psa-chart" role="img" aria-label="Grafik sentimen harian. Tabel tautan yang dapat diakses tersedia di bawah."><ResponsiveContainer width="100%" height="100%"><BarChart data={chartDays} barCategoryGap="22%"><defs><pattern id="psa-hatch-unknown" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--ps-sent-unknown)"/></pattern></defs><CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={28} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/><Tooltip cursor={{fill:'var(--ps-soft)'}} content={<PulseChartTooltip labelFormatter={dayLabel} total percent top={topOfDay} topUnit="Interaksi"/>}/>{shown.map(([key,label])=><Bar key={key} dataKey={key} name={label} stackId="sentiment" fill={fill(key)} maxBarSize={44} isAnimationActive={false} cursor="pointer" onClick={row=>{if(row?.date)navigate(link({day:row.date,sentiment:key}));}}/>)}</BarChart></ResponsiveContainer></div>
      <details className="po-data"><summary>Data harian & tautan posting</summary><div className="psa-table"><table><thead><tr><th>Tanggal {zone().name}</th>{labels.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{chartDays.map(row=><tr key={row.date}><th><button type="button" onClick={()=>setEvidenceRange({key:'custom',from:row.date,to:row.date})} aria-label={`Telusuri perubahan ${row.date}`}>{dayLabel(row.date)}</button></th>{labels.map(([key,label])=><td key={key}><Link aria-label={`${row.date}, ${label}: ${row[key]} posting`} to={link({day:row.date,sentiment:key})}>{row[key]} <PulseArrow/></Link></td>)}</tr>)}</tbody></table></div></details></>:<p className="po-empty">Belum ada posting bertanggal.</p>}
    </AnalyticsPanel>
    </div><div className="lay-4">
    <AnalyticsPanel title={<span>Sentimen per platform <InfoTip label="Tentang sentimen per platform">Netral dibagi dua di sisi garis tengah. Bersih = (positif − negatif) ÷ yang dianalisis.</InfoTip></span>} label="Sentimen per platform">
      {platforms.length?<>{(()=>{const splits=platforms.map(row=>divergingSplit(row.counts)),scale=divergingScale(splits);return <ul className="psa-platforms">{platforms.map(({platform,counts:row,total},index)=>{const split=splits[index];return <li key={platform}>
        <span className="psa-platform-name"><PlatformIcon platform={platform}/> {platformLabel(platform)}<small>{formatCount(total)} posting{split?` · bersih ${split.net>0?'+':split.net<0?'−':''}${Math.abs(Math.round(split.net))}`:''}</small></span>
        <span className="psa-diverge" role="img" aria-label={split?(text=>`${platformLabel(platform)}: negatif ${text.negative}, netral ${text.neutral}, positif ${text.positive} dari yang dianalisis`)(toneShares(row).text):'Belum dianalisis'}>
          {split?<><span className="psa-diverge-side" data-side="left">{[...split.left].reverse().map(seg=><i key={seg.key} style={{width:`${seg.share/scale*100}%`,background:colors[seg.key]}}/>)}</span><span className="psa-diverge-side" data-side="right">{split.right.map(seg=><i key={seg.key} style={{width:`${seg.share/scale*100}%`,background:colors[seg.key]}}/>)}</span></>:<span className="psa-diverge-empty"/>}
        </span>
        <span className="psa-platform-counts">{shown.map(([key,label])=><Link key={key} aria-label={`${platformLabel(platform)}, ${label}: ${row[key]} posting`} title={label} to={link({platform,sentiment:key})}><span className="psa-dot" data-tone={key} aria-hidden="true"/>{formatCount(row[key])}</Link>)}</span>
      </li>;})}</ul>;})()}
      <p className="psa-diverge-key" aria-hidden="true"><span>◀ negatif</span><span>positif ▶</span></p></>:<p className="po-empty">Belum ada data platform.</p>}
    </AnalyticsPanel>
    </div></div>
    <AnalyticsPanel title={<span>Posting di balik angka <InfoTip label="Tentang posting di balik angka">Bukan bukti sebab-akibat atau opini seluruh publik.</InfoTip></span>} label="Posting di balik angka">
      {bounds?<><div className="psa-controls">
        <div className="pu-tag-group" role="group" aria-label="Pilih sentimen">{labels.map(([key,label])=><PulseTag key={key} size="lg" dot tone={sentimentTone[key]} pressed={selectedLabel===key} onClick={()=>setSelectedLabel(key)}>{label}</PulseTag>)}</div>
        <PulseRange chart="Posting di balik angka" bounds={bounds} value={evidenceRange} onChange={setEvidenceRange}/>
        {rangedKinds&&ranged.posts.length>0&&<div className="pu-tag-group psa-kinds" role="group" aria-label="Pilih bentuk posting netral"><PulseTag size="lg" tone="neutral-sentiment" pressed={!kindFilter} onClick={()=>setSelectedKind('')} count={ranged.posts.length}>Semua netral</PulseTag>{kindOrder.filter(key=>rangedKinds[key]>0).map(key=><PulseTag key={key} size="lg" tone="neutral-sentiment" pressed={kindFilter===key} onClick={()=>setSelectedKind(key)} count={rangedKinds[key]} title={kindHints[key]}>{kindLabels[key]}</PulseTag>)}</div>}
      </div>
      <div className="psa-change"><span className="psa-dot lg" data-tone={selectedLabel} aria-hidden="true"/><div><strong>{formatCount(kindFilter?evidence.posts.length:evidence.count)} posting {sentimentLabels[selectedLabel].toLowerCase()}{kindFilter?`, ${kindLabels[kindFilter].toLowerCase()}`:''} · {oneDay?dayLabel(active.from):`${dayLabel(active.from)} sampai ${dayLabel(active.to)}`}</strong><p>{kindFilter?`Bagian dari ${formatCount(ranged.count)} posting netral.`:evidence.delta===null?(evidence.previous===null?`Belum dapat dibandingkan: tidak ada data ${evidence.days===1?dayLabel(evidence.previousTo):`${evidence.days} hari sebelumnya`}.`:'Belum dapat dibandingkan: salah satu rentang belum dianalisis.'):`${evidence.delta>0?'Naik ':evidence.delta<0?'Turun ':'Sama dengan '}${evidence.delta?formatCount(Math.abs(evidence.delta))+' posting dari ':''}${evidence.days===1?dayLabel(evidence.previousTo):`${evidence.days} hari sebelumnya`} (${formatCount(evidence.previous)} posting).`}</p></div><div className="pm-view-switch" role="group" aria-label="Tampilan bukti"><PulseButton aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><List size={16}/>Daftar</PulseButton><PulseButton aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}><LayoutGrid size={16}/>Grid</PulseButton></div><Link to={link(oneDay?{day:active.from,sentiment:selectedLabel}:{sentiment:selectedLabel})}>Lihat {formatCount(evidence.posts.length)} posting <PulseArrow/></Link></div>
      <ol ref={evidenceList} className="psa-evidence" data-layout={layout}>{evidence.posts.slice(0,evidenceLimit).map(post=><SentimentEvidenceCard key={post.id} post={post} compact={layout==='grid'} selectedLabel={selectedLabel} accountLink={link({...(oneDay?{day:active.from}:{}),sentiment:selectedLabel,author:post.author,platform:post.platform})}/>)}</ol>{evidence.posts.length>evidenceLimit&&<p className="po-panel-note">Teratas {evidenceLimit} dari {formatCount(evidence.posts.length)}.</p>}{!evidence.posts.length&&<p className="po-empty">Tidak ada posting dengan sentimen ini.</p>}</>:<p className="po-empty">Belum ada posting bertanggal.</p>}
    </AnalyticsPanel>
    <AnalyticsPanel title={<span>Emotikon menurut sentimen <InfoTip label="Tentang emotikon">Emotikon menunjukkan reaksi tertulis, bukan hasil analisis sentimen.</InfoTip></span>} label="Emotikon menurut sentimen">
      {emojiBySentiment.some(group=>group.emoji.length)?<div className="psa-emoji-groups">{emojiBySentiment.map(group=><section key={group.key} aria-label={`Emotikon di sekitar posting ${sentimentLabels[group.key].toLowerCase()}`}>
        <h3><span className="psa-dot" data-tone={group.key} aria-hidden="true"/>{sentimentLabels[group.key]}<small>{formatCount(group.posts)} posting</small></h3>
        {group.emoji.length?<EmojiCloud rows={group.emoji} width={360} height={220} largest={96} keyCount={4}/>:<p className="po-empty">Tidak ada emotikon.</p>}
      </section>)}</div>:<p className="po-empty">Tidak ada emotikon.</p>}
    </AnalyticsPanel>
    <EmotionAnalytics key={params.toString()} posts={posts}/>
  </div>;
}
