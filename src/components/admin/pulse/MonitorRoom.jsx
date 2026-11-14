import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, RefreshCw, Radio } from 'lucide-react';
import api from '../../../lib/api';
import { pulseDate, pulseError, formatCount } from '../../../lib/pulseData';
import { canChangeAlertPage, latestManualProviderRun } from '../../../lib/pulseMonitor';
import './monitor-room.css';
import { PlatformLabel } from './PlatformIcon';
import InfoTip from '../../../pulse/InfoTip';
import { PulseButton, PulseBadge } from '../../ui/PulseUI';
import {PulsePanelHeading} from '../../ui/PulsePatterns';
import { PulseTag } from '../../ui/PulseTag';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';

const alertKinds={collection_error:['danger','Gangguan pengumpulan'],volume_spike:['warning','Lonjakan volume teramati'],engagement_growth:['info','Interaksi meningkat']};
const jobStates={queued:['info','Menunggu'],running:['accent','Berjalan'],retry:['warning','Dicoba ulang'],succeeded:['success','Berhasil'],success:['success','Berhasil'],done:['success','Selesai'],failed:['danger','Gagal'],error:['danger','Gagal']};

const workflowLabels={new:'Baru',reviewing:'Sedang ditinjau',done:'Selesai'};
const initialWorkflow={status:'new',assignee:null,revision:0,history:[]};

function AlertWorkflow({ alert, disabled, onSaved }) {
  const workflow=alert.workflow||initialWorkflow;
  const [draft,setDraft]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  const current=draft||workflow;
  const stale=!!draft&&draft.revision!==workflow.revision;
  const change=(field,value)=>{setDraft({...current,[field]:value});setSaved(false)};
  const submit=async event=>{
    event.preventDefault();
    if(saving||disabled||stale)return;
    setSaving(true);setError('');setSaved(false);
    try{
      const updated=await api.put('/admin/pulse/monitor/alerts/'+encodeURIComponent(alert.id)+'/workflow',{
        status:current.status,assignee:current.assignee||null,expected_revision:current.revision,
      });
      onSaved(updated);setDraft(null);setSaved(true);
    }catch(e){setError(pulseError(e))}finally{setSaving(false)}
  };
  return <div className="pm-workflow">
    <p className="pm-workflow-summary"><PulseBadge tone={workflow.status==='done'?'success':workflow.status==='reviewing'?'accent':'neutral'}>{workflowLabels[workflow.status]}</PulseBadge><span>Penanggung jawab: {workflow.assignee||'Belum ditetapkan'}</span></p>
    <details><summary>Kelola tindak lanjut</summary>
      <form onSubmit={submit} aria-label={'Tindak lanjut '+alert.title}>
        <fieldset disabled={disabled||saving}>
          <label>Status tindak lanjut<select value={current.status} onChange={e=>change('status',e.target.value)}>{Object.entries(workflowLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label>Penanggung jawab (opsional)<input type="text" maxLength={120} value={current.assignee||''} onChange={e=>change('assignee',e.target.value)} placeholder="Nama atau tim"/></label>
          <p>Maks. 120 karakter. Kosongkan untuk melepas penugasan. Penyimpanan memerlukan akses owner/admin, tidak mengirim notifikasi atau menjalankan pengambilan data.</p>
          {stale&&<p role="alert">Alert telah berubah. Muat nilai terbaru sebelum menyimpan.</p>}
          <div className="pm-workflow-actions"><PulseButton type="submit" variant="primary" busy={saving} busyLabel="Menyimpan…" disabled={!draft||stale}>Simpan tindak lanjut</PulseButton><PulseButton disabled={!draft} onClick={()=>{setDraft(null);setError('')}}>Muat nilai terbaru</PulseButton></div>
        </fieldset>
      </form>
      {error&&<p role="alert" className="pm-workflow-error">{error} Gunakan Perbarui status untuk memuat perubahan server; draf Anda tetap tersedia.</p>}
      {saved&&<p role="status">Tindak lanjut tersimpan.</p>}
      <details className="pm-workflow-history"><summary>Riwayat tindak lanjut ({workflow.history.length})</summary>{workflow.history.length?<ol>{[...workflow.history].reverse().map((entry,index)=><li key={workflow.history.length-index}><strong>{workflowLabels[entry.to.status]} · {entry.to.assignee||'Tanpa penanggung jawab'}</strong><span>Dari {workflowLabels[entry.from.status]} · {entry.from.assignee||'Tanpa penanggung jawab'}</span><span>{pulseDate(entry.timestamp)} · ID aktor: {entry.actor}</span></li>)}</ol>:<p>Belum ada perubahan tindak lanjut. Penandaan dibaca dicatat terpisah.</p>}</details>
    </details>
  </div>;
}

function QueueChart({counts}){
 const rows=[['queued','Menunggu','Tertahan jadwal atau kuota'],['running','Berjalan','Request sedang diproses'],['retry','Dicoba ulang','Percobaan sebelumnya belum berhasil']];
 const total=rows.reduce((sum,[key])=>sum+(counts[key]||0),0);
 return <section className="pm-queue" aria-label="Aktivitas pengumpulan"><div className="pm-queue-heading"><h3>Aktivitas pengumpulan</h3><p>{total} pekerjaan aktif dalam cakupan project <InfoTip label="Tentang aktivitas pengumpulan">Status saat pembaruan terakhir, bukan tren historis. Pekerjaan menunggu dapat tertahan kuota atau jadwal. Dicoba ulang berarti percobaan sebelumnya belum berhasil.</InfoTip></p></div><PulseStatGrid label="Pekerjaan pengumpulan aktif">{rows.map(([key,label,note])=><PulseStat key={key} label={label} value={counts[key]||0} note={note}/>)}</PulseStatGrid>{!total&&<p className="pm-queue-empty">Tidak ada pekerjaan aktif saat ini.</p>}</section>;
}

const names={comments:'Komentar otomatis',profiles:'Foto kanal & logo media',profiles_x:'Foto profil akun X',rss:'Berita Indonesia',xpoz:'Xpoz / X',youtube:'YouTube',instagram:'Instagram',tiktok:'TikTok',reddit:'Reddit'};
const sourcePlatform=source=>({rss:'news',xpoz:'x'}[source]||source);
const gapText=seconds=>seconds>=60?`${Math.round(seconds/60)} menit`:`${seconds} detik`;
const limitText=worker=>worker.daily_limit<0?'tanpa batas':worker.daily_limit;
const capReached=worker=>worker.daily_limit>=0&&worker.used>=worker.daily_limit;
function WorkerSettings({ worker, save }) {
  const [unlimited,setUnlimited]=useState(worker.daily_limit<0);
  const [limit,setLimit]=useState(worker.daily_limit<0?144:worker.daily_limit);
  const next=unlimited?-1:Number(limit);
  const pause=worker.min_gap_seconds?gapText(worker.min_gap_seconds):null;
  return <article className="pm-worker"><h3>{names[worker.provider]}</h3><p><strong>{worker.daily_limit<0?worker.used:`${worker.used} / ${worker.daily_limit}`}</strong> {worker.provider==='comments'?'posting diambil komentarnya hari ini':worker.provider==='profiles'?'permintaan hari ini · tanpa biaya kredit':worker.provider==='profiles_x'?'permintaan hari ini · tiap permintaan 25 akun, sekitar 50 kredit':'percobaan hari ini'} · {worker.daily_limit<0?'tanpa batas harian · ':''}global, semua project</p><p>{worker.blocked_reason?'Diblokir: '+worker.blocked_reason:worker.lease_until?'Request sedang diproses':worker.daily_limit===0?'Kuota nol, tidak akan berjalan':worker.daily_limit<0?`Tanpa batas harian${pause?`, jeda ${pause} antar request`:''}`:capReached(worker)?'Batas harian habis, menunggu reset pukul 07.00 WIB':'Siap menerima pekerjaan'}</p>
    <form onSubmit={e=>{e.preventDefault();save('/workers/'+worker.provider,{daily_limit:next},unlimited?`Jalankan worker ini tanpa batas harian? Aplikasi tidak lagi membatasi jumlah percobaan${pause?`; hanya ada jeda ${pause} antar request`:''}. Kuota dan tagihan provider tetap berlaku.`:'Simpan batas worker global? Ini membatasi jumlah percobaan, bukan nominal tagihan provider.');}}>
      <label className="pm-unlimited"><input type="checkbox" role="switch" className="pu-switch-input" checked={unlimited} onChange={e=>setUnlimited(e.target.checked)}/> Tanpa batas harian{pause?` · jeda ${pause} antar request`:''}</label>
      <label>Batas percobaan / hari UTC<input aria-label={'Batas harian '+worker.provider} type="number" required min="0" max="144" disabled={unlimited} value={limit} onChange={e=>setLimit(e.target.value)}/></label><PulseButton type="submit">Simpan batas</PulseButton></form>
    {worker.blocked_reason&&<PulseButton onClick={()=>save('/workers/'+worker.provider,{daily_limit:next,clear_block:true},'Buka blokir provider setelah penyebab kuota/kredensial diperbaiki? Jadwal aktif dapat kembali memakai kuota.')}>Buka blokir</PulseButton>}
  </article>;
}

const archivePlatforms=[['x','X'],['instagram','Instagram'],['tiktok','TikTok'],['reddit','Reddit'],['youtube','YouTube'],['news','Berita']];
const archiveErrors={rate_limited:'dibatasi penyedia',access_or_quota_restricted:'kuota penyedia habis',plan_restricted:'tidak tersedia di paket',authentication_failed:'kredensial ditolak',not_configured:'belum dikonfigurasi',pending:'penyedia belum selesai memproses'};
/** Pulls older posts for one platform and a date range. Explicit and bounded: at most eight requests per run. */
function ArchivePull({ topicId, disabled, onDone }) {
  const [state,setState]=useState({busy:false,result:null,error:''});
  async function submit(event){
    event.preventDefault();
    const form=new FormData(event.currentTarget),from=form.get('from'),to=form.get('to');
    if(!from||!to||from>to){setState({busy:false,result:null,error:'Isi tanggal mulai dan akhir; tanggal akhir tidak boleh sebelum tanggal mulai.'});return;}
    setState({busy:true,result:null,error:''});
    try{
      const result=await api.post('/admin/pulse/topics/'+encodeURIComponent(topicId)+'/backfill',{platform:form.get('platform'),from,to});
      setState({busy:false,result,error:''});window.dispatchEvent(new Event('pulse-data-changed'));onDone?.();
    }catch(error){setState({busy:false,result:null,error:error.status===409?'Pengambilan lain sedang berjalan untuk project ini. Coba lagi sebentar.':error.status===422?(error.message||'Rentang tanggal tidak valid (maksimal 92 hari).'):'Arsip belum berhasil ditarik. Coba lagi.'});}
  }
  const r=state.result;
  return <div className="pm-archive">
    <p>Jadwal biasa mengambil posting terbaru. Tarik arsip mengisi posting lama: rentang dibagi menjadi paling banyak 8 jendela, satu permintaan per jendela, sampai 300 posting tiap permintaan.</p>
    <form onSubmit={submit}><fieldset disabled={disabled||state.busy}>
      <label>Platform<select name="platform" defaultValue="x">{archivePlatforms.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Tanggal mulai<input name="from" type="date" required/></label>
      <label>Tanggal akhir<input name="to" type="date" required/></label>
      <PulseButton type="submit" busy={state.busy} busyLabel="Menarik arsip…">Tarik arsip</PulseButton>
    </fieldset></form>
    <div aria-live="polite">
      {state.error&&<p className="pm-error" role="alert">{state.error}</p>}
      {r&&<><p className="pm-status" role="status"><strong>{formatCount(r.ingested)} posting baru</strong> dari {formatCount(r.fetched)} yang diterima.{r.stopped?` Berhenti lebih awal: ${archiveErrors[r.stopped]||'penyedia menolak permintaan'}.`:''}</p>
        <ul className="pm-archive-windows">{r.windows.map(w=><li key={w.from}><span>{w.from===w.to?w.from:`${w.from} s.d. ${w.to}`}</span><span>{w.status==='success'?`${formatCount(w.fetched)} diterima · ${formatCount(w.ingested)} baru`:(archiveErrors[w.status]||'gagal diambil')}</span></li>)}</ul></>}
    </div>
  </div>;
}

function ProjectSchedule({ worker, schedule, topicId, save, runs, runsError }) {
  const social=['instagram','tiktok','reddit'].includes(worker.provider);
  const [interval,setIntervalValue]=useState(schedule?.interval_minutes||(social?1440:60));
  const manual = latestManualProviderRun(runs,worker.provider);
  const result = manual?.providers?.[worker.provider];
  return <article className="pm-worker"><h3><PlatformLabel platform={sourcePlatform(worker.provider)} /></h3>
    {['xpoz','instagram','tiktok','reddit'].includes(worker.provider)&&<p>Berbagi kuota Xpoz global: {worker.used} / {limitText(worker)} terpakai.{social?' Maks. 300 posting per percobaan.':''}</p>}
    <p><PulseBadge tone={schedule?.enabled?'success':'neutral'}>Otomatis · {schedule?.enabled?'Jadwal aktif':'Jadwal dijeda'}</PulseBadge></p>
    <p>Otomatis terakhir berhasil: {schedule?.last_success_at ? pulseDate(schedule.last_success_at) : 'Belum ada keberhasilan worker otomatis'}</p>
    {schedule?.enabled && <p>{worker.blocked_reason ? 'Worker diblokir: '+worker.blocked_reason : capReached(worker) ? 'Menunggu kuota global, reset pukul 07.00 WIB' : `Jadwal berikutnya: ${pulseDate(schedule.next_run_at)} (tergantung antrean & kuota)`}</p>}
    <p><strong>Pengambilan manual terakhir</strong><br/>{social ? 'Lihat riwayat pengambilan di Sumber & Cakupan.' : runsError ? 'Riwayat manual gagal dimuat. Coba Perbarui status.' : manual ? <>{pulseDate(manual.finished_at || manual.started_at)} · {result.status === 'success' ? 'Berhasil' : `Status: ${result.status || 'tidak tersedia'}`}{result.fetched != null ? ` · ${result.fetched} diambil` : ''}{result.ingested != null ? ` · ${result.ingested} baru` : ''}</> : 'Tidak ditemukan dalam 100 riwayat crawl terakhir'}</p>
    <form onSubmit={e=>{e.preventDefault();save('/topics/'+encodeURIComponent(topicId)+'/'+worker.provider,{enabled:!schedule?.enabled,interval_minutes:Number(interval)},schedule?.enabled?'Jeda jadwal project ini? Request yang sudah dimulai dapat selesai.':'Aktifkan pengambilan berulang untuk project ini? Akan memakai kuota provider sesuai batas global.');}}>
      <label>Interval project (menit)<input aria-label={'Interval '+worker.provider} type="number" required min="5" max="1440" value={interval} onChange={e=>setIntervalValue(e.target.value)}/></label>
      <PulseButton type="submit" disabled={!schedule?.enabled&&(worker.daily_limit===0||!!worker.blocked_reason)}>{schedule?.enabled?'Jeda jadwal':'Aktifkan jadwal'}</PulseButton>
      {!schedule?.enabled&&(worker.daily_limit===0||!!worker.blocked_reason)&&<small>Aktivasi memerlukan kuota global positif atau tanpa batas, dan pengumpul yang tidak terblokir. Lihat batas pengumpulan.</small>}
    </form>
  </article>;
}

export default function MonitorRoom(props) {
  // A project change resets pagination, drafts and in-flight response ownership.
  return <MonitorProject key={props.topicId ? `topic:${props.topicId}` : 'all-topics'} {...props}/>;
}

function MonitorProject({ topicId, topics = [], onOpenAlert, disabled }) {
  const [data,setData]=useState(null),[error,setError]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [page,setPage]=useState(0);
  const [runs,setRuns]=useState([]),[runsError,setRunsError]=useState(false);
  const live=useRef(false),fetching=useRef(false),generation=useRef(0);
  const invalidate=useCallback(()=>{generation.current+=1;fetching.current=false},[]);
  const load=useCallback(async()=>{
    if(!live.current||fetching.current||disabled)return;
    fetching.current=true;
    const request=++generation.current;
    try{
      const [monitorResult,manualResult]=await Promise.allSettled([
        api.get('/admin/pulse/monitor',{topic_id:topicId,alert_offset:page*50}),
        topicId ? api.get('/admin/pulse/topics/'+encodeURIComponent(topicId)+'/runs',{limit:100}) : Promise.resolve([]),
      ]);
      if(live.current&&request===generation.current){
        if(monitorResult.status==='fulfilled'){setData(monitorResult.value);setError(null)}else setError(monitorResult.reason);
        setRuns(manualResult.status==='fulfilled'?manualResult.value:[]);
        setRunsError(manualResult.status==='rejected');
      }
    }catch(e){if(live.current&&request===generation.current)setError(e)}finally{if(request===generation.current)fetching.current=false}
  },[disabled,topicId,page]);
  useEffect(()=>{live.current=true;load();const timer=setInterval(load,30000);return()=>{live.current=false;invalidate();clearInterval(timer)}},[load,invalidate]);
  const save=async(path,body,question)=>{
    if(busy||!window.confirm(question))return;
    setBusy(true);setMessage('');
    try{await api.put('/admin/pulse/monitor'+path,body);setMessage('Pengaturan tersimpan.');await load()}catch(e){setError(e)}finally{setBusy(false)}
  };
  const ack=async id=>{if(busy)return;setBusy(true);try{await api.post('/admin/pulse/monitor/alerts/'+encodeURIComponent(id)+'/ack');await load()}catch(e){setError(e)}finally{setBusy(false)}};
  const workflowSaved=updated=>{
    if(!live.current)return;
    invalidate(); // Discard any poll started before this explicit save.
    setData(previous=>previous?{...previous,alerts:previous.alerts.map(alert=>alert.id===updated.id?updated:alert)}:previous);
  };
  const alerts=(data?.alerts||[]).filter(a=>!topicId||a.topic_id===topicId);
  const scheduleWorkers=(data?.workers||[]).flatMap(w=>w.provider==='xpoz'?[w,{...w,provider:'instagram'},{...w,provider:'tiktok'},{...w,provider:'reddit'}]:[w]);
  const scopeLabel=topicId?(topics.find(t=>t.id===topicId)?.label||topicId):'Semua project (semua topik)';
  return <section className="pulse-panel pm-room" id="pulse-monitor" aria-label="Monitor Project">
    <PulsePanelHeading title="Pengumpulan &amp; alert" description={scopeLabel+' · aktivitas pengumpulan dan alert'} icon={Radio}><PulseButton onClick={load} disabled={disabled||busy}><RefreshCw size={14}/> Perbarui status</PulseButton></PulsePanelHeading>
    {error&&<p className="pm-error" role="alert">{pulseError(error)} {data&&'Status di bawah mungkin sudah kedaluwarsa.'}</p>}
    {message&&<p className="pm-status" role="status">{message}</p>}
    {!data?<p className="pm-status">{disabled?'Login admin diperlukan.':'Memuat status monitoring…'}</p>:<>
      <div className="pm-columns">
      <div className="pm-col-alerts">
      <div className="pm-inbox-heading"><h3><Bell size={18}/> Alert masuk <span>{data.unread} belum ditandai · {scopeLabel}</span></h3><small>Status diperiksa setiap 30 detik selama dashboard terbuka · {pulseDate(data.server_time)}</small></div>
      <div className="ps-help-row">Kriteria alert <InfoTip label="Tentang kriteria alert">Alert awal: ≥5 posting dan ≥3 penulis pada isu serupa dalam 30 menit, setelah ada data pembanding pertama. Ini ambang aktivitas, bukan klaim viral terverifikasi. Data lama yang baru masuk tidak dianggap breaking news.</InfoTip></div>
      {!alerts.length?<div className="pm-empty"><Bell size={24}/><strong>Belum ada alert pada cakupan ini</strong><p>Alert akan muncul setelah pengumpulan aktif dan kondisi terpenuhi. Data historis tidak dibuat menjadi notifikasi palsu.</p></div>:<div className="pm-alerts">{alerts.map(a=><article key={a.id} className={a.acknowledged_at?'is-read':''}><div><p className="pm-alert-meta"><PulseTag tone={(alertKinds[a.kind]||['accent'])[0]} dot>{(alertKinds[a.kind]||[0,'Ambang aktivitas tercapai'])[1]}</PulseTag><span>{topics.find(t=>t.id===a.topic_id)?.label||a.topic_id}</span></p><h4>{a.title}</h4><small>{pulseDate(a.created_at)}{a.detail.posts?` · ${a.detail.posts} posting / ${a.detail.authors} penulis`:''}</small>{a.kind==='engagement_growth' && <p>+{formatCount(a.detail.delta_engagement)} interaksi · {Number(a.detail.rate_per_hour).toLocaleString('id-ID',{maximumFractionDigits:1})}/jam antara dua pengamatan. Buka analisis untuk melihat posting sumber.</p>}{a.kind==='volume_spike' && <p>{a.detail.posts} posting / 30 menit dibanding {a.detail.previous_posts} pada 30 menit sebelumnya ({a.detail.ratio}×). Minimal 10 posting, 3 akun, dan 3× baseline. Cakupan crawl dapat memengaruhi hasil.</p>}</div><div><AlertWorkflow alert={a} disabled={busy||disabled} onSaved={workflowSaved}/><PulseButton arrow onClick={()=>onOpenAlert(a)}>{a.issue_id?'Analisis penyebaran':'Lihat topik'}</PulseButton><PulseButton variant="quiet" disabled={busy||disabled||!!a.acknowledged_at} onClick={()=>ack(a.id)}>{a.acknowledged_at?'Sudah dibaca':'Tandai dibaca'}</PulseButton></div></article>)}</div>}
      <div className="pulse-pagination"><PulseButton disabled={!canChangeAlertPage(page,data.alert_total,busy,-1)} onClick={()=>{setData(null);setPage(page-1)}}>Alert sebelumnya</PulseButton><span>Halaman alert {page+1} / {Math.max(1,Math.ceil(data.alert_total/50))}</span><PulseButton disabled={!canChangeAlertPage(page,data.alert_total,busy,1)} onClick={()=>{setData(null);setPage(page+1)}}>Alert berikutnya</PulseButton></div>
      </div>
      <div className="pm-col-collect">
      <QueueChart counts={data.job_counts}/>
      {topicId&&<details className="pm-settings"><summary>Tarik arsip · posting lama per rentang tanggal</summary><ArchivePull topicId={topicId} disabled={busy||disabled} onDone={load}/></details>}
      <details className="pm-settings"><summary>Jadwal project · {scopeLabel}</summary>
        <div className="ps-help-row">Jadwal & pengambilan manual <InfoTip label="Tentang jadwal dan pengambilan manual">Jadwal otomatis dan pengambilan manual dicatat terpisah. Jeda tidak membatalkan permintaan yang sudah berjalan. Riwayat manual di sini berasal dari tombol Crawl manual. Detail Instagram/TikTok dan komentar tersedia di Sumber & Cakupan dan Komentar.</InfoTip></div>
        {topicId?<fieldset disabled={busy||disabled}><div className="pm-workers">{scheduleWorkers.map(w=>{const s=data.schedules.find(s=>s.topic_id===topicId&&s.provider===w.provider);return <ProjectSchedule key={[w.provider,topicId,s?.enabled,s?.interval_minutes].join(':')} worker={w} schedule={s} topicId={topicId} save={save} runs={runs} runsError={runsError}/>})}</div></fieldset>:<p>Pilih project melalui pemilih project untuk mengatur jadwalnya.</p>}
      </details>
      <details className="pm-settings pm-global-settings"><summary>Batas pengumpulan · semua project</summary>
        <p><PulseBadge tone={data.scheduler_running?'success':'warning'}>{data.scheduler_running?'Penjadwal berjalan':'Penjadwal tidak berjalan'}</PulseBadge> Kuota hari UTC: {data.quota_day_utc}</p>
        <p>Batas dan pemakaian di sini berlaku global untuk semua project. Xpoz berbagi batas antara jadwal X, Instagram, TikTok dan pengambilan manual Instagram/TikTok. Crawl manual umum dan komentar memakai jalur terpisah, tidak termasuk hitungan ini. YouTube: satu pencarian + maksimal satu batch video; berita: satu feed. Bukan batas kredit/tagihan vendor. Percobaan gagal dan retry tetap terhitung. Tidak ada upgrade otomatis.</p>
        <fieldset disabled={busy||disabled}><div className="pm-workers">{data.workers.map(w=><WorkerSettings key={[w.provider,w.daily_limit,w.blocked_reason].join(':')} worker={w} save={save}/>)}</div></fieldset>
        <p>Kuota Xpoz/YouTube awal = 0; tetapkan batas sebelum aktivasi. Menyimpan batas tidak mengaktifkan jadwal yang dijeda.</p>
      </details>
      <details className="pm-jobs"><summary>Riwayat crawl otomatis · 50 pekerjaan terakhir · {scopeLabel}</summary><div className="pm-table"><table><thead><tr><th>Sumber / project</th><th>Status</th><th>Percobaan</th><th>Waktu berikutnya / selesai</th><th>Hasil</th></tr></thead><tbody>{data.jobs.filter(j=>!topicId||j.topic_id===topicId).map(j=><tr key={j.id}><td>{names[j.provider]}<small>{topics.find(t=>t.id===j.topic_id)?.label||j.topic_id}</small></td><td><PulseTag tone={(jobStates[j.status]||['neutral'])[0]} dot>{(jobStates[j.status]||[0,j.status])[1]}</PulseTag></td><td>{j.attempts} / 3</td><td>{pulseDate(j.finished_at||j.available_at)}</td><td>{j.result?.error|| (j.result?`${j.result.ingested} baru / ${j.result.snapshots} snapshot`:'Menunggu jadwal & kuota')}</td></tr>)}</tbody></table></div></details>
      </div>
      </div>
    </>}
  </section>;
}
