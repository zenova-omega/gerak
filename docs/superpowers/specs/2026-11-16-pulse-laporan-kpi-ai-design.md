# Laporan PULSE: KPI produk dan pilihan AI — rancangan singkat

Disetujui pemilik 16 Nov 2026 ("Ya, bangun") atas rancangan yang ditunjukkan di sesi.

## Maksud
Pemilik: "update report analytics according to the metrics and kpi that we have. addition option for ai summary and
insights too". Laporan (`/pulse/reports`) harus memuat KPI yang sama dengan produk, dihitung dengan fungsi yang sama
(aturan tetap: satu perhitungan di seluruh PULSE), dan bisa menyertakan Ringkasan AI dan AI Insights.

## Tujuan
- Halaman Ringkasan eksekutif mencetak enam KPI Ikhtisar (Penyebutan, Konten unik, Akun unik, Interaksi, Sentimen
  bersih, Konsentrasi akun), dengan pembanding dan catatan yang sama persis.
- Halaman Volume dan sentimen menandai lonjakan menurut spike_v1 (jawaban server) dan mendaftarnya.
- Halaman Platform dan akun teratas memuat konsentrasi akun (concentration_v1: 3 akun teratas, akun untuk 80%).
- Halaman Cakupan dan batasan memuat tingkat kelengkapan data (coverage_v1).
- Panel susunan mendapat grup "Isi AI": Ringkasan AI (mati / Eksekutif / Ringkas / Kronologi) dan AI Insights
  (halaman baru `insights`), memakai hasil tersimpan; tombol tulis hanya bila belum ada atau cakupannya beda.

## Bukan tujuan / anti-tujuan
- Tidak ada rumus baru. Bila sebuah angka butuh logika yang kini hanya ada di JSX Ikhtisar, logika itu dipindah ke
  fungsi bersama yang dipakai keduanya.
- Membuka laporan tidak pernah memanggil AI. Tes tidak memanggil model atau jaringan.
- Tidak ada nama model atau pemasok di UI/payload.
- Arsip tidak berubah formatnya; arsip yang dibuka tidak mencetak teks AI atau pembanding periode sebelumnya.

## Pendekatan (dipilih)
1. **Fungsi KPI bersama** `projectKpis` (baru, `src/lib/pulseKpis.js`) dari logika tile di `ProjectOverview.jsx`;
   Ikhtisar dan laporan memakainya. Format perubahan (`deltaText`) satu tempat, dipakai `PulseDelta` dan laporan.
   Ditolak: menyalin rumus ke laporan (dua salinan bisa menyimpang).
2. **Grafik laporan di atas `trendSeries`** (deret yang sama dengan grafik Ikhtisar, direntangkan ke periode pilihan),
   per hari s.d. 92 batang, selain itu per minggu; lonjakan diminta lewat `useTrendSpikes` (cache dan aturan yang sama).
3. **Pilihan AI**: `insights` sebagai bagian (sections, sudah tersimpan di server tanpa perubahan); format ringkasan
   sebagai `ai.summary` di pengaturan laporan — perlu perubahan kecil `pulse_report_settings.py` (+ restart API live
   sekali di akhir). Server lama mengabaikan kunci itu; laporan tetap jalan dengan pilihan bawaan (otomatis).

## Keputusan builder (panggilan saya)
- `ai.summary` = null berarti otomatis: format tersimpan pertama dari Eksekutif, Ringkas, Kronologi (perilaku lama).
- `insights` bawaan mati (halaman kosong di cetakan tidak berguna); diletakkan setelah Ringkasan eksekutif.
- Tombol tulis: Ringkasan memakai `summaryStore.write` (berbagi permintaan dengan kartu Ikhtisar); Insights
  mengirim periode dan platform laporan, sama seperti halaman AI Insights. Teks UI: "±1 menit, memakai kredit AI".
- Pembanding Penyebutan dicetak dengan tanggal terbaca ("vs 21–27 Sep 2026"); Ikhtisar ikut berubah karena fungsi sama.
- Arsip: `previous` status `archived` → catatan "Perbandingan periode sebelumnya tidak disimpan dalam arsip."
