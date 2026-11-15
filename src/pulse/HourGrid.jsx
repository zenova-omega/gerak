import { useState } from 'react';
import { hourGrid, postsInCell } from '../lib/pulseReadings';
import { zone } from '../lib/pulseMeasures';
import { formatCount } from '../lib/pulseData';
import { rangeLabel } from '../lib/pulseRange';
import './ds/hour-grid.css';

const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const two = value => String(value).padStart(2, '0');
const dayText = day => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
/** A row's name in a heading ("Sel 10 Nov", "Selasa") and in a sentence ("Selasa, 10 Nov", "Selasa"). */
const rowHead = row => (row.day ? `${WEEKDAYS[row.weekday].slice(0, 3)} ${dayText(row.day)}` : WEEKDAYS[row.weekday]);
const rowName = row => (row.day ? `${WEEKDAYS[row.weekday]}, ${dayText(row.day)}` : WEEKDAYS[row.weekday]);

/** The steps of the one hue: as many as the largest cell allows, four at most. A cell with posts is never step 0. */
function steps(max) {
  const count = Math.min(4, max);
  return { level: value => (value ? Math.ceil(value / max * count) : 0),
    ranges: Array.from({ length: count }, (_, index) => [Math.floor(index * max / count) + 1, Math.floor((index + 1) * max / count)]) };
}

/**
 * `hour_grid_v1` as a picture: when the posts were published, by day (or weekday) and hour of the installation's
 * zone. One hue from soft to the accent; the key gives each step in numbers, every cell names its count, and the
 * busiest cell is said in a sentence. Posts without a clock and without a date are counted under the grid.
 * With `onOpen(title, posts)` a cell opens its posts, and the arrow keys move between cells from one tab stop.
 * @param {{posts: object[], onOpen?: (title: string, posts: object[]) => void}} props posts already scoped to the
 *   project's period and platforms (and to the chart's own range)
 */
export default function HourGrid({ posts = [], onOpen }) {
  const grid = hourGrid(posts), name = zone().name;
  const [at, setAt] = useState(null);
  const left = [grid.date_only > 0 && `${formatCount(grid.date_only)} posting hanya bertanggal`, grid.undated > 0 && `${formatCount(grid.undated)} tanpa tanggal`].filter(Boolean).join(' dan ');
  if (!grid.mode) {
    return <div className="phg"><p className="phg-empty">{grid.total
      ? `Tidak ada posting yang membawa jam terbit pada pilihan ini: ${left}. Sumber seperti Instagram dan TikTok sering hanya memberi tanggal.`
      : 'Belum ada posting pada pilihan ini.'}</p></div>;
  }
  const scale = steps(grid.max), byDay = grid.mode === 'days';
  const peaks = grid.rows.flatMap((row, index) => row.cells.map((count, hour) => ({ row, index, hour, count }))).filter(cell => cell.count === grid.max);
  const [peak] = peaks, stop = at && grid.rows[at[0]] ? at : [peak.index, peak.hour];
  const title = (row, hour) => `${rowName(row)}, pukul ${two(hour)}.00`;
  const open = (row, hour, count) => { if (count) onOpen(`${title(row, hour)} ${name}`, postsInCell(posts, row, hour)); };
  // One tab stop for the whole grid: the arrow keys, Home and End move between cells.
  function move(event) {
    const [row, hour] = stop;
    const next = { ArrowLeft: [row, hour - 1], ArrowRight: [row, hour + 1], ArrowUp: [row - 1, hour], ArrowDown: [row + 1, hour], Home: [row, 0], End: [row, 23] }[event.key];
    if (!next || next[0] < 0 || next[0] >= grid.rows.length || next[1] < 0 || next[1] > 23) return;
    event.preventDefault();
    setAt(next);
    event.currentTarget.querySelector(`[data-at="${next[0]}-${next[1]}"]`)?.focus();
  }
  return <div className="phg">
    <p className="phg-says">Paling ramai: <b>{rowName(peak.row)} pukul {two(peak.hour)}.00 {name}</b>, <b>{formatCount(peak.count)}</b> posting{peaks.length > 1 && `, sama dengan ${formatCount(peaks.length - 1)} waktu lain`}.
      {byDay ? ' Tiap baris satu tanggal.' : ` Tiap baris menggabungkan hari yang sama dari ${rangeLabel(grid.from, grid.to)}.`}{onOpen && ' Pilih sel untuk melihat postingnya.'}</p>
    <div className="phg-scroll" tabIndex={onOpen ? undefined : 0} role="group" aria-label="Kisi hari dan jam terbit. Dapat digulir ke samping.">
      <table className="phg-grid" onKeyDown={onOpen ? move : undefined}>
        <caption className="pu-sr">Jumlah posting per {byDay ? 'tanggal' : 'hari'} dan jam terbit ({name})</caption>
        <thead><tr><th scope="col" className="phg-row">{byDay ? 'Tanggal' : 'Hari'}</th>
          {HOURS.map(hour => <th scope="col" key={hour}>{hour % 3 === 0 ? two(hour) : <span className="pu-sr">{two(hour)}</span>}</th>)}
          <th scope="col" className="phg-sum">Jumlah</th></tr></thead>
        <tbody>{grid.rows.map((row, index) => <tr key={row.day ?? row.weekday}>
          <th scope="row" className="phg-row" title={rowName(row)}>{rowHead(row)}</th>
          {row.cells.map((count, hour) => {
            const label = `${title(row, hour)}: ${formatCount(count)} posting`;
            return <td key={hour}>{onOpen
              ? <button type="button" className="phg-cell" data-level={scale.level(count)} data-at={`${index}-${hour}`} aria-label={label} title={label} aria-disabled={count ? undefined : true}
                tabIndex={stop[0] === index && stop[1] === hour ? 0 : -1} onFocus={() => setAt([index, hour])} onClick={() => open(row, hour, count)} />
              : <span className="phg-cell" data-level={scale.level(count)} role="img" aria-label={label} title={label} />}</td>;
          })}
          <td className="phg-sum">{formatCount(row.total)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="phg-foot">
      <div className="phg-key"><span aria-hidden="true">Posting per sel</span>
        <ul className="phg-legend" aria-label="Arti warna sel, dalam jumlah posting">
          <li><i data-level="0" aria-hidden="true" />0</li>
          {scale.ranges.map(([from, to], index) => <li key={from}><i data-level={index + 1} aria-hidden="true" />{from === to ? formatCount(from) : `${formatCount(from)}–${formatCount(to)}`}</li>)}
        </ul></div>
      <p className="phg-note">{formatCount(grid.clocked)} dari {formatCount(grid.total)} posting membawa jam terbit.{left && ` ${left} tidak masuk kisi.`} Jam terbit, bukan jam pengambilan data.</p>
    </div>
  </div>;
}
