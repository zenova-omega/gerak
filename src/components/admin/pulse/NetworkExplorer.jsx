import React, { useEffect, useId, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { networkPositions, replayEvents, replayFrame, topViralAccounts } from '../../../lib/pulseReplay';
import { formatCount, pulseDate, safeSourceUrl } from '../../../lib/pulseData';
import AccountSignal, { PatternTag } from './AccountSignal';
import ChronologyCards from './ChronologyCards';
import ChronologyProfile from './ChronologyProfile';
import NetworkAccountNode from './NetworkAccountNode';
import { accountPhoto } from '../../../lib/pulseAccountPhoto.js';
import { chronologyRows } from '../../../lib/pulseChronology.js';
import InfoTip from '../../../pulse/InfoTip';
import PostAvatar from './PostAvatar';
import AccountAvatar from './AccountAvatar';
import { PulseMetricRow } from '../../ui/PulseMetricRow';
import { SentimentTag } from '../../ui/PulseTag';
import { PulseArrow } from '../../ui/PulseArrow';
import './network-explorer.css';
import './mention-timeline.css';
import './network-layout.css';

const color = platform => ({ x: 'var(--nx-lavender)', youtube: 'var(--nx-peach)', news: 'var(--nx-mint)' }[platform] || 'var(--nx-blue)');
function Sources({ rows }) {
  return <ul className="nx-sources">{rows.map((p,i)=><li key={p.id+':'+i}><small>{p.author} · {pulseDate(p.published_at)}</small>{safeSourceUrl(p.url)?<a href={safeSourceUrl(p.url)} target="_blank" rel="noopener noreferrer">{p.title || 'Buka postingan asli'}</a>:<span>{p.title || 'Tautan tidak tersedia'}</span>}</li>)}</ul>;
}
/** A publisher's name repeated at the end of its own headline ("… - CNN Indonesia") is noise on a card that already names the account. */
function headline(row, full) {
  const text = (row.title || full?.title || full?.text || '').trim(), author = (row.author || '').trim();
  return author && text.endsWith(' - ' + author) ? text.slice(0, -author.length - 3) : text;
}
/** One post, one card: when and where, what it says, then the numbers it carries. */
function PostCard({ row, full, showAuthor = false }) {
  const href = safeSourceUrl(row.url), text = headline(row, full), sentiment = full?.metrics?.sentiment?.label;
  const measured = ['likes', 'comments', 'shares', 'views', 'engagement'].some(key => Number.isFinite(full?.metrics?.[key]));
  return <li className="nxi-card">
    <div className="nxi-card-meta">{showAuthor && row.author ? <><AccountAvatar size="xs" author={row.author} platform={row.platform || full?.platform} photo={full ? accountPhoto(full) : undefined} /><strong>{row.author}</strong></> : <PlatformIcon platform={row.platform || full?.platform} size={14}/>}<time>{row.published_at ? pulseDate(row.published_at) : 'Tanggal tidak tersedia'}</time>{sentiment && <SentimentTag size="sm" value={sentiment} />}</div>
    {href ? <a className="nxi-card-text" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Buka posting asli: ${text || 'tanpa judul'}`}><span>{text || 'Buka postingan asli'}</span><PulseArrow decorative /></a> : <p className="nxi-card-text"><span>{text || 'Tautan tidak tersedia'}</span></p>}
    {measured && <PulseMetricRow metrics={full.metrics} platform={full.platform} />}
  </li>;
}
export default function NetworkExplorer({ data, posts = [], initialMode = '2d' }) {
  const events = useMemo(()=>replayEvents(data),[data]);
  const [mode,setMode]=useState(initialMode);
  const [kind,setKind]=useState('all');
  const [includeIsolated,setIncludeIsolated]=useState(true);
  const [step,setStep]=useState(null);   // open on the whole period; the scrubber replays it on request
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1);
  const [selected,setSelected]=useState('');
  const [hovered,setHovered]=useState('');
  const [expanded,setExpanded]=useState('');   // account whose full post list is open
  const byId=useMemo(()=>new Map(posts.map(post=>[String(post.id),post])),[posts]);

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
  const busiest=Math.max(1,...nodes.map(n=>n.connections||0));
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
  const activePhoto=active?accountPhoto(active,account,posts):null;
  const evidence=account?.evidence||[];
  const open=expanded===active?.id;
  const signals=full?(account?.signals||[]):[];
  const followers=evidence.map(row=>byId.get(String(row.id))?.metrics?.author_followers).find(Number.isFinite);
  return <section className="nx" aria-label="Viral Replay data nyata">
    <header className="nxe-head">
      <div className="nxe-title"><h2>Jelajahi penyebaran</h2><InfoTip label="Cara membaca peta dan batas analisis"><p>Klik akun untuk melihat postingnya. Garis berarti menyebut akun atau memakai konten serupa, bukan bukti siapa menyalin siapa.</p><p>Pemutaran maju per posting, bukan per detik. Waktu publikasi bukan waktu ditemukan. Posting tanpa tanggal hanya masuk “Semua waktu”.</p><p>Peta memuat paling banyak 120 akun dengan hubungan terbanyak. Posisi tetap dan warna menunjukkan platform, bukan lokasi atau afiliasi. Tanda akun adalah penilaian atas sampel, bukan identitas yang terverifikasi.</p></InfoTip></div>
      <div className="nxe-modes" role="group" aria-label="Mode explorer">{[['2d','Peta 2D'],['chronology','Jejak Penyebaran'],['timeline','Urutan waktu'],['3d','Perspektif 3D']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setPage(0)}}>{label}</button>)}</div>
    </header>
    <div className="nx-replay">
      <button className="nxe-play" disabled={!events.length} onClick={()=>{if(playing){setPlaying(false)}else{if(full||atEnd)setStep(0);setPlaying(true)}}}>{playing?<Pause size={16}/>:<Play size={16}/>}{playing?'Jeda':'Putar ulang'}</button>
      <span className="nxe-time">{pulseDate(events[0]?.published_at)}</span>
      <div className="nxe-track"><svg viewBox="0 0 960 65" preserveAspectRatio="none" className="nxe-histogram" role="img" aria-label="Distribusi publikasi dalam 48 interval sama panjang">{bins.map((v,i)=><rect key={i} x={i*20} y={60-v/Math.max(1,...bins)*55} width="12" height={v/Math.max(1,...bins)*55} rx="2" fill="var(--nx-lavender)" opacity={i*20<=cursor*9.6?.8:.3}/>)}</svg>
        <input aria-label="Posisi replay" type="range" min="0" max={Math.max(0,events.length-1)} value={Math.min(index,Math.max(0,events.length-1))} disabled={!events.length} onChange={e=>{setPlaying(false);setStep(Number(e.target.value));setPage(0)}}/></div>
      <span className="nxe-time">{pulseDate(events.at(-1)?.published_at)}</span>
      <select className="nxe-speed" aria-label="Kecepatan replay" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="3">3×</option><option value="10">10×</option></select>
      {!full&&<button className="nxe-all" onClick={()=>{setPlaying(false);setStep(null);setAngle(15);setTilt(15)}}><RotateCcw size={15}/>Semua waktu</button>}
    </div>
    <div className="nx-workspace" data-mode={['2d','3d'].includes(mode)?'map':'list'}><div className="nx-visual" data-empty={!nodes.length&&['2d','3d'].includes(mode)}>
      <div className="nxe-counts">
        <p><span><b>{formatCount(nodes.length)}</b> dari {formatCount(frame.nodes.length)} akun<span aria-hidden="true"> · </span><b>{formatCount(edges.length)}</b> hubungan<span aria-hidden="true"> · </span><b>{formatCount(visibleEvents.length)}</b> posting</span>{!full&&<em>sampai {pulseDate(events[index]?.published_at)}</em>}</p>
        <label className="nxe-kind">Hubungan <select value={kind} onChange={e=>{setKind(e.target.value);setPage(0)}} aria-label="Jenis hubungan explorer"><option value="all">Semua</option><option value="mention">Menyebut akun</option><option value="similarity">Kemiripan</option></select></label>
        <label className="nxe-switch"><input type="checkbox" role="switch" className="pu-switch-input" checked={includeIsolated} onChange={e=>setIncludeIsolated(e.target.checked)}/>Akun tanpa hubungan</label>
      </div>
      {mode==='chronology'?<ChronologyCards rows={chronology} page={page} onPageChange={setPage} selected={active?.id} onSelect={id=>{setSelected(id);document.getElementById(arrow+'-inspector')?.focus()}} firstTime={events[0]?.time}/>:mode==='timeline'?<div className="nx-event-list"><div className="nx-chronology-head"><h3>Urutan publikasi</h3><InfoTip label="Cara membaca urutan publikasi"><p>Posting diurutkan dari waktu terbit paling awal. Ini urutan waktu, bukan rantai repost.</p><p>Filter hubungan tidak membatasi daftar ini.</p></InfoTip></div><Sources rows={visibleEvents.slice(safePage*20,safePage*20+20)}/>{!visibleEvents.length&&<p>Belum ada posting bertanggal.</p>}<div className="nx-pagination"><button disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Sebelumnya</button><span>{safePage+1} / {pages}</span><button disabled={safePage>=pages-1} onClick={()=>setPage(safePage+1)}>Berikutnya</button></div></div>:<>
        <svg viewBox="0 0 700 500" className="nx-graph" role="group" aria-label={mode==='3d'?'Grafik perspektif 3D akun':'Grafik Network 2D akun'}><defs><marker id={arrow} viewBox="0 0 10 10" refX="17" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="var(--nx-muted)"/></marker></defs>
          {edges.map((e,i)=><line key={i} x1={projected[e.source].x} y1={projected[e.source].y} x2={projected[e.target].x} y2={projected[e.target].y} stroke="var(--nx-muted)" strokeWidth={e.source===active?.id||e.target===active?.id?2:1} opacity={e.source===active?.id||e.target===active?.id ? .85 : .25} strokeDasharray={e.kind==='similarity'?'5 5':undefined} markerEnd={e.kind==='mention'?`url(#${arrow})`:undefined}/>) }
          {[...nodes].sort((a,b)=>(a.connections||0)-(b.connections||0)).map(n=><NetworkAccountNode key={n.id} node={n} weight={(n.connections||0)/busiest} position={projected[n.id]} photo={accountPhoto(n,frame.accounts.find(a=>a.id===n.id),posts)} selected={n.id===active?.id} color={color(n.platform)} onPreview={()=>setHovered(n.id)} onLeave={()=>setHovered('')} onSelect={()=>{setSelected(n.id);setHovered('');document.getElementById(arrow+'-scroll')?.scrollTo({top:0})}}/>)}
        </svg>{!nodes.length&&<div className="nx-empty"><p>Belum ada hubungan akun untuk filter dan waktu ini. Ini bukan berarti tidak ada posting.</p><button onClick={()=>setIncludeIsolated(true)}>Tampilkan akun tanpa hubungan</button></div>}
        {mode==='3d'&&<div className="nx-rotation"><label>Putar ruang <input type="range" min="-180" max="180" value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label><label>Kemiringan <input type="range" min="-60" max="60" value={tilt} onChange={e=>setTilt(Number(e.target.value))}/></label></div>}
        <div className="nx-legend">{[...new Set(nodes.map(n=>n.platform).filter(Boolean))].map(platform=><span key={platform}><span style={{color:color(platform)}} aria-hidden="true">● </span><PlatformLabel platform={platform} /></span>)}<span>○ Hanya disebut</span><span>→ Menyebut akun</span><span>┄ Konten serupa</span><span>Lingkaran lebih besar = lebih banyak hubungan</span></div>
      </>}
    </div><aside className="nxi" id={arrow+'-inspector'} tabIndex={-1} aria-label="Bukti akun terpilih"><div className="nxi-scroll" id={arrow+'-scroll'}>
      <header className="nxi-head">
        <PostAvatar post={{author:active?.label||'',platform:active?.platform,profile_image_url:activePhoto}}/>
        <div className="nxi-who">
          <select aria-label="Akun explorer" value={active?.id||''} onChange={e=>setSelected(e.target.value)}>{!nodes.length&&<option value="">Belum ada akun</option>}{nodes.map(n=><option value={n.id} key={n.id}>{n.label}</option>)}</select>
          <p>{!active?'Belum ada akun dalam sampel':hovered&&hovered!==selected?'Pratinjau · klik lingkaran untuk mengunci':active.observed?`${formatCount(evidence.length)} posting · ${formatCount(connections.length)} hubungan${followers!=null?` · ${formatCount(followers)} pengikut`:''}`:'Hanya disebut akun lain'}</p>
        </div>
        {(signals.length>0||(full&&top.has(active?.id))||!full)&&<div className="nxi-tags">
          {full&&top.has(active?.id)&&<AccountSignal kind="viral" compact/>}
          {account?.pattern&&full?<PatternTag signals={signals}/>:signals.length>0&&<AccountSignal kind="automation" compact/>}
          {signals.length>0&&<InfoTip label="Rincian tanda akun">{signals.map(s=><p key={s.kind}>{s.detail}</p>)}<p>Pola perilaku pada data terkumpul, bukan bukti identitas, bayaran, atau otomatisasi.</p></InfoTip>}
          {!full&&<><span className="nxi-muted-tag">Tanda akun disembunyikan</span><InfoTip label="Mengapa tanda disembunyikan">Tanda akun dihitung dari seluruh periode, jadi disembunyikan selama pemutaran ulang. Pilih “Semua waktu” untuk menampilkannya.</InfoTip></>}
        </div>}
      </header>
      <section className="nxi-section" aria-label="Preview posting akun">
        <h3>Posting<span className="nxi-count">{formatCount(evidence.length)}</span><InfoTip label="Tentang daftar posting">Posting akun ini yang teramati dalam sampel, bukan bukti bahwa semuanya diteruskan akun lain.</InfoTip></h3>
        {evidence.length?<><ul className="nxi-cards">{(open?evidence:evidence.slice(0,5)).map((row,i)=><PostCard key={row.id+':'+i} row={row} full={byId.get(String(row.id))}/>)}</ul>
          {evidence.length>5&&<button className="nxi-more" aria-expanded={open} onClick={()=>setExpanded(open?'':active.id)}>{open?'Tampilkan lebih sedikit':`Tampilkan semua ${formatCount(evidence.length)} posting`}</button>}</>
          :<p className="nxi-empty">{active?'Belum ada posting terkumpul dari akun ini.':'Pilih akun pada peta.'}</p>}
      </section>
      {connections.length>0&&<section className="nxi-section" aria-label="Hubungan akun">
        <h3>Hubungan<span className="nxi-count">{formatCount(connections.length)}</span><InfoTip label="Tentang hubungan">Menyebut akun bukan bukti repost; kemiripan konten bukan bukti sebab-akibat.</InfoTip></h3>
        {connections.map((e,i)=>{const other=data.nodes.find(n=>n.id===(e.source===active?.id?e.target:e.source));return <details className="nxi-link" key={e.source+e.target+e.kind} open={i===0&&!evidence.length}><summary><span className="nxi-link-kind" aria-hidden="true">{e.kind==='mention'?(e.source===active?.id?'→':'←'):'↔'}</span><span className="pu-sr">{e.kind==='mention'?(e.source===active?.id?'Menyebut':'Disebut oleh'):'Konten serupa dengan'} </span><strong>{other?.label}</strong><span className="nxi-count">{formatCount(e.count)} bukti</span></summary><ul className="nxi-cards">{e.evidence.map((row,k)=><PostCard key={row.id+':'+k} row={row} full={byId.get(String(row.id))} showAuthor/>)}</ul></details>})}
      </section>}
      <details className="nxi-profile"><summary>Profil & atribut sumber</summary><ChronologyProfile node={active} account={account}/></details>
    </div></aside></div>
  </section>;
}
import { PlatformIcon, PlatformLabel } from './PlatformIcon';
