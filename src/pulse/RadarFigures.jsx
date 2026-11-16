import { formatCount } from '../lib/pulseData';
import { radarFigures } from '../lib/pulseRadar';
import { PulseStat, PulseStatGrid } from '../components/ui/PulseAnalytics';

const names = { news: 'berita', search: 'pencarian', youtube: 'video', x: 'X' };

/** The figures of the refresh inside Beranda's first card, drawn as the product's KPI tiles at their compact step
 * (PulseStatGrid compact / PulseStat), one quiet line so the page stays short:
 * how big the refresh was, how much of the country it read, and how much of the list a project already covers. A figure
 * the refresh did not report shows as unavailable, never as zero; a share is drawn as the tile's meter, where a sliver
 * reads "<1%". */
export default function RadarFigures({ payload }) {
  const { issues, signals, provinces, covered } = radarFigures(payload);
  const read = signals ? ['news', 'search', 'youtube', 'x'].filter(platform => signals[platform] != null).map(platform => `${names[platform]} ${formatCount(signals[platform])}`).join(', ') : 'Tidak tercatat.';
  return <PulseStatGrid compact label="Angka pembaruan ini" className="rdf">
    <PulseStat label="Isu tersusun" value={issues.total} note={`${formatCount(issues.national)} nasional, ${formatCount(issues.local)} lokal`} />
    <PulseStat label="Sinyal dibaca" value={signals ? signals.total : null} note={read} />
    <PulseStat label="Daftar provinsi terbaca" value={provinces ? provinces.read : null} share={provinces ? provinces.share : null} shareLabel="terbaca" note={provinces ? `dari ${formatCount(provinces.of)} provinsi` : null} />
    <PulseStat label="Isu teratas dipantau" value={covered.count} share={Number.isFinite(covered.share) ? covered.share : null} shareLabel="dicakup project" note={`dari ${formatCount(covered.of)} isu teratas`} />
  </PulseStatGrid>;
}
