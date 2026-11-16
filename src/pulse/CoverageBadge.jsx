import { Link } from 'react-router-dom';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import { PulseArrow } from '../components/ui/PulseArrow';
import { COVERAGE_SHARES } from '../lib/pulseReadings';
import { formatCount } from '../lib/pulseData';
import './ds/coverage-badge.css';

const LEVELS = { complete: ['Lengkap', 3], fair: ['Cukup', 2], limited: ['Terbatas', 1] };
// Each share: its column name, its short name, and the words that say what it is a share of.
const SHARES = {
  analysed: ['Sudah dianalisis', 'Dianalisis', 'sentimen sudah dianalisis pada'],
  measured: ['Interaksi diketahui', 'Interaksi', 'interaksi diketahui pada'],
  clocked: ['Jam terbit ada', 'Jam terbit', 'jam terbit ada pada'],
  dated: ['Bertanggal', 'Bertanggal', 'tanggal terbit ada pada'],
};
/** A whole percent as `coverage_v1` cuts it. A share that exists never prints as 0%. */
const percent = part => (part.count > 0 && part.percent === 0 ? '<1%' : `${part.percent}%`);
const platformName = platform => (platform === 'unknown' ? 'Lainnya' : platformLabel(platform));

/** One share as a bar with its percent in words beside it. */
function Share({ part }) {
  return <span className="pcv-share"><span className="pcv-bar" aria-hidden="true"><i style={{ width: `${part.share * 100}%` }} /></span><span>{percent(part)}</span></span>;
}

/**
 * `coverage_v1` in full: the sentence that names the level and the share that set it, then the shares as bars for
 * the whole selection and per platform. `compact` is the form inside the badge's card: short column names and no
 * dated share. The same component is the detail on Sumber & Cakupan, so the two can never disagree.
 * @param {{reading: ReturnType<typeof import('../lib/pulseReadings').coverage>, compact?: boolean}} props
 */
export function CoverageDetail({ reading, compact = false }) {
  if (!reading?.level) return null;
  const keys = compact ? COVERAGE_SHARES : [...COVERAGE_SHARES, 'dated'], [level] = LEVELS[reading.level];
  return <div className="pcv-detail" data-compact={compact ? '' : undefined}>
    <p className="pcv-says"><b>{level}</b>: {SHARES[reading.lowest][2]} {percent(reading[reading.lowest])} posting.</p>
    <div className="pcv-scroll"><table className="pcv-table">
      <caption className="pu-sr">Kelengkapan data untuk seluruh pilihan dan per platform</caption>
      <thead><tr><th scope="col">Platform</th><th scope="col">Posting</th>{keys.map(key => <th scope="col" key={key} data-lowest={key === reading.lowest ? '' : undefined}>{compact ? SHARES[key][1] : <><span className="pcv-long">{SHARES[key][0]}</span><span className="pcv-short">{SHARES[key][1]}</span></>}</th>)}</tr></thead>
      <tbody>
        <tr className="pcv-all"><th scope="row">Seluruh pilihan</th><td>{formatCount(reading.total)}</td>{keys.map(key => <td key={key}><Share part={reading[key]} /></td>)}</tr>
        {reading.platforms.map(row => <tr key={row.platform}><th scope="row"><span className="pcv-platform"><PlatformIcon platform={row.platform} size={14} />{platformName(row.platform)}</span></th>
          <td>{formatCount(row.total)}</td>{keys.map(key => <td key={key}><Share part={row[key]} /></td>)}</tr>)}
      </tbody>
    </table></div>
  </div>;
}

/**
 * The coverage of the project bar's selection as one badge: the level and the share that set it, for example
 * "Terbatas: jam terbit ada pada 41% posting". It is one line, a strip under the bar's controls. The badge is a link
 * to Sumber & Cakupan, where the detail lives; on hover or keyboard focus a small card shows the same detail.
 * Nothing is drawn while no post is known or the selection is empty.
 * @param {{reading: ReturnType<typeof import('../lib/pulseReadings').coverage> | null, to: string}} props
 */
export default function CoverageBadge({ reading, to }) {
  if (!reading?.level) return null;
  const [level, steps] = LEVELS[reading.level], sentence = SHARES[reading.lowest][2], share = percent(reading[reading.lowest]);
  return <span className="pcv">
    <Link className="pcv-badge" to={to} aria-label={`Kelengkapan data: ${level}, ${sentence} ${share} posting. Buka Sumber & Cakupan`}>
      <span className="pcv-mark" data-level={reading.level} aria-hidden="true">{[1, 2, 3].map(step => <i key={step} data-on={step <= steps ? '' : undefined} />)}</span>
      <span className="pcv-label">Kelengkapan data</span><span className="pcv-level"><b>{level}</b>: {sentence} {share} posting</span>
    </Link>
    <aside className="pcv-card" role="tooltip">
      <strong>Kelengkapan data pada pilihan ini</strong>
      <CoverageDetail reading={reading} compact />
      <Link to={to}>Rincian di Sumber &amp; Cakupan <PulseArrow /></Link>
    </aside>
  </span>;
}

// The report's data page states the same reading, so it names the level and writes a share the way the badge does.
export { LEVELS as coverageLevels, SHARES as coverageShares, percent as coveragePercent };
