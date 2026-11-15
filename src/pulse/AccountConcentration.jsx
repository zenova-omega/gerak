import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import {PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import {accountConcentration} from '../lib/pulseInsightMetrics';
import {leadingAccounts} from '../lib/pulseReadings';
import {postMeasures} from '../lib/pulseMeasures';
import {percentLabel} from '../lib/pulseEngagement';
import {formatCount} from '../lib/pulseData';
import {chartSeries} from '../lib/pulseChartTheme';
import './ds/narrative-panel.css';
import './ds/concentration-curve.css';

/** One bar: the top rows in their own colours, everything else in the neutral rest segment. `rows` carry `share` (0 to 1).
 * Each named row shows its account the way every page does (`AccountAvatar`). A row with `open` is a button that opens its posts. */
function Split({rows,label,total}){
 const rest=Math.max(0,1-rows.reduce((sum,row)=>sum+row.share,0));
 return <>
  <div className="ac-bar" role="img" aria-label={`${label}: ${rows.map(row=>`${row.name} ${percentLabel(row.share)}`).join(', ')}, lainnya ${percentLabel(rest)}`}>
   {rows.map((row,index)=><i key={row.key} style={{flexGrow:row.share,background:chartSeries[index]}}/>)}{rest>0.005&&<i style={{flexGrow:rest,background:'var(--ps-soft)'}}/>}
  </div>
  <ul className="ac-rows" data-open={rows.some(row=>row.open)?'':undefined}>{rows.map((row,index)=><li key={row.key}><i style={{background:chartSeries[index]}}/>
    <div className="ac-who"><AccountAvatar author={row.author} platform={row.platform} size="xs"/>{row.open?<button type="button" className="ac-open" title={row.name} aria-label={`Lihat posting ${row.name}`} onClick={row.open}>{row.name}</button>:<span title={row.name}>{row.name}</span>}</div><b>{percentLabel(row.share)}</b></li>)}
   {rest>0.005&&<li className="ac-rest"><i/><span>{total}</span><b>{percentLabel(rest)}</b></li>}</ul>
 </>;
}

/** A share of posts as a whole percent that is cut, never rounded up, the way `coverage_v1` prints one. */
const cut=part=>part.count>0&&part.percent===0?'<1%':`${part.percent}%`;
/** A share of accounts or posts in words: a share that exists never prints as 0%. */
const part=share=>share>0&&share<0.005?'<1%':percentLabel(share);
const place=share=>Math.round(share*10000)/100;
const points=curve=>['0,100',...curve.map(point=>`${place(point.account_share)},${place(1-point.share)}`)].join(' ');
/** The sampled curve with its 80% point among the points, so the line passes through the mark and the table has its row. */
const withReach=(curve,reach)=>curve.some(point=>point.accounts===reach.accounts)?curve:[...curve,reach].sort((a,b)=>a.accounts-b.accounts);

/** The numbers behind one curve, for readers who cannot or would rather not read the picture. */
function CurveTable({caption,curve,reach,column}){
 return <table><caption>{caption}</caption>
  <thead><tr><th scope="col">Akun teraktif</th><th scope="col">Bagian akun</th><th scope="col">{column}</th></tr></thead>
  <tbody>{curve.map(point=><tr key={point.accounts} data-reach={point.accounts===reach.accounts?'':undefined}><th scope="row">{formatCount(point.accounts)}</th><td>{part(point.account_share)}</td><td>{part(point.share)}</td></tr>)}</tbody>
 </table>;
}

/** `concentration_v1` as a picture: how many of the accounts, most active first, it takes to reach 80% of the posts.
 * The figure is said in words first and stands without the curve; the curve is drawn from ten accounts up. The same
 * reading for interactions is a second, dashed line, with the share of posts whose interactions are known beside it. */
function Curve({reading,onOpen}){
 const {posts,interactions}=reading,reach=posts.reach80,other=interactions.reach80;
 const line=posts.curve&&withReach(posts.curve,reach),otherLine=interactions.curve&&withReach(interactions.curve,other);
 const said=`${formatCount(reach.accounts)} dari ${formatCount(posts.accounts)} akun (${part(reach.account_share)}) menulis 80% posting`;
 const x=place(reach.account_share),y=place(1-reach.share);
 return <section className="ac-block acc" aria-label="Kurva konsentrasi">
  <p className="ac-lead acc-lead"><strong>{formatCount(reach.accounts)}</strong>akun menulis 80% posting, {part(reach.account_share)} dari {formatCount(posts.accounts)} akun</p>
  {posts.curve?<>
   <div className="acc-chart">
    <div className="acc-yaxis" aria-hidden="true">{[100,80,50,0].map(value=><span key={value} style={{top:`${100-value}%`}}>{value}%</span>)}</div>
    <div className="acc-plot" role="img" aria-label={`Kurva kumulatif posting menurut akun, dari yang paling aktif: ${said}.${interactions.curve?` Garis putus-putus: ${formatCount(other.accounts)} dari ${formatCount(interactions.accounts)} akun (${part(other.account_share)}) memegang 80% interaksi.`:''} Angkanya ada pada Lihat angka.`}>
     <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {[0,50,100].map(value=><line key={value} className="acc-rule" x1="0" x2="100" y1={value} y2={value}/>)}
      <line className="acc-rule acc-rule-80" x1="0" x2="100" y1="20" y2="20"/>
      <line className="acc-even" x1="0" y1="100" x2="100" y2="0"/>
      <line className="acc-drop" x1={x} x2={x} y1={y} y2="100"/>
      {otherLine&&<polyline className="acc-line acc-line-interactions" points={points(otherLine)}/>}
      <polyline className="acc-line acc-line-posts" points={points(line)}/>
     </svg>
     {interactions.curve&&<i className="acc-mark-2" style={{left:`${place(other.account_share)}%`,top:`${place(1-other.share)}%`}}/>}
     <i className="acc-mark" style={{left:`${x}%`,top:`${y}%`}}/>
     <span className="acc-mark-label" data-side={x>68?'left':'right'} style={{left:`${x}%`,top:`${y}%`}}>{formatCount(reach.accounts)} akun</span>
    </div>
    <div className="acc-xaxis" aria-hidden="true"><span>0%</span><span>50%</span><span>100% akun</span></div>
   </div>
   <ul className="acc-keys"><li className="acc-key acc-key-posts"><i aria-hidden="true"/>Posting</li>{interactions.curve&&<li className="acc-key acc-key-interactions"><i aria-hidden="true"/>Interaksi</li>}<li className="acc-key acc-key-even"><i aria-hidden="true"/>Bila semua akun sama aktif</li></ul>
  </>:<p className="acc-says">Kurva butuh 10 akun atau lebih.</p>}
  <p className="acc-says">{other?<>80% interaksi berasal dari <b>{formatCount(other.accounts)}</b> dari {formatCount(interactions.accounts)} akun ({part(other.account_share)}). Interaksi diketahui pada {cut(interactions.measured)} posting.</>
   :interactions.total===null?'Sumber tidak melaporkan interaksi.'
   :'Interaksi yang dilaporkan nol.'}{reading.without_account>0&&` ${formatCount(reading.without_account)} posting tanpa nama akun tidak dihitung.`}</p>
  {onOpen&&<button type="button" className="acc-open" onClick={()=>onOpen(reach.accounts)}>Lihat posting {formatCount(reach.accounts)} akun ini</button>}
  {posts.curve&&<details className="acc-data"><summary>Lihat angka</summary><div className="acc-tables">
   <CurveTable caption="Posting" column="Bagian posting" curve={line} reach={reach}/>
   {otherLine&&<CurveTable caption="Interaksi" column="Bagian interaksi" curve={otherLine} reach={other}/>}
  </div></details>}
 </section>;
}

/** How concentrated the conversation is: the share of posts written by the three most active accounts, the share of
 * interactions held by the three posts with the most, and the curve of `concentration_v1` with its 80% point.
 * A reading aid, not a finding about intent. With `onOpen(title, posts)` the named figures open their posts. */
export default function AccountConcentration({posts=[],onOpen}){
 const c=accountConcentration(posts);
 const behind=keys=>posts.filter(post=>keys.has(postMeasures(post).account));
 const accountRows=c.topAccounts.map(row=>{const name=`${row.author} · ${platformLabel(row.platform)}`;return {key:row.key,name,author:row.author,platform:row.platform,share:row.share,open:onOpen&&(()=>onOpen(name,behind(new Set([row.key]))))};});
 const postRows=c.topPosts.map(row=>{const name=`${row.author||'Tanpa nama'} · ${platformLabel(row.platform)}`;return {key:row.id,name,author:row.author,platform:row.platform,share:row.share,open:onOpen&&(()=>onOpen('Posting '+name,posts.filter(post=>post.id===row.id)))};});
 return <AnalyticsPanel title={<span>Konsentrasi percakapan <InfoTip label="Tentang konsentrasi">Konsentrasi tinggi bukan bukti akun terkoordinasi.</InfoTip></span>} label="Konsentrasi percakapan">
  {c.posts?<div className="ac-grid ac-grid-curve">
   <section className="ac-block" aria-label="Konsentrasi akun"><p className="ac-lead"><strong>{percentLabel(c.topAccountShare)}</strong>posting berasal dari 3 akun teratas, dari {formatCount(c.accounts)} akun</p>
    <Split rows={accountRows} label="Porsi posting tiga akun teratas" total="Akun lainnya"/></section>
   <section className="ac-block" aria-label="Konsentrasi interaksi">{c.topPostShare===null?<PulsePanelEmpty title="Belum ada angka interaksi">Sumber tidak melaporkan interaksi.</PulsePanelEmpty>:<><p className="ac-lead"><strong>{percentLabel(c.topPostShare)}</strong>interaksi berasal dari 3 posting teratas</p>
    <Split rows={postRows} label="Porsi interaksi tiga posting teratas" total="Posting lainnya"/></>}</section>
   <Curve reading={c.reading} onOpen={onOpen&&(count=>onOpen(`${formatCount(count)} akun teraktif`,behind(leadingAccounts(posts,count))))}/>
  </div>:<PulsePanelEmpty title="Belum ada akun">Belum ada posting dengan nama akun.</PulsePanelEmpty>}
 </AnalyticsPanel>;
}
