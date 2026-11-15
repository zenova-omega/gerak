// Panels that used to share one long Ikhtisar page, now on the page that is about them.
// Each takes the posts already scoped to the project's period and platforms; none fetches posts by itself.
import {lazy,Suspense,useMemo,useState} from 'react';
import {useLocation,useSearchParams} from 'react-router-dom';
import AnalyticsPanel from './AnalyticsPanel';
import NarrativePanel from './NarrativePanel';
import AccountConcentration from './AccountConcentration';
import GrowthEvidence from './GrowthEvidence';
import {EvidenceSheet} from './EvidencePosts';
import {TagPanel} from './OverviewInsights';
import useOverviewEvidence from './useOverviewEvidence';
import usePreviousPosts from './usePreviousPosts';
import useProjectPeriod from './useProjectPeriod';
import useProjectPlatforms from './useProjectPlatforms';
import InfographicsPanel from '../components/admin/pulse/InfographicsPanel';
import {PlatformIcon,platformLabel} from '../components/admin/pulse/PlatformIcon';
import {PulseArrow} from '../components/ui/PulseArrow';
import {PulseButton} from '../components/ui/PulseUI';
import {PulseBreakdown,PulsePanelEmpty} from '../components/ui/PulseAnalytics';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {overviewEvidence} from '../lib/pulseOverview';
import {filterPosts,sentimentLabels} from '../lib/pulsePostFilters';
import {periodBefore} from '../lib/pulseReadings';
import {formatCount,pulseDate} from '../lib/pulseData';
import {hasClock} from '../lib/pulseMeasures';
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
 const open=(title,rows,options)=>setSelection({title,posts:rows,...options});
 const link=view=>{const search=new URLSearchParams(params);search.set('topic',id);return '/pulse/'+view+'?'+search;};
 return <>
  <NarrativePanel narratives={r.narratives} onOpen={open} postsLink={link('posts')}/>
  <AnalyticsPanel title="Penyebaran percakapan" description="Urutan publikasi paling awal yang tersedia pada setiap platform.">
   {r.platformTimeline.length?<ol className="po-spread">{r.platformTimeline.map(p=><li key={p.platform}><PlatformIcon platform={p.platform}/><strong>{platformLabel(p.platform)}</strong><span>Publikasi awal: {pulseDate(p.firstPublished)}{p.firstPublished&&!hasClock(p.firstPublished)&&' (hanya tanggal)'}</span><small>Pertama ditemukan: {pulseDate(p.firstObserved)}</small><PulseButton onClick={()=>open(platformLabel(p.platform),r.posts.filter(post=>post.platform===p.platform))}>{p.count} posting <PulseArrow/></PulseButton></li>)}</ol>:<PulsePanelEmpty title="Belum ada urutan publikasi">Belum ada posting dalam pilihan ini.</PulsePanelEmpty>}
   {r.platformTimelineDateOnly>0&&<p className="po-panel-note">{formatCount(r.platformTimelineDateOnly)} posting hanya bertanggal tidak diurutkan menurut jam.</p>}
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
 const open=(title,rows,options)=>setSelection({title,posts:rows,...options});
 return <>
  <AccountConcentration posts={r.posts} onOpen={open}/>
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
 * It sits here and not on Posting: the words' evidence lists posts, and the Posting list already shows each of them.
 * The word panel's "Naik dan turun" needs the posts of the period before the project's chosen one: they are loaded
 * once the disclosure is open, and scoped to the same platforms and carried sentiment as the page's own posts. */
export function WordsAndTime({posts=[],locations=[],unknownCount}){
 const [params]=useSearchParams(),{hash}=useLocation();
 const id=params.get('topic')||'';
 const [period]=useProjectPeriod(id),[platforms]=useProjectPlatforms(id);
 const [selection,setSelection]=useState(null);
 const [opened,setOpened]=useState(hash==='#pulse-infographics-view');
 // An alert's view holds the posts of the alert, not of a period: there is no period before it to compare with.
 const comparable=!params.get('alert'),before=comparable?periodBefore(period.from,period.to):null;
 const beforeFrom=before?.from||'',beforeTo=before?.to||'',platformKey=JSON.stringify(platforms);
 const carried=sentimentLabels[params.get('sentiment')]?params.get('sentiment'):null;
 const earlier=usePreviousPosts(id,beforeFrom,beforeTo,opened);
 const earlierPosts=useMemo(()=>earlier.posts?filterPosts(earlier.posts,{platforms:JSON.parse(platformKey),from:beforeFrom,to:beforeTo,sentiments:carried?[carried]:null}):null,[earlier.posts,platformKey,beforeFrom,beforeTo,carried]);
 const shift=useMemo(()=>comparable?{period:beforeFrom?{from:period.from,to:period.to}:null,before:beforeFrom?{from:beforeFrom,to:beforeTo}:null,posts:earlierPosts,status:earlier.status,retry:earlier.retry}:null,
  [comparable,period.from,period.to,beforeFrom,beforeTo,earlierPosts,earlier.status,earlier.retry]);
 const r=overviewEvidence(posts);
 return <details className="pulse-evaluation-disclosure" id="pulse-infographics-view" open={hash==='#pulse-infographics-view'||undefined} onToggle={event=>{if(event.currentTarget.open)setOpened(true);}}><summary>Kata, tagar, dan waktu terbit</summary>
  <TagPanel posts={r.posts} search={params.toString()}/>
  <InfographicsPanel posts={r.posts} locations={locations} unknownCount={unknownCount} grid onOpen={(title,rows)=>setSelection({title,posts:rows})} shift={shift}/>
  <EvidenceSheet selection={selection} onClose={()=>setSelection(null)}/>
 </details>;
}
