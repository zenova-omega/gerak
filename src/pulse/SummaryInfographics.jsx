import { Sparkline } from '../components/ui/PulseAnalytics';
import { PulseBeat, PulseLike } from '../components/ui/PulseMetricIcons';
import { formatCount } from '../lib/pulseData';
import { sentimentColor } from '../lib/pulseChartTheme';
import { sentimentLabels } from '../lib/pulsePostFilters';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';

// One small graphic per kind of summary section. Every figure comes from `facts`, which the server
// counts from stored posts; none is read out of the model's sentences.
const day = value => { const date = new Date(/T/.test(value) ? value : value + 'T00:00:00Z'); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: /T/.test(value) ? 'Asia/Jakarta' : 'UTC' }); };
const pct = (value, whole) => whole ? Math.round(value / whole * 100) : 0;

function Figure({ value, label }) { return <div className="sig-figure"><strong>{value}</strong><span>{label}</span></div>; }

function Start({ facts }) {
  const first = facts.first;
  if (!first) return null;
  return <div className="sig sig-start"><span className="sig-date">{day(first.published_at)}</span><div className="pu-account-line"><AccountAvatar size="sm" author={first.author} platform={first.platform} /><strong>{first.author || 'Nama tidak tersedia'}</strong></div></div>;
}

function Viral({ facts }) {
  const { surge, peak_day: peak, days } = facts;
  if (surge) return <div className="sig sig-viral"><PulseBeat size={18} /><Figure value={'+' + formatCount(surge.added)} label="interaksi di antara dua pengamatan" /><Figure value={formatCount(Math.round(surge.rate_per_hour)) + '/jam'} label={surge.author || 'posting'} /></div>;
  if (!peak) return null;
  return <div className="sig sig-viral"><span className="sig-spark"><Sparkline values={days.map(row => row.posts)} width={120} height={40} /></span><Figure value={formatCount(peak.posts)} label={`posting pada ${day(peak.date)}, hari teramai`} /></div>;
}

function Figures({ facts }) {
  const t = facts.totals;
  return <div className="sig sig-figures"><Figure value={formatCount(t.posts)} label="posting" /><Figure value={formatCount(t.accounts)} label="akun" /><Figure value={formatCount(t.interactions)} label="interaksi" /><Figure value={formatCount(t.days)} label="hari" />{facts.days.length > 1 && <span className="sig-spark" title="Posting per hari"><Sparkline values={facts.days.map(row => row.posts)} width={140} height={40} /></span>}</div>;
}

function Talk({ facts }) {
  const groups = facts.groups || [];
  if (!groups.length) return null;
  const max = Math.max(...groups.map(group => group.posts), 1);
  return <ol className="sig sig-talk">{groups.slice(0, 3).map(group => <li key={group.code}><span>{group.title}</span><b>{formatCount(group.posts)}</b><i style={{ width: `${group.posts / max * 100}%` }} /></li>)}</ol>;
}

function Sentiment({ facts }) {
  const s = facts.sentiment;
  if (!s.analysed) return <p className="sig sig-note">Belum ada posting yang dianalisis sentimennya.</p>;
  const keys = ['negative', 'neutral', 'positive'];
  return <div className="sig sig-sentiment">
    <div className="sig-bar" role="img" aria-label={keys.map(key => `${sentimentLabels[key]} ${pct(s[key], s.analysed)}%`).join(', ')}>{keys.filter(key => s[key] > 0).map(key => <span key={key} style={{ flexGrow: s[key], background: sentimentColor[key] }} />)}</div>
    <ul>{keys.map(key => <li key={key}><i style={{ background: sentimentColor[key] }} /><strong>{pct(s[key], s.analysed)}%</strong><span>{sentimentLabels[key].toLowerCase()}</span></li>)}</ul>
    <small>dari {formatCount(s.analysed)} posting yang sudah dianalisis{s.unknown > 0 ? `; ${formatCount(s.unknown)} belum` : ''}</small>
  </div>;
}

function Anger({ facts }) {
  const quote = facts.quotes?.[0], s = facts.sentiment, triggers = (facts.triggers || []).filter(row => row.text);
  if (!quote && !s.analysed && !triggers.length) return null;
  return <div className="sig sig-anger">{s.analysed > 0 && <Figure value={pct(s.negative, s.analysed) + '%'} label="posting bernada negatif" />}
    {triggers.length > 0 && <ul className="sig-triggers">{triggers.map(row => <li key={row.code}><span className="pu-account-line"><strong>{row.author || 'Nama tidak tersedia'}</strong><b>{formatCount(row.interactions)} interaksi</b></span><p>{row.reason || row.text}</p></li>)}</ul>}
    {quote && <blockquote><p>{quote.text}</p><footer>{quote.author || 'Komentar'} · <PulseLike size={13} /> {formatCount(quote.likes)}</footer></blockquote>}</div>;
}

/** The one-line conclusion over the card, written from counted facts only. */
export function conclusion(facts) {
  if (!facts?.totals) return '';
  const t = facts.totals, s = facts.sentiment, peak = facts.peak_day;
  const parts = [`${formatCount(t.posts)} posting dari ${formatCount(t.accounts)} akun dalam ${formatCount(t.days)} hari`];
  if (peak && t.days > 1) parts.push(`teramai ${day(peak.date)} (${formatCount(peak.posts)} posting)`);
  if (s?.analysed) { const lead = ['negative', 'neutral', 'positive'].sort((a, b) => s[b] - s[a])[0]; parts.push(`sentimen dominan ${sentimentLabels[lead].toLowerCase()} ${pct(s[lead], s.analysed)}%`); }
  return parts.join(' · ');
}

/** Counted overview over the whole card: sentiment bar, platform split, loudest accounts, emotions. */
export function Overview({ facts }) {
  if (!facts?.totals) return null;
  const platforms = facts.platforms || [], accounts = facts.accounts || [], emotions = (facts.emotions || []).filter(row => row.label !== 'none');
  const total = platforms.reduce((sum, row) => sum + row.posts, 0);
  const top = Math.max(...accounts.map(row => row.interactions), 1);
  return <div className="sig-overview">
    <p className="sig-conclusion"><strong>{conclusion(facts)}</strong></p>
    {platforms.length > 0 && <div className="sig-block"><h4>Platform</h4><div className="sig-bar" role="img" aria-label={platforms.map(row => `${row.platform} ${pct(row.posts, total)}%`).join(', ')}>{platforms.map((row, index) => <span key={row.platform} style={{ flexGrow: row.posts, background: `color-mix(in oklch, var(--ps-accent) ${100 - index * 16}%, var(--ps-panel))` }} />)}</div><ul className="sig-legend">{platforms.map(row => <li key={row.platform}><strong>{pct(row.posts, total)}%</strong> {row.platform}</li>)}</ul></div>}
    {accounts.length > 0 && <div className="sig-block"><h4>Akun dengan interaksi terbesar</h4><ol className="sig-talk">{accounts.map(row => <li key={row.author + row.platform}><span>{row.author}</span><b>{formatCount(row.interactions)}</b><i style={{ width: `${row.interactions / top * 100}%` }} /></li>)}</ol></div>}
    {emotions.length > 0 && <div className="sig-block"><h4>Emosi dominan</h4><ul className="sig-legend">{emotions.map(row => <li key={row.label}><strong>{formatCount(row.posts)}</strong> {row.label}</li>)}</ul></div>}
  </div>;
}

/** Bullets that start with a date become a timeline; the volume per day runs above it. */
export function Timeline({ bullets, render }) {
  const rows = bullets.map(text => { const match = text.match(/^(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?(?:[,\s]+\d{1,2}[.:]\d{2}(?:\s*WIB)?)?)\s*[:—–-]\s*(.+)$/); return match ? { when: match[1], text: match[2] } : { when: null, text }; });
  return <ol className="sig-timeline">{rows.map((row, index) => <li key={index}><span className="sig-when">{row.when || '•'}</span><p>{render(row.text)}</p></li>)}</ol>;
}

function Volume({ facts }) {
  if (facts.days.length < 2) return null;
  const peak = facts.peak_day;
  return <div className="sig sig-volume"><span className="sig-spark"><Sparkline values={facts.days.map(row => row.posts)} width={320} height={48} /></span><span>{day(facts.days[0].date)} sampai {day(facts.days.at(-1).date)}{peak ? ` · teramai ${day(peak.date)} (${formatCount(peak.posts)} posting)` : ''}</span></div>;
}

const graphics = { start: Start, viral: Viral, topic: Figures, overview: Figures, talk: Talk, sentiment: Sentiment, anger: Anger, timeline: Volume };

/** The infographic for one section, or nothing when that kind has none or the summary predates `facts`. */
export default function SummaryInfographic({ kind, facts }) {
  const Graphic = graphics[kind];
  return Graphic && facts ? <Graphic facts={facts} /> : null;
}
