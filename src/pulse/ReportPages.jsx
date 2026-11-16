// The report as A4 sheets. The same DOM is the on-screen preview, the print dialog and the PDF, so everything
// here is plain HTML and inline SVG: no canvas, no control, nothing that needs a script or a request at print time.
// Figures and sentences come from src/lib/pulseReportPages.js; this file only lays them out.
import { PulseLogo } from '../components/ui/PulseLogo';
import { PulseTag, SentimentTag } from '../components/ui/PulseTag';
import { PulseRepostNote } from '../components/ui/PulseMetricRow';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import { ProjectPostsContext } from './projectPosts';
import RegionMiniMap from './RegionMiniMap';
import { concentrationShareText } from './AccountConcentration';
import { coverageLevels, coveragePercent, coverageShares } from './CoverageBadge';
import { formatCount, pulseDate, pulseDay, safeSourceUrl } from '../lib/pulseData';
import { zone } from '../lib/pulseMeasures';
import { sentimentColor, sentimentOrder } from '../lib/pulseChartTheme';
import { postSentiment, sentimentLabels } from '../lib/pulsePostFilters';
import { percentLabel, postInteractions } from '../lib/pulseEngagement';
import { kindLabels, kindOrder, shares } from '../lib/pulseVoice';
import { stanceLabels } from '../lib/pulseResponse';
import { deltaText, shareText } from '../lib/pulseKpis';
import { spikeFacts, spikeLines } from '../lib/pulseTrendSpikes';
import { bucketLabel } from '../lib/pulseTrendSeries';
import { sourceText } from '../lib/pulseOverview';
import { accountRowsThatFit, axisTicks, fallbackSummary, maxTopPosts, periodLabel, summaryScopeNote } from '../lib/pulseReportPages';
import { insightView } from './summaryModel';

const tones = ['positive', 'neutral', 'negative'];
const stances = ['supports', 'opposes', 'unclear'];
const stanceColor = { supports: sentimentColor.positive, opposes: sentimentColor.negative, unclear: sentimentColor.neutral };
const platformName = platform => (platform === 'unknown' || !platform ? 'Lainnya' : platformLabel(platform));
const shortDay = date => pulseDay(date).replace(/\s+\d{4}$/, '');
const percent = (value, whole) => (whole > 0 ? Math.round(value / whole * 100) : 0);

/** The letters shown when an account has no picture. They sit under the avatar, so they also show in a PDF whose
 * renderer could not embed the picture and had to leave it out. */
function initials(name) {
  const words = String(name || '').trim().replace(/^@/, '').split(/[\s._-]+/).filter(Boolean);
  return words.length > 1 ? words.slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase() : Array.from(words[0] || '?').slice(0, 2).join('').toUpperCase();
}
function Face({ author, platform, size = 'sm' }) {
  return <span className="rp-face" data-size={size} data-initials={initials(author)}><AccountAvatar author={author} platform={platform} size={size} /></span>;
}

function BrandMark({ brand }) {
  if (brand.logo) return <img className="rp-brand" src={brand.logo} alt={brand.organisation ? `Logo ${brand.organisation}` : 'Logo'} />;
  return <span className="rp-brand"><PulseLogo height={20} title="PULSE" /></span>;
}

/** One A4 sheet: the period and the brand mark on top, the project and the page number at the bottom. */
function Sheet({ page, frame, title, lede, cover = false, children }) {
  return <article className={cover ? 'rp-page rp-page-cover' : 'rp-page'} data-section={page.key} aria-label={`Halaman ${page.number} dari ${page.total}: ${page.title}`}>
    <header className="rp-head"><span className="rp-pill">{frame.period}</span><BrandMark brand={frame.brand} /></header>
    <div className="rp-body">
      {title && <div className="rp-title"><h2>{title}</h2>{lede && <p>{lede}</p>}</div>}
      {children}
    </div>
    <footer className="rp-foot"><span className="rp-foot-name"><strong>{frame.report.topic.label}</strong><span>Laporan PULSE</span></span><span className="rp-folio">{page.number} / {page.total}</span></footer>
  </article>;
}
const Empty = ({ children }) => <p className="rp-empty">{children}</p>;

/** A key that names every colour. `value` is a count, `share` a whole percentage; either may be left out. A tone's share
 * is printed from `shareText` (tone_share_v2: of every post, "belum dianalisis" included), where a sliver reads "<1%". */
function Legend({ items, label = 'Keterangan warna' }) {
  return <ul className="rp-legend" aria-label={label}>{items.map(item => <li key={item.key}>
    <i className="rp-swatch" data-hatch={item.hatch ? '' : undefined} style={item.hatch ? undefined : { '--seg': item.color }} aria-hidden="true" />
    <span>{item.label}</span>{item.value != null && <b>{formatCount(item.value)}</b>}{item.share != null && <em>{item.shareText ?? `${item.share}%`}</em>}
  </li>)}</ul>;
}
/** Parts of one whole on a single bar. `label` says in words what the bar shows, for a reader who cannot see it. */
function Bar({ parts, label, slim = false }) {
  return <div className={slim ? 'rp-bar rp-bar-slim' : 'rp-bar'} role="img" aria-label={label}>
    {parts.filter(part => part.value > 0).map(part => <span key={part.key} data-hatch={part.hatch ? '' : undefined} style={part.hatch ? { flexGrow: part.value } : { flexGrow: part.value, '--seg': part.color }} />)}
  </div>;
}
// tone_share_v2: the report has no switch, so "belum dianalisis" is always drawn and said as the fourth part of the 100.
const toneParts = counts => [...tones.map(key => ({ key, label: sentimentLabels[key], value: counts[key], color: sentimentColor[key] })),
  { key: 'unknown', label: sentimentLabels.unknown, value: counts.unknown, hatch: true }];
const toneWords = (counts, text) => tones.map(key => `${sentimentLabels[key]} ${text[key]}`).join(', ') + (counts.unknown ? `, ${sentimentLabels.unknown} ${text.unknown}` : '');
// A chart's legend names every colour it can draw (`always`); a voice's legend lists "belum dianalisis" only when it has posts.
const toneLegend = (counts, shares, text, always = false) => [...tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key], value: counts[key], share: shares?.[key], shareText: text?.[key] })),
  ...(counts.unknown || always ? [{ key: 'unknown', label: sentimentLabels.unknown, hatch: true, value: counts.unknown, share: shares?.unknown, shareText: text?.unknown }] : [])];
const baseNote = (total, unknown) => `Persentase dari ${formatCount(total)} posting, ${unknown ? `termasuk ${formatCount(unknown)} yang belum dianalisis` : 'semuanya sudah dianalisis'}.`;

function CoverPage({ page, frame }) {
  const { report, brand, data } = frame;
  const observed = data.platforms.map(row => platformName(row.platform));
  const platforms = report.selectedPlatforms === null
    ? `Semua platform${observed.length ? ': ' + observed.join(', ') : ''}`
    : report.selectedPlatforms.length ? report.selectedPlatforms.map(platformName).join(', ') : 'Tidak ada platform dipilih';
  return <Sheet page={page} frame={frame} cover>
    <div className="rp-cover-main">
      <p className="rp-eyebrow">Laporan pemantauan percakapan</p>
      <h2 className="rp-cover-title">{report.topic.label}</h2>
      <dl className="rp-facts">
        <div><dt>Periode</dt><dd>{frame.period}{!frame.chosenPeriod && data.total > 0 ? ' (seluruh data tersimpan)' : ''}</dd></div>
        <div><dt>Platform</dt><dd>{platforms}</dd></div>
        <div><dt>Disusun</dt><dd>{pulseDate(report.generatedAt)}</dd></div>
      </dl>
    </div>
    {(brand.organisation || brand.description) && <div className="rp-cover-org">
      {brand.organisation && <strong>{brand.organisation}</strong>}
      {brand.description && <p>{brand.description}</p>}
    </div>}
  </Sheet>;
}

/** The six figures of Ikhtisar, worked out by `projectKpis` (pulseKpis.js) and written as Ikhtisar writes them: the value,
 * its change and what it is compared with, the meter of a share, and the note under it. */
function Kpis({ kpis = [] }) {
  if (!kpis.length) return null;
  return <dl className="rp-kpis" aria-label="Angka utama">{kpis.map(kpi => {
    const changed = Number.isFinite(kpi.delta), direction = !changed ? null : kpi.delta > 0 ? 'up' : kpi.delta < 0 ? 'down' : 'flat';
    const share = Number.isFinite(kpi.share) ? Math.max(0, Math.min(100, kpi.share)) : null;
    return <div key={kpi.key} data-kpi={kpi.key}><dt>{kpi.label}</dt>
      <dd className="rp-kpi-value"><strong>{typeof kpi.value === 'string' ? kpi.value : formatCount(kpi.value)}</strong>{changed && <span className="rp-kpi-delta" data-direction={direction} data-intent={direction === 'flat' ? 'neutral' : kpi.deltaIntent || 'neutral'}>{deltaText(kpi.delta, kpi.deltaUnit)}</span>}</dd>
      {changed && kpi.deltaNote && <dd className="rp-kpi-compare">{kpi.deltaNote}</dd>}
      {share !== null && <dd className="rp-kpi-share"><span className="rp-meter" aria-hidden="true"><i style={{ width: `${share}%` }} /></span><span>{shareText(share)}{kpi.shareLabel ? ` ${kpi.shareLabel}` : ''}</span></dd>}
      {kpi.note && <dd className="rp-kpi-note">{kpi.note}</dd>}
    </div>;
  })}</dl>;
}

function SummaryPage({ page, frame }) {
  const { data, summary } = frame;
  const sentences = summary ? [] : fallbackSummary(data, { platformName });
  const scopeNote = summary ? summaryScopeNote(summary.scope, frame.report, data.total) : '';
  const lede = summary
    ? `Ringkasan AI, ditulis ${pulseDate(summary.createdAt)}.${scopeNote ? ' ' + scopeNote : ''}`
    : null;
  return <Sheet page={page} frame={frame} title={page.title} lede={lede}>
    {summary ? <div className="rp-brief">{summary.sections.map((section, index) => <section key={index}>
      <h3>{section.title}</h3>
      <div>
        {section.paragraphs.map((text, i) => <p key={i}>{text}</p>)}
        {section.bullets.length > 0 && (section.kind === 'watch'
          ? <ol>{section.bullets.map((text, i) => <li key={i}>{text}</li>)}</ol>
          : <ul>{section.bullets.map((text, i) => <li key={i}>{text}</li>)}</ul>)}
      </div>
    </section>)}</div> : <div className="rp-plain">
      <p>{sentences[0]}</p>
      {sentences.length > 1 && <p>{sentences.slice(1).join(' ')}</p>}
    </div>}
    <Kpis kpis={frame.kpis} />
  </Sheet>;
}

/** A reference to a piece of evidence, as a small number after the words it supports. */
const Ref = ({ number }) => <sup className="rp-ref">{number}</sup>;
/** Text and references in reading order; references side by side share one mark, "1,2", so they never read as "12". */
function InsightParts({ parts }) {
  const out = [];
  parts.forEach((part, index) => {
    if (!part.number) out.push(part.text);
    else if (Array.isArray(out.at(-1))) out.at(-1).push(part.number);
    else out.push([part.number]);
  });
  return out.map((item, index) => (Array.isArray(item) ? <Ref key={index} number={item.join(',')} /> : item));
}
/** The stored AI Insights of the project (written on the AI Insights page or from the builder, never here): the headline,
 * the points with their references, and the evidence they cite, numbered as on the AI Insights page (`insightView`). */
function InsightsPage({ page, frame }) {
  const { insights, report, data } = frame;
  if (frame.archived || !insights) return <Sheet page={page} frame={frame} title={page.title}>
    <Empty>{frame.archived ? 'AI Insights tidak disimpan dalam arsip.' : 'Belum ada AI Insights tersimpan untuk cakupan ini.'}</Empty>
  </Sheet>;
  const view = insightView(insights), scope = insights.scope || {};
  const note = summaryScopeNote(scope, report, data.total, 'AI Insights itu');
  return <Sheet page={page} frame={frame} title={page.title}
    lede={`Ditulis AI pada ${pulseDate(insights.created_at)} dari ${formatCount(scope.posts)} posting${scope.truncated ? ' terbaru' : ''} dan ${formatCount(scope.comments)} komentar.${note ? ' ' + note : ''}`}>
    {view.headline && <p className="rp-insight-headline">{view.headline}</p>}
    {view.insights.length > 0 ? <ol className="rp-insights">{view.insights.map((item, index) => <li className="rp-insight" key={index}>
      <p><strong><InsightParts parts={item.lead} /></strong>{item.body.length > 0 && ' '}<InsightParts parts={item.body} /></p>
    </li>)}</ol> : <Empty>Tidak ada butir insight.</Empty>}
    {view.evidence.length > 0 && <section className="rp-block">
      <h3>Bukti yang dirujuk</h3>
      <ol className="rp-evidence">{view.evidence.map(({ number, source }) => {
        const url = safeSourceUrl(source.url);
        return <li className="rp-evidence-row" key={number}>
          <span className="rp-evidence-no">{number}</span>
          <div>
            <p className="rp-quote-head"><strong>{source.author || 'Nama tidak tersedia'}</strong><span>{source.comment ? 'Komentar · ' : ''}{platformName(source.platform)}{source.published_at ? ` · ${pulseDate(source.published_at)}` : ''}{typeof source.interactions === 'number' ? ` · ${formatCount(source.interactions)} ${source.comment ? 'suka' : 'interaksi'}` : ''}</span>{url && <a className="rp-source" href={url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</a>}</p>
            <p className="rp-evidence-text">{source.text || 'Teks tidak tersedia'}</p>
          </div>
        </li>;
      })}</ol>
    </section>}
  </Sheet>;
}

/** Posts per day (or week), stacked by sentiment, as inline SVG. The largest column carries the accent mark. */
function TrendChart({ trend, marked = new Set() }) {
  const width = 672, height = 310, left = 40, right = 6, top = 34, bottom = 26;
  const ticks = axisTicks(trend.max), ceiling = ticks.at(-1);
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const band = plotWidth / trend.rows.length, bar = Math.max(1, Math.min(36, band * 0.72));
  const y = value => top + plotHeight * (1 - value / ceiling);
  const every = Math.max(1, Math.ceil(trend.rows.length / 8));
  const peakIndex = trend.peak ? trend.rows.indexOf(trend.peak) : -1;
  const peakX = left + band * peakIndex + band / 2;
  const peakAnchor = peakX < left + 70 ? 'start' : peakX > width - right - 70 ? 'end' : 'middle';
  const unit = trend.unit === 'day' ? 'hari' : 'minggu';
  return <svg className="rp-trend" viewBox={`0 0 ${width} ${height}`} role="img"
    aria-label={`Grafik batang jumlah posting per ${unit} dari ${pulseDay(trend.rows[0].date)} sampai ${pulseDay(trend.rows.at(-1).end)}, dibagi menurut sentimen.${trend.peak ? ` Terbanyak ${formatCount(trend.peak.total)} posting pada ${pulseDay(trend.peak.date)}.` : ''}${marked.size ? ` ${marked.size} lonjakan ditandai.` : ''}`}>
    <defs><pattern id="rp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect className="rp-hatch-ground" width="5" height="5" /><line className="rp-hatch-line" x1="1.25" y1="0" x2="1.25" y2="5" /></pattern></defs>
    {ticks.map(tick => <g key={tick}>
      <line className={tick ? 'rp-grid' : 'rp-grid rp-grid-base'} x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} />
      <text className="rp-axis" x={left - 8} y={y(tick)} dy="4" textAnchor="end">{formatCount(tick)}</text>
    </g>)}
    {trend.rows.map((row, index) => {
      const x = left + band * index + (band - bar) / 2;
      let below = 0;
      return <g key={row.date}>
        {sentimentOrder.map(key => {
          const value = row[key];
          if (!value) return null;
          below += value;
          return <rect key={key} x={x} y={y(below)} width={bar} height={plotHeight * value / ceiling}
            fill={key === 'unknown' ? 'url(#rp-hatch)' : undefined} style={key === 'unknown' ? undefined : { fill: sentimentColor[key] }} />;
        })}
        {index % every === 0 && <text className="rp-axis" x={x + bar / 2} y={height - 8} textAnchor="middle">{shortDay(row.date)}</text>}
      </g>;
    })}
    {/* A spike (spike_v1, the server's answer) is a small triangle over its column; the peak keeps its label above it. */}
    {trend.rows.map((row, index) => {
      if (!marked.has(row.key)) return null;
      const x = left + band * index + band / 2, top = y(row.total) - 3;
      return <path key={row.key} className="rp-spike-mark" d={`M${x - 4} ${top - 7}L${x + 4} ${top - 7}L${x} ${top}Z`} />;
    })}
    {trend.peak && <g>
      {!marked.has(trend.peak.key) && <line className="rp-peak-mark" x1={peakX - bar / 2} x2={peakX + bar / 2} y1={y(trend.peak.total) - 5} y2={y(trend.peak.total) - 5} />}
      <text className="rp-peak" x={peakX} y={y(trend.peak.total) - (marked.has(trend.peak.key) ? 15 : 13)} textAnchor={peakAnchor}>Teramai: {formatCount(trend.peak.total)} posting, {shortDay(trend.peak.date)}</text>
    </g>}
  </svg>;
}

const spikeEmpty = { answered: 'Tidak ada lonjakan pada periode ini.', failed: 'Lonjakan belum dapat diperiksa.' };
/** The spikes of the drawn series as rows of the "Lonjakan" table, oldest first: which bucket, which line, and the first
 * sentence the trend chart writes for it (`spikeLines`). Which buckets are spikes is only the server's answer
 * (spike_v1, through `useTrendSpikes`); a spike outside the drawn buckets is left out. */
function spikeRows(spikes, trend, posts) {
  const status = spikes?.status || 'waiting', byKey = new Map(trend.rows.map(row => [row.key, row])), rows = [];
  for (const line of ['posts', 'interactions']) for (const spike of spikes?.[line] || []) {
    const bucket = byKey.get(spike.key);
    const [text] = bucket ? spikeLines(spikeFacts(posts, bucket), spike, line, { unit: trend.unit, platformName }) : [];
    if (text) rows.push({ key: spike.key, line, label: bucketLabel(bucket, trend.unit), text });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key) || (a.line === 'posts' ? -1 : 1));
  return { rows, empty: spikeEmpty[status] || 'Lonjakan sedang diperiksa…' };
}

function TrendPage({ page, frame }) {
  const { data, report } = frame, { trend } = data;
  if (!trend.rows.length) return <Sheet page={page} frame={frame} title={page.title}>
    <Empty>{data.total ? 'Tidak ada tanggal terbit.' : 'Belum ada posting.'}</Empty>
  </Sheet>;
  const spikes = spikeRows(frame.spikes, trend, report.posts);
  const busiest = [...report.days].sort((a, b) => b.total - a.total || a.date.localeCompare(b.date)).slice(0, spikes.rows.length ? 3 : 5);
  return <Sheet page={page} frame={frame} title={page.title}
    lede={`Posting per ${trend.unit === 'day' ? 'hari' : 'minggu'} menurut tanggal terbit (${zone().name}).`}>
    <TrendChart trend={trend} marked={new Set(spikes.rows.filter(row => row.line === 'posts').map(row => row.key))} />
    <Legend label="Keterangan warna grafik" items={toneLegend(data.counts, data.shares, data.shareText, true)} />
    <p className="rp-note">{baseNote(data.total, data.unknown)}{data.undated > 0 ? ` ${formatCount(data.undated)} posting tanpa tanggal tidak masuk grafik.` : ''}</p>
    <section className="rp-block">
      <h3>Hari paling ramai</h3>
      <table className="rp-table">
        <thead><tr><th scope="col">Tanggal</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-cell-bar">Komposisi posting hari itu</th>{sentimentOrder.map(key => <th scope="col" className="rp-num" key={key}>{sentimentLabels[key]}</th>)}</tr></thead>
        <tbody>{busiest.map(day => <tr key={day.date}>
          <th scope="row">{pulseDay(day.date)}</th>
          <td className="rp-num"><strong>{formatCount(day.total)}</strong></td>
          <td className="rp-cell-bar"><Bar slim label={sentimentOrder.map(key => `${sentimentLabels[key]} ${formatCount(day[key])}`).join(', ')} parts={toneParts(day)} /></td>
          {sentimentOrder.map(key => <td className="rp-num" key={key}>{formatCount(day[key])}</td>)}
        </tr>)}</tbody>
      </table>
    </section>
    <section className="rp-block">
      <h3>Lonjakan</h3>
      {spikes.rows.length ? <table className="rp-table rp-table-tight rp-spikes">
        <thead><tr><th scope="col">{trend.unit === 'day' ? 'Tanggal' : 'Minggu'}</th><th scope="col">Ukuran</th><th scope="col">Keterangan</th></tr></thead>
        <tbody>{spikes.rows.map(row => <tr key={row.line + row.key}><th scope="row">{row.label}</th><td>{row.line === 'posts' ? 'Posting' : 'Interaksi'}</td><td>{row.text}</td></tr>)}</tbody>
      </table> : <p className="rp-note">{spikes.empty}</p>}
      {spikes.rows.length > 0 && <p className="rp-note">Ditandai dengan aturan lonjakan yang sama dengan grafik tren di Ikhtisar.</p>}
    </section>
  </Sheet>;
}

function Voice({ title, voice, none }) {
  const neutral = voice.counts.neutral, kinds = kindOrder.filter(key => voice.kinds[key] > 0), kindShare = shares(voice.kinds, kindOrder);
  return <section className="rp-voice">
    <h3>{title}</h3>
    {!voice.total ? <Empty>{none}</Empty> : <>
      <p className="rp-sub">{formatCount(voice.total)} posting, {voice.unknown ? `${formatCount(voice.analysed)} sudah dianalisis` : 'semuanya sudah dianalisis'}</p>
      {!voice.lead ? <Empty>Belum ada posting yang dianalisis.</Empty> : <>
        <p className="rp-leading"><strong>{voice.shareText[voice.lead]}</strong><span>{sentimentLabels[voice.lead].toLowerCase()}, bagian terbesar dari {formatCount(voice.total)} posting</span></p>
        <Bar label={`${title}: ${toneWords(voice.counts, voice.shareText)}`} parts={toneParts(voice.counts)} />
        <Legend label={`Keterangan warna ${title.toLowerCase()}`} items={toneLegend(voice.counts, voice.shares, voice.shareText)} />
        {voice.unknown > 0 && <p className="rp-note">{baseNote(voice.total, voice.unknown)}</p>}
        {neutral > 0 && <div className="rp-kinds">
          <h4>Netral terdiri dari</h4>
          <ul>{kinds.map(key => <li key={key}><span>{kindLabels[key]}</span><b>{formatCount(voice.kinds[key])}</b><em>{kindShare[key]}%</em></li>)}</ul>
          <p className="rp-note">Persentase dari {formatCount(neutral)} posting netral.</p>
        </div>}
      </>}
    </>}
  </section>;
}

function VoicesPage({ page, frame }) {
  const { data } = frame;
  if (!data.total) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada posting.</Empty></Sheet>;
  return <Sheet page={page} frame={frame} title={page.title}
    >
    <div className="rp-pair">
      <Voice title="Posting warganet" voice={data.voices.public} none="Tidak ada posting dari media sosial pada periode ini." />
      <Voice title="Pemberitaan" voice={data.voices.news} none="Tidak ada berita pada periode ini." />
    </div>
    <section className="rp-block">
      <h3>Nada per platform</h3>
      <table className="rp-table">
        <thead><tr><th scope="col">Platform</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-cell-bar">Bagian dari total posting</th>{sentimentOrder.map(key => <th scope="col" className="rp-num" key={key}>{key === 'unknown' ? 'Belum' : sentimentLabels[key]}</th>)}</tr></thead>
        <tbody>{data.platforms.map(row => <tr key={row.platform}>
          <th scope="row"><span className="rp-platform"><PlatformIcon platform={row.platform} size={14} />{platformName(row.platform)}</span></th>
          <td className="rp-num">{formatCount(row.total)}</td>
          <td className="rp-cell-bar"><Bar slim label={`${platformName(row.platform)}: ${toneWords(row.counts, row.shareText)}`} parts={toneParts(row.counts)} /></td>
          {sentimentOrder.map(key => <td className="rp-num" key={key}>{row.shareText[key]}</td>)}
        </tr>)}</tbody>
      </table>
      <Legend items={[...tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key] })), { key: 'unknown', label: `${sentimentLabels.unknown} (Belum)`, hatch: true }]} />
    </section>
  </Sheet>;
}

function OpinionPage({ page, frame }) {
  const opinion = frame.data.opinion;
  if (!opinion.total) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada komentar tersimpan untuk posting pada periode ini.</Empty></Sheet>;
  const covered = percent(opinion.analysed, opinion.total);
  // The largest stance; a tie goes to the reading that needs a look first, as with sentiment.
  const stanceLead = ['opposes', 'unclear', 'supports'].reduce((best, key) => (opinion.stance[key] > opinion.stance[best] ? key : best), 'opposes');
  return <Sheet page={page} frame={frame} title={page.title}
    lede={`${formatCount(opinion.analysed)} dari ${formatCount(opinion.total)} komentar dianalisis.`}>
    <div className="rp-coverage" role="img" aria-label={`${covered}% komentar tersimpan sudah dianalisis`}>
      <span className="rp-meter"><i style={{ width: `${opinion.analysed / opinion.total * 100}%` }} /></span>
      <span><strong>{covered < 1 && opinion.analysed > 0 ? 'kurang dari 1' : covered}%</strong> komentar tersimpan sudah dianalisis</span>
    </div>
    {opinion.analysed > 0 ? <div className="rp-pair">
      <section className="rp-voice">
        <h3>Sentimen komentar</h3>
        <p className="rp-leading"><strong>{opinion.shareText[opinion.lead]}</strong><span>{sentimentLabels[opinion.lead].toLowerCase()}, bagian terbesar dari {formatCount(opinion.analysed)} komentar</span></p>
        <Bar label={`Sentimen komentar: ${toneWords({ ...opinion.counts, unknown: 0 }, opinion.shareText)}`} parts={toneParts({ ...opinion.counts, unknown: 0 })} />
        <Legend label="Keterangan warna sentimen komentar" items={tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key], value: opinion.counts[key], share: opinion.shares[key], shareText: opinion.shareText[key] }))} />
      </section>
      <section className="rp-voice">
        <h3>Sikap terhadap isu</h3>
        {opinion.stanceRead > 0 ? <>
          <p className="rp-leading"><strong>{opinion.stanceShares[stanceLead]}%</strong><span>{stanceLabels[stanceLead].toLowerCase()}, bagian terbesar dari {formatCount(opinion.stanceRead)} komentar yang sikapnya terbaca</span></p>
          <Bar label={`Sikap komentar: ${stances.map(key => `${stanceLabels[key]} ${opinion.stanceShares[key]}%`).join(', ')}`} parts={stances.map(key => ({ key, value: opinion.stance[key], color: stanceColor[key] }))} />
          <Legend label="Keterangan warna sikap" items={stances.map(key => ({ key, label: stanceLabels[key], color: stanceColor[key], value: opinion.stance[key], share: opinion.stanceShares[key] }))} />
          {opinion.target && <p className="rp-note">Isu yang dinilai: {opinion.target}.</p>}
        </> :<Empty>Sikap belum terbaca.</Empty>}
      </section>
    </div> : <Empty>{opinion.loaded ? 'Belum ada komentar yang dianalisis.' : 'Hasil analisis komentar belum termuat saat laporan disusun.'}</Empty>}
    {opinion.liked.length > 0 && <section className="rp-block">
      <h3>Komentar paling disukai</h3>
      <ul className="rp-quotes">{opinion.liked.map(comment => <li key={comment.id}>
        <Face author={comment.author} platform={comment.post?.platform} size="sm" />
        <div>
          <p className="rp-quote-head"><strong>{comment.author || 'Nama tidak tersedia'}</strong><span>{comment.post?.author ? `pada posting ${comment.post.author}` : platformName(comment.post?.platform)}</span></p>
          <p className="rp-quote-text">{comment.text}</p>
          <p className="rp-quote-foot">
            <span className="rp-likes">{Number.isFinite(comment.likes) ? `${formatCount(comment.likes)} suka` : 'Jumlah suka tidak tersedia'}</span>
            <SentimentTag size="sm" value={comment.sentiment?.label || 'unknown'} />
            {comment.stance && <PulseTag size="sm" variant="outline">{stanceLabels[comment.stance.label]}</PulseTag>}
          </p>
        </div>
      </li>)}</ul>
    </section>}
  </Sheet>;
}

function SourcesPage({ page, frame }) {
  const { data, report } = frame;
  if (!data.total) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada posting.</Empty></Sheet>;
  // The sheet has a fixed height: with more than five platforms the accounts table gives up a row for each extra one.
  const accounts = report.accounts.slice(0, accountRowsThatFit(data.platforms.length, { concentration: data.concentration?.topAccountShare != null }));
  const accountsTitle = accounts.length === 10 ? 'Sepuluh akun dengan interaksi terbanyak' : accounts.length < report.accounts.length ? `${formatCount(accounts.length)} akun dengan interaksi terbanyak` : 'Akun dengan interaksi terbanyak';
  return <Sheet page={page} frame={frame} title={page.title}>
    <section className="rp-block rp-block-first">
      <h3>Posting per platform</h3>
      <table className="rp-table">
        <thead><tr><th scope="col">Platform</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-num">Bagian</th><th scope="col" className="rp-cell-bar">Bagian dari {formatCount(data.total)} posting</th></tr></thead>
        <tbody>{data.platforms.map(row => <tr key={row.platform}>
          <th scope="row"><span className="rp-platform"><PlatformIcon platform={row.platform} size={14} />{platformName(row.platform)}</span></th>
          <td className="rp-num"><strong>{formatCount(row.total)}</strong></td>
          <td className="rp-num">{row.share}%</td>
          <td className="rp-cell-bar"><span className="rp-meter" role="img" aria-label={`${row.share}% dari seluruh posting`}><i style={{ width: `${row.total / data.total * 100}%` }} /></span></td>
        </tr>)}</tbody>
      </table>
    </section>
    <section className="rp-block">
      <h3>{accountsTitle}</h3>
      {accounts.length ? <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col" className="rp-cell-rank">No.</th><th scope="col">Akun atau sumber</th><th scope="col">Platform</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-num">Interaksi</th></tr></thead>
        <tbody>{accounts.map((account, index) => <tr key={account.key ?? index}>
          <td className="rp-cell-rank">{index + 1}</td>
          <th scope="row"><span className="rp-account"><Face author={account.author} platform={account.platform} size="sm" /><span>{account.author || 'Nama tidak tersedia'}</span></span></th>
          <td>{platformName(account.platform)}</td>
          <td className="rp-num">{formatCount(account.mentions)}</td>
          <td className="rp-num"><strong>{formatCount(account.engagement)}</strong>{account.engagement != null && account.interaction_posts != null && <small className="rp-count">{`dari ${formatCount(account.interaction_posts)} posting`}</small>}</td>
        </tr>)}</tbody>
      </table> : <Empty>Posting pada periode ini tidak membawa nama akun.</Empty>}
      <p className="rp-note">“—” berarti angka tidak tersedia.</p>
    </section>
    <Concentration reading={data.concentration} />
  </Sheet>;
}

/** concentration_v1 in two sentences, as Akun & sumber writes them: the share of the three most active accounts, and how
 * many accounts it takes to reach 80% of the posts. It says nothing about intent. */
function Concentration({ reading }) {
  if (reading?.topAccountShare == null) return null;
  const reach = reading.reading.posts.reach80;
  return <section className="rp-block rp-concentration">
    <h3>Konsentrasi akun</h3>
    <p><strong>{percentLabel(reading.topAccountShare)}</strong> posting berasal dari 3 akun teratas, dari {formatCount(reading.accounts)} akun.{reach ? ` ${formatCount(reach.accounts)} dari ${formatCount(reading.accounts)} akun (${concentrationShareText(reach.account_share)}) menulis 80% posting.` : ''}</p>
    <p className="rp-note">Konsentrasi bukan bukti koordinasi.</p>
  </section>;
}

/** Where the conversation is named: the provinces in the posts' own words, drawn and listed, then the provinces X
 * accounts name on their profile. Neither is where a post was written, and the page says so twice. */
function PlacesPage({ page, frame }) {
  const { places } = frame.data, accounts = places.accounts;
  const lede = null;
  if (!places.named) return <Sheet page={page} frame={frame} title={page.title} lede={lede}><Empty>Belum ada tempat yang disebut.</Empty></Sheet>;
  const top = places.rows.slice(0, 3).map(row => `${row.name} ${formatCount(row.count)}`).join(', ');
  return <Sheet page={page} frame={frame} title={page.title} lede={lede}>
    <section className="rp-block rp-block-first">
      <figure className="rp-map">
        <RegionMiniMap rows={places.map} label={`Peta Indonesia: ${places.provinces} dari 34 provinsi disebut. Terbanyak: ${top}.`} />
      </figure>
    </section>
    <section className="rp-block">
      <h3>{places.provinces > places.rows.length ? `${formatCount(places.rows.length)} dari ${formatCount(places.provinces)} provinsi yang paling sering disebut` : 'Provinsi yang disebut'}</h3>
      <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col" className="rp-cell-rank">No.</th><th scope="col">Provinsi</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-num">Bagian</th><th scope="col">Nama yang disebut</th></tr></thead>
        <tbody>{places.rows.map((row, index) => <tr key={row.code}><td className="rp-cell-rank">{index + 1}</td><th scope="row">{row.name}</th><td className="rp-num"><strong>{formatCount(row.count)}</strong></td><td className="rp-num">{row.share}%</td><td>{row.names}</td></tr>)}</tbody>
      </table>
      <p className="rp-note">{formatCount(places.named)} dari {formatCount(places.total)} posting menyebut tempat. Peta dasar © OpenStreetMap/geoBoundaries (ODbL).</p>
    </section>
    <section className="rp-block">
      <h3>Akun X menurut lokasi di profilnya</h3>
      {accounts.rows.length ? <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col">Provinsi</th><th scope="col" className="rp-num">Akun</th><th scope="col">Lokasi yang ditulis</th></tr></thead>
        <tbody>{accounts.rows.map(row => <tr key={row.code}><th scope="row">{row.name}</th><td className="rp-num"><strong>{formatCount(row.count)}</strong></td><td>{row.names}</td></tr>)}</tbody>
      </table> : <Empty>{!accounts.total ? 'Tidak ada akun X pada periode ini.' : accounts.unasked === accounts.total ? 'Lokasi profil akun X pada periode ini belum diperiksa.' : 'Belum ada lokasi profil.'}</Empty>}
      {accounts.total > 0 && <p className="rp-note">{formatCount(accounts.named)} dari {formatCount(accounts.total)} akun X menulis lokasi yang bisa dipetakan{accounts.unasked > 0 ? `; ${formatCount(accounts.unasked)} akun belum diperiksa` : ''}</p>}
    </section>
  </Sheet>;
}

const metricNames = { x: { comments: 'Balasan', shares: 'Repost' }, threads: { comments: 'Balasan', shares: 'Repost' } };
function Metrics({ metrics, platform }) {
  const names = { likes: 'Suka', comments: 'Komentar', shares: 'Bagikan', views: 'Tayangan', ...metricNames[platform] };
  return <dl className="rp-metrics">
    <div className="rp-metrics-total"><dt>Interaksi</dt><dd>{formatCount(postInteractions(metrics))}</dd></div>
    {Object.entries(names).map(([key, name]) => <div key={key}><dt>{name}</dt><dd>{formatCount(metrics?.[key])}</dd></div>)}
    <PulseRepostNote metrics={metrics} />
  </dl>;
}

function PostsPage({ page, frame }) {
  const { data } = frame, shown = Math.min(maxTopPosts, frame.report.topPosts.length);
  if (!page.posts.length) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada posting.</Empty></Sheet>;
  return <Sheet page={page} frame={frame} title={page.title}
    lede={page.part === 1 ? `${formatCount(shown)} posting dengan interaksi terbanyak dari ${formatCount(data.total)} posting pada periode ini.` : `Peringkat ${page.rank} sampai ${page.rank + page.posts.length - 1}.`}>
    <ol className="rp-posts">{page.posts.map((post, index) => {
      const url = safeSourceUrl(post.url), text = sourceText(post), headline = post.title && post.text ? sourceText({ text: post.title }) : '';
      return <li key={post.id}>
        <span className="rp-rank">{page.rank + index}</span>
        <div className="rp-post">
          <div className="rp-post-head">
            <Face author={post.author} platform={post.platform} size="md" />
            <p><strong>{post.author || 'Nama tidak tersedia'}</strong><span>{platformName(post.platform)} · {pulseDate(post.published_at)}</span>{url && <a className="rp-source" href={url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</a>}</p>
            <SentimentTag value={postSentiment(post)} />
          </div>
          {headline && <p className="rp-post-title">{headline}</p>}
          <p className={headline ? 'rp-post-text rp-post-text-short' : 'rp-post-text'}>{text || 'Teks tidak tersedia'}</p>
          <Metrics metrics={post.metrics} platform={post.platform} />
        </div>
      </li>;
    })}</ol>
  </Sheet>;
}

function NarrativesPage({ page, frame }) {
  const { groups } = frame.data;
  if (!groups.rows.length) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada konten berulang.</Empty></Sheet>;
  return <Sheet page={page} frame={frame} title={page.title}
    lede={`${groups.rows.length < groups.total ? `${formatCount(groups.rows.length)} kelompok terbesar dari ${formatCount(groups.total)}` : `${formatCount(groups.total)}`} kelompok.`}>
    <ol className="rp-groups">{groups.rows.map((group, index) => <li key={group.id}>
      <span className="rp-rank">{index + 1}</span>
      <div>
        <p className="rp-group-text">{group.title}</p>
        <dl className="rp-group-facts">
          <div><dt>Posting</dt><dd>{formatCount(group.posts)}</dd></div>
          <div><dt>Akun</dt><dd><span className="rp-faces" aria-hidden="true">{group.faces.slice(0, 4).map((face, index) => <Face key={face.key ?? index} author={face.author} platform={face.platform} size="xs" />)}</span>{formatCount(group.accounts)}</dd></div>
          <div><dt>Rentang tanggal</dt><dd>{group.range || '—'}</dd></div>
          <div><dt>Dibagikan</dt><dd>{group.shares == null ? '—' : `${formatCount(group.shares)}×`}</dd></div>
          <div><dt>Interaksi</dt><dd>{formatCount(group.interactions)}</dd></div>
        </dl>
      </div>
    </li>)}</ol>
    <p className="rp-note">“Dibagikan” tidak ditambahkan ke interaksi. “—” berarti angka tidak tersedia.</p>
  </Sheet>;
}

const coverageColumns = ['analysed', 'measured', 'clocked'];
const coverageNotes = { observed: 'Data tersimpan, bukan seluruh isi platform', empty: 'Tidak ada data pada periode ini', excluded: 'Tidak dipilih untuk laporan ini' };
function MethodPage({ page, frame }) {
  const { report, data, summary } = frame;
  const cover = data.completeness, byPlatform = new Map(cover.platforms.map(row => [row.platform, row]));
  // Platforms without a single post in the period are named on one line under the table: the sheet has a fixed height.
  const listed = report.sourceCoverage.filter(row => row.platform !== 'unknown' || row.count > 0);
  const rows = listed.filter(row => row.count > 0), empty = listed.filter(row => !row.count);
  const opinion = data.opinion;
  return <Sheet page={page} frame={frame} title={page.title} >
    <dl className="rp-facts rp-facts-wide">
      <div><dt>Project</dt><dd>{report.topic.label}</dd></div>
      <div><dt>Kata kunci</dt><dd className="rp-clamp" title={report.topic.query || undefined}>{report.topic.query || 'Tidak tersedia'}</dd></div>
      <div><dt>Periode</dt><dd>{frame.period}{!frame.chosenPeriod && data.total > 0 ? ' (seluruh data tersimpan)' : ''}, tanggal terbit dalam {zone().name}</dd></div>
      <div><dt>Disusun</dt><dd>{pulseDate(report.generatedAt)}</dd></div>
    </dl>
    <section className="rp-block rp-block-tight">
      <h3>Cakupan per platform</h3>
      {/* coverage_v1: the level and the share that set it, then the shares per platform, as the project bar's badge reads them. */}
      {cover.level && <p className="rp-coverage-says"><b>{coverageLevels[cover.level][0]}</b>: {coverageShares[cover.lowest][2]} {coveragePercent(cover[cover.lowest])} posting.</p>}
      <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col">Platform</th><th scope="col" className="rp-num">Posting</th>{coverageColumns.map(key => <th scope="col" className="rp-num" key={key}>{coverageShares[key][0]}</th>)}<th scope="col">Keterangan</th></tr></thead>
        <tbody>{rows.map(row => {
          const shares = byPlatform.get(row.platform);
          return <tr key={row.platform}>
            <th scope="row"><span className="rp-platform"><PlatformIcon platform={row.platform} size={14} />{platformName(row.platform)}</span></th>
            <td className="rp-num">{formatCount(row.count)}</td>
            {coverageColumns.map(key => <td className="rp-num" key={key}>{shares ? coveragePercent(shares[key]) : '—'}</td>)}
            <td>{coverageNotes[row.status]}</td>
          </tr>;
        })}</tbody>
        <tfoot><tr>
          <th scope="row">Seluruh laporan</th>
          <td className="rp-num">{formatCount(data.total)}</td>
          {coverageColumns.map(key => <td className="rp-num" key={key}>{cover.total ? coveragePercent(cover[key]) : '—'}</td>)}
          <td>{data.unknown > 0 ? `${formatCount(data.unknown)} posting belum dianalisis` : data.total ? 'Semua posting sudah dianalisis' : 'Tidak ada posting pada periode ini'}</td>
        </tr></tfoot>
      </table>
      {empty.length > 0 && <p className="rp-note">Tidak ada posting pada periode ini dari: {empty.map(row => platformName(row.platform)).join(', ')}.</p>}
      {opinion.total > 0 && <div className="rp-coverage rp-coverage-inline" role="img" aria-label={`${percent(opinion.analysed, opinion.total)}% komentar tersimpan sudah dianalisis`}>
        <span className="rp-meter"><i style={{ width: `${opinion.analysed / opinion.total * 100}%` }} /></span>
        <span>Komentar: <strong>{formatCount(opinion.analysed)}</strong> dari {formatCount(opinion.total)} yang tersimpan sudah dianalisis ({percent(opinion.analysed, opinion.total)}%)</span>
      </div>}
    </section>
    <section className="rp-block rp-block-tight">
      <h3>Batasan</h3>
      <ul className="rp-limits">
        <li>Hanya posting tersimpan di PULSE, bukan seluruh percakapan platform.</li>
        <li>Sentimen menilai nada teks, bukan dukungan politik.</li>
        <li>Yang belum dianalisis tidak dihitung netral; persentase sentimen dari total posting.</li>
        <li>Tayangan bukan jumlah orang; tidak ada perkiraan jangkauan.</li>
        <li>“—” berarti angka tidak tersedia.</li>
        {(summary || frame.printsInsights) && <li>{summary && frame.printsInsights ? 'Ringkasan dan insight' : summary ? 'Ringkasan' : 'Insight'} ditulis AI; periksa buktinya sebelum dikutip.</li>}
        <li>Kebenaran klaim tidak diperiksa.</li>
      </ul>
    </section>
  </Sheet>;
}

const pageComponents = { cover: CoverPage, summary: SummaryPage, insights: InsightsPage, trend: TrendPage, voices: VoicesPage, opinion: OpinionPage, sources: SourcesPage, places: PlacesPage, posts: PostsPage, narratives: NarrativesPage, method: MethodPage };

/** The pages, and nothing else, inside the element `rootRef` points at: that element is what gets printed.
 * @param {{rootRef: import('react').Ref<HTMLDivElement>, report: object, pages: object[], data: object, summary: object|null,
 *   insights?: object|null, archived?: boolean, kpis?: ReturnType<typeof import('../lib/pulseKpis').projectKpis>, spikes?: ReturnType<typeof import('./useTrendSpikes').default>|null, brand: {logo: string|null, accent: string|null, organisation: string, description: string}}} props */
export default function ReportPages({ rootRef, report, pages, data, summary, brand, kpis = [], spikes = null, insights = null, archived = false }) {
  const frame = { report, data, summary, brand, kpis, spikes, insights, archived, printsInsights: !archived && Boolean(insights) && pages.some(page => page.key === 'insights'), period: periodLabel(report.period, report.days), chosenPeriod: Boolean(report.period?.from || report.period?.to) };
  return <ProjectPostsContext.Provider value={report.posts}>
    <div className="rp-doc pr-document" ref={rootRef} style={brand.accent ? { '--rp-accent': brand.accent } : undefined}>
      {pages.map(page => {
        const Page = pageComponents[page.key];
        return <Page key={page.id} page={page} frame={frame} />;
      })}
    </div>
  </ProjectPostsContext.Provider>;
}
