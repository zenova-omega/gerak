import { createElement } from 'react';
import { formatCount } from '../../lib/pulseData';
import { engagementSummary, percentLabel } from '../../lib/pulseEngagement';
import { shares } from '../../lib/pulseVoice';
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
  const shown = parts.filter(([key]) => s.totals[key] > 0);
  const pct = shares(Object.fromEntries(shown.map(([key]) => [key, s.totals[key]])), shown.map(([key]) => key));
  return <section className="pu-eng" data-compact={compact ? '' : undefined} aria-label={label}>
    <div className="pu-eng-head">
      <span className="pu-eng-total"><PulseBeat size={18} /><strong>{s.interactions == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(s.interactions)}</strong> interaksi{many && s.interactions != null && <small> dari {formatCount(s.interactionPosts)} posting</small>}</span>
      {s.interactions > 0 && <div className="pu-eng-split">
        <span className="pu-eng-bar" role="img" aria-label={'Pembagian interaksi: ' + shown.map(([key, name]) => `${name} ${pct[key]}%`).join(', ')}>{shown.map(([key]) => <i key={key} data-part={key} style={{ flexGrow: s.totals[key] }} />)}</span>
        {/* The bar alone is three unnamed colours: each segment is named here with its share of all interactions. */}
        <ul className="pu-eng-legend" aria-hidden="true">{shown.map(([key, name]) => <li key={key} data-part={key}><i />{name} <b>{pct[key]}%</b></li>)}</ul>
      </div>}
    </div>
    <dl className="pu-eng-metrics">
      {parts.map(([key, name, icon]) => <div key={key} className="pu-eng-metric" data-part={key}><dt>{createElement(icon, { size: 16 })}{name}</dt><dd>{s.totals[key] == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(s.totals[key])}</dd>{!compact && <small>{s.totals[key] == null ? 'Tidak tersedia dari sumber' : s.interactions > 0 ? `${pct[key] ?? 0}% dari interaksi` : 'Belum ada interaksi'}{many && s.totals[key] != null ? ` · ${formatCount(s.coverage[key])} posting` : ''}</small>}</div>)}
      <div className="pu-eng-metric" data-part="views"><dt><PulseView size={16} />Tayangan</dt><dd>{s.totals.views == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(s.totals.views)}</dd>{!compact && <small>{s.totals.views == null ? 'Tidak tersedia dari sumber' : 'Paparan, tidak masuk total interaksi'}{many && s.totals.views != null ? ` · ${formatCount(s.coverage.views)} posting` : ''}</small>}</div>
    </dl>
    <dl className="pu-eng-kpis">
      <div><dt>Kualitas interaksi <InfoTip label="Cara menghitung kualitas interaksi">{qualityNote}</InfoTip></dt><dd>{quality || <span className="pu-eng-na">Belum dapat dihitung</span>}</dd>{!compact && <small>{quality ? 'Porsi komentar dan bagikan' : 'Perlu suka dan komentar atau bagikan'}</small>}</div>
      <div><dt>Rasio interaksi <InfoTip label="Cara menghitung rasio interaksi">{rateNote}</InfoTip></dt><dd>{rate || <span className="pu-eng-na">Belum dapat dihitung</span>}</dd>{!compact && <small>{rate ? (many ? `Interaksi per tayangan · ${formatCount(s.ratePosts)} posting` : 'Interaksi per tayangan') : 'Perlu data tayangan'}</small>}</div>
    </dl>
  </section>;
}
export default PulseEngagement;
