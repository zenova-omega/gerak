// Panels that used to share one long Ikhtisar page, now on the page that is about them.
// Each takes the posts already scoped to the project's period and platforms; none fetches posts by itself.
import {lazy,Suspense,useState} from 'react';
import {useLocation,useSearchParams} from 'react-router-dom';
import AnalyticsPanel from './AnalyticsPanel';
import NarrativePanel from './NarrativePanel';
import AccountConcentration from './AccountConcentration';
import GrowthEvidence from './GrowthEvidence';
import {EvidenceSheet} from './EvidencePosts';
import {TagPanel} from './OverviewInsights';
import useOverviewEvidence from './useOverviewEvidence';
import InfographicsPanel from '../components/admin/pulse/InfographicsPanel';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import {PulseArrow} from '../components/ui/PulseArrow';
import {PulseButton} from '../components/ui/PulseUI';
import {PulseBreakdown,PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {overviewEvidence} from '../lib/pulseOverview';
import {pulseDate} from '../lib/pulseData';
import {platformColor} from '../lib/pulseChartTheme';
import './overview-analytics.css';

// The spread card brings the province outlines with it, so both are fetched after the page.
const RegionSpreadSummary = lazy(() => import('./RegionSpreadSummary'));

const useTopic=topic=>{const [params]=useSearchParams();return {params,id:topic?.id||params.get('topic')||''};};

/** Jaringan: the main narratives as a bubble chart and a list, and when each platform first carried the conversation. */
export function NetworkNarratives({posts=[]}){
 const {params,id}=useTopic();
 const [selection,setSelection]=useState(null);
 const r=overviewEvidence(posts);
 const open=(title,rows)=>setSelection({title,posts:rows});
 const link=view=>{const search=new URLSearchParams(params);search.set('topic',id);return '/pulse/'+view+'?'+search;};
 return <>
  <NarrativePanel narratives={r.narratives} onOpen={open} postsLink={link('posts')}/>
  <AnalyticsPanel title="Penyebaran percakapan" description="Urutan publikasi paling awal yang tersedia pada setiap platform.">
   {r.platformTimeline.length?<ol className="po-spread">{r.platformTimeline.map(p=><li key={p.platform}><PlatformIcon platform={p.platform}/><strong>{platformLabel(p.platform)}</strong><span>Publikasi awal: {pulseDate(p.firstPublished)}</span><small>Pertama ditemukan: {pulseDate(p.firstObserved)}</small><PulseButton onClick={()=>open(platformLabel(p.platform),r.posts.filter(post=>post.platform===p.platform))}>{p.count} posting <PulseArrow/></PulseButton></li>)}</ol>:<PulsePanelEmpty title="Belum ada urutan publikasi">Belum ada posting dalam pilihan ini.</PulsePanelEmpty>}
   <p className="po-panel-note">Urutan waktu tidak membuktikan platform asal. Hubungan repost harus didukung tautan atau bukti langsung.</p>
  </AnalyticsPanel>
  <section id="network-spread"><Suspense fallback={<AnalyticsPanel title="Sebaran tempat" description="Memuat peta…"><p className="po-empty" role="status">Memuat peta…</p></AnalyticsPanel>}><RegionSpreadSummary posts={r.posts} to={link('network') + '&focus=map'}/></Suspense></section>
  <EvidenceSheet selection={selection} onClose={()=>setSelection(null)}/>
 </>;
}

/** Akun & sumber: how concentrated the speaking is, where it happens, what kinds of interaction it earns, and how fast they grew. */
export function AccountsInsights({posts=[],topic,period}){
 const {id}=useTopic(topic);
 const [selection,setSelection]=useState(null);
 const extra=useOverviewEvidence(id,period,posts);
 const r=overviewEvidence(posts);
 const open=(title,rows)=>setSelection({title,posts:rows});
 return <>
  <AccountConcentration posts={r.posts}/>
  <div className="lay-grid">
   <div className="lay-4"><AnalyticsPanel title="Sumber percakapan" description="Jumlah posting per platform, bukan estimasi audiens.">
    {r.platforms.length?<PulseBreakdown total={r.posts.length} rows={r.platforms.map(row=>({key:row.platform,label:platformLabel(row.platform),value:row.count,color:platformColor(row.platform),leading:<PlatformIcon platform={row.platform} size={16}/>,onClick:()=>open(platformLabel(row.platform),r.posts.filter(p=>p.platform===row.platform))}))}/>:<PulsePanelEmpty>Belum ada sumber dalam pilihan ini.</PulsePanelEmpty>}
   </AnalyticsPanel></div>
   <div className="lay-8 po-eng-stack"><AnalyticsPanel title="Rincian interaksi" description="Jenis interaksi pada posting dalam pilihan ini, beserta dua indikator turunannya." footer="Snapshot terakhir tiap posting. Metrik yang tidak dikirim sumber tidak dihitung sebagai nol, sehingga jumlah posting per metrik dapat berbeda."><PulseEngagement posts={r.posts}/></AnalyticsPanel></div>
  </div>
  <GrowthEvidence data={extra.growth} posts={r.posts} onOpen={open} loaded={extra.loaded}/>
  <EvidenceSheet selection={selection} onClose={()=>setSelection(null)}/>
 </>;
}

/** Jaringan: the words and tags in use and the hours posts were published, behind one disclosure so the narratives stay first.
 * It sits here and not on Posting: the words' evidence lists posts, and the Posting list already shows each of them. */
export function WordsAndTime({posts=[],locations=[],unknownCount}){
 const [params]=useSearchParams(),{hash}=useLocation();
 const r=overviewEvidence(posts);
 return <details className="pulse-evaluation-disclosure" id="pulse-infographics-view" open={hash==='#pulse-infographics-view'||undefined}><summary>Kata, tagar, dan waktu terbit</summary>
  <TagPanel posts={r.posts} search={params.toString()}/>
  <InfographicsPanel posts={r.posts} locations={locations} unknownCount={unknownCount}/>
 </details>;
}
