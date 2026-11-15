# PULSE · Panduan warna

Dibuat dari `src/lib/pulseColorGuide.js` oleh `node scripts/pulse-color-guide.mjs`. Jangan diedit tangan; ubah sumbernya.

**Aturan dasar.** Warna dipilih menurut arti, bukan menurut selera. Semua warna berasal dari token `--ps-*` di `src/pulse/pulse-tokens.css` dan `src/pulse/ds/analytics-kit.css`; mode gelap mengganti nilainya, bukan namanya. Tidak ada warna heksa, rgb, atau hsl di CSS halaman. Warna tidak pernah menjadi satu-satunya penanda: selalu ada teks, bentuk, atau ikon.

## Permukaan

Tempat konten diletakkan. Netral dengan sedikit nada ungu; tidak membawa makna.

**Aturan:** Halaman memakai bg, kartu memakai panel, kelompok kontrol atau latar media memakai soft. Jangan mewarnai setiap wadah dengan lavender.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-bg` | Halaman | Latar seluruh halaman |
| `--ps-panel` | Panel | Kartu, panel, tile, input |
| `--ps-soft` | Lembut | Kelompok kontrol, kepala tabel, jalur bar, latar media |
| `--ps-selected` | Terpilih | Baris atau kartu yang sedang dipilih; sorotan hover lembut |
| `--ps-line` | Garis pemisah | Memisahkan, tidak membawa makna (kontras sengaja rendah) |
| `--ps-control-line` | Tepi kontrol | Batas tombol, input, dropdown (kontras minimal 3:1) |

## Teks

Tingkat penekanan: utama, sekunder, aksen.

**Aturan:** Teks di atas panel atau halaman memakai ink, muted, atau accent. Warna *-ink hanya untuk teks di atas isian pastelnya sendiri.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-ink` | Teks utama | Isi, judul, angka |
| `--ps-muted` | Teks sekunder | Label, keterangan, placeholder, tanggal |
| `--ps-accent` | Aksen | Tautan, fokus, ikon aktif di atas panel |
| `--ps-success-text` | Kabar baik | Teks atau ikon positif langsung di panel |
| `--ps-warning-text` | Perhatian | Teks atau ikon hati-hati langsung di panel |

## Aksi dan navigasi

Hal yang bisa ditekan, dan di mana pengguna berada.

**Aturan:** Satu aksi utama per tampilan. Lavender dicadangkan untuk hierarki aksi dan navigasi aktif, bukan hiasan.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-lavender` | Aksi utama | Tombol utama, navigasi aktif, chip terpilih |
| `--ps-accent-ink` | Teks di lavender | Label di atas isian lavender |
| `--ps-btn-reverse-bg` | Tombol terbalik | Satu aksi yang harus menonjol di permukaan berwarna |
| `--ps-on-accent` | Teks di aksen | Teks di atas isian --ps-accent |

## Status sistem

Keadaan pengumpulan dan sistem: berhasil, perlu perhatian, gagal, informasi.

**Aturan:** Jangan dipakai untuk sentimen. Selalu sertakan label teks; warna saja tidak cukup.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-mint` | Berhasil | Pengumpulan selesai, layanan aktif |
| `--ps-peach` | Perhatian | Sebagian, tertunda, perlu dicek |
| `--ps-danger` | Gagal | Galat dan kegagalan yang perlu tindakan |
| `--ps-info` | Informasi | Antrean, catatan netral |

## Sentimen

Hasil pembacaan isi: positif, netral, negatif. Tak berlabel adalah "belum dibaca", bukan netral.

**Aturan:** Solid untuk tanda di grafik; soft + ink untuk tag. Positif dan negatif tidak boleh dibedakan hanya lewat warna: pakai bentuk atau label.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-sent-positive` | Positif | Titik, garis, batang |
| `--ps-sent-neutral` | Netral | Titik, garis putus-putus |
| `--ps-sent-negative` | Negatif | Titik, garis dengan berlian |
| `--ps-sent-unknown` | Belum berlabel | Diarsir atau putus-putus, jangan abu-abu polos |

## Platform

Asal posting. Hanya untuk orientasi; tidak menyiratkan mutu data.

**Aturan:** Jangan memakai warna sentimen untuk platform dan sebaliknya. Ikon platform selalu menyertai warna.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-plat-instagram` | Instagram | — |
| `--ps-plat-tiktok` | TikTok | — |
| `--ps-plat-x` | X | — |
| `--ps-plat-youtube` | YouTube | — |
| `--ps-plat-facebook` | Facebook | — |
| `--ps-plat-threads` | Threads | — |
| `--ps-plat-news` | Berita | — |
| `--ps-plat-reddit` | Reddit | — |
| `--ps-plat-web` | Web | — |

## Seri grafik

Beberapa seri tanpa makna sentimen atau platform; urutannya yang menentukan.

**Aturan:** Pakai berurutan dari 1. Satu rona (--ps-chart-1) untuk satu ukuran yang makin besar, seperti peta.

| Token | Nama | Dipakai untuk |
| --- | --- | --- |
| `--ps-chart-1` | Seri 1 | Warna data utama dan peta |
| `--ps-chart-2` | Seri 2 | — |
| `--ps-chart-3` | Seri 3 | — |
| `--ps-chart-4` | Seri 4 | Suka |
| `--ps-chart-5` | Seri 5 | Komentar |
| `--ps-chart-6` | Seri 6 | — |

## Pasangan teks dan isian

Isian pastel (`--ps-lavender`, `--ps-mint`, `--ps-peach`, `--ps-danger`, `--ps-info`) tetap terang di mode gelap, jadi tinta pasangannya (`--ps-accent-ink`, `--ps-success-ink`, `--ps-warning-ink`, `--ps-danger-ink`, `--ps-info-ink`) tetap gelap. Tinta itu hanya untuk teks di atas isiannya sendiri. Di atas panel atau halaman pakai `--ps-ink`, `--ps-muted`, `--ps-accent`, `--ps-success-text`, atau `--ps-warning-text`.

## Pengecualian yang sah

- Kanvas jaringan (`.nx`) punya tema visualisasi gelap sendiri.
- Panel masuk (`--ps-brand-*`) adalah permukaan merek tetap di kedua mode.
- Laporan cetak dan mode kontras tinggi menimpa token dengan nilai tetap di dalam blok `@media print` atau `forced-colors`.

## Menambah warna

1. Cari baris di tabel yang artinya sama. Pakai tokennya.
2. Tidak ada? Tambahkan token bernama menurut arti (bukan menurut warna) di kedua tema, ukur kontrasnya (teks 4,5:1, tanda 3:1), lalu tambahkan barisnya di `pulseColorGuide.js`.
3. `npm test` gagal bila ada warna literal baru di CSS atau token di panduan yang tak ada di CSS.
