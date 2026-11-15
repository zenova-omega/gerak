// The waiting screen of a new project: about three minutes during which every source is asked for everything it has
// for the project's range of days. These helpers turn the server's progress into what the screen shows.
export const WARMUP_SECONDS = 180;
const order = ['news', 'x', 'instagram', 'tiktok', 'youtube', 'reddit'];

/** One row per chosen platform, in a fixed order. `progress` is `lookback.progress` from the server, or null before
 * the first answer. A platform the server has not listed yet is waiting. */
export function warmupRows(platforms, progress) {
  const known = progress?.platforms || {};
  return order.filter(platform => platforms.includes(platform)).map(platform => {
    const row = known[platform];
    const state = !row ? 'waiting' : row.state === 'done' ? (row.stopped ? 'stopped' : 'done') : row.state === 'running' ? 'running' : 'waiting';
    return { platform, state, fetched: Number.isFinite(row?.fetched) ? row.fetched : 0 };
  });
}

/** Totals for the screen. `ready` turns true when every source has settled, when the server says the pull has finished,
 * or when the time is up: the project opens then, and collection goes on in the background. */
export function warmupSummary(rows, elapsedSeconds, finished = false) {
  const settled = rows.filter(row => row.state === 'done' || row.state === 'stopped').length;
  const seconds = Math.max(0, Math.min(WARMUP_SECONDS, Math.floor(elapsedSeconds)));
  return {
    posts: rows.reduce((sum, row) => sum + row.fetched, 0), settled, total: rows.length,
    share: seconds / WARMUP_SECONDS, clock: `${Math.floor(seconds / 60)}.${String(seconds % 60).padStart(2, '0')}`,
    ready: finished || (rows.length > 0 && settled === rows.length) || elapsedSeconds >= WARMUP_SECONDS,
  };
}

/** What one row says, in plain words. Counts are posts the source returned, before duplicates are dropped. */
export function warmupText(row, count = value => String(value)) {
  if (row.state === 'done') return row.fetched ? `Selesai · ${count(row.fetched)} posting` : 'Selesai · tidak ada posting pada rentang ini';
  if (row.state === 'stopped') return row.fetched ? `Terhenti · ${count(row.fetched)} posting; dilanjutkan sesuai jadwal` : 'Belum berhasil; dicoba lagi sesuai jadwal';
  if (row.state === 'running') return row.fetched ? `Mengambil… ${count(row.fetched)} posting sejauh ini` : 'Mengambil…';
  return 'Menunggu giliran';
}
