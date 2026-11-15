import { PulseArrow } from '../components/ui/PulseArrow';
import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import api from '../lib/api';
import {PulseButton,PulseNotice} from '../components/ui/PulseUI';
import ProjectWarmup from './ProjectWarmup';
import PlatformCheckboxes from '../components/admin/pulse/PlatformCheckboxes';
import KeywordChips from './KeywordChips';
import SmartKeywords from './SmartKeywords';
import { mergeTerms } from './keywordTerms';
import {buildProjectQuery} from './projectQuery';
import './quick-search.css';
import { pageMeta } from './pageMeta';
import { PulsePageHead } from '../components/ui/PulsePatterns';

const platforms=['news','x','instagram','tiktok','youtube','reddit'];
const sourceFor={news:'rss',x:'social',youtube:'youtube',reddit:'reddit'};
export default function TaggedSearch(){
 const [params]=useSearchParams();
 return <SearchWorkspace key={params.toString()} params={params}/>;
}
function SearchWorkspace({params}){
 const [main,setMain]=useState(params.get('q')||''),[required,setRequired]=useState(params.get('required')||''),[excluded,setExcluded]=useState(params.get('excluded')||'');
 const [refine,setRefine]=useState(false),[lookback,setLookback]=useState(7);
 const [selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[project,setProject]=useState(null),[warming,setWarming]=useState(null),[error,setError]=useState(''),[progress,setProgress]=useState('');
 const navigate=useNavigate();
 const locked=useRef(false),live=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 async function start(event){
  event.preventDefault();if(locked.current||project)return;
  let query;try{query=buildProjectQuery(main,required,excluded);}catch(e){setError(e.message);return;}
  const chosen=selected??platforms;
  if(!chosen.length){setError('Pilih minimal satu platform.');return;}
  locked.current=true;setBusy(true);setError('');setProgress('Membuat project…');
  let created=null;
  try{
   created=await api.post('/admin/pulse/topics',{label:main.trim().slice(0,100),query,sources:chosen.filter(p=>sourceFor[p]).map(p=>sourceFor[p]),crawl_interval_minutes:60});
   window.dispatchEvent(new Event('pulse-projects-changed'));
   if(!live.current)return;
   setProject(created);setProgress('');
   // One request switches on each source's schedule and starts the complete pull of the chosen range; the waiting
   // screen below follows its progress and opens the project.
   await api.post('/admin/pulse/topics/'+encodeURIComponent(created.id)+'/start',{days:lookback,platforms:chosen});
   if(live.current)setWarming(chosen);
  }catch(e){if(live.current)setError(created?'Project dibuat, tetapi pengumpulan awal gagal dimulai.':e.message||'Project belum berhasil dibuat.');}
  finally{locked.current=false;if(live.current)setBusy(false);}
 }
 return <section className="ps-quick-search pqs-workspace"><PulsePageHead icon={pageMeta.search.icon} title={pageMeta.search.title} tagline={pageMeta.search.tagline} guide={pageMeta.search.guide}/>
  {error&&<PulseNotice tone="warning" role="alert">{error}</PulseNotice>}
  <form className="pqs-builder" onSubmit={start}><fieldset disabled={busy||!!project} className="pqs-fields">
   <KeywordChips label="Kata utama" value={main} onChange={setMain} placeholder="calon wakil presiden, cawapres" help="Pisahkan dengan koma. OR: cukup satu cocok."/>
   <SmartKeywords fields={{main,required,excluded}} onAdd={added=>{setMain(value=>mergeTerms(value,added.variation));setRequired(value=>mergeTerms(value,added.context));setExcluded(value=>mergeTerms(value,added.exclude));if(added.context.length||added.exclude.length)setRefine(true);}}/>
   <details open={refine||Boolean(params.get('required')||params.get('excluded'))} onToggle={event=>setRefine(event.currentTarget.open)}><summary>Konteks &amp; pengecualian</summary><div className="pqs-refinements"><KeywordChips label="Konteks wajib" value={required} onChange={setRequired} placeholder="Indonesia" help="AND: semua wajib muncul."/><KeywordChips label="Pengecualian" value={excluded} onChange={setExcluded} placeholder="promo, jualan" help="NOT: posting dengan istilah ini diabaikan."/></div></details>
   <PlatformCheckboxes platforms={platforms} value={selected} onChange={setSelected}/>
   <label className="ps-lookback">Tarik posting berapa hari ke belakang<select value={lookback} onChange={e=>setLookback(Number(e.target.value))}><option value={7}>7 hari terakhir</option><option value={14}>14 hari terakhir</option><option value={30}>30 hari terakhir (maksimal)</option></select></label>
   <div className="pqs-actions"><PulseButton type="submit" variant="primary" busy={busy} busyLabel="Mengumpulkan…">Cari &amp; buat project</PulseButton></div>
  </fieldset></form>
  {progress&&<p role="status">{progress}</p>}
  {project&&warming&&<ProjectWarmup topic={project} platforms={warming} onOpen={()=>navigate('/pulse/overview?topic='+encodeURIComponent(project.id))}/>}
  {project&&!warming&&!busy&&<section className="pqs-results"><header><div><h2>{project.label}</h2></div><Link to={'/pulse/overview?topic='+encodeURIComponent(project.id)}>Buka dashboard project <PulseArrow/></Link></header>
   <div className="pqs-actions"><Link to={'/pulse/monitor?topic='+encodeURIComponent(project.id)}>Lihat pengumpulan</Link><PulseButton onClick={()=>{setProject(null);setWarming(null);setError('');setProgress('');}}>Pencarian baru</PulseButton></div></section>}
 </section>;
}
