import { ArrowDownRight, ArrowUpRight, Minus, X } from 'lucide-react';
import { PlatformIcon, platformLabel } from '../admin/pulse/PlatformIcon';
import { sentimentLabels } from '../../lib/pulsePostFilters';
import { platformColor, sentimentTone } from '../../lib/pulseChartTheme';

/** Base tag. Static by default; becomes a toggle with `pressed`, a removable chip with `onRemove`,
 * or a link with `href`. Always carries a text label: colour and dot only reinforce it.
 * @param {{tone?: 'neutral'|'accent'|'success'|'warning'|'danger'|'info'|'positive'|'negative'|'neutral-sentiment'|'unknown',
 *   variant?: 'soft'|'outline'|'solid', size?: 'sm'|'md'|'lg', dot?: boolean, icon?: import('react').ElementType, leading?: import('react').ReactNode,
 *   count?: number|string, pressed?: boolean, onClick?: Function, onRemove?: Function, removeLabel?: string,
 *   href?: string, className?: string, children?: import('react').ReactNode}} props
 */
export function PulseTag({ tone = 'neutral', variant = 'soft', size = 'md', dot = false, icon: Icon, leading, count, pressed, onClick, onRemove, removeLabel, href, className = '', children, ...props }) {
  const body = <>
    {dot && <span className="pu-tag-dot" aria-hidden="true" />}
    {leading}{Icon && <Icon size={size === 'sm' ? 11 : 13} aria-hidden="true" />}
    <span className="pu-tag-label">{children}</span>
    {count != null && <span className="pu-tag-count">{count}</span>}
    {onRemove && <span className="pu-tag-remove" aria-hidden="true"><X size={12} /></span>}
  </>;
  const shared = { className: `pu-tag ${className}`.trim(), 'data-tone': tone, 'data-variant': variant, 'data-size': size, ...props };
  if (onRemove) return <button type="button" {...shared} onClick={onRemove} aria-label={removeLabel || `Hapus ${typeof children === 'string' ? children : 'filter'}`}>{body}</button>;
  if (href) return <a {...shared} href={href}>{body}</a>;
  if (onClick || pressed !== undefined) return <button type="button" {...shared} onClick={onClick} aria-pressed={pressed}>{body}</button>;
  return <span {...shared}>{body}</span>;
}

/** Sentiment of one piece of content. Unknown stays visibly different from neutral. */
export function SentimentTag({ value = 'unknown', ...props }) {
  const key = sentimentLabels[value] ? value : 'unknown';
  return <PulseTag tone={sentimentTone[key]} dot {...props}>{sentimentLabels[key]}</PulseTag>;
}

/** Source platform with its glyph. Colour orients; it says nothing about data quality. */
export function PlatformTag({ platform, children, ...props }) {
  return <PulseTag variant="outline" data-platform={platform || 'unknown'} style={{ '--ps-plat': platformColor(platform) }} leading={<PlatformIcon platform={platform} size={13} />} {...props}>{children || platformLabel(platform)}</PulseTag>;
}

/** Keyword or hashtag. Removable when `onRemove` is given. */
export function KeywordTag({ children, ...props }) {
  return <PulseTag variant="outline" {...props}>{children}</PulseTag>;
}

/** Change against a comparison period. `intent` is neutral unless the caller knows that
 * up is good or bad for this metric; rising volume alone is neither.
 * @param {{value: number|null, unit?: string, intent?: 'neutral'|'good'|'bad', label?: string}} props
 */
export function PulseDelta({ value, unit = '%', intent = 'neutral', label }) {
  if (value == null || !Number.isFinite(value)) return null;
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const text = `${value > 0 ? '+' : ''}${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}${unit}`;
  const words = direction === 'up' ? 'naik' : direction === 'down' ? 'turun' : 'tetap';
  return <span className="pu-delta" data-direction={direction} data-intent={direction === 'flat' ? 'neutral' : intent} aria-label={label || `${words} ${text.replace(/^[+-]/, '')}`}><Icon size={14} aria-hidden="true" />{text}</span>;
}
