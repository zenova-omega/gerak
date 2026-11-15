import { bubbleRadius, shadeStep } from '../lib/pulseRegionMap';
import { formatCount } from '../lib/pulseData';
import outline from './indonesia-provinces.json';
import './ds/region-map.css';

/**
 * The spread map as a picture, for a summary card and a report page: every province shaded by its count (darker with
 * more) and a bubble on each one that has any. Nothing to press and no timeline: the full map lives on Jaringan
 * (RegionSpreadMap.jsx). The numbers must also stand beside it as text; `label` says them to a screen reader.
 * @param {{rows: {code: string, name: string, count: number}[], label: string, bubbles?: boolean}} props rows from `spreadTotals`
 */
export default function RegionMiniMap({ rows = [], label, bubbles = true }) {
  const byCode = new Map(rows.map(row => [row.code, row])), most = Math.max(0, ...rows.map(row => row.count));
  // Largest first, so a small bubble is never hidden under a large neighbour.
  const marks = bubbles ? outline.provinces.map(province => ({ province, row: byCode.get(province.code) })).filter(mark => mark.row)
    .map(mark => ({ ...mark, radius: bubbleRadius(mark.row.count, most) })).sort((a, b) => b.row.count - a.row.count) : [];
  return <svg className="rm-svg rm-mini" viewBox={outline.viewBox.join(' ')} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
    <g>{outline.provinces.map(province => <path key={province.code} className="rm-province" data-shade={shadeStep(byCode.get(province.code)?.count, most)} d={province.d} />)}</g>
    <g>{marks.map(({ province, radius }) => <circle key={province.code} className="rm-bubble" cx={province.x} cy={province.y} r={radius} />)}</g>
    <g aria-hidden="true">{marks.filter(mark => mark.radius >= 9).map(({ province, row }) => <text key={province.code} className="rm-count" x={province.x} y={province.y} fontSize="9" dy="3.2">{formatCount(row.count)}</text>)}</g>
  </svg>;
}
