// The range filter every chart shares (PulseRange.jsx): 3 hari, 7 hari, 1 bulan, Semua, Rentang.
// Pure: nothing here reads the clock. A preset is anchored on the last day that has data in the chart, not on today,
// so a quiet weekend after the last post never leaves an empty chart.

/** The choices, in the order they are shown. `days` is how far a preset reaches back, counting its last day as day one. */
export const rangeChoices = [
  { key: '3', label: '3 hari', days: 3 },
  { key: '7', label: '7 hari', days: 7 },
  { key: '30', label: '1 bulan', days: 30 },
  { key: 'all', label: 'Semua' },
  { key: 'custom', label: 'Rentang' },
];
/** Where every chart starts: everything it was given. */
export const allRange = Object.freeze({ key: 'all' });

/** A real calendar day written YYYY-MM-DD. "2026-02-30" parses to 2 March, so the day is written back and compared. */
function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
const addDays = (date, count) => new Date(Date.parse(date + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);

/**
 * What a chart can be narrowed to.
 * @param {Iterable<string|null|undefined>} dates the day (YYYY-MM-DD, WIB) of every row or post the chart draws; anything else is skipped
 * @param {{from?: string, to?: string}} extent the days the chart draws under "Semua" when that is wider than its data
 *   (the trend chart draws the whole project period, quiet days as zero)
 * @returns {{first: string, last: string, days: number, from: string, to: string} | null} `first` and `last` are the first and
 *   last day with data, `days` how many days have data, `from` and `to` what "Semua" covers. Null without a dated row.
 */
export function rangeBounds(dates = [], extent = {}) {
  const seen = new Set();
  let first = '', last = '';
  for (const date of dates) {
    if (!validDay(date)) continue;
    seen.add(date);
    if (!first || date < first) first = date;
    if (!last || date > last) last = date;
  }
  if (!first) return null;
  return { first, last, days: seen.size,
    from: validDay(extent?.from) && extent.from < first ? extent.from : first,
    to: validDay(extent?.to) && extent.to > last ? extent.to : last };
}

/** Why a custom range cannot be applied, or '' when it can. */
export function customRangeError(range, bounds) {
  const from = range?.from, to = range?.to;
  if (!validDay(from) || !validDay(to)) return 'Isi tanggal mulai dan tanggal akhir.';
  if (from > to) return 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir.';
  if (bounds && (from < bounds.first || to > bounds.last)) return `Data grafik ini hanya mencakup ${rangeLabel(bounds.first, bounds.last)}. Pilih tanggal di dalamnya.`;
  return '';
}

/**
 * The days a choice covers in one chart.
 * @param {ReturnType<typeof rangeBounds>} bounds
 * @param {{key: string, from?: string, to?: string}} choice a custom range that cannot be applied counts as "Semua"
 * @returns {{key: string, from: string, to: string} | null} null when the chart has no dated data
 */
export function resolveRange(bounds, choice = allRange) {
  if (!bounds) return null;
  const preset = rangeChoices.find(row => row.days && row.key === choice?.key);
  if (preset) {
    const start = addDays(bounds.last, -(preset.days - 1));
    return { key: preset.key, from: start < bounds.first ? bounds.first : start, to: bounds.last };
  }
  if (choice?.key === 'custom' && !customRangeError(choice, bounds)) return { key: 'custom', from: choice.from, to: choice.to };
  return { key: 'all', from: bounds.from, to: bounds.to };
}

/**
 * The rows inside a resolved range. "Semua" (or no range at all) returns the list itself, undated rows included,
 * because it means everything the chart was given.
 * @template T
 * @param {T[]} rows
 * @param {{key: string, from: string, to: string} | null} range from `resolveRange`
 * @param {(row: T) => string|null|undefined} dayOf the row's day; defaults to its `date`
 * @returns {T[]}
 */
export function withinRange(rows = [], range, dayOf = row => row.date) {
  if (!range || range.key === 'all') return rows;
  return rows.filter(row => { const day = dayOf(row); return Boolean(day) && day >= range.from && day <= range.to; });
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const part = date => ({ day: Number(date.slice(8)), month: months[Number(date.slice(5, 7)) - 1], year: date.slice(0, 4) });
/** "14 Nov 2026", "12–14 Nov 2026", "30 Okt – 2 Nov 2026", "28 Des 2025 – 3 Jan 2026". */
export function rangeLabel(from, to = from) {
  if (!validDay(from) || !validDay(to)) return '';
  const a = part(from), b = part(to);
  if (from === to) return `${b.day} ${b.month} ${b.year}`;
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
  return a.month === b.month ? `${a.day}–${b.day} ${b.month} ${b.year}` : `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
}
