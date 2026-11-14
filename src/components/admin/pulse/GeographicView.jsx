import React from 'react';
import { MapPin } from 'lucide-react';
import { formatCount, safeSourceUrl, validLocations } from '../../../lib/pulseData';

export default function GeographicView({ locations, unknownCount }) {
  const points = validLocations(locations);
  return <>
    {points.length ? <>
      <svg className="pulse-coordinate-map" viewBox="0 0 400 210" role="img" aria-label="Lokasi sumber pada grid koordinat dunia equirectangular. Detail dan provenance pada daftar di bawah.">
        <rect x="20" y="15" width="360" height="180" fill="#f3f7f5" stroke="#c4d6cc" />
        {[-60, -30, 0, 30, 60].map(lat => <line key={lat} x1="20" x2="380" y1={105 - lat} y2={105 - lat} stroke="#d6e2db" strokeDasharray="3 3" />)}
        {[-120, -60, 0, 60, 120].map(lon => <line key={lon} y1="15" y2="195" x1={200 + lon} x2={200 + lon} stroke="#d6e2db" strokeDasharray="3 3" />)}
        <text x="22" y="11" fontSize="8" fill="#587064">90°N</text><text x="22" y="207" fontSize="8" fill="#587064">180°W</text><text x="350" y="207" fontSize="8" fill="#587064">180°E</text>
        {points.map((point, index) => <g key={index}><circle cx={200 + point.lon} cy={105 - point.lat} r="4" fill="#19735a" stroke="white" strokeWidth="1.5"><title>{`${point.lat}, ${point.lon} · ${formatCount(point.count)} mention · ${point.provenance}`}</title></circle></g>)}
      </svg>
      <p className="pulse-footnote">Grid koordinat dunia, bukan heatmap. Ukuran titik seragam; jumlah dan asal data di bawah.</p>
      <ul className="pulse-location-list">{points.map((point, index) => <li key={index}><strong>{point.lat}, {point.lon}</strong> · {formatCount(point.count)} mention<br />{safeSourceUrl(point.provenance) ? <a href={safeSourceUrl(point.provenance)} target="_blank" rel="noopener noreferrer">Provenance: {point.provenance}</a> : <span>Provenance: {point.provenance}</span>}</li>)}</ul>
    </> : <div className="pulse-map"><img src="/images/pres-indonesia-map-clean.png" alt="" /><div className="pulse-map-caption"><MapPin size={20} /><strong>Belum ada lokasi terverifikasi</strong><span>Peta referensi Indonesia · bukan sebaran mention</span></div></div>}
    {locations.length > points.length && <p className="pulse-footnote">{locations.length - points.length} lokasi tidak diplot karena koordinat valid atau provenance tidak tersedia.</p>}
    <div className="pulse-location-note"><span>Lokasi tidak diketahui</span><strong>{formatCount(unknownCount)} mention</strong></div>
    <p className="pulse-footnote">Tidak menyimpulkan lokasi dari bahasa, nama akun, atau topik. Tidak ada marker maupun heatmap sintetis.</p>
  </>;
}
