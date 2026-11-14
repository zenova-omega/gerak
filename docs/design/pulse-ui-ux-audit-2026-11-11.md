# PULSE — audit UX terarah, 11 November 2026

## Cakupan

Audit dan perbaikan pada navigasi analisis Jaringan serta komponen bantuan dan kepadatan header dashboard. Menggunakan data project Gibran yang sudah tersimpan; tidak melakukan crawl, mengubah kuota, atau menambah data. Ini bukan sertifikasi aksesibilitas maupun audit menyeluruh seluruh route.

## Temuan dan tindakan

| Prioritas | Temuan | Tindakan/status |
| --- | --- | --- |
| P1 | Peta, kronologi, narasi, dan 192 akun ditumpuk dalam satu halaman panjang | Dipisahkan menjadi Hubungan akun, Awal & konten serupa, dan Sinyal akun |
| P1 | Daftar sinyal sulit ditelusuri | Pencarian nama/platform, 20 hasil awal, dan tampilkan berikutnya |
| P2 | Terlalu banyak judul dan jarak sebelum data | Header dipadatkan; judul explorer berulang diganti petunjuk singkat |
| P2 | Tema explorer berbeda dari dashboard | Mengikuti token tema global, kontrol tema ganda dihapus |
| P2 | Istilah teknis tanpa konteks | Label Indonesia, panduan kontekstual, definisi interaksi/snapshot/data belum cukup |
| P2 | Panel bukti turun ke bawah pada desktop 1280px | Graph dan panel bukti berdampingan mulai 1100px |
| P2 | Peta kosong mudah disalahartikan sebagai tidak ada data | Penjelasan dan tombol untuk menampilkan akun tanpa hubungan |

Peta 2D adalah tampilan awal; perspektif 3D, urutan waktu, dan jejak penyebaran tetap tersedia. Hubungan akun tetap diberi penjelasan bahwa mention/konten serupa bukan bukti koordinasi atau penyalinan. Sinyal aktivitas bukan penetapan bahwa akun adalah bot.

## Verifikasi

- 69 tes frontend lulus, termasuk regression test mode awal 2D dan empty-state.
- ESLint pada komponen yang diubah lulus.
- Build produksi PULSE berhasil. Masih ada peringatan chunk 544,81 kB dan database Browserslist usang.
- Browser: mode 2D aktif; daftar awal 20 dari 192 akun; pencarian Kompas menghasilkan 7 dari 7 akun.
- Tema terang dan gelap diperiksa secara visual; panel bukti berdampingan pada desktop.
- Pemeriksaan viewport 390×844: kontrol utama membungkus dalam layar, tetapi area project/header masih terlalu panjang. Override viewport dikembalikan setelah pengujian.

## Penilaian terbatas (0–4)

| Dimensi | Penilaian | Batas pemeriksaan |
| --- | --- | --- |
| Aksesibilitas | Belum diberi skor | Label kontrol dan state native tersedia; belum ada pengukuran kontras menyeluruh atau uji pembaca layar |
| Performa | 2 | Render bagian analisis kondisional dan daftar bertahap; bundle masih besar, belum ada benchmark runtime |
| Responsif | 2 | Desktop membaik; mobile masih memerlukan header/navigasi yang lebih ringkas |
| Tema | 3 | Tema explorer kini konsisten, diperiksa terang/gelap; belum audit seluruh route |
| Kejelasan/hierarki | 3 | Fokus analisis, panduan, dan pencarian lebih jelas; belum ada usability test dengan pengguna |

Tidak dihitung skor total karena cakupan aksesibilitas belum lengkap.

## Prioritas berikutnya

1. **P1 — kualitas data:** validasi relevansi hasil terhadap keyword project dan presisi timestamp. Hasil lama/kurang relevan dan jam seragam dapat menyesatkan kronologi. Publikasi paling awal dalam sampel bukan otomatis asal isu.
2. **P2 — mobile:** ringkas pemilih project dan navigasi, sembunyikan query panjang di detail yang dapat dibuka.
3. **P2 — komentar:** uji tata letak daftar + detail posting agar konteks komentar mudah dipahami.
4. **P2 — performa dan aksesibilitas:** code splitting, pengukuran contrast/focus, keyboard dan pembaca layar pada seluruh route.

Panduan Impeccable memengaruhi keputusan untuk mengurangi informasi yang tampil sekaligus, menyederhanakan bahasa, dan memperjelas batas interpretasi data—bukan menambah dekorasi.
