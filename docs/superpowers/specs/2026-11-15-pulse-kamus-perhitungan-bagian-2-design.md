# PULSE calculation dictionary, part 2: coverage, term shift, hour grid, concentration

Approved by the owner on 15 Nov 2026 ("Setuju, bangun"), after the placement was shown in chat. Part 1 (`2026-11-15-pulse-kamus-perhitungan-design.md`) defines the day, the clock, interactions, tone share and the account; this part adds four readings built on those and says where each is shown.

## Intent

Four analyses were proposed by a review of PULSE's metrics: a data confidence score, rising and falling words, a day-by-hour heatmap, and a Pareto curve of account concentration. Each is a new number. The owner's rule is that every number is calculated one way everywhere, because PULSE is to become an engine other users call. So each of the four gets one definition with a name and a version before it gets a picture, and each picture goes into a slot that exists: no new panel, and Ikhtisar is not touched.

## Goals

- Four definitions, each implemented once per runtime (server and browser) from the same shared cases, the way part 1 does it.
- Each shown in the slot named below, in both themes and at phone width, with a text alternative for anything drawn.
- Every figure opens to its posts where the page already has a way to open posts, and a figure nobody observed is `null`, never 0.

## Non-goals

- The scatter of followers against interaction ratio from the original proposal: follower counts are missing for too many accounts to draw it honestly.
- A single weighted "confidence score". Weights would be an invented number.
- Changing part 1's definitions or any file part 1 is moving.

## Anti-goals (it has failed if)

- A second way of counting a day, an interaction, a tone or an account appears: these four must call part 1.
- A page gains a panel, or a panel grows so that the page below it shifts on load.
- The level of coverage reads as a verdict on the project's quality instead of a statement about which figures are thin.

## The four definitions

All four take posts already scoped to the project's period and platforms. "Day", "clock", "interactions", "tone" and "account" mean part 1's `day_v1`, `clock_v1`, `interactions_v1`, `tone_share_v1` and `account_v1`.

### `coverage_v1`: how much of the selection each kind of figure rests on

- Three shares of the posts in the selection: **analysed** (the post has a tone), **measured** (its interactions are known, that is not `null`), **clocked** (it has a clock). A fourth, **dated** (it belongs to a day), is reported and not judged.
- The **level** follows the lowest of the three: 90% or more is `complete` ("Lengkap"), 60% to under 90% is `fair` ("Cukup"), under 60% is `limited` ("Terbatas"). The share that set the level is always named with it, because a level alone says nothing: "Terbatas: jam terbit ada pada 41% posting".
- The same four shares per platform, without a level of their own.
- An empty selection has no shares and no level (`null`).

A source that never gives a clock (most Instagram and TikTok posts) or never gives interactions (news) keeps the level low for as long as its posts are in the selection. That is the point: hour-by-hour figures and interaction figures do rest on fewer posts there.

### `term_shift_v1`: which words gained and lost ground

- A **term** is a word or two words in a row, read from a post's text with the tokenizer the word panel already uses (find it; do not write a second one). A post counts once per term.
- A term's **share** is the posts that contain it over the posts of the period. Its **shift** is its share now minus its share in the period before, in percentage points.
- The **period before** is the same number of days ending the day before the chosen period starts. Without a chosen period, or with no post in the period before, there is no shift (`null`) and the panel shows frequency only.
- A term is kept when at least 5 posts contain it in one of the two periods. Up to 8 rising and up to 8 falling terms, largest shift first; ties by more posts now, then alphabetically.

### `hour_grid_v1`: when the posts were published

- Rows are the seven weekdays, Monday first; columns are the 24 hours of the installation's zone. A cell counts the clocked posts of that weekday and hour.
- Posts without a clock are counted as `date_only`, posts without a date as `undated`; neither is in a cell.
- When the selection covers 14 days or fewer, the rows are the days themselves in order, so a single busy Tuesday is not read as "Tuesdays".

### `concentration_v1`: how much of the conversation rests on how few accounts

- Accounts are ranked by posts, most first; ties by the account key. The **curve** is the cumulative share of posts against the share of accounts, sampled at no more than 20 points and always including the first account and the last.
- Two headline figures: the share of posts written by the three most active accounts, and how many accounts (count and share) it takes to reach 80% of the posts.
- The same for interactions, with accounts ranked by the interactions of their posts and only posts whose interactions are known; the selection's measured share is reported beside it.
- Posts without an account are counted and left out. Fewer than 10 accounts: the headline figures stand and no curve is drawn.

The existing `accountConcentration` in `src/lib/pulseInsightMetrics.js` (top three accounts and top three posts) becomes a call into this definition or is removed, so one account key remains.

## Where each is shown

| Reading | Slot | Form |
|---|---|---|
| Coverage | The project bar above every analysis page (`src/pulse/ProjectBar.jsx`); the per-platform detail also on Sumber & Cakupan and in the report's "Cakupan dan batasan" | One badge with the level and the share that set it; on hover or focus a small card (the hover preview pattern in DESIGN.md) with the three shares as bars, total and per platform, and a link to Sumber & Cakupan |
| Term shift | Jaringan, the disclosure "Kata, tagar, dan waktu terbit" (`WordsAndTime` in `src/pulse/PageExtras.jsx`), inside the existing word panel | A two-way switch "Paling sering" and "Naik dan turun" (the `pu-segmented` switch); the second is bars to the left and right of a centre line, one row per term, with the two shares in text |
| Hour grid | The same disclosure, in place of the 24-bar publishing-hour chart | A grid of cells in one sequential hue (light to dark of the accent), hour labels every third hour, a legend, the counts of date-only and undated posts under it; at phone width the grid scrolls sideways inside its panel |
| Concentration | Akun & sumber, inside the existing panel "Konsentrasi percakapan" (`src/pulse/AccountConcentration.jsx`) | The cumulative curve beside the two bars that are there, with the 80% figure marked on it and said in words |

## How it is built

- Server: `server/app/services/pulse_readings.py`. Browser: `src/lib/pulseReadings.js`. Shared cases: `shared/pulse-readings.cases.json`, read by `server/tests/test_pulse_readings.py` and `src/lib/pulseReadings.test.js`. Sibling files, not additions to part 1's modules, because part 1 is being reviewed and moved through the code base by another session at the same time; they import part 1's functions and can be merged into the dictionary modules afterwards.
- The rule list (`GET /api/admin/pulse/measures`) gains the four rules with their Indonesian sentences once part 1's route is settled; until then the sentences live in the two modules.
- The pages compute from the posts they already hold, through `pulseReadings.js`. The term shift needs the posts of the period before: use the way the page already loads posts for a period.
- Order: the two modules with their cases first; then the four pictures one at a time, each checked on a copy of the database before the next.

## Constraints

- Other sessions are editing this checkout. Part 1 is moving many files (listed in its spec and in the coordination messages); the spike work holds `TrendChart.jsx`, `pulseTrendSpikes.js`, `pulseMonitor.js`, `ProjectOverview.jsx`, `SummaryInfographics.jsx`, `pulse_spikes.py`, `pulse_listening.py`, `pulse_summary.py` and part of `pulse_monitor.py`. This work touches only the files named in this document.
- The owner works on the live page: checks run on a copy of the database, the live server is not restarted for this.
- No model, engine or supplier name in any payload or page. New pictures are built from the design system (`--ps-*` tokens, `src/components/ui/shadcn`, the chart rules in DESIGN.md); no new package.
- No commit unless the owner asks.

## Decisions Claude made (for the owner to check)

1. The level thresholds, 90% and 60%.
2. The level follows the lowest of three shares and always names it, instead of one weighted score.
3. The period before is the same length, directly before the chosen one.
4. A term needs 5 posts in one of the two periods; 8 rising and 8 falling are shown.
5. With 14 days or fewer the hour grid shows the days themselves instead of weekdays.
6. The curve is drawn from 10 accounts up; below that only the figures.
7. The follower scatter is left out.

## Left to the builder

Function names; the exact shape of the cases file (follow part 1's); the Indonesian wording within the product's copy rules; how the curve and the grid are drawn within the chart rules.

## Testing

The shared cases in both suites, including the awkward ones named above (empty selection, a selection of one platform that gives no clock, no period before, a tie in the ranking, fewer than 10 accounts). Each picture has a rendering test for its states (no data, thin data, full data). A browser check on the copy server in both themes and at phone width.
