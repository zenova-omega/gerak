# Laporan PULSE: KPI produk dan pilihan AI — rencana kerja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Laporan mencetak KPI produk lewat fungsi bersama dan bisa menyertakan Ringkasan AI dan AI Insights tersimpan.

**Architecture:** Logika tile Ikhtisar pindah ke `src/lib/pulseKpis.js` dan dipakai Ikhtisar dan laporan. Grafik laporan
memakai `trendSeries` sehingga lonjakan (spike_v1, server) sama dengan Ikhtisar. Pilihan AI: bagian `insights` dan
`ai.summary` di pengaturan laporan (server menyimpan kunci baru itu).

**Tech Stack:** React 19 + Vite, node:test + SSR (`renderToStaticMarkup` lewat Vite), FastAPI + pytest.

**Spec:** `docs/superpowers/specs/2026-11-16-pulse-laporan-kpi-ai-design.md`

## Global Constraints
- Tidak ada rumus baru; angka lewat `pulseMeasures`, `pulseReadings`, `pulseInsightMetrics`, `overviewEvidence`, `trendSeries`, `useTrendSpikes`.
- Tidak ada nama model/pemasok di UI, payload, atau JS. Membuka laporan tidak memanggil AI; tes tidak memanggil model/jaringan.
- Tidak commit (pemilik belum meminta). Cek mtime sebelum menyunting berkas bersama.
- Tes frontend: `node --test src/pulse/*.test.mjs src/pulse/*.test.js src/lib/pulse*.test.js src/lib/*.test.mjs`; server dari folder privat (memori `pulse-test-commands`).

## Review Focus
- Laporan tanpa periode pilihan: KPI Penyebutan memakai pembanding "hari terakhir", catatan sama dengan Ikhtisar (Task 1).
- Arsip dibuka: tidak ada pembanding periode lalu, tidak ada teks AI; teks menjelaskan (Task 1, Task 4).
- Panggilan lonjakan gagal / belum dijawab: tabel berkata "belum dapat diperiksa", tidak ada tanda palsu (Task 2).
- AI belum aktif (`available: false`) atau tulis gagal (503/409/5xx): tombol tidak muncul / pesan jelas (Task 4).
- Insights tersimpan untuk cakupan lain: dicetak dengan kalimat cakupan, tombol tulis ditawarkan (Task 4).

---

### Task 1: KPI bersama (`projectKpis`) di Ikhtisar dan Ringkasan eksekutif

**Files:** Create `src/lib/pulseKpis.js`, `src/lib/pulseKpis.test.js`. Modify `src/pulse/ProjectOverview.jsx` (tile),
`src/components/ui/PulseTag.jsx` (`PulseDelta` pakai `deltaText`), `src/components/ui/PulseAnalytics.jsx` (`PulseStat` pakai
`shareText`), `src/pulse/ProjectReport.jsx` (muat periode lalu lewat `usePreviousPosts` + `previousPeriod`),
`src/pulse/ReportPages.jsx` (SummaryPage: grid 6 KPI menggantikan 4 angka), `src/pulse/ds/report-pages.css`.

**Interfaces — Produces:**
- `deltaText(value: number, unit = '%') -> string` ("+18,2%", "−6 poin" memakai format PulseDelta sekarang).
- `shareText(share: number) -> string` ("<1%" untuk 0<x<1, selain itu dibulatkan).
- `projectKpis(evidence, {period, comparisonError=false, archived=false}) -> Kpi[]`, `evidence` = hasil `overviewEvidence`.
  `Kpi = {key, label, value, delta, deltaUnit, deltaIntent, deltaNote, share, shareLabel, note, trend}`; keys berurutan:
  `mentions, unique, accounts, interactions, net, concentration`. Teks sama dengan Ikhtisar sekarang, kecuali pembanding
  periode ditulis `vs ${groupDayRange(from,to)}` dan catatan arsip `Perbandingan tidak disimpan dalam arsip`.

- [ ] Tes gagal: `pulseKpis.test.js` — enam key berurutan; Penyebutan dengan periode + 10 vs 8 posting lalu → delta 25,
  deltaNote "vs 22–28 Okt 2026"; tanpa periode → delta dari `recentChange`; archived → note arsip; error → "Perbandingan belum tersedia";
  net/concentration sama dengan `netSentiment`/`accountConcentration`; `deltaText(-6,' poin')==='−6 poin'`? (pakai tanda dari toLocaleString: "-6 poin").
- [ ] Implementasi; Ikhtisar memetakan Kpi ke `PulseStat` (ikon per key, link untuk net & concentration).
- [ ] Tes laporan: `project-report.test.mjs` Ringkasan eksekutif memuat enam label KPI; arsip memuat catatan arsip.
- [ ] Jalankan seluruh tes frontend.

### Task 2: Grafik laporan di atas `trendSeries` + lonjakan

**Files:** Modify `src/lib/pulseReportPages.js` (`trendBuckets(posts, range, maxBars=92)`), its test, `ReportPages.jsx`
(TrendPage: tanda lonjakan + daftar "Lonjakan"), `ProjectReport.jsx` (`useTrendSpikes(trend.rows)`), CSS.

**Interfaces:** `trendBuckets` returns `{unit, rows, max, peak}`; row = trendSeries row + `date`(=from), `end`(=to),
`total`(=posts). `ReportPages` prop `spikes: {posts: Spike[], interactions: Spike[], asked: boolean}`; teks baris dari
`spikeLines(spikeFacts(posts,row), spike, key, {unit, platformName})[0]`.

- [ ] Tes gagal: trendBuckets direntang ke periode pilihan (hari kosong di ujung), minggu bila > 92 hari; TrendPage
  dengan spikes diberikan → "Lonjakan" + kalimat "×"; tanpa jawaban → "Lonjakan belum dapat diperiksa".
- [ ] Implementasi, tes hijau.

### Task 3: Konsentrasi akun dan kelengkapan data

**Files:** `pulseReportPages.js` (`reportData` + `concentration`, `coverage`), `ReportPages.jsx` (SourcesPage, MethodPage),
`CoverageBadge.jsx` (ekspor `coverageLevelName`, `coverageShareWords`, `coveragePercent`), tes.

- [ ] Tes gagal: SourcesPage memuat "3 akun teratas" dan "akun untuk 80%"; MethodPage memuat kalimat tingkat
  ("Lengkap: sentimen sudah dianalisis pada 100% posting") dan kolom Interaksi diketahui / Jam terbit dari coverage_v1.
- [ ] Implementasi, tes hijau.

### Task 4: Pilihan AI (Ringkasan AI, AI Insights)

**Files:** `server/app/services/pulse_report_settings.py` (+`ai.summary` ∈ {None,'off','executive','brief','timeline'}),
`server/tests/test_pulse_report_pdf.py`; `pulseReportPages.js` (`reportSections` + `insights` bawaan mati,
`reportSettings`/`settingsPayload` + `ai`, `storedSummary(payload, choice)`, `storedInsights(payload)`),
`ProjectReport.jsx` (state ringkasan tersimpan + tulis), `ReportBuilder.jsx` (grup "Isi AI"), `ReportPages.jsx`
(InsightsPage), tes.

**Interfaces:** settings `{sections, brand, ai: {summary: null|'off'|'executive'|'brief'|'timeline'}}`;
`storedSummary(payload, choice=null)` — null: executive lalu brief; 'off': null; format: format itu saja.
`storedInsights(payload) -> {createdAt, scope, view: insightView(...)}|null`.

- [ ] Tes gagal server: `ai` disimpan dan dibaca; nilai lain ditolak; tanpa `ai` → `{'summary': None}`.
- [ ] Tes gagal frontend: urutan bagian baru; insights mati bawaan; storedSummary per pilihan; InsightsPage mencetak judul,
  butir bernomor, daftar bukti, kalimat cakupan bila beda; builder menampilkan status dan tombol tulis hanya saat perlu.
- [ ] Implementasi, seluruh tes hijau.

### Task 5: Periksa di server salinan
- [ ] Salinan DB + API 8011 (demo-output/tools), Playwright: layar dan PDF/cetak untuk URL pemilik; tangkapan layar.
- [ ] Laporkan ke pemilik; sebut restart API live yang dibutuhkan untuk menyimpan `ai.summary`.
