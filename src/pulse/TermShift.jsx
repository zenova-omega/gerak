import { PulseButton } from '../components/ui/PulseUI';
import { formatCount } from '../lib/pulseData';
import { rangeLabel } from '../lib/pulseRange';
import './ds/term-shift.css';

const number = value => value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
/** A share of the period's posts in words. A share that exists never prints as 0%. */
const share = value => (value > 0 && value < 0.0005 ? '<0,1%' : number(value * 100) + '%');
const points = value => (Math.abs(value) < 0.05 ? 'kurang dari 0,1' : number(Math.abs(value)));

function Group({ label, heading, rows, verb, side, largest, active, onSelect, evidenceId }) {
  if (!rows.length) return null;
  return <section className="pts-group" aria-label={label}>
    <h4>{heading}</h4>
    <ol className="pts-rows">{rows.map(row => {
      const moved = `${verb} ${points(row.shift)} poin`, between = `dari ${share(row.share_before)} ke ${share(row.share_now)}`;
      const width = `${Math.round(Math.abs(row.shift) / largest * 5000) / 100}%`;
      return <li key={row.term}>
        <button type="button" className="pts-row" aria-pressed={row.term === active} aria-controls={evidenceId} onClick={() => onSelect(row.term)}
          aria-label={`${row.term}: ${moved}, ${between} posting. ${formatCount(row.now)} posting periode ini, ${formatCount(row.before)} sebelumnya`}>
          <span className="pts-term" title={row.term}>{row.term}</span>
          <span className="pts-track" aria-hidden="true"><i className="pts-bar" data-side={side} style={side === 'up' ? { left: '50%', width } : { right: '50%', width }} /></span>
          <span className="pts-figures"><b>{moved}</b><small>{between}</small></span>
        </button>
      </li>;
    })}</ol>
  </section>;
}

/**
 * `term_shift_v1` as a picture, the second view of the word panel: the terms whose share of the posts moved most
 * against the period before, as bars right (rose) and left (fell) of one centre line on one scale, with both shares
 * written beside each bar. It says so, in words, when there is nothing to compare: no chosen period, the period
 * before still loading or not loadable, or no post in it.
 * @param {{
 *   reading: {posts_now: number, posts_before: number, rising: object[], falling: object[]} | null,
 *   shift: {period: {from: string, to: string}|null, before: {from: string, to: string}|null, posts: object[]|null, status: string, retry?: () => void},
 *   total: number, active: string, onSelect: (term: string) => void, evidenceId: string,
 * }} props `reading` is `termShift(posts, shift.posts)`; `total` the posts of the period on screen
 */
export default function TermShift({ reading, shift, total, active, onSelect, evidenceId }) {
  const before = shift.before ? rangeLabel(shift.before.from, shift.before.to) : '';
  if (!shift.before) return <div className="pts"><p className="pts-empty"><strong>Belum ada pembanding</strong>Pilih periode di bilah project, misalnya 7 hari.</p></div>;
  if (shift.status === 'error') return <div className="pts"><div className="pts-empty" role="alert"><strong>Posting {before} belum dapat dimuat</strong>Tanpa itu tidak ada pembanding.{shift.retry && <div><PulseButton size="sm" onClick={shift.retry}>Coba lagi</PulseButton></div>}</div></div>;
  if (shift.status !== 'ready' || !shift.posts) return <div className="pts"><p className="pts-empty pts-wait" role="status">Memuat {before}…</p></div>;
  const versus = <p className="pts-versus"><b>{rangeLabel(shift.period.from, shift.period.to)}</b> ({formatCount(total)} posting) dibanding <b>{before}</b> ({formatCount(shift.posts.length)} posting)</p>;
  if (!reading) return <div className="pts">{versus}<p className="pts-empty">{total ? `Tidak ada posting pada ${before}.` : 'Belum ada posting.'}</p></div>;
  const rows = [...reading.rising, ...reading.falling];
  if (!rows.length) return <div className="pts">{versus}<p className="pts-empty"><strong>Belum ada kata yang porsinya berubah</strong>Minimal 5 posting memuat kata itu.</p></div>;
  const largest = Math.max(...rows.map(row => Math.abs(row.shift)));
  const shared = { largest, active, onSelect, evidenceId };
  return <div className="pts">
    {versus}
    <p className="pts-axis" aria-hidden="true"><span><span>turun</span><span>naik</span></span></p>
    <Group label="Kata yang naik" heading="Naik" verb="naik" side="up" rows={reading.rising} {...shared} />
    <Group label="Kata yang turun" heading="Turun" verb="turun" side="down" rows={reading.falling} {...shared} />
  </div>;
}
