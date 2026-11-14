/** Shared by the period chips and the one-line scope summary, so both always name the range the same way. */
export const wibDay = (offset = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() - offset * 86400000));
export const dayText = value => new Date(value + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** One-click ranges. Each ends today (WIB) and counts today as day one. */
export const presets = [['today', 'Hari ini', 0], ['7d', '7 hari', 6], ['30d', '30 hari', 29]];
export function activePreset(period, today = wibDay()) {
  if (!period.from && !period.to) return 'all';
  return presets.find(([, , days]) => period.to === today && period.from === wibDay(days))?.[0] || 'custom';
}
export function rangeText(period) {
  if (!period.from && !period.to) return 'Seluruh periode tersimpan';
  if (period.from === period.to) return dayText(period.from);
  return `${period.from ? dayText(period.from) : 'Awal data'} – ${period.to ? dayText(period.to) : 'Akhir data'}`;
}
/** Short name for the summary line: the preset's name when one matches, else the dates. */
export function periodLabel(period) {
  const key = activePreset(period);
  if (key === 'all') return 'Semua periode';
  return presets.find(([id]) => id === key)?.[1] || rangeText(period);
}
