import {useEffect,useRef,useState} from 'react';
import {Archive,FolderOpen} from 'lucide-react';
import api from '../lib/api';
import {archiveInput,restoreArchive} from '../lib/pulseArchive';
import {pulseDate} from '../lib/pulseData';
import {PulseButton} from '../components/ui/PulseUI';
import './report-archive.css';

export default function ReportArchive({topicId,report,onOpen}){
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0);
 const [title,setTitle]=useState(''),[saved,setSaved]=useState(null);
 const live=useRef(false),lock=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{
  if(!topicId)return;
  let active=true;
  api.get('/admin/pulse/reports',{topic_id:topicId,offset:page*20}).then(data=>{if(active){setState(data);setError('');}}).catch(e=>{if(active)setError(e.message||'Arsip belum dapat dimuat.');});
  return()=>{active=false;};
 },[topicId,page,refresh]);
 async function save(event){
  event.preventDefault();if(lock.current||!report)return;lock.current=true;setBusy(true);setError('');
  try{
   const created=await api.post('/admin/pulse/reports',archiveInput(report,title||report.topic.label));
   if(live.current){setSaved({report,id:created.id});setPage(0);setRefresh(v=>v+1);}
  }catch(e){if(live.current)setError(e.message||'Arsip gagal disimpan.');}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 async function open(id){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const archive=await api.get('/admin/pulse/reports/'+encodeURIComponent(id),{topic_id:topicId});const restored=restoreArchive(archive);if(live.current){onOpen(restored,archive);setSaved({report:restored,id});}}
  catch(e){if(live.current)setError(e.message||'Arsip gagal dibuka.');}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 return <section className="pr-archive" aria-label="Arsip laporan server"><header><div><h2><Archive size={18} aria-hidden="true"/> Arsip laporan</h2></div><PulseButton onClick={()=>setRefresh(v=>v+1)} disabled={busy}>Perbarui arsip</PulseButton></header>
  <form onSubmit={save}><label>Judul arsip<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={report?.topic?.label||'Laporan project'} maxLength={160}/></label><PulseButton type="submit" variant="primary" busy={busy} disabled={!report||saved?.report===report}>Simpan snapshot ke server</PulseButton></form>
  {!report&&<p className="pr-archive-hint">Laporan belum selesai dimuat.</p>}
  {saved?.report===report&&<p role="status">Snapshot sudah tersimpan.</p>}
  {error&&<p role="alert">{error}</p>}
  {!state&&!error&&<p role="status">Memuat arsip…</p>}
  {state&&<><ul>{state.items.map(item=><li key={item.id}><div><strong>{item.title}</strong><span>{pulseDate(item.created_at)} · {item.post_count} posting</span><small>{item.period.from||'Awal data'} → {item.period.to||'Akhir data'}</small></div><PulseButton disabled={busy} onClick={()=>open(item.id)}><FolderOpen size={15} aria-hidden="true"/> Buka arsip</PulseButton></li>)}</ul>{!state.total&&<p>Belum ada arsip.</p>}{state.total>20&&<nav aria-label="Halaman arsip"><PulseButton disabled={busy||page===0} onClick={()=>setPage(v=>v-1)}>Sebelumnya</PulseButton><span>{page+1} / {Math.ceil(state.total/20)}</span><PulseButton disabled={busy||(page+1)*20>=state.total} onClick={()=>setPage(v=>v+1)}>Berikutnya</PulseButton></nav>}</>}
 </section>;
}
