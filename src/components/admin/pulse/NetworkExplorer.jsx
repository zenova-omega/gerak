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
import { hasClock } from '../../../lib/pulseMeasures.js';
import { postSentiment } from '../../../lib/pulsePostFilters.js';
import InfoTip from '../../../pulse/InfoTip';
import PostAvatar from './PostAvatar';
import AccountAvatar from './AccountAvatar';
import { PulseMetricRow } from '../../ui/PulseMetricRow';
import { SentimentTag } from '../../ui/PulseTag';
import { PulseArrow } from '../../ui/PulseArrow';
import { platformColor } from '../../../lib/pulseChartTheme';
import { accountFollowers, edgeShape, edgeWidth, fitLabels, nodeRadius, spreadNodes } from '../../../lib/pulseNetworkLook.js';
import './network-explorer.css';
import './mention-timeline.css';
import './network-layout.css';
import '../../../pulse/ds/network-look.css';

/** The key under the map: what a ring colour, a circle size and a line shape mean. Samples are drawn with the
 * same strokes as the map, so the key cannot drift from it. */
function MapLegend({ platforms }) {
  return <div className="nx-legend nxl" role="group" aria-label="Keterangan peta">
    {platforms.length > 0 && <p className="nxl-row"><strong>Platform</strong><span className="nxl-items">{platforms.map(platform => <span className="nxl-item" key={platform}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ '--nx-node': platformColor(platform) }}><circle className="nxl-ring" cx="7" cy="7" r="5.5" /></svg><PlatformLabel platform={platform} /></span>)}</span></p>}
    <p className="nxl-row"><strong>Lingkaran</strong><span className="nxl-items">
      <span className="nxl-item"><svg width="46" height="22" viewBox="0 0 46 22" aria-hidden="true"><circle className="nxl-ring" cx="5" cy="17" r="4" /><circle className="nxl-ring" cx="18" cy="14.5" r="6.5" /><circle className="nxl-ring" cx="36" cy="11" r="10" /></svg>Makin besar, makin banyak pengikut</span>
      <span className="nxl-item"><svg width="8" height="22" viewBox="0 0 8 22" aria-hidden="true"><circle className="nxl-ring" cx="4" cy="11" r="3" /></svg>Paling kecil: pengikut tidak diketahui</span>
      <span className="nxl-item"><svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true"><circle className="nxl-ring" data-mentioned="" cx="7" cy="11" r="5.5" /></svg>Putus-putus: hanya disebut</span>
    </span></p>
    <p className="nxl-row"><strong>Garis</strong><span className="nxl-items">
      <span className="nxl-item"><svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true"><path className="nxl-line" d="M1 10Q13 2 22 6" strokeWidth="1.6" /><polygon className="nxl-head" points="29,8.6 21.4,9.5 23.6,3.4" /></svg>Panah: menyebut akun</span>
      <span className="nxl-item"><svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true"><path className="nxl-line" d="M1 7L29 7" strokeWidth="1.6" strokeDasharray="5 4" /></svg>Putus-putus: konten serupa</span>
      <span className="nxl-item"><svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true"><path className="nxl-line" d="M1 3.5L29 3.5" strokeWidth="1.2" /><path className="nxl-line" d="M1 10L29 10" strokeWidth="4.5" /></svg>Makin tebal, makin banyak posting penghubung</span>
    </span></p>
  </div>;
}
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
  // tone_share_v1: the post's tone in either stored form; a post not analysed yet carries no tag.
  const href = safeSourceUrl(row.url), text = headline(row, full), tone = postSentiment(full), sentiment = tone === 'unknown' ? null : tone;
  const measured = ['likes', 'comments', 'shares', 'views', 'engagement'].some(key => Number.isFinite(full?.metrics?.[key]));
  return <li className="nxi-card">
    <div className="nxi-card-meta">{showAuthor && row.author ? <><AccountAvatar size="xs" author={row.author} platform={row.platform || full?.platform} photo={full ? accountPhoto(full) : undefined} /><strong>{row.author}</strong></> : <PlatformIcon platform={row.platform || full?.platform} size={14}/>}<time>{row.published_at ? pulseDate(row.published_at) : 'Tanggal tidak tersedia'}</time>{sentiment && <SentimentTag size="sm" value={sentiment} />}</div>
    {href ? <a className="nxi-card-text" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Buka posting asli: ${text || 'tanpa judul'}`}><span>{text || 'Buka postingan asli'}</span><PulseArrow decorative /></a> : <p className="nxi-card-text"><span>{text || 'Tautan tidak tersedia'}</span></p>}
    {measured && <PulseMetricRow metrics={full.metrics} platform={full.platform} />}
  </li>;
}
export default function NetworkExplorer({ data, posts = [], initialMode = '2d' }) {
  // clock_v1: every dated post, timed ones first; the replay and its time labels run over the timed posts only.
  const dated = useMemo(()=>replayEvents(data),[data]);
  const events = useMemo(()=>dated.filter(event=>event.clock),[dated]);
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
  // Follower counts come from the whole period, so a circle keeps its size while the replay runs.
  const followersOf=useMemo(()=>{
    const accounts=new Map((data.accounts||[]).map(account=>[account.id,account]));
    return new Map((data.nodes||[]).map(node=>[node.id,accountFollowers(node,accounts.get(node.id),byId)]));
  },[data,byId]);
  const radiusOf=id=>nodeRadius(followersOf.get(id));

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
  if (mode === '2d') spreadNodes(nodes.map(n=>n.id),projected,radiusOf,{gap:12,floor:56});
  const busiest=Math.max(1,...nodes.map(n=>n.connections||0));
  // Names: the account in focus, then the largest circles and the busiest hubs, each only where it fits.
  // Small accounts stay unnamed to keep the map calm.
  const labels=fitLabels([active?.id,
    ...nodes.filter(n=>radiusOf(n.id)>=19).sort((a,b)=>radiusOf(b.id)-radiusOf(a.id)).slice(0,12).map(n=>n.id),
    ...nodes.filter(n=>(n.connections||0)/busiest>=.45).sort((a,b)=>b.connections-a.connections).slice(0,6).map(n=>n.id)].filter(Boolean),
    nodes.map(n=>n.id),projected,radiusOf,id=>nodes.find(n=>n.id===id)?.label,{reach:5});
  // While an account is pointed at or focused, accounts it has no line to step back.
  const pointed=hovered&&ids.has(hovered)?hovered:'';
  const near=new Set(connections.flatMap(e=>[e.source,e.target]));
  const reach=id=>radiusOf(id)+(id===active?.id?5:0);   // lines stop outside the selection ring
  const lines=edges.map(e=>{
    const width=edgeWidth(e.count),mention=e.kind==='mention';
    const shape=edgeShape(projected[e.source],projected[e.target],reach(e.source),reach(e.target),mention?{bend:.14,head:5+width*1.5}:{});
    return shape&&{key:e.source+'>'+e.target+'>'+e.kind,kind:e.kind,width,shape,active:e.source===active?.id||e.target===active?.id};
  }).filter(Boolean).sort((a,b)=>a.active-b.active);   // the lines of the account in focus are drawn last, on top
  const visibleEvents=dated.filter(e=>e.time<=cutoff),dateOnlyShown=visibleEvents.filter(e=>!e.clock).length;
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
  const followers=active?followersOf.get(active.id)??null:null;
  return <section className="nx" aria-label="Viral Replay data nyata">
    <header className="nxe-head">
      <div className="nxe-title"><h2>Jelajahi penyebaran</h2><InfoTip label="Cara membaca peta dan batas analisis"><p>Klik akun untuk melihat postingnya. Garis berarti menyebut akun atau memakai konten serupa, bukan bukti siapa menyalin siapa.</p><p>Pemutaran maju per posting, bukan per detik. Waktu publikasi bukan waktu ditemukan. Posting tanpa tanggal hanya masuk “Semua waktu”.</p><p>Peta memuat paling banyak 120 akun dengan hubungan terbanyak. Posisi tetap dan warna menunjukkan platform, bukan lokasi atau afiliasi. Tanda akun adalah penilaian atas sampel, bukan identitas yang terverifikasi.</p><p>Ukuran lingkaran mengikuti jumlah pengikut terbesar yang tercatat pada posting akun itu, bukan pengaruhnya. Akun tanpa angka pengikut digambar paling kecil. Garis makin tebal bila makin banyak posting yang menghubungkan dua akun.</p></InfoTip></div>
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
      {mode==='chronology'?<ChronologyCards rows={chronology} page={page} onPageChange={setPage} selected={active?.id} onSelect={id=>{setSelected(id);document.getElementById(arrow+'-inspector')?.focus()}} firstTime={events[0]?.time}/>:mode==='timeline'?<div className="nx-event-list"><div className="nx-chronology-head"><h3>Urutan publikasi</h3><InfoTip label="Cara membaca urutan publikasi"><p>Posting diurutkan dari waktu terbit paling awal. Ini urutan waktu, bukan rantai repost.</p><p>Filter hubungan tidak membatasi daftar ini.</p></InfoTip></div>{dateOnlyShown>0&&<p className="nx-chronology-note">{dateOnlyShown} posting hanya bertanggal tidak diurutkan menurut jam.</p>}<Sources rows={visibleEvents.slice(safePage*20,safePage*20+20)}/>{!visibleEvents.length&&<p>Belum ada posting bertanggal.</p>}<div className="nx-pagination"><button disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Sebelumnya</button><span>{safePage+1} / {pages}</span><button disabled={safePage>=pages-1} onClick={()=>setPage(safePage+1)}>Berikutnya</button></div></div>:<>
        <svg viewBox="0 0 700 500" className="nx-graph" role="group" aria-label={mode==='3d'?'Grafik perspektif 3D akun':'Grafik Network 2D akun'}>
          <g className="nx-edges" aria-hidden="true" data-pointed={pointed?'':undefined} style={{'--nx-rest':Math.max(.28,Math.min(.5,.56-lines.length/500)).toFixed(2)}}>{lines.map(line=><g key={line.key} className="nx-edge" data-kind={line.kind} data-active={line.active?'':undefined}>
            <path d={line.shape.d} strokeWidth={line.width} strokeDasharray={line.kind==='similarity'?`${3+line.width*1.2} ${2.5+line.width}`:undefined}/>
            {line.shape.head&&<polygon points={line.shape.head}/>}
          </g>)}</g>
          {/* Largest first, so a small account is never hidden under a large one. The order does not depend on what is
              selected: moving a focused circle in the document would drop keyboard focus. */}
          {[...nodes].sort((a,b)=>radiusOf(b.id)-radiusOf(a.id)||a.id.localeCompare(b.id)).map(n=><NetworkAccountNode key={n.id} node={n} radius={radiusOf(n.id)} followers={followersOf.get(n.id)??null} far={Boolean(pointed)&&n.id!==pointed&&!near.has(n.id)} position={projected[n.id]} photo={accountPhoto(n,frame.accounts.find(a=>a.id===n.id),posts)} selected={n.id===active?.id} color={platformColor(n.platform)} onPreview={()=>setHovered(n.id)} onLeave={()=>setHovered('')} onSelect={()=>{setSelected(n.id);setHovered('');document.getElementById(arrow+'-scroll')?.scrollTo({top:0})}}/>)}
          <g className="nx-names" aria-hidden="true">{nodes.filter(n=>labels.has(n.id)).map(n=>{
            const at=projected[n.id],r=radiusOf(n.id),picked=n.id===active?.id,name=n.label||'Nama tidak tersedia';
            return <text key={n.id} className="nx-node-name" data-picked={picked?'':undefined} data-far={pointed&&n.id!==pointed&&!near.has(n.id)?'':undefined} x={at.x} y={labels.get(n.id)==='above'?at.y-r-(picked?10:6):at.y+r+(picked?18:14)} textAnchor="middle">{name.length>20?name.slice(0,18)+'…':name}</text>;
          })}</g>
        </svg>{!nodes.length&&<div className="nx-empty"><p>Belum ada hubungan akun untuk filter dan waktu ini. Ini bukan berarti tidak ada posting.</p><button onClick={()=>setIncludeIsolated(true)}>Tampilkan akun tanpa hubungan</button></div>}
        {mode==='3d'&&<div className="nx-rotation"><label>Putar ruang <input type="range" min="-180" max="180" value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label><label>Kemiringan <input type="range" min="-60" max="60" value={tilt} onChange={e=>setTilt(Number(e.target.value))}/></label></div>}
        {nodes.length>0&&<MapLegend platforms={[...new Set(nodes.map(n=>n.platform).filter(Boolean))]}/>}
      </>}
    </div><aside className="nxi" id={arrow+'-inspector'} tabIndex={-1} aria-label="Bukti akun terpilih"><div className="nxi-scroll" id={arrow+'-scroll'}>
      <header className="nxi-head">
        <PostAvatar post={{author:active?.label||'',platform:active?.platform,profile_image_url:activePhoto}}/>
        <div className="nxi-who">
          <select aria-label="Akun explorer" value={active?.id||''} onChange={e=>setSelected(e.target.value)}>{!nodes.length&&<option value="">Belum ada akun</option>}{nodes.map(n=><option value={n.id} key={n.id}>{n.label||'Nama tidak tersedia'}</option>)}</select>
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
        {connections.map((e,i)=>{const other=data.nodes.find(n=>n.id===(e.source===active?.id?e.target:e.source));return <details className="nxi-link" key={e.source+e.target+e.kind} open={i===0&&!evidence.length}><summary><span className="nxi-link-kind" aria-hidden="true">{e.kind==='mention'?(e.source===active?.id?'→':'←'):'↔'}</span><span className="pu-sr">{e.kind==='mention'?(e.source===active?.id?'Menyebut':'Disebut oleh'):'Konten serupa dengan'} </span><strong>{other?.label||'Nama tidak tersedia'}</strong><span className="nxi-count">{formatCount(e.count)} bukti</span></summary><ul className="nxi-cards">{e.evidence.map((row,k)=><PostCard key={row.id+':'+k} row={row} full={byId.get(String(row.id))} showAuthor/>)}</ul></details>})}
      </section>}
      <details className="nxi-profile"><summary>Profil & atribut sumber</summary><ChronologyProfile node={active} account={account}/></details>
    </div></aside></div>
  </section>;
}
import { PlatformIcon, PlatformLabel } from './PlatformIcon';
