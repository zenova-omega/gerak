import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';
import { Button } from '../components/ui/shadcn/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/shadcn/chart';
import { PulseRange } from '../components/ui/PulseRange';
import { allRange, rangeBounds, resolveRange, withinRange } from '../lib/pulseRange';
import { trendSeries, trendUnitsAvailable, bucketLabel, platformTrend } from '../lib/pulseTrendSeries';
import { spikeFacts, spikeLines, spikeOnset, onsetLines } from '../lib/pulseTrendSpikes';
import useTrendSpikes from './useTrendSpikes';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import TrendSpikeCard, { TrendSpikeChip } from './TrendSpikeCard';
import { axisTicks } from '../lib/pulseReportPages';
import { platformColor, sentimentColor } from '../lib/pulseChartTheme';
import { sentimentDate } from '../lib/pulseSentiment';
import { netSentiment } from '../lib/pulseInsightMetrics';
import { formatCount } from '../lib/pulseData';
import './ds/trend-chart.css';

const VIEWS = [['volume', 'Posting & interaksi'], ['sentiment', 'Sentimen'], ['platform', 'Platform']];
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
const platformName = id => id === 'other' ? 'Lainnya' : platformLabel(id);
const shareText = share => share > 0 && share < 0.005 ? '<1%' : Math.round(share * 100) + '%';

function Mark({ cx, cy, shape, color, size = 4 }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || shape === 'dash') return null;
  const ring = { fill: color, stroke: 'var(--ps-panel)', strokeWidth: 2 };
  return shape === 'diamond'
    ? <path d={`M${cx} ${cy - size - 1}L${cx + size + 1} ${cy}L${cx} ${cy + size + 1}L${cx - size - 1} ${cy}Z`} {...ring} />
    : <circle cx={cx} cy={cy} r={size} {...ring} />;
}

/** A spike: a ring around the point, so it reads without colour and stays apart from the tone marks. */
function SpikeMark({ cx, cy, color }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return <g className="tc-spike" aria-hidden="true">
    <circle cx={cx} cy={cy} r={8} fill="var(--ps-panel)" stroke={color} strokeWidth={2} />
    <circle cx={cx} cy={cy} r={3.5} fill={color} />
  </g>;
}

/** The usual tooltip. On a spike it carries the infographic of what that day is made of, for the chart under the
 * cursor only: two charts share the cursor, and two full cards would cover both. The other chart names its spike in
 * one line. */
function Tip({ spikes, unit, detail, covered, color, seriesKey, ...props }) {
  const row = props.payload?.[0]?.payload, entry = row ? spikes?.get(row.key) : null;
  // The chart under the cursor is showing its card for this day, and the card is tall enough to lie over this chart:
  // a second tooltip here would sit on top of it.
  if (!detail && row && covered?.has(row.key)) return null;
  // The lower chart's card opens upwards: below it there is only the rest of the page, and a tall card would run off the screen.
  return <ChartTooltipContent {...props} indicator="line" className={entry && detail ? 'tc-tip-spike' + (seriesKey === 'interactions' ? ' tc-tip-up' : '') : undefined}
    labelFormatter={(value, payload) => payload?.[0]?.payload ? bucketLabel(payload[0].payload, unit) : value}
    footer={!entry ? undefined : detail ? <TrendSpikeCard entry={entry} seriesKey={seriesKey} unit={unit} color={color} /> : <TrendSpikeChip entry={entry} unit={unit} color={color} />} />;
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

/** One line chart on one axis. `series` is `{key: {label, color, mark?}}`; several keys share the axis only when they share a unit.
 * `mini` is the short form for a stack of charts (one per platform): two ticks, its own cursor, and the dates only where `axis` says so. */
function Plot({ rows, unit, series, tall, mini, axis = true, pick, selected, labelEnds, name, spikes, hot, onHot, covered }) {
  const keys = Object.keys(series), last = rows.length - 1, byKey = new Map(rows.map(row => [row.key, row]));
  const marks = rows.length <= MARKS_UP_TO, lone = rows.length === 1;
  const steps = axisTicks(Math.max(0, ...rows.flatMap(row => keys.map(key => row[key]))), 3), top = steps.at(-1), ticks = mini ? [0, top] : steps;
  // Labels at the line ends: the higher end is named above its line and the lower one below it, so two ends at the same
  // height stay apart. Near the baseline there is no room below, so both go above.
  const [high, low] = [...keys].filter(key => series[key].mark !== 'dash').sort((a, b) => (rows[last]?.[b] ?? 0) - (rows[last]?.[a] ?? 0));
  const end = key => rows[last]?.[key] ?? 0, close = low ? (end(high) - end(low)) / top < 0.12 : false, floor = low ? end(low) / top < 0.1 : false;
  const endOffset = key => key === high ? (close && floor ? -18 : -6) : floor ? -5 : 13;
  const chosen = selected?.from ? rows.filter(row => row.to >= selected.from && row.from <= (selected.to || selected.from)) : [];
  return <ChartContainer config={series} className={'tc-plot aspect-auto' + (tall ? ' tc-plot-tall' : '') + (mini ? ' tc-plot-mini' : '') + (mini && axis ? ' tc-plot-dated' : '')} role="img" aria-label={`Grafik garis ${name} per ${UNITS.find(row => row[0] === unit)[2]}.${spikes?.size ? ` ${spikes.size} lonjakan ditandai.` : ''} Angkanya ada pada tabel di bawah grafik.`}
    onMouseEnter={onHot ? () => onHot(true) : undefined} onMouseLeave={onHot ? () => onHot(false) : undefined} onTouchStart={onHot ? () => onHot(true) : undefined}>
    <LineChart data={rows} syncId={mini ? undefined : "pulse-trend"} margin={{ top: 10, right: labelEnds ? 64 : 24, bottom: 0, left: 0 }}
      onClick={pick ? state => { const row = state?.activePayload?.[0]?.payload; if (row?.posts > 0) pick(row, unit); } : undefined}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="key" hide={!axis} tickFormatter={key => byKey.has(key) ? bucketLabel(byKey.get(key), unit) : ''} tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} interval="preserveStartEnd" />
      <YAxis width={44} ticks={ticks} domain={[0, top]} tickLine={false} axisLine={false} tickFormatter={value => short.format(value)} />
      <ChartTooltip cursor={{ stroke: 'var(--ps-control-line)', strokeWidth: 1 }} allowEscapeViewBox={{ x: false, y: true }} wrapperStyle={{ zIndex: 'var(--ps-z-tooltip)' }}
        content={<Tip spikes={spikes} unit={unit} detail={hot} covered={covered} seriesKey={keys[0]} color={`var(--color-${keys[0]})`} />} />
      {chosen.length > 1 && <ReferenceArea x1={chosen[0].key} x2={chosen.at(-1).key} fill="var(--ps-soft)" fillOpacity={0.9} strokeOpacity={0} ifOverflow="visible" />}
      {chosen.length === 1 && <ReferenceLine x={chosen[0].key} stroke="var(--ps-ink)" strokeDasharray="3 3" />}
      {keys.map(key => <Line key={key} type="monotone" dataKey={key} name={key} stroke={`var(--color-${key})`} strokeWidth={2} strokeLinecap="round"
        strokeDasharray={series[key].mark === 'dash' ? '5 4' : undefined} isAnimationActive={false}
        dot={series[key].mark && marks ? props => <Mark key={props.index} cx={props.cx} cy={props.cy} shape={series[key].mark} color={`var(--color-${key})`} />
          : spikes?.size ? props => spikes.has(props.payload?.key) ? <SpikeMark key={props.index} cx={props.cx} cy={props.cy} color={`var(--color-${key})`} /> : <g key={props.index} />
          : lone ? { r: 4, fill: `var(--color-${key})`, strokeWidth: 0 } : false}
        activeDot={{ r: 5, stroke: 'var(--ps-panel)', strokeWidth: 2 }}
        label={labelEnds && series[key].mark !== 'dash' ? props => props.index === last && Number.isFinite(props.y)
          ? <text key={key} x={props.x + 9} y={props.y + endOffset(key)} className="tc-end">{series[key].label}</text> : null : undefined} />)}
    </LineChart>
  </ChartContainer>;
}


const netConfig = { net: { label: 'Sentimen bersih', color: 'var(--ps-ink)' } };
const signedNet = value => Number.isFinite(value) ? `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value))}` : '—';

/** Net sentiment per bucket, (positive − negative) ÷ analysed, from −100 to +100 around a zero line. A bucket with no
 * analysed post is a gap in the line, not a zero: nobody measured it. Sits under the tone lines, which show how many. */
function NetPlot({ rows, unit }) {
  const data = rows.map(row => ({ ...row, net: netSentiment(row) })), byKey = new Map(rows.map(row => [row.key, row]));
  const lone = data.filter(row => row.net !== null).length === 1;
  return <ChartContainer config={netConfig} className="tc-plot tc-plot-net aspect-auto" role="img" aria-label={`Garis sentimen bersih per ${UNITS.find(row => row[0] === unit)[2]}, dari minus 100 sampai plus 100. Angkanya ada pada tabel di bawah grafik.`}>
    <LineChart data={data} syncId="pulse-trend" margin={{ top: 10, right: 64, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="key" tickFormatter={key => byKey.has(key) ? bucketLabel(byKey.get(key), unit) : ''} tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} interval="preserveStartEnd" />
      <YAxis width={44} domain={[-100, 100]} ticks={[-100, 0, 100]} tickLine={false} axisLine={false} tickFormatter={signedNet} />
      <ReferenceLine y={0} stroke="var(--ps-ink)" strokeDasharray="4 4" />
      <ChartTooltip cursor={{ stroke: 'var(--ps-control-line)', strokeWidth: 1 }} wrapperStyle={{ zIndex: 'var(--ps-z-tooltip)' }}
        content={<ChartTooltipContent indicator="line" labelFormatter={(value, payload) => payload?.[0]?.payload ? bucketLabel(payload[0].payload, unit) : value} formatter={value => <span>Sentimen bersih <b>{signedNet(value)}</b></span>} />} />
      <Line type="monotone" dataKey="net" stroke="var(--ps-ink)" strokeWidth={2} strokeLinecap="round" connectNulls={false} isAnimationActive={false}
        dot={lone ? { r: 4, fill: 'var(--ps-ink)', strokeWidth: 0 } : false} activeDot={{ r: 5, stroke: 'var(--ps-panel)', strokeWidth: 2 }}
        label={props => props.index === rows.length - 1 && Number.isFinite(props.y) ? <text key="end" x={props.x + 9} y={props.y + 4} className="tc-end">{signedNet(props.value)}</text> : null} />
    </LineChart>
  </ChartContainer>;
}

/**
 * Posts over time, as lines. Three questions, one card: how much (posts and interactions, each on its own axis), in what
 * tone (positive, neutral, negative) and where (one line per platform, each on its own axis, with its count and share). Follows the posts it is given, so the project's period and platforms apply.
 * @param {{posts: object[], period?: {from?: string, to?: string}, title?: string, description?: string,
 *   onPick?: (row: {from: string, to: string}, unit: string) => void, onClear?: () => void, selected?: {from: string, to?: string},
 *   initialView?: 'volume'|'sentiment'|'platform', initialRange?: {key: string, from?: string, to?: string}, compact?: boolean, dense?: boolean, footer?: string}} props
 *   `onPick` receives the day, week or month that was clicked; without it the card promises no click.
 *   `initialRange` is the range filter's starting choice ("Semua" unless given); the reader's choice stays in this card.
 *   `compact` is the small form for a side column: no switches, posts and interactions only, and the days it covers.
 *   `dense` keeps the switches and shortens the plots, for a page whose main content is the list under the card.
 *   `spikes` (`{posts, interactions}`, each a list of `{key, value, usual, times}`) hands the card spikes that are already
 *   known, where no call to the server can be made (a test, a page rendered on the server). Without it the card asks the server.
 */
export default function TrendChart({ posts = [], period = {}, title = 'Tren percakapan', description, onPick, onClear, selected, initialView = 'volume', initialRange = allRange, compact = false, dense = false, footer, spikes: handedSpikes }) {
  const [view, setView] = useState(initialView), [chosenUnit, setUnit] = useState('day'), [choice, setChoice] = useState(initialRange), [hot, setHot] = useState(null);
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
  // Spikes of the two volume lines. Which buckets are spikes is the server's answer for the numbers drawn here (the
  // product's one rule, see useTrendSpikes), so the range and the unit above apply; while the answer is on its way,
  // and when the call fails, there are none. What each spike is made of is counted from the posts on screen (see
  // pulseTrendSpikes). The sentiment and platform views mark none.
  const volume = view === 'volume' || compact;
  const byKey = new Map(rows.map(row => [row.key, row])), found = useTrendSpikes(rows, { handed: handedSpikes, wanted: volume });
  const spikesOf = key => new Map(found[key].filter(spike => byKey.has(spike.key)).map(spike => {
    const facts = spikeFacts(inRange, byKey.get(spike.key));
    // How the day of a spike began is read in six hours, as one picture (day buckets only: a week has no start hour).
    // It is read for a spike in either line: the day that drew the interactions is the day whose start is asked about.
    const onset = unit === 'day' ? spikeOnset(inRange, byKey.get(spike.key)) : null;
    const lines = spikeLines(facts, spike, key, { unit, platformName: platformLabel }), began = onsetLines(onset, { platformName: platformLabel });
    return [spike.key, { spike, facts, onset, lines: !onset ? lines : key === 'posts' ? [lines[0], ...began] : [...lines, ...began] }];
  }));
  // One line per platform, each on its own axis: the busiest platform has hundreds of times the posts of the smallest,
  // so on a shared axis the small ones would lie flat on the baseline. Size is read from the figures beside each line.
  const platforms = !volume && view === 'platform' ? platformTrend(inRange, unit, span) : [];
  const clickable = onPick && !platforms.length;
  const spikes = volume ? { posts: spikesOf('posts'), interactions: spikesOf('interactions') } : { posts: new Map(), interactions: new Map() };
  const marked = spikes.posts.size + spikes.interactions.size > 0;
  const rangeFilter = bounds && <PulseRange chart={title} bounds={bounds} value={value} onChange={setChoice} captionOnly={compact} />;
  const switches = compact ? rangeFilter : <>
    <Switch label="Isi grafik" value={view} onChange={setView} options={VIEWS} />
    <Switch label="Satuan waktu" value={unit} onChange={setUnit} options={UNITS.map(([key, text, word]) => [key, text, key !== 'day' && !can[key], `Rentang ini baru mencakup satu ${word}`])} />
    {rangeFilter}
  </>;
  const pickedLabel = selected?.from ? bucketLabel({ from: selected.from, to: selected.to || selected.from }, 'week') : '';
  return <AnalyticsPanel className={'tc' + (compact ? ' tc-compact' : '') + (dense ? ' tc-dense' : '')} title={title} description={description} actions={switches} footer={footer}>
    {!rows.length ? <p className="tc-empty">Belum ada posting bertanggal.</p> : <div data-pick={clickable ? '' : undefined}>
      {pickedLabel && <p className="tc-selected" role="status"><span>Menampilkan posting {pickedLabel}.</span>{onClear && <Button type="button" size="sm" variant="outline" onClick={onClear}>Semua tanggal</Button>}</p>}
      {volume ? Object.entries(volumeSeries).map(([key, series]) => <figure className="tc-chart" key={key}>
        <figcaption><i style={{ background: series.color }} aria-hidden="true" /><strong>{series.label}</strong><span>{formatCount(total(key))} pada rentang ini</span></figcaption>
        <Plot rows={rows} unit={unit} series={{ [key]: series }} pick={onPick} selected={selected} name={series.label.toLowerCase()} spikes={spikes[key]}
          hot={hot === key} covered={hot && hot !== key ? spikes[hot] : undefined} onHot={on => setHot(current => on ? key : current === key ? null : current)} />
      </figure>) : platforms.length ? <figure className="tc-chart">
        <figcaption><strong>Posting menurut platform</strong><span>{formatCount(all)} posting di {platforms.length} platform</span></figcaption>
        <ol className="tc-plats">{platforms.map((item, index) => {
          const label = platformName(item.platform), color = platformColor(item.platform);
          return <li className="tc-plat" key={item.platform} style={{ '--tc-plat': color }}>
            <div className="tc-plat-head">
              <p className="tc-plat-name"><span aria-hidden="true"><PlatformIcon platform={item.platform} size={16} /></span><strong>{label}</strong></p>
              <p className="tc-plat-figure"><b>{formatCount(item.total)}</b> posting · {shareText(item.share)}</p>
              <span className="tc-plat-bar" aria-hidden="true"><i style={{ width: Math.max(2, item.share * 100) + '%' }} /></span>
              {item.peak && rows.length > 1 && <p className="tc-plat-peak">Teramai {bucketLabel(item.peak, unit)}: {formatCount(item.peak.posts)}</p>}
            </div>
            <Plot rows={item.rows} unit={unit} series={{ posts: { label, color } }} mini axis={index === platforms.length - 1} name={'posting di ' + label} />
          </li>;
        })}</ol>
        <p className="tc-note">Skala tiap platform sendiri-sendiri.</p>
      </figure> : <figure className="tc-chart">
        <figcaption><strong>Posting menurut sentimen</strong><span>{formatCount(all - unknown)} posting berlabel</span></figcaption>
        <Plot rows={rows} unit={unit} series={toneSeries} tall pick={onPick} selected={selected} labelEnds name="posting menurut sentimen" />
        <ul className="tc-legend" aria-label="Keterangan garis">{Object.entries(toneSeries).map(([key, series]) => <Key key={key} series={series} />)}</ul>
        {unknown > 0 && <p className="tc-note">{formatCount(unknown)} dari {formatCount(all)} posting belum dianalisis, tidak digambar.</p>}
      </figure>}
      {!volume && !platforms.length && <figure className="tc-chart">
        <figcaption><strong>Sentimen bersih</strong><span>(positif − negatif) ÷ yang dianalisis</span></figcaption>
        <NetPlot rows={rows} unit={unit} />
      </figure>}
      {marked && <p className="tc-note tc-spike-note"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><SpikeMark cx={9} cy={9} color="var(--ps-muted)" /></svg>
        <span>Titik bercincin: lonjakan.</span></p>}
      {undated > 0 && <p className="tc-note">{formatCount(undated)} posting tanpa tanggal terbit tidak masuk grafik.</p>}
      {!compact && <details className="tc-data"><summary>Lihat angka</summary><div className="tc-table"><table>
        <caption className="pu-sr">{platforms.length ? `Posting per platform per ${noun}` : `Posting, interaksi dan sentimen per ${noun}`}</caption>
        <thead><tr><th scope="col">Tanggal</th><th scope="col">Posting</th>{platforms.length ? platforms.map(item => <th scope="col" key={item.platform}>{platformName(item.platform)}</th>)
          : ['Interaksi', 'Positif', 'Netral', 'Negatif', 'Belum dianalisis', 'Sentimen bersih'].map(name => <th scope="col" key={name}>{name}</th>)}{marked && <th scope="col">Lonjakan</th>}{onPick && <th scope="col"><span className="pu-sr">Buka</span></th>}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.key}><th scope="row">{bucketLabel(row, unit)}</th><td>{formatCount(row.posts)}</td>
          {platforms.length ? platforms.map(item => <td key={item.platform}>{formatCount(item.rows[index].posts)}</td>)
            : [...['interactions', 'positive', 'neutral', 'negative', 'unknown'].map(key => <td key={key}>{formatCount(row[key])}</td>), <td key="net">{signedNet(netSentiment(row))}</td>]}
          {marked && <td className="tc-why-cell">{['posts', 'interactions'].flatMap(key => spikes[key].get(row.key)?.lines || []).map(line => <span key={line}>{line}</span>)}</td>}
          {onPick && <td>{row.posts > 0 && <Button type="button" size="sm" variant="ghost" aria-label={'Lihat posting ' + bucketLabel(row, unit)} onClick={() => onPick(row, unit)}>Lihat</Button>}</td>}</tr>)}</tbody>
      </table></div></details>}
    </div>}
  </AnalyticsPanel>;
}
