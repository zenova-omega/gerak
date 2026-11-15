import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { spikeAuthor, spikeSegments } from '../lib/pulseTrendSpikes';
import { formatCount } from '../lib/pulseData';

const UNIT_WORD = { day: 'hari', week: 'minggu', month: 'bulan' };
const times = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const percent = share => Math.round(share * 100) + '%';
const PLATFORMS = ['instagram', 'tiktok', 'x', 'youtube', 'facebook', 'threads', 'news', 'reddit', 'web'];

/** The ring that marks a spike on the line, small, for the heading. */
function Glyph() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--tsp)" strokeWidth="1.75" /><circle cx="7" cy="7" r="2.5" fill="var(--tsp)" /></svg>;
}

/** Three parts by name and the others together, for one proportion bar. */
function topParts(platforms, total) {
  const named = platforms.slice(0, 3), rest = platforms.slice(3).reduce((sum, part) => sum + part.count, 0);
  return rest ? [...named, { id: 'rest', count: rest, share: rest / total }] : named;
}

/**
 * How the spike began, read in six hours and as one picture (`spikeOnset`): the hours themselves, the platform that
 * moved first and the mix over the six hours, and the conversation group that came first. One block per question,
 * in order of time; who was earlier is said, what caused what is not. `brief` is for a card that already holds
 * other blocks: the platforms are said in one line instead of a bar, and only the earliest group is named.
 */
function Onset({ onset, brief }) {
  const hour = value => String(value).padStart(2, '0'), peak = Math.max(1, ...onset.hours.map(item => item.count));
  const parts = topParts(onset.platforms, onset.posts), group = onset.starter;
  const platformTone = part => PLATFORMS.includes(part.id) ? `var(--ps-plat-${part.id})` : 'var(--ps-control-line)';
  return <>
    <div className="tsp-block">
      <p className="tsp-label">Awal lonjakan, {hour(onset.startHour)}.00 sampai {hour(onset.endHour)}.00 {onset.zone}</p>
      <ol className="tsp-hours" aria-hidden="true">{onset.hours.map(item => <li key={item.hour} data-peak={item.hour === onset.peakHour ? '' : undefined}>
        <b>{formatCount(item.count)}</b><i style={{ height: `${Math.max(4, item.count / peak * 100)}%` }} /><span>{hour(item.hour)}</span>
      </li>)}</ol>
      {!brief && <p className="tsp-fine">{formatCount(onset.posts)} dari {formatCount(onset.timed)} posting berjam hari itu</p>}
    </div>
    {brief ? onset.early && <p className="tsp-line">Lebih dulu ramai di <b>{platformLabel(onset.early.platform)}</b> ({formatCount(onset.early.count)} dari {formatCount(onset.early.of)} posting pada dua jam pertama); selama enam jam terbanyak dari <b>{platformLabel(onset.platforms[0].id)}</b> ({percent(onset.platforms[0].share)}).</p>
    : <div className="tsp-block">
      <p className="tsp-label">Platform pada enam jam itu</p>
      <div className="tsp-bar" aria-hidden="true">{parts.map(part => <span key={part.id} style={{ flexGrow: part.share, background: platformTone(part) }} />)}</div>
      <ul className="tsp-keys">{parts.map(part => <li key={part.id}><i style={{ background: platformTone(part) }} aria-hidden="true" />{part.id === 'rest' ? 'lainnya' : platformLabel(part.id)}<b>{percent(part.share)}</b></li>)}</ul>
      {onset.early && <p className="tsp-line">Lebih dulu ramai di <b>{platformLabel(onset.early.platform)}</b>: {formatCount(onset.early.count)} dari {formatCount(onset.early.of)} posting pada dua jam pertama.</p>}
    </div>}
    <div className="tsp-block">
      <p className="tsp-label">Kelompok percakapan paling awal</p>
      {group ? <>
        {group.title && <p className="tsp-quote">{group.title}</p>}
        <p className="tsp-post"><Who item={group} /><span>pukul <b>{group.time}</b> · <b>{formatCount(group.count)}</b> posting</span></p>
        {!brief && onset.largest && <p className="tsp-line">Terbesar: <b>{formatCount(onset.largest.count)}</b> posting, pertama pukul {onset.largest.time}{onset.largest.title ? `, “${onset.largest.title.replace(/\s+/g, ' ').trim().slice(0, 48)}${onset.largest.title.trim().length > 48 ? '…' : ''}”` : ''}.</p>}
      </> : <p className="tsp-line">Belum ada kelompok yang menonjol. Posting pertama pukul {onset.first[0]?.time} oleh {onset.first[0] ? spikeAuthor(onset.first[0]) : 'akun tanpa nama'}.</p>}
    </div>
    {!brief && onset.dateOnly > 0 && <p className="tsp-fine">{formatCount(onset.dateOnly)} posting hanya bertanggal tanpa jam, jadi tidak ikut dibaca per jam.</p>}
  </>;
}

function Who({ item }) {
  // The account as it is shown everywhere: its picture (initials when none is known) with the platform mark. Loaded at
  // once, because the card is only on screen while the pointer rests on the chart.
  return <span className="tsp-who"><AccountAvatar author={item.author} platform={item.platform} size="xs" eager /><span>{spikeAuthor(item)}</span></span>;
}

/**
 * What a spike is made of, as a small infographic inside the chart tooltip. One question per block, in the brand's
 * templates: how far above the usual day (figures), where it came from (one proportion bar with its key), who posted
 * most (ranked rows), and the post that carried the most (a quote). Every figure is counted from the posts on screen
 * (`pulseTrendSpikes`); the chart's table writes the same facts out as sentences, so nothing here is hover-only.
 * A spike in posts that can be read by the hour shows how it began instead (`Onset`): six hours, one combined reading.
 * @param {{entry: {spike: object, facts: object, onset?: object}, seriesKey: 'posts'|'interactions', unit: string, color: string}} props
 */
export default function TrendSpikeCard({ entry, seriesKey, unit = 'day', color }) {
  const { spike, facts, onset } = entry, word = UNIT_WORD[unit] || UNIT_WORD.day, carried = seriesKey === 'interactions';
  const parts = spikeSegments(facts, seriesKey), [first] = facts.top;
  const busy = carried ? [] : facts.accounts.filter(account => account.count >= 2).slice(0, 3);
  const tone = part => carried
    ? part.id === 'top' ? 'var(--tsp)' : part.id === 'next' ? 'color-mix(in oklab, var(--tsp) 48%, var(--ps-panel))' : 'var(--ps-control-line)'
    : PLATFORMS.includes(part.id) ? `var(--ps-plat-${part.id})` : 'var(--ps-control-line)';
  const name = part => carried
    ? part.id === 'top' ? 'posting teratas' : part.id === 'next' ? `${part.posts} berikutnya` : 'posting lain'
    : part.id === 'rest' ? 'lainnya' : platformLabel(part.id);
  const said = carried && first?.text ? first.text.replace(/\s+/g, ' ').trim() : '';
  return <div className="tsp" style={{ '--tsp': color }}>
    <p className="tsp-title"><Glyph />Lonjakan</p>
    <div className="tsp-figures">
      {spike.times
        ? <><p className="tsp-figure"><strong>{times.format(spike.times)}×</strong><span>dari {word} biasa</span></p>
          <p className="tsp-figure" data-quiet=""><strong>{formatCount(Math.round(spike.usual))}</strong><span>biasanya per {word}</span></p></>
        : <p className="tsp-figure"><strong>{formatCount(spike.value)}</strong><span>{word} lain pada rentang ini umumnya kosong</span></p>}
    </div>
    {onset && !carried && <Onset onset={onset} />}
    {(carried || !onset) && parts.length > 0 && <div className="tsp-block">
      <p className="tsp-label">{carried ? 'Asal interaksi' : 'Asal posting'}</p>
      <div className="tsp-bar" aria-hidden="true">{parts.map(part => <span key={part.id} style={{ flexGrow: part.share, background: tone(part) }} />)}</div>
      <ul className="tsp-keys">{parts.map(part => <li key={part.id}><i style={{ background: tone(part) }} aria-hidden="true" />{name(part)}<b>{percent(part.share)}</b></li>)}</ul>
    </div>}
    {!onset && busy.length > 0 && <div className="tsp-block">
      <p className="tsp-label">Paling banyak memposting</p>
      <ol className="tsp-rank">{busy.map(account => <li key={account.platform + account.author}>
        <Who item={account} /><b>{formatCount(account.count)}</b><i style={{ width: `${Math.max(6, account.count / busy[0].count * 100)}%` }} aria-hidden="true" />
      </li>)}</ol>
    </div>}
    {(carried || !onset) && first && <div className="tsp-block">
      <p className="tsp-label">{carried ? 'Posting teratas' : 'Posting paling ramai'}</p>
      <p className="tsp-post"><Who item={first} /><span><b>{formatCount(first.interactions)}</b> interaksi</span></p>
      {said && !onset && <p className="tsp-quote">{said}</p>}
    </div>}
    {onset && carried && <Onset onset={onset} brief />}
  </div>;
}

/** One line for the chart that is not under the cursor: it has a spike here too, and pointing at it tells more. */
export function TrendSpikeChip({ entry, unit = 'day', color }) {
  const { spike } = entry, word = UNIT_WORD[unit] || UNIT_WORD.day;
  return <p className="tsp-chip" style={{ '--tsp': color }}><Glyph /><span>Lonjakan{spike.times ? `, ${times.format(spike.times)}× ${word} biasa` : ''}</span></p>;
}
