import { formatCount } from '../../lib/pulseData';
import { sharePercent } from '../../lib/pulseChartTheme';
import { toneShares } from '../../lib/pulseMeasures';
import { shareText as meterText } from '../../lib/pulseTrend';
import { PulseDelta } from './PulseTag';
import AccountAvatar from '../admin/pulse/AccountAvatar';

/** Trend glyph for a stat cell. Decorative: the number and note carry the meaning.
 * Renders nothing for fewer than two points, so one day of data never looks like a trend. */
export function Sparkline({ values = [], width = 84, height = 36 }) {
  const points = values.filter(Number.isFinite);
  if (points.length < 2) return null;
  const max = Math.max(...points), min = Math.min(0, ...points), span = max - min || 1, pad = 2;
  const xy = points.map((v, i) => [pad + i * (width - pad * 2) / (points.length - 1), pad + (height - pad * 2) * (1 - (v - min) / span)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = xy.at(-1);
  return <svg className="pu-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d={`${line} L${lastX.toFixed(1)} ${height} L${xy[0][0].toFixed(1)} ${height} Z`} fill="currentColor" fillOpacity=".12" />
    <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    <circle cx={lastX} cy={lastY} r="2.25" fill="currentColor" />
  </svg>;
}

/** One strip of stats on a single surface. Children are PulseStat cells. `compact` is the same tile one step smaller, for
 * figures that sit inside a card as one quiet line (Beranda's refresh figures), not a strip of their own. */
export function PulseStatGrid({ label, children, className = '', compact = false }) {
  return <div className={`pu-stat-grid ${className}`.trim()} role="group" aria-label={label} data-size={compact ? 'compact' : undefined}>{children}</div>;
}

/** One observed figure: the KPI card. A null value renders as unavailable, never as zero. Pass a string
 * value for states such as "Memuat…". Becomes a link or button when `href` / `onClick` is set.
 *
 * Anatomy, top to bottom: label · value with its change · one visual (a share meter or a trend line) · note.
 * - `delta` is the change against a comparison; `deltaIntent` colours it by meaning (good green, bad red),
 *   never by direction alone. `deltaNote` says what it is compared with.
 * - `share` (0 to 100) draws a meter with the percentage; `shareLabel` says of what. `shareText` prints the
 *   percentage as given (a tone share from `toneShares(...).text`, where a sliver reads "<1%") instead of rounding `share`.
 * - `trend` draws the line; when both are given the meter sits under the value and the line beside it.
 * @param {{label: string, value: number|string|null, note?: import('react').ReactNode, icon?: import('react').ElementType,
 *   tone?: 'positive'|'negative'|'neutral-sentiment'|'unknown', delta?: number|null, deltaUnit?: string,
 *   deltaIntent?: 'neutral'|'good'|'bad', deltaNote?: string, share?: number|null, shareText?: string, shareLabel?: string,
 *   trend?: number[], href?: string, onClick?: Function, mark?: string, pressed?: boolean, ariaLabel?: string, className?: string}} props
 * - `mark` is a categorical colour (an emotion, a platform) for the label's square and the meter, where `tone` is a
 *   sentiment; `pressed` makes an `onClick` tile a toggle; `ariaLabel` names the tile when its words are not enough.
 */
export function PulseStat({ label, value, note, icon: Icon, tone, delta, deltaUnit, deltaIntent, deltaNote, share, shareText, shareLabel, trend, media, href, onClick, as: Link, to, mark, pressed, ariaLabel, className = '' }) {
  const text = typeof value === 'string';
  const hasShare = Number.isFinite(share);
  const percent = hasShare ? Math.max(0, Math.min(100, share)) : 0;
  const printed = shareText || meterText(percent);
  const body = <>
    {media && <span className="pu-stat-media">{media}</span>}
    <span className="pu-stat-label">{tone || mark ? <i aria-hidden="true" /> : Icon && <Icon size={14} aria-hidden="true" />}{label}</span>
    <span className="pu-stat-value"><strong data-kind={text ? 'text' : undefined}>{text ? value : value == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(value)}</strong><PulseDelta value={delta} unit={deltaUnit} intent={deltaIntent} />{deltaNote && Number.isFinite(delta) && <small className="pu-stat-delta-note">{deltaNote}</small>}</span>
    {hasShare && <span className="pu-stat-meter" role="img" aria-label={`${shareText || `${Math.round(percent)}%`}${shareLabel ? ' ' + shareLabel : ''}`}><span className="pu-stat-meter-track"><i style={{ width: `${percent}%` }} /></span><b>{printed}</b>{shareLabel && <small>{shareLabel}</small>}</span>}
    {note && <span className="pu-stat-note">{note}</span>}
    {trend && <span className="pu-stat-spark"><Sparkline values={trend} /></span>}
  </>;
  const shared = { className: `pu-stat ${className}`.trim(), 'data-tone': tone, 'data-has-meter': hasShare ? '' : undefined, 'data-has-media': media ? '' : undefined, style: mark ? { '--stat-mark': mark } : undefined, 'aria-label': ariaLabel };
  if (Link && to) return <Link {...shared} to={to}>{body}</Link>;
  if (href) return <a {...shared} href={href}>{body}</a>;
  if (onClick) return <button type="button" {...shared} aria-pressed={pressed} onClick={onClick}>{body}</button>;
  return <div {...shared}>{body}</div>;
}

/** Legend that doubles as a readable key. Items: {key,label,color,value?,hatch?}. */
export function PulseLegend({ items, label = 'Keterangan warna' }) {
  return <ul className="pu-legend" aria-label={label}>{items.map(item => <li key={item.key}><span className="pu-swatch" data-hatch={item.hatch ? '' : undefined} style={{ '--swatch': item.color }} aria-hidden="true" />{item.label}{item.value != null && <strong>{formatCount(item.value)}</strong>}</li>)}</ul>;
}

/** Recharts tooltip in the PULSE surface language. Pass as `content={<PulseChartTooltip/>}`.
 * The head carries the label and, with `total`, the sum of the rows. `percent` adds each row's share of the rows shown
 * and draws those shares as one bar. `top(label)` may return up to three `{id, author, platform, photo, text, value}`
 * rows to preview what is behind the bar; `topUnit` names what their `value` counts.
 * Tone rows (positive, neutral, negative, unknown) take tone_share_v2: shares of every post of the bucket, read from the
 * row's own data (`payload`), so hiding the "belum dianalisis" row changes no percentage and its room on the bar stays
 * empty; "<1%" for a sliver. */
export function PulseChartTooltip({ active, payload, label, labelFormatter, total = false, note, top, percent = false, topTitle = 'Posting teratas', topUnit }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(row => Number.isFinite(row.value));
  const sum = rows.reduce((value, row) => value + row.value, 0);
  const isTone = key => ['positive', 'neutral', 'negative', 'unknown'].includes(key);
  const datum = rows[0]?.payload, whole = datum && ['positive', 'neutral', 'negative', 'unknown'].every(key => Number.isFinite(datum[key]));
  const tones = rows.some(row => isTone(row.dataKey)) ? toneShares(whole ? datum : Object.fromEntries(rows.map(row => [row.dataKey, row.value]))) : null;
  const gap = tones && whole && !rows.some(row => row.dataKey === 'unknown') ? datum.unknown : 0;
  const share = row => (tones ? (isTone(row.dataKey) && tones.text ? tones.text[row.dataKey] : null) : `${Math.round(row.value / sum * 100)}%`);
  const hatched = row => row.payload?.__hatch === row.dataKey || row.dataKey === 'unknown' ? '' : undefined;
  const list = top ? top(label) : [];
  return <div className="pu-hover-card pu-chart-tooltip">
    <header className="pu-hover-head"><strong>{labelFormatter ? labelFormatter(label) : label}</strong>{total && rows.length > 1 && <span>Total <b>{formatCount(sum)}</b></span>}</header>
    {percent && sum > 0 && <span className="pu-hover-bar" aria-hidden="true">{rows.filter(row => row.value > 0).map(row => <i key={row.dataKey} data-hatch={hatched(row)} style={{ flexGrow: row.value, '--swatch': row.color || row.fill }} />)}{gap > 0 && <i data-gap="" style={{ flexGrow: gap }} />}</span>}
    <ul className="pu-hover-rows">{rows.map(row => <li key={row.dataKey}><span className="pu-swatch" data-hatch={hatched(row)} style={{ '--swatch': row.color || row.fill }} aria-hidden="true" />{row.name}<b>{formatCount(row.value)}</b>{percent && sum > 0 && share(row) && <em>{share(row)}</em>}</li>)}</ul>
    {note && <p className="pu-hover-foot">{note}</p>}
    {list.length > 0 && <section className="pu-chart-top-wrap">
      <p className="pu-chart-top-head"><span>{topTitle}</span>{topUnit && <span>{topUnit}</span>}</p>
      <ol className="pu-chart-top" aria-label={topTitle}>{list.map(row => <li key={row.id}><AccountAvatar size="sm" eager author={row.author} platform={row.platform} photo={row.photo} /><span className="pu-chart-top-who"><b>{row.author || 'Tanpa nama'}</b><span>{row.text}</span></span><i>{row.value == null ? '—' : formatCount(row.value)}</i></li>)}</ol>
    </section>}
  </div>;
}

/** Part-to-whole on one bar with one addressable row per part.
 * Segments: {key,label,value,color,hatch?,icon?,onClick?,to?}. Percentages use `total` (or the sum). */
export function PulseDistribution({ segments, total, label, as: Link }) {
  const whole = total ?? segments.reduce((sum, row) => sum + (row.value || 0), 0);
  return <div className="pu-distribution">
    <div className="pu-distribution-bar" role="img" aria-label={label || segments.map(row => `${row.label} ${sharePercent(row.value, whole) || '0%'}`).join(', ')}>
      {segments.filter(row => row.value > 0).map(row => <span key={row.key} data-hatch={row.hatch ? '' : undefined} style={{ flexGrow: row.value, flexBasis: 0, '--swatch': row.color }} />)}
    </div>
    <PulseBreakdown rows={segments} total={whole} as={Link} swatch />
  </div>;
}

/** Ranked rows with value, share and a proportional track. Rows: {key,label,value,color?,icon?,leading?,onClick?,to?}.
 * `scale="max"` sizes tracks against the largest row (rankings); the default sizes against the total (shares). */
export function PulseBreakdown({ rows, total, scale = 'total', swatch = false, as: Link }) {
  const whole = total ?? rows.reduce((sum, row) => sum + (row.value || 0), 0);
  const basis = scale === 'max' ? Math.max(1, ...rows.map(row => row.value || 0)) : Math.max(1, whole);
  return <ul className="pu-breakdown">{rows.map(row => {
    const Icon = row.icon;
    const body = <>
      <span className="pu-breakdown-label">{swatch ? <span className="pu-swatch" data-hatch={row.hatch ? '' : undefined} style={{ '--swatch': row.color }} aria-hidden="true" /> : row.leading || (Icon && <Icon size={16} aria-hidden="true" />)}<span>{row.label}</span></span>
      <span className="pu-breakdown-value">{formatCount(row.value)}</span>
      <span className="pu-breakdown-share">{sharePercent(row.value, whole) || '—'}</span>
      {!swatch && <span className="pu-breakdown-track" aria-hidden="true"><i style={{ width: `${(row.value || 0) / basis * 100}%` }} /></span>}
    </>;
    const shared = { className: 'pu-breakdown-row', style: { '--swatch': row.color } };
    return <li key={row.key}>{Link && row.to ? <Link {...shared} to={row.to}>{body}</Link> : row.onClick ? <button type="button" {...shared} onClick={row.onClick} aria-label={`${row.label}: ${formatCount(row.value)} posting. Buka sumber.`}>{body}</button> : <div {...shared}>{body}</div>}</li>;
  })}</ul>;
}

/** Empty or not-yet-available state inside a panel. Says what is missing and what to do next.
/** `action` is the one clear next step: a link or button. */
export function PulsePanelEmpty({ title, children, action }) {
  return <div className="pu-panel-empty">{title && <strong>{title}</strong>}<p>{children}</p>{action}</div>;
}
