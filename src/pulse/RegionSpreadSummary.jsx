import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned } from 'lucide-react';
import AnalyticsPanel from './AnalyticsPanel';
import RegionMiniMap from './RegionMiniMap';
import { PulseArrow } from '../components/ui/PulseArrow';
import { accountSpread, spreadByDay, spreadTotals } from '../lib/pulsePlaces';
import { formatCount } from '../lib/pulseData';
import outline from './indonesia-provinces.json';
import './ds/trend-chart.css';   // the shared empty-state line
import './ds/region-map.css';

const SHOWN = 5;

/**
 * The spread of a conversation over the provinces, in one card for Ikhtisar: the provinces its posts name most, as a
 * small map and a ranked list, one sentence on the X accounts' profile locations, and a link to the full map on
 * Jaringan. It counts the whole chosen period; the day-by-day view is on the map itself.
 * @param {{posts: object[], to: string}} props `posts` already scoped to the period and platforms; `to` opens the full map
 */
export default function RegionSpreadSummary({ posts = [], to }) {
  const spread = useMemo(() => spreadByDay(posts), [posts]), people = useMemo(() => accountSpread(posts), [posts]);
  const rows = spreadTotals(spread), homes = spreadTotals(people), most = rows[0]?.count || 0;
  const open = <Link className="po-more rs-open" to={to}>Buka peta sebaran <PulseArrow /></Link>;
  const top = rows.slice(0, 3).map(row => `${row.name} ${formatCount(row.count)}`).join(', ');
  return <AnalyticsPanel className="rs-panel" icon={MapPinned} title="Sebaran tempat" actions={open}
    description="Provinsi yang paling sering disebut dalam judul dan teks posting pada periode ini. Ini tempat yang dibicarakan, bukan lokasi penulis.">
    {!rows.length ? <p className="tc-empty">Belum ada posting yang menyebut provinsi, kota atau kabupaten pada periode ini.</p> : <div className="rs">
      <RegionMiniMap rows={rows} label={`Peta Indonesia: ${rows.length} dari ${outline.provinces.length} provinsi disebut. Terbanyak: ${top}.`} />
      <ol className="rs-top" aria-label="Provinsi yang paling sering disebut">{rows.slice(0, SHOWN).map(row => <li key={row.code}>
        <span className="rs-name">{row.name}</span><span className="rs-count">{formatCount(row.count)} posting</span>
        <span className="rs-names">{row.places.slice(0, 2).map(([name, count]) => `${name} ${formatCount(count)}`).join(', ')}</span>
        <i className="rs-bar" style={{ width: Math.max(2, row.count / most * 100) + '%' }} aria-hidden="true" />
      </li>)}</ol>
    </div>}
    {rows.length > 0 && <p className="rs-line">{formatCount(spread.named)} dari {formatCount(spread.total)} posting menyebut tempat, di {formatCount(rows.length)} provinsi.</p>}
    {homes.length > 0 && <p className="rs-line">Lokasi profil akun X: {homes.slice(0, 3).map(row => `${row.name} ${formatCount(row.count)} akun`).join(', ')}.{people.unasked > 0 && ` ${formatCount(people.unasked)} akun belum diperiksa.`}</p>}
  </AnalyticsPanel>;
}
