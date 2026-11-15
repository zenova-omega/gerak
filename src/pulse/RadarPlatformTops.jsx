import { Search } from 'lucide-react';
import { PlatformIcon } from '../components/admin/pulse/PlatformIcon';
import { platformTops } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';
import './ds/radar-issues.css';

const mark = platform => function Mark({ size }) { return <PlatformIcon platform={platform} size={size} />; };
const MARKS = { news: mark('news'), x: mark('x'), youtube: mark('youtube'), search: Search };

/**
 * Beranda's row of ranked lists: for each platform that has a figure to order by, its ten loudest issues, one card a
 * platform (three across; four once X is counted). A row is the position, the issue (it opens the same evidence as
 * the main list), the issue's figure on that platform, and a bar against the first row of the column.
 * TikTok and Instagram have no column: what is known there is a sample, and a sample has no order.
 * The row follows the page's category and province; the platform that orders the main list does not narrow it.
 */
export default function RadarPlatformTops({ issues, filters = {}, selectedKey = '', onSelect = () => {} }) {
  const tops = platformTops(issues, filters);
  if (!tops.length) return null;
  return <div className="rpt" data-columns={tops.length} role="group" aria-label="Isu teratas per platform">{tops.map(top =>
    <AnalyticsPanel key={top.id} title={`Teratas di ${top.label}`} description={top.basis} icon={MARKS[top.id]} className="rpt-card">
      <ol className="rpt-list" role="list" data-platform={top.id}>{top.rows.map((row, index) => <li key={row.key} data-selected={selectedKey === row.key ? '' : undefined}>
        <span className="rpt-rank" aria-hidden="true">{index + 1}</span>
        <div className="rpt-body">
          <button type="button" className="rpt-title" aria-pressed={selectedKey === row.key} onClick={() => onSelect(row.key)}>{row.title}</button>
          <p className="rpt-meter"><span className="rdi-track" aria-hidden="true"><i style={{ width: `${Math.max(2, Math.round(row.ratio * 1000) / 10)}%` }} /></span><span className="rpt-text" title={row.hint}>{row.text}</span></p>
        </div>
      </li>)}</ol>
    </AnalyticsPanel>)}</div>;
}
