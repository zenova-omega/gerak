import { Link } from 'react-router-dom';
import AnalyticsPanel from './AnalyticsPanel';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import { PulseArrow } from '../components/ui/PulseArrow';
import {
  TIERS, accountOrigin, accountShare, accountTiers, countryOf, followersKnownInteractionShare, followersKnownShare, followersOf, groupLead, leadSentences, provinceReadShare, shareText, tierOf,
} from '../lib/pulseDemography';
import { byInteractions, postMeasures } from '../lib/pulseMeasures';
import { sentimentLabels } from '../lib/pulsePostFilters';
import { formatCount } from '../lib/pulseData';
import { chartSeries, sentimentColor } from '../lib/pulseChartTheme';
import './ds/who-is-speaking.css';

/** Two series with no sentiment or platform meaning: the share of posts and the share of interactions. The share of
 * X accounts in the origin block is a third. */
const SERIES = { posts: chartSeries[0], interactions: chartSeries[1], accounts: chartSeries[4] };
/** The order of a proportion bar of tone, as on the Sentimen page. */
const TONES = ['negative', 'neutral', 'positive'];
const COUNTRIES = [['indonesia', 'Indonesia', 'Akun X: Indonesia'], ['region_only', 'hanya wilayah', 'Akun X: hanya wilayah'],
  ['abroad', 'luar negeri', 'Akun X: luar negeri'], ['unknown', 'tidak diketahui', 'Akun X: negara tidak diketahui']];
const TITLES = { news: 'Pemberitaan', unknown: 'Akun yang pengikutnya tidak diketahui' };
/** What the drawer calls a row: the size of its accounts in words, never the bare "≥1 jt". */
const titleOf = row => TITLES[row.key] || `Akun dengan ${row.label} pengikut`;

/** The percentages of a sentence in bold, so the answer can be read at a glance. */
const emphasise = sentence => sentence.split(/(<1%|\d+%)/).map((part, index) => (index % 2 ? <b key={index}>{part}</b> : part));
const toneWords = tone => TONES.map(key => `${sentimentLabels[key].toLowerCase()} ${tone.text[key]}`).join(', ');
/** A tone with its base, for the name a row is read by. */
const toneSaid = tone => (tone.analysed ? `Nada ${toneWords(tone)}, dari ${formatCount(tone.analysed)} posting yang dianalisis.` : 'Nada belum dianalisis.');

// The readings of one list of posts, kept with that list: opening the drawer redraws the page, not the readings.
const readings = new WeakMap();
function read(posts) {
  let reading = readings.get(posts);
  if (!reading) {
    const tiers = accountTiers(posts), origin = accountOrigin(posts);
    reading = { tiers, origin, lead: groupLead(tiers, origin), members: null };
    readings.set(posts, reading);
  }
  return reading;
}

/** The posts behind each row of account_tier_v1, placed by the module's own `tierOf` (the grouping `accountTiers`
 * counts by), the most interacted first. */
function tierMembers(posts) {
  const followers = followersOf(posts), groups = new Map(TIERS.map(tier => [tier.key, []]));
  for (const post of posts) groups.get(tierOf(post, followers)).push(post);
  for (const list of groups.values()) list.sort(byInteractions);
  return groups;
}
/** The posts of some accounts (account_v1 keys), the most interacted first. */
function postsOf(posts, accounts) {
  const keys = new Set(accounts);
  return posts.filter(post => keys.has(postMeasures(post).account)).sort(byInteractions);
}

/** A share drawn as a bar on a track of the whole, with its percent beside it. A share nobody can state is a dash, and no bar. */
function meter(share, color) {
  if (share === null) return <span className="pws-meter" data-empty=""><b>—</b></span>;
  return <span className="pws-meter"><span className="pws-track" aria-hidden="true">{share > 0 && <i style={{ width: `${share * 100}%`, background: color }} />}</span><b>{shareText(share)}</b></span>;
}

/** tone_share_v1 of a row as a proportion bar in the sentiment colours, every share in words under it, and the posts it
 * rests on when some are still waiting. The cell sits in a button, which is read by its own name (`toneSaid`), so the bar
 * is hidden from assistive technology rather than given a label nobody hears. */
function toneCell(tone) {
  if (!tone.analysed) return <span className="pws-cell" data-cell="tone"><span className="pws-label">Nada</span><small>{sentimentLabels.unknown}</small></span>;
  return <span className="pws-cell" data-cell="tone"><span className="pws-label">Nada</span>
    <span className="pws-tone-bar" aria-hidden="true">
      {TONES.filter(key => tone.text[key] !== '0%').map(key => <i key={key} style={{ flexGrow: tone.percent[key], background: sentimentColor[key] }} />)}
    </span>
    <span className="pws-tone-text">{TONES.map((key, index) => <span key={key}>{index > 0 && ' · '}{sentimentLabels[key].toLowerCase()} <b>{tone.text[key]}</b></span>)}</span>
    {tone.unknown > 0 && <small>dari {formatCount(tone.analysed)} posting yang dianalisis</small>}
  </span>;
}

/** One row of account_tier_v1: the group with its top accounts, then accounts, posts, interactions and tone. The button
 * is read by one name that starts with the row's visible label (WCAG 2.5.3) and says every figure with its base. */
function tierRow(row, { showTone, onOpen, members }) {
  const title = titleOf(row), { interactions } = row;
  const names = row.top.map(account => account.name || 'Nama tidak tersedia');
  const partial = interactions.posts < row.posts ? `, diketahui pada ${formatCount(interactions.posts)} dari ${formatCount(row.posts)} posting` : '';
  const note = interactions.value === null ? 'tidak dilaporkan' : `${formatCount(interactions.value)} interaksi${partial}`;
  const said = [
    `${row.label}${TITLES[row.key] ? '' : ' pengikut'}.`, `${formatCount(row.accounts)} akun.`,
    `${formatCount(row.posts)} posting, ${shareText(row.post_share)} dari semua posting.`,
    interactions.value === null ? 'Interaksi tidak dilaporkan.'
      : `${formatCount(interactions.value)} interaksi${row.interaction_share === null ? '' : `, ${shareText(row.interaction_share)} dari interaksi yang tercatat`}${partial}.`,
    ...(showTone ? [toneSaid(row.tone)] : []), ...(names.length ? [`Akun teratas: ${names.join(', ')}.`] : []), 'Lihat postingnya.',
  ].join(' ');
  return <li key={row.key}><button type="button" className="pws-row" aria-label={said} onClick={() => onOpen(title, members().get(row.key))}>
    <span className="pws-cell" data-cell="group"><strong>{row.label}</strong>
      {row.top.length > 0 && <span className="pws-top">{row.top.map((account, index) => <span className="pws-who" key={account.account}><AccountAvatar author={account.name || ''} platform={account.platform} size="xs" /><span className="pws-name" title={names[index]}>{names[index]}</span></span>)}</span>}
    </span>
    <span className="pws-cell" data-cell="accounts"><span className="pws-label">Akun</span><b>{formatCount(row.accounts)}</b></span>
    <span className="pws-cell" data-cell="posts"><span className="pws-label">Posting</span>{meter(row.post_share, SERIES.posts)}<small>{formatCount(row.posts)} posting</small></span>
    <span className="pws-cell" data-cell="interactions"><span className="pws-label">Interaksi</span>{meter(row.interaction_share, SERIES.interactions)}<small>{note}</small></span>
    {showTone && toneCell(row.tone)}
  </button></li>;
}

/** One place in the origin block: a country group or a province, its share of every X account, its accounts and posts,
 * and its tone. Read, like a tier row, by one name that starts with its visible label. */
function placeRow({ key, label, standing, origin, showTone, open }) {
  const share = accountShare(standing, origin);
  const said = [`${label}.`, `${formatCount(standing.accounts)} akun X, ${shareText(share)} dari semua akun X.`, `${formatCount(standing.posts)} posting.`,
    ...(showTone ? [toneSaid(standing.tone)] : []), 'Lihat postingnya.'].join(' ');
  return <li key={key}><button type="button" className="pws-place" aria-label={said} onClick={open}>
    <span className="pws-cell" data-cell="place"><strong>{label}</strong></span>
    <span className="pws-cell" data-cell="accounts"><span className="pws-label">Akun X</span>{meter(share, SERIES.accounts)}<small>{formatCount(standing.accounts)} akun · {formatCount(standing.posts)} posting</small></span>
    {showTone && toneCell(standing.tone)}
  </button></li>;
}

/** Where the X accounts are, by account_origin_v1: the country X names for them, then the province their owners wrote. */
function originBlock({ origin, posts, showTone, onOpen, mapLink }) {
  const keysWhere = test => origin.rows.filter(test).map(row => row.key);
  const countries = COUNTRIES.filter(([key]) => origin.country[key].accounts > 0);
  const known = countries.some(([key]) => key !== 'unknown');
  const parts = [['Menulis lokasi', origin.with_location], ['Tanpa lokasi', origin.no_location], ['Profil belum diambil', origin.unasked]].filter(([, count]) => count > 0);
  // One "Siapa yang bicara" per page, so the heading's id is fixed.
  return <section className="pws-origin" aria-labelledby="pws-origin-heading">
    <h3 id="pws-origin-heading">Asal akun X</h3>
    <ul className="pws-keys"><li><i className="pu-swatch" style={{ '--swatch': SERIES.accounts }} aria-hidden="true" />Akun X: bagian dari {formatCount(origin.accounts)} akun X dalam pilihan ini</li></ul>
    <h4 className="pws-sub">Negara menurut X</h4>
    {known ? <>
      <ul className="pws-rows" role="list">{countries.map(([key, label, title]) => placeRow({ key, label, standing: origin.country[key], origin, showTone,
        open: () => onOpen(title, postsOf(posts, keysWhere(row => countryOf(row.based_in) === key))) }))}</ul>
      {origin.country.region_only.accounts > 0 && <p className="pws-note">Hanya wilayah: X menyebut kawasan, misalnya Asia Tenggara, yang bisa mencakup Indonesia.</p>}
    </> : <p className="pws-note">Negara menurut X belum tercatat pada akun dalam pilihan ini.</p>}
    <h4 className="pws-sub">Provinsi menurut lokasi profil</h4>
    <p className="pws-note">Dari lokasi yang ditulis pemilik akun, provinsi terbaca pada {formatCount(origin.province_read)} dari {formatCount(origin.accounts)} akun X ({shareText(provinceReadShare(origin))}).
      {parts.map(([name, count]) => ` ${name}: ${formatCount(count)} akun.`).join('')}</p>
    {origin.provinces.length > 0 && <ul className="pws-rows" role="list">{origin.provinces.map(province => placeRow({ key: province.code, label: province.name, standing: province, origin, showTone,
      open: () => onOpen(`Akun X di ${province.name}`, postsOf(posts, keysWhere(row => row.province?.code === province.code))) }))}</ul>}
    {mapLink && <Link className="pws-map" to={mapLink}>Buka peta lokasi akun X <PulseArrow /></Link>}
  </section>;
}

/**
 * "Siapa yang bicara", the first block of Akun & sumber: who carries the issue and how each group feels. Sentences
 * from group_lead_v1, one row per tier of account_tier_v1 (accounts, share of posts, share of interactions, tone), and
 * where the X accounts are (account_origin_v1). Every row opens its posts with `onOpen(title, posts)`. Nothing is drawn
 * for an empty selection. Only what the sources report is shown: no age, gender or any other attribute.
 * @param {{posts: object[], onOpen: (title: string, posts: object[]) => void, sentimentFiltered?: boolean, mapLink?: string}} props
 *   `posts` already scoped to the project's period, platforms and the page's sentiment. `sentimentFiltered`: the page
 *   shows one sentiment only, so every tone bar would be one colour; the tone and the most negative group are left out.
 *   `mapLink`: Jaringan with the map open on its account layer.
 */
export default function WhoIsSpeaking({ posts, onOpen, sentimentFiltered = false, mapLink }) {
  if (!posts?.length) return null;
  const reading = read(posts), { tiers, origin } = reading, showTone = !sentimentFiltered;
  const sentences = leadSentences(reading.lead, tiers, origin, { sentimentFiltered, platformName: platformLabel });
  const postsKnown = followersKnownShare(tiers), interactionsKnown = followersKnownInteractionShare(tiers);
  const members = () => (reading.members ??= tierMembers(posts));
  return <AnalyticsPanel title="Siapa yang bicara" description="Golongan akun menurut jumlah pengikut dan asal akun X. Pilih baris untuk melihat postingnya."
    footer="Pengikut adalah angka terakhir yang tercatat pada posting akun. Posting berita membentuk baris Pemberitaan. Usia, jenis kelamin, dan pekerjaan tidak dilaporkan sumber, jadi tidak ditampilkan.">
    <div className="pws" data-tone={showTone ? '' : undefined}>
      {sentences.length > 0 && <ul className="pws-lead">{sentences.map(sentence => <li key={sentence}>{emphasise(sentence)}</li>)}</ul>}
      {sentimentFiltered && <p className="pws-note">Nada per kelompok perlu semua sentimen; pilihan sentimen di halaman ini sedang aktif.</p>}
      <ul className="pws-keys">
        <li><i className="pu-swatch" style={{ '--swatch': SERIES.posts }} aria-hidden="true" />Posting: bagian dari semua posting</li>
        <li><i className="pu-swatch" style={{ '--swatch': SERIES.interactions }} aria-hidden="true" />Interaksi: bagian dari interaksi yang tercatat</li>
        {showTone && <li><span className="pws-dots" aria-hidden="true">{TONES.map(key => <i key={key} className="psa-dot" data-tone={key} />)}</span>Nada: negatif, netral, positif, dari posting yang dianalisis</li>}
      </ul>
      <div className="pws-grid">
        <div className="pws-head" aria-hidden="true"><span>Kelompok</span><span>Akun</span><span>Posting</span><span>Interaksi</span>{showTone && <span>Nada</span>}</div>
        <ul className="pws-rows" role="list">{tiers.rows.map(row => tierRow(row, { showTone, onOpen, members }))}</ul>
      </div>
      {postsKnown !== null && <p className="pws-note">Pengikut diketahui pada {shareText(postsKnown)} posting media sosial
        {interactionsKnown !== null && ` dan ${shareText(interactionsKnown)} interaksi media sosial yang tercatat`}.</p>}
      {origin.accounts > 0 && originBlock({ origin, posts, showTone, onOpen, mapLink })}
    </div>
  </AnalyticsPanel>;
}
