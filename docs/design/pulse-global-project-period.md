# Periode global project dan ranking

11 November 2026

## Implementasi

- Kontrol periode di ProjectBar memakai tanggal publikasi WIB, dengan batas hari inklusif. Backend mengubah batas WIB ke UTC sebelum menyaring SourceItem.
- KPI Ikhtisar, posting individual, ranking akun dan jaringan dihitung dari dataset tersaring yang sama. Timeline harian juga dikelompokkan menurut WIB.
- Preferensi periode disimpan di localStorage per ID project pada browser ini, bukan sebagai konfigurasi crawler atau preferensi lintas perangkat. Navigasi antarmenu, reload dan pergantian project tidak mencampur periode.
- Grafik Posting dapat menetapkan hari sebagai periode global. Filter tanggal lokal di drawer dihilangkan pada PULSE standalone agar tidak bertentangan.
- Analisis alert memakai irisan periode project dan window alert, tetap dibatasi ke isu alert.
- Ranking memiliki pilihan akun sosial/sumber berita, urutan interaksi atau posting, dan porsi posting terhadap total posting project dalam periode. Tidak membuat nilai reach, followers atau Influence Score.
- Interaksi adalah snapshot terakhir untuk posting yang terbit dalam periode, bukan delta interaksi historis pada periode tersebut.

## Cakupan

Monitor Project, status sumber/crawler, dan daftar kelompok isu tetap bersifat operasional atau agregat topik. Filter ini bukan permintaan mengambil data historis dan tidak memakai kuota. Komentar mengikuti posting induk yang tersaring, bukan tanggal komentar individual. Posting tanpa tanggal keluar ketika salah satu batas tanggal aktif.

## Referensi langsung

Trial Brand24 milik pengguna di Chrome diperiksa pada Mentions dan Influencers & Sources untuk project Penyadapan Presiden. Rentang tanggal dibawa lewat navigasi; ranking memisahkan influencer dan sumber. Tidak mengubah akun, paket, keyword, pengaturan atau melakukan export. Pola tersebut diadaptasi dengan komponen/token PULSE dan panduan Impeccable, bukan menyalin skor proprietary.

## Verifikasi

- 166 tes backend lulus. Tes baru membuktikan batas hari WIB, posting tanpa tanggal, ranking, jaringan, dan penolakan rentang terbalik.
- 73 tes frontend non-browser lulus; lint komponen dan build produksi lulus. Tes browser legacy yang sebelumnya gagal tidak dihitung.
- Browser Chrome: periode 3 November 2026 menghasilkan 4 posting pada Ikhtisar, Posting dan Jaringan; 4 akun dengan porsi 25% masing-masing pada ranking. Pindah ke Gibran mempertahankan periode terpisah; kembali ke Penyadapan Presiden mengembalikan periode 3 November.
- Tidak ada crawl atau perubahan kuota. Build masih memperingatkan bundle besar dan database Browserslist usang.
