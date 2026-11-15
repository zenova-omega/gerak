import { PulseArrow } from '../components/ui/PulseArrow';
import AnalyticsPanel from './AnalyticsPanel';
import {PulseButton} from '../components/ui/PulseUI';
import {formatCount,pulseDate} from '../lib/pulseData';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';

export default function GrowthEvidence({data,posts,onOpen,loaded}){
 const ids=new Set(posts.map(p=>p.id));
 const rows=(data?.posts||[]).filter(p=>ids.has(p.id));
 const available=rows.filter(p=>p.availability?.growth&&!p.reset_detected&&p.rate_per_hour!=null).sort((a,b)=>b.rate_per_hour-a.rate_per_hour);
 return <AnalyticsPanel title="Pertumbuhan interaksi" description="Tambahan interaksi antar dua pengamatan terakhir, bukan total popularitas.">
  {!data?<p className="po-empty">{loaded?'Riwayat pertumbuhan belum tersedia.':'Memuat perubahan interaksi…'}</p>:<><p>{formatCount(available.length)} dari {formatCount(posts.length)} posting memiliki pengamatan yang dapat dibandingkan.</p>{available.length?<div className="pr-table-wrap"><table><thead><tr><th>Posting</th><th>Tambahan interaksi</th><th>Per jam</th><th>Perubahan laju</th></tr></thead><tbody>{available.slice(0,5).map(p=><tr key={p.id}><td><PulseButton onClick={()=>onOpen('Pertumbuhan interaksi',posts.filter(post=>post.id===p.id))}>{p.author||platformLabel(p.platform)} <PulseArrow/></PulseButton><small>{pulseDate(p.previous_observed_at)} → {pulseDate(p.latest_observed_at)}</small></td><td>{p.delta_engagement>0?'+':''}{formatCount(p.delta_engagement)}</td><td>{p.rate_per_hour.toLocaleString('id-ID',{maximumFractionDigits:1})}</td><td>{p.acceleration_per_hour_squared==null?'Belum cukup data':p.acceleration_per_hour_squared>0?'Mempercepat':p.acceleration_per_hour_squared<0?'Melambat':'Tetap'}{p.first_observed_growth_at&&<small>Pertumbuhan teramati: {pulseDate(p.first_observed_growth_at)}</small>}</td></tr>)}</tbody></table></div>:<p className="po-empty">Belum cukup pengamatan yang sebanding. Nilai pertumbuhan akan muncul setelah tersedia, bukan dianggap nol.</p>}</>}
  <p className="po-panel-note">Waktu pengamatan dapat berbeda antar posting dan berada di luar periode publikasi. Penambahan jenis metrik atau penurunan penghitung tidak dianggap lonjakan. Waktu pertumbuhan teramati bukan waktu pasti mulai viral.</p>
 </AnalyticsPanel>;
}
