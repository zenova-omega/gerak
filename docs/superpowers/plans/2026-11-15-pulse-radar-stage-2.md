# PULSE Issue Radar, stage 2: X discovery and social figures. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The radar also finds issues that are loud on X, and says how loud each of the ten highest issues is on X, TikTok and Instagram, with sample posts as evidence.

**Architecture:** One hosted-AI call with live X search adds X signals to the lists stage 1 already reads. After the issues are ranked, the ten highest are measured on the social supplier: a count on X, and sample posts from X, TikTok and Instagram. Both steps sit behind their own switch, off by default; with it off a refresh is exactly stage 1.

**Tech Stack:** as stage 1 (FastAPI, SQLAlchemy async, SQLite, httpx; React 19, plain CSS tokens, node:test).

**Spec:** `docs/superpowers/specs/2026-11-15-pulse-beranda-radar-isu-design.md` (build stage 2). Stage 1 plan and ledger: `docs/superpowers/plans/2026-11-15-pulse-beranda-radar-isu.md`, `.superpowers/sdd/2026-11-15-pulse-beranda-radar-isu/progress.md`.

## Measured on 15 Nov 2026 (the values this plan is built on)

- Live X search through the hosted AI (`tools: [{"type": "x_search", "from_date", "to_date"}]`, `store: false` accepted): 71.8 s, 18 searches, 59 posts fetched, 103,755 tokens in (81,536 cached), 2,074 out, **USD 0.39** a call. It returned 7 issues with 2 to 3 post links each (`https://x.com/<name>/status/<id>`). The service answered "at capacity" (429) twice before that.
- Supplier, credits read before and after (other lanes were collecting, so a figure can include a few credits of theirs): `countTweets` about **2** credits and 1 s (returns one integer; the day is a UTC date); X keyword search, 20 rows, about **7** credits and 4 s; TikTok, 20 rows, about **5** and 5 s; Instagram, 20 rows, about **17** and 7 s.
- A day at 48 refreshes: discovery hourly 24 × 0.39 = about USD 9.40; counts 48 × 10 × 2 = 960 credits; samples every 3 hours 8 × 10 × 29 = 2,320 credits. About 3,300 credits a day (the plan read on 15 Nov: 225,000 a month).

## Global Constraints

- Everything in stage 1's Global Constraints still holds (no commit unless the owner asks; tests never reach the network, the model or the supplier; no engine or supplier name in payloads, UI or shipped JS; public content unaltered; no database session held across a network or AI call; viewing never collects; Indonesian copy; `--ps-*` tokens; the Jaringan map files are not edited; verify on the copy server; one live restart at the end).
- New switch: `WorkerPolicy(provider='radar_social')`, `daily_limit = 0` (off) by default. Off means no discovery call and no supplier call. Monitor label: "Radar: X, TikTok, Instagram", paid.
- Supplier calls are skipped while the supplier's own lane is blocked (`WorkerPolicy('xpoz').blocked_reason`), and a refused call never fails the refresh: the figure is absent and the run records `x`, `tiktok` or `instagram` in `missing`.
- A sample is never shown as a total: 20 rows found is "20+ ditemukan". A capped sample never orders a list.
- X figures are labelled with what they are: posts since yesterday (UTC date), the only resolution the count has.

## Review Focus

1. The AI's X answer has links that are not posts (profiles, searches, other sites) or no links at all: such an issue is dropped, never shown without evidence.
2. The live search is "at capacity" or times out: the refresh goes on with the X signals of the last discovery if they are under 90 minutes old, else without X; it never fails for this.
3. The supplier refuses mid-measurement (balance, rate limit) after some issues were measured: measured issues keep their figures, the rest have none, the run is partial.
4. An issue leaves the top ten and returns: its samples are reused while under 3 hours old, not bought again.
5. A keyword proposal with quotes, commas inside quotes or boolean words: the count phrase is built safely; an unusable one is not sent.

---

### Task 1: Live X search on the hosted engine

**Files:** Modify `server/app/services/ai/providers/grok.py`; Test `server/tests/test_pulse_hosted_ai.py` (append).

**Interfaces:** Produces `async def search_x(self, prompt, *, from_date: str, to_date: str, system=None, max_tokens=4000, timeout=240) -> str` on `GrokAIService`: same request as `generate_text` plus `tools: [{'type': 'x_search', 'from_date', 'to_date'}]`, `store: False`; records usage through `hosted.record`; raises `hosted.AIUnavailable('busy')` after one retry on 429/5xx (no 60 s pause of the whole hosted lane for a search that was busy); 401/402/403 as `generate_text`.

- [ ] Tests first (stand-in transport): the body carries the tool with both dates and `store` false; the text of the message item is returned; usage with tool cost is recorded; a 429 twice raises `AIUnavailable('busy')` and `hosted.state()` stays `'ok'`.
- [ ] Run (fail), implement, run (pass).

### Task 2: X discovery signals

**Files:** Create `server/app/services/pulse_radar_x.py`; Test `server/tests/test_pulse_radar_x.py`.

**Interfaces:**
- `POST_LINK = re.compile(r'https://(?:x|twitter)\.com/[A-Za-z0-9_]{1,15}/status/\d{5,25}')`
- `parse_discovery(text) -> list[dict]`: `[{ 'title', 'posts': [url, ...] }]`, at most 12; a title is `plain` text; links that are not post links are removed; an issue without a link is dropped; duplicates by title are merged.
- `async def discover(engine, now) -> list[dict] | None`: signals `{'platform': 'x', 'title', 'url': first post, 'source': None, 'figure': None, 'provinces': {}, 'related': [{'title': 'Posting di X', 'url', 'source': None}], 'section': None}`; `None` when the engine has no `search_x`, is unavailable, times out or answers nothing usable. Dates: yesterday and tomorrow (UTC) of `now`.

- [ ] Tests first: Review Focus 1 cases; a fenced JSON answer; `discover` with a fake engine (returns signals, passes dates), with an engine that raises, and with one lacking `search_x`.
- [ ] Run (fail), implement, run (pass).

### Task 3: Social figures for the ten highest

**Files:** Create `server/app/services/pulse_radar_measure.py`; Test `server/tests/test_pulse_radar_measure.py`.

**Interfaces:**
- `SAMPLE_ROWS = 20`, `SAMPLE_HOURS = 3`, `KEEP = 5`.
- `count_phrase(query: dict) -> str | None`: up to three main terms of `q` joined as `"a" OR "b"`, with `required` terms as `AND ("c" OR "d")`; quotes inside a term removed; terms shorter than 3 letters dropped; `None` when nothing usable is left.
- `async def measure(issues, previous, *, key, now, client=None) -> dict`: for each of `issues` (already the ten), returns `{'figures': {key: {'x': {'count': int}, 'tiktok': {'found': int, 'capped': bool}, 'instagram': {...}}}, 'evidence': {key: [items]}, 'sampled_at': {key: iso}, 'missing': [platform]}`. `previous` maps issue key to `{'evidence', 'sampled_at', 'figures'}` of the last run; samples under `SAMPLE_HOURS` old are reused. Evidence item: `{'platform', 'title' (text cut at 160), 'url', 'source' (author), 'figure' (interactions or None)}`, the `KEEP` most engaged per platform.
- Supplier calls go through `xpoz._initialize` / `xpoz._rpc` with tools `countTweets`, `getTwitterPostsByKeywords`, `getTiktokPostsByKeywords`, `getInstagramPostsByKeywords`, and the existing normalisers. A refused call adds its platform to `missing` and stops further calls for that platform in this refresh.

- [ ] Tests first (a fake `_rpc`): Review Focus 3, 4, 5; counts and samples land on the right issue; `capped` at 20 rows; the calls made for ten fresh issues are 10 counts and 30 searches, and for ten issues with fresh samples 10 counts only.
- [ ] Run (fail), implement, run (pass).

### Task 4: The refresh uses both, behind the switch

**Files:** Modify `server/app/services/pulse_radar.py`, `server/app/services/pulse_radar_compose.py`, `server/app/routers/pulse_monitor.py`, `server/app/pulse_radar_check.py`; Tests `server/tests/test_pulse_radar_run.py`, `test_pulse_radar_compose.py`, `test_pulse_radar_routes.py`, `test_pulse_radar_check.py` (append).

**Interfaces:**
- `SOCIAL = 'radar_social'`, `DISCOVERY_MINUTES = 55`, `CARRY_MINUTES = 90`, `PLATFORMS = ('news', 'x', 'youtube', 'search')` for ordering; `tiktok` and `instagram` count as presence only.
- `refresh`: when the social switch is on (or `social=True` is passed), discovery runs if the last stored discovery is `DISCOVERY_MINUTES` old or more, else the stored X signals (`run.raw['x']`, with `run.usage['x_at']`) are carried while under `CARRY_MINUTES`; X signals join the numbered signals before compose; after ranking, the ten highest national issues are measured, their figures and evidence merged, and the list is ranked again. `COLLECT_SECONDS` stays; discovery has its own 240 s; `LEASE_SECONDS` becomes 1,500 and its invariant test includes discovery and 180 s of measurement.
- Compose: `x` signals are listed as `S<n> | x | title | n posting contoh`; an issue built on an X signal is national.
- `attach`: `platforms['x'] = {'count'}` when measured, else `{'posts': n}` from discovery links; evidence gets the X links when there are no samples yet.
- Reader: unchanged shape; `signals` may carry `x`. Monitor accepts `radar_social`.
- Check script: `--social` runs discovery and measurement too and prints credits spent (balance before and after) and the discovery's cost.

- [ ] Tests first: switch off means neither step is called; discovery cadence and carry (Review Focus 2); measured figures change the order; `missing` from measurement makes the run partial; the lock invariant; privacy sweep still clean with X evidence.
- [ ] Run (fail), implement, run (pass); whole server suite from a private folder.

### Task 5: The page

**Files:** Modify `src/lib/pulseRadar.js`, `src/pulse/RadarIssues.jsx`, `src/pulse/RadarIssueDrawer.jsx`, `src/pulse/RadarFigures.jsx`, `src/pulse/ds/radar-issues.css`, `src/lib/pulseMonitor.js`; Tests `src/lib/pulseRadar.test.mjs`, `src/pulse/radar-issues.test.mjs`, `src/pulse/home.test.mjs`.

**Interfaces:**
- `radarPlatforms`: Semua platform, Berita, X, TikTok, Instagram, YouTube, Google. A platform with no issue in the refresh on screen is not offered.
- `platformFigure`: `x` is the count; `tiktok` and `instagram` have none (a sample never orders): their filter keeps the combined order.
- `platformMeters`: bars for Berita, X, YouTube, Google; TikTok and Instagram are a mark and "20+ ditemukan" / "12 ditemukan" without a bar. Six fixed cells in two rows of three.
- Texts: `X 625 posting sejak kemarin`; without a count `X 3 posting contoh`.
- Drawer: sections X, TikTok, Instagram with author, text and interactions per post.
- Monitor: `{ channel: 'radar_social', label: 'Radar: X, TikTok, Instagram', paid: true }`.

- [ ] Tests first for each bullet; run (fail), implement, run (pass); whole frontend suite and lint.

### Task 6: Measure, document, verify, switch

- [ ] One real round by hand with `--social` (stores nothing): record credits, USD, seconds in `docs/operations/pulse-radar.md` (new section "Stage 2") and DESIGN.md (meters and the social platforms).
- [ ] Copy server: `--save --social` into the copy, then the page at 1440 and 390, light and dark: X meters, TikTok and Instagram marks, drawer evidence, platform filter. Privacy sweep.
- [ ] Restart the live API once. Leave `radar_social` off; report the daily cost to the owner, who turns it on in Monitor.
