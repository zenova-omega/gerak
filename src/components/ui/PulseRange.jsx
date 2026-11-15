import { useId, useState } from 'react';
import { Button } from './shadcn/button';
import { customRangeError, rangeChoices, rangeLabel, resolveRange } from '../../lib/pulseRange';
import '../../pulse/ds/range-filter.css';

/**
 * The range filter of one chart: 3 hari, 7 hari, 1 bulan, Semua, Rentang, then the days that are drawn, in words.
 * The chart owns the choice (`useState(allRange)`) and narrows its own data with `resolveRange` and `withinRange` from
 * `src/lib/pulseRange.js`, so one chart never changes another and nothing is stored. The project bar's period is
 * applied before the chart gets its data; "Semua" means all of that.
 *
 * "Rentang" shows two date inputs in the same row. A range that is incomplete, reversed or outside the days with data
 * is not sent to `onChange`: the chart keeps what it shows and the reason is written under the inputs.
 * With fewer than two days of data there is nothing to choose, so only the caption is shown; without dated data, nothing.
 *
 * @param {{
 *   chart: string,
 *   bounds: {first: string, last: string, days: number, from: string, to: string} | null,
 *   value: {key: string, from?: string, to?: string},
 *   onChange: (next: {key: string, from?: string, to?: string}) => void,
 *   captionOnly?: boolean,
 * }} props
 *   `chart` names the chart for assistive technology ("Rentang waktu <chart>"). `bounds` comes from `rangeBounds`.
 *   `captionOnly` is for the small form of a chart: the days it covers, no switch.
 */
export function PulseRange({ chart, bounds, value, onChange, captionOnly = false }) {
  // Dates being typed that cannot be applied yet. They belong to the range they were typed against: once the chart
  // shows another range (a preset, or a day opened from a table) they are forgotten.
  const [draft, setDraft] = useState(null);
  const errorId = useId();
  const range = resolveRange(bounds, value);
  if (!range) return null;
  const choosing = !captionOnly && bounds.days >= 2;
  const editing = choosing && range.key === 'custom';
  const typed = editing && draft && draft.base === range.from + '/' + range.to ? draft : null;
  const dates = typed || range, error = typed ? customRangeError(typed, bounds) : '';

  function choose(key) {
    setDraft(null);
    if (key !== 'custom') return onChange({ key });
    // Start from the days on screen, kept inside the days that have data, so opening "Rentang" changes nothing by itself.
    onChange({ key, from: range.from < bounds.first ? bounds.first : range.from, to: range.to > bounds.last ? bounds.last : range.to });
  }
  function setDate(side, day) {
    const next = { from: dates.from, to: dates.to, [side]: day };
    if (customRangeError(next, bounds)) return setDraft({ ...next, base: range.from + '/' + range.to });
    setDraft(null);
    onChange({ key: 'custom', from: next.from, to: next.to });
  }
  const dateInput = (side, label, min, max) => <label><span>{label}</span>
    <input type="date" aria-label={`${label} tanggal, ${chart}`} min={min} max={max} value={dates[side] || ''} aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined} onChange={event => setDate(side, event.target.value)} /></label>;

  return <div className="pu-range">
    {choosing && <div className="pu-segmented" role="group" aria-label={'Rentang waktu ' + chart}>{rangeChoices.map(choice =>
      <Button key={choice.key} type="button" size="sm" variant={range.key === choice.key ? 'secondary' : 'ghost'} aria-pressed={range.key === choice.key} onClick={() => choose(choice.key)}>{choice.label}</Button>)}</div>}
    {editing && <div className="pu-range-dates">
      {dateInput('from', 'Dari', bounds.first, dates.to || bounds.last)}
      {dateInput('to', 'Sampai', dates.from || bounds.first, bounds.last)}
    </div>}
    <p className="pu-range-caption" role="status">{rangeLabel(range.from, range.to)}</p>
    {error && <p className="pu-range-error" id={errorId} role="alert">{error}</p>}
  </div>;
}
