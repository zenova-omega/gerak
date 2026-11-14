# Pulse prototype

Runtime lokal menggunakan backend `server/` yang sudah ada. Jangan menjalankan
`server/seed.py`: script lama tersebut menghapus tabel sebelum seeding.

## Start

1. Install dependency: `uv venv --python 3.12 .venv` lalu
   `uv pip install --python .venv/bin/python -r server/requirements.txt`.
2. Credential provider berada di `services/listening-api/.env` (Git ignored).
3. Konfigurasi lokal database dan JWT berada di `server/.env` (Git ignored).
4. Dari `server/`: `../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`.
5. Dari root: `npm run dev -- --host 127.0.0.1`.
6. Login akun prototype yang credential-nya disimpan lokal dalam
   `server/.prototype-access`. Jangan gunakan tombol Demo untuk API nyata.
7. Buka Pulse, inisialisasi topik contoh bila belum ada, pilih topik lalu crawl manual.

## Batas interpretasi

- GERAK adalah kata generik: hasil awal dapat mengandung gerak badan/gerak jalan.
  Query perlu diperjelas setelah identitas merek dan akun resminya diketahui.
- Isu Penyadapan Presiden adalah query berita/percakapan, bukan fakta terverifikasi.
- Ranking berdasarkan engagement teramati dalam sampel, bukan bukti pengaruh kausal.
- Views tidak sama dengan reach unik. Nilai yang tidak tersedia tidak boleh diestimasi diam-diam.
- Peta hanya menggunakan lokasi eksplisit beserta provenance; tanpa data lokasi,
  tampilkan unknown, bukan menyimpulkan lokasi orang dari bahasa atau isi berita.
- Tidak ada scheduler sosial otomatis selama trial. Setiap crawl dapat memakai kredit.
- Database SQLite ini untuk prototype satu mesin, bukan deployment produksi multi-worker.
