# Analisis emosi PULSE

Halaman Sentimen menampilkan emosi teks secara terpisah dari polaritas dan sikap terhadap isu. Komponen menggunakan permukaan shadcn yang sudah ada, ikon vektor Lucide, serta token warna PULSE. Persentase dihitung dari posting dengan hasil emosi valid, termasuk kategori `none`; posting belum dianalisis tidak dimasukkan sebagai netral.

Kategori: `joy`, `anger`, `sadness`, `fear`, `disgust`, `admiration`, `none`. Satu kategori dominan per posting. Tidak ada inferensi keadaan psikologis, identitas atau afiliasi penulis. Hasil tetap perlu evaluasi manual, khususnya sarkasme dan kutipan.

Hasil disimpan pada `SourceItem.metrics.emotion`: label, confidence, reason, review_needed, method, model, analyzed_at, characters. Worker sentimen lokal meminta emosi dalam inference yang sama untuk posting yang masih pending dan posting baru. Label emosi tidak diturunkan dari label sentimen. Respons emosi tidak valid diabaikan tanpa merusak hasil sentimen valid.

Posting yang sudah selesai dianalisis sentimennya sebelum fitur ini **tidak otomatis diulang**. Cakupan emosi historis belum lengkap; backfill historis khusus belum diimplementasikan. Tidak ada perubahan kuota crawler atau layanan AI berbayar.

Grafik dan sumber memakai posting terfilter yang sama dengan halaman Sentimen. Tanggal grafik adalah tanggal publikasi WIB. Posting tanpa tanggal valid tetap masuk total, tetapi tidak masuk tren harian. Klik kategori atau sel tabel membuka sumber inline, termasuk alasan label dan tautan aman posting asli. Ini menganalisis caption/teks posting, bukan emosi komentar atau gambar/video.
