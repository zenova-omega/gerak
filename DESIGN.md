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
- **Komentar**: list with a sticky side rail. **Posting**: list with the quick-filter rail. **Jaringan**: explorer with the evidence column. **Akun & sumber**: figures, then the ranking table full width.

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
| Komentar | 4 + 4 + 4 Sentimen komentar, Sikap posting, Sikap komentar · 8 + 4 comment list, rail (filters, figures, emoticons, automatic collection) |
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
