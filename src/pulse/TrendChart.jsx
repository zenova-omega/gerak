import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import { Button } from '../components/ui/shadcn/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/shadcn/chart';
import { PulseRange } from '../components/ui/PulseRange';
import { allRange, rangeBounds, resolveRange, withinRange } from '../lib/pulseRange';
import { trendSeries, trendUnitsAvailable, bucketLabel } from '../lib/pulseTrendSeries';
import { axisTicks } from '../lib/pulseReportPages';
import { sentimentColor } from '../lib/pulseChartTheme';
import { sentimentDate } from '../lib/pulseSentiment';
import { formatCount } from '../lib/pulseData';
import './ds/trend-chart.css';

const VIEWS = [['volume', 'Posting & interaksi'], ['sentiment', 'Sentimen']];
const UNITS = [['day', 'Hari', 'hari'], ['week', 'Minggu', 'minggu'], ['month', 'Bulan', 'bulan']];
const volumeSeries = { posts: { label: 'Posting', color: 'var(--ps-chart-1)' }, interactions: { label: 'Interaksi', color: 'var(--ps-chart-2)' } };
// Green and red are hard to tell apart for red-green colour blindness, so each tone also has its own mark:
// a diamond, a circle, a dashed line. The legend and the labels at the line ends repeat them.
const toneSeries = {
  negative: { label: 'Negatif', color: sentimentColor.negative, mark: 'diamond' },
  positive: { label: 'Positif', color: sentimentColor.positive, mark: 'circle' },
  neutral: { label: 'Netral', color: sentimentColor.neutral, mark: 'dash' },
};
const MARKS_UP_TO = 45;   // beyond this many points the marks crowd the line; the end labels still name each tone
const short = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

function Mark({ cx, cy, shape, color, size = 4 }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || shape === 'dash') return null;
  const ring = { fill: color, stroke: 'var(--ps-panel)', strokeWidth: 2 };
  return shape === 'diamond'
    ? <path d={`M${cx} ${cy - size - 1}L${cx + size + 1} ${cy}L${cx} ${cy + size + 1}L${cx - size - 1} ${cy}Z`} {...ring} />
    : <circle cx={cx} cy={cy} r={size} {...ring} />;
}

function Key({ series }) {
  return <li className="tc-key"><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
    <line x1="1" y1="6" x2="25" y2="6" stroke={series.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={series.mark === 'dash' ? '5 4' : undefined} />
    <Mark cx={13} cy={6} shape={series.mark} color={series.color} size={3.5} />
  </svg>{series.label}</li>;
}

function Switch({ label, value, options, onChange }) {
  return <div className="pu-segmented" role="group" aria-label={label}>{options.map(([key, text, off, why]) =>
    <Button key={key} type="button" size="sm" variant={value === key ? 'secondary' : 'ghost'} aria-pressed={value === key} disabled={off} title={off ? why : undefined} onClick={() => onChange(key)}>{text}</Button>)}</div>;
}

/** One line chart on one axis. `series` is `{key: {label, color, mark?}}`; several keys share the axis only when they share a unit. */
function Plot({ rows, unit, series, tall, pick, selected, labelEnds, name }) {
  const keys = Object.keys(series), last = rows.length - 1, byKey = new Map(rows.map(row => [row.key, row]));
  const marks = rows.length <= MARKS_UP_TO, lone = rows.length === 1;
  const ticks = axisTicks(Math.max(0, ...rows.flatMap(row => keys.map(key => row[key]))), 3), top = ticks.at(-1);
  // Labels at the line ends: the higher end is named above its line and the lower one below it, so two ends at the same
  // height stay apart. Near the baseline there is no room below, so both go above.
  const [high, low] = [...keys].filter(key => series[key].mark !== 'dash').sort((a, b) => (rows[last]?.[b] ?? 0) - (rows[last]?.[a] ?? 0));
  const end = key => rows[last]?.[key] ?? 0, close = low ? (end(high) - end(low)) / top < 0.12 : false, floor = low ? end(low) / top < 0.1 : false;
  const endOffset = key => key === high ? (close && floor ? -18 : -6) : floor ? -5 : 13;
  const chosen = selected?.from ? rows.filter(row => row.to >= selected.from && row.from <= (selected.to || selected.from)) : [];
  return <ChartContainer config={series} className={'tc-plot aspect-auto' + (tall ? ' tc-plot-tall' : '')} role="img" aria-label={`Grafik garis ${name} per ${UNITS.find(row => row[0] === unit)[2]}. Angkanya ada pada tabel di bawah grafik.`}>
    <LineChart data={rows} syncId="pulse-trend" margin={{ top: 10, right: labelEnds ? 64 : 24, bottom: 0, left: 0 }}
      onClick={pick ? state => { const row = state?.activePayload?.[0]?.payload; if (row?.posts > 0) pick(row, unit); } : undefined}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="key" tickFormatter={key => byKey.has(key) ? bucketLabel(byKey.get(key), unit) : ''} tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} interval="preserveStartEnd" />
      <YAxis width={44} ticks={ticks} domain={[0, top]} tickLine={false} axisLine={false} tickFormatter={value => short.format(value)} />
      <ChartTooltip cursor={{ stroke: 'var(--ps-control-line)', strokeWidth: 1 }} content={<ChartTooltipContent indicator="line" labelFormatter={(value, payload) => payload?.[0]?.payload ? bucketLabel(payload[0].payload, unit) : value} />} />
      {chosen.length > 1 && <ReferenceArea x1={chosen[0].key} x2={chosen.at(-1).key} fill="var(--ps-soft)" fillOpacity={0.9} strokeOpacity={0} ifOverflow="visible" />}
      {chosen.length === 1 && <ReferenceLine x={chosen[0].key} stroke="var(--ps-ink)" strokeDasharray="3 3" />}
      {keys.map(key => <Line key={key} type="monotone" dataKey={key} name={key} stroke={`var(--color-${key})`} strokeWidth={2} strokeLinecap="round"
        strokeDasharray={series[key].mark === 'dash' ? '5 4' : undefined} isAnimationActive={false}
        dot={series[key].mark && marks ? props => <Mark key={props.index} cx={props.cx} cy={props.cy} shape={series[key].mark} color={`var(--color-${key})`} /> : lone ? { r: 4, fill: `var(--color-${key})`, strokeWidth: 0 } : false}
        activeDot={{ r: 5, stroke: 'var(--ps-panel)', strokeWidth: 2 }}
        label={labelEnds && series[key].mark !== 'dash' ? props => props.index === last && Number.isFinite(props.y)
          ? <text key={key} x={props.x + 9} y={props.y + endOffset(key)} className="tc-end">{series[key].label}</text> : null : undefined} />)}
    </LineChart>
  </ChartContainer>;
}

/**
 * Posts over time, as lines. Two questions, one card: how much (posts and interactions, each on its own axis) and in what
 * tone (positive, neutral, negative). Follows the posts it is given, so the project's period and platforms apply.
 * @param {{posts: object[], period?: {from?: string, to?: string}, title?: string, description?: string,
 *   onPick?: (row: {from: string, to: string}, unit: string) => void, onClear?: () => void, selected?: {from: string, to?: string},
 *   initialView?: 'volume'|'sentiment', initialRange?: {key: string, from?: string, to?: string}, compact?: boolean, dense?: boolean, footer?: string}} props
 *   `onPick` receives the day, week or month that was clicked; without it the card promises no click.
 *   `initialRange` is the range filter's starting choice ("Semua" unless given); the reader's choice stays in this card.
 *   `compact` is the small form for a side column: no switches, posts and interactions only, and the days it covers.
 *   `dense` keeps the switches and shortens the plots, for a page whose main content is the list under the card.
 */
export default function TrendChart({ posts = [], period = {}, title = 'Tren percakapan', description = 'Menurut tanggal terbit (WIB).', onPick, onClear, selected, initialView = 'volume', initialRange = allRange, compact = false, dense = false, footer }) {
  const [view, setView] = useState(initialView), [chosenUnit, setUnit] = useState('day'), [choice, setChoice] = useState(initialRange);
  // The range comes first: it decides which days are drawn, then the unit groups those days. Presets end on the last day
  // with a post; "Semua" keeps the whole project period, as before.
  const bounds = rangeBounds(posts.map(sentimentDate), period), value = compact ? allRange : choice;
  const range = resolveRange(bounds, value), narrowed = range && range.key !== 'all';
  const inRange = withinRange(posts, range, sentimentDate), span = narrowed ? { from: range.from, to: range.to } : period;
  const can = trendUnitsAvailable(inRange, span);
  const days = trendSeries(inRange, 'day', span);
  const unit = compact ? (days.length > 62 && can.week ? 'week' : 'day') : can[chosenUnit] || chosenUnit === 'day' ? chosenUnit : 'day';
  const rows = unit === 'day' ? days : trendSeries(inRange, unit, span);
  const total = key => rows.reduce((sum, row) => sum + row[key], 0);
  const unknown = total('unknown'), all = total('posts'), undated = posts.filter(post => !sentimentDate(post)).length;
  const noun = UNITS.find(row => row[0] === unit)[2];
  const rangeFilter = bounds && <PulseRange chart={title} bounds={bounds} value={value} onChange={setChoice} captionOnly={compact} />;
  const switches = compact ? rangeFilter : <>
    <Switch label="Isi grafik" value={view} onChange={setView} options={VIEWS} />
    <Switch label="Satuan waktu" value={unit} onChange={setUnit} options={UNITS.map(([key, text, word]) => [key, text, key !== 'day' && !can[key], `Rentang ini baru mencakup satu ${word}`])} />
    {rangeFilter}
  </>;
  const pickedLabel = selected?.from ? bucketLabel({ from: selected.from, to: selected.to || selected.from }, 'week') : '';
  return <AnalyticsPanel className={'tc' + (compact ? ' tc-compact' : '') + (dense ? ' tc-dense' : '')} title={title} description={description} actions={switches} footer={footer}>
    {!rows.length ? <p className="tc-empty">Belum ada posting bertanggal pada pilihan ini, jadi belum ada garis yang bisa digambar.</p> : <div data-pick={onPick ? '' : undefined}>
      {pickedLabel && <p className="tc-selected" role="status"><span>Menampilkan posting {pickedLabel}.</span>{onClear && <Button type="button" size="sm" variant="outline" onClick={onClear}>Semua tanggal</Button>}</p>}
      {onPick && !pickedLabel && <p className="tc-hint">Klik grafik untuk melihat posting pada {noun} itu.</p>}
      {view === 'volume' || compact ? Object.entries(volumeSeries).map(([key, series]) => <figure className="tc-chart" key={key}>
        <figcaption><i style={{ background: series.color }} aria-hidden="true" /><strong>{series.label}</strong><span>{formatCount(total(key))} pada rentang ini</span></figcaption>
        <Plot rows={rows} unit={unit} series={{ [key]: series }} pick={onPick} selected={selected} name={series.label.toLowerCase()} />
      </figure>) : <figure className="tc-chart">
        <figcaption><strong>Posting menurut sentimen</strong><span>{formatCount(all - unknown)} posting berlabel</span></figcaption>
        <Plot rows={rows} unit={unit} series={toneSeries} tall pick={onPick} selected={selected} labelEnds name="posting menurut sentimen" />
        <ul className="tc-legend" aria-label="Keterangan garis">{Object.entries(toneSeries).map(([key, series]) => <Key key={key} series={series} />)}</ul>
        {unknown > 0 && <p className="tc-note">{formatCount(unknown)} dari {formatCount(all)} posting belum dianalisis dan tidak digambar.</p>}
      </figure>}
      {undated > 0 && <p className="tc-note">{formatCount(undated)} posting tanpa tanggal terbit tidak masuk grafik.</p>}
      {!compact && <details className="tc-data"><summary>Lihat angka</summary><div className="tc-table"><table>
        <caption className="pu-sr">Posting, interaksi dan sentimen per {noun}</caption>
        <thead><tr><th scope="col">Tanggal</th><th scope="col">Posting</th><th scope="col">Interaksi</th><th scope="col">Positif</th><th scope="col">Netral</th><th scope="col">Negatif</th><th scope="col">Belum dianalisis</th>{onPick && <th scope="col"><span className="pu-sr">Buka</span></th>}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{bucketLabel(row, unit)}</th>{['posts', 'interactions', 'positive', 'neutral', 'negative', 'unknown'].map(key => <td key={key}>{formatCount(row[key])}</td>)}
          {onPick && <td>{row.posts > 0 && <Button type="button" size="sm" variant="ghost" aria-label={'Lihat posting ' + bucketLabel(row, unit)} onClick={() => onPick(row, unit)}>Lihat</Button>}</td>}</tr>)}</tbody>
      </table></div></details>}
    </div>}
  </AnalyticsPanel>;
}
