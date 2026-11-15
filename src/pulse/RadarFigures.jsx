import { PulseStat, PulseStatGrid } from '../components/ui/PulseAnalytics';
import { formatCount } from '../lib/pulseData';
import { radarFigures } from '../lib/pulseRadar';

const names = { news: 'berita', search: 'pencarian', youtube: 'video', x: 'X' };

/** The figures strip under Beranda's first card: how big the refresh was, how much of the country it read, and how
 * much of the list a project already covers. A figure the refresh did not report shows as unavailable, never as zero. */
export default function RadarFigures({ payload }) {
  const { issues, signals, provinces, covered } = radarFigures(payload);
  return <PulseStatGrid label="Angka pembaruan ini">
    <PulseStat label="Isu tersusun" value={issues.total} note={`${formatCount(issues.national)} nasional, ${formatCount(issues.local)} lokal`} />
    <PulseStat label="Sinyal dibaca" value={signals ? signals.total : null}
      note={signals ? ['news', 'search', 'youtube', 'x'].filter(platform => signals[platform] != null).map(platform => `${names[platform]} ${formatCount(signals[platform])}`).join(', ') : 'Pembaruan ini tidak mencatat jumlahnya.'} />
    <PulseStat label="Daftar provinsi terbaca" value={provinces ? `${provinces.read} dari ${provinces.of}` : null} share={provinces ? provinces.share : null} shareLabel="terbaca" />
    <PulseStat label="Isu teratas dipantau" value={`${covered.count} dari ${covered.of}`} share={covered.share} shareLabel="dicakup project" />
  </PulseStatGrid>;
}
