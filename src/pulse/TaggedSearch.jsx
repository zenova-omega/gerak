import { PulseArrow } from '../components/ui/PulseArrow';
import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import api from '../lib/api';
import {PulseButton,PulseNotice} from '../components/ui/PulseUI';
import PostFeed from '../components/admin/pulse/PostFeed';
import PlatformCheckboxes from '../components/admin/pulse/PlatformCheckboxes';
import {platformLabel} from '../components/admin/pulse/PlatformIcon';
import KeywordChips from './KeywordChips';
import SmartKeywords from './SmartKeywords';
import { mergeTerms } from './keywordTerms';
import {buildProjectQuery} from './projectQuery';
import './quick-search.css';

const platforms=['news','x','instagram','tiktok','youtube','reddit'];
const sourceFor={news:'rss',x:'xpoz',youtube:'youtube',reddit:'reddit'};
const platformFor={rss:'news',xpoz:'x',youtube:'youtube',reddit:'reddit'};
function collectionMessage(value){
 const raw=String(value||'');
 if(/quota|daily_limit|credit|429|exhaust|limit/i.test(raw))return 'Pengambilan tertahan batas penggunaan. Periksa paket atau kuota di Sumber & Cakupan.';
 if(/check_account_first/i.test(raw))return 'Verifikasi koneksi Xpoz di Sumber & Cakupan terlebih dahulu.';
 if(/not_configured|tool_unavailable|unauthorized|401|403/i.test(raw))return 'Akses platform belum tersedia. Periksa koneksi sumber.';
 if(/pending|busy/i.test(raw))return 'Provider masih memproses pengambilan. Periksa status di Sumber & Cakupan.';
 return 'Pengambilan belum berhasil. Periksa status sumber sebelum mencoba kembali.';
}
export default function TaggedSearch(){
 const [params]=useSearchParams();
 return <SearchWorkspace key={params.toString()} params={params}/>;
}
function SearchWorkspace({params}){
 const [main,setMain]=useState(params.get('q')||''),[required,setRequired]=useState(params.get('required')||''),[excluded,setExcluded]=useState(params.get('excluded')||'');
 const [refine,setRefine]=useState(false);
 const [selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[project,setProject]=useState(null),[posts,setPosts]=useState(null),[error,setError]=useState(''),[notices,setNotices]=useState([]),[progress,setProgress]=useState('');
 const locked=useRef(false),live=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 async function start(event){
  event.preventDefault();if(locked.current||project)return;
  let query;try{query=buildProjectQuery(main,required,excluded);}catch(e){setError(e.message);return;}
  const chosen=selected??platforms;
  if(!chosen.length){setError('Pilih minimal satu platform.');return;}
  locked.current=true;setBusy(true);setError('');setNotices([]);setProgress('Membuat project…');
  let created=null;
  const warn=(platform,value)=>{if(live.current)setNotices(rows=>[...rows,{platform,message:collectionMessage(value)}]);};
  try{
   created=await api.post('/admin/pulse/topics',{label:main.trim().slice(0,100),query,sources:chosen.filter(p=>sourceFor[p]).map(p=>sourceFor[p]),crawl_interval_minutes:60});
   window.dispatchEvent(new Event('pulse-projects-changed'));
   if(!live.current)return;
   setProject(created);setProgress('Mengambil posting untuk keyword baru…');
   if(chosen.some(p=>sourceFor[p])){
    try{const result=await api.post('/admin/pulse/topics/'+encodeURIComponent(created.id)+'/crawl');
     for(const [source,value]of Object.entries(result.providers||{}))if(value.status!=='success')warn(platformFor[source]||source,value.error||value.status);
    }catch(e){warn('Sumber',e.message);}
   }
   for(const platform of chosen.filter(p=>['instagram','tiktok'].includes(p))){
    if(!live.current)break;
    setProgress('Mengambil posting '+platformLabel(platform)+'…');
    try{const result=await api.post('/admin/pulse/sources/collect',{topic_id:created.id,platform,limit:20,unlimited:true});if(!['succeeded','empty'].includes(result.status))warn(platform,result.error||result.status);}
    catch(e){warn(platform,e.message);}
   }
   if(live.current){const data=await api.get('/admin/pulse/analytics',{topic_id:created.id});if(live.current){setPosts(data.posts||[]);setProgress('Pengambilan selesai.');}}
  }catch(e){if(live.current)setError(created?'Project sudah dibuat, tetapi hasil belum dapat dimuat. Buka project untuk melanjutkan.':e.message||'Project belum berhasil dibuat.');}
  finally{locked.current=false;if(live.current)setBusy(false);}
 }
 return <section className="ps-quick-search pqs-workspace"><header><h1>Pencarian cepat</h1><p>Masukkan keyword baru. PULSE membuat project dan mulai mengumpulkan percakapan dari platform pilihan Anda.</p></header>
  {error&&<PulseNotice tone="warning" role="alert">{error}</PulseNotice>}
  {!!notices.length&&<PulseNotice tone="warning" role="status"><strong>Beberapa sumber memerlukan perhatian</strong><ul>{notices.map((n,i)=><li key={i}>{platformLabel(n.platform)||n.platform}: {n.message}</li>)}</ul>{project&&<Link to={'/pulse/sources?topic='+encodeURIComponent(project.id)}>Periksa sumber &amp; cakupan <PulseArrow/></Link>}</PulseNotice>}
  <form className="pqs-builder" onSubmit={start}><fieldset disabled={busy||!!project} className="pqs-fields">
   <KeywordChips label="Kata utama" value={main} onChange={setMain} placeholder="calon wakil presiden, cawapres" help="Pisahkan dengan koma. Cukup salah satu tag cocok (OR)."/>
   <SmartKeywords fields={{main,required,excluded}} onAdd={added=>{setMain(value=>mergeTerms(value,added.variation));setRequired(value=>mergeTerms(value,added.context));setExcluded(value=>mergeTerms(value,added.exclude));if(added.context.length||added.exclude.length)setRefine(true);}}/>
   <details open={refine||Boolean(params.get('required')||params.get('excluded'))} onToggle={event=>setRefine(event.currentTarget.open)}><summary>Konteks &amp; pengecualian</summary><div className="pqs-refinements"><KeywordChips label="Konteks wajib" value={required} onChange={setRequired} placeholder="Indonesia" help="Semua tag wajib ditemukan (AND)."/><KeywordChips label="Pengecualian" value={excluded} onChange={setExcluded} placeholder="promo, jualan" help="Abaikan posting yang memuat salah satu tag (NOT)."/></div></details>
   <PlatformCheckboxes platforms={platforms} value={selected} onChange={setSelected}/>
   <div className="pqs-actions"><PulseButton type="submit" variant="primary" busy={busy} busyLabel="Mengumpulkan…">Cari &amp; buat project</PulseButton></div>
  </fieldset></form>
  {progress&&<p role="status">{progress}</p>}
  {project&&<section className="pqs-results"><header><div><h2>{project.label}</h2><p>Project baru siap. Hasil pengambilan tersimpan di project ini.</p></div><Link to={'/pulse/overview?topic='+encodeURIComponent(project.id)}>Buka dashboard project <PulseArrow/></Link></header>
   <div className="pqs-actions"><Link to={'/pulse/monitor?topic='+encodeURIComponent(project.id)}>Atur pemantauan berkala</Link><PulseButton disabled={busy} onClick={()=>{setProject(null);setPosts(null);setNotices([]);setError('');setProgress('');}}>Pencarian baru</PulseButton></div>
   {posts&&<PostFeed key={project.id} posts={posts} topicId={project.id}/>}</section>}
 </section>;
}
