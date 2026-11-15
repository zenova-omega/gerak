import { formatCount, pulseDate } from './pulseData.js';
import { localDay, readTime } from './pulseMeasures.js';

// Inbox page transitions are guarded while acknowledgement/config writes run.
export function canChangeAlertPage(page,total,busy,delta) {
  const next=page+delta;
  return !busy && next>=0 && next<Math.max(1,Math.ceil(total/50));
}

/** The sources a project can collect, in reading order. `schedule` is the key the schedule API takes and `channel`
 * the collection channel several sources share. Both are for requests only and are never shown to a person. */
export const monitorSources = [
  { platform: 'news', label: 'Berita', schedule: 'rss', channel: 'rss' },
  { platform: 'x', label: 'X', schedule: 'social', channel: 'social' },
  { platform: 'instagram', label: 'Instagram', schedule: 'instagram', channel: 'social' },
  { platform: 'tiktok', label: 'TikTok', schedule: 'tiktok', channel: 'social' },
  { platform: 'youtube', label: 'YouTube', schedule: 'youtube', channel: 'youtube' },
  { platform: 'reddit', label: 'Reddit', schedule: 'reddit', channel: 'social' },
];
/** Collection that runs beside the sources, for every project. `paid` asks before it is switched on. */
export const monitorExtras = [
  { channel: 'comments', label: 'Komentar posting', paid: true },
  { channel: 'profiles', label: 'Foto kanal dan logo media', paid: false },
  { channel: 'profiles_x', label: 'Foto profil akun X', paid: true },
  { channel: 'profiles_ig', label: 'Foto profil akun Instagram', paid: true },
  { channel: 'profiles_tt', label: 'Foto profil akun TikTok', paid: true },
  { channel: 'radar', label: 'Radar isu Indonesia', paid: true },
  { channel: 'radar_social', label: 'Radar: X, TikTok, Instagram', paid: true },
];
/** What a person can pick as "how often". Minutes; the server accepts 5 to 1440. */
export const intervalChoices = [15, 30, 60, 120, 180, 360, 720, 1440];
export const defaultInterval = platform => ['instagram', 'tiktok', 'reddit'].includes(platform) ? 1440 : 60;

// An instant as the calculation dictionary reads it (a time without a zone is UTC); NaN when it cannot be read.
const instant = value => readTime(value) ?? NaN;
const latest = values => values.filter(value => Number.isFinite(instant(value))).sort((a, b) => instant(b) - instant(a))[0] || null;
const earliest = values => values.filter(value => Number.isFinite(instant(value))).sort((a, b) => instant(a) - instant(b))[0] || null;

/** "Tiap 2 jam", "Tiap 30 menit", "Tiap hari". Null when there is no interval to state. */
export function intervalText(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes % 1440 === 0) return minutes === 1440 ? 'Tiap hari' : `Tiap ${formatCount(minutes / 1440)} hari`;
  if (minutes % 60 === 0) return `Tiap ${formatCount(minutes / 60)} jam`;
  if (minutes > 60) return `Tiap ${formatCount(Math.floor(minutes / 60))} jam ${formatCount(minutes % 60)} menit`;
  return `Tiap ${formatCount(minutes)} menit`;
}

/** Share of the scheduled collections that succeeded. Null when none was scheduled: no figure, never 0%.
 * 100% is kept for "all of them"; one success out of many never rounds down to 0%. */
export function runShare(runs) {
  const planned = runs?.planned || 0;
  if (planned <= 0) return null;
  const succeeded = Math.min(planned, runs.succeeded || 0), failed = runs.failed || 0;
  const percent = succeeded === planned ? 100 : succeeded === 0 ? 0 : Math.min(99, Math.max(1, Math.round(succeeded / planned * 100)));
  return { planned, succeeded, failed, waiting: Math.max(0, planned - succeeded - failed), percent };
}

/** The calendar day a post was published on (day_v1 in the calculation dictionary). */
export function publishedDay(value) {
  return typeof value === 'string' ? localDay(value) : null;     // day_v1: the installation's zone; a date without a clock stays that date
}

/** First to last publication day of the stored posts: `{from, to, days, text}`. Null when no post carries a date. */
export function postSpan(first, last) {
  const from = publishedDay(first), to = publishedDay(last);
  if (!from || !to) return null;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  return { from, to, days, text: from === to ? pulseDate(from) : `${pulseDate(from)} sampai ${pulseDate(to)}` };
}

/** Where a span sits between two days, as percentages for a range mark: `{start, width}`. Null when it cannot be placed. */
export function spanPlacement(span, axis) {
  if (!span || !axis) return null;
  const from = Date.parse(axis.from), to = Date.parse(axis.to) + 86400000, whole = to - from;
  if (!(whole > 0)) return null;
  const start = Math.max(0, Math.min(100, (Date.parse(span.from) - from) / whole * 100));
  const end = Math.max(start, Math.min(100, (Date.parse(span.to) + 86400000 - from) / whole * 100));
  return { start, width: end - start };
}

const stopReasons = {
  authentication_failed: 'Akses ke sumber data ditolak. Administrator perlu memeriksanya.',
  not_configured: 'Sumber data belum dihubungkan. Administrator perlu memeriksanya.',
  access_or_quota_restricted: 'Saldo sumber data habis. Pengumpulan lanjut sendiri setelah saldo diisi.',
  plan_restricted: 'Saldo sumber data habis. Pengumpulan lanjut sendiri setelah saldo diisi.',
};

/** Whether a source is being collected, in one word a person can act on, with the reason when it is not.
 * A stop that carries an end time lifts by itself and reads as a wait; one without waits for a person. */
export function sourceStatus(schedule, channel) {
  if (!schedule) return { key: 'manual', tone: 'neutral', label: 'Tanpa jadwal' };
  if (!schedule.enabled) return { key: 'paused', tone: 'neutral', label: 'Dijeda' };
  if (channel?.daily_limit === 0) return { key: 'off', tone: 'warning', label: 'Dimatikan', reason: 'Sumber ini dimatikan untuk semua project.' };
  if (channel?.blocked_reason && channel.blocked_until) return { key: 'waiting', tone: 'info', label: 'Menunggu', reason: `Sumber meminta jeda. Lanjut sendiri sekitar ${pulseDate(channel.blocked_until)}.` };
  if (channel?.blocked_reason) return { key: 'stopped', tone: 'danger', label: 'Terhenti', reason: stopReasons[channel.blocked_reason] || 'Sumber data menolak permintaan. Administrator perlu memeriksanya.' };
  return { key: 'active', tone: 'success', label: 'Aktif' };
}

/** One row per source the project collects, with everything the overview draws. `shown` is false for a source the
 * project neither schedules nor holds posts from; it still appears in the settings so it can be switched on. */
export function collectionRows(data, topic) {
  const figures = new Map((data?.overview?.sources || []).map(row => [row.platform, row]));
  const channels = new Map((data?.workers || []).map(row => [row.provider, row]));
  const wanted = new Set(topic?.sources || []);
  const known = monitorSources.map(source => source.platform);
  const others = [...figures.keys()].filter(platform => !known.includes(platform) && figures.get(platform).posts > 0)
    .map(platform => ({ platform, label: null, schedule: null, channel: null }));
  return [...monitorSources, ...others].map(source => {
    const stored = figures.get(source.platform) || {};
    const schedule = topic && source.schedule ? (data?.schedules || []).find(row => row.topic_id === topic.id && row.provider === source.schedule) || null : null;
    const channel = channels.get(source.channel) || null;
    const week = runShare(stored.runs?.week), day = runShare(stored.runs?.day);
    return {
      ...source, scheduleRow: schedule, channelRow: channel,
      // Without a project there is no single schedule to describe.
      status: topic ? sourceStatus(schedule, channel) : { key: 'unscoped', tone: 'neutral', label: null },
      posts: stored.posts || 0, span: postSpan(stored.first_published_at, stored.last_published_at), daysWithPosts: stored.days_with_posts || 0,
      week, day, hasFigures: !!data?.overview,
      last: latest([schedule?.last_success_at, stored.last_collected_at]),
      next: schedule?.enabled ? schedule.next_run_at || null : null,
      shown: !!(stored.posts || schedule?.enabled || week || wanted.has(source.schedule)),
    };
  });
}

/** What the frequency cell says about one overview row: how often, the last collection, and the next one.
 * `serverTime` decides whether the next collection is already due. */
export function frequencyText(row, serverTime) {
  const last = row.last ? `Terakhir ${pulseDate(row.last)}` : 'Belum pernah mengumpulkan';
  const key = row.status.key;
  if (key === 'unscoped') return { headline: null, last, next: 'Jadwal diatur per project' };
  if (key === 'manual') return { headline: 'Tanpa jadwal', last, next: 'Dikumpulkan hanya saat diminta' };
  if (key === 'paused') return { headline: 'Dijeda', last, next: 'Tidak ada pengumpulan berikutnya' };
  const headline = intervalText(row.scheduleRow?.interval_minutes);
  if (key !== 'active') return { headline, last, next: 'Berikutnya setelah sumber aktif lagi' };
  const due = !row.next || !(instant(row.next) > instant(serverTime));
  return { headline, last, next: due ? 'Berikutnya segera' : `Berikutnya ${pulseDate(row.next)}` };
}

/** The project in one line: sources, posts, the span they cover, the share of scheduled collections that succeeded in
 * 7 days, and how often the scheduled sources collect (`fastest` and `slowest` interval in minutes). */
export function collectionSummary(rows) {
  const shown = rows.filter(row => row.shown);
  const intervals = shown.filter(row => row.scheduleRow?.enabled && row.scheduleRow.interval_minutes > 0).map(row => row.scheduleRow.interval_minutes);
  const from = earliest(shown.map(row => row.span?.from)), to = latest(shown.map(row => row.span?.to));
  const total = key => shown.reduce((sum, row) => sum + (row.week?.[key] || 0), 0);
  return {
    sources: shown.length, active: shown.filter(row => row.status.key === 'active').length,
    posts: shown.reduce((sum, row) => sum + row.posts, 0),
    span: from && to ? postSpan(from, to) : null,
    week: runShare({ planned: total('planned'), succeeded: total('succeeded'), failed: total('failed') }),
    scheduled: intervals.length, fastest: intervals.length ? Math.min(...intervals) : null, slowest: intervals.length ? Math.max(...intervals) : null,
  };
}

const alertKinds = {
  collection_error: { tone: 'danger', label: 'Gangguan pengumpulan' },
  volume_spike: { tone: 'warning', label: 'Lonjakan posting' },
  recent_cluster: { tone: 'accent', label: 'Isu ramai dibahas' },
  engagement_growth: { tone: 'info', label: 'Interaksi naik cepat' },
};
const errorReasons = {
  rate_limited: 'Sumber meminta jeda sebentar', pending: 'Sumber belum selesai menyiapkan data',
  access_or_quota_restricted: 'Saldo sumber data habis', plan_restricted: 'Saldo sumber data habis',
  authentication_failed: 'Akses ke sumber data ditolak', not_configured: 'Sumber data belum dihubungkan',
  timeout: 'Sumber tidak menjawab tepat waktu', transient_http: 'Sumber sedang bermasalah',
};
const oneDecimal = value => formatCount(Math.round(value * 10) / 10);

/** One alert as a compact row reads it: kind, a title a person understands, and the one figure that triggered it.
 * A collection failure is stored as "<schedule key>: <error code>"; neither part is shown as it is. */
export function alertSummary(alert) {
  const detail = alert?.detail || {}, kind = alertKinds[alert?.kind] || { tone: 'accent', label: 'Aktivitas baru' };
  let title = (alert?.title || '').trim() || 'Tanpa judul', figure = null;
  if (alert?.kind === 'collection_error') {
    const stored = title.match(/^([a-z_]+):\s*([a-z_]+)$/);
    const source = stored && monitorSources.find(row => row.schedule === stored[1]);
    if (stored) title = source ? `Pengumpulan ${source.label} gagal` : 'Pengumpulan gagal';
    const code = detail.error || stored?.[2];
    figure = code ? errorReasons[code] || 'Sumber menolak permintaan' : null;
  } else if (alert?.kind === 'volume_spike' && Number.isFinite(detail.posts)) {
    // The product's one spike rule (spike_v1) compares the window with the usual window of the hours before, and
    // states no ratio when that usual window is empty. Alerts stored before 15 Nov 2026 (volume_spike_v1, with
    // `previous_posts`) compared it with the 30 minutes just before, and keep saying so.
    const earlier = detail.rule === 'volume_spike_v1' || Number.isFinite(detail.previous_posts);
    figure = `${formatCount(detail.posts)} posting dalam ${formatCount(detail.window_minutes || 30)} menit`
      + (Number.isFinite(detail.ratio) ? `, ${oneDecimal(detail.ratio)}× dari ${earlier ? 'sebelumnya' : 'biasanya'}`
        : !earlier && detail.usual_posts === 0 ? ', sebelumnya umumnya kosong' : '');
  } else if (alert?.kind === 'engagement_growth' && Number.isFinite(detail.delta_engagement)) {
    figure = `+${formatCount(detail.delta_engagement)} interaksi`
      + (Number.isFinite(detail.rate_per_hour) ? `, ${oneDecimal(detail.rate_per_hour)} per jam` : '');
  } else if (Number.isFinite(detail.posts)) {
    figure = `${formatCount(detail.posts)} posting` + (Number.isFinite(detail.authors) ? ` dari ${formatCount(detail.authors)} akun` : '')
      + (Number.isFinite(detail.window_minutes) ? ` dalam ${formatCount(detail.window_minutes)} menit` : '');
  }
  return { ...kind, title, figure, unread: !alert?.acknowledged_at, opens: !!alert?.issue_id };
}

/** Text of the unread count on the navigation: nothing for zero or an unknown count, "99+" past two digits. */
export function unreadBadgeText(count) {
  if (!Number.isInteger(count) || count <= 0) return null;
  return count > 99 ? '99+' : formatCount(count);
}

/** Last known unread count per project. The sidebar is rebuilt on every page change; this keeps the count on screen
 * across that and tells the badge how long to wait, so the server is asked at most once per `ttl`. */
export function createUnreadCache(ttl = 60000) {
  const seen = new Map();
  return {
    put(key, unread, now = Date.now()) { seen.set(key, { unread, at: now }); },
    drop(key) { seen.delete(key); },
    peek(key) { return seen.has(key) ? seen.get(key).unread : null; },
    wait(key, now = Date.now()) { return seen.has(key) ? Math.max(0, ttl - (now - seen.get(key).at)) : 0; },
  };
}
