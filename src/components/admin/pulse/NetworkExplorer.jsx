import React, { useEffect, useId, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { networkPositions, replayEvents, replayFrame, topViralAccounts } from '../../../lib/pulseReplay';
import { pulseDate, safeSourceUrl } from '../../../lib/pulseData';
import AccountSignal from './AccountSignal';
import ChronologyCards from './ChronologyCards';
import ChronologyProfile from './ChronologyProfile';
import NetworkAccountNode from './NetworkAccountNode';
import { accountPhoto } from '../../../lib/pulseAccountPhoto.js';
import { chronologyRows } from '../../../lib/pulseChronology.js';
import './network-explorer.css';
import './mention-timeline.css';
import './network-layout.css';

const color = platform => ({ x: 'var(--nx-lavender)', youtube: 'var(--nx-peach)', news: 'var(--nx-mint)' }[platform] || 'var(--nx-blue)');
function Sources({ rows }) {
  return <ul className="nx-sources">{rows.map((p,i)=><li key={p.id+':'+i}><small>{p.author} · {pulseDate(p.published_at)}</small>{safeSourceUrl(p.url)?<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer">{p.title || 'Buka postingan asli'}</a>:<span>{p.title || 'Tautan tidak tersedia'}</span>}</li>)}</ul>;
}
export default function NetworkExplorer({ data, posts = [], initialMode = '2d' }) {
  const events = useMemo(()=>replayEvents(data),[data]);
  const [mode,setMode]=useState(initialMode);
  const [kind,setKind]=useState('all');
  const [includeIsolated,setIncludeIsolated]=useState(true);
  const [step,setStep]=useState(initialMode === 'chronology' ? null : 0);
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1);
  const [selected,setSelected]=useState('');
  const [hovered,setHovered]=useState('');

  const [angle,setAngle]=useState(15);
  const [tilt,setTilt]=useState(15);
  const [page,setPage]=useState(0);
  const arrow=useId().replace(/:/g,'');
  const index=step===null?events.length:Math.min(step,Math.max(0,events.length-1));
  const full=step===null;
  const cutoff=full?Infinity:(events[index]?.time ?? -Infinity);
  useEffect(()=>{
    if(!playing || !events.length)return;
    const timer=setInterval(()=>setStep(previous=>{
      const next=(previous ?? -1)+speed;
      return Math.min(events.length-1,next);
    }),650);
    return ()=>clearInterval(timer);
  },[playing,speed,events.length]);
  // Stop scheduling when the last timestamp is reached; do not insert undated data into playback.
  const atEnd=step!==null && step>=events.length-1;
  useEffect(()=>{if(atEnd && playing){const timer=setTimeout(()=>setPlaying(false),0);return()=>clearTimeout(timer)}},[atEnd,playing]);
  const frame=useMemo(()=>replayFrame(data,cutoff),[data,cutoff]);
  const graph=useMemo(()=>{
    const nodes=[...data.nodes].sort((a,b)=>(b.connections||0)-(a.connections||0)||a.id.localeCompare(b.id)).slice(0,120);
    const ids=new Set(nodes.map(n=>n.id));
    return {nodes,edges:data.edges.filter(e=>ids.has(e.source)&&ids.has(e.target))};
  },[data]);
  const positions=useMemo(()=>networkPositions(graph),[graph]);
  const linkedIds=new Set(frame.edges.filter(e=>kind==='all'||e.kind===kind).flatMap(e=>[e.source,e.target]));
  const nodes=frame.nodes.filter(n=>(mode==='chronology'||positions[n.id])&&(includeIsolated||linkedIds.has(n.id)));
  const chronology=useMemo(()=>chronologyRows(frame,{kind,includeIsolated}),[frame,kind,includeIsolated]);
  const ids=new Set(nodes.map(n=>n.id));
  const edges=frame.edges.filter(e=>(kind==='all'||e.kind===kind)&&ids.has(e.source)&&ids.has(e.target));
  const degree={};edges.forEach(e=>{degree[e.source]=(degree[e.source]||0)+e.count;degree[e.target]=(degree[e.target]||0)+e.count});
  const active=nodes.find(n=>n.id===hovered)||nodes.find(n=>n.id===selected)||nodes[0];
  const account=frame.accounts.find(a=>a.id===active?.id);
  const connections=edges.filter(e=>e.source===active?.id||e.target===active?.id);
  const top=useMemo(()=>topViralAccounts(posts),[posts]);
  const projected=Object.fromEntries(nodes.map(n=>{
    const p=positions[n.id] || {x:0,y:0,z:0},r=angle*Math.PI/180,t=tilt*Math.PI/180;
    const x=mode==='3d'?p.x*Math.cos(r)-p.z*Math.sin(r):p.x;
    const z=mode==='3d'?p.x*Math.sin(r)+p.z*Math.cos(r):0;
    const y=mode==='3d'?p.y*Math.cos(t)-z*Math.sin(t):p.y;
    const scale=mode==='3d'?650/(650+z):1;
    return [n.id,{x:350+x*scale,y:250+y*scale}];
  }));
  // Give profile circles room without changing the underlying relationship data.
  if (mode === '2d') for (let pass=0;pass<35;pass++) {
    for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) {
      const a=projected[nodes[i].id],b=projected[nodes[j].id];
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if (d>=58) continue;
      const ux=d?dx/d:1,uy=d?dy/d:0,push=(58-d)/2;
      a.x=Math.max(32,Math.min(668,a.x-ux*push)); a.y=Math.max(32,Math.min(458,a.y-uy*push));
      b.x=Math.max(32,Math.min(668,b.x+ux*push)); b.y=Math.max(32,Math.min(458,b.y+uy*push));
    }
  }
  const visibleEvents=events.filter(e=>e.time<=cutoff);
  const pages=Math.max(1,Math.ceil(visibleEvents.length/20));
  const safePage=Math.min(page,pages-1);
  const bins=useMemo(()=>{
    const result=Array(48).fill(0),start=events[0]?.time||0,span=Math.max(1,(events.at(-1)?.time||0)-start);
    events.forEach(e=>result[Math.min(47,Math.floor((e.time-start)/span*48))]++);
    return result;
  },[events]);
  const rangeStart=events[0]?.time,rangeEnd=events.at(-1)?.time;
  const cursor=full?100:events.length?100*(cutoff-rangeStart)/Math.max(1,rangeEnd-rangeStart):0;
  return <section className="nx" aria-label="Viral Replay data nyata">
    <header className="nx-heading"><div><h2>Jelajahi penyebaran</h2><p>Arahkan ke foto atau inisial untuk preview posting; klik untuk mengunci akun. Garis menunjukkan mention atau konten serupa, bukan bukti siapa menyalin siapa.</p></div></header>
    <div className="nx-period-controls"><div><small>Mulai · publikasi pertama</small><strong>{pulseDate(events[0]?.published_at)}</strong></div><span aria-hidden="true">→</span><div><small>Akhir · publikasi terakhir</small><strong>{pulseDate(events.at(-1)?.published_at)}</strong></div><button disabled={!events.length} onClick={()=>{setPlaying(false);setStep(0);setPage(0);setSelected('');setHovered('')}}>Kembali ke awal</button><button aria-pressed={full} onClick={()=>{setPlaying(false);setStep(null);setPage(0)}}>Lihat seluruh periode</button><p>{full?'Ringkasan seluruh periode, termasuk posting tanpa tanggal.':'Urutan dari awal ke akhir. Tekan Putar urutan pada timeline untuk mengikuti perkembangannya.'}</p></div>
    <div className="nx-toolbar"><div role="group" aria-label="Mode explorer">{[['chronology','Jejak Penyebaran'],['2d','Peta 2D'],['3d','Perspektif 3D'],['timeline','Urutan waktu']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setPage(0)}}>{label}</button>)}</div><label>Hubungan <select value={kind} onChange={e=>{setKind(e.target.value);setPage(0)}} aria-label="Jenis hubungan explorer"><option value="all">Semua</option><option value="mention">Menyebut akun</option><option value="similarity">Kemiripan</option></select></label></div>
    <div className="nx-counts"><span><b>{nodes.length}</b> / {frame.nodes.length} akun tampil</span><span><b>{edges.length}</b> hubungan tampil</span><span><b>{visibleEvents.length}</b> posting bertanggal</span><span>{full?'Seluruh sampel':pulseDate(events[index]?.published_at)}</span><label><input type="checkbox" checked={includeIsolated} onChange={e=>setIncludeIsolated(e.target.checked)}/> Sertakan akun tanpa hubungan</label></div>
    <div className="nx-replay"><div className="nx-replay-title"><strong>Timeline publikasi</strong><small>{events.length} posting bertanggal · {data.analyzed_posts} posting dianalisis</small></div><svg viewBox="0 0 960 65" preserveAspectRatio="none" className="nx-histogram" role="img" aria-label="Distribusi publikasi dalam 48 interval sama panjang">{bins.map((v,i)=><rect key={i} x={i*20} y={60-v/Math.max(1,...bins)*55} width="12" height={v/Math.max(1,...bins)*55} rx="2" fill="var(--nx-lavender)" opacity=".65"/>)}<line x1={cursor*9.6} x2={cursor*9.6} y1="0" y2="65" stroke="var(--nx-text)"/></svg>
      <div className="nx-play-controls"><button disabled={!events.length} onClick={()=>{if(playing){setPlaying(false)}else{if(full||atEnd)setStep(0);setPlaying(true)}}}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Jeda':'Putar urutan'}</button><input aria-label="Posisi replay" type="range" min="0" max={Math.max(0,events.length-1)} value={Math.min(index,Math.max(0,events.length-1))} disabled={!events.length} onChange={e=>{setPlaying(false);setStep(Number(e.target.value));setPage(0)}}/><select aria-label="Kecepatan replay" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="3">3×</option><option value="10">10×</option></select><button onClick={()=>{setPlaying(false);setStep(null);setAngle(15);setTilt(15)}}><RotateCcw size={15}/> Semua waktu</button></div>
      <div className="nx-time-labels"><span>{pulseDate(events[0]?.published_at)}</span><span>{pulseDate(events.at(-1)?.published_at)}</span></div>
      <details className="nx-method"><summary>Cara membaca peta & batas analisis</summary><p>Replay maju per posting, bukan detik kalender. Waktu publikasi ≠ waktu ditemukan. Posting tanpa tanggal hanya masuk “Semua waktu”. Grafik dibatasi maksimal 120 akun berdasarkan bukti hubungan; kartu menampilkan semua bukti akun yang lolos filter. Posisi tetap dan warna menunjukkan platform, bukan lokasi atau afiliasi. Mention bukan bukti repost; kemiripan bukan sebab-akibat. Top viral dan sinyal otomatisasi adalah penilaian sampel, bukan identitas bot terverifikasi.</p></details>
    </div>
    <div className="nx-workspace"><div className="nx-visual" data-empty={!nodes.length&&['2d','3d'].includes(mode)}>
      {mode==='chronology'?<ChronologyCards rows={chronology} page={page} onPageChange={setPage} selected={active?.id} onSelect={id=>{setSelected(id);document.getElementById(arrow+'-inspector')?.focus()}} firstTime={events[0]?.time}/>:mode==='timeline'?<div className="nx-event-list"><h3>Urutan publikasi · bukan rantai repost</h3><p>Waktu menaik. Filter hubungan tidak membatasi daftar publikasi.</p><Sources rows={visibleEvents.slice(safePage*20,safePage*20+20)}/>{!visibleEvents.length&&<p>Belum ada posting bertanggal.</p>}<div className="nx-pagination"><button disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Sebelumnya</button><span>{safePage+1} / {pages}</span><button disabled={safePage>=pages-1} onClick={()=>setPage(safePage+1)}>Berikutnya</button></div></div>:<>
        <svg viewBox="0 0 700 500" className="nx-graph" role="group" aria-label={mode==='3d'?'Grafik perspektif 3D akun':'Grafik Network 2D akun'}><defs><marker id={arrow} viewBox="0 0 10 10" refX="17" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="var(--nx-muted)"/></marker></defs>
          {edges.map((e,i)=><line key={i} x1={projected[e.source].x} y1={projected[e.source].y} x2={projected[e.target].x} y2={projected[e.target].y} stroke="var(--nx-muted)" strokeWidth={e.source===active?.id||e.target===active?.id?2:1} opacity={e.source===active?.id||e.target===active?.id ? .85 : .25} strokeDasharray={e.kind==='similarity'?'5 5':undefined} markerEnd={e.kind==='mention'?`url(#${arrow})`:undefined}/>) }
          {nodes.map(n=><NetworkAccountNode key={n.id} node={n} position={projected[n.id]} photo={accountPhoto(n,frame.accounts.find(a=>a.id===n.id),posts)} selected={n.id===active?.id} color={color(n.platform)} onPreview={()=>setHovered(n.id)} onLeave={()=>setHovered('')} onSelect={()=>{setSelected(n.id);setHovered('');document.getElementById(arrow+'-inspector')?.scrollTo({top:0})}}/>)}
        </svg>{!nodes.length&&<div className="nx-empty"><p>Belum ada hubungan akun untuk filter dan waktu ini. Ini bukan berarti tidak ada posting.</p><button onClick={()=>setIncludeIsolated(true)}>Tampilkan akun tanpa hubungan</button></div>}
        {mode==='3d'&&<div className="nx-rotation"><label>Putar ruang <input type="range" min="-180" max="180" value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label><label>Kemiringan <input type="range" min="-60" max="60" value={tilt} onChange={e=>setTilt(Number(e.target.value))}/></label></div>}
        <div className="nx-legend">{[...new Set(nodes.map(n=>n.platform).filter(Boolean))].map(platform=><span key={platform}><span style={{color:color(platform)}} aria-hidden="true">● </span><PlatformLabel platform={platform} /></span>)}<span>○ Hanya disebut</span><span>→ Menyebut akun · ┄ Konten serupa</span></div>
      </>}
    </div><aside className="nx-inspector" id={arrow+'-inspector'} tabIndex={-1} aria-label="Bukti akun terpilih"><h3>Bukti akun terpilih</h3><label>Akun dalam tampilan<select aria-label="Akun explorer" value={active?.id||''} onChange={e=>setSelected(e.target.value)}>{!nodes.length&&<option value="">Belum tersedia</option>}{nodes.map(n=><option value={n.id} key={n.id}>{n.label}</option>)}</select></label><h4>{active?.label||'Pilih akun'}</h4>
      <section className="nx-post-preview" aria-label="Preview posting akun">
        <h3>{hovered?'Preview saat diarahkan':'Posting akun terpilih'}</h3>
        <p>{hovered?'Klik lingkaran untuk mengunci akun dan membuka tautan.':'Posting yang teramati dalam sampel, bukan bukti bahwa semuanya diteruskan akun lain.'}</p>
        {account?.evidence?.length ? <><Sources rows={account.evidence.slice(0,3)}/><small>Menampilkan {Math.min(3,account.evidence.length)} dari {account.evidence.length} posting. Daftar lengkap di bawah.</small></> : <p>Posting akun ini belum tersedia. Akun mungkin hanya disebut oleh sumber lain.</p>}
      </section>
      <details><summary>Profil & atribut sumber</summary><ChronologyProfile node={active} account={account}/></details>
      {full&&top.has(active?.id)&&<AccountSignal kind="viral"/>}{full&&account?.signals?.length>0&&<AccountSignal kind="automation"/>}
      <p>{active?(active.observed?`${account?.evidence.length||0} posting dalam rentang ini`:'Hanya disebut; posting dan profil belum dikumpulkan.'):'Belum ada akun dalam sampel.'}</p>
      {full&&top.has(active?.id)&&<p>Top 3 interaksi dalam sampel, termasuk seri. Metrik snapshot terakhir, bukan engagement saat publikasi.</p>}
      {full&&account?.signals?.map(s=><p key={s.kind}>{s.detail}</p>)}
      {!full&&<p>Badge snapshot dan indikasi otomatisasi disembunyikan selama replay historis.</p>}
      {account?.evidence.length>0&&<details open><summary>Posting akun</summary><Sources rows={account.evidence}/></details>}
      {connections.map((e,i)=><details key={e.source+e.target+e.kind} open={i===0&&!account}><summary>{data.nodes.find(n=>n.id===e.source)?.label} {e.kind==='mention'?'→':'↔'} {data.nodes.find(n=>n.id===e.target)?.label} · {e.count} bukti</summary><Sources rows={e.evidence}/></details>)}
    </aside></div>

  </section>;
}
import { PlatformLabel } from './PlatformIcon';
