import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import AnalyticsPanel from './AnalyticsPanel';
import InfoTip from './InfoTip';
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
/** tone_share_v2: the three tones, then "belum dianalisis" when some posts wait; every share is of the row's posts. */
const toneKeys = tone => [...TONES, ...(tone.unknown > 0 ? ['unknown'] : [])];
const toneWords = tone => toneKeys(tone).map(key => `${sentimentLabels[key].toLowerCase()} ${tone.text[key]}`).join(', ');
/** A tone with its base, for the name a row is read by. */
const toneSaid = tone => (tone.analysed ? `Nada ${toneWords(tone)}, dari ${formatCount(tone.total)} posting.` : 'Nada belum dianalisis.');

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

/** tone_share_v2 of a row as a proportion bar in the sentiment colours, every share in words under it (of all the row's
 * posts, "belum dianalisis" the fourth part when some wait), and the posts it rests on when some are still waiting. The cell sits in a button, which is read by its own name (`toneSaid`), so the bar
 * is hidden from assistive technology rather than given a label nobody hears. */
function toneCell(tone) {
  if (!tone.analysed) return <span className="pws-cell" data-cell="tone"><span className="pws-label">Nada</span><small>{sentimentLabels.unknown}</small></span>;
  return <span className="pws-cell" data-cell="tone"><span className="pws-label">Nada</span>
    <span className="pws-tone-bar" aria-hidden="true">
      {toneKeys(tone).filter(key => tone.text[key] !== '0%').map(key => <i key={key} style={{ flexGrow: tone.percent[key], background: sentimentColor[key] }} />)}
    </span>
    <span className="pws-tone-text">{toneKeys(tone).map((key, index) => <span key={key}>{index > 0 && ' · '}{sentimentLabels[key].toLowerCase()} <b>{tone.text[key]}</b></span>)}</span>
    {tone.unknown > 0 && <small>dari {formatCount(tone.total)} posting</small>}
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
      {row.top.length > 0 && <span className="pws-top">
        <span className="pws-avatars">{row.top.map(account => <AccountAvatar key={account.account} author={account.name || ''} platform={account.platform} size="xs" />)}</span>
        <span className="pws-names" title={names.join(', ')}>{names.map((name, index) => <Fragment key={index}>{index > 0 && ', '}<span className="pws-name">{name}</span></Fragment>)}</span>
      </span>}
    </span>
    <span className="pws-cell" data-cell="accounts"><span className="pws-label">Akun</span><b>{formatCount(row.accounts)}</b></span>
    <span className="pws-cell" data-cell="posts"><span className="pws-label">Posting</span>{meter(row.post_share, SERIES.posts)}<small>{formatCount(row.posts)} posting</small></span>
    <span className="pws-cell" data-cell="interactions"><span className="pws-label">Interaksi</span>{meter(row.interaction_share, SERIES.interactions)}<small>{note}</small></span>
    {showTone && toneCell(row.tone)}
  </button></li>;
}

/** The donut of a place tile, a picture of what the tile's name already says (so hidden from assistive technology).
 * With tone: one arc per tone that has posts, in the order negative, neutral, positive, then "belum dianalisis", sized
 * by tone_share_v2's own percents (so the arcs close the ring), a 2px gap of surface between arcs. Without tone (the page shows one sentiment, or nothing is analysed yet):
 * one ring of the accounts series, as long as the place's share of every X account. The arcs start at twelve o'clock. */
const RING = 31.5, GAP = 1.2;
function donut(tone, share) {
  const parts = tone ? toneKeys(tone).filter(key => tone.text[key] !== '0%').map(key => ({ key, value: tone.percent[key], color: sentimentColor[key] })) : [];
  const gap = parts.length > 1 ? GAP : 0;
  let start = 0;
  return <svg className="pws-donut" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
    <circle className="pws-donut-track" cx="36" cy="36" r={RING} />
    <g transform="rotate(-90 36 36)">
      {tone ? parts.map(part => {
        const length = Math.max(part.value, 1) - gap, offset = start;
        start += Math.max(part.value, 1);
        return <circle className="pws-arc" data-tone={part.key} data-share={part.value} key={part.key} cx="36" cy="36" r={RING} pathLength="100"
          strokeDasharray={`${Math.max(length, .5)} ${100 - Math.max(length, .5)}`} strokeDashoffset={-offset} style={{ stroke: part.color }} />;
      }) : share > 0 && <circle className="pws-arc" data-ring="accounts" data-share={Math.round(share * 1000) / 10} cx="36" cy="36" r={RING} pathLength="100"
        strokeDasharray={`${Math.max(share * 100, 1)} ${100 - Math.max(share * 100, 1)}`} style={{ stroke: SERIES.accounts }} />}
    </g>
  </svg>;
}

/** One place in the origin block as a tile: a country group or a province, its share of every X account (the large
 * figure), its accounts and posts, and its tone as a donut with the three shares in figures beside it. Read, like a tier
 * row, by one name that starts with its visible label. */
function placeTile({ key, label, standing, origin, showTone, open }) {
  const share = accountShare(standing, origin), tone = standing.tone, toned = showTone && tone.analysed > 0;
  const said = [`${label}.`, `${formatCount(standing.accounts)} akun X, ${shareText(share)} dari semua akun X.`, `${formatCount(standing.posts)} posting.`,
    ...(showTone ? [toneSaid(tone)] : []), 'Lihat postingnya.'].join(' ');
  return <li key={key}><button type="button" className="pws-place" aria-label={said} onClick={open}>
    {donut(toned ? tone : null, share)}
    <span className="pws-tile-text">
      <strong>{label}</strong>
      <span className="pws-tile-share"><b>{shareText(share)}</b> akun X</span>
      <small className="pws-tile-counts">{formatCount(standing.accounts)} akun · {formatCount(standing.posts)} posting</small>
      {toned && <span className="pws-tile-tone">{toneKeys(tone).map(key => <span key={key}><i className="psa-dot" data-tone={key} aria-hidden="true" />{tone.text[key]}</span>)}</span>}
      {toned && tone.unknown > 0 && <small className="pws-tile-base">dari {formatCount(tone.total)} posting</small>}
    </span>
  </button></li>;
}

/** Where the X accounts are, by account_origin_v1: the country X names for them, then the province their owners wrote,
 * each as a row of tiles. What the figures are over, and why only X, is said in the tip beside the heading. */
function originBlock({ origin, posts, showTone, onOpen, mapLink }) {
  const keysWhere = test => origin.rows.filter(test).map(row => row.key);
  const countries = COUNTRIES.filter(([key]) => origin.country[key].accounts > 0);
  const known = countries.some(([key]) => key !== 'unknown');
  const parts = [['Menulis lokasi', origin.with_location], ['Tanpa lokasi', origin.no_location], ['Profil belum diambil', origin.unasked]].filter(([, count]) => count > 0);
  const tip = <InfoTip label="Tentang asal akun X">
    <p>Lokasi dan negara akun hanya tersedia dari profil X; profil TikTok, Instagram, dan YouTube tidak memberikannya.</p>
    <p>Angka besar: bagian dari {formatCount(origin.accounts)} akun X dalam pilihan ini. {showTone ? 'Lingkaran: nada negatif, netral, positif dan belum dianalisis, dari total posting.' : 'Lingkaran: bagian yang sama, dari semua akun X.'}</p>
    <p>Negara menurut X: negara yang dicantumkan X pada akun.{origin.country.region_only.accounts > 0 && ' Hanya wilayah: X menyebut kawasan, misalnya Asia Tenggara, yang bisa mencakup Indonesia.'}</p>
    <p>Provinsi menurut lokasi profil: dari lokasi yang ditulis pemilik akun, provinsi terbaca pada {formatCount(origin.province_read)} dari {formatCount(origin.accounts)} akun X ({shareText(provinceReadShare(origin))}).
      {parts.map(([name, count]) => ` ${name}: ${formatCount(count)} akun.`).join('')}</p>
  </InfoTip>;
  // One "Siapa yang bicara" per page, so the heading's id is fixed.
  return <section className="pws-origin" aria-labelledby="pws-origin-heading">
    <div className="pws-origin-head"><h3 id="pws-origin-heading">Asal akun X</h3>{tip}
      {showTone && <ul className="pws-legend">{TONES.map(key => <li key={key}><i className="psa-dot" data-tone={key} aria-hidden="true" />{sentimentLabels[key].toLowerCase()}</li>)}</ul>}
    </div>
    <h4 className="pws-sub">Negara menurut X</h4>
    {known ? <ul className="pws-tiles" role="list">{countries.map(([key, label, title]) => placeTile({ key, label, standing: origin.country[key], origin, showTone,
      open: () => onOpen(title, postsOf(posts, keysWhere(row => countryOf(row.based_in) === key))) }))}</ul>
      : <p className="pws-note">Negara belum tercatat.</p>}
    <h4 className="pws-sub">Provinsi menurut lokasi profil</h4>
    {origin.provinces.length > 0 ? <ul className="pws-tiles" role="list">{origin.provinces.map(province => placeTile({ key: province.code, label: province.name, standing: province, origin, showTone,
      open: () => onOpen(`Akun X di ${province.name}`, postsOf(posts, keysWhere(row => row.province?.code === province.code))) }))}</ul>
      : <p className="pws-note">Provinsi belum terbaca.</p>}
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
  // Everything that explains the figures sits behind the title's tip, so the panel opens on its answer.
  const tip = <InfoTip label="Tentang siapa yang bicara">
    <p>Golongan akun menurut jumlah pengikut, dan asal akun X. Pilih baris atau kotak untuk melihat postingnya.</p>
    <p>Posting: bagian dari semua posting. Interaksi: bagian dari interaksi yang tercatat.{showTone && ' Nada: negatif, netral, positif dan belum dianalisis, dari total posting.'}</p>
    {postsKnown !== null && <p>Pengikut diketahui pada {shareText(postsKnown)} posting media sosial
      {interactionsKnown !== null && ` dan ${shareText(interactionsKnown)} interaksi media sosial yang tercatat`}.</p>}
    <p>Pengikut adalah angka terakhir yang tercatat pada posting akun. Posting berita membentuk baris Pemberitaan. Usia, jenis kelamin, dan pekerjaan tidak dilaporkan sumber.</p>
  </InfoTip>;
  return <AnalyticsPanel title={<span>Siapa yang bicara {tip}</span>} label="Siapa yang bicara">
    <div className="pws" data-tone={showTone ? '' : undefined}>
      {sentences.length > 0 && <ul className="pws-lead">{sentences.map(sentence => <li key={sentence}>{emphasise(sentence)}</li>)}</ul>}
      {sentimentFiltered && <p className="pws-note">Nada per kelompok butuh semua sentimen.</p>}
      <div className="pws-grid">
        {/* The column heads are the key: a swatch beside each share, the three tone dots beside Nada. */}
        <div className="pws-head" aria-hidden="true"><span>Kelompok</span><span>Akun</span>
          <span><i className="pu-swatch" style={{ '--swatch': SERIES.posts }} />Posting</span>
          <span><i className="pu-swatch" style={{ '--swatch': SERIES.interactions }} />Interaksi</span>
          {showTone && <span><span className="pws-dots">{TONES.map(key => <i key={key} className="psa-dot" data-tone={key} />)}</span>Nada</span>}</div>
        <ul className="pws-rows" role="list">{tiers.rows.map(row => tierRow(row, { showTone, onOpen, members }))}</ul>
      </div>
      {origin.accounts > 0 && originBlock({ origin, posts, showTone, onOpen, mapLink })}
    </div>
  </AnalyticsPanel>;
}
