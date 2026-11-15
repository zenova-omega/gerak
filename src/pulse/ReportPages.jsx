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
import { formatCount, pulseDate, pulseDay, safeSourceUrl } from '../lib/pulseData';
import { zone } from '../lib/pulseMeasures';
import { sentimentColor, sentimentOrder } from '../lib/pulseChartTheme';
import { postSentiment, sentimentLabels } from '../lib/pulsePostFilters';
import { postInteractions } from '../lib/pulseEngagement';
import { kindLabels, kindOrder, shares } from '../lib/pulseVoice';
import { stanceLabels } from '../lib/pulseResponse';
import { sourceText } from '../lib/pulseOverview';
import { accountRowsThatFit, axisTicks, fallbackSummary, maxTopPosts, periodLabel, summaryScopeNote } from '../lib/pulseReportPages';

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
 * is printed from `shareText` (tone_share_v1), where a sliver reads "<1%". */
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
const toneParts = counts => tones.map(key => ({ key, label: sentimentLabels[key], value: counts[key], color: sentimentColor[key] }));
const toneWords = (counts, text) => tones.map(key => `${sentimentLabels[key]} ${text[key]}`).join(', ') + (counts.unknown ? `, ${formatCount(counts.unknown)} belum dianalisis` : '');

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

function SummaryPage({ page, frame }) {
  const { data, summary } = frame;
  const sentences = summary ? [] : fallbackSummary(data, { platformName });
  const scope = summary?.scope || {};
  const lede = summary
    ? `Ringkasan AI, ditulis ${pulseDate(summary.createdAt)}${Number.isFinite(scope.posts) ? ` dari ${formatCount(scope.posts)} posting${Number.isFinite(scope.comments) ? ` dan ${formatCount(scope.comments)} komentar` : ''}` : ''}. ${summaryScopeNote(scope, frame.report, data.total)}`.trim()
    : data.total ? 'Disusun otomatis dari angka dalam laporan ini.' : null;
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
    <dl className="rp-figures" aria-label="Angka utama">
      <div><dt>Posting</dt><dd>{formatCount(data.total)}</dd><dd>{data.total ? `${formatCount(data.days)} hari dengan data, ${formatCount(data.platforms.length)} platform` : 'tidak ada pada periode ini'}</dd></div>
      <div><dt>Akun dan sumber</dt><dd>{formatCount(data.accounts)}</dd><dd>dihitung per platform</dd></div>
      <div><dt>Interaksi</dt><dd>{formatCount(data.interactions)}</dd><dd>{data.interactions == null ? 'tidak ada angka dari sumber' : `suka, komentar, dan bagikan pada ${formatCount(data.interactionPosts)} posting`}</dd></div>
      <div><dt>Komentar dianalisis</dt><dd>{data.opinion.loaded ? formatCount(data.opinion.analysed) : '—'}</dd><dd>{data.opinion.loaded ? `dari ${formatCount(data.opinion.total)} komentar tersimpan` : 'analisis komentar belum termuat'}</dd></div>
    </dl>
  </Sheet>;
}

/** Posts per day (or week), stacked by sentiment, as inline SVG. The largest column carries the accent mark. */
function TrendChart({ trend }) {
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
    aria-label={`Grafik batang jumlah posting per ${unit} dari ${pulseDay(trend.rows[0].date)} sampai ${pulseDay(trend.rows.at(-1).end)}, dibagi menurut sentimen.${trend.peak ? ` Terbanyak ${formatCount(trend.peak.total)} posting pada ${pulseDay(trend.peak.date)}.` : ''}`}>
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
    {trend.peak && <g>
      <line className="rp-peak-mark" x1={peakX - bar / 2} x2={peakX + bar / 2} y1={y(trend.peak.total) - 5} y2={y(trend.peak.total) - 5} />
      <text className="rp-peak" x={peakX} y={y(trend.peak.total) - 13} textAnchor={peakAnchor}>Teramai: {formatCount(trend.peak.total)} posting, {shortDay(trend.peak.date)}</text>
    </g>}
  </svg>;
}

function TrendPage({ page, frame }) {
  const { data, report } = frame, { trend } = data;
  if (!trend.rows.length) return <Sheet page={page} frame={frame} title={page.title}>
    <Empty>{data.total ? 'Posting pada periode ini tidak membawa tanggal terbit, jadi tren belum dapat digambar.' : 'Belum ada posting pada periode ini, jadi tren belum dapat digambar.'}</Empty>
  </Sheet>;
  const busiest = [...report.days].sort((a, b) => b.total - a.total || a.date.localeCompare(b.date)).slice(0, 5);
  return <Sheet page={page} frame={frame} title={page.title}
    lede={`Jumlah posting per ${trend.unit === 'day' ? 'hari' : 'minggu'} menurut tanggal terbit (${zone().name}), dibagi menurut sentimen.`}>
    <TrendChart trend={trend} />
    <Legend label="Keterangan warna grafik" items={[
      ...tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key], value: data.counts[key], share: data.analysed ? data.shares[key] : null, shareText: data.analysed ? data.shareText[key] : null })),
      { key: 'unknown', label: sentimentLabels.unknown, hatch: true, value: data.counts.unknown },
    ]} />
    <p className="rp-note">Persentase dihitung dari {formatCount(data.analysed)} posting yang sudah dianalisis ({data.coverage}% dari {formatCount(data.total)} posting). Posting yang belum dianalisis tidak dianggap netral.{data.undated > 0 ? ` ${formatCount(data.undated)} posting tanpa tanggal terbit tidak masuk grafik.` : ''}</p>
    <section className="rp-block">
      <h3>Hari paling ramai</h3>
      <table className="rp-table">
        <thead><tr><th scope="col">Tanggal</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-cell-bar">Komposisi posting hari itu</th>{sentimentOrder.map(key => <th scope="col" className="rp-num" key={key}>{sentimentLabels[key]}</th>)}</tr></thead>
        <tbody>{busiest.map(day => <tr key={day.date}>
          <th scope="row">{pulseDay(day.date)}</th>
          <td className="rp-num"><strong>{formatCount(day.total)}</strong></td>
          <td className="rp-cell-bar"><Bar slim label={sentimentOrder.map(key => `${sentimentLabels[key]} ${formatCount(day[key])}`).join(', ')} parts={[...toneParts(day), { key: 'unknown', label: sentimentLabels.unknown, value: day.unknown, hatch: true }]} /></td>
          {sentimentOrder.map(key => <td className="rp-num" key={key}>{formatCount(day[key])}</td>)}
        </tr>)}</tbody>
      </table>
    </section>
  </Sheet>;
}

function Voice({ title, voice, none }) {
  const neutral = voice.counts.neutral, kinds = kindOrder.filter(key => voice.kinds[key] > 0), kindShare = shares(voice.kinds, kindOrder);
  return <section className="rp-voice">
    <h3>{title}</h3>
    {!voice.total ? <Empty>{none}</Empty> : <>
      <p className="rp-sub">{formatCount(voice.total)} posting, {voice.unknown ? `${formatCount(voice.analysed)} sudah dianalisis` : 'semuanya sudah dianalisis'}</p>
      {!voice.lead ? <Empty>Belum ada posting yang dianalisis, jadi nadanya belum dapat dibaca.</Empty> : <>
        <p className="rp-leading"><strong>{voice.shareText[voice.lead]}</strong><span>{sentimentLabels[voice.lead].toLowerCase()}, bagian terbesar dari {formatCount(voice.analysed)} posting yang dianalisis</span></p>
        <Bar label={`${title}: ${toneWords(voice.counts, voice.shareText)}`} parts={toneParts(voice.counts)} />
        <Legend label={`Keterangan warna ${title.toLowerCase()}`} items={tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key], value: voice.counts[key], share: voice.shares[key], shareText: voice.shareText[key] }))} />
        {voice.unknown > 0 && <p className="rp-note">{formatCount(voice.unknown)} posting belum dianalisis dan tidak masuk persentase.</p>}
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
  if (!data.total) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada posting pada periode ini, jadi belum ada suara yang dapat dibaca.</Empty></Sheet>;
  return <Sheet page={page} frame={frame} title={page.title}
    lede="Posting warganet dan berita dibaca terpisah. Berita ditulis datar, jadi menggabungkan keduanya membuat percakapan tampak lebih netral daripada kenyataannya.">
    <div className="rp-pair">
      <Voice title="Posting warganet" voice={data.voices.public} none="Tidak ada posting dari media sosial pada periode ini." />
      <Voice title="Pemberitaan" voice={data.voices.news} none="Tidak ada berita pada periode ini." />
    </div>
    <section className="rp-block">
      <h3>Nada per platform</h3>
      <table className="rp-table">
        <thead><tr><th scope="col">Platform</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-num">Dianalisis</th><th scope="col" className="rp-cell-bar">Bagian dari yang dianalisis</th>{tones.map(key => <th scope="col" className="rp-num" key={key}>{sentimentLabels[key]}</th>)}</tr></thead>
        <tbody>{data.platforms.map(row => <tr key={row.platform}>
          <th scope="row"><span className="rp-platform"><PlatformIcon platform={row.platform} size={14} />{platformName(row.platform)}</span></th>
          <td className="rp-num">{formatCount(row.total)}</td>
          <td className="rp-num">{formatCount(row.analysed)}</td>
          <td className="rp-cell-bar">{row.analysed ? <Bar slim label={`${platformName(row.platform)}: ${toneWords(row.counts, row.shareText)}`} parts={toneParts(row.counts)} /> : <span className="rp-muted">belum dianalisis</span>}</td>
          {tones.map(key => <td className="rp-num" key={key}>{row.analysed ? row.shareText[key] : '—'}</td>)}
        </tr>)}</tbody>
      </table>
      <Legend items={tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key] }))} />
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
    lede={`${formatCount(opinion.analysed)} dari ${formatCount(opinion.total)} komentar tersimpan sudah dianalisis${opinion.posts ? `, dari ${formatCount(opinion.posts)} posting` : ''}. Persentase di halaman ini dihitung dari komentar yang sudah dianalisis, bukan dari seluruh komentar.`}>
    <div className="rp-coverage" role="img" aria-label={`${covered}% komentar tersimpan sudah dianalisis`}>
      <span className="rp-meter"><i style={{ width: `${opinion.analysed / opinion.total * 100}%` }} /></span>
      <span><strong>{covered < 1 && opinion.analysed > 0 ? 'kurang dari 1' : covered}%</strong> komentar tersimpan sudah dianalisis</span>
    </div>
    {opinion.analysed > 0 ? <div className="rp-pair">
      <section className="rp-voice">
        <h3>Sentimen komentar</h3>
        <p className="rp-leading"><strong>{opinion.shareText[opinion.lead]}</strong><span>{sentimentLabels[opinion.lead].toLowerCase()}, bagian terbesar dari {formatCount(opinion.analysed)} komentar</span></p>
        <Bar label={`Sentimen komentar: ${toneWords({ ...opinion.counts, unknown: 0 }, opinion.shareText)}`} parts={toneParts(opinion.counts)} />
        <Legend label="Keterangan warna sentimen komentar" items={tones.map(key => ({ key, label: sentimentLabels[key], color: sentimentColor[key], value: opinion.counts[key], share: opinion.shares[key], shareText: opinion.shareText[key] }))} />
      </section>
      <section className="rp-voice">
        <h3>Sikap terhadap isu</h3>
        {opinion.stanceRead > 0 ? <>
          <p className="rp-leading"><strong>{opinion.stanceShares[stanceLead]}%</strong><span>{stanceLabels[stanceLead].toLowerCase()}, bagian terbesar dari {formatCount(opinion.stanceRead)} komentar yang sikapnya terbaca</span></p>
          <Bar label={`Sikap komentar: ${stances.map(key => `${stanceLabels[key]} ${opinion.stanceShares[key]}%`).join(', ')}`} parts={stances.map(key => ({ key, value: opinion.stance[key], color: stanceColor[key] }))} />
          <Legend label="Keterangan warna sikap" items={stances.map(key => ({ key, label: stanceLabels[key], color: stanceColor[key], value: opinion.stance[key], share: opinion.stanceShares[key] }))} />
          {opinion.target && <p className="rp-note">Isu yang dinilai: {opinion.target}.</p>}
        </> :<Empty>Sikap terhadap isu belum terbaca pada komentar yang dianalisis.</Empty>}
      </section>
    </div> : <Empty>{opinion.loaded ? 'Belum ada komentar yang dianalisis, jadi sentimen dan sikap belum dapat dibaca.' : 'Hasil analisis komentar belum termuat saat laporan disusun.'}</Empty>}
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
  if (!data.total) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada posting pada periode ini, jadi belum ada platform atau akun untuk diperingkat.</Empty></Sheet>;
  // The sheet has a fixed height: with more than five platforms the accounts table gives up a row for each extra one.
  const accounts = report.accounts.slice(0, accountRowsThatFit(data.platforms.length));
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
      <p className="rp-note">Interaksi adalah suka, komentar, dan bagikan yang teramati pada posting akun itu dalam periode ini. Bukan jangkauan dan bukan skor pengaruh. “—” berarti angka tidak tersedia, bukan nol.</p>
    </section>
  </Sheet>;
}

/** Where the conversation is named: the provinces in the posts' own words, drawn and listed, then the provinces X
 * accounts name on their profile. Neither is where a post was written, and the page says so twice. */
function PlacesPage({ page, frame }) {
  const { places } = frame.data, accounts = places.accounts;
  const lede = 'Provinsi yang disebut dalam judul dan teks posting. Ini tempat yang dibicarakan, bukan lokasi penulis.';
  if (!places.named) return <Sheet page={page} frame={frame} title={page.title} lede={lede}><Empty>Belum ada posting yang menyebut provinsi, kota atau kabupaten pada periode ini.</Empty></Sheet>;
  const top = places.rows.slice(0, 3).map(row => `${row.name} ${formatCount(row.count)}`).join(', ');
  return <Sheet page={page} frame={frame} title={page.title} lede={lede}>
    <section className="rp-block rp-block-first">
      <figure className="rp-map">
        <RegionMiniMap rows={places.map} label={`Peta Indonesia: ${places.provinces} dari 34 provinsi disebut. Terbanyak: ${top}.`} />
        <figcaption>Makin gelap, makin banyak posting yang menyebut provinsi itu. Lingkaran menunjukkan jumlahnya.</figcaption>
      </figure>
    </section>
    <section className="rp-block">
      <h3>{places.provinces > places.rows.length ? `${formatCount(places.rows.length)} dari ${formatCount(places.provinces)} provinsi yang paling sering disebut` : 'Provinsi yang disebut'}</h3>
      <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col" className="rp-cell-rank">No.</th><th scope="col">Provinsi</th><th scope="col" className="rp-num">Posting</th><th scope="col" className="rp-num">Bagian</th><th scope="col">Nama yang disebut</th></tr></thead>
        <tbody>{places.rows.map((row, index) => <tr key={row.code}><td className="rp-cell-rank">{index + 1}</td><th scope="row">{row.name}</th><td className="rp-num"><strong>{formatCount(row.count)}</strong></td><td className="rp-num">{row.share}%</td><td>{row.names}</td></tr>)}</tbody>
      </table>
      <p className="rp-note">{formatCount(places.named)} dari {formatCount(places.total)} posting menyebut tempat; satu posting bisa menyebut lebih dari satu provinsi. Nama media dan nama akun tidak dihitung. Garis batas 2017, peta dasar © kontributor OpenStreetMap lewat geoBoundaries (ODbL).</p>
    </section>
    <section className="rp-block">
      <h3>Akun X menurut lokasi di profilnya</h3>
      {accounts.rows.length ? <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col">Provinsi</th><th scope="col" className="rp-num">Akun</th><th scope="col">Lokasi yang ditulis</th></tr></thead>
        <tbody>{accounts.rows.map(row => <tr key={row.code}><th scope="row">{row.name}</th><td className="rp-num"><strong>{formatCount(row.count)}</strong></td><td>{row.names}</td></tr>)}</tbody>
      </table> : <Empty>{!accounts.total ? 'Tidak ada akun X pada periode ini.' : accounts.unasked === accounts.total ? 'Lokasi profil akun X pada periode ini belum diperiksa.' : 'Belum ada akun X yang menulis lokasi profil yang menyebut provinsi.'}</Empty>}
      {accounts.total > 0 && <p className="rp-note">{formatCount(accounts.named)} dari {formatCount(accounts.total)} akun X menulis lokasi yang bisa dipetakan{accounts.unasked > 0 ? `; ${formatCount(accounts.unasked)} akun belum diperiksa` : ''}. Lokasi profil adalah keterangan pemilik akun, bukan posisi saat memposting.</p>}
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
  if (!page.posts.length) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada posting pada periode ini untuk diperingkat.</Empty></Sheet>;
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
  if (!groups.rows.length) return <Sheet page={page} frame={frame} title={page.title}><Empty>Belum ada konten yang diulang oleh lebih dari satu posting pada periode ini.</Empty></Sheet>;
  return <Sheet page={page} frame={frame} title={page.title}
    lede={`${groups.rows.length < groups.total ? `${formatCount(groups.rows.length)} kelompok terbesar dari ${formatCount(groups.total)}` : `${formatCount(groups.total)}`} kelompok posting yang isinya sama atau sangat mirip, diurutkan dari yang paling banyak diulang.`}>
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
    <p className="rp-note">“Dibagikan” adalah berapa kali konten itu dibagikan menurut platform. Angka itu dihitung sekali untuk tiap konten dan tidak ditambahkan ke interaksi, karena sebuah repost tidak memiliki bagikan sendiri. “—” berarti angka tidak tersedia, bukan nol.</p>
  </Sheet>;
}

const coverageNotes = { observed: 'Data tersimpan, bukan seluruh isi platform', empty: 'Tidak ada data pada periode ini', excluded: 'Tidak dipilih untuk laporan ini' };
function MethodPage({ page, frame }) {
  const { report, data, summary } = frame;
  const analysedOn = Object.fromEntries(data.platforms.map(row => [row.platform, row.analysed]));
  // Platforms without a single post in the period are named on one line under the table: the sheet has a fixed height.
  const listed = report.sourceCoverage.filter(row => row.platform !== 'unknown' || row.count > 0);
  const rows = listed.filter(row => row.count > 0), empty = listed.filter(row => !row.count);
  const opinion = data.opinion;
  return <Sheet page={page} frame={frame} title={page.title} lede="Yang dimuat laporan ini, seberapa banyak yang sudah dianalisis, dan hal yang perlu diingat saat membaca angkanya.">
    <dl className="rp-facts rp-facts-wide">
      <div><dt>Project</dt><dd>{report.topic.label}</dd></div>
      <div><dt>Kata kunci</dt><dd className="rp-clamp" title={report.topic.query || undefined}>{report.topic.query || 'Tidak tersedia'}</dd></div>
      <div><dt>Periode</dt><dd>{frame.period}{!frame.chosenPeriod && data.total > 0 ? ' (seluruh data tersimpan)' : ''}, tanggal terbit dalam {zone().name}</dd></div>
      <div><dt>Disusun</dt><dd>{pulseDate(report.generatedAt)}</dd></div>
    </dl>
    <section className="rp-block rp-block-tight">
      <h3>Cakupan per platform</h3>
      <table className="rp-table rp-table-tight">
        <thead><tr><th scope="col">Platform</th><th scope="col" className="rp-num">Posting dalam laporan</th><th scope="col" className="rp-num">Sudah dianalisis</th><th scope="col">Keterangan</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.platform}>
          <th scope="row"><span className="rp-platform"><PlatformIcon platform={row.platform} size={14} />{platformName(row.platform)}</span></th>
          <td className="rp-num">{formatCount(row.count)}</td>
          <td className="rp-num">{row.count ? `${formatCount(analysedOn[row.platform] || 0)} (${percent(analysedOn[row.platform] || 0, row.count)}%)` : '—'}</td>
          <td>{coverageNotes[row.status]}</td>
        </tr>)}</tbody>
        <tfoot><tr>
          <th scope="row">Seluruh laporan</th>
          <td className="rp-num">{formatCount(data.total)}</td>
          <td className="rp-num">{data.total ? `${formatCount(data.analysed)} (${data.coverage}%)` : '—'}</td>
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
        <li>Laporan memuat posting yang tersimpan di PULSE untuk kata kunci project ini, bukan seluruh percakapan di tiap platform. Hari teramai adalah hari dengan posting terbanyak dalam data tersimpan.</li>
        <li>Sentimen menilai nada teks, bukan dukungan politik. Sindiran, kutipan, dan konteks dapat terbaca keliru.</li>
        <li>Posting dan komentar yang belum dianalisis tidak dianggap netral. Setiap persentase dihitung dari yang sudah dianalisis.</li>
        <li>Interaksi adalah suka, komentar, dan bagikan yang teramati saat data diambil. Tayangan bukan jumlah orang, dan laporan ini tidak memuat perkiraan jangkauan.</li>
        <li>Angka yang tidak dikirim sumber ditulis “—”, bukan nol.{data.undated > 0 ? ` ${formatCount(data.undated)} posting tanpa tanggal terbit tidak masuk grafik tren.` : ''}</li>
        {summary && <li>Ringkasan eksekutif dirangkai AI dari posting dan komentar tersimpan. Periksa buktinya di PULSE sebelum dikutip.</li>}
        <li>Laporan ini tidak memeriksa kebenaran klaim di dalam posting.</li>
      </ul>
    </section>
  </Sheet>;
}

const pageComponents = { cover: CoverPage, summary: SummaryPage, trend: TrendPage, voices: VoicesPage, opinion: OpinionPage, sources: SourcesPage, places: PlacesPage, posts: PostsPage, narratives: NarrativesPage, method: MethodPage };

/** The pages, and nothing else, inside the element `rootRef` points at: that element is what gets printed.
 * @param {{rootRef: import('react').Ref<HTMLDivElement>, report: object, pages: object[], data: object, summary: object|null,
 *   brand: {logo: string|null, accent: string|null, organisation: string, description: string}}} props */
export default function ReportPages({ rootRef, report, pages, data, summary, brand }) {
  const frame = { report, data, summary, brand, period: periodLabel(report.period, report.days), chosenPeriod: Boolean(report.period?.from || report.period?.to) };
  return <ProjectPostsContext.Provider value={report.posts}>
    <div className="rp-doc pr-document" ref={rootRef} style={brand.accent ? { '--rp-accent': brand.accent } : undefined}>
      {pages.map(page => {
        const Page = pageComponents[page.key];
        return <Page key={page.id} page={page} frame={frame} />;
      })}
    </div>
  </ProjectPostsContext.Provider>;
}
