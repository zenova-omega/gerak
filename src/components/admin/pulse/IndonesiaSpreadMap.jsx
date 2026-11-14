import { PulseArrow } from '../../ui/PulseArrow';
import { useState } from 'react';
import boundary from '../../../pulse/indonesia-boundary.json';
import { indonesiaPaths,indonesiaPoints,projectIndonesia } from '../../../lib/pulseMap';
import { safeSourceUrl,formatCount } from '../../../lib/pulseData';
import './indonesia-spread.css';

const paths=indonesiaPaths(boundary);
export default function IndonesiaSpreadMap({locations=[],unknownCount=0,total=0}) {
  const [selected,setSelected]=useState(0);
  const [region,setRegion]=useState('all');
  const points=indonesiaPoints(locations);
  const active=points[selected]||points[0];
  return <section className="pi-indonesia" aria-label="Peta penyebaran Indonesia">
    <header><h3>Peta Indonesia</h3><p>Koordinat posting yang disertai asal data. Bukan lokasi penonton, identitas atau domisili akun.</p></header>
    <div className="pi-map-controls"><label>Tampilan peta<select value={region} onChange={e=>setRegion(e.target.value)}><option value="all">Indonesia</option><option value="java">Perbesar Jawa & Bali</option></select></label><span>{points.length} titik berkoordinat dalam area peta · {formatCount(total)} posting dalam periode</span></div>
    <svg viewBox={region==='java'?'165 190 220 110':'0 0 760 330'} role="group" aria-label="Peta referensi Indonesia dengan titik sumber jika tersedia">
      <rect x="0" y="0" width="760" height="330" fill="var(--ps-bg)"/>
      {paths.map((d,i)=><path key={i} d={d} fill="var(--ps-lavender)" stroke="var(--ps-muted)" strokeWidth=".65" fillRule="evenodd"/>)}
      {points.map((p,i)=>{const [x,y]=projectIndonesia(p.lon,p.lat);return <g key={i} role="button" tabIndex={0} aria-label={`Lokasi ${p.lat}, ${p.lon}: ${p.count} posting`} aria-pressed={active===p} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i);}}}><circle cx={x} cy={y} r={active===p?7:5} fill="var(--ps-accent)" stroke="var(--ps-ink)" strokeWidth="1.2"/><title>{p.provenance}</title></g>})}
    </svg>
    {!points.length&&<div className="pi-geo-status" role="status"><strong>Belum ada koordinat sumber yang dapat diplot</strong><p>Peta ini adalah referensi geografis, bukan heatmap aktivitas. {formatCount(unknownCount)} posting tidak memiliki lokasi yang diketahui. Ini tidak berarti tidak ada percakapan di Indonesia.</p></div>}
    {!!points.length&&<><label>Pilih titik sumber<select value={Math.min(selected,points.length-1)} onChange={e=>setSelected(Number(e.target.value))}>{points.map((p,i)=><option key={i} value={i}>{p.lat}, {p.lon} · {p.count} posting</option>)}</select></label><div className="pi-geo-status"><strong>{active.lat}, {active.lon} · {formatCount(active.count)} posting</strong><p>Asal data: {safeSourceUrl(active.provenance)?<a href={safeSourceUrl(active.provenance)} target="_blank" rel="noopener noreferrer">Buka bukti lokasi <PulseArrow/></a>:active.provenance}</p><p>{formatCount(unknownCount)} posting lainnya tidak diketahui lokasinya.</p></div></>}
    <details><summary>Apa yang bisa disimpulkan dari peta?</summary><ul><li>Geotag posting: hanya ditampilkan jika ada koordinat dan provenance dari sumber.</li><li>Lokasi profil: pernyataan pemilik profil, bukan posisi saat memposting. Belum menjadi layer peta ini.</li><li>Nama tempat dalam teks: lokasi yang dibahas, bukan lokasi penyebar. Tidak otomatis diplot.</li></ul><p>Titik di luar area 94–142° BT, 12° LS–7° LU tidak diplot. Area ini bukan pemeriksaan batas administratif. Tidak ada perkiraan lokasi dari bahasa, IP atau identitas akun.</p></details>
    <small>Peta referensi: <a href="https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson" target="_blank" rel="noopener noreferrer">Natural Earth, 1:110 juta</a>. Disimpan lokal; pulau kecil tidak seluruhnya tergambar. Bukan batas administratif terkini.</small>
  </section>;
}
