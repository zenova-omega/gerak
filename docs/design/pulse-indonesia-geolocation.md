# Peta Indonesia

Mode Jaringan → Peta Indonesia menggunakan geometri Natural Earth 1:110 juta yang disimpan lokal di `src/pulse/indonesia-boundary.json`. Sumber: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . Referensi skala kecil, bukan batas administratif terkini; pulau kecil tidak seluruhnya tergambar.

Pilihan Indonesia / Jawa–Bali, titik yang dapat dipilih dengan mouse atau keyboard, serta detail provenance tersedia. Titik hanya menerima koordinat numerik valid, provenance tidak kosong dan count positif. Bounding box adalah jendela peta, bukan verifikasi bahwa titik berada dalam wilayah administratif Indonesia.

Saat ini backend belum menghasilkan lokasi geotag dari provider sehingga peta menampilkan status belum ada koordinat. Tidak ada crawl/geocoding baru, inferensi lokasi akun, atau data marker buatan. Layer lokasi profil dan tempat dalam teks belum diimplementasikan dan dijelaskan sebagai kategori berbeda. Peta mengikuti dataset periode global project, bukan jumlah penonton atau domisili pengguna.

Uji helper geografi, suite frontend non-browser, lint dan build berhasil. Tampilan kosong diperiksa langsung di Chrome. Jalur marker disiapkan untuk data berprovenance yang kelak tersedia; ini bukan klaim integrasi lokasi provider sudah selesai.
