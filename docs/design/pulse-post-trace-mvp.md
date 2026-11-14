# Telusuri posting: tahap fondasi

## Sudah tersedia

- Project baru dan editor mempunyai mode Pantau isu / Telusuri posting.
- Satu URL acuan disimpan per project di tabel additive `pulse_project_seeds`, tanpa mengubah data project lama.
- Validasi URL posting publik X, Instagram, TikTok dan YouTube. Tracking parameters dibuang; URL profil, shortlink dan host lain ditolak.
- Preview mencari snapshot tersimpan, tidak melakukan fetch URL arbitrer atau memakai kuota provider. Caption dapat dipilih sebagai draft query lalu ditinjau pengguna.
- Status posting belum dikumpulkan dibedakan dari snapshot tersedia.
- Keyword dan pilihan sumber manual disimpan; Instagram/TikTok serta jadwal tetap melalui Monitor Project.
- Project baru tetap nonaktif. Penyimpanan tidak membuat job crawl.
- Posting acuan dan batas interpretasi tersedia melalui disclosure di project bar pada seluruh dashboard.

## Belum tersedia, jangan diklaim selesai

- Resolver provider untuk mengambil satu URL yang belum ada dalam penyimpanan.
- Penelusuran repost/quote/reply langsung, pencocokan gambar/video, dan pelacakan lintas-platform otomatis dari seed.
- Peta berpusat pada posting acuan, timeline relatif terhadap seed, tanggal sebelum/sesudah sebagai filter pengumpulan.
- Wizard jadwal dan kuota dalam form pembuatan (saat ini melalui Monitor Project).
- Tombol membuat project penelusuran dari kartu posting.

Hasil pengumpulan saat ini tetap berbasis query, bukan bukti bahwa setiap hasil berasal dari URL acuan. UI menyebut keterbatasan ini secara eksplisit.

## Pemeriksaan

API tests mencakup normalisasi/validasi URL, penyimpanan dan pembacaan ulang, edit query yang mempertahankan seed, status belum dikumpulkan, dan pencocokan snapshot Twitter/X tanpa metrik buatan. Preview nyata di browser diuji dengan URL posting Tempo dari bukti project Penyadapan Presiden. Tidak dibuat project contoh permanen, tidak ada crawl atau upgrade.

ESLint komponen baru dan build produksi lulus. Build masih memperingatkan bundle besar dan Browserslist usang. Tes browser legacy `src/lib/pulse-ui.test.mjs` gagal menunggu `Test account` pada route `/command-center/pulse`; tidak diklaim lulus.
