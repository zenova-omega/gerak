import React, { useId, useMemo, useState } from 'react';
import { wordFrequency, matchingPosts, publicationHours } from '../../../lib/pulseInfographics.js';
import { formatCount, hasClock, safeSourceUrl } from '../../../lib/pulseData.js';
import { sentimentDate } from '../../../lib/pulseSentiment.js';
import { allRange, rangeBounds, resolveRange, withinRange } from '../../../lib/pulseRange.js';
import { PulseRange } from '../../ui/PulseRange';
import './InfographicsPanel.css';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';
import AccountAvatar from './AccountAvatar';

const dayOf = post => post ? sentimentDate(post) : null;

/**
 * Words and publication hours of the posts in scope.
 * @param {{posts?: object[], ranged?: boolean}} props `ranged` gives each chart its own range filter. The old Command
 *   Center view passes false: it sits outside the PULSE shell, where the filter's styles do not load.
 */
export default function InfographicsPanel({ posts = [], ranged = true }) {
  const [selected, setSelected] = useState('');
  const [wordChoice, setWordChoice] = useState(allRange), [hourChoice, setHourChoice] = useState(allRange);
  const evidenceId = useId();
  // Words count every dated post; the hour chart only draws posts that carry a clock, so its days are the days of those posts.
  const wordBounds = useMemo(() => ranged ? rangeBounds(posts.map(dayOf)) : null, [posts, ranged]);
  const hourBounds = useMemo(() => ranged ? rangeBounds(posts.filter(post => hasClock(post?.published_at)).map(dayOf)) : null, [posts, ranged]);
  const wordPosts = useMemo(() => withinRange(posts, resolveRange(wordBounds, wordChoice), dayOf), [posts, wordBounds, wordChoice]);
  const hourPosts = useMemo(() => withinRange(posts, resolveRange(hourBounds, hourChoice), dayOf), [posts, hourBounds, hourChoice]);
  const words = useMemo(() => wordFrequency(wordPosts), [wordPosts]);
  const hours = useMemo(() => publicationHours(hourPosts), [hourPosts]);
  const active = words.terms.some(row => row.term === selected) ? selected : words.terms[0]?.term || '';
  const evidence = useMemo(() => matchingPosts(wordPosts, active), [wordPosts, active]);
  const maxWord = words.terms[0]?.count || 1;
  const maxHour = Math.max(1, ...hours.bins);
  return <section id="pulse-infographics" className="pi-panel" aria-label="Infografik bukti percakapan">
    <header className="pi-heading"><h2>Kata dan waktu</h2><p>Dari posting dalam cakupan. Bukan perkiraan jangkauan atau profil audiens.</p></header>
    <div className="pi-layout">
      <section className="pi-words" aria-label="Peta kata">
        <header className="pi-head"><div><h3>Kata dalam percakapan</h3>
          <p>Maksimal 24 kata dari judul dan teks. Ukuran = jumlah posting yang memuat kata, bukan jumlah pengulangan.</p></div>
          {wordBounds && <PulseRange chart="Kata dalam percakapan" bounds={wordBounds} value={wordChoice} onChange={setWordChoice} />}</header>
        <div className="pi-wordcloud" role="group" aria-label="Pilih kata untuk melihat sumber">
          {words.terms.map(row => <button key={row.term} type="button" className="pi-word" style={{ fontSize: row.fontSize }} aria-pressed={row.term === active} aria-label={`${row.term}: ${row.count} posting`} aria-controls={evidenceId} onClick={() => setSelected(row.term)}>{row.term}<small>{row.count}</small></button>)}
        </div>
        {!words.terms.length && <p className="pi-empty">Belum ada kata yang dapat dihitung dari judul atau teks posting.</p>}
        <p className="pi-note">{formatCount(words.withText)} dari {formatCount(words.total)} posting memiliki kata yang lolos penyaringan. Kata umum Indonesia, URL, dan handle dikeluarkan; tanpa stemming atau penyamaan makna.</p>
        <section className="pi-evidence" id={evidenceId} aria-label="Posting sumber kata terpilih">
          <h4>{active ? `Bukti kata “${active}”` : 'Bukti kata'}</h4>
          <p role="status">{formatCount(evidence.rows.length)} dari {formatCount(evidence.count)} posting cocok ditampilkan. Maksimal 10, mengikuti urutan data yang dimuat.</p>
          <ul>{evidence.rows.map((post, index) => <li className="pi-source" key={post.id ?? index}>
            {safeSourceUrl(post.url) ? <a href={safeSourceUrl(post.url)} target="_blank" rel="noopener noreferrer">{post.title || 'Posting tanpa judul — buka sumber'}</a> : <span>{post.title || 'Posting tanpa judul'} · Tautan tidak tersedia</span>}
            <small className="pu-account-line"><AccountAvatar size="xs" author={post.author} platform={post.platform} />{post.author || 'Penulis tidak tersedia'}</small>
          </li>)}</ul>
        </section>
      </section>

      <section className="pi-keywords" aria-label="Lima kata teratas">
        <header className="pi-head"><div><h3>5 kata teratas</h3><p>Jumlah posting per kata. Satu posting dapat masuk beberapa kata.</p></div>
          {wordBounds && <PulseRange chart="5 kata teratas" bounds={wordBounds} value={wordChoice} onChange={setWordChoice} captionOnly />}</header>
        <ol className="pi-keyword-list">{words.terms.slice(0, 5).map(row => <li key={row.term}>
          <button type="button" aria-pressed={row.term === active} aria-controls={evidenceId} onClick={() => setSelected(row.term)}><span>{row.term}</span><strong>{row.count}</strong></button>
          <div className="pi-bar-track" aria-hidden="true"><span style={{ width: `${row.count / maxWord * 100}%` }}/></div>
        </li>)}</ol>
        {!words.terms.length && <p className="pi-empty">Belum ada frekuensi kata.</p>}
        <p className="pi-note">Hitungan dokumen, bukan sentimen, dukungan, atau popularitas populasi.</p>
      </section>

      <section className="pi-hours" aria-label="Jam publikasi WIB">
        <header className="pi-head"><div><h3>Kapan posting dipublikasikan?</h3><p>Jumlah posting per jam WIB, digabung dari semua tanggal yang tercakup.</p></div>
          {hourBounds && <PulseRange chart="Jam publikasi" bounds={hourBounds} value={hourChoice} onChange={setHourChoice} />}</header>
        {!hours.dated && <p className="pi-empty">Belum ada waktu publikasi dengan jam yang valid.</p>}
        <svg className="pi-hour-chart" viewBox="0 0 528 200" role="img" aria-label={`${hours.dated} posting dengan waktu publikasi. Distribusi 24 jam WIB; rincian angka di bawah.`}>
          <text x="8" y="16">{maxHour === 1 && !hours.dated ? 0 : maxHour} posting</text>
          <line x1="24" y1="162" x2="504" y2="162"/>
          {hours.bins.map((count, hour) => <g key={hour}>
            <rect className="pi-hour-bar" x={26 + hour * 20} y={162 - count / maxHour * 132} width="14" height={count / maxHour * 132}><title>{`${String(hour).padStart(2, '0')}:00 WIB: ${count} posting`}</title></rect>
            {hour % 3 === 0 || hour === 23 ? <text x={33 + hour * 20} y="184" textAnchor="middle">{String(hour).padStart(2, '0')}</text> : null}
          </g>)}
        </svg>
        <p className="pi-note">{formatCount(hours.dated)} dari {formatCount(hours.total)} posting membawa jam publikasi{hours.unknown ? `; ${formatCount(hours.unknown)} hanya bertanggal atau tanpa waktu dan tidak dihitung` : ''}. Bukan jam pengambilan data atau estimasi reach. Jam dikonversi ke WIB.</p>
        <details className="pi-hour-table"><summary>Lihat hitungan 24 jam</summary><table><caption>Posting berdasarkan jam publikasi WIB</caption><thead><tr><th scope="col">Jam WIB</th><th scope="col">Posting</th></tr></thead><tbody>{hours.bins.map((count, hour) => <tr key={hour}><th scope="row">{String(hour).padStart(2, '0')}:00</th><td>{count}</td></tr>)}</tbody></table></details>
      </section>
    </div>
  </section>;
}
