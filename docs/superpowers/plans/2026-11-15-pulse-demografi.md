# PULSE demography ("Siapa yang bicara") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Siapa yang bicara" section at the top of Akun & sumber that shows who carries an issue (account size tiers, press against social media, where X accounts are) and how each group feels, from data the sources report.

**Architecture:** Four rules of the calculation dictionary, part 3 (`followers_v1`, `account_tier_v1`, `account_origin_v1`, `group_lead_v1`), implemented once per runtime from shared cases, like part 2 (`pulseReadings.js` / `pulse_readings.py`). The page computes from the posts it already holds. The map of X account locations and Tanya AI's account locations move onto `account_origin_v1`, so every count of X accounts by place is one count.

**Tech Stack:** React 19 + Vite, plain CSS with `--ps-*` tokens, `node --test`; FastAPI + SQLAlchemy async, pytest.

**Spec:** `docs/superpowers/specs/2026-11-15-pulse-demografi-design.md` (read it first; this plan argues from it). One deviation, because the drawer's heading lives in `EvidencePosts.jsx`, which task 4 holds: a group's three named accounts are shown with their pictures in the group's own row, not in the drawer heading.

## Global Constraints

- No age, gender or any attribute the sources do not report, estimated or otherwise; no individual is labelled with a political leaning; groups are counts.
- "Account", "interactions", "tone" are part 1's `account_v1` (`accountKey` / `account_key`), `interactions_v1` totalled with `interactionsTotal` / `interactions_total`, `tone_share_v1` (`toneShares` / `tone_shares`). Never a second way of counting them.
- No model, engine or supplier name in any payload or page.
- Pictures from the design system only (`--ps-*` tokens, chart series and sentiment colours, `AccountAvatar`, the shared evidence drawer `EvidenceSheet`); no new package.
- Do not edit the files dictionary task 4 holds: `server/app/services/pulse.py`, `pulse_network.py`, `src/lib/pulseOverview.js`, `pulseProjectFilters.js`, `pulseConversationGroups.js`, `pulseReport.js`, `pulseReportPages.js`, `pulseReplay.js`, `pulseAccountFilters.js`, `src/pulse/EvidencePosts.jsx`, `NarrativePanel.jsx`, `ReportPages.jsx`, `AccountRankingRow.jsx`, `PulseDashboard.jsx`, `NetworkExplorer.jsx`, `server/app/routers/pulse.py`, `pulse_measures.py`, `pulseMeasures.js`. Import their exports where needed.
- Checks run on a copy of the database (`demo-output/tools/make_demo_db.py`, a copy server on a free port such as 8013); the live server on 8000 is never restarted by this work.
- No commit: the owner commits on request. Each task ends by listing its files instead.
- Tests: app `node --test --test-concurrency=2 src/pulse/*.test.mjs src/pulse/*.test.js src/lib/pulse*.test.js src/lib/*.test.mjs`; server from a private empty directory, `PYTHONPATH=<repo>/server <repo>/.venv/bin/python -m pytest <repo>/server/tests -q -k pulse -p no:warnings`.

## Review Focus

1. An account whose follower count differs between its posts (it grew, or one provider reported another figure): it sits in the tier of its most recently collected post's figure. Test in Task 1 cases.
2. A selection of news only, or of Threads and Reddit only (no follower counts at all): one row (Pemberitaan, or Pengikut tidak diketahui), no "who carries" interaction clause, no "most negative" below 20 analysed posts, and nothing presented as a speaker kind that is a gap. Tests in Task 1 and Task 4 cases.
3. A "based in" value that is a region ("Southeast Asia", "East Asia & Pacific") is never counted abroad; an empty value is unknown; a country other than Indonesia is abroad. Test in Task 2 cases.
4. Akun & sumber narrowed to one sentiment: every tone bar would be one colour, so the tone column and the most-negative sentence are hidden with a line saying why. Test in Task 5.
5. A post without an author on a social platform: its post counts in "Pengikut tidak diketahui", it adds no account. Test in Task 1 cases.

---

### Task 1: `followers_v1` and `account_tier_v1` in both runtimes

**Files:**
- Create: `shared/pulse-demography.cases.json`, `src/lib/pulseDemography.js`, `src/lib/pulseDemography.test.js`, `server/app/services/pulse_demography.py`, `server/tests/test_pulse_demography.py`

**Interfaces:**
- Consumes: `postMeasures`, `accountKey`, `accountName`, `interactionsTotal`, `toneShares`, `reported`, `byInteractions` from `src/lib/pulseMeasures.js`; `post_measures`, `account_key`, `account_name`, `interactions_total`, `tone_shares`, `reported`, `interaction_sort_key` from `server/app/services/pulse_measures.py`; `voiceOf` from `src/lib/pulseVoice.js` (server: platform `news` is news).
- Produces (JS; Python names in snake_case, same shapes):
  - `RULES = { followers: 'followers_v1', tier: 'account_tier_v1', origin: 'account_origin_v1', lead: 'group_lead_v1' }`, `RULE_TEXT` (one Indonesian sentence per rule).
  - `TIERS`: `[{key:'news',label:'Pemberitaan'}, {key:'1m',label:'≥1 jt',min:1000000}, {key:'100k',label:'100 rb–1 jt',min:100000}, {key:'10k',label:'10–100 rb',min:10000}, {key:'1k',label:'1–10 rb',min:1000}, {key:'small',label:'<1 rb',min:0}, {key:'unknown',label:'Pengikut tidak diketahui'}]`.
  - `followersOf(posts): Map<string, number>` (account_v1 key → count).
  - `accountTiers(posts): { total: number, social_posts: number, followers_known_posts: number, known_interactions: number|null, rows: TierRow[] }`, rows in `TIERS` order, only rows with posts. `TierRow = { key, label, accounts, posts, post_share, interactions: {value, posts}, interaction_share: number|null, tone: <toneShares result>, top: {account, name, platform, interactions}[] }` (`top` at most 3, by the interaction ordering; Pemberitaan's `top` by posts).

- [ ] **Step 1: Write the cases and both tests.** Follow `shared/pulse-readings.cases.json` (an `about` block, the zone, posts with `times`, shares as fractions). Cases: empty selection (`rows: []`, `total: 0`); one account with three posts whose followers are 900 (collected 1 Nov), 1200 (collected 3 Nov), missing (collected 4 Nov) → tier `1k`; same counts with no `crawled_at` → the larger figure; a news post → `news` whatever its followers; a Threads post → `unknown`; a social post without an author → `unknown` row, posts +1, accounts +0; a tier with interactions unknown on every post → `interactions.value === null`, `interaction_share === null`; post shares of all rows add up to 1. `pulseDemography.test.js` reads the file like `src/lib/pulseReadings.test.js` does; `test_pulse_demography.py` like `server/tests/test_pulse_readings.py`.
- [ ] **Step 2: Run both; they fail** (`Cannot find module` / `ModuleNotFoundError`).
- [ ] **Step 3: Implement `followersOf` / `followers_of` and `accountTiers` / `account_tiers`.** `followers_v1`: the figure on the account's most recently collected post that carries a reported count (`crawled_at`, then `first_observed_at`); with no collection time on either, the larger figure. A post's tier: `news` when `voiceOf(post) === 'news'`; else by its account's figure (`min` bounds, inclusive); else `unknown`. `interaction_share` is the row's known interactions over `known_interactions` of the whole selection.
- [ ] **Step 4: Run both; they pass.**
- [ ] **Step 5: List the files (no commit).**

### Task 2: `account_origin_v1` in both runtimes, and the "based in" value on posts

**Files:**
- Modify: `shared/pulse-demography.cases.json`, `src/lib/pulseDemography.js`, `src/lib/pulseDemography.test.js`, `server/app/services/pulse_demography.py`, `server/tests/test_pulse_demography.py`, `server/app/services/pulse_profiles.py` (`attach_profiles`, next to `author_location`), its test in `server/tests/test_pulse_commenter_profiles.py` or the profile test that covers `attach_profiles`
- Before editing `pulse_profiles.py`: it belongs to the profile work committed in `1ebaf4d`; send that session one line (the coordinator does this).

**Interfaces:**
- Consumes: Task 1's module; `provinceOfLocation` from `src/lib/pulsePlaces.js` (server: `province_of_location` from `pulse_places.py`); `sentimentDate`-style day of a post through `postMeasures(post).day`.
- Produces:
  - `REGIONS`: the set of "based in" values that name a region, not a country (at least `Southeast Asia`, `East Asia`, `East Asia & Pacific`, `South Asia`, `West Asia`, `Central Asia`, `Asia`, `Asia Pacific`, `Middle East`, `Europe`, `North America`, `South America`, `Latin America`, `Africa`, `Oceania`; extend from `select distinct based_in from pulse_account_profiles` on the copy).
  - `accountOrigin(posts): { accounts: number, unasked: number, no_location: number, with_location: number, province_read: number, country: { indonesia, abroad, region_only, unknown }, provinces: OriginRow[], rows: OriginAccount[] }` where each country group is `{accounts, posts, tone}`, `OriginRow = {code, name, accounts, posts, tone, places: [string, number][]}` (at most 8, most accounts, then posts, then name), `OriginAccount = {key, author, location: string|undefined, based_in: string|undefined, province: {code, name, place}|null, first_day: string|null, posts, interactions: {value, posts}, followers: number|null, post}`. X posts only; `key` is `account_v1`; location and based-in from the most recently collected post that carries them (as `followers_v1`).
  - Server: `attach_profiles` sets `metrics['author_based_in'] = row.based_in or ''` wherever it sets `author_location`.

- [ ] **Step 1: Write the cases and tests.** Base splits: an account with no `author_location` key on any post → `unasked`; `''` → `no_location`; "Jakarta Selatan" → province DKI Jakarta; "Kuala Lumpur" → `with_location` but no province; "based in" `Indonesia` → `indonesia`, `Malaysia` → `abroad`, `Southeast Asia` → `region_only`, missing or `''` → `unknown`; an account whose location changed between posts → the most recently collected one; an account with no dated post is still counted (`first_day: null`); non-X posts are ignored. Server test: `attach_profiles` on a post whose stored profile has `based_in='Southeast Asia'` sets `author_based_in`.
- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement `accountOrigin` / `account_origin` and the one line in `attach_profiles`.**
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: List the files (no commit).**

### Task 3: The map, the Jaringan card and Tanya AI count X accounts by `account_origin_v1`

**Files:**
- Modify: `src/lib/pulsePlaces.js` (`accountSpread`, `accountDetail` keep their output shapes), `src/lib/pulsePlaces.test.mjs`, `server/app/services/pulse_places.py` (`location_summary`), `server/tests/test_pulse_places.py`, `server/app/services/pulse_chat.py` (the `locations` block in `build_context`, around "Where the X accounts in scope say they are"), `server/tests/test_pulse_chat.py`

**Interfaces:**
- Consumes: `accountOrigin` / `account_origin` (Task 2); `attach_profiles` (server).
- Produces: `accountSpread(posts)` with the same keys as today, built from `accountOrigin(posts).rows`: `total` is every X account in the selection (no longer only those with a dated post); `postsByDay` and `namedByDay` count accounts by `first_day`, and an account without one is in the totals but on no day. Each province's `accounts[]` keeps its fields; its `interactions` stays a number or null (the reading's `interactions.value`). `location_summary(origin: dict) -> {accounts, asked, located, named, provinces}` (same keys as today; `asked = accounts - unasked`, `located = with_location`, `named = province_read`), taking the reading instead of a dict of texts.

- [ ] **Step 1: Update the tests to the rule.** `pulsePlaces.test.mjs` "X accounts are counted by the province their profile names…": one X account written as `@Budi` and `budi` is one account; an X account whose posts have no date counts in `total` and on no day. `test_pulse_places.py`: `location_summary` is called with `account_origin(posts)`; same expected figures for the existing cases. `test_pulse_chat.py`: the data block's account-location line for two X posts of one account written two ways counts one account.
- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** In `build_context`, make post dicts of the X items (`platform`, `author`, `published_at`, `crawled_at`, `metrics` as a copy), run `await attach_profiles(db, those)`, and pass `account_origin(those)` to `location_summary`; the old per-key lookup goes.
- [ ] **Step 4: Run the place, map, chat and summary tests; they pass** (`src/lib/pulsePlaces.test.mjs`, `src/pulse/region-map.test.mjs`, `src/pulse/region-summary.test.mjs`, `server/tests/test_pulse_places.py`, `test_pulse_chat.py`, `test_pulse_summary.py`).
- [ ] **Step 5: List the files (no commit).**

### Task 4: `group_lead_v1` in both runtimes, and its sentences

**Files:**
- Modify: `shared/pulse-demography.cases.json`, `src/lib/pulseDemography.js`, `src/lib/pulseDemography.test.js`, `server/app/services/pulse_demography.py`, `server/tests/test_pulse_demography.py`

**Interfaces:**
- Consumes: `accountTiers`, `accountOrigin`.
- Produces:
  - `NEGATIVE_MIN_ANALYSED = 20`, `WHERE_MIN_ACCOUNTS = 10`.
  - `groupLead(tiers, origin): { carrier: {posts_row: string, interactions_row: string|null, unknown_share: number|null} | null, negative: {row: string, share: number, analysed: number} | null, where: {code: string, name: string, accounts: number, read_share: number} | null }` (row values are `TIERS` keys).
  - JS only: `leadSentences(lead, tiers, origin, { sentimentFiltered: boolean }): string[]`, the Indonesian sentences of the spec ("Paling banyak ditulis akun <1 rb (61% posting), tetapi interaksi terbesar dari akun ≥1 jt (47%).", "Paling negatif: akun 10–100 rb, 54% dari 300 posting yang dianalisis.", "Akun X paling banyak dari DKI Jakarta (158 akun); provinsi terbaca pada 19% akun X."); without the negative sentence when `sentimentFiltered`.

- [ ] **Step 1: Write the cases and tests.** Nameable rows are every `TIERS` key except `unknown`. Who carries: largest `post_share` among nameable rows; largest `interaction_share` among nameable rows with known interactions; one name when both are the same row; `unknown_share` set only when the unknown row's `post_share` is larger than the named row's. Most negative: nameable rows with `tone.analysed >= 20`, highest negative percent, ties by more analysed then `TIERS` order; `null` when none has 20. Where: `origin.provinces[0]` when `origin.province_read >= 10`, `read_share = province_read / accounts`. Cases: news only; Threads only (carrier `null` because no nameable row); a tier with 19 analysed posts (not named); the unknown row largest.
- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement `groupLead` / `group_lead` and `leadSentences`.** Percentages in sentences are whole percents cut, as `coverage_v1` writes them.
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: List the files (no commit).**

### Task 5: The "Siapa yang bicara" section on Akun & sumber

**Files:**
- Create: `src/pulse/WhoIsSpeaking.jsx`, `src/pulse/ds/who-is-speaking.css`, `src/pulse/who-is-speaking.test.mjs`
- Modify: `src/pulse/PageExtras.jsx` (`AccountsInsights`: the section first, above `AccountConcentration`), `src/components/admin/pulse/NetworkAnalysis.jsx` (pass `initialLayer="accounts"` to `RegionSpreadMap` when the address has `layer=accounts`)

**Interfaces:**
- Consumes: Tasks 1, 2, 4; `EvidenceSheet` via the page's `open(title, rows, options)`; `AccountAvatar`; `toneShares` colours as the Sentimen page uses them.
- Produces: `WhoIsSpeaking({ posts, onOpen, sentimentFiltered, mapLink })`, where `mapLink` is `/pulse/network?topic=<id>&focus=map&layer=accounts`. `sentimentFiltered` is true when the address carries a sentiment the page applies (read it the way `PulseDashboard` decides to scope the posts; do not edit that file).

- [ ] **Step 1: Write the rendering test** (server-side render through Vite, as `src/pulse/coverage-badge.test.mjs` does): nothing at all for no posts; with thin data (news only) one row and no carrier sentence; with full data the three sentences, one row per tier with posts in `TIERS` order, each row showing accounts, the post share, the interaction share ("—" when unknown) and a tone bar with its text alternative; "Pengikut diketahui pada N% posting media sosial."; the origin block with "Indonesia", "hanya wilayah", "luar negeri", the provinces and "provinsi terbaca pada N dari M akun X (P%)", and a link to `mapLink`; with `sentimentFiltered` no tone column, no most-negative sentence, and the line "Nada per kelompok perlu semua sentimen; pilihan sentimen di halaman ini sedang aktif."; each row shows its `top` accounts (at most 3) as `AccountAvatar size="xs"` with their names; a row is a button whose click calls `onOpen(<row label>, <its posts>)`.
- [ ] **Step 2: Run; it fails.**
- [ ] **Step 3: Implement the component, its CSS and the two small edits.** One grid of rows (group, accounts, posts bar, interactions bar, tone bar), not cards; two chart series colours with a key for posts and interactions; sentiment colours for tone; at `max-width: 700px` each row stacks its figures with no sideways scroll; the section is drawn with the page once its posts are loaded (Akun & sumber shows its skeleton before that), so nothing below it moves; both themes from tokens only.
- [ ] **Step 4: Run the new test, `src/pulse/account-concentration.test.mjs`, `src/pulse/network-spread.test.mjs`; they pass. Run eslint on the changed files.**
- [ ] **Step 5: List the files (no commit).**

### Task 6: Check it on a copy of the data, and record it

**Files:**
- Modify: `DESIGN.md` (a short section under the account pages: what the section shows, the four rules, what is never shown)

- [ ] **Step 1: Run the whole app suite and the whole server suite** (commands in Global Constraints). Expected: no failure that this work caused; any failure named with its owner.
- [ ] **Step 2: Start a copy server and look** at `/pulse/accounts?topic=<largest project>` in light and dark at 1280 px and at 390 px, and with `?sentiment=negative`; open a row's drawer; follow the map link and see the "Lokasi akun X" layer with the same province count as the section. Stop the copy server and delete the copy and its session file.
- [ ] **Step 3: Write the DESIGN.md section and run `npm run build`.**
- [ ] **Step 4: Report** the figures seen on the copy for the largest project (tier shares, the three sentences, the origin split) and every file changed.
