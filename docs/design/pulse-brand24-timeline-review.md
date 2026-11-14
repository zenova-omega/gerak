# Referensi Brand24 dan perbaikan timeline PULSE

11 November 2026. Referensi yang diperiksa: situs resmi, halaman pendaftaran trial, dan Help Center; belum mengakses dashboard trial berautentikasi. Pendaftaran meminta email, password dan persetujuan ketentuan, sehingga tidak diteruskan.

Referensi:
- https://help.brand24.com/en/articles/9772539-mentions-tab-overview
- https://help.brand24.com/en/articles/11372566-how-to-customize-the-date-range-in-your-project
- https://app.brand24.com/user/register-account/?custom_form=155

## Diterapkan

- Replay peta mulai pada publikasi pertama, bukan seluruh sampel di posisi akhir. Akun tanpa hubungan ikut terlihat sehingga awal isu tidak tampak kosong hanya karena belum ada edge.
- Kontrol Mulai/Akhir, Kembali ke awal, dan Lihat seluruh periode dibedakan. Tampilan seluruh periode tetap mencakup posting tanpa tanggal.
- Posting diurutkan terlama dahulu secara default. Urutan terbaru/interaksi/share/views tetap tersedia.
- Pencarian cepat, tanggal mulai–akhir, dan grafik publikasi harian sebelum daftar posting.
- Klik tanggal di grafik memfilter daftar. Grafik mengikuti filter konten/platform dan tetap memperlihatkan konteks tanggal lain. Zona waktu WIB.
- Tanggal tanpa data tidak dibuat seolah-olah nol aktivitas sosial. Posting tanpa tanggal dihitung terpisah.

Panduan Impeccable digunakan untuk kejelasan label dan pengungkapan konteks. Warna dan komponen tetap mengikuti PULSE, bukan menyalin branding Brand24.

## Batas

Filter tanggal baru berlaku pada daftar Posting, belum menjadi filter global lintas halaman seperti Brand24. Tidak menambahkan estimasi reach, sentimen, atau anomaly detector tanpa data/implementasi. Grafik harian adalah tanggal diskret dengan posting, bukan sumbu kalender kontinu. Tidak ada crawl atau perubahan kuota.

## Verifikasi

72 tes frontend non-browser lulus; lint komponen yang diubah dan build produksi lulus. Tes regresi memastikan replay pertama tidak membocorkan posting masa depan, urutan kronologis, missing dates di akhir, dan pengelompokan hari WIB. Browser membuktikan klik 3 November menyaring 4 dari 401 posting, dan slider replay mulai pada 0. Tes browser legacy yang gagal pada tahap sebelumnya tidak dijalankan ulang dan tidak diklaim lulus. Build masih mempunyai peringatan bundle besar dan Browserslist lama.
