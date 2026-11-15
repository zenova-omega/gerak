import {createElement} from 'react';
import {Link} from 'react-router-dom';
import {CartesianGrid,ReferenceLine,Scatter,ScatterChart,XAxis,YAxis,ZAxis} from 'recharts';
import {ChartContainer,ChartTooltip} from '../components/ui/shadcn/chart';
import AnalyticsPanel from './AnalyticsPanel';
import {PulseArrow} from '../components/ui/PulseArrow';
import {PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {SentimentTag} from '../components/ui/PulseTag';
import {PulseShare,PulseView,PulseBeat} from '../components/ui/PulseMetricIcons';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import {contentShares} from '../lib/pulseEngagement';
import {narrativePlatforms} from '../lib/pulseOverview';
import {narrativeBubbles} from '../lib/pulseInsightMetrics';
import {postSentiment} from '../lib/pulsePostFilters';
import {formatCount} from '../lib/pulseData';
import {platformColor,sentimentColor} from '../lib/pulseChartTheme';
import {sumOf,dateRange} from './evidenceFigures';
import './ds/narrative-panel.css';

const tone=net=>net<=-20?'negative':net>=20?'positive':'neutral';
const signed=value=>`${value>0?'+':''}${Math.round(value)}`;
const config={net:{label:'Sentimen bersih'}};

/** A bubble is its narrative's number in the list below it: the number sits inside, so a bubble is found in the list without colour.
 * Colour and a word in the tooltip say the tone; the zero line separates a mostly negative narrative from a mostly positive one. */
function Bubble({cx,cy,size,payload,onPick}){
 if(!Number.isFinite(cx)||!Number.isFinite(cy))return null;
 const radius=Math.max(11,Math.sqrt((size||0)/Math.PI));
 return <g className="np-bubble" tabIndex={0} role="button" aria-label={`Narasi ${payload.rank}: ${payload.title.slice(0,80)}. ${payload.count} posting, sentimen bersih ${signed(payload.net)}. Buka posting.`}
  onClick={()=>onPick(payload)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onPick(payload);}}}>
  <circle cx={cx} cy={cy} r={radius} fill={sentimentColor[tone(payload.net)]} fillOpacity={0.55} stroke={sentimentColor[tone(payload.net)]} strokeWidth={1.5}/>
  <text x={cx} y={cy} className="np-bubble-rank" textAnchor="middle" dominantBaseline="central">{payload.rank}</text>
 </g>;
}
function Tip({active,payload}){
 const point=active&&payload?.[0]?.payload;
 if(!point)return null;
 return <div className="np-tip"><strong>{point.rank}. {point.title.slice(0,90)}{point.title.length>90?'…':''}</strong>
  <span>{formatCount(point.count)} posting · {formatCount(point.accounts)} akun</span>
  <span>Sentimen bersih {signed(point.net)} ({{negative:'condong negatif',neutral:'campuran',positive:'condong positif'}[tone(point.net)]})</span>
  <span>{point.interactions==null?'Interaksi tidak dilaporkan sumber':`${formatCount(point.interactions)} interaksi`}</span></div>;
}

/** Narasi utama: a bubble chart of the narratives (x posts, y net sentiment, size interactions), then the same narratives as a list.
 * `narratives` are the groups of `overviewEvidence`; `onOpen(title, posts)` opens the posts behind a bubble or a row. */
export default function NarrativePanel({narratives=[],onOpen,postsLink}){
 const {points,unrated}=narrativeBubbles(narratives);
 const ranked=points.map(point=>({...point,rank:narratives.findIndex(group=>group.id===point.id)+1,size:point.interactions>0?point.interactions:1}));
 const open=point=>onOpen('Kelompok percakapan',point.posts);
 const maxCount=Math.max(2,...ranked.map(point=>point.count));
 return <AnalyticsPanel title="Narasi utama" description="Kelompok percakapan serupa: seberapa besar, bernada apa, dan seberapa jauh menyebar."
  footer="Sentimen bersih = (positif − negatif) ÷ posting yang dianalisis, dari −100 sampai +100. Ukuran gelembung mengikuti interaksi yang dilaporkan sumber; narasi tanpa angka interaksi digambar kecil. Dibagikan dan tayangan hanya dihitung dari posting yang membawa angkanya. Pada repost, angka dibagikan milik posting aslinya: dihitung sekali per narasi dan tidak masuk interaksi. Jangkauan akun unik tidak tersedia dari platform.">
  {narratives.length?<>
   {ranked.length>0&&<div className="np-plot"><ChartContainer config={config} className="np-chart aspect-auto" role="img" aria-label={`Gelembung narasi: sumbu datar jumlah posting, sumbu tegak sentimen bersih. ${ranked.length} narasi. Daftar yang sama ada di bawah grafik.`}>
    <ScatterChart margin={{top:12,right:20,bottom:20,left:0}}>
     <CartesianGrid/>
     <XAxis type="number" dataKey="count" name="Posting" domain={[0,Math.ceil(maxCount*1.15)]} allowDecimals={false} tickLine={false} axisLine={false} label={{value:'Jumlah posting',position:'insideBottom',offset:-8,className:'np-axis'}}/>
     <YAxis type="number" dataKey="net" name="Sentimen bersih" domain={[-100,100]} ticks={[-100,-50,0,50,100]} width={44} tickLine={false} axisLine={false} tickFormatter={signed}/>
     <ZAxis type="number" dataKey="size" range={[260,2200]}/>
     <ReferenceLine y={0} stroke="var(--ps-ink)" strokeDasharray="4 4"/>
     <ChartTooltip cursor={false} content={<Tip/>} wrapperStyle={{zIndex:'var(--ps-z-tooltip)'}}/>
     <Scatter data={ranked} isAnimationActive={false} shape={props=><Bubble {...props} onPick={open}/>}/>
    </ScatterChart></ChartContainer>
    <p className="np-zones" aria-hidden="true"><span>▲ condong positif</span><span>▼ condong negatif</span></p></div>}
   {unrated>0&&<p className="po-panel-note">{formatCount(unrated)} narasi belum punya posting yang dianalisis, jadi belum digambar. Tetap ada di daftar.</p>}
   <ol className="po-narrative-list">{narratives.slice(0,6).map((g,i)=>{
    const where=narrativePlatforms(g.posts),names=where.rows.map(row=>`${platformLabel(row.platform)} (${formatCount(row.count)})`).concat(where.more?[`${where.more} platform lain`]:[]),whereText=names.length>1?names.slice(0,-1).join(', ')+' dan '+names.at(-1):names[0]||'';
    const accounts=new Set(g.posts.map(p=>p.platform+'|'+p.author)).size,kpis=[['Interaksi',sumOf(g.posts,'interactions'),PulseBeat],['Dibagikan',contentShares(g.posts),PulseShare],['Tayangan',sumOf(g.posts,'views'),PulseView]],tones=g.posts.reduce((t,p)=>{t[postSentiment(p)]=(t[postSentiment(p)]||0)+1;return t;},{}),lead=['negative','neutral','positive'].sort((a,b)=>(tones[b]||0)-(tones[a]||0))[0];
    return <li key={g.id}><button type="button" onClick={()=>onOpen('Kelompok percakapan',g.posts)} aria-label={`Narasi ${i+1}: ${g.title.slice(0,140)}. ${g.posts.length} posting dari ${accounts} akun${whereText?`, di ${whereText}`:''}. Periksa posting.`}><span className="po-narrative-rank" aria-hidden="true">{i+1}</span><span className="po-narrative-body"><strong>{g.title.slice(0,140)}{g.title.length>140?'…':''}</strong><small>{dateRange(g.posts)&&<time>{dateRange(g.posts)}</time>}{dateRange(g.posts)?' · ':''}{formatCount(g.posts.length)} posting · {formatCount(accounts)} akun{where.rows.length>0&&<span className="po-narrative-platforms" aria-hidden="true">{where.rows.map(row=><span key={row.platform} title={platformLabel(row.platform)} style={{'--ps-plat':platformColor(row.platform)}}><PlatformIcon platform={row.platform} size={14}/><b>{formatCount(row.count)}</b></span>)}{where.more>0&&<span title="Platform lain">+{where.more}</span>}</span>}</small><span className="po-narrative-kpis">{kpis.map(([label,value,icon])=><span key={label} title={label}>{createElement(icon,{size:14})}<b>{value==null?'—':formatCount(value)}</b>{label.toLowerCase()}</span>)}{tones[lead]>0&&<SentimentTag size="sm" value={lead}/>}</span></span><PulseArrow/></button></li>;})}</ol>
  </>:<PulsePanelEmpty title="Belum ada narasi berulang" action={postsLink&&<Link className="po-more" to={postsLink}>Buka semua posting <PulseArrow/></Link>}>Belum ada kelompok berisi lebih dari satu posting pada pilihan ini.</PulsePanelEmpty>}
 </AnalyticsPanel>;
}
