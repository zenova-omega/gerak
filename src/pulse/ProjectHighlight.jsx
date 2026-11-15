import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import { SentimentTag } from '../components/ui/PulseTag';
import { formatCount, pulseDate } from '../lib/pulseData';
import { postMeasures, reported } from '../lib/pulseMeasures';
import { sourceText } from '../lib/pulseOverview';
import { compactCount, highlightWindow, projectHighlight } from '../lib/pulseHighlight';
import { wibDay } from './projectPeriodPresets';
import usePreviousPosts from './usePreviousPosts';
import './ds/project-highlight.css';

// Written the way the Penyebutan tile writes its change: Indonesian grouping, at most one decimal ("+34.279%").
const percentChange = value => `${value > 0 ? '+' : ''}${(value * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

/** One mention at a time, with the account, its followers when known, the tone, the text and a link to the source. */
function Mentions({ items }) {
  const [index, setIndex] = useState(0);
  if (!items.length) return null;
  const at = Math.min(index, items.length - 1), item = items[at];
  const followers = reported(item.metrics?.author_followers);
  const said = sourceText(item.platform === 'news' && item.title ? { text: item.title } : item) || 'Teks belum tersedia';
  const step = by => setIndex((at + by + items.length) % items.length);
  return <div className="phl-mentions" role="group" aria-roledescription="carousel" aria-label="Mention yang patut dilihat">
    <div className="phl-mentions-head">
      <h3>Mention yang patut dilihat</h3>
      <SentimentTag value={postMeasures(item).tone} />
      <div className="phl-nav">
        <button type="button" aria-label="Mention sebelumnya" disabled={items.length < 2} onClick={() => step(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <span aria-live="polite">{at + 1}/{items.length}</span>
        <button type="button" aria-label="Mention berikutnya" disabled={items.length < 2} onClick={() => step(1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </div>
    <div className="phl-mention">
      <AccountAvatar author={item.author} platform={item.platform} size="md" />
      <div>
        <strong>{item.author || 'Akun tanpa nama'}</strong>
        <small>{platformLabel(item.platform)}{followers !== null ? ` · ${compactCount(followers)} pengikut` : ''} · {pulseDate(item.published_at)}</small>
        <p>{said}</p>
      </div>
    </div>
    {item.url && <a className="phl-mention-link" href={item.url} target="_blank" rel="noopener noreferrer">Lihat posting <ArrowRight size={14} aria-hidden="true" /><span className="pu-sr"> (buka di tab baru)</span></a>}
  </div>;
}

/**
 * The highlight at the top of Ikhtisar, its own section (the owner, 16 Nov 2026: "highlight card ... di taro di paling
 * atas"): how many interactions the sources reported in the last seven days, or in the period chosen in the project
 * bar, against the period before; the mentions worth a look; and the accounts that posted most. PULSE holds no reach
 * figure, so it is never estimated here. Counted by `projectHighlight` (pulseHighlight.js).
 * @param {{posts: object[], topic: {id?: string, label?: string}, period: {from?: string, to?: string}}} props
 */
export default function ProjectHighlight({ posts = [], topic = {}, period = {} }) {
  const window = highlightWindow(period, wibDay());
  // Without a chosen period the page holds every post, so the seven days before are already there; with one, they are
  // loaded the way a page loads a period.
  const earlier = usePreviousPosts(topic.id || '', window.before?.from || '', window.before?.to || '', window.chosen);
  const previous = window.chosen ? (earlier.status === 'ready' ? earlier.posts : null) : posts;
  const reading = projectHighlight(posts, previous, window);
  const name = topic.label || 'Project ini';
  if (reading.empty) return <section className="phl" data-empty="" aria-labelledby="phl-title">
    <h2 id="phl-title" className="phl-title">{name}</h2>
    <p className="phl-facts">Belum ada posting pada {window.label}. Ubah periode di bilah project untuk melihat yang lebih lama.</p>
  </section>;
  const value = reading.interactions.value;
  return <section className="phl" aria-labelledby="phl-title">
    <div className="phl-main">
      <div className="phl-story">
        {reading.lead.length > 0 && <p className="phl-lead">{reading.lead.join(' ')}</p>}
        <h2 id="phl-title" className="phl-title">{name} mencatat</h2>
        <p className="phl-figure">
          <strong title={value === null ? 'Interaksi belum tercatat' : `${formatCount(value)} interaksi`}>{compactCount(value)}</strong>
          <span>interaksi {window.label}.</span>
        </p>
        {reading.interactionChange !== null && <p className="phl-change">{percentChange(reading.interactionChange)} dibandingkan {window.compare}</p>}
        <p className="phl-facts">{formatCount(reading.posts)} posting · {formatCount(reading.platforms)} platform{reading.measured !== null ? ` · interaksi diketahui pada ${Math.floor(reading.measured * 100)}% posting` : ''}</p>
      </div>
      <Mentions key={window.from + window.to} items={reading.mentions} />
    </div>
    <footer className="phl-foot">
      <Link className="phl-cta" to={'/pulse/accounts?' + new URLSearchParams({ topic: topic.id || '' })}>Lihat penggerak interaksi <ArrowRight size={16} aria-hidden="true" /></Link>
      {reading.sources.length > 0 && <div className="phl-sources">
        <span>Paling banyak menyebut</span>
        {reading.sources.map(source => <span key={source.key} className="phl-source"><AccountAvatar author={source.name} platform={source.platform} size="sm" /><b>{source.name || 'Akun tanpa nama'}</b><small>{formatCount(source.posts)} posting</small></span>)}
      </div>}
    </footer>
  </section>;
}
