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

## Control system (14 Nov)

Every button, dropdown, input and filter chip takes its size from the `--ps-control-*` tokens in `src/pulse/pulse-tokens.css`. Page CSS never sets a control's height, padding or font size.

| Token | Value | Use |
| --- | --- | --- |
| `--ps-control-md` | 44px | Default: buttons, dropdowns, inputs, the scope toggle, button-like links |
| `--ps-control-sm` | 36px | Filter chips, segmented-switch items, `size="sm"` buttons in dense rows. Becomes 44px under 700px wide |
| `--ps-control-xs` | 32px | The inline info button only |
| `--ps-control-pad-md` / `-sm` | 16px / 12px | Horizontal padding |
| `--ps-control-font-md` / `-sm` | 14px / 13px | One type size per control size; inputs and dropdowns are 16px under 700px so iOS does not zoom |
| `--ps-control-weight` | 600 | Label weight |
| `--ps-control-gap`, `--ps-control-icon` | 8px, 16px | Icon to label gap, icon size |
| `--ps-control-edge` | 2px | The keycap base under primary, secondary, reverse buttons and dropdowns |
| `--ps-control-focus` | 2px accent outline, 2px offset | Focus ring for every control |
| `--ps-radius-control` | 8px | Radius for every control |

Buttons (`PulseButton`):

| Variant | Look | When |
| --- | --- | --- |
| `primary` | Lavender fill, keycap edge | The one main action of a view |
| `secondary` (default) | Panel fill, control line, keycap edge | Everything else that acts |
| `quiet` | No fill or line | Low-stakes actions next to content, disclosure toggles |
| `reverse` | Ink fill, page-colour label (`--ps-btn-reverse-*`), keycap edge | The single action that must stand out on a tinted or busy surface. Flips with the theme. Never beside a `primary` |

`size="sm"` gives the 36px button; `iconOnly` gives a square one and requires `aria-label`.

Dropdown: a native `select` styled as a secondary button: 44px, keycap edge, caret drawn 16px from the right edge in the text colour. The project picker is the one exception in type (16px, weight 650) because it names the working context. Text inputs share the same box without the edge.

Filter chips: any pressable `PulseTag` is 36px with the control radius. Selected is a tinted fill; unselected is an outline. Static tags (sentiment, platform labels) keep their own smaller sizes because they are not controls.

Segmented switch (`.pm-view-switch`): a 44px track holding 36px items.

Live specimens are in the design-system gallery on the settings page.

## Surface, title, sidebar, table and search tokens (14 Nov)

All in `src/pulse/pulse-tokens.css`. Page CSS uses these instead of literal values.

| Group | Tokens | Rule |
| --- | --- | --- |
| Surface | `--ps-surface-radius` 12px, `--ps-surface-bg`, `--ps-surface-line`, `--ps-surface-pad` 20px, `--ps-surface-pad-sm` 16px, `--ps-surface-gap` 16px, `--ps-section-gap` 32px | Every card, panel and tile. `pad-sm` is for a block inside a panel and for all cards under 700px. No shadows on cards |
| Overlay | `--ps-shadow-overlay` | Drawers, dialogs and menus only |
| Titles | `--ps-title-page` 36px, `--ps-title-panel` 20px, `--ps-title-block` 16px, `--ps-title-weight` 650 | h1 is the page, h2 a panel, h3 a block. The printed report keeps its own document scale |
| Sidebar | `--ps-sidebar-width` 216px, `--ps-sidebar-pad` 16px, `--ps-nav-item-height` 44px, `--ps-nav-item-pad`, `--ps-nav-item-gap`, `--ps-nav-item-radius`, `--ps-nav-item-font`, `--ps-nav-hover-bg`, `--ps-nav-active-bg`, `--ps-nav-active-ink` | Navigation rows are the control height; active is the lavender fill with accent ink |
| Top bar | `--ps-topbar-gap` 12px, `--ps-search-width` 320px | Project picker, scope, search, then actions on the right |
| Search field | `--ps-field-icon` 16px, `--ps-field-icon-inset` 14px, plus the control tokens | `.pu-search`: a 44px input with a leading icon |
| Table | `--ps-table-head-bg`, `--ps-table-cell-pad-x` 16px, `--ps-table-cell-pad-y` 14px, `--ps-table-font` 13px | Ranking and data tables |

Top-bar search: when a project is selected, the bar always shows "Cari posting atau akun". Submitting opens Posting filtered by that text (`?find=`), matching post text, title and account name inside the stored data of the project. It never starts a crawl.

Login: the left panel is a fixed dark brand surface in both themes. Copy is short on purpose: the headline names the product category ("Social Media Listening", chosen by the owner on 14 Nov), one line, three single-line points. Every claim there must stay true to a shipped feature.

## Icon and symbol plan (14 Nov)

State today: navigation and actions use Lucide; five metric marks (like, comment, share, view, beat) are drawn in-house in `PulseMetricIcons.jsx`; the arrow is `PulseArrow`. The sidebar no longer repeats an icon (search, dashboard, sparkles, heart-pulse, file, newspaper, users, network, message, pie, radio, database).

The PULSE hand, taken from the wordmark and the existing marks:

- 16px grid for inline marks, 20px for navigation. 1.6px stroke at 16px, 1.75px at 20px. Round caps and joins. No fills except a 2px dot.
- One idea per icon. Interaction marks carry the heartbeat line; exposure marks (view, reach) never do, because exposure is not a reaction.
- Corners follow the control radius scaled to the grid (2px at 16px). Terminals end on the pixel grid.
- Colour is always `currentColor`. An icon never carries meaning alone: it sits beside a label or has an accessible name.

Build order, each phase replaces Lucide one group at a time so the two hands never mix inside one group:

| Phase | Set | Icons |
| --- | --- | --- |
| 1 | KPI marks (extends the existing five) | reach, impressions, engagement rate, saves, quotes, followers, growth, peak |
| 2 | Navigation (12) | search, overview, ask, sentiment, report, posts, accounts, network, comments, infographics, monitor, sources |
| 3 | States and evidence | collected, waiting, failed, needs review, source link, evidence, alert |
| 4 | Actions | filter, sort, period, platform scope, export, refresh |

Rules for the navigation set: no two items share a silhouette; an item's icon is reused wherever that page is linked from; active state changes colour only, never the drawing.

Each phase ships as components in `src/components/ui/` with a specimen row in the gallery and a 16px and 20px check in both themes.

## KPI and reporting components (14 Nov)

One vocabulary across cards, panels and the report. A value that was not observed shows "—", never 0.

| KPI | Definition in PULSE | Stored today |
| --- | --- | --- |
| Interaksi | likes + comments + shares that were observed | Yes, all social platforms |
| Suka, Komentar, Bagikan | Platform counts (Balasan and Repost on X) | Yes. Shares: 19% of TikTok, 80% of Instagram |
| Tayangan | Impressions on X, plays on TikTok and YouTube, video plays on Instagram | Yes. Instagram only 53% (video posts) |
| Rasio interaksi | Interaksi ÷ Tayangan | Derived, only where Tayangan exists |
| Simpan | Bookmarks on X, saves on Instagram, collects on TikTok | No. The provider offers it; not requested yet |
| Kutipan | Quote posts on X | No. Offered, not requested |
| Pengikut | Follower count of the account | No. Needs one profile lookup per account |
| Engagement rate | Interaksi ÷ Pengikut | No. Blocked on Pengikut |
| Jangkauan | Unique accounts that saw a post | Not available for other people's posts on any platform. Never label Tayangan as Jangkauan; if an estimate is added later it is labelled "perkiraan" and shows its formula |

Components:

- `PulseEngagement`: the breakdown of one post or one scope. Order is always Suka, Komentar, Bagikan, Tayangan; derived ratios sit after a divider with an info tip that states the formula.
- `PulseStat` / `PulseStatGrid`: one figure with label, note and optional trend. Used for KPI strips on pages and in the report.
- `PulseBreakdown` / `PulseDistribution`: part-to-whole (platform, sentiment).
- Report blocks reuse the same components at print size; the report never introduces a KPI the workspace does not show.

When Simpan, Kutipan and Pengikut are stored, they join `PulseEngagement` after Bagikan, and Engagement rate becomes a `PulseStat` next to Rasio interaksi.

## Page heading (14 Nov)

Every page starts with `PulsePageHead` and reads its content from `src/pulse/pageMeta.js`, the single source for a page's title, mark, tagline and guide. The sidebar reads the same file, so a page has one name and one mark everywhere.

- One row: 48px mark tile (lavender, accent ink), title (28px, weight 700) with the info button beside it, tagline under it, actions on the right.
- Tagline: five words or fewer, a noun phrase, no full stop ("Nada percakapan", "Jadwal dan alert"). It says what the page is, not how to use it.
- Guide: at most two sentences, opened from the info button. There is no separate help row.
- Under 700px the tagline hides and the mark is 40px.
- The mark is the page's navigation icon today. When the custom navigation set from the icon plan ships, it replaces the icon here and in the sidebar in the same change.

## Cross-page interaction patterns (14 Nov)

- **Hover preview**: a small card that answers "what is behind this?" without leaving the page. Opens after 350ms on hover and on keyboard focus, never on touch, and never holds the only path to an action. In use: the source post of a comment, the account behind a name (`PulseSourceHeading`, when the account has two or more posts in scope), and the top three posts of a day in the trend chart tooltip.
- **Carried filter**: a sentiment chosen on one page stays in the URL and narrows Komentar, Akun & sumber, Jaringan and Infografik. Those pages show it in a `pu-carried` bar with a remove chip. Ikhtisar, Sentimen and Laporan always show the whole picture; Posting shows it in its own filter chips.
- **Loading**: `PulseSkeleton` draws the shape of the page (stat strip, panels, rows) instead of a "Memuat…" line. The status text stays available to screen readers.

## Overview additions (14 Nov)

- **SUMMARY AI card** (`AiSummaryCard`): the one tinted, branded surface on Ikhtisar (lavender, accent-ink mark and reverse button). Nothing is generated until the analyst presses "Buat summary AI". Three formats (Ringkas, Kronologi, Eksekutif); the latest of each is stored per project. Text is parsed into sections server-side; every claim cites evidence codes that open the source list. Shows when it was made and from how many posts, and offers "Perbarui" when the project has grown.
- **Sorotan** (`OverviewInsights`): "Paling banyak dilihat" (top posts by Tayangan, never called reach), "Emotikon teratas" (bubbles whose area follows use, seeded layout), "Tagar" (cloud sized by use, a few upright, coloured from the categorical chart palette so colour carries no sentiment).
- Infografik is no longer a page: "Kata dan waktu" lives at the end of Ikhtisar and `/pulse/infographics` redirects there. The Jakarta map is removed.
- Emoticons appear only where they are content (comments, emoji bubbles) or name a reaction (stance chips).

## Page layout grid (14 Nov)

Twelve columns (`.lay-grid` with `.lay-12`, `.lay-8`, `.lay-6`, `.lay-4`). A row is one of three shapes:

| Shape | Use |
| --- | --- |
| 12 | Anything read across: tables, timelines, the AI summary, evidence lists |
| 8 + 4 | A chart or ranked list with its key or breakdown beside it |
| 6 + 6 | Two things of equal weight that are compared |

8 + 4 stacks under 1180px; 6 + 6 stacks under 900px. Cards in a row share a height.

Order follows the questions a reader asks, top to bottom: what is this and how big, how does it feel, what is being said, who drives it, then detail and method.

- **Ikhtisar**: Summary AI (12) · figures (12) · Perkembangan isu 8 + Sentimen 4 · Narasi utama 8 + Sumber percakapan 4 · Paling banyak dilihat 6 + Posting teratas 6 · Tagar 8 + Emotikon 4 · Penggerak 6 + Rincian interaksi 6 · Pertumbuhan interaksi (12) · Penyebaran 6 + Suara di komentar 6 · Kata dan waktu (12).
- **Sentimen**: suasana (12) · Tren harian 8 + Sentimen per platform 4 · Posting di balik angka (12) · Emotikon menurut sentimen (12) · Emosi (12).
- **Monitor**: Alert inbox leads (two thirds); collection activity, schedules and limits sit in the side column.
- **Komentar**: toolbar (post picker, sort, switch), one summary strip, then the comment cards full width (no side rail since 14 Nov, late night). **Posting**: list with the quick-filter rail. **Jaringan**: explorer with the evidence column. **Akun & sumber**: figures, then the ranking table full width.

Sentiment keeps its own marks (coloured dot and label). Emoticons are analysed as content: "Emotikon menurut sentimen" groups the emoji of a post and its comments by the sentiment of the post.

## Infographics (14 Nov)

A brand element, specified in `docs/PULSE-BRAND-GUIDELINES.md` (section "Infografik"). In code: `src/pulse/SummaryInfographics.jsx` (templates keyed by section kind) with the `.sig-*` styles; the evidence drawer and the narrative rows reuse them.

- Figures come from `facts`, counted on the server from stored posts, never parsed out of model text.
- The server tags each summary section with a `kind` from its title (`start`, `viral`, `topic`, `overview`, `talk`, `sentiment`, `anger`, `timeline`, `watch`); unknown titles render as text only.
- Narrative rows show spread KPIs (interaksi, dibagikan, tayangan, dominant sentiment) instead of a bare proportional bar.
- The evidence drawer opens with a figures strip and a sentiment bar, merges posts that carry the same text into one card listing the accounts, and shows one compact metric row per post.

## Card division rules (14 Nov, extends "Page layout grid")

Four row shapes only: 12, 8 + 4, 6 + 6, 4 + 4 + 4. Never more than three cards in a row.

1. The first row is one full-width card that answers the page's question. Switches and filters that apply to the whole page live in that card (for example "Hanya yang sudah dianalisis" on Sentimen), not on a chart further down.
2. The one-third column holds a key, a breakdown or filters. Primary content never goes there.
3. Cards in a row share a height. Gap between cards is `--ps-surface-gap` (16px) in both directions.
4. A card has a heading (title, one line of description, at most one action), a body and an optional method note. No framed card inside a card: inner groups use dividers or a tinted block.
5. Order top to bottom: what and how big, how it feels, what is said, who drives it, then detail and method.

| Page | Rows |
| --- | --- |
| Ikhtisar | 12 Summary AI · 12 figures · 8 + 4 Perkembangan, Sentimen · 8 + 4 Narasi, Sumber · 6 + 6 Paling banyak dilihat, Posting teratas · 8 + 4 Tagar, Emotikon · 6 + 6 Penggerak, Rincian interaksi · 12 Pertumbuhan · 6 + 6 Penyebaran, Suara di komentar · 12 Kata dan waktu |
| Sentimen | 12 Suasana (with the analysed-only switch) · 8 + 4 Tren harian, Per platform · 12 Posting di balik angka · 12 Emotikon menurut sentimen · 12 Emosi |
| Komentar | 4 + 4 + 4 Sentimen komentar, Sikap posting, Sikap komentar · 12 toolbar, summary strip, comment cards (three columns at 1440), automatic collection under the list |
| Posting | 8 + 4 post list, quick filters |
| Akun & sumber | 12 figures · 12 ranking table |
| Jaringan | 12 figures · 8 + 4 explorer, selected-account evidence |
| Monitor | 8 + 4 Alert inbox, collection (activity, schedules, limits, history) |
| Laporan | 12 throughout (a printed document) |

The gallery on the settings page shows the four shapes.

## Card system (14 Nov)

Seven card types. Each has one anatomy on every page; none carries a framed card inside it.

| Card | Anatomy | Notes |
| --- | --- | --- |
| KPI card (`PulseStat` in a `PulseStatGrid`) | label · value with its change · one visual (share meter or trend line) · note | Strip of divided cells on one surface. Under 230px wide the trend line drops out before the value does |
| Post card, list (`PostCard`) | header (avatar with platform badge, name, time, tone, link) · media beside text · one metric line · "Rincian & tinjauan" | The grid tile is the same card with the picture on top |
| Post card, evidence (`SentimentEvidenceCard`, drawer cards) | header · text · reading ("Kenapa dinilai begitu") · one metric line | A source without metrics (news) shows no metric line. Identical texts merge into one card listing the posts |
| Comment card (`Comment`) | initials, name, time, likes · text · tone and stance chips · folded reasons · source post | Source post opens on hover or focus |
| Chart card (`AnalyticsPanel`) | title, one line, at most one action · chart · method note | Page-wide switches never live here |
| Summary card (`AiSummaryCard`) | brand header with format chips · sections, each with its infographic · evidence · footer | The only tinted card |
| Insight card (ranked list, cloud) | title, one line · rows with a value and a proportional mark | Rows are buttons or links when they open something |

**KPI indications.** Colour is meaning, never decoration: red is a negative reading or a change for the worse, green the opposite, grey is no judgement, purple is a plain share. An arrow shows direction; its colour shows whether that direction is good (`deltaIntent`). Rising negative posts is a red up arrow; falling negative posts is a green down arrow; rising volume is grey. Changes come from a loaded comparison period or, without one, from the last days of the series against the same number of days before (`recentChange`). Shares follow the page's "Hanya yang sudah dianalisis" switch.

**Containment.** A card is a single-column grid with `minmax(0, 1fr)`, so long unbroken text never widens it. Names truncate with an ellipsis; body text wraps anywhere. The layout audit in the verification scripts runs every page at 1440, 1100, 768 and 390px with long names, long captions and long comments, and fails on anything that spills out of its card or the viewport.

**Waiting.** `PulseLoader` is the pulse: a dot that beats twice and rests, with a ring leaving on each beat. It is used where the reader waits for an answer. Page content that is loading uses `PulseSkeleton`. Reduced motion shows a still dot.

**Toggles.** A boolean view option is a switch (`UnanalysedToggle`, or `input.pu-switch-input`), 36 by 20px, accent when on. Checkboxes are for choosing items in a list.

**Accounts.** "Pola mirip buzzer" appears only when two or more different amplification behaviours were observed for an account (identical texts, bursts, text shared with other accounts across groups). It always shows its evidence and never claims identity, payment, automation or AI authorship.

## Network explorer and account panel (14 Nov)

**Chrome above the map is three lines, never more.** (1) Title with its info mark on the left, the view switch on the right. (2) One replay line: play, first date, histogram over the scrubber, last date, speed; "Semua waktu" appears only while replaying. (3) A count line inside the map area that also carries the two filters (relation kind, accounts without relations). The explorer opens on the whole period; replay is on request.

**Notes are tooltips.** Reading rules and limits of the analysis ("not a repost chain", "order is not cause") sit behind `InfoTip` beside the title they explain. A line of text stays visible only when it is a number or a state the reader needs right now (counts, "sampai <waktu>" during replay).

**Nodes.** Radius grows with the account's share of the busiest account's relations (`14 + √weight · 10`); accounts without relations are 10px and faint. A name is drawn for hubs and for the selected account only. The circle shows the account's picture when one is known, initials otherwise.

**Account panel (`.nxi`).** Beside the map it is exactly as tall as the map and scrolls inside; beside a long list it is sticky. Its header (avatar with platform badge, account select, one meta line, tags) stays put while cards scroll under it. Below: `Posting` then `Hubungan`, each a small caps label with a count pill and an info mark.

| Part | Anatomy | Rule |
|---|---|---|
| Post card (`.nxi-card`) | platform glyph · time · sentiment tag at the right · headline, three lines at most, with the open arrow · metric row when the source reports numbers | One post, one card. Five shown, the rest behind "Tampilkan semua". A publisher's name repeated at the end of its own headline is dropped. |
| Relation row (`.nxi-link`) | direction glyph (→ menyebut, ← disebut, ↔ konten serupa) · other account · evidence count | Opens to the same post cards, with the author shown |

**Account pictures.** `metrics.profile_image_url` is the one field every avatar reads. Instagram posts carry it; YouTube channels and news publishers (their own site icon) are looked up by the `profiles` lane at no provider cost; X accounts by the `profiles_x` lane, which costs provider credit and is off until switched on in Monitor. A failed image falls back to initials.

## Sentiment by voice (14 Nov)

**Three readings, never added together.** One figure for a whole project mostly measures how much news was collected, because news is written to sound neutral. The Sentiment page therefore opens on one card with three voices:

| Voice | Read from | Role |
|---|---|---|
| Opini publik | analysed comments under posts | The leading reading: this is where the public answers. Always a share of the analysed sample, with the coverage ("N dari M komentar tersimpan") shown as a thin meter. Comments not analysed yet are coverage, not a category. Carries the stance chips (Dukung, Tolak, Membahas). |
| Posting warganet | posts on social platforms | What people who start the conversation say. |
| Pemberitaan | news items | The tone of the press. Mostly neutral by nature. |

Each voice has the same anatomy: leading share as the headline number, the count it is a share of, a stacked bar, a legend with whole-number shares that add up to 100, then "Netral terdiri dari". The switch "Hanya yang sudah dianalisis" sits in the header of this top card and changes the two post bars and every chart below. "Rincian di bawah untuk" picks which posts the rest of the page details (the public's posts by default); the chosen voice is marked with a tint and a rule on top, the other stays fully readable. Links from a number open exactly the posts it counts: the voice travels as its list of platforms.

**Neutral is broken down, not forced into positive or negative.** A neutral text has a form: `Berita` (any neutral news item), `Pernyataan`, `Pertanyaan`, `Ajakan`, `Sindiran`, or `Belum dirinci` (analysed before forms existed; filled in over time). Forms are shown as pills in the neutral colour; `Sindiran` carries a negative outline because its words are flat but its meaning is not, and `Belum dirinci` is an outline only. On a card, a neutral post or comment shows its form as an outline tag beside the sentiment tag (a plain statement shows none on comments). In "Posting di balik angka", choosing Netral reveals a "Bentuk netral" row to read one form at a time.

**Order of analysis.** Thousands of comments arrive at once and the local model reads them slowly, so the most-liked comments of the most-commented posts are analysed first, ten per inference. Never present comment figures without their coverage.

## Account avatar (14 Nov)

**An account is always shown the same way:** a round picture with the platform mark at the lower right, then the name. Never a bare platform glyph beside an account name. `AccountAvatar` (`author`, `platform`, optional `photo`, `size`) is the component; it finds the picture among the project's loaded posts when the caller does not pass one, and falls back to initials. Sizes: `md` 44px on post and evidence cards, `sm` 32px in list rows (ranked lists, comment cards, signal lists), `xs` 24px inside a line of text (sources, chronology, relation evidence). A bare platform glyph is for a platform itself (legend, per-platform rows) or for a post whose account is already named by the surrounding panel.

## Evidence cards: list and grid (14 Nov)

"Posting di balik angka" offers two views, chosen with the `Daftar | Grid` switch in the summary strip and remembered in the browser.

- **Daftar** (default, five cards). On a panel 860px or wider a card is two columns, 3:2: the caption in a reading column on the left, and on the right the reading ("Kenapa dinilai begitu"), the metric row on one line and the account link. No half of a card is left empty. Narrower panels stack the same parts.
- **Grid** (nine cards). `repeat(auto-fill, minmax(320px, 1fr))`, three across on a laptop. Each card is stacked and trimmed: name on one line, tags on the next, caption cut at 200 characters with "Baca selengkapnya", reading cut at 110 with the full text behind the info mark. Cards in a row share a height and the numbers sit at the bottom.
- The switch is hidden under 700px, where both views are one column.

Use this pair wherever a panel lists more than three evidence cards.

## Small rules added on 14 Nov (afternoon)

- **A KPI tile about one account leads with its avatar** (`PulseStat` `media`): avatar on the left, rank and number beside it, the account name on the note line. Used for the three leaders on Akun & sumber.
- **Any summary that has a "Belum dianalisis" share carries the switch** "Hanya yang sudah dianalisis" directly above it, and says once, under the tiles, what the percentages are a share of. The comments summary strip follows this.
- **A proportional bar must say what it is a share of.** Where it cannot, it is not drawn. "Konten yang paling banyak diulang" shows the accounts as faces with a count, the number of posts, and the added-up likes, comments, shares and views of those posts instead of a bar.

## Numbers people can rely on (14 Nov, evening)

- **A repost never claims the original post's shares.** On a post's metric row it reads `Repost · posting asli dibagikan 36.254×` (`PulseRepostNote`), with zero interactions of its own. A group of posts with the same text shows that figure once as "dibagikan" (`contentShares`), and it stays out of "interaksi".
- **A share is always read over what has been analysed.** Rows still waiting are shown as a count without a percentage, and the card's subtitle carries the coverage ("455 dari 20.575 komentar sudah dianalisis"). `analysedShares` is the one place that computes it.
- **A date without a clock is written without one.** `pulseDate` prints "12 Nov 2026" when the source gave only a day, never "07.00 WIB", and the hour chart leaves such posts out and says how many. `pulseDay` writes a calendar day the same way everywhere; raw `2026-11-08` never reaches the screen.
- **A change says which window it compares** ("2 hari terakhir vs 2 hari sebelumnya"), because it can sit beside a figure for a longer period.
- **An AI summary older than the data says so above its text**, with the number of newer posts, not only in the footer.
- **Collection speaks up only when a person has to act.** `CollectionNotice` puts one warning line above the project bar on every page when the balance is empty or access was refused, says that analysis keeps running, and links to Sumber & Cakupan. A short wait the provider asked for shows nothing. The provider is never named.
- **Counts use `formatCount` or `toLocaleString('id-ID')`** in sentences as well as in tiles.
- **An account picture may live on our own server.** `avatarUrl` accepts the stored path `/admin/pulse/profiles/photo/<platform>/<account>?v=<n>` (read from the API base) besides a public https picture. Use it, through `accountPhoto`, wherever a picture address is checked; never build the address by hand.

## Rules added on 14 Nov (night)

- **A link that covers a whole row is never painted.** A general "links get a tint on hover" rule turned the transparent cover link of "Paling banyak dilihat" into an opaque block that hid the row. The cover stays transparent in every state; the row itself shows the hover, behind its content (`.oi-top > li:has(.oi-cover:hover)`). Any new full-row link follows this.
- **A segmented bar comes with its legend.** The interaction split names each colour and its share right under the bar (`.pu-eng-legend`), and the cells below use the same whole-number shares, so the three never disagree by a rounding step.
- **A new project opens after a short, honest wait.** `ProjectWarmup` shows about three minutes of collection: a time bar, the posts received so far, and one row per source in plain words ("Mengambil… 1.200 posting sejauh ini", "Menunggu giliran", "Belum berhasil; dicoba lagi sesuai jadwal"). It opens the project when every source has settled or the time is up, says that collection goes on in the background, and always offers "Buka sekarang". No spinner without a figure, no percentage that is not measured.
- **The Sources page speaks about balance, not about vendors.** "Saldo sumber data", "Memakai saldo", "Kuota harian", "Tanpa biaya"; the manual action is "Kumpulkan semua posting <platform>" for the project's range of days, with no row cap.

## Rules added on 14 Nov (late night)

- **A page change starts at the top.** Choosing another page scrolls the shell (`.pulse-standalone`) to the top before paint and covers the page area (`.ps-page`, below the project bar) with `PulseLoader` "Membuka <halaman>…" for 400 ms. The new page renders underneath with `visibility: hidden`, so charts measure once and nothing hidden takes focus, then fades in over 180 ms (no fade under reduced motion). A filter, a project change or a link to a section (`#…`) on the same page does neither.
- **Filter bar for a ranked list** (`src/pulse/ds/accounts-filter.css`, `conversation-groups.css`): search first, then "Urutkan" as a segmented control, then chip rows whose counts respect the other filters, then one status line "N dari M …" with "Hapus semua filter" only when something is set. Rows come in steps (50 accounts, 20 groups) behind "Tampilkan N lagi". Never a hidden cap: when a list is cut for rendering it says so and tells the reader to type to narrow.
- **Platform identity on the network map** uses the platform palette in `src/lib/pulseChartTheme.js` (`platformHues`): X ink, Instagram magenta, TikTok teal, YouTube red, Berita green, Reddit amber. The ring carries the colour and the small platform mark repeats it, so colour is never the only signal. Sentiment colours are not used for platforms.
- **Network encoding** (`src/lib/pulseNetworkLook.js`): circle radius follows followers on a log scale from 12 to 30 px (1 thousand to 10 million), 9 px when followers are unknown, dashed ring when the account was only mentioned. An arrow is a mention, a dashed line is similar content, and line width grows with the number of linking posts (capped at 5 px). Small circles may lose their label; the legend under the map explains all three.
- **Monitor says what was collected, not how.** Alerts first: an unread count as the heading, "Tandai semua dibaca", compact rows with kind tag, title, figure, time, actions. "Tindak lanjut" opens an inline form under the row (status, person in charge, history), never a dialog. Collection is one table per source: share of scheduled collection that succeeded, the dates its posts span, and how often it runs. No queue, worker, model or provider names anywhere on the page; settings sit in one closed disclosure.
- **Komentar** picks a post through a combobox panel (search over caption and account, platform chips, busiest first, "Semua posting" pinned). A chosen post gets a bar with "Buka posting asli" and "Kembali ke semua posting".
- **Kelompok percakapan**: "Paling banyak diulang" shows the three largest groups as divided cells on one surface (not three cards), with the totals line "N kelompok dari M posting; K posting berdiri sendiri". A text seen once is counted, never listed. The full list below carries the filter bar.
- **Laporan is a stack of A4 sheets** (`src/pulse/ReportPages.jsx`, `src/pulse/ds/report-pages.css`). Each `.rp-page` is 210 by 297 mm with the period pill, the brand mark, the project name and "n / N". The same DOM is the on-screen preview, the print output and the PDF, so the three cannot drift apart. One topic per sheet: cover, executive summary, volume and sentiment, public voice and news, opinion from comments, platforms and accounts, top posts, repeated content, coverage and limits.
- **A sheet never scrolls and never clips.** Content that could outgrow the fixed height gives up rows by rule, not by `overflow`: the accounts table gives up one row for every platform past the fifth (`accountRowsThatFit`), platforms without a post in the period are named on one line under the coverage table, and a long keyword query keeps to three lines. When a new block is added to a sheet, check it with the busiest project, not with sample data.
- **Report builder** sits beside the preview: one switch and Naik/Turun per section (focus follows the button), the page numbers each section takes, then logo, accent colour (with "Warna PULSE" to reset), organisation and a short description. Changes save by themselves; there is no save button and no "freeze" step.
- **PDF** is made on the server from the preview's own HTML ("Unduh PDF"); "Cetak" stays as the fallback when the server has no renderer. The success line names the file and its page count.


## Trend chart and what the server keeps to itself (14 Nov, after 21.00)

- **Trend chart** (`src/pulse/TrendChart.jsx`, `src/pulse/ds/trend-chart.css`, `src/lib/pulseTrendSeries.js`, built on the shadcn chart in `src/components/ui/shadcn/chart.jsx`): change over time is drawn as lines. It is the "Perkembangan isu" panel on Ikhtisar and the "Tren posting" card above the list on Posting, and the small `compact` form sits in a side column.
- **Platform view.** "Platform" in the content switch draws one line per platform (`platformTrend`), busiest first, each on its own axis: platforms differ by a factor of a hundred or more, so on a shared axis the small ones lie flat. Beside each line sits the platform's count, its share of the posts with a share bar, and its busiest bucket, in the platform colour from `platformColor`; a note says the lines do not share a scale. A click opens nothing in this view, and "Lihat angka" lists one column per platform.
- **One axis per chart.** Posts and interactions differ by orders of magnitude, so "Posting & interaksi" is two charts stacked on a shared date axis with a linked crosshair, never two scales on one chart. Axis steps are round numbers from zero (`axisTicks`).
- **Sentiment lines carry a mark as well as a colour.** The product's positive green and negative red are too close for red-green colour blindness (measured: about 4 on the scale where 8 is the target), so negative is a line with diamonds, positive a line with circles, neutral a dashed line, and the two tone lines are named at their right ends. The legend repeats the marks. Posts without a label are counted in one sentence under the chart and never drawn as a tone.
- **Units**: Hari, Minggu (Monday to Sunday), Bulan. Days without posts are drawn as zero. A unit that would give a single point is disabled with the reason in its title. A week or month at the edge of the data is named by the days it actually covers.
- **Picking a date**: a click on the line picks the nearest day, week or month that has posts; an empty one does nothing. On Posting the pick becomes `day` (and `day_to` for a range) in the address and filters the list, the card names what is shown, and "Semua tanggal" clears it. On Ikhtisar the pick opens the posts drawer. "Lihat angka" is the same data as a table with a "Lihat" button per row, so nothing depends on a mouse. The card promises a click only where one works.
- **Switches** are the product's segmented switch (soft track, 36px items, 44px under 700px wide); the items are shadcn `Button`s with `aria-pressed`. In a narrow column the switches drop under the title instead of squeezing it.
- **What produced a label is not product surface.** Stored results keep the engine and prompt version for the operator; every answer the server gives, and every report it files or hands back, leaves them out (`server/app/services/pulse_public.py`, guarded by `server/tests/test_pulse_engine_private.py`). A new read route belongs in that test's list.
- **AI Insights** (`src/pulse/AiInsights.jsx`, `src/pulse/summaryModel.js`, `src/pulse/ds/ai-insights.css`, page `/pulse/insights` in the Ringkasan group after Ikhtisar): one headline, then three to five numbered insights. Each opens with a bold lead sentence and ends in numbered evidence marks that open the cited post (a comment opens its post); the same post keeps one number however often it is cited, and the list "Bukti yang dirujuk" repeats every number with author, text and source. The side column holds the period card (project, dates, the badge Mingguan, Bulanan or Periode pilihan, platforms) and the small trend chart. An insight is written only when "Buat insight" or "Perbarui insight" is pressed, for the period and platforms of the project bar, and the latest one per project is stored, so opening the page never asks the AI. A stored insight whose period or platforms differ from the project bar says so in one line. It is the `insights` format of the summary engine and never appears in the format switch of the summary card on Ikhtisar.
- **Who supplies the data is not product surface either.** Inside the server the paid lane for X, Instagram, TikTok and Reddit keeps its supplier's name (database rows, workers, settings). Everything the browser receives or sends calls it `social`: lane ids in Monitor, Sumber & Cakupan, a project's sources, collection results, the title of a collection alert. `server/app/services/pulse_public.py` is the only place that knows both names; `server/tests/test_pulse_supplier_private.py` reads every data route and `src/pulse/supplier-private.test.mjs` scans every file that ships to the browser. Error text says "the source", never a company.
- **Evidence shows the account's picture.** A summary's sources get `photo` when the summary is read (never stored with it: picture links go stale), found the same way as on every other page; initials stand in when no picture is known, which today includes every comment author because stored comments carry no picture.
- **When automatic analysis cannot reach its AI service**, the progress block on Sentimen says so in one sentence (`src/lib/pulseAiState.js`): stopped and an administrator has to check (`role="alert"`), or busy and retrying. It never names the service, a key, a model or tokens.

## Range filter, chat history and the review mark (15 Nov 2026)

- **Range filter** (`src/components/ui/PulseRange.jsx`, `src/lib/pulseRange.js`, `src/pulse/ds/range-filter.css`): every chart that plots dated posts or comments carries the same control: 3 hari, 7 hari, 1 bulan, Semua, Rentang, followed by the days drawn in words ("9–15 Nov 2026"). It starts on Semua; the project bar's period applies first.
- A preset ends on the chart's last day with data, never on today, and stays selectable when it equals Semua. Rentang is two inline dates, no dialog; an incomplete, reversed or out-of-data range is not applied and says why.
- The choice is local to each chart and never stored. With under two days of data, or in the `compact` form, only the caption shows.
- The segmented switch is one class, `.pu-segmented` (36px items, 44px under 700px wide); the panel title keeps 300px and the switches wrap under it.
- **Tanya AI history** (`src/pulse/ProjectChat.jsx`, `src/pulse/ds/chat-history.css`, `src/lib/pulseChatHistory.js`): one card of the caller's stored conversations for the project. It sits right of the conversation from 940px of page width (a 1280px window with the sidebar open) and is sticky there; below that it follows the conversation in the same reading column.
- Rows are divided; the open row has `aria-current`, the selected tint and a stronger title; hover is painted on the row. The open conversation is `?c=<id>` in the address. Delete is a quiet icon button named "Hapus percakapan: <judul>", confirmed in the shared dialog; focus returns to its opener or to "Percakapan baru".
- A conversation is stored only after an answer arrived, belongs to the person who asked, and holds at most 40 questions. An answer that could not be stored says so.
- **"Perlu ditinjau" marks a reading that may be wrong** (`src/lib/pulseCommentReview.js`, server `stance_for_reader`): a doubtful sentiment, a side (mendukung or menolak) read with little confidence, or a text that was cut. A comment that takes no side ("Membahas") is an answer, not a doubt, and is never marked, also when the project's name gives nothing to side with.

## Spread map: places named in posts, and where X accounts say they are (15 Nov 2026)

- **What it is** (`src/pulse/RegionSpreadMap.jsx`, `src/pulse/ds/region-map.css`, the fourth view "Peta sebaran" on Jaringan; `?focus=map` opens it directly): a map of Indonesia with a day slider and two contents, chosen with "Isi peta". **Tempat disebut** counts the provinces named in the titles and texts of the posts. **Lokasi akun X** counts X accounts by the province the location on their profile names. Neither is where a post was written: no source reports that, and each description and footer says so in plain words.
- **Reading a post** (`src/lib/pulsePlaces.js`): a hand-kept list of the 34 provinces with their short forms, English names, cities and regencies. The longest name wins ("Kepulauan Riau" is not Riau), only whole words count, and islands or regions ("Jawa", "Sumatera", "nusantara") are not provinces. A name that is also an ordinary word (Solo, Malang, Padang, Medan, Palu, Bali) needs a capital letter or a place word before it; a few (Serang, Bima, Pati, Kudus, DIY) count only after a place word. Not read: the posting account's own name, outlet names ("Lombok Post", "Radar Bogor"), site addresses, account mentions, channel lists, a row of more than five hashtags, and everything after "Baca juga" or a call to subscribe. A post counts once per province. New names go in the `PLACES` table; every rule has a test in `pulsePlaces.test.mjs`.
- **Reading a profile location** (`provinceOfLocation`): the same list, but every name counts however it is typed, and the short forms people write on profiles (jkt, bdg, sby) are read. "Indonesia", "Bumi" or an empty field name no province and are counted in a sentence under the map, as are accounts not asked yet. The server stores the text with the X profile lookup that already fetched pictures (`pulse_account_profiles.location`, `location_at`; about 2 credits an account, no extra call) and sends it with each post as `metrics.author_location`: a text, '' when the owner wrote none, no key while the account has not been asked. Accounts looked up before the text was kept are asked once more, busiest first.
- **Counts are cumulative to the chosen day**, so playing the timeline shows the map filling in; an account joins on the day of its first post. Playing restarts from the first day a place appears and a whole run takes about 12 seconds whatever the range. The range filter (3 hari, 7 hari, 1 bulan, Semua, Rentang) narrows the days of the timeline, as on every chart.
- **Shading**: one hue (`--ps-chart-1`). A province is drawn in five steps, darker with more (stronger in the dark theme), on a square-root scale fixed to the largest province of the range, so the many provinces far below the largest still differ and colours deepen as the timeline plays. The legend prints the counts each step covers. A province that is new on the chosen day gets a dashed ink outline, never a colour of its own.
- **Marks**: posts are bubbles whose area is the count (4 to 17 units, 2px surface ring, largest drawn first, counts in a layer above, hidden under 520px of card width). Accounts are pins: the round profile picture of the strongest account at a place (its initial when there is none) with the number of accounts. Pins that would overlap are counted together under the busiest ("Bandung dan sekitarnya") until the map is brought closer; with room around it a pin shows three or seven pictures. Nothing is colour-only or picture-only: the list beside the map, the tooltip, the status sentence and "Lihat angka" carry the same numbers, and the pins are hidden from assistive technology because the list says the same.
- **Closer and farther** (`src/lib/pulseRegionMap.js`): the plus and minus buttons on the map bring it closer in steps of two, up to sixteen times, around the chosen province; a mouse drags a zoomed map, a finger keeps scrolling the page; clicking a pin that stands for several places zooms into it. "Indonesia" and "Jawa & Bali" are shortcuts. Every view keeps the 76:33 shape, so the height never changes, and marks are divided by the zoom to keep their size on screen. The wheel is left to the page.
- **Checking the reading**: choosing a province lists the names that were found and the posts behind them, each excerpt cut around the name and the name marked, with a link to all of them on Posting (`?province=ID-JT`, shown there as the filter "Menyebut tempat di"). In the account view it lists the accounts with the location each wrote, followers, posts and interactions, and a link to their posts. A province nobody named can be chosen too and says so.
- **Where else the spread appears**: Ikhtisar has the card "Sebaran tempat" (`RegionSpreadSummary.jsx`: small map, five most named provinces, one sentence on profile locations, link to the full map), fetched after the page because it brings the outlines. Laporan has the page "Sebaran tempat" (`PlacesPage` in `ReportPages.jsx`, figures from `reportData().places`): the small map in the report's accent, six provinces, three rows of profile locations, sized to fit one A4 sheet. Both use `RegionMiniMap.jsx`, a picture with nothing to press.
- **What the AI is told** (`server/app/services/pulse_places.py`, used by `pulse_chat.build_context`): Tanya AI, AI Insights and the AI summary get two lines in their data block, "TEMPAT YANG DISEBUT DALAM POSTING" and "LOKASI PROFIL AKUN X", each with what it is not, and the instructions repeat that a place that is talked about is not where an author is. The summary formats also get the strongest post naming each of the three most named provinces under the evidence code `T`, so a sentence about a place is cited like any other; AI Insights writes one point about places when there is data. The server's reader is a twin of the app's: both load the same lists (`node scripts/build-pulse-places.mjs` writes the server's copy, and a frontend test fails while it differs) and both run `src/lib/pulsePlaces.cases.json`. On 15 Nov 2026 the two agreed on all 15,828 stored posts. A rule changed in one must be changed in the other, with a case for it.
- **The AI reads every post in scope** (since 15 Nov 2026; before, the 3,000 newest). What reaches the model are counts and a handful of evidence posts, so more posts lengthen the read (about 1 second for 7,000 posts, about 7 on the first read after a restart) and never the prompt. Its place counts match the map's except for posts without a date, which the map's timeline cannot place and the AI still counts. An answer or summary stored before that day keeps its note "dibatasi 3.000 posting terbaru".
- **Outlines**: `src/pulse/indonesia-provinces.json` is generated by `scripts/build-pulse-provinces.mjs` from the pinned geoBoundaries file (2017, 34 provinces, ODbL; see `deploy/pulse/MAP-ATTRIBUTION.md`). The provinces split from Papua in 2022 are drawn inside Papua and Papua Barat and the footer says so. City points for pins are a short table in `pulseRegionMap.js`.

## Beranda and the issue radar (15 Nov 2026)

- **What it is** (`src/pulse/Home.jsx`, `src/pulse/ds/home.css`, page `/pulse`, the first item of the sidebar, no project bar): what the country is talking about before any project exists, then the projects. An address that names a project (`/pulse?topic=…`) still opens Ikhtisar, and from Beranda the sidebar leads back into the project that was open.
- **Rows, on the product grid**: 12 the answer card ("Isu yang ramai di …": when the list was made, the brief, the page-wide switches) · 12 the figures strip · 8 + 4 "Peta sebaran isu" with "Provinsi paling ramai" · 8 + 4 "Isu teratas" with "Komposisi isu" · a top ten per platform, three or four cards across · 4 + 4 + 4 one card per active project. Every card is the chart card (`AnalyticsPanel`); the strip is `PulseStatGrid`; the rankings are `PulseBreakdown`.
- **The first card** (`src/pulse/RadarLead.jsx`): the switches that apply to the whole page live here, as the card rules ask: categories with their counts (a category with nothing in it is not offered), platforms (Berita, X, TikTok, Instagram, YouTube, Google; only those with an issue in this refresh, plus the one already chosen so it can be dropped), and the chosen province as a chip that can be dropped. The brief's numbers point at rows of the unfiltered national list; under a category or platform they are taken out, and over a province list the national brief is not shown.
- **Figures strip** (`src/pulse/RadarFigures.jsx`): issues composed (national, local), signals read per platform, province lists read (meter), and how many of the listed issues a project already covers (meter). A figure the refresh did not report shows as unavailable, never as zero.
- **The map** (`src/pulse/RadarMap.jsx`, `src/pulse/ds/radar-map.css`): the same family as the spread map on Jaringan, one data hue (`--ps-chart-1`) mixed into the panel. Three steps (30%, 58%, 88%; 40%, 65%, 92% over a lighter ground in the dark theme, where the panel and line colours sit close together): up to three issues a step each; beyond that the steps are spread over the busiest province and the legend states the ranges ("1–2, 3–4, 5–7"), because with several issues searched nearly everywhere a fixed "three or more" turned the whole map one colour. A province whose list was not read is hatched and named "daftar tidak terbaca", with all issues or with one issue drawn; it is never shown as none. Choosing an issue draws that issue alone: its provinces by searches (under 1.000, 1.000 or more, 2.000 or more) and an ink dot on each place its coverage names. The map follows the category and never the platform switch.
- **Every province is a control**: a button with its figure in its accessible name, reachable by keyboard, pressed when chosen (a dashed stroke when it also has focus). "Lihat angka" gives the same content as a table. The card's method note says what the map is drawn from, and that X, TikTok and Instagram give no location. Shade is never the only carrier.
- **Rankings beside the charts** (`src/pulse/RadarBreakdowns.jsx`): "Provinsi paling ramai" lists the provinces where most listed issues are loud; "Komposisi isu" lists the categories of the scope and, under a dividing line, on how many listed issues each platform has a figure ("Jejak platform"). Rows are links that set the same choice as the switches; the row of the chosen one drops it again.
- **The list** (`src/pulse/RadarIssues.jsx`, `src/pulse/ds/radar-issues.css`): at most ten rows, ranked and divided by lines, not cards. The scope is the country, or the province chosen on the map; an issue found only on province lists is national once five provinces carry it; under that it appears only in those provinces' lists, marked "hanya ramai di provinsi ini" or "hanya ramai di n provinsi". A province whose list was not read says so instead of "no issue".
- **A row**: its position, the title (a button that opens the evidence and draws the issue on the map), the category as a neutral tag, movement in words with an icon ("Baru", "Naik 4", "Turun 2"; only for the combined order, never with a platform chosen), "Sudah dipantau" when a project's keywords already catch it, one sentence on why it is loud, the platform meters, how many provinces, and one action. "Pantau" opens Pencarian cepat with the proposed keywords filled in; "Buka project" opens the project that covers it. People who cannot create projects get neither "Pantau" nor the refresh button.
- **Platform meters**: one thin bar per platform the issue is on, with the platform's mark and its figure in words. Each platform keeps its own cell whether or not the issue is on it, and the figure has a fixed width per platform, so bars in a column share one track and can be compared down the list. First row: the lists that are read whole (Berita, YouTube, Google). Second row, only where there is something: X, TikTok, Instagram. A bar is drawn against the loudest listed issue on that platform. One hue: the bar is magnitude, the mark is identity. The meters lay themselves out by the room a row has (a container query on the row, not the window): three across from 760 px, two across down to 401 px (each platform still in its own cell), one column under that. A row is about 590 px wide at a 1440 px window, so most desktops get two across and bars of 120 px or more; three across there left bars of 24 to 39 px and let a wide figure run into the next mark. Figure widths are set for the widest value a platform can state ("12.345+ posting", "1.000.000+ pencarian", eight-digit views).
- **What a plus means is said on the page**: under the list, once, when a listed issue has a figure with a plus: "Tanda + berarti batas bawah: sedikitnya sebanyak itu yang tercatat." Hover text repeats it per figure but is not the only place. Both ranked lists carry `role="list"`, because a list without markers is otherwise not announced as one by every screen reader.
- **When X was searched**: X is searched once a day, or when someone presses the refresh button, and its issues are carried between. The freshness line of the first card says so when X is on the list: "…; isu dari X dicari 11.17 WIB" (with the date on another day). In the raw view the X list is headed "X, isu yang ditemukan": those are names of issues, not a list read from X.
- **One figure per platform, everywhere**: the figure in a row's meter is the figure that platform is ordered by, on the server (`loudness`) and on the page (`platformFigure`), and the same words are used in the top ten per platform (`meterText`). For videos that is the views of the issue's trending videos ("1.374.196 tayangan"); how many videos that is appears once, in the drawer ("… tayangan (3 video tren)"). Until 15 Nov the meter said the number of videos while the order used views.
- **A count gets a bar, a sample does not**: X has a bar when its posts were counted ("625+ posting"; the tooltip says "sedikitnya 625 posting terpantau sejak kemarin" and the drawer "sejak kemarin"). The plus is the same one the searches carry: the count is of posts that were observed, a lower bound, never the volume of X. TikTok and Instagram are samples of 20 rows from the last three days: they say what was found ("12 ditemukan", "20+ ditemukan" when the sample came back full) and draw no length, never order a list, and never enter the combined order. An issue X found that was not counted says "3 posting contoh", also without a bar. Choosing X orders by the count; choosing TikTok or Instagram keeps the combined order and the description says so.
- **A top ten per platform** (`src/pulse/RadarPlatformTops.jsx`): under the list, one card for each platform that has a figure to order by: "Teratas di Berita" (articles), "Teratas di X" (posts observed since yesterday, only when X was counted), "Teratas di YouTube" (views of trending videos), "Teratas di Google" (searches, lower bound). Each card says its basis in one short line ("Jumlah artikel.", "Terpantau sejak kemarin.", "Tayangan video tren.", "Pencarian, batas bawah.") so the lists of a row start level; a figure that is a lower bound explains its plus on hover. Three across, four with X (two by two under 1440 px, one column on a phone). A row: position, the issue (a button that opens the same evidence), its figure on that platform, and a bar against the first row of the column; the figure has a fixed width per platform so the bars of a column share a track. The row follows the page's category and province, not the platform switch. TikTok and Instagram have no card: a sample has no order.
- **Where each number comes from**: Berita counts the story and the other coverage the news list shows under it. YouTube is the views of the issue's videos on the popular lists. Google is the lower bound the trending list states ("1.000+"), never a total. X counts the posts observed since yesterday (UTC date) that carry the issue's proposed keywords: a lower bound, and the keywords stay the same while the issue lives so the count means the same thing at every refresh. TikTok and Instagram are the usable rows of one 20-row search. "ramai di n provinsi" counts the provinces whose own trending list carries one of the issue's search terms; the province is read from those lists, never from the AI's answer. Movement compares with the list of about three hours earlier and needs two places; "Baru" is first seen in the last six hours, and only once an earlier list exists to be new against.
- **Evidence** (`src/pulse/RadarIssueDrawer.jsx`, in the shared drawer): the reason, then the sources by platform, each a link out when it can be followed and plain text when it cannot, then the proposed keywords as chips and the same action as the row. Posts from X, TikTok and Instagram are headed "…, posting contoh" and carry the account ("@nama") and the interactions; a post known only by its link reads "Posting dari @nama". Titles are text: markup in a headline is shown, not rendered.
- **States**: a skeleton while loading. Never run: says whether automatic refresh is off and, for those who may, offers one run. A refresh that failed is said with its time ("Pembaruan 10.40 WIB tidak berhasil. Daftar di bawah dari 09.50 WIB."), also when every attempt so far failed; it never reads as "never ran". Old list: after an hour a notice with the time, and "Pembaruan otomatis mati" when the switch is off. Raw: when nothing was composed for six hours, the head of each platform's list as it was read, without categories or a combined order. A filter with nothing in it: one sentence and "Tampilkan semua".
- **Looking never collects**: the page reads the last stored refresh, and every filter, province and drawer is answered from it. Only the schedule (the switch "Radar isu Indonesia" in Monitor, off by default) and "Perbarui sekarang" start a refresh. The paid steps (what is loud on X, the count on X, the samples) have their own switch, "Radar: X, TikTok, Instagram", also off by default; it adds to a refresh and never starts one. A social platform that could not be asked everything is named in the freshness line as "belum lengkap". Which engine wrote the list and who supplies the lists is not product surface; a headline that names an AI company is content and is shown unaltered.
- **Project cards** (`src/pulse/HomeProjects.jsx`): one card a project, three to a row. Name (a link) with unread alerts as a warning tag; posts in the last 24 hours with the change against the 24 before (no colour: rising volume is neither good nor bad) and the week as a line (seven steps of 24 hours, also given in words); "Sentimen 7 hari" as one stacked bar in the fixed order positive, neutral, negative, unknown hatched, with shares ("<1%" for a sliver); total posts and last collection as the method note. A project is active while one of its collection schedules is on; the others are listed under "Dijeda (n)".
- **Narasi utama on Ikhtisar says where** (`src/pulse/ProjectOverview.jsx`, `narrativePlatforms` in `src/lib/pulseOverview.js`): each narrative row ends its line of counts with the platforms its posts are on, as the platform's logo and its post count, most first, at most four with the rest counted ("+2"). Logos rather than a bar: most narratives sit on one or two platforms, so a bar would add a line for little. The row's accessible name says the same in words.

## Colour that is seen in both themes (15 Nov 2026)

Measured in a browser on every page, dark theme, with every disclosure open: 432 text elements, 12 icons and 8 placeholders were below their contrast floor (4.5:1 for text, 3:1 for icons and marks). After the changes below: none. The light theme was measured before and after: nothing new fell below, and 412 text elements that had also been too faint there now pass.

**The cause.** Pastel fills (`--ps-lavender`, `--ps-mint`, `--ps-peach`) stay light in the dark theme, so their inks (`--ps-accent-ink`, `--ps-success-ink`, `--ps-warning-ink`) stay dark. That pair is 9:1 on its fill in both themes. Used straight on a dark panel the same inks are 1.06 to 1.31:1.

**The rule.** An `-ink` colour is only for text and icons on its own pastel fill. On a panel or the page use:

| Need | Token | Light | Dark (on panel) |
|---|---|---|---|
| Accent text, link, icon | `--ps-accent` | 8.2:1 | 9.7:1 |
| Good-news text | `--ps-success-text` | 11.6:1 | 10.1:1 |
| Caution text | `--ps-warning-text` | 11.2:1 | 10.1:1 |
| A small filled block with a number or date | `--ps-mark-bg` with `--ps-mark-ink` | ink block, pastel text | pastel block, ink text |
| Secondary text, placeholder, the icon of an unpressed toggle | `--ps-muted` | 6.7:1 | 7.0:1 |

- An unpressed toggle tag (`button.pu-tag[aria-pressed=false]`) has no fill, so the icon of an accent, success or warning tone is drawn in `--ps-muted`. Pressed, it gets its pastel fill and its ink back. Sentiment and platform marks are untouched: their colours already follow the theme.
- Every `input` and `textarea` placeholder is `--ps-muted`. The browser's own grey is 3.3:1 on a dark panel.
- The "not analysed" swatch in a stat is an outline in `--ps-control-line`, as its tag already is: the fill is close to the panel in both themes.
- Sentiment dots in the post filter use the sentiment data colours (`--ps-sent-*`), not status inks.
- Labels inside the account-signal rows and the dates of evidence lists use `--ps-muted`; the older sheet painted them an olive grey (`#63796c`, `#657a6d`) that was 2.8 to 3.3:1 and overrode the ink of tags placed in those rows.

**Dark tokens as measured.** Text on panel: ink 13.0, muted 7.0, accent 9.7. Control edge (`--ps-control-line`) 3.4. Sentiment marks 4.9 to 6.4, chart colours 6.0 to 8.0, platform colours 5.2 to 11.2. Separators (`--ps-line`) are 1.6 on purpose: they divide, they carry no meaning.

**Light marks.** In the light theme a mark is drawn on the panel, on the page, on the soft surface (bar tracks, table heads) and, for a sentiment dot in its tag, on that sentiment's own soft fill. The light data colours had been chosen against white only, so several sat at 2.4 to 2.9:1 on those surfaces. They are now at least 3:1 on all of them:

| Token | Was | Now |
|---|---|---|
| `--ps-control-line` (field and switch edges) | `oklch(67% 0.018 285)` | `oklch(62% 0.018 285)` |
| `--ps-sent-positive` | `oklch(63% 0.13 155)` | `oklch(60% 0.13 155)` |
| `--ps-sent-neutral` | `oklch(68% 0.025 255)` | `oklch(61% 0.025 255)` |
| `--ps-chart-2`, `--ps-chart-6` | 62%, 64% | 60%, 60% |
| `--ps-chart-3` | `oklch(72% 0.13 75)` | `oklch(62% 0.13 75)`: amber cannot be light and 3:1 on white |
| Platform hue for Berita and Reddit (`pulseChartTheme.js`) | `[72, 0.17, 153]`, `[74, 0.18, 66]` | `[68, 0.17, 153]`, `[71, 0.17, 66]` |

The same values are declared for print and for the report paper, and a test holds the three places together. The dark values did not change. Words in the hashtag cloud are text, not marks: each series colour is mixed 80/20 with the ink, which gives 4.8:1 or more on a light panel and more on a dark one. The design gallery prints a series number under its swatch, not on it.

**Guard.** `src/pulse/colour-contrast.test.mjs` computes the pairs above from the token sheets for both themes, checks that print and paper carry the same light values, and fails when a rule paints a pastel ink on anything but a pastel fill. `src/lib/pulseChartTheme.test.js` holds the platform colours at 3:1 on the light page and soft surface as well as on the panel.

**Known and left as they are.** The lightest steps of the project map's ramp and the count printed on its bubbles are close to the panel by nature of a ramp that starts at zero. Checkboxes are outlined boxes whose fill is the panel's. Hover and focus states were checked by reading the rules, not by measurement.

## Tanya AI answers (15 Nov 2026)

- **Shape** (`src/pulse/ChatAnswer.jsx`, `src/lib/pulseChatAnswer.js`, `src/pulse/ds/chat-answer.css`): an answer opens with its lead sentence in a stronger weight, then short bullets and paragraphs. Key figures and names are bold; a short label before a colon ("Dukungan:") is set in bold when the answer set nothing in bold itself. The model writes light markup ("**tebal**", lines starting with "- "); raw marks never reach the reader, and an answer stored before this shape still reads as paragraphs.
- **Evidence marks**: every cited post or conversation group is a round numbered mark in the text and carries the same mark on its row under the answer, numbered in the order the answer cites them. A mark is a link to its row. A cited group is a row too ("Kelompok percakapan", title, posts, accounts, interactions, start), so `[I1]` is never shown raw. A code without evidence is dropped from the text.
- **Charts**: the model may ask for at most one chart by name (`[GRAFIK:sentimen]`, `sentimen7`, `platform`, `platform7`, `harian`, `tempat`, `lokasi`, `kelompok`). The server builds it from the numbers of its own data block (`chart_data` in `pulse_chat.py`) and sends it with the answer; no number of a chart is ever read from the model's text. Bars are thin with the value in words beside them; shares are shown only where the rows are parts of one whole (sentiment, platforms). Sentiment keeps its own colours, everything else is one hue. "Posting per hari" is fourteen calendar days up to the last post, quiet days as zero.
- **Wording**: dates are written "12 Nov" and times "07.00"; the data block names sentiment in Indonesian, so an answer never says "unknown" or "negative".

## Comments under a post (15 Nov 2026)

- **A compact row, not a card** (`CompactComment` in `src/components/admin/pulse/CommentsPanel.jsx`, styles at the end of `src/pulse/ds/comments-browse.css`): in a post's "Rincian & tinjauan" each comment is one row: a 24px picture, the name and the date on one line with the words under it, and at the side the likes and an icon link "Buka komentar". Rows are divided by a hairline and keep 10px above and below; the text is 14px. In a list narrower than 480px the words take the full width under the name.
- **Why it is built from plain blocks**: a post card styles its own `header` and `footer` (18px padding, a rule under the header). A comment made of `header` and `footer` inherited both, which made every comment about 195px tall with bright rules in the dark theme. The compact row uses `div`s, so those rules find nothing; a test holds that. It is now about 64px for a one-line comment.
- **The card on the Komentar page is denser too** ("Denser comment cards" at the end of `comments-browse.css`, markup in `Comment`): 12px by 14px inside, 8px between rows, the words at 14px. The head holds who, when, the likes and an icon link to the comment; the reading (sentiment, form, stance, "Perlu ditinjau") shares one row with the "Alasan" disclosure, which takes a row of its own when opened; the foot is one quiet line naming the post, without a rule, and is left out when one post is chosen. A card with a two-line comment went from about 253px to about 177px, so a 1440px screen shows a fourth row of cards. The disclosure keeps a 32px row (44px on phones) and the icon link a 36px target.

## Spikes on the trend chart, and the emotion panel (15 Nov 2026)

- **One spike rule, on the server: `spike_v1`.** What the product calls a "lonjakan" is decided in one place, `server/app/services/pulse_spikes.py`, and nowhere else. A bucket (a day, a week, a month, or a 30-minute window) is a spike when it rose from the one before, the next is not higher, it is at least 1.5 times the usual one (the median of the others in the series), it reaches a floor (5 posts or 100 interactions per bucket on the chart, 10 posts per 30 minutes for the alert), and it reaches a tenth of the highest: a spike has to be a rise a reader can see. Fewer than three buckets give none, the first is never one, and at most three are returned, the highest. A change to any of these numbers is a new rule with a new id, because stored alerts and summaries name the rule that found them.
- **Everything that says "lonjakan" reads that rule.** The trend chart sends the two lines it draws to `POST /api/admin/pulse/spikes` (`server/app/routers/pulse_spikes.py`; the answer carries the spikes and the rule's description) and remembers the answer by the lines' values (`src/lib/pulseSpikeAnswers.js`, `src/pulse/useTrendSpikes.js`). The `volume_spike` alert asks it whether a conversation group's latest 30 minutes are a spike among its windows of the last six hours (`spike_evidence` in `pulse_listening.py`). The AI summary's facts carry the spike days of posts per day (`facts.spikes`), and its model is told that "lonjakan" means those days. The browser holds no copy of the rule: while the answer is on its way, and when the call fails, the chart draws no mark.
- **Asking for spikes is a read.** The route is a POST only because a series does not fit in an address: every signed-in role gets an answer, and asking leaves no line in the audit trail (the one exemption in `require_pulse_access`). The session's CSRF check still applies.
- **The alert asks about one window.** The chart's cap of three marks does not apply to it: the latest 30-minute window is a spike or it is not, whatever came earlier in the six hours. A post that carries a date without a clock is stored at midnight UTC and cannot be placed in a half hour, so it is in none of the alert's windows (neither `volume_spike` nor `recent_cluster`).
- **Other things that stand out have their own names.** The day with the most posts is "hari teramai" (Ikhtisar's highlight, the report, the summary card, each platform's line), and the post whose interactions grew fastest is "posting tumbuh tercepat". Neither is called a "lonjakan" or a "puncak": every period has a busiest day and a fastest post whether or not anything jumped.
- **A spike is a ringed point on the line.** What each one is made of is counted in the browser from the posts on screen (`src/lib/pulseTrendSpikes.js`); only which bucket is a spike comes from the server.
- **Hover says what the number is made of, never why.** The tooltip of the chart under the cursor carries a small infographic in the brand's templates (`TrendSpikeCard`): figures (how many times the usual day), one proportion bar with its key (platforms for posts; top post, next two and the rest for interactions), ranked rows (who posted most) and the post with the most interactions. The other chart shows one line, or nothing when the card lies over it. No "karena", no "dipicu": the footer already says a spike is not proof of a cause.
- **Nothing is hover-only.** The same facts are written as sentences in a "Lonjakan" column of "Lihat angka", and a note under the charts explains the ring.
- **How a spike began is read in six hours, as one picture** (`spikeOnset`, day buckets only). The rise is the run of hours up to the day's peak hour that each reach 15% of it; the window opens one hour earlier and lasts six. The card shows the six hours as columns, the platform that was busy first and the mix over the window, and the conversation group (`issue_id`, three posts or more in the window) whose first post is the earliest. Posts that carry a date without a clock (most Instagram and TikTok posts) cannot be put in an hour: they are counted and left out. The lower chart's card opens upwards so it stays on screen.
- **Emotion panel reads top to bottom as three questions.** How many posts state an emotion at all and which one leads (two figures and one split bar); how the emotions moved day by day (stacked bars, the six emotions only); which emotions (six tiles, largest first). A tile's share is of the posts that state an emotion, so the six add up; posts without a clear emotion are counted in the split bar and not drawn in the chart.
- **The tiles are the chart's key and its filter.** One colour per emotion, shared by its bars and its tile, from the six chart series in a fixed stacking order (`STACK` in `EmotionAnalytics.jsx`) chosen with the palette validator; 2px gaps, names and emoji carry the rest. Choosing a tile dims the others in the chart and lists that emotion's posts.

## Growth table, chart hover card, report period, account pictures (15 Nov 2026)

- **Growth table** (`GrowthEvidence.jsx`, `ds/growth-evidence.css`, wording in `src/lib/pulseGrowthView.js`). One meaning per column: who and what (account picture, name, one line of the post; the whole cell opens the post), what was added and in how long ("+95, dalam 2 menit", so a two-minute reading is not taken for a trend), the rate with a bar sized against the fastest row, the change of pace as a tag, and when it was observed. Counts are right-aligned and tabular. Too little data is a dashed "Belum cukup data" tag, never "Tetap". Under 760px each post becomes a block with the column name written beside its figure. Every figure is the server's; the page only words it.
- **Chart hover card** (`.pu-hover-card` in `ds/analytics-kit.css`). Every chart shows the same floating card under the pointer, and its frame is written once: control line, panel radius, overlay shadow, 12px 14px, the same card as the account popover. Parts: `pu-hover-head` (what is hovered at the left, its total at the right, so the total is not a row of its own), `pu-hover-title` (a long name instead of a head), `pu-hover-bar` (the shares once, as a 6px bar), `pu-hover-rows` (one figure a row: name, count, and a share or a word in its own column), `pu-hover-foot`. Used by sentiment (`PulseChartTooltip` in `PulseAnalytics.jsx`, which adds the top posts with account pictures and names what their number counts through `topUnit`), emotion (`DayTip`), narratives (`NarrativeTip`) and the line charts (`ChartTooltipContent` in `components/ui/shadcn/chart.jsx`, whose label, series name and value are `pu-hover-label`, `pu-hover-name`, `pu-hover-value`; the spike card sits inside it). A chart adds its own class only for a width or its own content, never a second frame. The frame rule is `div.pu-hover-card` on purpose: just above a utility class, below a chart's own two-class rule. Row rules are written `> li` on purpose: a looser selector once reached the names in the top list and pushed them to the right. Pictures inside a hover card are fetched at once (`eager`).
- **Report period** (`ProjectReport.jsx`). The period chips of the project sit in one row between the actions and the archive. It is the project's one period (`useProjectPeriod`), not a second one: changing it here changes it on every page, and the pages below are rebuilt at once. The action line names the dates the file covers, and the file name carries them (`reportFileName(label, day, period)`: `…-2026-11-01-sd-2026-11-12.pdf`; the day the file was made when no dates are chosen).
- **Account pictures.** Wherever an account is named beside its words it is drawn with `AccountAvatar` or `PostAvatar` (picture, else initials, with the platform mark). A comment passes the picture stored with it (`profile_image_url`); a comment without one still gets the picture of a project account of the same name. Added in this pass: the growth table, the hover card's top posts, the evidence list under "Respons & sikap", and the seed post preview. The spike card's account list uses the same component.
