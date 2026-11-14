import { createElement } from 'react';
import { PulseLike, PulseComment, PulseShare, PulseView } from './PulseMetricIcons';
import { formatCount } from '../../lib/pulseData';
import { postInteractions } from '../../lib/pulseEngagement';

const parts = [['likes', 'Suka', PulseLike], ['comments', 'Komentar', PulseComment], ['shares', 'Bagikan', PulseShare], ['views', 'Tayangan', PulseView]];
const platformNames = { x: { comments: 'Balasan', shares: 'Repost' }, threads: { comments: 'Balasan', shares: 'Repost' } };

/** The compact metric line of a post card: total interactions, then likes, comments, shares, views.
 * Unknown values show "—". With `hideEmpty`, a source that carries no metrics at all (news) renders
 * nothing instead of a row of dashes. */
export function PulseMetricRow({ metrics, platform, hideEmpty = false, label = 'Interaksi' }) {
  const names = platformNames[platform] || {}, total = postInteractions(metrics);
  if (hideEmpty && total == null && !parts.some(([key]) => Number.isFinite(metrics?.[key]))) return null;
  return <dl className="pu-metric-row" aria-label={label}>
    <div className="pu-metric-total"><dt>Interaksi</dt><dd>{total == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(total)}</dd></div>
    {parts.map(([key, name, icon]) => <div key={key}><dt>{createElement(icon, { size: 15 })}<span className="pu-sr">{names[key] || name}</span></dt><dd title={names[key] || name}>{Number.isFinite(metrics?.[key]) ? formatCount(metrics[key]) : <span aria-label="Tidak tersedia">—</span>}</dd></div>)}
  </dl>;
}
