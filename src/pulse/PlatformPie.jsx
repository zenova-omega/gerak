import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import { platformColor } from '../lib/pulseChartTheme';
import { formatCount } from '../lib/pulseData';
import './ds/platform-pie.css';

const shareText = share => share > 0 && share < 0.005 ? '<1%' : Math.round(share * 100) + '%';
const point = (turn, radius) => [50 + radius * Math.sin(turn * 2 * Math.PI), 50 - radius * Math.cos(turn * 2 * Math.PI)].map(value => value.toFixed(2)).join(' ');

/** Pie slices from the top, clockwise, largest first. A lone platform is the whole circle. */
export function pieSlices(rows = []) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  let turn = 0;
  return total ? rows.filter(row => row.count > 0).map(row => {
    const share = row.count / total, from = turn; turn += share;
    return { platform: row.platform, count: row.count, share, d: share >= 0.9999 ? null : `M50 50L${point(from, 48)}A48 48 0 ${share > 0.5 ? 1 : 0} 1 ${point(turn, 48)}Z` };
  }) : [];
}

/**
 * A small pie of where the posts are, for the summary. The pie gives the picture at a glance; the list beside it carries
 * the figures, because a platform with one per cent of the posts is a sliver no eye can read.
 * @param {{platforms: {platform: string, count: number}[], onOpen?: (platform: string) => void}} props
 */
export default function PlatformPie({ platforms = [], onOpen }) {
  const slices = pieSlices(platforms);
  if (!slices.length) return null;
  return <div className="ppie" role="group" aria-label="Porsi posting per platform">
    <svg className="ppie-chart" viewBox="0 0 100 100" aria-hidden="true">{slices.map(slice => slice.d
      ? <path key={slice.platform} d={slice.d} fill={platformColor(slice.platform)} />
      : <circle key={slice.platform} cx="50" cy="50" r="48" fill={platformColor(slice.platform)} />)}</svg>
    <div className="ppie-body">
      <p className="ppie-title">Porsi per platform</p>
      <ul className="ppie-keys">{slices.map(slice => {
        const body = <><i style={{ background: platformColor(slice.platform) }} aria-hidden="true" /><PlatformIcon platform={slice.platform} size={14} /><span>{platformLabel(slice.platform)}</span><b>{shareText(slice.share)}</b><small>{formatCount(slice.count)}<span className="pu-sr"> posting</span></small></>;
        return <li key={slice.platform}>{onOpen ? <button type="button" onClick={() => onOpen(slice.platform)} aria-label={`${platformLabel(slice.platform)}: ${shareText(slice.share)}, ${formatCount(slice.count)} posting. Lihat posting.`}>{body}</button> : <span>{body}</span>}</li>;
      })}</ul>
    </div>
  </div>;
}
