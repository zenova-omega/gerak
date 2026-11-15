export function canManageSources(user) { return ['owner', 'admin'].includes(user?.role); }

export function collectionBlock({ topicId, readOnly, busy, source, budget }) {
  if (readOnly) return 'Akses baca saja. Pengumpulan memerlukan administrator.';
  if (busy) return 'Tunggu hingga permintaan saat ini selesai.';
  if (!topicId) return 'Pilih satu topik sebelum mengumpulkan data.';
  if (!source || !['instagram', 'tiktok', 'reddit'].includes(source.platform)) return 'Pengumpulan manual tidak tersedia di halaman ini.';
  if (!source.configured) return 'Sumber belum dikonfigurasi oleh administrator.';
  if (source.tool_available !== true) return 'Alat belum tersedia atau belum diperiksa. Periksa metadata terlebih dahulu.';
  if (!budget || !Number.isFinite(budget.daily_limit) || !Number.isFinite(budget.used)) return 'Status batas harian belum tersedia.';
  if (budget.blocked_reason) return 'Pengumpulan diblokir. Minta administrator memeriksa status layanan.';
  if (budget.daily_limit >= 0 && budget.used >= budget.daily_limit) return 'Batas percobaan lokal hari ini telah tercapai.';
  return null;
}

export function coverageField(count, total) {
  if (!Number.isInteger(count) || !Number.isInteger(total) || count < 0 || total < 0 || count > total) return null;
  return { count, total, percent: total ? Math.round(count / total * 100) : null };
}

export function safeSourceError(error) {
  if (error?.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
  if (error?.status === 403) return 'Akun ini tidak memiliki izin untuk tindakan tersebut.';
  if (error?.status === 404) return 'Topik tidak ditemukan. Muat ulang daftar topik dan pilih kembali.';
  if (error?.status === 409) return 'Permintaan ditolak: batas tercapai, proses lain sedang berjalan, atau pengumpulan diblokir. Muat ulang status sebelum mencoba lagi.';
  return 'Permintaan belum berhasil. Periksa koneksi atau hubungi administrator. Detail teknis tidak ditampilkan.';
}

export function collectionResult(result) {
  if (result?.status === 'succeeded') return `Pengumpulan selesai: ${formatSourceCount(result.fetched)} diterima, ${formatSourceCount(result.ingested)} disimpan.`;
  if (result?.status === 'empty') return 'Pengumpulan selesai; tidak ada posting baru yang tersedia untuk permintaan ini.';
  if (result?.status === 'pending') return 'Permintaan masih menunggu atau berjalan. Muat ulang status secara manual; tidak ada pengambilan ulang otomatis.';
  return 'Pengumpulan belum berhasil. Hubungi administrator untuk memeriksa akses sumber.';
}

export function formatSourceCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value.toLocaleString('id-ID') : 'Belum diketahui';
}

export function formatSourceTime(value) {
  if (typeof value !== 'string' || !value) return 'Belum tersedia';
  const utc = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z';
  const date = new Date(utc);
  if (!Number.isFinite(date.getTime())) return 'Belum tersedia';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date) + ' WIB';
}

/** How old the provider balance on screen is, in whole hours, or null when it was never read.
 * The balance is refreshed automatically; this is for the case where that has stopped working. */
export function balanceAgeHours(checkedAt, now = Date.now()) {
  if (typeof checkedAt !== 'string' || !checkedAt) return null;
  const time = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(checkedAt) ? checkedAt : checkedAt + 'Z');
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 3600000)) : null;
}

/** What the app shell says when collection has stopped, from `GET /sources/balance`. Null while collection is fine and
 * during a short wait the provider asked for, which ends by itself. The source of the data is never named. */
export function collectionNotice(status) {
  if (status?.state === 'empty') return {
    title: 'Saldo sumber data habis.',
    text: 'Posting dan komentar baru tidak dikumpulkan sampai saldo diisi lagi. Setelah diisi, pengumpulan lanjut sendiri. Analisis data yang sudah tersimpan tetap berjalan.',
  };
  if (status?.state === 'access') return {
    title: 'Akses ke sumber data ditolak.',
    text: 'Posting dan komentar baru tidak dikumpulkan sampai administrator memeriksa kunci akses. Analisis data yang sudah tersimpan tetap berjalan.',
  };
  return null;
}

/** The project's lookback as the first and last calendar day (UTC) of a complete pull: `days` days ending today. */
export function lookbackRange(days, now = new Date()) {
  const day = date => date.toISOString().slice(0, 10);
  const span = Math.min(92, Math.max(1, Math.round(days) || 7));
  return { from: day(new Date(now.getTime() - (span - 1) * 86400000)), to: day(now) };
}

const threadsRefusals = {
  permission: 'token tidak membawa izin pencarian keyword',
  token: 'token tidak berlaku lagi',
  quota: 'jatah pencarian harian habis',
  network: 'Threads tidak dapat dihubungi',
  not_configured: 'token belum disimpan',
};
const publicSearchRefusals = {
  token: 'kunci layanan pencarian ditolak',
  credits: 'kredit pencarian habis. Isi ulang kredit, lalu kumpulkan lagi',
  permission: 'layanan pencarian menolak akses',
  quota: 'terlalu banyak permintaan. Coba lagi sebentar lagi',
  network: 'layanan pencarian tidak dapat dihubungi',
};
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** What the Threads row can say and whether a keyword collection can be asked for, from stored facts only.
 * A connected account is not the same as a token that may search: the permission is read from the platform at the
 * connection check, and unknown is treated as "not yet", never as "yes". */
export function threadsStatus(source, { topicId, readOnly, busy, now = new Date() } = {}) {
  const connection = source?.connection;
  const lines = [];
  let reason = null;
  if (source?.public_search) {
    // The paid public search needs no account connection: it reads every public post, one credit per search word.
    lines.push('Pencarian publik aktif: menjangkau semua posting publik Threads, lengkap dengan jumlah suka, balasan, dan repost.');
    lines.push('Setiap pengumpulan mencari semua kata kunci project sampai halaman terakhir, pada rentang hari project. Berbayar: sekitar 1 kredit per 15 posting yang dibaca.');
    if (source.recurring_enabled && Number.isFinite(source.interval_minutes)) lines.push(`Otomatis: setiap project yang dipantau dicari setiap ${source.interval_minutes >= 60 && source.interval_minutes % 60 === 0 ? `${source.interval_minutes / 60} jam` : `${source.interval_minutes} menit`}.`);
    const left = source.search_credits_remaining;
    if (Number.isFinite(left)) lines.push(`Sisa kredit pada pengumpulan terakhir: ${left.toLocaleString('id-ID')}.`);
    const refused = source.last_attempt?.status === 'failed' ? publicSearchRefusals[source.last_attempt.error] : null;
    if (refused) lines.push(`Pengumpulan terakhir ditolak: ${refused}.`);
    reason = readOnly ? 'Akses baca saja. Pengumpulan memerlukan administrator.' : busy ? 'Tunggu hingga permintaan saat ini selesai.' : !topicId ? 'Pilih satu topik sebelum mengumpulkan data.' : null;
    return { lines, canCollect: !reason, reason };
  }
  if (!source?.configured) {
    lines.push('Token Threads belum disimpan di server.');
    reason = 'Simpan token Threads terlebih dahulu.';
  } else if (!connection) {
    lines.push('Koneksi belum diperiksa. Tekan Periksa koneksi Threads.');
    reason = 'Periksa koneksi terlebih dahulu.';
  } else if (!connection.connected) {
    lines.push('Koneksi ditolak: token salah, kedaluwarsa, atau milik akun lain.');
    reason = 'Koneksi Threads belum berhasil.';
  } else {
    lines.push(`Akun terhubung: @${connection.username}.`);
    const ends = typeof connection.expires_at === 'string' ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(connection.expires_at) ? connection.expires_at : connection.expires_at + 'Z') : null;
    const day = ends && Number.isFinite(ends.getTime()) ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(ends) : null;
    if (day && ends <= now) {
      lines.push(`Token sudah berakhir ${day}. Simpan token baru.`);
      reason = 'Token sudah berakhir.';
    } else if (day) {
      lines.push(ends - now < WEEK ? `Token berakhir ${day}. Perbarui sebelum tanggal itu.` : `Token berlaku sampai ${day}.`);
    }
    if (connection.search_permission === true) {
      lines.push('Token membawa izin pencarian keyword. Sebelum aplikasi disetujui Threads, pencarian hanya menjangkau posting akun yang terhubung. Posting publik lain terbaca setelah persetujuan.');
    } else if (connection.search_permission === false) {
      lines.push('Token ini belum membawa izin pencarian keyword, jadi pencarian ditolak. Simpan token baru yang menyertakan izin itu.');
      reason ??= 'Token belum membawa izin pencarian keyword.';
    } else {
      lines.push('Izin token belum berhasil dibaca. Periksa koneksi lagi.');
      reason ??= 'Izin token belum diketahui.';
    }
  }
  const refused = source?.last_attempt?.status === 'failed' ? threadsRefusals[source.last_attempt.error] : null;
  if (refused) lines.push(`Pengumpulan terakhir ditolak: ${refused}.`);
  if (!reason && !source?.keyword_collection_available) reason = 'Pencarian keyword belum tersedia. Periksa koneksi lagi.';
  if (!reason) reason = readOnly ? 'Akses baca saja. Pengumpulan memerlukan administrator.' : busy ? 'Tunggu hingga permintaan saat ini selesai.' : !topicId ? 'Pilih satu topik sebelum mengumpulkan data.' : null;
  return { lines, canCollect: !reason, reason };
}
