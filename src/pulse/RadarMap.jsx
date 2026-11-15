import { useState } from 'react';
import shapes from './indonesia-provinces.json';
import { formatCount } from '../lib/pulseData';
import { issueFootprint, provinceCounts, provinceName, provinceRows, shadeOf, shadeRanges } from '../lib/pulseRadar';
import { PulseButton } from '../components/ui/PulseUI';
import './ds/radar-map.css';

const [, , WIDTH, HEIGHT] = shapes.viewBox;
const centre = Object.fromEntries(shapes.provinces.map(province => [province.code, [province.x, province.y]]));
/** What the map is drawn from, and what it cannot know. Shown as the method note of the card that holds the map. */
export const MAP_SOURCE = 'Peta memakai pencarian populer per provinsi dan tempat yang disebut berita. X, TikTok, dan Instagram tidak memberi lokasi.';
/** One issue's shade for a province: by how many searches it has there. */
const searchShade = searches => searches >= 2000 ? 3 : searches >= 1000 ? 2 : searches > 0 ? 1 : 0;

/**
 * Indonesia by province, for Beranda's issue radar.
 * Without `selectedIssue` a province is shaded by how many of `issues` are loud there. With it, only that issue is
 * drawn: its provinces by their searches, and a pin on each place its coverage names.
 * `provincesRead` lists the provinces whose list was read in this refresh (null: nothing is known to be missing).
 * `onProvince(code)` is called with '' to return to the whole country.
 */
export default function RadarMap({ issues = [], selectedIssue = null, province = '', provincesRead = null, onProvince = () => {} }) {
  const [tip, setTip] = useState(null);
  const read = Array.isArray(provincesRead) ? new Set(provincesRead) : null;
  const counts = provinceCounts(issues), most = Math.max(0, ...Object.values(counts));
  const footprint = selectedIssue ? issueFootprint(selectedIssue) : null;
  const searched = footprint ? Object.fromEntries(footprint.regions.map(region => [region.code, region.searches])) : null;

  function state(code) {
    const name = provinceName(code);
    if (searched) {
      const searches = searched[code] || 0;
      // A province whose list was not read is unknown for this issue too, never a "no".
      if (!searches && read && !read.has(code)) return { shade: 'unread', label: `${name}: daftar tidak terbaca` };
      return { shade: String(searchShade(searches)), label: searches ? `${name}: ${formatCount(searches)}+ pencarian` : `${name}: tidak masuk pencarian populer` };
    }
    const count = counts[code] || 0;
    if (!count && read && !read.has(code)) return { shade: 'unread', label: `${name}: daftar tidak terbaca` };
    return { shade: String(shadeOf(count, most)), label: count ? `${name}: ${count} isu ramai` : `${name}: tidak ada isu dari daftar ini` };
  }
  const choose = code => onProvince(code === province ? '' : code);
  const showTip = (code, label, x, y) => setTip({ code, label, left: `${x / WIDTH * 100}%`, top: `${y / HEIGHT * 100}%`, flip: x > WIDTH * .7 });
  const anyUnread = Boolean(read) && shapes.provinces.some(shape => !read.has(shape.code) && !(searched ? searched[shape.code] : counts[shape.code]));
  const nothing = searched ? !footprint.regions.length && !footprint.pins.length : !Object.keys(counts).length;
  const rows = provinceRows(issues, provincesRead);

  return <section className="rdm" aria-label="Peta isu per provinsi">
    <div className="rdm-head">
      <p className="rdm-caption">{selectedIssue ? <>Sebaran isu: <strong>{selectedIssue.title}</strong></> : province ? <>Provinsi dipilih: <strong>{provinceName(province)}</strong></> : 'Pilih provinsi untuk melihat isu di sana.'}</p>
      {province && <PulseButton size="sm" onClick={() => onProvince('')}>Seluruh Indonesia</PulseButton>}
    </div>
    <div className="rdm-frame" onPointerLeave={() => setTip(null)}>
      <svg className="rdm-svg" viewBox={shapes.viewBox.join(' ')} role="group" aria-label="Peta Indonesia per provinsi">
        <defs><pattern id="rdm-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect className="rdm-hatch-ground" width="5" height="5" /><line className="rdm-hatch-line" x1="0" y1="0" x2="0" y2="5" /></pattern></defs>
        {shapes.provinces.map(shape => {
          const { shade, label } = state(shape.code);
          return <path key={shape.code} className="rdm-province" d={shape.d} data-shade={shade} role="button" tabIndex={0} aria-label={label} aria-pressed={province === shape.code}
            onClick={() => choose(shape.code)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(shape.code); } }}
            onPointerEnter={() => showTip(shape.code, label, shape.x, shape.y)} onFocus={() => showTip(shape.code, label, shape.x, shape.y)} onBlur={() => setTip(null)} />;
        })}
        {footprint?.pins.map(pin => {
          const [x, y] = pin.point || centre[pin.code] || [];
          return Number.isFinite(x) ? <circle key={pin.place} className="rdm-pin" cx={x} cy={y} r="4.2" aria-hidden="true" /> : null;
        })}
      </svg>
      {tip && <p className="rdm-tip" style={{ left: tip.left, top: tip.top }} data-flip={tip.flip ? '' : undefined} role="presentation">{tip.label}</p>}
    </div>
    {nothing && <p className="rdm-empty">{searched ? 'Isu ini tidak masuk pencarian populer provinsi mana pun, dan liputannya tidak menyebut tempat.' : 'Belum ada isu yang masuk pencarian populer provinsi pada daftar ini.'}</p>}
    {footprint?.pins.length > 0 && <p className="rdm-places">Tempat yang disebut: {footprint.pins.map(pin => pin.place).join(', ')}</p>}
    <ul className="rdm-legend" aria-label="Keterangan peta">
      {searched ? <>
        <li className="rdm-ramp"><span>Pencarian di provinsi:</span><span><i data-shade="1" />di bawah 1.000</span><span><i data-shade="2" />1.000 lebih</span><span><i data-shade="3" />2.000 lebih</span></li>
        <li><i className="rdm-pin-key" />tempat yang disebut berita</li>
        {anyUnread && <li><i data-shade="unread" />daftar tidak terbaca</li>}
      </> : <>
        {most > 0 && <li className="rdm-ramp"><span>Isu yang ramai di provinsi:</span>{shadeRanges(most).map(([step, label]) => <span key={step}><i data-shade={step} />{label}</span>)}</li>}
        {anyUnread && <li><i data-shade="unread" />daftar tidak terbaca</li>}
      </>}
    </ul>
    <details className="rdm-data"><summary>Lihat angka</summary>
      <div className="rdm-table"><table>
        <thead><tr><th scope="col">Provinsi</th><th scope="col">{searched ? 'Pencarian' : 'Isu ramai'}</th>{!searched && <th scope="col">Isu teratas</th>}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.code}><th scope="row">{row.name}</th>
          {searched ? <td>{searched[row.code] ? formatCount(searched[row.code]) + '+' : row.read ? 'tidak masuk' : 'tidak terbaca'}</td>
            : <><td>{!row.count && !row.read ? 'tidak terbaca' : row.count}</td><td>{row.top || ''}</td></>}
        </tr>)}</tbody>
      </table></div>
    </details>
  </section>;
}
