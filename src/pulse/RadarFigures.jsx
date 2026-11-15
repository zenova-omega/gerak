import { formatCount } from '../lib/pulseData';
import { radarFigures } from '../lib/pulseRadar';

const names = { news: 'berita', search: 'pencarian', youtube: 'video', x: 'X' };
/** A share as PulseStat prints it: a sliver is "<1%", never 0%. */
const percent = share => `${share > 0 && share < 1 ? '<1' : Math.round(Math.max(0, Math.min(100, share)))}%`;

/** The figures of the refresh, one line inside Beranda's first card: how big the refresh was, how much of the country it
 * read, and how much of the list a project already covers. A figure the refresh did not report shows as unavailable,
 * never as zero. */
export default function RadarFigures({ payload }) {
  const { issues, signals, provinces, covered } = radarFigures(payload);
  const figures = [
    ['Isu tersusun', formatCount(issues.total), `${formatCount(issues.national)} nasional, ${formatCount(issues.local)} lokal`],
    ['Sinyal dibaca', signals ? formatCount(signals.total) : null,
      signals ? ['news', 'search', 'youtube', 'x'].filter(platform => signals[platform] != null).map(platform => `${names[platform]} ${formatCount(signals[platform])}`).join(', ') : 'Tidak tercatat.'],
    ['Daftar provinsi terbaca', provinces ? `${provinces.read} dari ${provinces.of}` : null, provinces ? `${percent(provinces.share)} terbaca` : null],
    ['Isu teratas dipantau', `${covered.count} dari ${covered.of}`, Number.isFinite(covered.share) ? `${percent(covered.share)} dicakup project` : null],
  ];
  return <dl className="rdf" aria-label="Angka pembaruan ini">{figures.map(([label, value, note]) => <div key={label}>
    <dt>{label}</dt>
    <dd><strong>{value ?? <span aria-label="Tidak tersedia">—</span>}</strong>{note && <small>{note}</small>}</dd>
  </div>)}</dl>;
}
