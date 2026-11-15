import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { PulseArrow } from '../components/ui/PulseArrow';
import { PulseTag } from '../components/ui/PulseTag';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import {formatCount,pulseDate} from '../lib/pulseData';
import {elapsedText,observedWindow,paceOf} from '../lib/pulseGrowthView';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import './ds/growth-evidence.css';

const shown=5;
const paceLook={up:{tone:'accent',icon:TrendingUp},down:{tone:'neutral',icon:TrendingDown},flat:{tone:'neutral',icon:Minus},unknown:{tone:'unknown'}};
const excerpt=post=>(post?.title||post?.text||'').replace(/\s+/g,' ').trim().slice(0,140);

/** The posts whose interactions grew fastest between their last two observations. Every figure is the server's;
 * this only lays them out: who and what, how much was added and in how long, the rate with a bar against the
 * fastest row, the change of pace, and when it was observed. */
export default function GrowthEvidence({data,posts,onOpen,loaded}){
 const byId=new Map(posts.map(post=>[post.id,post]));
 const available=(data?.posts||[]).filter(p=>byId.has(p.id)&&p.availability?.growth&&!p.reset_detected&&p.rate_per_hour!=null).sort((a,b)=>b.rate_per_hour-a.rate_per_hour);
 const rows=available.slice(0,shown),fastest=rows[0]?.rate_per_hour||0;
 return <AnalyticsPanel title={<span>Pertumbuhan interaksi <InfoTip label="Tentang pertumbuhan">Tambahan antar dua pengamatan terakhir. Waktu teramati bukan waktu pasti mulai viral.</InfoTip></span>} label="Pertumbuhan interaksi">
  {!data?<p className="po-empty">{loaded?'Riwayat pertumbuhan belum tersedia.':'Memuat perubahan interaksi…'}</p>:<>
   <p className="pge-lede">{formatCount(available.length)} dari {formatCount(posts.length)} posting dapat dibandingkan.{available.length>shown&&` Teratas ${shown}.`}</p>
   {rows.length?<div className="pr-table-wrap"><table className="pge-table">
    <thead><tr><th scope="col">Posting</th><th scope="col" className="pge-num">Tambahan interaksi</th><th scope="col" className="pge-num">Per jam</th><th scope="col">Perubahan laju</th><th scope="col">Pengamatan</th></tr></thead>
    <tbody>{rows.map(p=>{
     const post=byId.get(p.id),name=p.author||post.author||platformLabel(p.platform),pace=paceOf(p.acceleration_per_hour_squared),look=paceLook[pace.key],took=elapsedText(p.elapsed_hours);
     return <tr key={p.id}>
      <th scope="row"><button type="button" className="pge-post" onClick={()=>onOpen('Pertumbuhan interaksi',[post])}>
       <PostAvatar size="sm" post={{...post,author:name,platform:post.platform||p.platform}}/>
       <span className="pge-who"><span className="pge-name"><strong>{name}</strong><PulseArrow/></span><span>{excerpt(post)||platformLabel(p.platform)}</span></span>
      </button></th>
      <td className="pge-num" data-label="Tambahan interaksi"><b>{p.delta_engagement>0?'+':''}{formatCount(p.delta_engagement)}</b>{took&&<small>dalam {took}</small>}</td>
      <td className="pge-num pge-rate" data-label="Per jam"><b>{p.rate_per_hour.toLocaleString('id-ID',{maximumFractionDigits:1})}</b><span className="pge-bar" style={{'--share':fastest>0?Math.max(0,p.rate_per_hour)/fastest:0}} aria-hidden="true"/></td>
      <td data-label="Perubahan laju"><PulseTag tone={look.tone} variant={pace.key==='up'?'soft':'outline'} icon={look.icon}>{pace.label}</PulseTag></td>
      <td className="pge-seen" data-label="Pengamatan"><span>{observedWindow(p.previous_observed_at,p.latest_observed_at)}</span>{p.first_observed_growth_at&&<small>Tumbuh sejak {pulseDate(p.first_observed_growth_at)}</small>}</td>
     </tr>;
    })}</tbody>
   </table></div>:<p className="po-empty">Belum cukup pengamatan.</p>}
  </>}
 </AnalyticsPanel>;
}
