# PULSE Calculation Dictionary, Part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One named, versioned rule each for a post's day, its interactions, the base of a sentiment share and what counts as one account, used by every page, route and summary.

**Architecture:** `server/app/services/pulse_measures.py` and `src/lib/pulseMeasures.js` hold the four rules and nothing else. Both are tested against one file of worked cases, `shared/pulse-measures.cases.json`. The server writes each post's own figures into the payload once (`post.measures`); the browser reads them and uses its module only for sums and shares over a filtered set.

**Tech Stack:** FastAPI, SQLAlchemy async, SQLite, pytest; React 19, Vite, node:test.

**Spec:** `docs/superpowers/specs/2026-11-15-pulse-kamus-perhitungan-design.md`. Read it before any task.

## Global Constraints

- No commit and no push: the owner commits on request. A task ends with its test run.
- Other sessions edit this checkout. **Never open for editing:** `server/app/services/pulse_spikes.py`, `pulse_listening.py`, `pulse_summary.py`, the `volume_spike` part of `server/app/services/pulse_monitor.py` and its tests, `src/pulse/TrendChart.jsx`, `src/lib/pulseTrendSpikes.js`, `src/lib/pulseMonitor.js`, `src/pulse/ProjectOverview.jsx`, `src/pulse/SummaryInfographics.jsx`, `src/pulse/RegionSpreadMap.jsx`, `src/lib/pulsePlaces.js`, `src/lib/pulseRegionMap.js`, and (reserved by part 2 of the dictionary, built in another session) `src/lib/pulseInsightMetrics.js`, `src/pulse/AccountConcentration.jsx`, `src/pulse/ProjectBar.jsx`, `src/pulse/PageExtras.jsx`, `server/app/services/pulse_readings.py`, `src/lib/pulseReadings.js`. A call site of these rules inside one of them is written into the ledger as `open:` and left alone.
- Re-read a file immediately before editing it; make the smallest edit; never reformat a file.
- The names and meaning of the module functions from Task 1 are fixed: another session's code imports them (`has_clock`, `local_day`, `interactions`, `tone`, `account_key` and their browser twins), and these existing exports keep their names and meaning: `bucketPosts`, `bucketLabel`, `postInteractions`, `hasClock`, `formatCount`, `sourceText`, `sentimentDate`.
- Tests never reach the network, the real model or the supplier. Never read or print `server/.env`.
- No model, engine or supplier name in any payload, page or shipped JavaScript. UI copy is Indonesian, sentence case, no em dashes.
- The live API (port 8000) is not restarted by a task. Verification uses a copy of the database on its own port.
- The server suite shares `server/test.db` with other sessions: mass "no such table" errors mean a collision; rerun when no other pytest is running.
- Test commands: server `cd server && ../.venv/bin/python -m pytest tests -q -k pulse -p no:warnings`; frontend `node --test --test-timeout=180000 src/pulse/*.test.mjs src/pulse/*.test.js src/lib/pulse*.test.js src/lib/*.test.mjs`.
- An existing test whose expectation encoded an old rule is updated, with one line in the ledger saying which rule changed it. No other existing test may be weakened.

## Review Focus

1. A timestamp with a zone written without a colon (`2026-11-10T08:00:00+0700`), with a space instead of `T`, or with fractional seconds: read the same way on both sides. (Task 1, Task 2)
2. A post published between 17:00 and 24:00 UTC: it belongs to the next day in WIB on every page and in every route, including Monitor's "days with posts". (Task 2)
3. A metric stored as a digit string, as a float, as a negative number or as `true`: digit strings count, the others are "not reported" on both sides. (Task 3)
4. A project where no post reports any interaction: totals read "—", never 0, and ordering by interactions keeps publication order. (Task 3)
5. A project with nothing analysed yet: no percentage is printed (not 0%, not NaN%), and "belum dianalisis" carries the whole count. (Task 5)

---

### Task 1: The two modules, the shared cases, the rule list

**Files:**
- Create: `shared/pulse-measures.cases.json`, `server/app/services/pulse_measures.py`, `src/lib/pulseMeasures.js`, `server/tests/test_pulse_measures.py`, `src/lib/pulseMeasures.test.mjs`
- Modify: `server/app/config.py` (two settings), `server/app/routers/pulse.py` (one route)

**Interfaces (produces):**
- Settings: `PULSE_ZONE_OFFSET_MINUTES: int = 420`, `PULSE_ZONE_NAME: str = "WIB"`.
- Server, all pure except `zone()`:
  - `RULES: dict[str, str]` = `{'day': 'day_v1', 'clock': 'clock_v1', 'interactions': 'interactions_v1', 'shares_total': 'shares_total_v1', 'content_shares': 'content_shares_v1', 'tone_share': 'tone_share_v1', 'account': 'account_v1'}` and `RULE_TEXT: dict[str, str]` (one Indonesian sentence per rule, taken from the spec's definitions).
  - `zone() -> tuple[int, str]` (offset minutes, name) from settings.
  - `has_clock(value: datetime | None) -> bool`; `local_day(value: datetime | None, offset: int | None = None) -> str | None`; `week_start(day: str) -> str`; `period_bounds(date_from: date | None, date_to: date | None, offset: int | None = None) -> tuple[datetime | None, datetime | None]` (UTC, start inclusive, end exclusive = next local midnight).
  - `reported(value) -> int | None`; `interactions(metrics: dict | None) -> int | None`; `shares_total(metrics_list) -> int | None`; `content_shares(metrics_list) -> int | None`; `interaction_sort_key(interactions, published_at, post_id) -> tuple`.
  - `tone(metrics: dict | None) -> str` (`'positive' | 'neutral' | 'negative' | 'unknown'`); `tone_shares(counts: dict) -> dict` returning `{'analysed': int, 'unknown': int, 'percent': {'positive': int, 'neutral': int, 'negative': int} | None, 'text': {'positive': str, ...} | None}` (`None` when nothing is analysed; text is `'34%'` or `'<1%'`).
  - `account_key(platform: str | None, author: str | None, metrics: dict | None) -> str | None`.
  - `post_measures(published_at, platform, author, metrics, post_id=None) -> dict` = `{'day', 'clock', 'interactions', 'account', 'tone'}`.
- Route: `GET /api/admin/pulse/measures` returns `{'zone': {'offset_minutes', 'name'}, 'rules': [{'name', 'version', 'text'}]}`.
- Browser (`src/lib/pulseMeasures.js`), same rules: `RULES`, `setZone({ offset_minutes, name })`, `zone()`, `readTime(value) -> number | null` (ms; UTC when the value carries no zone), `hasClock(value)`, `localDay(value)`, `weekStart(day)`, `inPeriod(value, from, to)`, `reported(value)`, `interactions(metrics)`, `sharesTotal(posts)`, `contentShares(posts)`, `byInteractions(a, b)` (comparator over posts), `tone(post)`, `toneShares(counts)`, `accountKey(post)`, `postMeasures(post)` (returns `post.measures` when present, else computes).
- Cases file: one object whose keys are `zone`, `read_time`, `has_clock`, `day`, `week_start`, `in_period`, `reported`, `interactions`, `shares_total`, `content_shares`, `interaction_order`, `tone`, `tone_shares`, `account`; each a list of `{"in": ..., "out": ...}` (extra named inputs where a rule takes more than one). At least the cases the spec's definitions and the Review Focus name, and for `account` one case per row of the spec's table.

- [ ] **Step 1:** Write the cases file from the spec. Include: naive, `Z`, `+07:00`, `+0700`, space-separated and fractional timestamps; 16:59:59 and 17:00:00 UTC on the same date; midnight UTC (no clock); null; Monday and Sunday for `week_start`; first and last instant of a period; digit string, float, negative, boolean, missing metrics; nothing reported with and without a stored total; a repost carrying `original_shares`; ties in ordering; both stored label forms; zero analysed; a tone that rounds to 0; `@Okezonenews ` on X; a YouTube row with and without id; Instagram with id; Threads and Reddit; a publisher in two letter cases.
- [ ] **Step 2:** Write `server/tests/test_pulse_measures.py` and `src/lib/pulseMeasures.test.mjs`: each loads the cases file and asserts every case; plus one test each that the rule names and versions are identical to a list written in the test, and (server) the route's shape. Run both. Expected: fail on import.
- [ ] **Step 3:** Implement both modules and the route. Tone shares use the largest-remainder method over the three analysed tones.
- [ ] **Step 4:** Run both test files. Expected: pass. Run both suites. Expected: no new failure.

### Task 2: Day

**Files (modify):** `server/app/services/pulse.py`, `pulse_chat.py`, `pulse_home.py` (only where a day is derived), `pulse_response_analysis.py`, `server/app/routers/pulse.py`, `pulse_chat.py`, `pulse_growth.py`, `pulse_monitor.py` (router), `pulse_reports.py`, `pulse_evaluation.py`; `src/lib/pulseSentiment.js`, `pulsePostFilters.js`, `pulseData.js`, `pulseConversationGroups.js`, `pulseReplay.js`, `pulseChronology.js`, `pulseTrendSeries.js`, `pulseReportPages.js`, `pulseOverview.js`, `src/pulse/evidenceFigures.js`, `src/components/admin/pulse/IssueCard.jsx`, `src/components/admin/pulse/PulseDashboard.jsx` (calls `setZone`). Tests: extend the existing test file of each module touched.

**Interfaces:** consumes Task 1. Produces: every analytics post carries `measures.day` and `measures.clock`; the analytics payload carries `measures: {zone, rules}` once.

- [ ] **Step 1:** List the call sites: `grep -rnE "timedelta\(hours=7\)|\+ ?7 ?\* ?3600|7 \* 60 \* 60|func\.date\(|astimezone\(WIB\)|T00:00:00\+07:00|T23:59:59" server/app src --include=*.py --include=*.js --include=*.jsx` plus the five browser readers named in the spec. Write the list into the ledger.
- [ ] **Step 2:** For each site write the failing test first in that module's test file (the Review Focus cases 1 and 2 for a route and for a page helper each; Monitor's "days with posts" counting a 23:30 UTC post on the next day; a date-only post left out of `pulseChronology`'s time order and counted as left out; report weeks starting on Monday). Run: fail.
- [ ] **Step 3:** Replace each site with a call into the module. `sentimentDate`, `publishedDay`-like helpers, `timeOf`, `dayOf`, `replayTime`, `postTime` become one-line calls or are removed and their callers call the module. `hasClock`, `pulseDate`, `pulseDay` in `pulseData.js` keep their names and call the module. Monitor's distinct days are counted from `local_day`, not `func.date`.
- [ ] **Step 4:** Run the touched test files, then both suites. Expected: pass; updated old expectations listed in the ledger.

### Task 3: Interactions and shares

**Files (modify):** `server/app/services/ingest/common.py` (`observed_engagement` becomes a call into the module), `server/app/services/pulse.py`, `pulse_chat.py`, `pulse_network.py`, `pulse_growth.py`, `pulse_retention.py`, `server/app/routers/pulse.py`; `src/lib/pulseEngagement.js`, `pulseReplay.js`, `pulsePostFilters.js`, `pulseOverview.js`, `pulseReport.js`, `src/pulse/EvidencePosts.jsx`, `src/components/ui/PulseEngagement.jsx`. Tests: the existing test file of each.

**Interfaces:** consumes Task 1. Produces: `measures.interactions` on each post; `metric_totals.shares` computed by `shares_total`.

- [ ] **Step 1:** List the call sites: every use of `observed_engagement`, `_engagement`, `metrics.engagement`, `postInteractions`, `contentShares`, `sumOf(`…`shares`, and every literal sum of likes, comments and shares. Ledger.
- [ ] **Step 2:** Failing tests first (Review Focus 3 and 4; a post with nothing reported and no stored total is unknown in the issue card, in Tanya AI's data block and in the network payload; the evidence drawer opened from a conversation group shows the group's `content_shares`, a drawer opened from a day shows `shares_total`; ordering ties). Run: fail.
- [ ] **Step 3:** Replace. `postInteractions` and `contentShares` keep their names in `pulseEngagement.js` as one-line calls so their many importers do not change. The stored issue score keeps needing a number: it uses the known value or 0 for the score only, and `engagement_total` stays unknown when nothing is known. `EvidencePosts` takes a prop saying whether its posts are one piece of content.
- [ ] **Step 4:** Tests, then both suites.

### Task 4: Account

**Files (modify):** `server/app/services/pulse.py`, `pulse_network.py`; `src/lib/pulseOverview.js`, `pulseProjectFilters.js`, `pulseConversationGroups.js`, `pulseReport.js`, `pulseReportPages.js`, `pulseReplay.js`, `pulseAccountFilters.js`, `src/pulse/EvidencePosts.jsx`, `src/components/admin/pulse/NarrativePanel.jsx`. Tests: the existing test file of each.

**Interfaces:** consumes Task 1. Produces: `measures.account` on each post; the server's influencer rows keyed by it and carrying `key`.

- [ ] **Step 1:** List the call sites: `author_id || `, `author_id or `, `platform|`, `JSON.stringify([`…`author`, `lstrip('@')`, `.replace(/^@/`. Ledger. `profile_key` in `pulse_profiles.py` is the listed exemption and is not touched.
- [ ] **Step 2:** Failing tests first (the same account written `Okezonenews` and `@okezonenews` is one row on Akun & sumber, in the report's account table and in the network; a YouTube channel renamed between two posts stays one account; a Threads account with an id on one row and none on another is one account; the shown name is the most recently published one). Run: fail.
- [ ] **Step 3:** Replace each key with `account_key` / `accountKey`.
- [ ] **Step 4:** Tests, then both suites.

### Task 5: Tone share

**Files (modify):** `server/app/services/pulse_chat.py`, `pulse_sentiment.py` (label reader only), `pulse_home.py`; `src/lib/pulsePostFilters.js` (`postSentiment`), `pulseVoice.js`, `pulseConversationGroups.js`, `pulseSentiment.js`, `pulseReportPages.js`, `pulseResponse.js`, `pulseRadar.js` (`projectTones` only), `src/pulse/SentimentAnalytics.jsx`, `VoiceOverview.jsx`, `EmotionAnalytics.jsx`, `ReportPages.jsx`, `src/pulse/useHideUnknown.js` (meaning of the toggle). Tests: the existing test file of each.

**Interfaces:** consumes Task 1. Produces: `measures.tone` on each post; every sentiment percentage from `tone_shares` / `toneShares`.

- [ ] **Step 1:** List every place a sentiment percentage or a tone is derived (`shares(`, `sentimentShares`, `sharePercent(` on tones, `/ total * 100` near tone counts, `postSentiment`, `_sentiment`). Ledger. `src/lib/pulseRadar.js` is being edited by the Beranda session: re-read immediately before the one edit to `projectTones`.
- [ ] **Step 2:** Failing tests first (Review Focus 5; the three percentages on the Sentimen page are the same with the toggle on and off, and the toggle only removes the "belum dianalisis" rows and segment; Beranda's project tones use the analysed base and print "belum dianalisis" as a count; a tone with one post of 300 prints "<1%"; both stored label forms give the same tone). Run: fail.
- [ ] **Step 3:** Replace. `shares()` in `pulseVoice.js` and `sentimentShares` keep their names as calls into the module for tone counts.
- [ ] **Step 4:** Tests, then both suites.

### Task 6: The guard, rule versions in reports, documents

**Files:** Create `src/pulse/measures-guard.test.mjs`. Modify `server/app/routers/pulse_reports.py` and `server/app/models/pulse_reports.py` only if a column is needed (prefer a key inside the stored snapshot), `src/pulse/ReportArchive.jsx` or the component that opens a filed report, `DESIGN.md` (append one section), `docs/operations/pulse-onprem.md` (the two zone settings).

- [ ] **Step 1:** Failing guard test: no file under `server/app` or `src` other than the two modules contains a hand-written zone shift (`timedelta(hours=7)`, `7 * 3600000`, `7 * 60 * 60`, `+07:00` in code), a literal sum of likes, comments and shares, or an account key built from `author_id` and `author`. Exemptions are a list in the test: the reserved files of the Global Constraints (each with the note "reserved by another session, 15 Nov 2026"), `pulse_profiles.py` (`profile_key`), `pulse_lookback.py` and `pulse_backfill.py` (collection windows).
- [ ] **Step 2:** Make it pass by fixing what it finds, not by widening the exemptions.
- [ ] **Step 3:** Failing tests, then code: a report filed from now on stores `rules` (the versions from `RULES`); opening a report whose stored versions are missing or older than the current ones shows one line, "Angka laporan ini dihitung ulang dengan aturan perhitungan terbaru.", and nothing else changes.
- [ ] **Step 4:** Append to `DESIGN.md` a section "One rule per figure (15 Nov 2026)": the four rules in one line each, where they live, the shared cases, the guard and its exemptions.
- [ ] **Step 5:** Both suites.

### Task 7: Before and after, and the copy server

**Files:** Create `server/app/pulse_measures_report.py` (read-only script).

- [ ] **Step 1:** `python -m app.pulse_measures_report <database>` prints, per project: posts per local day for the last 14 days, total interactions and how many posts report them, number of accounts per platform, the three tone percentages with the analysed and unanalysed counts; and per platform the number of names seen both with and without an id (must be 0 for YouTube, Instagram and TikTok). A test runs it on a small fixture database.
- [ ] **Step 2:** Run it on a copy of the live database (`python3 demo-output/tools/make_demo_db.py server/pulse-prototype.db <scratch>/copy.db <scratch>/session.txt`) and save the output. The same figures under the old rules come from running the script's `--old` mode, which carries the old rules inside the script only (old day = UTC date for Monitor's count, old account key = id-or-name, old tone base = all posts), so the table shows both.
- [ ] **Step 3:** Start the API on the copy (`DATABASE_URL=sqlite+aiosqlite:///<scratch>/copy.db PULSE_MONITOR_ENABLED=false`, port 8013) and check in a browser, light and dark, the pages whose numbers moved: Ikhtisar, Sentimen, Akun & sumber, Posting, Jaringan, Laporan, Monitor, Beranda. Compare three figures per page with the script's output. Stop the server and delete the copy.
- [ ] **Step 4:** Report the table and the list of `open:` call sites to the owner. The live API is restarted only after the owner has seen the table.
