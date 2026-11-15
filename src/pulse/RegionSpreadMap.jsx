import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPinned, Minus, Pause, Play, Plus } from 'lucide-react';
import AnalyticsPanel from './AnalyticsPanel';
import { Button } from '../components/ui/shadcn/button';
import { PulseRange } from '../components/ui/PulseRange';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { PlatformLabel } from '../components/admin/pulse/PlatformIcon';
import { allRange, rangeBounds, rangeLabel, resolveRange, withinRange } from '../lib/pulseRange';
import { bucketLabel } from '../lib/pulseTrendSeries';
import { sentimentDate } from '../lib/pulseSentiment';
import { accountPhoto } from '../lib/pulseAccountPhoto';
import { accountPostsLink, postsEvidenceLink } from '../lib/pulseDrilldown';
import { accountDetail, accountSpread, placeSnippet, postPlaces, provinceDetail, spreadByDay, spreadFrame } from '../lib/pulsePlaces';
import { accountPins, bubbleRadius, faceOffsets, mapViews, MAX_ZOOM, panBox, shadeRanges, shadeStep, viewOf, zoomBox } from '../lib/pulseRegionMap';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import outline from './indonesia-provinces.json';
import './ds/trend-chart.css';   // the shared "Lihat angka" table and the empty-state line
import './ds/region-map.css';

const VIEWS = Object.entries(mapViews);
const PROVINCES = outline.provinces;
const POINTS = Object.fromEntries(PROVINCES.map(province => [province.code, [province.x, province.y]]));
const short = day => bucketLabel({ from: day, to: day });   // "3 Nov"
const PAGE = 5;

/** What changes between the two things the map can show. Everything else (timeline, shading, list, table) is shared. */
const LAYERS = {
  named: {
    label: 'Tempat disebut', noun: 'posting',
    description: 'Provinsi yang disebut dalam judul dan teks posting, hari demi hari. Yang digambar adalah tempat yang dibicarakan, bukan lokasi penulis.',
    footer: 'Dibaca dari judul dan teks posting memakai daftar nama provinsi, kota dan kabupaten. Posting yang tidak menyebut tempat tidak digambar, dan satu posting bisa menyebut lebih dari satu provinsi. Nama media, alamat situs, nama akun dan kalimat ajakan berlangganan tidak dihitung.',
    status: frame => `${formatCount(frame.named)} dari ${formatCount(frame.posts)} posting menyebut tempat`,
    summary: 'provinsi disebut', bars: 'posting yang menyebut tempat per hari',
    columns: ['Pertama disebut', day => `Sampai ${short(day)}`, 'Nama yang disebut'],
  },
  accounts: {
    label: 'Lokasi akun X', noun: 'akun',
    description: 'Provinsi yang ditulis pemilik akun X di profilnya, untuk akun yang ikut dalam percakapan ini. Ini keterangan pemilik akun, bukan posisi saat memposting. Perbesar peta untuk melihat foto akun di tiap kota.',
    footer: 'Lokasi profil adalah teks bebas yang ditulis pemilik akun X, misalnya "Jakarta Selatan" atau "Bumi". Yang digambar hanya teks yang menyebut provinsi, kota atau kabupaten. Lokasi itu bisa kosong, lama atau tidak sungguhan, dan bukan posisi saat memposting. Akun dihitung sejak posting pertamanya pada rentang ini; sumber lain tidak menyediakan lokasi profil.',
    status: frame => `${formatCount(frame.named)} dari ${formatCount(frame.posts)} akun X menulis lokasi profil yang bisa dipetakan`,
    summary: 'provinsi punya akun X berlokasi profil', bars: 'akun X berlokasi profil yang bergabung per hari',
    columns: ['Pertama muncul', day => `Akun sampai ${short(day)}`, 'Lokasi yang ditulis'],
  },
};
const OUTLINES = ' Garis batas 34 provinsi (2017): provinsi hasil pemekaran Papua digambar di dalam Papua dan Papua Barat. Peta dasar © kontributor OpenStreetMap lewat geoBoundaries, lisensi ODbL.';

function Switch({ label, value, onChange, options }) {
  return <div className="pu-segmented" role="group" aria-label={label}>{options.map(([key, text]) =>
    <Button key={key} type="button" size="sm" variant={value === key ? 'secondary' : 'ghost'} aria-pressed={value === key} onClick={() => onChange(key)}>{text}</Button>)}</div>;
}

/** The round picture of one account on the map; its initial when there is no picture or it does not load. */
function Face({ account }) {
  const url = accountPhoto(account.post), [failed, setFailed] = useState('');
  if (url && failed !== url) return <img className="rm-face" src={url} alt="" width="24" height="24" loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable="false" onError={() => setFailed(url)} />;
  return <span className="rm-face" data-empty="">{Array.from((account.author || '?').replace(/^@/, ''))[0]?.toUpperCase() || '?'}</span>;
}

/** The posts behind one province, with the names that put them there. */
function Posts({ detail, day, shown, onMore }) {
  const routed = useInRouterContext(), all = postsEvidenceLink(typeof window === 'undefined' ? '' : window.location.search, { province: detail.code });
  if (!detail.posts.length) return <><h3>{detail.name}</h3><p className="rm-hint">Belum ada posting yang menyebut {detail.name} sampai {rangeLabel(day)}.{detail.first && detail.first > day ? ` Pertama disebut ${short(detail.first)}.` : ''}</p></>;
  return <>
    <h3>{detail.name}</h3>
    <p className="rm-detail-lead">{formatCount(detail.posts.length)} posting menyebutnya sampai {rangeLabel(day)}, pertama kali {short(detail.first)}. Nama yang dipakai:</p>
    <ul className="rm-names">{detail.places.map(([name, count]) => <li key={name}><span>{name}</span><b>{formatCount(count)}</b></li>)}</ul>
    <ol className="rm-posts">{detail.posts.slice(0, shown).map((post, index) => {
      // The excerpt is cut around the name that put the post here, so the reading can be checked at a glance.
      const url = safeSourceUrl(post.url), cut = placeSnippet(post, postPlaces(post).find(row => row.code === detail.code)?.places, 220);
      const text = cut.before || cut.match ? <>{cut.before}{cut.match && <mark>{cut.match}</mark>}{cut.after}</> : 'Tanpa teks';
      return <li key={(post.id || index) + ':' + index}>
        <div className="rm-post-who"><AccountAvatar size="xs" author={post.author} platform={post.platform} /><strong>{post.author || 'Tanpa akun'}</strong><span><PlatformLabel platform={post.platform} /> · <time>{pulseDate(post.published_at)}</time></span></div>
        {url ? <a href={url} target="_blank" rel="noopener noreferrer">{text}</a> : <span>{text}</span>}
      </li>; })}</ol>
    <div className="rm-detail-more">
      {detail.posts.length > shown && <Button type="button" size="sm" variant="outline" onClick={onMore}>Tampilkan {Math.min(PAGE, detail.posts.length - shown)} posting berikutnya</Button>}
      {routed ? <Link to={all}>Buka semua di halaman Posting</Link> : <a href={all}>Buka semua di halaman Posting</a>}
    </div>
  </>;
}

/** The X accounts whose profile names one province, with the text each owner wrote. */
function Accounts({ detail, day, shown, onMore }) {
  const routed = useInRouterContext(), search = typeof window === 'undefined' ? '' : window.location.search;
  if (!detail.accounts.length) return <><h3>{detail.name}</h3><p className="rm-hint">Belum ada akun X yang menulis lokasi di {detail.name} sampai {rangeLabel(day)}.{detail.first && detail.first > day ? ` Yang pertama muncul ${short(detail.first)}.` : ''}</p></>;
  return <>
    <h3>{detail.name}</h3>
    <p className="rm-detail-lead">{formatCount(detail.accounts.length)} akun X menulis lokasi di sini sampai {rangeLabel(day)}, yang pertama muncul {short(detail.first)}. Tempat yang ditulis:</p>
    <ul className="rm-names">{detail.places.map(([name, count]) => <li key={name}><span>{name}</span><b>{formatCount(count)}</b></li>)}</ul>
    <ol className="rm-accounts">{detail.accounts.slice(0, shown).map(account => { const href = accountPostsLink(search, account), label = `Lihat posting ${account.author}`; return <li key={account.author}>
      <AccountAvatar size="sm" author={account.author} platform="x" photo={accountPhoto(account.post)} />
      <div className="rm-account-who"><strong>{account.author || 'Tanpa nama'}</strong> <span title="Lokasi yang ditulis di profil">{account.location}</span></div>
      <span className="rm-account-facts">{account.followers != null && <span>{formatCount(account.followers)} pengikut </span>}<span>{formatCount(account.posts)} posting </span>{account.interactions != null && <span>{formatCount(account.interactions)} interaksi</span>}</span>
      {routed ? <Link to={href} aria-label={label}>Lihat posting</Link> : <a href={href} aria-label={label}>Lihat posting</a>}
    </li>; })}</ol>
    {detail.accounts.length > shown && <Button type="button" size="sm" variant="outline" onClick={onMore}>Tampilkan {Math.min(PAGE, detail.accounts.length - shown)} akun berikutnya</Button>}
  </>;
}

/**
 * A map of Indonesia with a timeline, for two questions about one conversation:
 *
 * - "Tempat disebut": which provinces the posts talk about (their titles and texts, read by src/lib/pulsePlaces.js),
 *   with a bubble whose area is the number of posts.
 * - "Lokasi akun X": where the X accounts in the conversation say they are (the location on their profile), as pins
 *   with the round profile picture of the strongest account and the number of accounts. Bringing the map closer
 *   pulls the pins apart, down to single cities, and shows more pictures where there is room.
 *
 * In both, a province is drawn darker the more it holds. Neither says where a post was written: no source reports
 * that, and both descriptions say so. Everything is counted up to the chosen day, so playing the timeline shows the
 * map filling in. The list beside the map, the table and the tooltips carry the same numbers, so nothing depends on
 * colour, on a picture or on a mouse.
 *
 * @param {{
 *   posts: object[], title?: string,
 *   initialLayer?: 'named'|'accounts', initialRange?: {key: string, from?: string, to?: string}, initialDay?: string,
 *   initialView?: 'all'|'java', initialSelected?: string,
 * }} props `posts` are already scoped to the project's period and platforms. The `initial…` props set the first view (used by tests and links).
 */
export default function RegionSpreadMap({ posts = [], title = 'Peta sebaran tempat', initialLayer = 'named', initialRange = allRange, initialDay = '', initialView = 'all', initialSelected = '' }) {
  const [layer, setLayer] = useState(LAYERS[initialLayer] ? initialLayer : 'named');
  const [choice, setChoice] = useState(initialRange), [box, setBox] = useState((mapViews[initialView] || mapViews.all).box);
  const [picked, setPicked] = useState(initialDay), [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(initialSelected), [order, setOrder] = useState('count'), [shown, setShown] = useState(PAGE);
  const [tip, setTip] = useState(null);
  const frameRef = useRef(null), drag = useRef(null), dragged = useRef(false);
  const people = layer === 'accounts', kind = LAYERS[layer];

  const bounds = useMemo(() => rangeBounds(posts.map(sentimentDate)), [posts]);
  const range = resolveRange(bounds, choice), rangeKey = range?.key, from = range?.from, to = range?.to;
  const inRange = useMemo(() => withinRange(posts, rangeKey ? { key: rangeKey, from, to } : null, sentimentDate), [posts, rangeKey, from, to]);
  const spread = useMemo(() => people ? accountSpread(inRange) : spreadByDay(inRange), [inRange, people]);
  const days = spread.days, last = days.length - 1;
  const at = picked && days.includes(picked) ? days.indexOf(picked) : last;   // a day outside the range falls back to the last one
  const day = days[at];
  const frame = useMemo(() => spreadFrame(spread, day), [spread, day]);
  const detailOf = people ? accountDetail : provinceDetail;
  const detail = useMemo(() => selected ? detailOf(spread, selected, day) : null, [spread, selected, day, detailOf]);
  // The names behind every row of the table, up to the chosen day. Kept, so moving the mouse over the map costs nothing.
  const namesOf = useMemo(() => new Map(frame.rows.map(row => [row.code, detailOf(spread, row.code, day).places.slice(0, 6).map(([name, count]) => `${name} ${formatCount(count)}`).join(', ')])), [spread, frame, day, detailOf]);
  // Drawn smallest first, so the busiest pin lies on top.
  const pins = useMemo(() => people ? accountPins(frame.rows.map(row => ({ ...row, accounts: accountDetail(spread, row.code, day).accounts })), POINTS, viewOf(box)).reverse() : [], [people, spread, frame, day, box]);

  // Playing moves one day at a time and stops on the last. A long range plays faster, so the whole run stays near 12 seconds.
  useEffect(() => {
    if (!playing) return undefined;
    const pace = Math.max(120, Math.min(800, 12000 / Math.max(days.length, 1)));
    const timer = setTimeout(() => { const next = Math.min(at + 1, last); setPicked(days[next]); if (next >= last) setPlaying(false); }, pace);
    return () => clearTimeout(timer);
  }, [playing, at, last, days]);

  const hasMap = spread.provinces.length > 0;
  const preset = VIEWS.find(([, item]) => item.box.every((value, index) => value === box[index]));
  const zoom = viewOf(box).zoom;
  const actions = <>
    {bounds && <Switch label="Isi peta" value={layer} onChange={next => { setLayer(next); setShown(PAGE); setTip(null); }} options={Object.entries(LAYERS).map(([key, item]) => [key, item.label])} />}
    {hasMap && <Switch label="Tampilan peta" value={preset ? preset[0] : ''} onChange={key => setBox(mapViews[key].box)} options={VIEWS.map(([key, item]) => [key, item.label])} />}
    {bounds && <PulseRange chart={title} bounds={bounds} value={choice} onChange={next => { setChoice(next); setPicked(''); setPlaying(false); }} />}
  </>;
  const panel = body => <AnalyticsPanel className="rm-panel" icon={MapPinned} title={title} actions={actions} description={kind.description} footer={kind.footer + OUTLINES}>{body}</AnalyticsPanel>;

  if (!bounds) return panel(<p className="tc-empty">Belum ada posting bertanggal pada periode ini, jadi belum ada garis waktu yang bisa digambar.</p>);
  // What the view could not place, in words.
  const vague = people ? spread.located - spread.named : 0;
  const gaps = people ? [spread.unasked > 0 && `${formatCount(spread.unasked)} akun X belum diperiksa lokasinya (pemeriksaan berjalan sendiri di latar, akun tersibuk lebih dulu)`,
    vague > 0 && `${formatCount(vague)} akun menulis lokasi yang tidak menyebut provinsi`].filter(Boolean)
    : [spread.undatedNamed > 0 && `${formatCount(spread.undatedNamed)} posting yang menyebut tempat tidak bertanggal dan tidak masuk garis waktu`].filter(Boolean);
  const note = gaps.length > 0 && <p className="tc-note">{gaps.join('; ')}.</p>;
  if (!hasMap) {
    const why = !people ? 'Belum ada posting yang menyebut provinsi, kota atau kabupaten pada rentang ini. Peta hanya membaca judul dan teks posting.'
      : !spread.total ? 'Belum ada akun X pada rentang ini. Lokasi profil hanya tersedia untuk akun X.'
      : spread.unasked === spread.total ? `Lokasi profil ${formatCount(spread.total)} akun X pada rentang ini belum diperiksa. Pemeriksaan berjalan sendiri di latar, akun tersibuk lebih dulu; peta terisi begitu hasilnya masuk.`
      : 'Belum ada akun X yang menulis lokasi profil yang menyebut provinsi, kota atau kabupaten pada rentang ini.';
    return panel(<><p className="tc-empty">{why}</p>{spread.unasked !== spread.total && note}</>);
  }

  const most = Math.max(...spread.provinces.map(row => row.total));
  const byCode = new Map(frame.rows.map(row => [row.code, row])), firstOf = new Map(spread.provinces.map(row => [row.code, row.first]));
  const fresh = frame.rows.filter(row => row.fresh);
  const ranked = order === 'first' ? [...frame.rows].sort((a, b) => firstOf.get(a.code).localeCompare(firstOf.get(b.code)) || b.count - a.count) : frame.rows;
  const busiest = Math.max(1, ...days.map(date => spread.namedByDay[date] || 0));
  const top = frame.rows.slice(0, 3).map(row => `${row.name} ${formatCount(row.count)}`).join(', ');
  const viewName = preset ? preset[1].name : `Indonesia, diperbesar ${formatCount(Math.round(zoom * 10) / 10)} kali`;
  const mapLabel = `Peta ${viewName}: ${frame.rows.length} dari ${PROVINCES.length} ${kind.summary} sampai ${rangeLabel(day)}.${top ? ` Terbanyak: ${top}.` : ''}`;

  const go = index => { setPlaying(false); setPicked(days[Math.max(0, Math.min(last, index))]); };
  function togglePlay() {
    if (playing) return setPlaying(false);
    if (at >= last) setPicked(days[Math.max(0, days.indexOf(spread.provinces[0].first))]);   // start again where the first place appears
    return setPlaying(true);
  }
  // A click that ends a drag of the map is not a choice.
  const settled = () => { const was = dragged.current; dragged.current = false; return !was; };
  const choose = code => { if (settled()) { setSelected(code === selected ? '' : code); setShown(PAGE); } };
  // A pin that stands for several places opens them: the map comes closer around it. A single place chooses its province.
  function openPin(pin, face) {
    if (!settled()) return;
    if (pin.spots > 1 && zoom < MAX_ZOOM) { setBox(zoomBox(box, 2, [pin.x, pin.y])); setTip(null); }
    else { setSelected(face.code); setShown(PAGE); }
  }
  function hover(event, code, pin, face) {
    const area = frameRef.current?.getBoundingClientRect();
    if (area && !drag.current?.moved) setTip({ code, pin, face, x: event.clientX - area.left, y: event.clientY - area.top, flip: event.clientX - area.left > area.width * 0.62 });
  }
  // Dragging moves a map that is closer than the whole country (mouse and pen; a finger scrolls the page as usual).
  function startDrag(event) {
    dragged.current = false;
    if (event.pointerType !== 'touch' && event.button === 0 && zoom > 1) drag.current = { x: event.clientX, y: event.clientY, box, moved: false };
  }
  function moveDrag(event) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    start.moved = dragged.current = true;
    const scale = start.box[2] / event.currentTarget.clientWidth;
    setBox(panBox(start.box, -dx * scale, -dy * scale));
    setTip(null);
  }
  const endDrag = () => { drag.current = null; };
  // Largest first, so a small bubble is never hidden under a large neighbour.
  const marks = people ? [] : PROVINCES.map(province => ({ province, row: byCode.get(province.code) })).filter(mark => mark.row)
    .map(mark => ({ ...mark, radius: bubbleRadius(mark.row.count, most) / zoom })).sort((a, b) => b.row.count - a.row.count);
  const tipRow = tip && PROVINCES.find(province => province.code === tip.code), tipCount = tip && byCode.get(tip.code);
  const [left, upper, width, height] = box;
  const span = step => step.from === step.to ? formatCount(step.from) : `${formatCount(step.from)}–${formatCount(step.to)}`;

  return panel(<div className="rm">
    <div className="rm-time">
      <Button type="button" size="sm" variant="outline" disabled={last < 1} onClick={togglePlay}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? 'Jeda' : 'Putar'}</Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Hari sebelumnya" disabled={at <= 0} onClick={() => go(at - 1)}><ChevronLeft aria-hidden="true" /></Button>
      <div className="rm-track">
        <div className="rm-days" aria-hidden="true">{days.map((date, index) => <i key={date} data-past={index <= at ? '' : undefined} data-now={index === at ? '' : undefined}
          style={{ height: spread.namedByDay[date] ? Math.max(8, Math.round(spread.namedByDay[date] / busiest * 100)) + '%' : '2px' }} />)}</div>
        <input type="range" min="0" max={last} value={at} step="1" aria-label="Hari pada garis waktu" aria-valuetext={`${rangeLabel(day)}, hari ke-${at + 1} dari ${days.length}`} onChange={event => go(Number(event.target.value))} />
      </div>
      <Button type="button" size="icon" variant="ghost" aria-label="Hari berikutnya" disabled={at >= last} onClick={() => go(at + 1)}><ChevronRight aria-hidden="true" /></Button>
      <output className="rm-day">{rangeLabel(day)}</output>
    </div>
    <p className="rm-status" role="status" aria-live={playing ? 'off' : 'polite'}>Sampai {rangeLabel(day)}: {kind.status(frame)}, di {formatCount(frame.rows.length)} provinsi.{fresh.length > 0 && ` Baru hari ini: ${fresh.slice(0, 4).map(row => row.name).join(', ')}${fresh.length > 4 ? ` dan ${fresh.length - 4} lainnya` : ''}.`}</p>

    <div className="rm-body">
      <div className="rm-map" ref={frameRef} onMouseLeave={() => setTip(null)}>
        <div className="rm-canvas" data-movable={zoom > 1 ? '' : undefined} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerLeave={endDrag}>
          <svg className="rm-svg" viewBox={box.join(' ')} role="img" aria-label={mapLabel} preserveAspectRatio="xMidYMid meet">
            <g>{PROVINCES.map(province => { const row = byCode.get(province.code); return <path key={province.code} className="rm-province" data-state={row ? (row.fresh ? 'fresh' : 'named') : 'none'} data-shade={shadeStep(row?.count, most)}
              data-selected={selected === province.code ? '' : undefined} d={province.d} onClick={() => choose(province.code)} onMouseMove={event => hover(event, province.code)} />; })}</g>
            <g>{marks.map(({ province, row, radius }) => <g key={province.code} className="rm-mark" data-fresh={row.fresh ? '' : undefined} data-selected={selected === province.code ? '' : undefined} onClick={() => choose(province.code)} onMouseMove={event => hover(event, province.code)}>
              {row.fresh && <circle className="rm-halo" cx={province.x} cy={province.y} r={radius + 3 / zoom} />}
              <circle className="rm-bubble" cx={province.x} cy={province.y} r={radius} />
            </g>)}</g>
            {/* The counts sit above every bubble, so a small neighbour never covers the number of a large one. */}
            <g aria-hidden="true">{marks.filter(mark => mark.radius * zoom >= 9).map(({ province, row }) => <text key={province.code} className="rm-count" x={province.x} y={province.y} fontSize={9 / zoom} dy={3.2 / zoom}>{formatCount(row.count)}</text>)}</g>
          </svg>
          {/* Pins are for the eye and the mouse: the list beside the map says the same to a keyboard and a screen reader. */}
          {people && <div className="rm-pins" aria-hidden="true">{pins.flatMap(pin => { const offsets = faceOffsets(pin.faces.length); return pin.faces.map((face, index) => <span key={pin.key + ':' + index} className="rm-pin"
            data-selected={selected === face.code ? '' : undefined} style={{ left: (pin.x - left) / width * 100 + '%', top: (pin.y - upper) / height * 100 + '%', marginLeft: offsets[index][0], marginTop: offsets[index][1], zIndex: index ? 1 : 2 }}
            onClick={() => openPin(pin, face)} onMouseMove={event => hover(event, face.code, pin, face)}>
            <Face account={face} />{index === 0 && pin.total > pin.faces.length && <b className="rm-pin-count">{formatCount(pin.total)}</b>}</span>); })}</div>}
          <div className="rm-zoom" role="group" aria-label="Perbesaran peta">
            <Button type="button" size="icon" variant="outline" aria-label="Perbesar peta" disabled={zoom >= MAX_ZOOM} onClick={() => setBox(zoomBox(box, 2, POINTS[selected]))}><Plus aria-hidden="true" /></Button>
            <Button type="button" size="icon" variant="outline" aria-label="Perkecil peta" disabled={zoom <= 1} onClick={() => setBox(zoomBox(box, 0.5))}><Minus aria-hidden="true" /></Button>
          </div>
        </div>
        {tipRow && <div className="rm-tip" data-flip={tip.flip ? '' : undefined} style={{ left: tip.x, top: tip.y }}>
          {tip.pin ? <><strong>{tip.face.author}</strong><span>{tip.face.location}</span><span>{tip.pin.label}: {formatCount(tip.pin.total)} akun X</span>{tip.pin.spots > 1 && zoom < MAX_ZOOM && <span>klik untuk memperbesar</span>}</>
            : <><strong>{tipRow.name}</strong>{tipCount ? <><span>{formatCount(tipCount.count)} {kind.noun} sampai {short(day)}</span>{tipCount.today > 0 && <span>{tipCount.fresh ? (people ? 'akun pertama muncul hari ini' : 'pertama disebut hari ini') : `+${formatCount(tipCount.today)} hari ini`}</span>}</>
              : <span>{people ? 'belum ada akun' : 'belum disebut'}</span>}</>}
        </div>}
        <ul className="rm-legend" aria-label="Keterangan peta">
          <li className="rm-ramp"><span>Makin gelap, makin banyak {kind.noun}:</span>{shadeRanges(most).map(step => <span key={step.step}><i data-shade={step.step} aria-hidden="true" />{span(step)}</span>)}</li>
          <li><i data-state="fresh" aria-hidden="true" />Baru hari ini</li>
          <li><i data-state="none" aria-hidden="true" />{people ? 'Belum ada akun' : 'Belum disebut'}</li>
          {people ? <li><span className="rm-pin rm-pin-key" aria-hidden="true"><span className="rm-face" data-empty="">A</span><b className="rm-pin-count">12</b></span>Foto: akun dengan interaksi terbanyak di tempat itu. Angka: jumlah akun. Perbesar untuk memisahkan kota</li>
            : <li><svg viewBox="0 0 34 18" width="34" height="18" aria-hidden="true"><circle className="rm-legend-dot" cx="6" cy="12" r="4" /><circle className="rm-legend-dot" cx="22" cy="9" r="8" /></svg>Lingkaran: jumlah posting yang menyebut provinsi itu</li>}
          <li><i data-state="bar" aria-hidden="true" />Batang di garis waktu: {kind.bars}</li>
        </ul>
      </div>
      <aside className="rm-side" aria-label={people ? 'Provinsi menurut jumlah akun' : 'Provinsi yang disebut'}>
        <div className="rm-side-head"><strong>{formatCount(frame.rows.length)} dari {PROVINCES.length} provinsi</strong><Switch label="Urutan daftar" value={order} onChange={setOrder} options={[['count', 'Terbanyak'], ['first', 'Urutan muncul']]} /></div>
        {ranked.length ? <ol className="rm-rank">{ranked.map(row => <li key={row.code}><button type="button" aria-pressed={selected === row.code} aria-label={`${row.name}, ${formatCount(row.count)} ${kind.noun} sampai ${rangeLabel(day)}. Lihat ${kind.noun}nya.`} onClick={() => { dragged.current = false; choose(row.code); }}>
          <span className="rm-rank-name">{row.name}</span><span className="rm-rank-count">{formatCount(row.count)} {kind.noun}</span>
          <span className="rm-rank-since" data-fresh={row.fresh ? '' : undefined}>{row.fresh ? 'baru hari ini' : `sejak ${short(firstOf.get(row.code))}`}</span>
          <i className="rm-rank-bar" style={{ width: Math.max(2, row.count / most * 100) + '%' }} aria-hidden="true" />
        </button></li>)}</ol> : <p className="rm-hint">{people ? 'Belum ada akun X berlokasi profil' : 'Belum ada provinsi yang disebut'} sampai {rangeLabel(day)}.</p>}
      </aside>
    </div>

    <section className="rm-detail" aria-label={people ? 'Akun X di provinsi terpilih' : 'Posting yang menyebut provinsi terpilih'}>
      {!detail ? <p className="rm-hint">Pilih provinsi di peta atau di daftar untuk melihat {people ? 'akun dan lokasi yang mereka tulis' : 'nama tempat dan posting di baliknya'}.</p>
        : people ? <Accounts detail={detail} day={day} shown={shown} onMore={() => setShown(shown + PAGE)} /> : <Posts detail={detail} day={day} shown={shown} onMore={() => setShown(shown + PAGE)} />}
    </section>
    {note}
    <details className="tc-data"><summary>Lihat angka</summary><div className="tc-table"><table>
      <caption className="pu-sr">{people ? 'Akun X menurut provinsi di profilnya' : 'Provinsi yang disebut'} sampai {rangeLabel(day)}</caption>
      <thead><tr><th scope="col">Provinsi</th><th scope="col">{kind.columns[0]}</th><th scope="col">{kind.columns[1](day)}</th><th scope="col">{kind.columns[2]}</th></tr></thead>
      <tbody>{frame.rows.map(row => <tr key={row.code}><th scope="row">{row.name}</th><td>{short(firstOf.get(row.code))}</td><td>{formatCount(row.count)}</td><td>{namesOf.get(row.code)}</td></tr>)}</tbody>
    </table></div></details>
  </div>);
}
