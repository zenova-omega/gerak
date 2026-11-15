import AnalyticsPanel from './AnalyticsPanel';
import {PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import {accountConcentration} from '../lib/pulseInsightMetrics';
import {percentLabel} from '../lib/pulseEngagement';
import {formatCount} from '../lib/pulseData';
import {chartSeries} from '../lib/pulseChartTheme';
import './ds/narrative-panel.css';

/** One bar: the top rows in their own colours, everything else in the neutral rest segment. `rows` carry `share` (0 to 1). */
function Split({rows,label,total}){
 const rest=Math.max(0,1-rows.reduce((sum,row)=>sum+row.share,0));
 return <>
  <div className="ac-bar" role="img" aria-label={`${label}: ${rows.map(row=>`${row.name} ${percentLabel(row.share)}`).join(', ')}, lainnya ${percentLabel(rest)}`}>
   {rows.map((row,index)=><i key={row.key} style={{flexGrow:row.share,background:chartSeries[index]}}/>)}{rest>0.005&&<i style={{flexGrow:rest,background:'var(--ps-soft)'}}/>}
  </div>
  <ul className="ac-rows">{rows.map((row,index)=><li key={row.key}><i style={{background:chartSeries[index]}}/><span title={row.name}>{row.name}</span><b>{percentLabel(row.share)}</b></li>)}
   {rest>0.005&&<li className="ac-rest"><i/><span>{total}</span><b>{percentLabel(rest)}</b></li>}</ul>
 </>;
}

/** How concentrated the conversation is: the share of posts written by the three most active accounts, and the share of
 * interactions held by the three posts with the most. A reading aid, not a finding about intent. */
export default function AccountConcentration({posts=[]}){
 const c=accountConcentration(posts);
 const accountRows=c.topAccounts.map(row=>({key:row.platform+row.author,name:`${row.author} · ${platformLabel(row.platform)}`,share:row.share}));
 const postRows=c.topPosts.map(row=>({key:row.id,name:`${row.author||'Tanpa nama'} · ${platformLabel(row.platform)}`,share:row.share}));
 return <AnalyticsPanel title="Konsentrasi percakapan" description="Seberapa besar percakapan bertumpu pada segelintir akun dan posting."
  footer="Akun dihitung per platform. Konsentrasi tinggi bisa wajar, misalnya media yang rutin menulis, dan bukan bukti akun terkoordinasi. Interaksi adalah angka terakhir yang tercatat, hanya dari posting yang membawanya.">
  {c.posts?<div className="ac-grid">
   <section className="ac-block" aria-label="Konsentrasi akun"><p className="ac-lead"><strong>{percentLabel(c.topAccountShare)}</strong>posting berasal dari 3 akun teratas, dari {formatCount(c.accounts)} akun</p>
    <Split rows={accountRows} label="Porsi posting tiga akun teratas" total="Akun lainnya"/></section>
   <section className="ac-block" aria-label="Konsentrasi interaksi">{c.topPostShare===null?<PulsePanelEmpty title="Belum ada angka interaksi">Sumber tidak melaporkan interaksi pada posting dalam pilihan ini.</PulsePanelEmpty>:<><p className="ac-lead"><strong>{percentLabel(c.topPostShare)}</strong>interaksi berasal dari 3 posting teratas</p>
    <Split rows={postRows} label="Porsi interaksi tiga posting teratas" total="Posting lainnya"/></>}</section>
  </div>:<PulsePanelEmpty title="Belum ada akun">Belum ada posting dengan nama akun pada pilihan ini.</PulsePanelEmpty>}
 </AnalyticsPanel>;
}
