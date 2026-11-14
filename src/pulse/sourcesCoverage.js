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
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC';
}
