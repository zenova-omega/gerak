import { PlatformLabel } from "./PlatformIcon";
import React, { useId, useMemo, useState } from 'react';
import { wordFrequency, matchingPosts, jakartaGrid, publicationHours } from '../../../lib/pulseInfographics.js';
import { safeSourceUrl } from '../../../lib/pulseData.js';
import JakartaReference from './JakartaReference';
import './InfographicsPanel.css';
import { PulseStat, PulseStatGrid } from '../../ui/PulseAnalytics';

export default function InfographicsPanel({ posts = [], locations = [], unknownCount }) {
  const [selected, setSelected] = useState('');
  const evidenceId = useId();
  const words = useMemo(() => wordFrequency(posts), [posts]);
  const grid = useMemo(() => jakartaGrid(locations, unknownCount), [locations, unknownCount]);
  const hours = useMemo(() => publicationHours(posts), [posts]);
  const active = words.terms.some(row => row.term === selected) ? selected : words.terms[0]?.term || '';
  const evidence = useMemo(() => matchingPosts(posts, active), [posts, active]);
  const maxWord = words.terms[0]?.count || 1;
  const maxHeat = Math.max(1, ...grid.cells.map(cell => cell.count));
  const maxHour = Math.max(1, ...hours.bins);
  return <section id="pulse-infographics" className="pi-panel" aria-label="Infografik bukti percakapan">
    <header className="pi-heading"><h2>Infografik percakapan</h2><p>Ringkasan sampel yang dimuat. Tidak mengestimasi jangkauan atau profil audiens.</p></header>
    <div className="pi-layout">
      <section className="pi-words" aria-label="Peta kata">
        <h3>Kata dalam percakapan</h3>
        <p>Maksimal 24 kata dari judul dan teks. Ukuran = jumlah posting yang memuat kata, bukan jumlah pengulangan.</p>
        <div className="pi-wordcloud" role="group" aria-label="Pilih kata untuk melihat sumber">
          {words.terms.map(row => <button key={row.term} type="button" className="pi-word" style={{ fontSize: row.fontSize }} aria-pressed={row.term === active} aria-label={`${row.term}: ${row.count} posting`} aria-controls={evidenceId} onClick={() => setSelected(row.term)}>{row.term}<small>{row.count}</small></button>)}
        </div>
        {!words.terms.length && <p className="pi-empty">Belum ada kata yang dapat dihitung dari judul atau teks posting.</p>}
        <p className="pi-note">{words.withText} dari {words.total} posting memiliki kata yang lolos penyaringan. Kata umum Indonesia, URL, dan handle dikeluarkan; tanpa stemming atau penyamaan makna.</p>
        <section className="pi-evidence" id={evidenceId} aria-label="Posting sumber kata terpilih">
          <h4>{active ? `Bukti kata “${active}”` : 'Bukti kata'}</h4>
          <p role="status">{evidence.rows.length} dari {evidence.count} posting cocok ditampilkan. Maksimal 10, mengikuti urutan data yang dimuat.</p>
          <ul>{evidence.rows.map((post, index) => <li className="pi-source" key={post.id ?? index}>
            {safeSourceUrl(post.url) ? <a href={safeSourceUrl(post.url)} target="_blank" rel="noopener noreferrer">{post.title || 'Posting tanpa judul — buka sumber'}</a> : <span>{post.title || 'Posting tanpa judul'} · Tautan tidak tersedia</span>}
            <small><PlatformLabel platform={post.platform} /> · {post.author || 'Penulis tidak tersedia'}</small>
          </li>)}</ul>
        </section>
      </section>

      <section className="pi-keywords" aria-label="Lima kata teratas">
        <h3>5 kata teratas</h3><p>Jumlah posting per kata. Satu posting dapat masuk beberapa kata.</p>
        <ol className="pi-keyword-list">{words.terms.slice(0, 5).map(row => <li key={row.term}>
          <button type="button" aria-pressed={row.term === active} aria-controls={evidenceId} onClick={() => setSelected(row.term)}><span>{row.term}</span><strong>{row.count}</strong></button>
          <div className="pi-bar-track" aria-hidden="true"><span style={{ width: `${row.count / maxWord * 100}%` }}/></div>
        </li>)}</ol>
        {!words.terms.length && <p className="pi-empty">Belum ada frekuensi kata.</p>}
        <p className="pi-note">Hitungan dokumen, bukan sentimen, dukungan, atau popularitas populasi.</p>
      </section>

      <section className="pi-geography" aria-label="Grid spasial Jakarta">
        <h3>Peta sumber · Jakarta</h3>
        <p>Lokasi sumber dengan koordinat dan asal data yang tercatat. Bukan lokasi audiens atau domisili akun.</p>
        {!grid.points.length && <div className="pi-empty pi-geo-empty"><strong>Peta sebaran belum tersedia</strong><span>Data yang dimuat belum memiliki koordinat sumber yang dapat dipetakan. Ini bukan berarti tidak ada percakapan di Jakarta.</span><p>Diperlukan geotag atau metadata lokasi berkoordinat beserta sumbernya. Penyebutan “Jakarta” dalam teks dan lokasi profil tidak otomatis menjadi titik sebaran.</p></div>}
        {!!grid.points.length && !grid.inside && <p className="pi-empty">Tidak ada koordinat sumber dalam batas grid Jakarta ini.</p>}
        {grid.inside > 0 && <><p>Grid 10 × 10 sel koordinat, bukan batas administratif Jakarta. Intensitas menunjukkan jumlah mention dengan koordinat tersedia.</p><svg className="pi-grid" viewBox="0 0 390 330" role="img" aria-label={`Grid sumber Jakarta: ${grid.inside} mention dalam grid. Utara di atas. Rincian provenance di bawah.`}>
          <text x="58" y="16">Utara ↑</text>
          {grid.cells.map((cell, index) => <rect className="pi-grid-cell" key={index} x={58 + cell.col * 30} y={30 + cell.row * 25} width="30" height="25" data-active={cell.count > 0 ? 'true' : undefined} fill={cell.count ? 'var(--pi-accent)' : 'var(--pi-soft)'} fillOpacity={cell.count ? .25 + .75 * cell.count / maxHeat : 1}>
            <title>{`${(-6.08 - cell.row * .03).toFixed(3)} hingga ${(-6.08 - (cell.row + 1) * .03).toFixed(3)}° lat; ${(106.68 + cell.col * .032).toFixed(3)} hingga ${(106.68 + (cell.col + 1) * .032).toFixed(3)}° lon: ${cell.count} mention`}</title>
          </rect>)}
          <JakartaReference/>
          <text x="4" y="36">−6.08°</text><text x="4" y="280">−6.38°</text>
          <text x="58" y="301">106.68° BT</text><text x="358" y="301" textAnchor="end">107.00° BT</text>
          <text x="58" y="322">0 = sel kosong · intensitas = jumlah mention sumber</text>
        </svg>
        <p className="pi-note">Garis referensi: <a href="https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/" target="_blank" rel="noopener noreferrer">geoBoundaries</a> / © OpenStreetMap contributors, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">ODbL</a>, 2017. Tampilan daratan; Kepulauan Seribu di luar grid. Bukan batas terkini terverifikasi.</p></>}
        <div className="pi-coverage-strip"><PulseStatGrid label="Cakupan data lokasi">
          <PulseStat label="Berkoordinat valid" value={grid.located ?? null}/>
          <PulseStat label="Dalam grid" value={grid.points.length ? grid.inside : 'Belum tersedia'}/>
          <PulseStat label="Di luar grid" value={grid.points.length ? grid.outside : 'Belum tersedia'}/>
          <PulseStat label="Lokasi tidak diketahui" value={grid.unknown ?? null}/>
        </PulseStatGrid></div>
        <p className="pi-note">Satuan: mention sesuai agregat lokasi sumber, bukan jumlah akun unik. Unknown mengikuti cakupan data lokasi dari induk; “—” berarti hitungan tidak tersedia. Tidak dihitung dari jumlah posting panel.</p>
        {grid.rejected > 0 && <p className="pi-note">{grid.rejected} baris lokasi tidak diplot: koordinat, provenance, atau jumlah mention tidak valid.</p>}
        {grid.points.length > 0 && <details className="pi-provenance"><summary>Koordinat dan provenance ({grid.points.length} baris)</summary><ul>{grid.points.map((point, index) => <li key={index}>
          <strong>{point.lat}, {point.lon}</strong> · {point.count} mention<br/>
          {safeSourceUrl(point.provenance) ? <a href={safeSourceUrl(point.provenance)} target="_blank" rel="noopener noreferrer">{point.provenance}</a> : <span>{point.provenance}</span>}
        </li>)}</ul></details>}
        <p className="pi-caution">Lokasi pada sumber atau penyebutan tempat bukan lokasi audiens maupun distribusi akun. Panel hanya memakai koordinat berprovenance yang tersedia pada data; tidak melakukan geocoding, verifikasi eksternal, atau menambahkan pusat wilayah.</p>
      </section>

      <section className="pi-hours" aria-label="Jam publikasi WIB">
        <h3>Kapan posting dipublikasikan?</h3><p>Jumlah posting per jam WIB, digabung dari semua tanggal dalam sampel.</p>
        {!hours.dated && <p className="pi-empty">Belum ada waktu publikasi dengan jam yang valid.</p>}
        <svg className="pi-hour-chart" viewBox="0 0 528 200" role="img" aria-label={`${hours.dated} posting dengan waktu publikasi. Distribusi 24 jam WIB; rincian angka di bawah.`}>
          <text x="8" y="16">{maxHour === 1 && !hours.dated ? 0 : maxHour} posting</text>
          <line x1="24" y1="162" x2="504" y2="162"/>
          {hours.bins.map((count, hour) => <g key={hour}>
            <rect className="pi-hour-bar" x={26 + hour * 20} y={162 - count / maxHour * 132} width="14" height={count / maxHour * 132}><title>{`${String(hour).padStart(2, '0')}:00 WIB: ${count} posting`}</title></rect>
            {hour % 3 === 0 || hour === 23 ? <text x={33 + hour * 20} y="184" textAnchor="middle">{String(hour).padStart(2, '0')}</text> : null}
          </g>)}
        </svg>
        <p className="pi-note">{hours.dated} / {hours.total} posting memiliki jam publikasi · {hours.unknown} tidak diketahui. Bukan jam pengambilan data atau estimasi reach. Timestamp tanpa zona mengikuti kontrak API UTC lalu dikonversi ke WIB; tanggal tanpa jam tidak dihitung.</p>
        <details className="pi-hour-table"><summary>Lihat hitungan 24 jam</summary><table><caption>Posting berdasarkan jam publikasi WIB</caption><thead><tr><th scope="col">Jam WIB</th><th scope="col">Posting</th></tr></thead><tbody>{hours.bins.map((count, hour) => <tr key={hour}><th scope="row">{String(hour).padStart(2, '0')}:00</th><td>{count}</td></tr>)}</tbody></table></details>
      </section>
    </div>
  </section>;
}
