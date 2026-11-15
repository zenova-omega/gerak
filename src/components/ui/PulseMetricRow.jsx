import { createElement } from 'react';
import { PulseLike, PulseComment, PulseShare, PulseView } from './PulseMetricIcons';
import { formatCount } from '../../lib/pulseData';
import { postInteractions } from '../../lib/pulseEngagement';

const parts = [['likes', 'Suka', PulseLike], ['comments', 'Komentar', PulseComment], ['shares', 'Bagikan', PulseShare], ['views', 'Tayangan', PulseView]];
const platformNames = { x: { comments: 'Balasan', shares: 'Repost' }, threads: { comments: 'Balasan', shares: 'Repost' } };

/** The last group of a post's metric `dl` when the post is a repost: it has no interactions of its own, so the row
 * names the original post's share count, which is never added to the reposter's total. Renders nothing otherwise. */
export function PulseRepostNote({ metrics }) {
  if (!metrics?.repost || !Number.isFinite(metrics.original_shares)) return null;
  return <div className="pu-metric-repost"><dt>Repost</dt><dd>posting asli dibagikan {formatCount(metrics.original_shares)}×</dd></div>;
}

/** The compact metric line of a post card: total interactions, then likes, comments, shares, views.
 * Unknown values show "—". With `hideEmpty`, a source that carries no metrics at all (news) renders
 * nothing instead of a row of dashes. A repost has no interactions of its own; the row says so and
 * names the original post's share count, which is never added to the reposter's total. */
export function PulseMetricRow({ metrics, platform, hideEmpty = false, label = 'Interaksi' }) {
  const names = platformNames[platform] || {}, total = postInteractions(metrics);
  if (hideEmpty && total == null && !parts.some(([key]) => Number.isFinite(metrics?.[key]))) return null;
  return <dl className="pu-metric-row" aria-label={label}>
    <div className="pu-metric-total"><dt>Interaksi</dt><dd>{total == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(total)}</dd></div>
    {parts.map(([key, name, icon]) => <div key={key}><dt>{createElement(icon, { size: 15 })}<span className="pu-sr">{names[key] || name}</span></dt><dd title={names[key] || name}>{Number.isFinite(metrics?.[key]) ? formatCount(metrics[key]) : <span aria-label="Tidak tersedia">—</span>}</dd></div>)}
    <PulseRepostNote metrics={metrics} />
  </dl>;
}
