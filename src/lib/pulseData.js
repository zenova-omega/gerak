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
export function pulseDate(value) {
  if (!value) return 'Waktu tidak tersedia';
  const iso = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Waktu tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';
}
export function validLocations(locations = []) {
  return locations.filter(row => typeof row.lat === 'number' && Number.isFinite(row.lat)
    && typeof row.lon === 'number' && Number.isFinite(row.lon)
    && Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180
    && typeof row.provenance === 'string' && row.provenance.trim().length > 0);
}
