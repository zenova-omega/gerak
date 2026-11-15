import { PulseArrow } from '../components/ui/PulseArrow';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import { dailyPostCounts, sentimentCounts, sentimentLabels } from '../lib/pulsePostFilters';
import { formatCount, observedAccounts } from '../lib/pulseData';
import { postsEvidenceLink, accountPostsLink } from '../lib/pulseDrilldown';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import './overview-analytics.css';

export default function OverviewAnalytics({data}) {
  const [params]=useSearchParams();
  const navigate=useNavigate();
  const posts=data.posts||[];
  const days=dailyPostCounts(posts);
  const counts=sentimentCounts(posts);
  const accounts=observedAccounts(data.influencers||[]);
  const platforms=[...(data.platforms||[])].sort((a,b)=>b.count-a.count);
  const link=filters=>postsEvidenceLink(params.toString(),filters);
  const total=posts.length;
  return <div className="po-overview">
    <div className="po-summary" aria-label="Ringkasan periode project">
      {[['Posting terkumpul',data.total_mentions,''],['Akun & sumber',accounts.length,''],['Interaksi teramati',data.metric_totals?.engagement?.value,`${formatCount(data.metric_totals?.engagement?.coverage)} posting memiliki metrik`]].map(([label,value,note])=><div key={label}><span>{label}</span><strong>{formatCount(value)}</strong>{note&&<small>{note}</small>}</div>)}
    </div>
    <div className="po-panel-grid">
      <AnalyticsPanel title="Tren mention">
        {days.length ? <><div className="po-chart" role="img" aria-label="Tren posting harian. Tautan tanggal tersedia di bawah grafik."><ResponsiveContainer width="100%" height="100%"><BarChart data={days} onClick={state=>{if(state?.activeLabel)navigate(link({day:state.activeLabel}));}}><CartesianGrid vertical={false} stroke="var(--ps-line)"/><XAxis dataKey="date" tick={{fill:'var(--ps-muted)',fontSize:12}} tickFormatter={v=>v.slice(5)} minTickGap={24}/><YAxis allowDecimals={false} width={38} tick={{fill:'var(--ps-muted)',fontSize:12}}/><Tooltip contentStyle={{background:'var(--ps-panel)',borderColor:'var(--ps-line)',color:'var(--ps-ink)'}}/><Bar dataKey="count" name="Posting" fill="var(--ps-accent)" radius={[4,4,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div><details className="po-data"><summary>Lihat data & pilih tanggal</summary><div>{days.map(day=><Link key={day.date} to={link({day:day.date})}><span>{day.date}</span><strong>{formatCount(day.count)} posting <PulseArrow/></strong></Link>)}</div></details></> : <p className="po-empty">Belum ada posting dengan waktu publikasi.</p>}
      </AnalyticsPanel>
      <AnalyticsPanel title="Sentimen percakapan" description={`${total-counts.unknown} dari ${total} posting memiliki label sentimen.`}>
        <div className="po-breakdown">{Object.entries(sentimentLabels).map(([key,label])=><Link key={key} to={link({sentiment:key})} className={'po-sentiment '+key}><span>{label}</span><strong>{formatCount(counts[key])} <small><PulseArrow/></small></strong><span className="po-track"><i style={{width:`${total?counts[key]/total*100:0}%`}}/></span></Link>)}</div>
      </AnalyticsPanel>
      <AnalyticsPanel title="Sumber percakapan">
        <div className="po-breakdown">{platforms.map(row=><Link key={row.platform} to={link({platform:row.platform})}><span><PlatformIcon platform={row.platform}/>{platformLabel(row.platform)}</span><strong>{formatCount(row.count)} <PulseArrow/></strong><span className="po-track"><i style={{width:`${row.count/Math.max(1,...platforms.map(p=>p.count))*100}%`}}/></span></Link>)}{!platforms.length&&<p className="po-empty">Belum ada sumber terkumpul.</p>}</div>
      </AnalyticsPanel>
      <AnalyticsPanel title="Top influencer & sumber">
        <ol className="po-leaders">{accounts.slice(0,5).map((row,index)=><li key={row.platform+row.author}><Link to={accountPostsLink(params.toString(),row)}><span className="po-rank">{index+1}</span><PostAvatar post={posts.find(p=>p.author===row.author&&p.platform===row.platform)||row}/><span className="po-account"><strong>{row.author||'Nama tidak tersedia'}</strong><small>{platformLabel(row.platform)} · {formatCount(row.mentions)} posting</small></span><span className="po-account-metric"><strong>{formatCount(row.engagement)}</strong><small>interaksi <PulseArrow/></small></span></Link></li>)}</ol>
        {!accounts.length&&<p className="po-empty">Belum ada akun untuk diperingkat.</p>}
      </AnalyticsPanel>
    </div>
  </div>;
}
