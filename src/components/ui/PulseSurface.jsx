import { createElement, useId } from 'react';
import { PulseButton } from './PulseUI';
import { PulseTag } from './PulseTag';
import './pulse-surface.css';

/** The one card. Every card, panel and tile in PULSE is this component or a CSS class that states
 * `extends PulseCard` in a comment; new code uses the component. Colour, radius, line and padding come from
 * the `--ps-surface-*` tokens, so a card looks the same in every page and in both themes.
 *
 * `tone` is a surface colour with a meaning (see docs/PULSE-COLOR-GUIDE.md):
 *   default = the page's reading surface · soft = grouped or secondary · selected = the chosen item ·
 *   success / warning / danger / info = system or collection state, always with a text label inside.
 * `padding`: md (20px, a card on the page) · sm (16px, a block inside a card) · none (the content brings its own).
 * `interactive` adds the hover and focus treatment; pass `href` or `onClick` on the element you render with `as`.
 * `title`, `description`, `actions` and `footer` build the standard header and footer so no page hand-rolls them.
 * @param {{as?: import('react').ElementType, tone?: 'default'|'soft'|'selected'|'success'|'warning'|'danger'|'info', padding?: 'md'|'sm'|'none', interactive?: boolean,
 *   title?: import('react').ReactNode, level?: 2|3|4, description?: import('react').ReactNode, actions?: import('react').ReactNode, footer?: import('react').ReactNode,
 *   className?: string, children?: import('react').ReactNode}} props
 */
export function PulseCard({ as: Tag = 'section', tone = 'default', padding = 'md', interactive = false, title, level = 3, description, actions, footer, className = '', children, ...props }) {
  const titleId = useId();
  const labelled = title && !props['aria-label'] && !props['aria-labelledby'] && Tag === 'section';
  return createElement(Tag, { ...props, className: `pu-card ${className}`.trim(), 'data-tone': tone, 'data-pad': padding, 'data-interactive': interactive ? '' : undefined, 'aria-labelledby': labelled ? titleId : props['aria-labelledby'] },
    (title || actions) && <header className="pu-card-head">
      <div className="pu-card-heading">{title && createElement(`h${level}`, { id: titleId, className: 'pu-card-title' }, title)}{description && <p className="pu-card-description">{description}</p>}</div>
      {actions && <div className="pu-card-actions">{actions}</div>}
    </header>,
    children,
    footer && <footer className="pu-card-foot">{footer}</footer>);
}

/** A row of cards that share one gap and one minimum width, packed to the width of the page.
 * `min` is the narrowest a card may become before the row wraps. */
export function PulseCardGrid({ min = 280, className = '', style, children, ...props }) {
  return <div {...props} className={`pu-card-grid ${className}`.trim()} style={{ '--pu-card-min': `${min}px`, ...style }}>{children}</div>;
}

/** The filter strip of a page or card. Controls inside share the 36px or 44px control scale and wrap on a phone.
 * `activeCount` shows how many filters are on; `onReset` appears only while at least one is.
 * @param {{label: string, activeCount?: number, onReset?: Function, resetLabel?: string, actions?: import('react').ReactNode, className?: string, children?: import('react').ReactNode}} props
 */
export function PulseFilterBar({ label, activeCount = 0, onReset, resetLabel = 'Hapus semua filter', actions, className = '', children, ...props }) {
  return <div role="group" aria-label={label} {...props} className={`pu-filter-bar ${className}`.trim()}>
    <div className="pu-filter-controls">{children}</div>
    {(actions || (onReset && activeCount > 0)) && <div className="pu-filter-actions">
      {onReset && activeCount > 0 && <PulseButton variant="quiet" size="sm" onClick={onReset}>{resetLabel} ({activeCount})</PulseButton>}
      {actions}
    </div>}
  </div>;
}

/** One labelled set of choices inside a filter bar (platform, sentiment, period). The label is read by assistive technology.
 * `inline` puts the name beside the choices, in a column every inline group and select shares, so stacked rows line up. */
export function PulseFilterGroup({ label, hideLabel = false, inline = false, className = '', children }) {
  const id = useId();
  return <div role="group" aria-labelledby={id} className={`pu-filter-group ${className}`.trim()} data-layout={inline ? 'inline' : undefined}>
    <span id={id} className="pu-filter-label" data-visually-hidden={hideLabel ? '' : undefined}>{label}</span>
    <div className="pu-tag-group">{children}</div>
  </div>;
}

/** A toggle filter chip. Pressed state is announced; `count` is how many items the choice would show. */
export function PulseFilterChip({ active = false, tone = 'accent', count, children, ...props }) {
  return <PulseTag size="lg" tone={tone} pressed={active} count={count} {...props}>{children}</PulseTag>;
}

/** A labelled native select that takes its size, edge and caret from the control tokens.
 * `options` is `[{value, label}]`. Uses the platform select so it works with every keyboard and screen reader.
 * `inline` puts the label beside the select, in the same column as an inline PulseFilterGroup. */
export function PulseFilterSelect({ label, value, onChange, options, inline = false, className = '', ...props }) {
  return <label className={`pu-filter-select ${className}`.trim()} data-layout={inline ? 'inline' : undefined}>
    <span className="pu-filter-label">{label}</span>
    <select {...props} value={value} onChange={event => onChange(event.target.value, event)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
  </label>;
}
