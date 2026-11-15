import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/shadcn/button';
import { PulseSkeleton } from '../components/ui/PulsePatterns';
import { PulseTag } from '../components/ui/PulseTag';
import { formatCount } from '../lib/pulseData';
import { projectHref, updatedText } from '../lib/pulseRadar';

/** The last 24 hours against the 24 before, in words. Rising volume is neither good nor bad, so no colour. */
function dayText(row) {
  const last = row.posts_24h || 0, before = row.posts_prev_24h || 0;
  if (!last) return 'Tidak ada posting dalam 24 jam' + (before ? `; ${formatCount(before)} pada 24 jam sebelumnya` : '');
  const head = `${formatCount(last)} posting dalam 24 jam`;
  if (!before) return head + ', belum ada pada 24 jam sebelumnya';
  if (last === before) return head + ', sama dengan 24 jam sebelumnya';
  return `${head}, ${last > before ? 'naik' : 'turun'} ${formatCount(Math.max(1, Math.round(Math.abs(last - before) / before * 100)))}%`;
}

function Row({ row, now }) {
  const collected = updatedText({ updated_at: row.last_collected_at }, now);
  return <li className="hmp-row">
    <div className="hmp-name"><Link to={projectHref(row)}>{row.label}</Link><p>{formatCount(row.posts_total || 0)} posting, {collected ? `terakhir terkumpul ${collected}` : 'belum pernah terkumpul'}</p></div>
    <p className="hmp-day">{dayText(row)}</p>
    <p className="hmp-alerts">{row.alerts_unread ? <PulseTag size="sm" tone="warning">{`${formatCount(row.alerts_unread)} alert baru`}</PulseTag> : 'Tidak ada alert baru'}</p>
  </li>;
}

/**
 * The projects of this installation, on Beranda. `rows` is the answer of GET /home/projects (null while it loads).
 * A project is active while at least one of its collection schedules is on; the others sit under "Dijeda".
 */
export default function HomeProjects({ rows, canCreate = false, now = new Date() }) {
  const head = <header className="hmp-head"><h2>Project aktif</h2>
    {canCreate && rows?.length > 0 && <Button asChild variant="outline" data-size="sm" className="pu-button pu-button-secondary"><Link to="/pulse/search"><Plus size={15} aria-hidden="true" />Project baru</Link></Button>}</header>;
  if (!rows) return <section className="hmp" aria-busy="true">{head}<PulseSkeleton label="Memuat project…" stats={0} panels={0} rows={3} /></section>;
  if (!rows.length) return <section className="hmp">{head}<div className="hmp-none">
    <p>Belum ada project. {canCreate ? 'Mulai dari satu isu di atas, atau dari Pencarian cepat.' : 'Minta administrator membuat project pertama.'}</p>
    {canCreate && <Button asChild variant="default" data-size="sm" className="pu-button pu-button-primary"><Link to="/pulse/search">Buat project</Link></Button>}
  </div></section>;
  const active = rows.filter(row => row.collecting), paused = rows.filter(row => !row.collecting);
  return <section className="hmp">{head}
    {active.length ? <ol className="hmp-list">{active.map(row => <Row key={row.id} row={row} now={now} />)}</ol> : <p className="hmp-quiet">Tidak ada project yang sedang mengumpulkan.</p>}
    {paused.length > 0 && <details className="hmp-paused"><summary>Dijeda ({paused.length})</summary><ol className="hmp-list">{paused.map(row => <Row key={row.id} row={row} now={now} />)}</ol></details>}
  </section>;
}
