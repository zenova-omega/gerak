import { LayoutDashboard, Radio, Network, Newspaper, MessageCircle, Users, Database, Sparkles, Search, HeartPulse, FileText, ChartPie } from 'lucide-react';

/** One entry per page: the sidebar, the page heading and any link to the page read from here,
 * so a page has the same name, mark and one-line purpose everywhere.
 * `tagline` is five words or fewer. Anything longer belongs in `guide`, which opens from the info button. */
export const pageMeta = {
  search: { title: 'Pencarian cepat', icon: Search, tagline: 'Keyword baru, project baru', guide: ['Cara memakai pencarian cepat', 'Isi keyword, pilih platform, lalu cari. PULSE membuat project dan mulai mengumpulkan posting.'] },
  overview: { title: 'Ikhtisar', icon: LayoutDashboard, tagline: 'Ringkasan project', guide: ['Cara membaca ikhtisar', 'Angka mengikuti periode dan platform di bilah project. Klik angka atau tautan untuk membuka posting di baliknya.'] },
  chat: { title: 'Tanya AI', icon: Sparkles, tagline: 'Jawaban dari data tersimpan', guide: ['Cara memakai Tanya AI', 'Jawaban disusun dari posting, riwayat metrik, dan kelompok percakapan project ini. Periksa posting yang dirujuk sebelum dipakai.'] },
  sentiment: { title: 'Sentimen', icon: HeartPulse, tagline: 'Nada percakapan', guide: ['Cara membaca sentimen', 'Klik segmen grafik untuk membuka posting pada tanggal dan sentimen itu. Label menggambarkan nada teks, bukan dukungan politik.'] },
  reports: { title: 'Laporan', icon: FileText, tagline: 'Ringkasan siap cetak', guide: ['Cara memakai laporan', 'Laporan mengikuti periode project. Gunakan cetak untuk menyimpannya sebagai PDF.'] },
  posts: { title: 'Posting', icon: Newspaper, tagline: 'Semua posting terkumpul', guide: ['Cara memeriksa posting', 'Cari, urutkan, atau saring posting. Buka Rincian untuk interaksi, komentar, dan riwayat metrik. Interaksi hanya menghitung metrik yang tersedia.'] },
  accounts: { title: 'Akun & sumber', icon: Users, tagline: 'Siapa yang bicara', guide: ['Cara membandingkan akun', 'Urutkan berdasarkan interaksi atau jumlah posting. Ranking hanya berlaku pada data yang berhasil dikumpulkan.'] },
  network: { title: 'Jaringan', icon: Network, tagline: 'Pola penyebaran', guide: ['Cara menelusuri penyebaran', 'Lihat hubungan akun dan urutan publikasi konten serupa. Sinyal akun menandai yang perlu diperiksa, bukan memastikan bot.'] },
  comments: { title: 'Komentar', icon: MessageCircle, tagline: 'Respons publik', guide: ['Cara membaca komentar', 'Baca semua komentar atau pilih satu posting. Komentar tersimpan adalah sampel sampai 300 per posting, bukan seluruh opini publik.'] },
  infographics: { title: 'Infografik', icon: ChartPie, tagline: 'Kata, waktu, lokasi', guide: ['Cara membaca infografik', 'Kata yang sering muncul menunjukkan frekuensi, bukan dukungan. Peta hanya memakai lokasi yang tersedia dari sumber.'] },
  monitor: { title: 'Monitor', icon: Radio, tagline: 'Jadwal dan alert', guide: ['Cara memantau pengumpulan', 'Atur jadwal per sumber dan batas harian. Jadwal aktif bisa menunggu kuota; antrean dan hasilnya ada di bawah.'] },
  sources: { title: 'Sumber & Cakupan', icon: Database, tagline: 'Apa yang terhubung', guide: ['Cara membaca cakupan', 'Lihat sumber yang terhubung, jumlah posting tersimpan, dan field yang terisi per platform.'] },
};
export const pageOrder = ['overview', 'chat', 'sentiment', 'reports', 'posts', 'accounts', 'network', 'comments', 'monitor', 'sources'];

/** Sidebar groups: what happened, the detail behind it, and how the data gets in. */
export const pageGroups = [['Ringkasan', ['overview', 'chat', 'reports']], ['Analisis', ['sentiment', 'posts', 'comments', 'accounts', 'network']], ['Data', ['monitor', 'sources']]];
