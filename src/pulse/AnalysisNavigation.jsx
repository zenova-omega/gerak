import { PulseArrow } from '../components/ui/PulseArrow';
import { Link, useLocation } from 'react-router-dom';
import { createElement } from 'react';
import { Network, Users, Newspaper } from 'lucide-react';

const destinations = [
  ['network', Network, 'Telusuri penyebaran', 'Lihat hubungan akun dan urutan publikasi.'],
  ['accounts', Users, 'Kenali akun penyebar', 'Bandingkan posting dan interaksi teramati.'],
  ['posts', Newspaper, 'Periksa posting sumber', 'Baca konten, media, dan snapshot metrik.'],
];
export default function AnalysisNavigation() {
  const { search } = useLocation();
  return <nav className="ps-analysis-nav" aria-label="Lanjutkan analisis project">
    <h2>Lanjutkan analisis</h2>
    {destinations.map(([route, icon, title, note]) => <Link key={route} to={`/pulse/${route}${search}`}>{createElement(icon, { size: 20, 'aria-hidden': true })}<span><strong>{title}</strong><small>{note}</small></span><PulseArrow decorative size={18}/></Link>)}
  </nav>;
}
