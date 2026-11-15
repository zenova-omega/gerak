import { PulseArrow } from '../../ui/PulseArrow';
import { useState } from 'react';
import boundary from '../../../pulse/indonesia-boundary.json';
import { indonesiaPaths,indonesiaPoints,projectIndonesia } from '../../../lib/pulseMap';
import { safeSourceUrl,formatCount } from '../../../lib/pulseData';
import InfoTip from '../../../pulse/InfoTip';
import './indonesia-spread.css';

const paths=indonesiaPaths(boundary);
export default function IndonesiaSpreadMap({locations=[],unknownCount=0,total=0}) {
  const [selected,setSelected]=useState(0);
  const [region,setRegion]=useState('all');
  const points=indonesiaPoints(locations);
  const active=points[selected]||points[0];
  return <section className="pi-indonesia" aria-label="Peta penyebaran Indonesia">
    <header><h3>Peta Indonesia<InfoTip label="Tentang peta ini">Hanya koordinat posting beserta asal datanya; bukan lokasi penonton atau domisili akun, dan bukan heatmap.</InfoTip></h3></header>
    <div className="pi-map-controls"><label>Tampilan peta<select value={region} onChange={e=>setRegion(e.target.value)}><option value="all">Indonesia</option><option value="java">Perbesar Jawa & Bali</option></select></label><span>{points.length} titik berkoordinat dalam area peta · {formatCount(total)} posting dalam periode</span></div>
    <svg viewBox={region==='java'?'165 190 220 110':'0 0 760 330'} role="group" aria-label="Peta referensi Indonesia dengan titik sumber jika tersedia">
      <rect x="0" y="0" width="760" height="330" fill="var(--ps-bg)"/>
      {paths.map((d,i)=><path key={i} d={d} fill="var(--ps-lavender)" stroke="var(--ps-muted)" strokeWidth=".65" fillRule="evenodd"/>)}
      {points.map((p,i)=>{const [x,y]=projectIndonesia(p.lon,p.lat);return <g key={i} role="button" tabIndex={0} aria-label={`Lokasi ${p.lat}, ${p.lon}: ${p.count} posting`} aria-pressed={active===p} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i);}}}><circle cx={x} cy={y} r={active===p?7:5} fill="var(--ps-accent)" stroke="var(--ps-ink)" strokeWidth="1.2"/><title>{p.provenance}</title></g>})}
    </svg>
    {!points.length&&<div className="pi-geo-status" role="status"><strong>Belum ada koordinat yang dapat diplot</strong><p>{formatCount(unknownCount)} posting tanpa lokasi diketahui.</p></div>}
    {!!points.length&&<><label>Pilih titik sumber<select value={Math.min(selected,points.length-1)} onChange={e=>setSelected(Number(e.target.value))}>{points.map((p,i)=><option key={i} value={i}>{p.lat}, {p.lon} · {p.count} posting</option>)}</select></label><div className="pi-geo-status"><strong>{active.lat}, {active.lon} · {formatCount(active.count)} posting</strong><p>Asal data: {safeSourceUrl(active.provenance)?<a href={safeSourceUrl(active.provenance)} target="_blank" rel="noopener noreferrer">Buka bukti lokasi <PulseArrow/></a>:active.provenance}</p><p>{formatCount(unknownCount)} posting lain tanpa lokasi.</p></div></>}
    <small>Peta referensi: <a href="https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson" target="_blank" rel="noopener noreferrer">Natural Earth, 1:110 juta</a></small>
  </section>;
}
