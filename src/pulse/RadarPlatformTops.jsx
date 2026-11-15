import { useState } from 'react';
import { Search } from 'lucide-react';
import { PlatformIcon } from '../components/admin/pulse/PlatformIcon';
import { Button } from '../components/ui/shadcn/button';
import { platformTops } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import IssuePicture from './IssuePicture';
import './ds/radar-issues.css';

const mark = platform => function Mark({ size }) { return <PlatformIcon platform={platform} size={size} />; };
const MARKS = { news: mark('news'), x: mark('x'), youtube: mark('youtube'), search: Search };
const FIRST = 5;      // rows a column shows until someone asks for the whole ten

/**
 * Beranda's row of ranked lists: for each platform that has a figure to order by, its loudest issues, one card a
 * platform (three across; four once X is counted), the first five until the button below shows ten in every column.
 * A row is the position, the issue's small picture (wide in the video column), the issue (it opens the same evidence as
 * the main list), its figure on that platform, and a bar against the first row of the column. What a column counts is
 * behind its info button.
 * TikTok and Instagram have no column: what is known there is a sample, and a sample has no order.
 * The row follows the page's category and province; the platform that orders the main list does not narrow it.
 */
export default function RadarPlatformTops({ issues, filters = {}, selectedKey = '', onSelect = () => {} }) {
  const [all, setAll] = useState(false);
  const tops = platformTops(issues, filters);
  if (!tops.length) return null;
  const more = tops.some(top => top.rows.length > FIRST);
  return <>
    <h2 className="rpt-heading">Teratas per platform</h2>
    <div className="rpt" data-columns={tops.length} role="group" aria-label="Isu teratas per platform">{tops.map(top =>
      <AnalyticsPanel key={top.id} label={`Teratas di ${top.label}`} icon={MARKS[top.id]} className="rpt-card"
        title={<>Teratas di {top.label}<InfoTip label={`Tentang angka ${top.label}`}>{top.basis} Garis dibandingkan dengan isu pertama di kolom ini.</InfoTip></>}>
        <ol className="rpt-list" role="list" data-platform={top.id}>{(all ? top.rows : top.rows.slice(0, FIRST)).map((row, index) => <li key={row.key} data-selected={selectedKey === row.key ? '' : undefined}>
          <span className="rpt-rank" aria-hidden="true">{index + 1}</span>
          <IssuePicture issue={row} size={top.id === 'youtube' ? 'column-wide' : 'column'} onActivate={() => onSelect(row.key)} />
          <div className="rpt-body">
            <button type="button" className="rpt-title" aria-pressed={selectedKey === row.key} onClick={() => onSelect(row.key)}>{row.title}</button>
            <p className="rpt-meter"><span className="rdi-track" aria-hidden="true"><i style={{ width: `${Math.max(2, Math.round(row.ratio * 1000) / 10)}%` }} /></span><span className="rpt-text" title={row.hint}>{row.text}</span></p>
          </div>
        </li>)}</ol>
      </AnalyticsPanel>)}</div>
    {more && <div className="rpt-more"><Button type="button" variant="outline" data-size="sm" className="pu-button pu-button-secondary" aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? `Tampilkan ${FIRST} teratas` : 'Tampilkan 10 teratas'}</Button></div>}
  </>;
}
