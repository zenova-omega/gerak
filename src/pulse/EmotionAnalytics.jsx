import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { PulseArrow } from '../components/ui/PulseArrow';
import { ChartContainer, ChartTooltip } from '../components/ui/shadcn/chart';
import { PulseRange } from '../components/ui/PulseRange';
import { PlatformLabel } from '../components/admin/pulse/PlatformIcon';
import PostAvatar from '../components/admin/pulse/PostAvatar';
import { emotionEvidence, emotionFaces, emotionLabels, emotionSummary, filledDays, postEmotion } from '../lib/pulseEmotion';
import { formatCount, safeSourceUrl, pulseDate } from '../lib/pulseData';
import { zone } from '../lib/pulseMeasures';
import { sourceText } from '../lib/pulseOverview';
import { allRange, rangeBounds, resolveRange, withinRange } from '../lib/pulseRange';
import { sentimentDate } from '../lib/pulseSentiment';
import { bucketLabel } from '../lib/pulseTrendSeries';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
import './emotion-analytics.css';

// The order the emotions are stacked in, bottom to top. Fixed, so a colour and a place always mean the same emotion.
// Neighbours in this order are the pairs of the six chart colours that stay furthest apart, also for red-green colour
// blindness (checked with the palette validator); the 2px gap between segments and the named tiles do the rest.
const STACK = ['anger', 'admiration', 'joy', 'sadness', 'disgust', 'fear'];
const series = Object.fromEntries(STACK.map(key => [key, { label: emotionLabels[key], color: `var(--emotion-${key})` }]));
const percent = share => Math.round(share * 100) + '%';
const dayLabel = date => bucketLabel({ from: date, to: date });

/** One day under the cursor: the emotions stated that day, most first, then what stated none. */
/** The hover card of one day: the product's one floating card (`pu-hover-card`), with the emotions stated that day
 * as one bar and as rows, largest first. Posts without a clear emotion are counted in the foot, not drawn. */
export function DayTip({ active, payload }) {
  const row = active && payload?.[0]?.payload;
  if (!row) return null;
  const stated = STACK.map(key => ({ key, count: row[key] || 0 })).filter(item => item.count > 0).sort((a, b) => b.count - a.count);
  const total = stated.reduce((sum, item) => sum + item.count, 0);
  return <div className="pu-hover-card pea-tip">
    <header className="pu-hover-head"><strong>{dayLabel(row.date)}</strong><span><b>{formatCount(total)}</b> posting beremosi</span></header>
    {stated.length > 0 && <span className="pu-hover-bar" aria-hidden="true">{stated.map(item => <i key={item.key} style={{ flexGrow: item.count, '--swatch': `var(--emotion-${item.key})` }} />)}</span>}
    {stated.length > 0 && <ul className="pu-hover-rows">{stated.map(item => <li key={item.key}><span className="pu-swatch" style={{ '--swatch': `var(--emotion-${item.key})` }} aria-hidden="true" /><span aria-hidden="true">{emotionFaces[item.key]}</span>{emotionLabels[item.key]}<b>{formatCount(item.count)}</b></li>)}</ul>}
    {row.none > 0 && <p className="pu-hover-foot">Tanpa emosi jelas<b>{formatCount(row.none)}</b></p>}
  </div>;
}

/**
 * Emotions stated in a project's posts. Read from the top: how many posts state an emotion at all and which one leads,
 * how the emotions moved day by day, then the six emotions, largest first. The six tiles are the chart's key (same
 * colour, same name) and its filter: choosing one dims the others in the chart and lists that emotion's posts.
 * @param {{posts: object[]}} props posts already scoped to the project's period and platforms
 */
export default function EmotionAnalytics({ posts = [] }) {
  // The range filter narrows the whole card, so the figures, the daily bars and the sources always count the same posts.
  // Its days are the days that have an emotion result; "Semua" keeps every post, dated or not.
  const whole = emotionEvidence(posts), bounds = rangeBounds(whole.days.map(row => row.date));
  const [range, setRange] = useState(allRange), shown = resolveRange(bounds, range);
  const data = shown && shown.key !== 'all' ? emotionEvidence(withinRange(posts, shown, sentimentDate)) : whole;
  const [selected, setSelected] = useState(null), [day, setDay] = useState(null), [limit, setLimit] = useState(10);
  const choose = (key, date = null) => { setSelected(key); setDay(date); setLimit(10); };
  const rows = selected ? (data.rows[selected] || []).filter(post => !day || sentimentDate(post) === day) : [];
  const summary = emotionSummary(data), lead = summary.lead;
  const dimmed = key => selected && selected !== 'none' && selected !== key;
  // Days between the first and the last are drawn as empty days. A range too long for that keeps only the days that
  // have posts, and the caption says so: an axis that skips days without saying it reads as a steady run.
  const drawn = filledDays(data.days);
  const skipsDays = drawn.length === data.days.length && data.days.length > 1
    && (Date.parse(data.days.at(-1).date) - Date.parse(data.days[0].date)) / 86400000 + 1 > data.days.length;
  const title = <span>Emosi percakapan <InfoTip label="Tentang analisis emosi">Emosi yang dinyatakan dalam teks, bukan kondisi psikologis penulis atau opini seluruh publik. Satu emosi dominan per posting. Sentimen negatif tidak otomatis marah. Persentase tiap emosi dihitung dari posting yang menyatakan emosi; posting tanpa emosi jelas dihitung terpisah. Warna dan ilustrasi hanya penanda kategori.</InfoTip></span>;

  return <AnalyticsPanel title={title} label="Emosi percakapan" description="Apa nada emosional di balik percakapan?" className="pea-panel"
    actions={bounds && <PulseRange chart="Emosi percakapan" bounds={bounds} value={range} onChange={next => { setRange(next); setDay(null); setLimit(10); }} />}>
    {data.analyzed ? <div className="pea-lede">
      <div className="pea-figures">
        <p className="pea-figure"><strong>{percent(summary.share)}</strong><span>posting menyatakan emosi</span><small>{formatCount(summary.emotional)} dari {formatCount(summary.analyzed)} yang dianalisis</small></p>
        {lead && <p className="pea-figure"><strong><span className="pea-figure-face" aria-hidden="true">{emotionFaces[lead.key]}</span>{emotionLabels[lead.key]}</strong><span>emosi terbanyak</span><small>{formatCount(lead.count)} posting</small></p>}
      </div>
      <div className="pea-split">
        <div className="pea-split-bar" aria-hidden="true">
          {summary.emotional > 0 && <span className="stated" style={{ flexGrow: summary.emotional }} />}
          {summary.none > 0 && <span style={{ flexGrow: summary.none }} />}
        </div>
        <div className="pea-split-keys">
          <span><i className="stated" aria-hidden="true" />Menyatakan emosi <strong>{formatCount(summary.emotional)}</strong></span>
          <button type="button" onClick={() => choose('none')} aria-pressed={selected === 'none'}><i aria-hidden="true" /><span aria-hidden="true">{emotionFaces.none}</span>Tanpa emosi jelas <strong>{formatCount(summary.none)}</strong></button>
          <span className="pea-aside">{formatCount(data.unknown)} belum dianalisis{data.review > 0 && ` · ${formatCount(data.review)} perlu ditinjau`}</span>
        </div>
      </div>
    </div> : <p className="pea-empty">Hasil emosi belum tersedia pada filter ini{data.unknown > 0 ? ` (${data.unknown.toLocaleString('id-ID')} posting belum dianalisis)` : ''}. Analisis berikutnya akan mengisi kategori secara otomatis; label sentimen lama tidak diubah menjadi emosi.</p>}

    {data.days.length > 0 && <div className="pea-trend">
      <h3>Perkembangan emosi</h3>
      <p className="pea-caption">Posting yang menyatakan emosi, per hari ({zone().name}). Yang tanpa emosi jelas tidak digambar. Klik batang untuk melihat postingnya.{skipsDays && ' Rentang ini panjang, jadi hari tanpa posting dilewati; pilih rentang yang lebih pendek untuk melihat tiap hari.'}</p>
      <ChartContainer config={series} className="pea-chart aspect-auto" role="img" aria-label={`Grafik batang bertumpuk: jumlah posting per emosi dan tanggal ${zone().name}. Angkanya ada pada Data harian di bawah grafik.`}>
        <BarChart data={drawn} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tickLine={false} axisLine={false} tickMargin={8} minTickGap={20} />
          <YAxis allowDecimals={false} width={40} tickLine={false} axisLine={false} tickFormatter={value => formatCount(value)} />
          <ChartTooltip cursor={{ fill: 'var(--ps-soft)' }} wrapperStyle={{ zIndex: 'var(--ps-z-tooltip)' }} content={<DayTip />} />
          {STACK.map(key => <Bar key={key} dataKey={key} name={emotionLabels[key]} stackId="emotions" fill={`var(--color-${key})`} fillOpacity={dimmed(key) ? 0.22 : 1}
            stroke="var(--ps-panel)" strokeWidth={2} maxBarSize={72} isAnimationActive={false} cursor="pointer" onClick={row => choose(key, row.date)} />)}
        </BarChart>
      </ChartContainer>
    </div>}

    {data.analyzed > 0 && <div className="pea-pick">
      <h3>Emosi yang dinyatakan</h3>
      <p className="pea-caption">Urut dari yang terbanyak. Pilih satu untuk menyorotnya di grafik dan melihat postingnya.</p>
      <div className="pea-emotions">{summary.ranked.map(({ key, count, share }) =>
        <button type="button" key={key} className={'pea-emotion ' + key} aria-pressed={selected === key && !day} aria-label={`${emotionLabels[key]}: ${count} posting. Lihat sumber`} onClick={() => choose(selected === key && !day ? null : key)}>
          <span className="pea-face" aria-hidden="true">{emotionFaces[key]}</span>
          <span className="pea-label"><i aria-hidden="true" />{emotionLabels[key]}</span>
          <strong>{count.toLocaleString('id-ID')}</strong>
          <small>{summary.emotional ? `${percent(share)} dari yang beremosi` : 'belum ada'}</small>
          <span className="pea-bar" aria-hidden="true"><i style={{ width: `${share * 100}%` }} /></span>
        </button>)}</div>
    </div>}

    {data.days.length > 0 && <details className="pea-data"><summary>Data harian · {zone().name}</summary><div className="pea-table"><table>
      <thead><tr><th scope="col">Tanggal</th>{Object.values(emotionLabels).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{data.days.map(row => <tr key={row.date}><th scope="row">{dayLabel(row.date)}</th>{Object.keys(emotionLabels).map(key =>
        <td key={key}><button type="button" onClick={() => choose(key, row.date)} aria-label={`${dayLabel(row.date)}, ${emotionLabels[key]}: ${row[key]} posting`}>{row[key]}</button></td>)}</tr>)}</tbody>
    </table></div></details>}

    {selected && <section className="pea-evidence" aria-label="Posting sumber emosi">
      <header><h3>{selected === 'none' ? 'Tanpa emosi jelas' : emotionLabels[selected]}{day ? ` · ${dayLabel(day)}` : ''} <span>{rows.length} posting</span></h3><button type="button" onClick={() => choose(null)}>Tutup rincian</button></header>
      {!rows.length ? <p>Belum ada posting dengan label emosi ini dalam filter terpilih.</p> : <ol>{rows.slice(0, limit).map(post => {
        const value = postEmotion(post), url = safeSourceUrl(post.url);
        return <li key={post.id}>
          <div className="pea-identity"><PostAvatar post={post} /><div><strong>{post.author || 'Sumber tanpa nama'}</strong><span><PlatformLabel platform={post.platform} /> · {pulseDate(post.published_at)}</span></div></div>
          <p>{sourceText(post)}</p>
          <p className="pea-reason"><strong>Alasan label:</strong> {value.reason}</p>
          {(value.review_needed || value.confidence < .7) && <span className="pea-review">Perlu ditinjau</span>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer">Buka posting asli <PulseArrow /></a>}
        </li>;
      })}</ol>}
      {rows.length > limit && <button type="button" onClick={() => setLimit(value => value + 10)}>Tampilkan 10 sumber berikutnya</button>}
    </section>}
  </AnalyticsPanel>;
}
