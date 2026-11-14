# PULSE: Sumber & Cakupan

Halaman `/pulse/sources?topic=pulse-penyadapan-presiden` menampilkan cakupan per topik atau seluruh topik. GET hanya membaca database lokal; tidak melakukan pencarian eksternal. Pemilik/admin dapat memeriksa metadata akun dan meminta pengumpulan manual Instagram/TikTok. Analyst hanya membaca.

## Pengumpulan

- Xpoz MCP `getInstagramPostsByKeywords` dan `getTiktokPostsByKeywords`; satu panggilan pencarian, tanpa retry, polling atau fallback. `forceLatest=false` bukan jaminan penyedia tidak mengambil data baru di belakang layar.
- UI meminta maksimal 5 posting, API menerima 1–20. Hanya topik tersimpan dengan query 1–250 karakter.
- Reservasi kuota dan lease Xpoz disimpan sebelum jaringan dipanggil. Jalur baru berbagi `WorkerUsage` dan `WorkerPolicy` dengan scheduler X; kegagalan tetap memakai satu percobaan. Pembatas lokal berbeda dari kredit provider.
- Instagram/TikTok tidak dimasukkan ke jadwal otomatis. Batas yang sudah disetujui tetap Xpoz 4, YouTube 6, berita 24 percobaan/hari UTC. Reset hari UTC = 07.00 WIB.
- Catatan migrasi: tombol lama `Crawl manual` (`/topics/{id}/crawl`) menggunakan jalur prototype terpisah dan belum termasuk penghitung worker. Untuk kuota terkontrol gunakan scheduler dan halaman Sumber & Cakupan; angka penggunaan halaman ini bukan audit seluruh pemakaian API key di luar jalur tersebut.
- Metadata akun merupakan snapshot bertanggal. Jangan menganggap metadata atau tool list sebagai bukti pencarian berhasil maupun sebagai operasi yang pasti gratis. Tidak ada upgrade paket otomatis.

## Interpretasi data

- “Dikonfigurasi” = kredensial tersedia, “alat tersedia” = tercantum pada akun, “berhasil” = ada respons pencarian yang valid. Hasil kosong tidak berarti seluruh platform tidak membicarakan topik.
- Posting dihitung unik berdasarkan URL per platform; seluruh topik memakai observasi terbaru. Kelengkapan kolom adalah jumlah posting dengan nilai tersedia, termasuk nilai nol yang benar-benar dilaporkan.
- Jumlah komentar bukan isi komentar. Integrasi ini belum mengambil isi komentar Instagram/TikTok.
- Lokasi, demografi, identitas lintas platform dan status bot tidak disimpulkan dari username.
- Waktu publikasi yang tidak tersedia tetap null; tidak diganti waktu crawling dalam timeline publikasi. Pembaca mendukung tanggal ISO dan field timestamp detik/milidetik eksplisit dari provider.
- Riwayat cakupan saat ini membaca hingga 500 catatan terbaru per tabel audit; kesuksesan yang lebih lama mungkin tidak tampil. Data posting tidak dibatasi oleh batas riwayat itu.

## Hasil uji nyata

10 November 2026 20:58 UTC / 11 November 03:58 WIB: topik Penyadapan Presiden berhasil mengambil dan menyimpan 5 Instagram + 5 TikTok. Tidak ada tanggal publikasi terbaca pada batch awal; tidak dilakukan pengambilan tambahan untuk mengisi tanggal. Permintaan berikutnya juga meminta `createdAtDate` dan `createdAtTimestamp`.

Snapshot akun setelah uji: paket Free, 469 subscription credits, 0 extra credits, reset `never`. Jalur worker+pengumpulan baru: 3 dari 4 percobaan Xpoz pada hari UTC 2026-11-10. Angka ini bukan saldo permanen.

## Operasional

Tabel baru `pulse_source_accounts` dan `pulse_source_collections` dibuat secara aditif melalui startup `create_all` pada kedua entrypoint. Kredensial tidak disimpan di tabel ini. Penolakan autentikasi/izin/kuota/rate-limit mengunci lane Xpoz, termasuk ketika ditemukan saat pemeriksaan akun. Pemeriksaan sukses tidak membuka blok secara otomatis; admin harus menyelesaikan penyebab dan membuka blok secara eksplisit lewat pengaturan worker.

Jika server mati saat permintaan berjalan, reservasi dipertahankan dan status menjadi interrupted setelah lease berakhir. Tidak ada replay otomatis. Kegagalan ingest yang diketahui dicatat `ingestion_failed`; savepoint mencegah sebagian data tersimpan.
