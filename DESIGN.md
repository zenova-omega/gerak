---
name: PULSE
description: Ringkasan yang tenang, bukti yang dapat ditelusuri.
colors:
  surface: "oklch(99% 0.003 285)"
  canvas: "oklch(97% 0.006 285)"
  ink: "oklch(26% 0.012 285)"
  muted: "oklch(47% 0.016 285)"
  lavender: "oklch(88% 0.055 295)"
  mint: "oklch(91% 0.038 160)"
  peach: "oklch(92% 0.043 65)"
typography:
  heading:
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif'
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control: "12px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.lavender}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
---

# PULSE design system

## Analytics kit, 13 November 2026

Runtime: `src/pulse/ds/analytics-kit.css` (tokens and styles), `src/lib/pulseChartTheme.js` (colour maps for charts), `src/components/ui/PulseTag.jsx`, `src/components/ui/PulseAnalytics.jsx`. Live reference in the Settings gallery. Use these before writing a local badge, KPI block or bar list.

### Data colour is separate from status colour

| Family | Tokens | Rule |
| --- | --- | --- |
| Sentiment | `--ps-sent-{positive,neutral,negative,unknown}` plus `-soft` and `-ink` | Solid for chart marks, soft + ink for tags. Unknown is hatched or dashed, never a flat grey that reads as neutral |
| Platform | `--ps-plat-{instagram,tiktok,x,youtube,facebook,threads,news,web}` | Orientation only. Never implies data quality |
| Categorical | `--ps-chart-1` to `--ps-chart-6` | Series with no sentiment or platform meaning |
| Status | `--ps-mint`, `--ps-peach`, `--ps-danger`, `--ps-info` | Collection and system state only. Do not use mint or peach for sentiment |

All families have light and dark values. Charts read them as CSS variables, so a theme switch needs no re-render.

### Tags

`PulseTag` is the one anatomy: 24px high (20 `sm`, 32 `lg`), 6px radius, 12px semibold, optional dot, icon, count. Variants: `soft` (default), `outline`, `solid`. It is a `span` unless given `pressed`/`onClick` (toggle with `aria-pressed`), `onRemove` (removable filter chip, whole chip is the button) or `href`.

- `SentimentTag value` for content sentiment. `PlatformTag platform` for sources. `KeywordTag` for keywords and hashtags.
- `PulseBadge` remains for collection status and shares the same metrics.
- `PulseDelta value` shows change against a comparison period. Neutral by default: rising volume is neither good nor bad. Pass `intent="good"|"bad"` only when direction has a known meaning.
- Legacy `.ps-sentiment-badge` is restyled to the same anatomy; prefer `SentimentTag` in new code.

### Analytics surfaces

- `PulseStatGrid` + `PulseStat`: one bordered surface with divided cells, not a grid of separate cards. Label, value, optional delta, note, optional sparkline. `null` renders as unavailable, never zero. A cell becomes a button or link when it drills into evidence. Sparkline needs two or more points.
- `AnalyticsPanel`: title, description, `actions` on the right, content, `footer` for methodology. One level only; no cards inside it.
- `PulseDistribution`: part-to-whole on one stacked bar with an addressable row per part (label, count, share).
- `PulseBreakdown`: ranked rows with value, share and a proportional track; rows open their evidence.
- `PulseLegend`, `PulseChartTooltip`: shared key and tooltip for Recharts. Stacked sentiment charts use `sentimentOrder` so segment order never changes between pages.
- `PulsePanelEmpty`: says what is missing and what to do next. No placeholder numbers.

Applied to Ikhtisar, Sentimen, Akun & sumber, Posting, Komentar (comment stat strip, sentiment and stance tags, response tracks in data colours), Infografik (location coverage strip, bar colours, caution note without a side stripe) and Monitor (queue stat strip, alert-kind and job-status tags, schedule badges, shared buttons). Laporan uses the stat strip for headline figures and sentiment, the shared legend, data colours in the daily trend, platform tags, and the interaction detail in the summary and on each top post. Jaringan uses a summary strip, tag toggles for the analysis focus, a strip for narrative size and tags for account assessment. The network explorer canvas, replay and chronology cards keep their own visualization theme.

Print: every themed token returns to its light value under `@media print`, so a report printed from the dark theme is a light page. Sparklines, info buttons and on-screen links are not printed.

### Interaction detail

`PulseEngagement` (`src/components/ui/PulseEngagement.jsx`, maths in `src/lib/pulseEngagement.js`) replaces a bare interaction total wherever one post or a set of posts is summarised: total, a composition bar, likes, comments, shares, views, and two derived indicators.

- **Kualitas interaksi** = (komentar + bagikan) ÷ (suka + komentar + bagikan). Comments and shares take more effort than a like. It is shown only when likes and at least one of comments or shares were observed; otherwise "Belum dapat dihitung", never a flattering 100%.
- **Rasio interaksi** = interaksi ÷ tayangan, from posts that report both.
- Views are exposure and never enter the interaction total. A metric the source did not send stays "—". Both formulas sit behind an info tip next to the figure.
- Metric marks (`PulseMetricIcons.jsx`): `PulseLike`, `PulseComment`, `PulseShare`, `PulseView`, `PulseBeat`. Interaction marks carry one heartbeat; the eye does not. Part colours are `--ps-eng-likes`, `--ps-eng-comments`, `--ps-eng-shares`.

Used in Ikhtisar ("Rincian interaksi"), post cards and sentiment evidence cards. A card gets one rule per break: the interaction block owns the line above it and the footer has none.

### Floors from the all-page audit, 13 November 2026

Text is never below 12px. Disclosure rows and inline evidence links are at least 32px tall on desktop and 44px on phones. Legacy hard-coded greens in comments and post disclosures follow theme tokens. No side-stripe borders remain in PULSE styles.

### One scale for every element, 13 November 2026

Measured across all twelve pages and enforced in `analytics-kit.css` and `pulse-tokens.css`. New styles pick from these; they do not add a value.

| Property | Scale | Tokens |
| --- | --- | --- |
| Radius | 3 marks, 6 tags, 8 controls and inner surfaces, 12 panels, pill for tracks, circle for avatars | `--ps-radius-mark`, `--ps-tag-radius`, `--ps-radius-control`, `--ps-radius-panel` |
| Type size | 12, 13, 14, 16, 18, 20, 24, 28, 32px (word cloud sizes are data) | |
| Weight | 400 body, 600 labels, 650 strong and headings, 800 wordmark only | `--ps-weight-body`, `--ps-weight-label`, `--ps-weight-strong` |
| Control height | 44px for buttons, selects and inputs; 32px info buttons on desktop | `--ps-control-height` |
| Layering | raised 1, dropdown 10, drawer 80 and 81, skip link 100 | `--ps-z-*` |

Tracking is normal everywhere except the wordmark and the uppercase section eyebrows (both .08em). Source labels such as "Caption asli" stay sentence case. Headings balance and paragraphs wrap pretty. No gradients: the sparkline fill is flat, and the only patterned fill is the hatch that marks "Belum dianalisis", which carries meaning. An empty state offers one next action through `PulsePanelEmpty action`.

### Signature marks

- `PulseArrow` (`src/components/ui/PulseArrow.jsx`): a diagonal arrow whose shaft carries one heartbeat. It replaces the text glyph and the generic icon wherever a control leaves the summary for the source or a deeper view. It nudges 2px up-right on hover; reduced motion disables that. The CSS mask `--ps-arrow-mask` draws the same mark in pseudo-elements.
- Buttons have a keycap edge: primary and secondary sit on a hard 2px base (`--ps-button-edge`, no blur) that closes when pressed. This is the one sanctioned shadow in the product; quiet, toggle, segmented and disabled buttons have none. `PulseButton arrow` appends the PULSE arrow.

## Cross-page patterns

`src/components/ui/PulsePatterns.jsx` exports `PulseSourceHeading` and `PulsePanelHeading`. Use these before creating another publisher identity or section header. Source cards in Posting, Overview evidence, Sentiment and Reports share the first; analytics panels and Monitor share the second. `brand-system.css` applies the common standalone surface and spacing contract. Tokens `--ps-card-padding`, `--ps-section-gap`, `--ps-caption-size` live in `pulse-patterns.css`. The Settings gallery documents the actual components with explicitly labeled samples. No crawler or quota changes are part of this visual migration.

## Reporting identity, 13 November 2026

Brand specification: `docs/PULSE-BRAND-GUIDELINES.md`. The reporting page uses a compact PULSE masthead, four-field fact strip, section navigation and the reusable `ReportPostCard` built on `PostAvatar`. `report-brand.css` scopes the new layout to reports, preserves theme tokens and provides A4 print rules. Unique account counts come from all filtered posts, never the top-ten account ranking. Unknown sentiment remains explicit. This pass does not migrate unrelated legacy cards.

## Component contract, 12 November 2026

Runtime source of truth: `src/pulse/pulse-tokens.css`. Live reference: **Pengaturan → PULSE / UI foundations** (`/pulse/settings#pulse-design-system`). This reference is authenticated, uses the actual shared components, and never crawls data. Its sample numbers are explicitly labeled as examples.

### Semantic roles

| Role | Token | Rule |
| --- | --- | --- |
| Canvas / reading surface | `--ps-bg`, `--ps-panel` | Neutral, faint violet tint; do not tint every container lavender |
| Secondary surface | `--ps-soft` | Media backdrop, grouped controls, not every individual metric |
| Selected option | `--ps-selected` | Quiet row tint; checkbox remains the primary selection indicator |
| Main action / active navigation | `--ps-lavender`, `--ps-accent-ink` | Reserve the stronger pastel for action hierarchy |
| Link / focus | `--ps-accent` | Consistent across themes; visible outline in addition to hover |
| Control boundary | `--ps-control-line` | Stronger than decorative dividers; secondary buttons remain visible |
| Informational / queue | `--ps-info`, `--ps-info-ink` | Cool pastel, always include a label |
| Error | `--ps-danger`, `--ps-danger-ink` | Red-tinted surface and readable text; distinct from warnings |

Light and dark selected, info, error, and control-boundary roles have their own OKLCH values. Never infer sentiment from collection status. Accent is not a substitute for meaning.

### Interaction and typography

- Shared action height: `--ps-control-height: 44px`; selected platform rows also provide a full clickable target.
- Main body/caption: 16px, line height 1.65, maximum 70ch. Compact metadata remains 12px, with sufficient contrast.
- Page title 32px, section title 20px, source caption 16px regular. Source text must not resemble a PULSE conclusion.
- Neutral thin borders, no nested metric cards, no decorative shadows. Each post is one independently actionable surface.
- Buttons have primary, secondary, quiet, disabled, busy, hover, active and visible focus states. Reduced-motion disables shared action transitions.

### Evidence card anatomy

1. Identity: avatar, source account, platform and publication time.
2. Analysis state: labeled sentiment or 'Belum dianalisis', visually subordinate to the account.
3. Content: image/video preview plus **Caption asli** in regular body type. News retains its source headline and a **Teks sumber berita** label.
4. Interaction summary and a compact metric row. `PulseMetric` preserves zero and exposes missing values as 'Tidak tersedia' to assistive technology.
5. Snapshot time and secondary details.

`PostCaption` owns original-source text and full-text disclosure. `PostMediaPreview` owns thumbnail/placeholder, modal entry and source links. `MediaPlayer` owns direct video/embed/thumbnail fallback. Video never autoplays. A missing thumbnail is a compact, labeled state, not an empty poster-sized card. Keep provider content separate from PULSE conclusions.

### Migration scope

This pass migrates post captions, per-post metrics, media placeholders, shared buttons and platform selection. `DesignSystemGallery` uses those actual foundations. Legacy network visualization controls, project forms and some monitor widgets still need migration; do not claim full-product design-system compliance.

## Overview

Tenang, tepercaya, tajam. Ringkasan untuk pimpinan; detail bertingkat untuk analis. Sistem ini memperkuat identitas PULSE yang sudah ada, bukan memperkenalkan merek baru. Gunakan komponen produk yang familiar, informasi padat yang tetap terbaca, dan navigasi yang dapat diprediksi.

Scene: pimpinan membaca ringkasan di ruang terang pada siang hari; analis memantau isu dalam sesi panjang di ruang redup. Light dan dark theme sama pentingnya. Tidak ada tema yang dipaksakan oleh kategori social listening.

Sumber runtime: `src/pulse/pulse-tokens.css`. Spesifikasi ini mendokumentasikan subset token yang dipakai; perubahan token harus diperbarui di dokumentasi juga. Token PULSE di-scope ke `.pulse-standalone` agar tidak mengubah GERAK.

## Colors

Restrained: netral bernuansa lembut sebagai dasar, lavender untuk pilihan dan tindakan utama. Mint menandai berhasil, peach menandai perhatian. Semua status memiliki label teks, tidak hanya warna. Pastel platform membantu orientasi, bukan menyatakan kualitas data.

Dark theme memiliki canvas, panel, teks, garis, dan accent tersendiri pada selector `data-theme=dark`. Warna didefinisikan dalam OKLCH; jangan menambahkan warna satu kali untuk komponen baru tanpa kebutuhan semantik.

## Typography

Satu keluarga sans yang sudah tersedia di perangkat, tanpa ketergantungan font eksternal. Heading halaman 2rem, judul bagian 1.25rem, isi .875rem, metadata .75rem. Angka metrik memakai tabular numerals. Paragraf maksimal 70ch. Teks panjang dan nama akun harus dapat membungkus.

## Elevation

Permukaan datar dengan lapisan tonal dan garis tipis. Tidak memakai glassmorphism atau bayangan dekoratif. Jarak antarbagian 24px; kontrol memakai jarak 8–12px. Panel 12px, kontrol 8px. Fokus berupa outline yang jelas, bukan sekadar perubahan warna latar.

## Components

### Shared primitives

Import langsung dari `src/components/ui/PulseUI.jsx` agar bundle PULSE tidak menarik konstanta tema GERAK.

```jsx
<PulseButton variant="primary" busy={saving} busyLabel="Menyimpan…" onClick={save}>Simpan</PulseButton>
<PulseButton type="submit">Masuk</PulseButton>
<PulseBadge tone="success">Berhasil</PulseBadge>
<PulseNotice tone="warning" role="alert">Pengumpulan tidak berhasil.</PulseNotice>
```

`PulseButton`: primary, secondary, quiet; default `type=button`, explicit submit untuk form. Busy menonaktifkan tombol dan menyampaikan `aria-busy`. Tombol ikon saja harus memiliki nama aksesibel. Hover, active, focus, disabled dan busy berbagi bahasa visual yang sama.

`PulseBadge`: neutral, success, warning, accent. Noninteraktif, selalu dengan label. “Dikonfigurasi” bukan “Berhasil”.

`PulseNotice`: neutral atau warning. Gunakan `role=alert` untuk kegagalan tindakan, bukan catatan statis. Tindakan perbaikan tetap berupa tombol eksplisit.

### Source disclosure

`src/pulse/SourceDisclosure.jsx` adalah komponen domain, bukan primitive generik. Ringkasan berisi sumber, status terakhir, jumlah posting dan mode pengumpulan. Detail menampilkan kelengkapan kolom dan riwayat. Native details/summary mendukung keyboard; tidak ada tombol bersarang di summary. Membuka detail tidak memanggil API provider. Tombol pengumpulan tetap menjaga role, topik, status layanan, dan batas kuota.

Layout desktop menampilkan kolom perbandingan; layar sempit menyusun metadata ke baris berikutnya. Detail berubah dari dua kolom menjadi satu. Gerakan hanya rotasi chevron dan busy indicator; reduced motion meniadakan animasi.

### Migration status

### Workbench refinement

`src/pulse/dashboard-polish.css` aligns the existing domain panels to shared surface, typography, spacing, and interaction tokens. Project selection stays above the page; secondary collection controls live in an explicit disclosure. Overview links preserve the current project and alert query parameters. Account ranking supports local search without calling providers. All additions are scoped to the standalone product. The network explorer retains its separate visualization theme control.

Token semantik dipakai seluruh shell PULSE. Primitive baru dipakai pada Sumber & Cakupan, login, form kata sandi, kontrol shell, serta tombol aksi dashboard. Komponen grafik, jaringan, komentar, dan monitor lama masih memakai wrapper serta CSS domain masing-masing; migrasi penuh komponen tersebut belum dilakukan. Jangan mengklaim seluruh produk sudah memakai satu library komponen.

## Do's and Don'ts

### Shared page layout

`src/pulse/workspace-layout.css` defines screen-only spacing and responsive layout across PULSE. The content canvas is capped at 1680px with 20–40px desktop gutters and 16px mobile gutters. Project controls stay above page content without an extra card enclosure. Chart pairs stack on narrower screens; monitor cards use a content-sized responsive grid. Report print rules remain independent.

`WorkspaceNavigation` keeps the full sidebar on desktop and exposes a labelled disclosure below 1000px. It closes on page changes, supports Escape with focus restoration, and preserves all navigation destinations. Source identities, data filters, and collection behaviour remain unchanged.

- Do tampilkan ringkasan dahulu, detail melalui pengungkapan bertingkat.
- Do bedakan data kosong, nol teramati, dan tidak diketahui.
- Do gunakan token dan komponen bersama sebelum menulis varian lokal.
- Do pertahankan navigasi keyboard, fokus terlihat, dan reduced motion.
- Don't gunakan gaya dashboard militer/neon dan dekorasi berlebihan.
- Don't membuat grid kartu identik untuk informasi yang lebih mudah dibandingkan dalam daftar.
- Don't memakai garis aksen samping tebal, gradient text, atau animasi dekoratif.
- Don't mengubah data, kuota, atau klaim keberhasilan demi tampilan yang lebih menarik.

## Project scope bar and summary (14 Nov)

- **Scope is one click.** Period and platform are pressable chips under the project picker, always visible: Semua, Hari ini, 7 hari, 30 hari, Kustom; then one chip per platform. From "Semua", one click narrows to that platform; clearing the last returns to "Semua". Caveats live in the InfoTip beside each label, not in paragraphs.
- **Ikhtisar opens with one brief panel**: headline and lede, six figures, then "Sorotan": up to four observed facts (peak day, largest source, largest narrative, posts to review), each a whole-cell button that opens its evidence. Data notes sit in the panel footer.
- **Paired sections** (`.po-duo`) replace full-width panels with empty right halves: narratives beside interaction detail, spread beside comments.
- **Ranked lists are one surface with divided rows** (`.po-leaders`, `.po-narrative-list`), never a stack of bordered cards.
- **Post card tail**: evidence first, then one group of disclosure rows with a chevron, then the observation note.
- **A page section is not a card.** Infografik's outer wrapper has no border; only its panels do.
- Tooltips use `--ps-z-tooltip` (90), above the evidence drawer.
- Platform terms follow the source: Balasan and Repost on X and Threads.

## After the 14 Nov critique

- **Project bar is one line**: project picker, a scope summary button ("Semua periode · Semua platform · Ubah") and two actions. Period and platform chips open from the summary; it turns lavender when any filter is active. Links that duplicate the sidebar are gone.
- **One definition per number.** Interactions = observed likes + comments + shares (`postInteractions` in `src/lib/pulseEngagement.js`); the provider's own total stands in only when none of the three was reported. Sentiment percentages are shares of all posts in scope, everywhere.
- **Post cards scan first.** Collapsed: identity, sentiment tag, caption, one line of counts. "Rincian & tinjauan" opens the breakdown, review tools, comments and history.
- **Layer order**: dropdown 10, drawer 80/81, modal 85/86, tooltip 90. A viewer opened from inside the drawer covers it.
