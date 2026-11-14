import { createElement } from 'react';
import { formatCount } from '../../lib/pulseData';
import { engagementSummary, percentLabel } from '../../lib/pulseEngagement';
import { PulseBeat, PulseComment, PulseLike, PulseShare, PulseView } from './PulseMetricIcons';
import InfoTip from '../../pulse/InfoTip';

const baseParts = [['likes', 'Suka', PulseLike], ['comments', 'Komentar', PulseComment], ['shares', 'Bagikan', PulseShare]];
/** Platforms name the same three actions differently; the label follows the source so an analyst reads its own vocabulary. */
const platformNames = { x: { comments: 'Balasan', shares: 'Repost' }, twitter: { comments: 'Balasan', shares: 'Repost' }, threads: { comments: 'Balasan', shares: 'Repost' } };
const partsFor = platform => baseParts.map(([key, name, icon]) => [key, platformNames[platform]?.[key] || name, icon]);
const qualityNote = 'Kualitas interaksi = (komentar + bagikan) ÷ (suka + komentar + bagikan). Komentar dan bagikan menuntut usaha lebih dari suka. Dihitung hanya bila suka dan salah satu dari komentar atau bagikan tersedia. Indikator sampel terkumpul, bukan skor pengaruh.';
const rateNote = 'Rasio interaksi = interaksi ÷ tayangan, hanya dari posting yang melaporkan keduanya. Tayangan bukan audiens unik.';

/** Interaction detail for one post (`metrics`) or a set (`posts`): what kind of interaction,
 * how it splits, and two derived indicators with their formula one tap away.
 * `compact` is the single-row form used inside evidence and post cards.
 * `platform` (single post only) switches to that platform's own terms, e.g. Repost and Balasan on X. */
export function PulseEngagement({ metrics, posts, platform, compact = false, label = 'Rincian interaksi' }) {
  const s = engagementSummary(posts ?? metrics);
  const parts = partsFor(posts ? null : platform);
  const many = Array.isArray(posts);
  const quality = percentLabel(s.activeShare), rate = percentLabel(s.rate, 2);
  return <section className="pu-eng" data-compact={compact ? '' : undefined} aria-label={label}>
    <div className="pu-eng-head">
      <span className="pu-eng-total"><PulseBeat size={18} /><strong>{s.interactions == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(s.interactions)}</strong> interaksi</span>
      {s.interactions > 0 && <span className="pu-eng-bar" role="img" aria-label={parts.filter(([key]) => s.totals[key] != null).map(([key, name]) => `${name} ${percentLabel(s.totals[key] / s.interactions)}`).join(', ')}>{parts.map(([key]) => s.totals[key] > 0 && <i key={key} data-part={key} style={{ flexGrow: s.totals[key] }} />)}</span>}
    </div>
    <dl className="pu-eng-metrics">
      {parts.map(([key, name, icon]) => <div key={key} className="pu-eng-metric" data-part={key}><dt>{createElement(icon, { size: 16 })}{name}</dt><dd>{s.totals[key] == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(s.totals[key])}</dd>{!compact && <small>{s.totals[key] == null ? 'Tidak tersedia dari sumber' : s.interactions > 0 ? `${percentLabel(s.totals[key] / s.interactions)} dari interaksi` : 'Belum ada interaksi'}{many && s.totals[key] != null ? ` · ${formatCount(s.coverage[key])} posting` : ''}</small>}</div>)}
      <div className="pu-eng-metric" data-part="views"><dt><PulseView size={16} />Tayangan</dt><dd>{s.totals.views == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(s.totals.views)}</dd>{!compact && <small>{s.totals.views == null ? 'Tidak tersedia dari sumber' : 'Paparan, tidak masuk total interaksi'}{many && s.totals.views != null ? ` · ${formatCount(s.coverage.views)} posting` : ''}</small>}</div>
    </dl>
    <dl className="pu-eng-kpis">
      <div><dt>Kualitas interaksi <InfoTip label="Cara menghitung kualitas interaksi">{qualityNote}</InfoTip></dt><dd>{quality || <span className="pu-eng-na">Belum dapat dihitung</span>}</dd>{!compact && <small>{quality ? 'Porsi komentar dan bagikan' : 'Perlu suka dan komentar atau bagikan'}</small>}</div>
      <div><dt>Rasio interaksi <InfoTip label="Cara menghitung rasio interaksi">{rateNote}</InfoTip></dt><dd>{rate || <span className="pu-eng-na">Belum dapat dihitung</span>}</dd>{!compact && <small>{rate ? (many ? `Interaksi per tayangan · ${formatCount(s.ratePosts)} posting` : 'Interaksi per tayangan') : 'Perlu data tayangan'}</small>}</div>
    </dl>
  </section>;
}
export default PulseEngagement;
