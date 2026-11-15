import { LoaderCircle } from 'lucide-react';
import { Button } from './shadcn/button';
import { cn } from '../../lib/utils';
import { formatCount } from '../../lib/pulseData';
import { PulseArrow } from './PulseArrow';

/** PULSE-scoped action. Defaults to a non-submitting button. Explicit type="submit" for forms.
 * `arrow` appends the PULSE arrow for actions that open evidence or another view.
 * `reverse` is the ink-filled button for the one action that must stand out on a tinted or busy surface.
 * `size="sm"` is for dense rows; `iconOnly` makes a square button and needs an `aria-label`.
 * @param {{variant?: 'primary'|'secondary'|'quiet'|'reverse', size?: 'md'|'sm', iconOnly?: boolean, arrow?: boolean, busy?: boolean, busyLabel?: string, disabled?: boolean, type?: 'button'|'submit'|'reset', className?: string, children?: import('react').ReactNode}} props
 */
export function PulseButton({ variant = 'secondary', size = 'md', iconOnly = false, busy = false, busyLabel, disabled, type = 'button', className = '', arrow = false, children, ...props }) {
  return <Button {...props} type={type} variant={VARIANTS[variant]} data-size={size === 'sm' ? 'sm' : undefined} data-icon-only={iconOnly ? '' : undefined} className={cn('pu-button',`pu-button-${variant}`,className)} disabled={disabled || busy} aria-busy={busy || undefined}>
    {busy && <LoaderCircle className="pu-spinner" data-icon="inline-start" aria-hidden="true" />}{busy && busyLabel ? busyLabel : children}{arrow && !busy && <PulseArrow decorative />}
  </Button>;
}
const VARIANTS = {primary:'default',reverse:'default',secondary:'outline',quiet:'ghost'};

/** An action that goes somewhere, drawn by the same Button as PulseButton (rendered as the link), so links and buttons
 * in one row keep one height, one width when `iconOnly`, and one look. With `href` it is a link to a page elsewhere
 * (pass `target` and `rel` as usual); for a page inside PULSE, wrap exactly one router `<Link>` (this module stays free
 * of the router). Same `variant`, `size` and `iconOnly` as PulseButton.
 * @param {{variant?: 'primary'|'secondary'|'quiet'|'reverse', size?: 'md'|'sm', iconOnly?: boolean, href?: string, className?: string, children?: import('react').ReactNode}} props
 */
export function PulseButtonLink({ variant = 'secondary', size = 'md', iconOnly = false, href, className = '', children, ...props }) {
  return <Button asChild variant={VARIANTS[variant]} data-size={size === 'sm' ? 'sm' : undefined} data-icon-only={iconOnly ? '' : undefined} className={cn('pu-button',`pu-button-${variant}`,className)}>
    {href != null ? <a href={href} {...props}>{children}</a> : children}
  </Button>;
}

/** Noninteractive status. Always supply a human-readable label; never encode status by color alone.
 * @param {{tone?: 'neutral'|'success'|'warning'|'accent'|'danger'|'info', children?: import('react').ReactNode}} props
 */
export function PulseBadge({ tone = 'neutral', children }) {
  return <span className={`pu-badge pu-badge-${tone}`}><span className="pu-status-dot" aria-hidden="true" />{children}</span>;
}

/** Inline guidance. Use alert only for actionable errors, not static explanations. */
export function PulseNotice({ children, tone = 'neutral', role }) {
  return <div className={`pu-notice pu-notice-${tone}`} role={role}>{children}</div>;
}

/** One observed metric inside a dl. Missing values remain unknown, never zero. */
export function PulseMetric({label,value,icon:Icon}) {
  return <div className="pu-metric"><dt>{Icon&&<Icon size={15} aria-hidden="true"/>}{label}</dt><dd>{value==null?<span aria-label="Tidak tersedia">—</span>:formatCount(value)}</dd></div>;
}
