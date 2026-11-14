import { LoaderCircle } from 'lucide-react';
import { Button } from './shadcn/button';
import { cn } from '../../lib/utils';
import { formatCount } from '../../lib/pulseData';
import { PulseArrow } from './PulseArrow';

/** PULSE-scoped action. Defaults to a non-submitting button. Explicit type="submit" for forms.
 * `arrow` appends the PULSE arrow for actions that open evidence or another view.
 * @param {{variant?: 'primary'|'secondary'|'quiet', arrow?: boolean, busy?: boolean, busyLabel?: string, disabled?: boolean, type?: 'button'|'submit'|'reset', className?: string, children?: import('react').ReactNode}} props
 */
export function PulseButton({ variant = 'secondary', busy = false, busyLabel, disabled, type = 'button', className = '', arrow = false, children, ...props }) {
  return <Button {...props} type={type} variant={{primary:'default',secondary:'outline',quiet:'ghost'}[variant]} className={cn('pu-button',`pu-button-${variant}`,className)} disabled={disabled || busy} aria-busy={busy || undefined}>
    {busy && <LoaderCircle className="pu-spinner" data-icon="inline-start" aria-hidden="true" />}{busy && busyLabel ? busyLabel : children}{arrow && !busy && <PulseArrow decorative />}
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
