# PULSE · Brand and design guidelines

Version 2.0 · 14 November 2026

This is the single reference for how PULSE looks, reads and behaves. Tokens live in `src/pulse/pulse-tokens.css` and `src/pulse/ds/analytics-kit.css`; components live in `src/components/ui/`. Where this document and the code disagree, fix one of them the same day.

## 1. Promise

**Pahami percakapan. Telusuri buktinya.**

PULSE helps leaders understand a public conversation and lets analysts open the evidence behind every number. The identity is calm, precise and honest. Professional means readable and consistent, not dense with disclaimers or dramatic conclusions.

Three principles decide every design question:

1. **Evidence first.** A number is a door. Anything counted can be opened to the posts behind it.
2. **Say what was observed.** Unknown is not neutral, missing is not zero, an observation time is not an event time.
3. **Quiet until it matters.** Colour, weight and motion are spent on the data, not on the chrome.

## 2. Logo

### The wordmark

The PULSE wordmark is lowercase, drawn with one uniform stroke on a geometric skeleton. The **l** and **s** are a single line: a tall spike that settles into a wave. That line is the pulse trace the product is named for, and it is the one distinctive gesture in the mark. Everything else stays plain so the gesture reads.

- Component: `PulseLogo` in `src/components/ui/PulseLogo.jsx`. Size it with `height`; width follows.
- Construction: x-height 130 units, stroke 36 units (ratio 3.6 : 1), bowls radius 50, inner corners radius 25, joins rounded, terminals cut square.
- Colour: `currentColor`. Ink on light surfaces, light ink on dark. One colour only.

### The symbol

The spike-and-wave trace on its own is the symbol. Use it where the wordmark cannot fit: favicon, app tile, avatar.

- Component: `PulseSymbol`. Tile version: `public/pulse/brand/icon.svg` (lavender tile, accent-ink trace, corner radius 24% of the tile).
- The symbol never sits beside the wordmark. The trace is already inside the word; repeating it is noise.

### Sizes and space

| Use | Minimum | Standard |
| --- | --- | --- |
| Wordmark on screen | 20px high | 30px in the sidebar, 26px on phones, 40px on the sign-in page |
| Wordmark in print | 8mm high | 34px in the report masthead |
| Symbol tile | 16px | 32px |

Clear space on every side equals the height of the **u**. No badge, counter, avatar or rule enters it.

### Do not

- Do not set "PULSE" in a typeface as a substitute for the wordmark. In running text, write PULSE in capitals.
- Do not add letter-spacing, outline, shadow, gradient or a second colour.
- Do not separate the l and s, straighten the wave, or shorten the spike.
- Do not place the wordmark on a photograph, a chart, or a tinted panel with less than 7:1 contrast.
- Do not rotate, stretch, or animate it.

## 3. Colour

The strategy is restrained: violet-tinted neutrals, one lavender accent for action, and a separate palette for data. All values are OKLCH; every neutral carries a little of the brand hue (285).

### Interface

| Role | Token | Light | Use |
| --- | --- | --- | --- |
| Canvas | `--ps-bg` | `oklch(97% 0.006 285)` | Page background |
| Surface | `--ps-panel` | `oklch(99% 0.003 285)` | Panels, cards, inputs |
| Soft fill | `--ps-soft` | `oklch(94% 0.009 285)` | Quiet fills, comment blocks, tracks |
| Selected | `--ps-selected` | `oklch(96% 0.018 295)` | Hover and selected rows |
| Ink | `--ps-ink` | `oklch(26% 0.012 285)` | Titles, values, body |
| Muted | `--ps-muted` | `oklch(47% 0.016 285)` | Labels, dates, context |
| Line | `--ps-line` | `oklch(85% 0.012 285)` | Dividers, panel borders |
| Control line | `--ps-control-line` | `oklch(62% 0.018 285)` | Borders of things you can press |
| Accent fill | `--ps-lavender` | `oklch(88% 0.055 295)` | Primary button, active nav, pressed chip |
| Accent ink | `--ps-accent-ink` | `oklch(29% 0.045 295)` | Text on lavender only |
| Accent | `--ps-accent` | `oklch(43% 0.10 295)` | Focus ring, small icons |

Dark theme redefines the same tokens under `[data-theme=dark]`; never write a colour outside a token. `--ps-accent-ink` is for text on lavender. For text on a panel use ink, in both themes.

### Status (system state)

Mint, peach, info and danger (`--ps-mint`, `--ps-peach`, `--ps-info`, `--ps-danger`, each with an `-ink`) describe what the system is doing: collected, waiting, blocked. They never describe what people said.

### Data (what was measured)

| Meaning | Tokens |
| --- | --- |
| Sentiment | `--ps-sent-positive`, `--ps-sent-neutral`, `--ps-sent-negative`, `--ps-sent-unknown`, each with `-soft` and `-ink` |
| Platform | `--ps-plat-x`, `-instagram`, `-tiktok`, `-youtube`, `-facebook`, `-threads`, `-news`, `-web` |
| Interaction type | `--ps-eng-likes`, `--ps-eng-comments`, `--ps-eng-shares` |
| Other series | `--ps-chart-1` to `--ps-chart-6`, in order |

Rules: never borrow a status colour for data or the reverse. "Belum dianalisis" is a hatch, not a grey, so it cannot be mistaken for neutral. Colour always travels with a text label.

## 4. Typography

One family: Avenir Next, falling back to Avenir, Segoe UI, sans-serif. No second typeface.

| Step | Size | Use |
| --- | --- | --- |
| Caption | 12px | Labels, metadata, notes. The floor: nothing smaller. |
| Small | 13px | Secondary text, chips |
| Body | 14px | Interface text |
| Reading | 16px | Captions of posts, AI answers, inputs |
| Title | 18, 20px | Panel and section titles |
| Heading | 24, 28, 32px | Brief headline, stat values, page title |

Weights: 400 body, 600 labels, 650 titles and values. Letter-spacing is normal everywhere except small uppercase eyebrows (.08em). Numbers use tabular figures. Headings balance; paragraphs avoid orphans; reading text stays under 70 characters per line.

Hierarchy comes from one lever at a time. Labels are small and muted so the value can be large and dark; do not make both loud.

## 5. Space, shape and depth

- **Spacing scale**: 4, 8, 12, 16, 24, 32. Space inside a group is smaller than space between groups. Panels pad 20 to 24px; sections sit 24px apart.
- **Radius**: 3px marks, 6px tags, 8px controls, 12px panels, pill for bars and tracks. Nothing else.
- **Controls**: 44px high, for buttons, inputs and selects. Filter chips are 36px on desktop and 44px on phones.
- **Depth**: borders, not shadows. The one exception is the keycap edge on standard buttons (a 2px solid bottom edge that compresses on press). Floating layers (drawer, tooltip) use the named layer tokens `--ps-z-*`; never a raw z-index.
- **Gradients**: none. The hatch for unanalysed data is a pattern with meaning, not decoration.

## 6. Layout

- A page is: project bar, page heading, then content. Content starts as high as possible.
- **Project scope is one click.** Period and platform are chips under the project picker, always visible. Explanations live in the InfoTip beside each label.
- **A page section is not a card.** Only things that stand alone get a border. Cards never nest.
- **One surface for one set.** A row of figures is one strip with divided cells (`PulseStatGrid`). A ranking is one list with divided rows. Never a stack of bordered cards pressed together.
- **Pair before stretching.** Two related panels share a row (`.po-duo`, `.po-lead-grid`) instead of one panel spanning the page with an empty half.
- Everything reflows to one column on phones with no horizontal scroll.

## 7. Components

| Need | Component | Notes |
| --- | --- | --- |
| Action | `PulseButton` | Primary (lavender) once per view; secondary outlined; quiet for tertiary. `arrow` adds the PULSE arrow for "open". |
| Label or filter | `PulseTag`, `SentimentTag`, `PlatformTag`, `KeywordTag` | Static, pressable (`pressed`), or removable (`onRemove`). Always a text label. |
| Change | `PulseDelta` | Neutral unless the caller knows whether up is good. |
| Figures | `PulseStatGrid` + `PulseStat` | `null` renders as "—", never 0. A cell with `onClick` opens its evidence. |
| Part of a whole | `PulseDistribution` | One bar, one row per part. |
| Ranking | `PulseBreakdown` | Value, share, proportional track. |
| Chart parts | `PulseLegend`, `PulseChartTooltip` | The legend is a readable key, not decoration. |
| Interactions | `PulseEngagement` | Likes, comments, shares, views, plus quality and rate with their formulas one tap away. Uses the platform's own words (Balasan, Repost on X). |
| Empty state | `PulsePanelEmpty` | Says what is missing and offers one next step. |
| Explanation | `InfoTip` | Caveats and formulas. Sits above the drawer. |
| Evidence | `EvidenceDrawer`, `PulseSourceHeading` | Post, caption, stored comments, interaction detail, link to the original. |
| Open | `PulseArrow` | The diagonal arrow with a heartbeat. Replaces "↗" everywhere. |
| Metric icons | `PulseLike`, `PulseComment`, `PulseShare`, `PulseView`, `PulseBeat` | 16px grid, 1.6 stroke. |

Before building something new, look here. A new pattern needs a reason these cannot cover.

## 8. Data display

- **Every number opens.** Stats, chart bars, ranked rows and highlights open the posts behind them.
- **Count what was observed.** Views are exposure and stay out of interaction totals. A metric the source did not send is "tidak tersedia", and the count of posts that did report it is shown.
- **Derived indicators show their formula.** Kualitas interaksi = (komentar + bagikan) ÷ (suka + komentar + bagikan). Rasio interaksi = interaksi ÷ tayangan, only from posts reporting both.
- **Dates are WIB** and say what they are: published, first collected, observed.
- **Charts**: stacked bars for volume by sentiment, a single bar for part-to-whole, tracks for rankings. No pies, no 3D, no dual axes. Gridlines horizontal and faint; axis labels 12px.

## 9. AI features

PULSE has three assisted features: sentiment labels, Tanya AI, and Smart keyword. They share four rules.

1. **The server counts, the assistant words.** Figures come from stored data. The assistant never invents a number.
2. **Answers cite.** Tanya AI refers to posts by code (P1, P2) and lists them under the answer with a link to the original.
3. **Nothing is applied without confirmation.** Smart keyword suggests; the analyst ticks and confirms; only then are keywords added, and the project is saved only when the analyst saves.
4. **The engine room stays out of the interface.** No model names, vendors, "local" or "cloud" labels, or method identifiers in the product. Say "AI" or "Tanya AI". Operational detail belongs in server configuration and runbooks.

Mark assisted features with the sparkle icon and plain names. Never present an AI answer as a verified finding: the note under the composer says to check the cited posts.

## 10. Voice

Indonesian, plain, second person where needed. Sentence case.

- Lead with what happened: "152 posting dalam cakupan terpilih", not "Dashboard ringkasan".
- Name the thing a button does: "Tambahkan 3 keyword", "Lihat posting", "Tinjau sekarang".
- Errors say what happened and what to do next. Never show a raw provider message.
- Cautions are specific and short. One sentence where the reader needs it beats a paragraph of disclaimers; move the rest into an InfoTip.
- Avoid: viral (as a claim), terbukti, koordinasi, jangkauan, pengaruh, unless the data shows exactly that.

## 11. Motion

Motion confirms an action; it never decorates. 160ms, ease-out (`--ps-ease`), on transform, opacity and small colour changes only. No entrance animations, no looping motion, no animated layout. Everything respects `prefers-reduced-motion`.

## 12. Accessibility

- Text contrast 4.5:1 minimum in both themes; the wordmark 7:1.
- Every target 44px on touch; icon-only buttons carry an `aria-label`.
- Focus is always visible: 2px accent outline.
- Colour is never the only signal: sentiment has a label and a dot, unknown has a hatch.
- Charts have a text alternative (the list of dates, the breakdown rows).
- Live regions announce answers, saved states and errors.

## 13. Reports and print

Reports print in light theme regardless of the screen theme. The masthead carries the wordmark at 34px, ink on white. Interactive controls, info buttons and sparklines are hidden in print; figures, legends and sources remain. A report is a snapshot and says when it was taken.

## 14. Checklist before shipping a screen

- Does the first screenful answer a question, or is it still chrome?
- Can every number be opened?
- Is each value louder than its label?
- Are there nested cards, a second accent colour, a gradient, or text under 12px? Remove them.
- Does it hold at 390px, in dark theme, and with the keyboard?
- Does any text reveal the engine room?
- Did you reuse a component from section 7?

## 15. Infografik

Infografik adalah cara PULSE menjawab sebelum pembaca selesai membaca kalimatnya. Ia elemen brand setingkat logo dan warna: setiap ringkasan, laporan, dan panel bukti memakainya dengan bentuk yang sama.

**Prinsip**

- Angka dihitung dari data tersimpan, bukan diambil dari kalimat AI. Kalimat menjelaskan; infografik membuktikan.
- Satu infografik menjawab satu pertanyaan. Bila perlu dua jawaban, pakai dua.
- Selalu ada label teks. Warna dan bentuk hanya memperkuat.
- Nilai yang tidak tersedia ditulis "—", tidak pernah 0, dan infografiknya tidak digambar bila datanya kosong.
- Tayangan tidak pernah disebut jangkauan.

**Template**

| Template | Menjawab | Bentuk |
| --- | --- | --- |
| Deret angka | Seberapa besar? | Dua sampai lima angka tebal dengan label kecil, opsional garis tren di kanan |
| Batang proporsi | Bagaimana pembagiannya? | Satu batang 12px, urutan negatif, netral, positif, dengan persentase di bawahnya |
| Lencana tanggal | Kapan mulai? | Tanggal di lencana gelap, diikuti akun dan platform |
| Tumbuh tercepat | Posting mana yang naik paling cepat? | Tanda denyut, tambahan interaksi, dan laju per jam dengan label "posting tumbuh tercepat"; bila riwayat belum ada, hari teramai dengan garis tren. Kata "lonjakan" hanya untuk yang ditemukan aturan `spike_v1` |
| Batang peringkat | Apa yang paling banyak? | Tiga baris judul dengan angka dan garis proporsional |
| Kutipan | Apa kata orang? | Satu komentar teratas, miring, dengan penulis dan jumlah suka |
| Linimasa | Bagaimana urutannya? | Tanggal di kiri, titik dan garis, peristiwa di kanan |
| Kartu bernomor | Apa yang perlu dipantau? | Butir pendek dengan nomor di lingkaran gelap |
| Awan | Apa yang sering muncul? | Tagar atau emotikon tersusun rapat dari tengah, ukuran skala logaritmik |
| KPI penyebaran | Seberapa jauh menyebar? | Interaksi, dibagikan, tayangan dengan tanda metrik PULSE |

**Rupa**

- Latar infografik memakai warna pilihan (`--ps-selected`), radius kontrol, padding 12 × 14px. Di dalam kartu ungu SUMMARY AI ia duduk di atas panel putih.
- Angka utama 22px tebal 700, angka tabular. Label 12px warna redup.
- Sentimen selalu merah, abu, hijau dari token sentimen. Aksen ungu untuk semua yang bukan sentimen.
- Tidak ada grafik 3D, gradien, atau ikon dekoratif. Garis tren 1,75px tanpa sumbu.

**Pemetaan bagian ringkasan AI**

Awal → lencana tanggal · Viral → tumbuh tercepat · Topik utama dan Ringkasan → deret angka · Yang dibicarakan → batang peringkat · Sentimen, Nada publik, Suasana → batang proporsi · Kenapa orang marah → persentase negatif dan kutipan · Kronologi → garis tren dan linimasa · Perlu diperhatikan → kartu bernomor.
