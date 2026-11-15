import { hasClock as measuredClock, localDay, localTime, zone } from './pulseMeasures.js';

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
export function pulseError(error) {
  if (error?.status === 401) return 'Masuk sebagai admin untuk mengakses data Pulse. Sesi mungkin telah berakhir.';
  if (error?.status === 403) return 'Akses ditolak. Akun dengan izin admin diperlukan.';
  return error?.message || 'Tidak dapat menghubungi API Pulse. Periksa koneksi lalu coba lagi.';
}
export function observedAccounts(rows = [], metric = 'engagement') {
  return [...rows].sort((a, b) => (b[metric] ?? -1) - (a[metric] ?? -1) || (b.mentions ?? 0) - (a.mentions ?? 0));
}
export function allegationLabel(label = '') {
  return /penyadapan/i.test(label) && !/dugaan|allegation/i.test(label) ? `Dugaan · ${label}` : label;
}
export function providerResults(providers) {
  if (Array.isArray(providers)) return providers;
  return Object.entries(providers || {}).map(([provider, value]) => ({
    provider, ...(typeof value === 'string' ? { status: value } : value),
  }));
}
export function formatCount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('id-ID').format(value) : '—';
}
/** Whether a timestamp carries a time of day. Exactly midnight UTC is a calendar date the source gave without a clock
 * (most Instagram and TikTok posts): showing it as "07.00 WIB", or counting it in the 07 hour, would invent a time
 * nobody observed. A value that states its own zone and time is taken at its word. */
export function hasClock(value) {
  return typeof value === 'string' && measuredClock(value);
}
/** A publication time in the installation's zone, with its name; a date alone when the source gave no clock. */
export function pulseDate(value) {
  const day = value ? localDay(value) : null;
  if (!day) return 'Waktu tidak tersedia';
  if (!hasClock(value)) return pulseDay(day);
  return new Date(localTime(value)).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' ' + zone().name;
}
/** A calendar day ("2026-11-08", or the day part of a timestamp) written as "8 Nov 2026", the form `pulseDate` uses.
 * Anything that is not a date is returned unchanged, so a label such as "awal data" passes through. */
export function pulseDay(value) {
  const day = typeof value === 'string' && (localDay(value) || value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!day) return value || '';
  const date = new Date(Date.UTC(+day[1], +day[2] - 1, +day[3]));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { dateStyle: 'medium', timeZone: 'UTC' });
}
export function validLocations(locations = []) {
  return locations.filter(row => typeof row.lat === 'number' && Number.isFinite(row.lat)
    && typeof row.lon === 'number' && Number.isFinite(row.lon)
    && Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180
    && typeof row.provenance === 'string' && row.provenance.trim().length > 0);
}
