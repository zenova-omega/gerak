# Admin Command Center — Fase 1 (Shell + AI Service + Pulse Listening)

**Tanggal:** 2026-06-06
**Status:** Design — menunggu review user
**Project:** SINAR (gerak-ui) — React 19 + Vite + Tailwind (frontend), FastAPI + PostgreSQL (backend)

---

## 1. Konteks Program (umbrella)

Tujuan jangka panjang: satu **Admin Command Center** bertenaga AI untuk brand agency yang mengelola banyak influencer / outlet / cabang franchise. Command Center terdiri dari 5 modul:

| Modul | Fungsi | Fase |
|---|---|---|
| **Pulse** | Social listening — cari isu/post yang lagi dibicarakan (RSS, Browserless, n8n) → dedup → Top Isu | **1 (nyata)** |
| **Studio** | Pembuatan konten AI — clipper video→klip, gambar/meme, teks/caption | 2 (prototype) |
| **Scheduler** | Distribusi — jadwalkan posting dari akun resmi via API resmi + OAuth vault | 3 (prototype) |
| **Rally** | Koordinasi engagement — reminder consent-based ke outlet untuk like/komen sendiri | 3 (prototype) |
| **Campaigns** | Orkestrasi narasi — ikat Isu → Konten → Jadwal → Reminder jadi satu kampanye | 4 (prototype) |

Tiap fase punya siklus sendiri: **spec → plan → build**. Dokumen ini hanya mencakup **Fase 1**.

### Pendekatan build
- **Hybrid:** Pulse dibangun dengan integrasi nyata (RSS/Browserless tidak butuh OAuth). Modul lain menyusul sebagai placeholder "coming soon" sampai kredensial siap.
- **AI layer pluggable:** default Claude untuk teks/narasi; provider gambar/speech terpisah, ditentukan belakangan.

### Guardrail legitimasi (mengikat seluruh program)
- Konten distribusi hanya dari **akun resmi milik brand/outlet** via **API resmi** platform.
- "Orkestrasi narasi" = arah editorial konten brand sendiri — **bukan** menyetir akun pihak lain.
- Engagement (Rally) = **reminder consent-based**; like/komen dilakukan pemilik akun manusia secara sadar. Tidak ada otomasi like/komen, tidak ada penyamaran aktivitas terkoordinasi sebagai organik, tidak ada stagger-timing untuk menghindari deteksi.
- **TIDAK dibangun (di luar scope permanen):** otomasi like/komen massal, generator komentar palsu "organik", penargetan narasi terselubung per demografi lewat banyak akun.
- **Listening (Pulse):** hanya konten publik. Hormati `robots.txt` dan ToS platform. Rate-limit. Tidak mengakses area yang butuh login.

---

## 2. Scope Fase 1

**Dibangun (nyata, end-to-end):**
1. Command Center shell + navigasi sidebar (5 modul; hanya Pulse aktif).
2. AI Service abstraction (interface + provider Claude) — dipakai opsional oleh Pulse, fondasi untuk fase berikut.
3. Pulse: ingest (RSS Google News + Browserless) → normalize → dedup/cluster → rank → dashboard "Top Isu".

**Placeholder (tidak fungsional):** Studio, Scheduler, Rally, Campaigns = layar "coming soon".

**Di luar scope Fase 1:** OAuth platform, posting, video processing, generasi gambar, alur kampanye.

---

## 3. Arsitektur Pulse

```
SUMBER ───► NORMALIZE ───► DEDUP/CLUSTER ───► RANK ───► "TOP ISU"
                                                          (dashboard admin)

Sumber:
  • RSS Google News  → per Watch Topic (kata kunci) → feed, tanpa API key
  • Browserless.io   → render & scrape halaman publik tanpa RSS
  • n8n (opsional)   → workflow eksternal push item ke webhook kita
```

1. **Watch Topic** — admin daftarkan kata kunci/isu yang dipantau. Tiap topik → query Google News RSS (`https://news.google.com/rss/search?q=<query>`) + (opsional) daftar target URL Browserless.
2. **Normalize** — setiap item → skema seragam (`SourceItem`).
3. **Dedup/cluster** — **deterministik** (SimHash atas teks ternormalisasi; threshold Hamming distance). Item mirip → satu `Issue`. Tidak butuh AI key. Upgrade ke embedding menyusul (opsional).
4. **Rank** — skor Issue = f(volume item, recency, sinyal reach/engagement bila ada).
5. **Surface** — dashboard "Top Isu Hari Ini"; tiap Issue expandable ke item sumber. Tombol "Buat Campaign dari isu ini" = disabled (placeholder Fase 4).
6. **AI opsional** — ringkasan + sentimen per Issue lewat AI Service. Jika `ANTHROPIC_API_KEY` tidak ada, Pulse tetap jalan penuh tanpa kolom sentimen.

---

## 4. Data Model (backend, SQLAlchemy + Alembic)

### `WatchTopic`
```
id            UUID PK
label         str            # "Franchise X"
query         str            # kata kunci pencarian
sources       JSON           # ["rss"], opsional ["browserless"] + target URLs
is_active     bool
crawl_interval_minutes int   # default 60
last_crawled_at  datetime?
created_by    UUID FK -> user
created_at    datetime
```

### `SourceItem`
```
id            UUID PK
topic_id      UUID FK -> WatchTopic
source        str            # rss | browserless | n8n
platform      str?           # news | instagram | tiktok | x | youtube | web
url           str
title         str?
text          text
author        str?
published_at  datetime?
metrics       JSON?          # reach/engagement bila tersedia
simhash       bigint         # untuk dedup
issue_id      UUID FK -> Issue?
crawled_at    datetime
UNIQUE (topic_id, url)
```

### `Issue` (cluster)
```
id            UUID PK
topic_id      UUID FK -> WatchTopic
title         str            # judul representatif (item paling awal/teratas)
item_count    int
score         float          # hasil ranking
first_seen_at datetime
last_seen_at  datetime
sentiment     float?         # -1..+1, diisi AI bila tersedia
summary       text?          # ringkasan AI bila tersedia
created_at    datetime
```

---

## 5. Backend — Endpoints & Services

Semua endpoint di bawah `require_admin` (middleware sudah ada).

```
GET/POST/PUT/DELETE  /api/admin/pulse/topics
POST                 /api/admin/pulse/topics/{id}/crawl     # trigger crawl manual
GET                  /api/admin/pulse/issues                # ranked; filter ?topic_id&since
GET                  /api/admin/pulse/issues/{id}           # + daftar SourceItem
POST                 /api/admin/pulse/webhook/n8n           # ingest item dari n8n
```

**Services:**
- `services/ingest/rss.py` — fetch & parse Google News RSS (pakai `httpx` yang sudah ada + `feedparser`).
- `services/ingest/browserless.py` — panggil Browserless.io REST untuk render & ekstrak konten publik; hormati robots/rate-limit.
- `services/dedup.py` — hitung SimHash, cari/assign Issue berdasarkan kedekatan.
- `services/ranking.py` — skor & urutkan Issue.
- `services/ai/base.py` — interface `AIService` (`generate_text`, `analyze`; stub `generate_image`, `transcribe` untuk fase nanti).
- `services/ai/providers/claude.py` — implementasi Anthropic. Dipilih via `AI_PROVIDER` env.
- **Job runner:** APScheduler in-process di FastAPI startup — crawl periodik tiap `WatchTopic` aktif sesuai `crawl_interval_minutes`. Idempoten (dedup mencegah duplikat).

**Router baru** didaftarkan di `server/app/main.py`. Migrasi via Alembic.

---

## 6. Frontend — Komponen & Hooks

- **Shell:** `src/pages/admin/CommandCenter.jsx` — layout sidebar 5 modul, route di bawah `/admin` (di `Router.jsx`). **Terpisah** dari `App.jsx` (511KB) — modul baru tidak menambah monolit.
- **Pulse:**
  - `src/components/admin/pulse/PulseDashboard.jsx` — board "Top Isu".
  - `src/components/admin/pulse/IssueCard.jsx` — kartu Issue expandable ke item sumber.
  - `src/components/admin/pulse/TopicManager.jsx` — CRUD Watch Topic + tombol "Crawl sekarang".
- **Hooks:** `src/hooks/usePulse.js` → `useTopics`, `useIssues(filters)`, `useCrawl()`. Reuse pola `useApi` + `defaultData` (fallback mock sudah ada di codebase).
- Placeholder modul lain: komponen "ComingSoon" sederhana di sidebar.

---

## 7. Konfigurasi Env baru

```
BROWSERLESS_API_KEY   # Fase 1, untuk scrape halaman publik tanpa RSS
AI_PROVIDER=claude    # default
ANTHROPIC_API_KEY     # opsional — aktifkan sentimen/ringkasan AI di Pulse
```
RSS Google News tidak butuh key.

---

## 8. Pengujian

- **Unit (pytest):** `dedup.py` (SimHash & clustering near-duplicate), `ranking.py` (urutan skor), RSS parser (fixture feed XML), normalizer.
- **Integrasi:** endpoint Pulse dengan DB test (CRUD topic, ingest → issues, webhook n8n). Mock Browserless & RSS HTTP via `httpx` mock.
- **Frontend:** render PulseDashboard dengan mock data; TopicManager CRUD happy-path.
- **AI opsional:** test path "tanpa AI key" memastikan Pulse tetap berfungsi (sentiment null).

---

## 9. Risiko & Catatan

- **Browserless ToS:** pastikan target scrape adalah konten publik & boleh di-scrape; sediakan rate-limit + allowlist domain di config.
- **Google News RSS** kadang membatasi/redirect; tangani gracefully (retry, log, skip item rusak).
- **SimHash threshold** perlu tuning — mulai konservatif (Hamming ≤ 3) lalu sesuaikan.
- **APScheduler in-process** cukup untuk skala awal; bila perlu skala besar, pindah ke worker terpisah (di luar scope Fase 1).
```
