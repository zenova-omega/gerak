import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/shadcn/button';
import { PulseSkeleton } from '../components/ui/PulsePatterns';
import { Sparkline } from '../components/ui/PulseAnalytics';
import { PulseDelta, PulseTag } from '../components/ui/PulseTag';
import { formatCount } from '../lib/pulseData';
import { projectChange, projectHref, projectTones, updatedText } from '../lib/pulseRadar';
import AnalyticsPanel from './AnalyticsPanel';

/** One active project: the last day against the day before, the week as a line, and how the week felt.
 * Rising volume is neither good nor bad, so the change carries no colour. */
function ProjectCard({ row, now }) {
  const change = projectChange(row), tones = projectTones(row), series = Array.isArray(row.series_7d) ? row.series_7d : [];
  const collected = updatedText({ updated_at: row.last_collected_at }, now);
  return <AnalyticsPanel className="hmp-card" label={row.label} title={<Link to={projectHref(row)}>{row.label}</Link>}
    actions={row.alerts_unread > 0 && <PulseTag size="sm" tone="warning">{`${formatCount(row.alerts_unread)} alert baru`}</PulseTag>}
    footer={`${formatCount(row.posts_total || 0)} posting, ${collected ? `terakhir terkumpul ${collected}` : 'belum pernah terkumpul'}`}>
    <div className="hmp-figure">
      <p><span className="hmp-label">Posting 24 jam</span><strong className="hmp-value">{formatCount(row.posts_24h || 0)}</strong><PulseDelta value={change.percent} />{change.note && <small>{change.note}</small>}</p>
      {series.length > 1 && <span className="hmp-spark"><Sparkline values={series} width={132} height={44} /><span className="pu-sr">Posting per 24 jam, tujuh hari terakhir: {series.map(formatCount).join(', ')}</span></span>}
    </div>
    <div className="hmp-tone">
      <span className="hmp-label">Sentimen 7 hari</span>
      {tones.length ? <>
        <div className="pu-distribution-bar" role="img" aria-label={`Sentimen 7 hari: ${tones.map(tone => `${tone.label} ${tone.shareText}`).join(', ')}`}>
          {tones.map(tone => <span key={tone.key} data-hatch={tone.hatch ? '' : undefined} style={{ flexGrow: tone.value, flexBasis: 0, '--swatch': tone.color }} />)}
        </div>
        <ul className="hmp-tones">{tones.map(tone => <li key={tone.key}><span className="pu-swatch" data-hatch={tone.hatch ? '' : undefined} style={{ '--swatch': tone.color }} aria-hidden="true" />{tone.label} <b>{tone.shareText}</b></li>)}</ul>
      </> : <p className="hmp-quiet">Belum ada posting dalam 7 hari.</p>}
    </div>
  </AnalyticsPanel>;
}

/**
 * The projects of this installation, on Beranda: a card per active project, three to a row. `rows` is the answer of
 * GET /home/projects (null while it loads). A project is active while at least one of its collection schedules is on;
 * the others sit under "Dijeda".
 */
export default function HomeProjects({ rows, canCreate = false, now = new Date() }) {
  const head = <header className="hmp-head"><h2>Project aktif</h2>
    {canCreate && rows?.length > 0 && <Button asChild variant="outline" data-size="sm" className="pu-button pu-button-secondary"><Link to="/pulse/search"><Plus size={15} aria-hidden="true" />Project baru</Link></Button>}</header>;
  if (!rows) return <section className="hmp" id="hm-projects" aria-busy="true">{head}<PulseSkeleton label="Memuat project…" stats={0} panels={0} rows={3} /></section>;
  if (!rows.length) return <section className="hmp" id="hm-projects">{head}<div className="hmp-none">
    <p>Belum ada project. {canCreate ? 'Mulai dari satu isu di atas, atau dari Pencarian cepat.' : 'Minta administrator membuat project pertama.'}</p>
    {canCreate && <Button asChild variant="default" data-size="sm" className="pu-button pu-button-primary"><Link to="/pulse/search">Buat project</Link></Button>}
  </div></section>;
  const active = rows.filter(row => row.collecting), paused = rows.filter(row => !row.collecting);
  return <section className="hmp" id="hm-projects">{head}
    {active.length ? <div className="lay-grid hmp-grid">{active.map(row => <div className="lay-4" key={row.id}><ProjectCard row={row} now={now} /></div>)}</div>
      : <p className="hmp-quiet">Tidak ada project yang sedang mengumpulkan.</p>}
    {paused.length > 0 && <details className="hmp-paused"><summary>Dijeda ({paused.length})</summary>
      <ul>{paused.map(row => <li key={row.id}><Link to={projectHref(row)}>{row.label}</Link><span>{formatCount(row.posts_total || 0)} posting tersimpan</span></li>)}</ul>
    </details>}
  </section>;
}
