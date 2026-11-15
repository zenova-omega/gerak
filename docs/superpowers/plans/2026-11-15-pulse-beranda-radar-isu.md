# PULSE Beranda and Issue Radar (stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first page at `/pulse` that shows the issues loud in Indonesia from free signals, on a province map and in a ranked list, one step from a new project, with the active projects below.

**Architecture:** A background job on the PULSE server collects public signals (news, trending searches for the country and 34 provinces, popular videos), one hosted-AI call groups them into issues, the server attaches figures, provinces and evidence from the signals themselves, ranks and stores the run. The page reads the latest stored run and filters it in the browser; nothing a viewer does starts a collection.

**Tech Stack:** FastAPI, SQLAlchemy async, SQLite, APScheduler, httpx, feedparser; React 19, Vite, plain CSS on `--ps-*` tokens, shadcn components in `src/components/ui/shadcn`, lucide-react, node:test.

**Spec:** `docs/superpowers/specs/2026-11-15-pulse-beranda-radar-isu-design.md`. This plan covers the spec's build stage 1. X discovery, paid measurement (stage 2) and the 7-day window and sparkline (stage 3) get their own plans.

## Global Constraints

- No commit and no push: the owner commits on request. Where a task would end with a commit, it ends with the test run instead.
- Tests never reach the network, the real model or the data supplier. Collectors take an injected `httpx` client or transport; the AI is a fake with `generate_text`.
- No model, method, AI-company or supplier name in any payload, UI string or shipped JavaScript. Public content (titles, headlines, evidence) is never rewritten.
- No database session is held across a network or AI call.
- Viewing, filtering, choosing a province or opening an issue never starts a collection. Only the scheduled job and `POST /radar/refresh` do.
- The radar switch is `WorkerPolicy(provider='radar')`; `daily_limit=0` means off and is the default.
- UI copy is Indonesian, sentence case, no em dashes. Categories: Politik, Hukum, Ekonomi, Bencana, Sosial, Teknologi, Olahraga, Hiburan, Dunia, Lainnya. Platforms in stage 1: Berita, YouTube, Google.
- Colours and sizes come from `--ps-*` tokens only; both themes; no side stripes, gradients or hero numbers.
- `src/pulse/indonesia-provinces.json`, `src/lib/pulsePlaces.js`, `src/lib/pulseRegionMap.js` and `src/pulse/RegionSpreadMap.jsx` belong to another session: import from them, never edit them.
- The owner works on the live page: verify on the copy server (port 8011); `PulseApp.jsx` and `pageMeta.js` are edited once, late; the live API is restarted once, at the end.
- Test commands: server `cd server && ../.venv/bin/python -m pytest tests -q -k pulse -p no:warnings`; frontend `node --test src/pulse/*.test.mjs src/pulse/*.test.js src/lib/pulse*.test.js src/lib/*.test.mjs`.

## Review Focus

1. A province feed answers with an error page, an empty feed or fewer than ten rows: that province is recorded as unread or short, the run goes on, and the map shows "tidak terbaca", not "tidak ada isu". (Task 1, Task 3, Task 7)
2. The AI answers with text around the JSON, a code fence, a truncated object or nothing: no issue is invented, the run is stored as raw, and the last composed run stays on the page. (Task 2, Task 4)
3. One story searched under different spellings in different provinces ("jepang vs brasil", "japan vs brazil"): the issue's provinces are the union of the provinces of all its terms, each with its largest figure. (Task 3)
4. A manual refresh while the scheduled one is running, or two processes ticking at once: one run only; the second caller is told a refresh is in progress. (Task 3, Task 4)
5. A headline with markup, a very long title, or a link that is not http(s): shown as plain text, cut at 120 characters with an ellipsis, link dropped. (Task 1, Task 8)

---

### Task 1: Signals

**Files:**
- Create: `server/app/services/pulse_radar_signals.py`
- Test: `server/tests/test_pulse_radar_signals.py`

**Interfaces:**
- Produces:
  - `PROVINCES: tuple[str, ...]`, the 34 codes of `src/pulse/indonesia-provinces.json` (`'ID-AC'` ... `'ID-YO'`).
  - `NEWS_SECTIONS = ('NATION', 'BUSINESS', 'TECHNOLOGY', 'ENTERTAINMENT', 'SPORTS', 'SCIENCE', 'HEALTH', 'WORLD')`, `YOUTUBE_CATEGORIES = (None, '25', '24', '22', '17', '28')`.
  - `parse_trending(xml: str) -> list[dict]`: `{'term', 'searches': int, 'news': [{'title', 'url', 'source'}]}`; `'1000+'` reads as `1000`.
  - `parse_news(xml: str) -> list[dict]`: `{'title', 'url', 'source', 'published_at', 'related': [{'title', 'url', 'source'}]}`.
  - `async def collect(settings, *, client: httpx.AsyncClient | None = None, pause: float = 0.3) -> dict`: `{'signals': [signal], 'missing': [str], 'provinces_read': [str]}`.
  - A signal: `{'id': 'S1', 'platform': 'news' | 'search' | 'youtube', 'title': str, 'url': str | None, 'source': str | None, 'figure': int | None, 'provinces': {code: searches}, 'related': [{'title', 'url', 'source'}], 'section': str | None}`. `figure` is related-article count for news, views for a video, national searches for a term. A search term is one signal however many lists carry it (merged on the lower-cased, space-collapsed term).
  - `missing` holds `'news'`, `'youtube'`, `'search'` (the country list) or a province code.

- [ ] **Step 1: Write the failing tests**

```python
def test_a_trending_feed_gives_terms_their_searches_and_news(): ...
    # fixture with two items: 'polda jawa timur' 200+, 'bahan bakar' 1,000+ (as "1000+")
    assert [(r['term'], r['searches']) for r in rows] == [('polda jawa timur', 200), ('bahan bakar', 1000)]
    assert rows[0]['news'][0] == {'title': 'Judul berita', 'url': 'https://contoh.id/a', 'source': 'Contoh'}

def test_a_feed_that_is_not_a_feed_gives_nothing(): ...
    assert parse_trending('<html>blocked</html>') == [] and parse_news('') == []

@pytest.mark.asyncio
async def test_one_term_on_several_province_lists_is_one_signal_with_each_provinces_figure(): ...
    # country: bahan bakar 1000; ID-JK: bahan bakar 200; ID-JI: bahan bakar 200, polda jawa timur 200
    assert term['provinces'] == {'ID-JK': 200, 'ID-JI': 200} and term['figure'] == 1000
    assert local['provinces'] == {'ID-JI': 200} and local['figure'] is None

@pytest.mark.asyncio
async def test_a_province_that_fails_is_named_and_the_rest_is_kept(): ...
    # ID-PA answers 503, YouTube answers 403
    assert 'ID-PA' in result['missing'] and 'youtube' in result['missing']
    assert 'ID-PA' not in result['provinces_read'] and len(result['provinces_read']) == 33

@pytest.mark.asyncio
async def test_titles_are_plain_text_and_links_are_http_only(): ...
    # a title '<b>Judul</b> ' + 'x' * 200 and a link 'javascript:alert(1)'
    assert signal['title'].startswith('Judul') and len(signal['title']) <= 120 and signal['title'].endswith('…')
    assert signal['url'] is None

@pytest.mark.asyncio
async def test_videos_carry_views_and_the_key_stays_in_a_header(): ...
    assert request.headers['x-goog-api-key'] == 'fake-key' and 'key' not in request.url.params
```

- [ ] **Step 2: Run** `cd server && ../.venv/bin/python -m pytest tests/test_pulse_radar_signals.py -q -p no:warnings`. Expected: fails on import.
- [ ] **Step 3: Implement the module.** Feeds: `https://trends.google.com/trending/rss?geo=<ID|code>`, `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`, `https://news.google.com/rss/headlines/section/topic/<SECTION>?hl=id&gl=ID&ceid=ID:id` (follow redirects), `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=ID&maxResults=20[&videoCategoryId=..]`. Parse with `feedparser` as `ingest/rss.py` does; related articles of a news entry are the links in its summary. `pause` seconds between province requests. Timeout 20 s a request; any failure of one source adds it to `missing`.
- [ ] **Step 4: Run the tests.** Expected: pass.

### Task 2: Compose

**Files:**
- Create: `server/app/services/pulse_radar_compose.py`
- Test: `server/tests/test_pulse_radar_compose.py`

**Interfaces:**
- Consumes: signals from Task 1.
- Produces:
  - `CATEGORIES = ('politik', 'hukum', 'ekonomi', 'bencana', 'sosial', 'teknologi', 'olahraga', 'hiburan', 'dunia', 'lainnya')`.
  - `build_prompt(signals: list[dict], previous: list[dict]) -> str` and `SYSTEM: str`. `previous` is `[{'key', 'title'}]` from the last composed run.
  - `parse_answer(text: str, signals: list[dict], previous: list[dict]) -> dict | None`: `{'brief': str | None, 'issues': [{'key', 'scope': 'national' | 'local', 'title', 'category', 'reason', 'signal_ids': [str], 'query': {'q': str, 'required': str, 'excluded': str}}]}`, or `None` when no JSON object can be read.
  - `async def compose(ai, signals, previous, *, timeout: float = 120) -> dict | None`: calls `ai.generate_text(prompt, system=SYSTEM, max_tokens=6000)`; `None` on timeout, error or unreadable answer.

- [ ] **Step 1: Write the failing tests**

```python
def test_an_issue_keeps_only_signals_that_exist_and_is_dropped_without_any(): ...
    # issue A cites S1 and S99; issue B cites S98 only
    assert [i['title'] for i in out['issues']] == ['A'] and out['issues'][0]['signal_ids'] == ['S1']

def test_an_unknown_category_becomes_lainnya_and_text_is_cut(): ...
    assert issue['category'] == 'lainnya' and len(issue['title']) <= 120 and len(issue['reason']) <= 300

def test_the_same_story_keeps_its_key_and_a_new_story_gets_a_new_one(): ...
    # previous: {'key': 'k-gibran', 'title': 'Pengunduran diri Wapres Gibran'}; the answer repeats that key for it
    assert by_title['Pengunduran diri Wapres Gibran']['key'] == 'k-gibran'
    assert by_title['Perampokan di Malang']['key'] not in ('', 'k-gibran')
    # an answer that invents a key that was never issued gets a server key instead
    assert by_title['Timnas']['key'] != 'k-made-up'

def test_an_issue_only_on_province_lists_is_local(): ...
    # its only signal is a search term with figure None and provinces {'ID-JI': 200}
    assert issue['scope'] == 'local'

def test_an_issue_about_an_ai_company_passes_unaltered_and_one_about_the_assistant_itself_is_dropped(): ...
    assert 'Grok diblokir di Indonesia' in titles
    assert not any('sebagai model bahasa' in i['reason'].lower() for i in out['issues'])

@pytest.mark.parametrize('text', ['', 'Maaf, tidak bisa.', '{"issues": [', '```json\n{"issues": []}\n```'])
def test_an_answer_that_is_not_the_object_asked_for(text): ...
    # the first three give None; the fenced one gives {'brief': None, 'issues': []}

@pytest.mark.asyncio
async def test_a_model_that_raises_or_hangs_gives_none(): ...
```

- [ ] **Step 2: Run** `pytest tests/test_pulse_radar_compose.py`. Expected: fails on import.
- [ ] **Step 3: Implement.** The prompt lists every signal as `S<n> | platform | title | figure | provinces`, then the previous issues as `key | title`, and asks for one JSON object in Indonesian: neutral titles of at most 70 characters, one sentence of reason, a category from the list, the signal ids, and a keyword proposal (`q` comma-separated main terms, `required`, `excluded`). The system text forbids speaking about the assistant. A key not found in `previous` is replaced by `'r-' + uuid4().hex[:10]`; when the answer gives no key, a previous issue whose keyword set overlaps by half or more lends its key. `scope` is local when none of the issue's signals is news, a video or a term on the country list.
- [ ] **Step 4: Run the tests.** Expected: pass.

### Task 3: A run, stored

**Files:**
- Create: `server/app/models/pulse_radar.py`, `server/app/services/pulse_radar.py`
- Modify: `server/app/models/__init__.py` (import `RadarRun, RadarIssue` beside `PulseChatConversation`)
- Test: `server/tests/test_pulse_radar_run.py`

**Interfaces:**
- Consumes: `collect` (Task 1), `compose`, `CATEGORIES` (Task 2), `WorkerPolicy`, `insert_once` (`services/pulse_monitor.py`), `get_ai_service` and `_hosted_ready` (`services/ai`).
- Produces:
  - `RadarRun` (`pulse_radar_runs`): `id`, `started_at`, `finished_at`, `state` (`'running' | 'ok' | 'partial' | 'raw' | 'failed'`), `missing` JSON, `provinces_read` JSON, `brief` Text, `raw` JSON (`{'news': [...], 'search': [...], 'youtube': [...]}`, at most 20 signals each, for the fallback), `usage` JSON.
  - `RadarIssue` (`pulse_radar_issues`): `id`, `run_id` (indexed), `key` (indexed), `scope`, `rank`, `title`, `category`, `reason`, `score`, `platforms` JSON (`{'news': {'count': int}, 'youtube': {'count': int, 'views': int}, 'search': {'searches': int}}`, only platforms present), `regions` JSON (`[{'code', 'searches'}]`), `evidence` JSON (`[{'platform', 'title', 'url', 'source', 'figure'}]`, at most 5 a platform), `query` JSON, `first_seen_at`.
  - `PROVIDER = 'radar'`, `INTERVAL_MINUTES = 30`, `KEEP_DAYS = 30`.
  - `attach(issue: dict, signals: dict[str, dict]) -> dict` (adds `platforms`, `regions`, `evidence`), `rank(issues: list[dict]) -> list[dict]` (adds `score`, `rank`; national issues ranked 1..n, local issues ranked after them).
  - `async def ensure_policy(db) -> None`, `async def refresh(session_factory, settings=None, *, ai=None, client=None, now=None, force: bool = False) -> dict` returning `{'state': <run state> | 'busy' | 'off', 'run_id': str | None}`; `force=True` runs with the switch off (manual refresh and the check script).
  - In `attach`, a news signal counts as one article plus its related ones.
  - `async def radar_tick() -> None`: runs `refresh` when the switch is on and the last run started `INTERVAL_MINUTES` or more ago.

- [ ] **Step 1: Write the failing tests**

```python
def test_figures_provinces_and_evidence_come_from_the_signals(): ...
    # issue cites a news signal (related 4), a video (views 2_104_721) and two terms:
    # 'jepang vs brasil' {'ID-BA': 5000, 'ID-PA': 2000} and 'japan vs brazil' {'ID-BA': 500, 'ID-SU': 200}
    assert issue['platforms'] == {'news': {'count': 5}, 'youtube': {'count': 1, 'views': 2104721}, 'search': {'searches': 5000}}
    assert sorted((r['code'], r['searches']) for r in issue['regions']) == [('ID-BA', 5000), ('ID-PA', 2000), ('ID-SU', 200)]
    assert [e['platform'] for e in issue['evidence']].count('news') <= 5

def test_an_issue_on_more_platforms_ranks_above_a_louder_one_on_a_single_platform(): ...
def test_local_issues_never_enter_the_national_order(): ...

@pytest.mark.asyncio
async def test_a_refresh_stores_one_run_with_its_issues_and_holds_no_session_while_it_fetches(): ...
    # fakes for collect and compose assert that no session from the factory is open when they are called
    assert result['state'] == 'ok' and stored_titles == ['Isu A', 'Isu B']

@pytest.mark.asyncio
async def test_missing_sources_make_the_run_partial_and_an_unreadable_answer_makes_it_raw(): ...
    assert run.state == 'partial' and run.missing == ['ID-PA']
    assert raw_run.state == 'raw' and raw_run.raw['search'] and issues_of(raw_run) == []

@pytest.mark.asyncio
async def test_without_the_hosted_engine_the_run_is_raw_and_the_model_is_not_called(): ...
    # settings.AI_PROVIDER == 'ollama'

@pytest.mark.asyncio
async def test_a_second_refresh_during_the_first_is_told_busy_and_writes_nothing(): ...
@pytest.mark.asyncio
async def test_the_tick_does_nothing_while_the_switch_is_off_or_the_last_run_is_recent(): ...
@pytest.mark.asyncio
async def test_first_seen_is_carried_by_key_and_runs_older_than_thirty_days_are_removed(): ...
```

- [ ] **Step 2: Run** `pytest tests/test_pulse_radar_run.py`. Expected: fails on import.
- [ ] **Step 3: Implement.** Score: for each platform an issue appears on, `1 - position / count` among the issues on that platform (ordered by that platform's figure), summed, plus `0.5` for every platform beyond the first. The lease is the `WorkerPolicy` row's `lease_until` and `lease_token`, taken with one conditional `UPDATE` for 600 s and released at the end, as `claim_job` does; `force` skips the `daily_limit` condition but not the lease. `refresh` opens a session to take the lease and read the previous issues, closes it, collects and composes, then opens another to write. The route's commit is the only commit in tests: follow `test_pulse_chat_history.py` and make `commit` a no-op there.
- [ ] **Step 4: Run the tests.** Expected: pass.

### Task 4: Reading the radar

**Files:**
- Create: `server/app/routers/pulse_radar.py`
- Modify: `server/app/services/pulse_radar.py` (reader functions), `server/app/pulse_main.py` (include the router at `/api/admin/pulse`), `server/app/services/scheduler.py` (job `pulse_radar`, every 60 s, `max_instances=1`, `coalesce=True`)
- Test: `server/tests/test_pulse_radar_routes.py`

**Interfaces:**
- Consumes: Task 3 models and `refresh`; `matches_query` (`services/ingest/query_match.py`); `require_pulse_access` (`services/pulse_identity.py`: any signed-in role may GET, owner and admin may POST).
- Produces:
  - `async def latest(db, now) -> dict`:
    `{'state': 'ok' | 'partial' | 'stale' | 'raw' | 'empty', 'updated_at', 'interval_minutes': 30, 'running': bool, 'missing': [str], 'provinces_read': [str], 'brief': str | None, 'issues': [issue], 'raw': {...} | None}`.
    An issue: `{'key', 'scope', 'rank', 'title', 'category', 'reason', 'platforms', 'regions', 'evidence_titles': [str], 'query', 'movement': {'kind': 'new' | 'up' | 'down', 'places': int} | None, 'project': {'id', 'label'} | None}`.
  - `async def issue_detail(db, key) -> dict | None`: the issue of the shown run plus its full `evidence`.
  - Routes: `GET /radar`, `GET /radar/issues/{key}` (404 when unknown), `POST /radar/refresh` (`{'state': ...}`; 409 with `'Pembaruan sedang berjalan.'` when busy).
- State rules: the shown run is the newest composed run (`ok` or `partial`). `stale` when it started more than 60 minutes ago. `raw` when no composed run started within 6 hours and a raw run exists; then `issues` is empty and `raw` carries that run's lists. `empty` when no run exists.
- Movement: against the composed run that started nearest to three hours before the shown one and at least 90 minutes before it; `up` or `down` from two places; `new` when `first_seen_at` is less than six hours before the shown run; national issues only.
- Coverage: the first project whose `query` matches the issue's title or any main term of its keyword proposal.
- The switch in Monitor: `PUT /monitor/workers/radar` in `server/app/routers/pulse_monitor.py` accepts `radar` (it calls `ensure_policy`), so the worker list returns the row; `src/lib/pulseMonitor.js` gets `{ channel: 'radar', label: 'Radar isu Indonesia', paid: true }` beside `profiles_x`. On is `daily_limit = -1` (`UNLIMITED`), off is `0`.

- [ ] **Step 1: Write the failing tests** (HTTP through the `client` fixture with `Authorization: Bearer <admin_token>`; rows written directly)

```python
async def test_the_latest_composed_run_is_returned_with_everything_the_page_filters_on(): ...
async def test_a_failed_compose_keeps_the_last_composed_run_and_marks_it_stale_after_an_hour(): ...
async def test_after_six_hours_without_a_composed_run_the_raw_lists_are_returned(): ...
async def test_no_run_at_all_is_empty_not_an_error(): ...
async def test_movement_compares_with_three_hours_earlier_and_needs_two_places(): ...
    # 5 -> 1 is {'kind': 'up', 'places': 4}; 3 -> 4 is None; first seen 2 h ago is {'kind': 'new', 'places': 0}
async def test_an_issue_a_project_covers_names_that_project(): ...
async def test_nothing_about_the_engine_or_the_supplier_leaves_and_public_titles_are_untouched(): ...
    # keys named model, method, usage, raw_answer are absent at any depth; the title 'Grok diblokir di Indonesia' is intact
async def test_reading_never_starts_a_refresh_and_a_viewer_cannot_start_one(): ...
async def test_a_refresh_in_progress_answers_409(): ...
async def test_the_radar_switch_is_listed_in_monitor_and_can_be_turned_on_and_off(): ...
    # PUT /api/admin/pulse/monitor/workers/radar {'daily_limit': -1} -> 200; the state lists provider 'radar', unlimited True
```

- [ ] **Step 2: Run** `pytest tests/test_pulse_radar_routes.py`. Expected: fails (404).
- [ ] **Step 3: Implement** the reader functions, the router and the scheduler job. `POST /radar/refresh` calls `refresh(..., force=True)` in a background task and answers at once with `{'state': 'started'}`, or 409 when the lease is held.
- [ ] **Step 4: Run the tests, then the whole server suite.** Expected: all pass.

### Task 5: Project rows

**Files:**
- Create: `server/app/services/pulse_home.py`
- Modify: `server/app/routers/pulse_radar.py` (`GET /home/projects`)
- Test: `server/tests/test_pulse_home_projects.py`

**Interfaces:**
- Produces: `async def project_rows(db, now) -> list[dict]`, each `{'id', 'label', 'collecting': bool, 'posts_total', 'posts_24h', 'posts_prev_24h', 'alerts_unread', 'last_collected_at', 'newest_post_at'}`, collecting projects first, then by `posts_24h` descending. `collecting` is at least one enabled `MonitorSchedule`. Posts are counted on `published_at`; an unread alert has `acknowledged_at IS NULL`; `last_collected_at` is the newest `last_success_at` of the project's schedules.

- [ ] **Step 1: Write the failing tests**

```python
async def test_a_row_counts_the_last_day_against_the_day_before_and_unread_alerts(): ...
    # 3 posts in the last 24 h, 2 in the 24 h before, 1 older, 1 undated; 2 alerts, 1 acknowledged
    assert row == {**row, 'posts_total': 7, 'posts_24h': 3, 'posts_prev_24h': 2, 'alerts_unread': 1, 'collecting': True}
async def test_a_project_with_every_schedule_off_is_not_collecting_and_sorts_last(): ...
async def test_no_project_gives_an_empty_list(): ...
```

- [ ] **Step 2: Run.** Expected: fails. **Step 3: Implement** with grouped queries (no query per project). **Step 4: Run.** Expected: pass.

### Task 6: The radar model in the browser

**Files:**
- Create: `src/lib/pulseRadar.js`
- Test: `src/lib/pulseRadar.test.mjs`

**Interfaces:**
- Consumes: the `GET /radar` payload (Task 4); `placesIn`, `provinceNames` (`src/lib/pulsePlaces.js`); `placePoint` (`src/lib/pulseRegionMap.js`); `formatCount` (`src/lib/pulseData.js`).
- Produces:
  - `radarCategories`: `[['', 'Semua'], ['politik', 'Politik'], ... ['lainnya', 'Lainnya']]`; `radarPlatforms`: `[['', 'Semua platform'], ['news', 'Berita'], ['youtube', 'YouTube'], ['search', 'Google']]`.
  - `visibleIssues(issues, { category = '', platform = '', province = '' }) -> issue[]`: at most ten. Without a province: national issues in rank order (or by the chosen platform's figure). With a province: national issues loud there in rank order, then local issues loud there.
  - `categoryCounts(issues, province) -> { [id]: number }`.
  - `provinceCounts(issues) -> { [code]: number }` and `shadeOf(count) -> 0 | 1 | 2 | 3` (3 for three or more).
  - `issueFootprint(issue) -> { regions: [{ code, name, searches }], pins: [{ place, code, x, y }] }`; pins come from `evidence_titles` and the title.
  - `figureLine(issue, lead = '') -> string[]`: `['Berita 64 artikel', 'YouTube 2 video tren', 'Google 1.000+ pencarian']`, the lead platform first; plus `'ramai di 5 provinsi'` when there are regions.
  - `movementText(movement) -> string | null`: `'Baru'`, `'Naik 4'`, `'Turun 2'`.
  - `freshnessText(payload, now) -> string`: `'Diperbarui 08.10 WIB, tiap 30 menit'`, with `'; Papua tidak terbaca'` or `'; 3 provinsi tidak terbaca'` when lists are missing, and `'; YouTube tidak terbaca'` likewise.
  - `searchHref(issue) -> string`: `/pulse/search?` with `q`, `required`, `excluded` from `issue.query`, empty ones left out.

- [ ] **Step 1: Write the failing tests**

```javascript
test('the national list is the ten highest, and a category or a platform narrows and reorders it', ...)
test('a province lists the national issues loud there in their order, then the ones loud only there', ...)
test('a province is shaded by how many listed issues are loud in it, three or more sharing the darkest step', ...)
  // assert.deepEqual([0, 1, 2, 3, 9].map(shadeOf), [0, 1, 2, 3, 3])
test('an issue draws its provinces and a pin for each place its headlines name', ...)
  // evidence_titles: ['Perampokan di Malang tewaskan anak'] -> pins[0].code === 'ID-JI'
test('figures carry their unit and the chosen platform leads', ...)
test('movement and freshness are said in words, in WIB, naming what could not be read', ...)
  // updated_at '2026-11-15T01:10:00' -> 'Diperbarui 08.10 WIB, tiap 30 menit'
test('the link to Pencarian cepat carries the proposed keywords and nothing else', ...)
```

- [ ] **Step 2: Run** `node --test src/lib/pulseRadar.test.mjs`. Expected: fails on import. **Step 3: Implement.** **Step 4: Run.** Expected: pass.

### Task 7: The map

**Files:**
- Create: `src/pulse/RadarMap.jsx`, `src/pulse/ds/radar-map.css`
- Test: `src/pulse/radar-map.test.mjs`

**Interfaces:**
- Consumes: `provinceCounts`, `shadeOf`, `issueFootprint` (Task 6); the shapes in `src/pulse/indonesia-provinces.json` (`viewBox`, `provinces[].code|name|d`).
- Produces: `export default function RadarMap({ issues, selectedIssue = null, province = '', provincesRead = null, onProvince })`. `issues` is the list currently shown; `selectedIssue` draws that issue alone; `provincesRead` is the array from the payload (`null` means all read); `onProvince(code)` is called with `''` to go back to the country.

- [ ] **Step 1: Write the failing tests** (server-rendered markup, as `trend-chart.test.mjs` does)

```javascript
test('every province is a labelled control that says how many issues are loud there', ...)
  // 34 elements with role="button"; aria-label="Jawa Timur: 3 isu ramai"; the chosen one has aria-pressed="true"
test('a province whose list was not read says so and is not drawn as zero', ...)
  // aria-label="Papua: daftar tidak terbaca", data-shade="unread"
test('one chosen issue draws only its provinces, shaded by searches, and pins the places it names', ...)
test('the legend, the source line and the table of numbers are always there', ...)
  // 'Peta memakai pencarian populer per provinsi dan tempat yang disebut berita. X, TikTok, dan Instagram tidak memberi lokasi.'
  // <details> 'Lihat angka' with a table: Provinsi, Isu ramai, Isu teratas
test('with a province chosen there is a way back to the whole country', ...)
  // a button 'Seluruh Indonesia'
```

- [ ] **Step 2: Run.** Expected: fails on import.
- [ ] **Step 3: Implement.** One `<svg>` with the file's `viewBox`; provinces are `<path>` with `tabIndex`, `role="button"`, Enter and Space; shade through `data-shade="0|1|2|3|unread"` styled from `--ps-accent` at three strengths (unread is a hatch pattern from `--ps-line`); a tooltip from `src/components/ui/shadcn/tooltip.jsx`. Focus ring is `outline: var(--ps-control-focus)`. No animation beyond a 150 ms fill transition, off under `prefers-reduced-motion`.
- [ ] **Step 4: Run.** Expected: pass.

### Task 8: The issue list and its drawer

**Files:**
- Create: `src/pulse/RadarIssues.jsx`, `src/pulse/RadarIssueDrawer.jsx`, `src/pulse/ds/radar-issues.css`
- Test: `src/pulse/radar-issues.test.mjs`

**Interfaces:**
- Consumes: Task 6 functions; `EvidenceDrawer({ open, onClose, title, description, children })`; `PulseButton`, `PulseTag`, `PlatformTag`, `PulseSkeleton`, `PulseNotice`; `api.get('/admin/pulse/radar/issues/' + key)`.
- Produces:
  - `export default function RadarIssues({ payload, filters, onFilters, selectedKey, onSelect, canCreate, onRefresh, now })`. `filters` is `{ category, platform, province }`; `onSelect(key)` opens the drawer and draws the issue on the map.
  - `export default function RadarIssueDrawer({ issueKey, summary, canCreate, onClose })`: `summary` is the list's issue object, shown at once while the evidence loads.

- [ ] **Step 1: Write the failing tests**

```javascript
test('ten ordered rows, each with rank, title, category, movement, reason, figures and one action', ...)
test('an issue a project covers says so and opens that project; the others offer Pantau', ...)
  // href="/pulse/overview?topic=t1" with 'Buka project' and a tag 'Sudah dipantau'; else href starts '/pulse/search?q='
test('a viewer who cannot create projects gets no Pantau', ...)
test('the switches are the shared segmented control and show how many issues each category holds', ...)
  // role="group" aria-label="Kategori isu" and "Platform"; class pu-segmented; 'Politik 9'
test('with a province chosen the heading names it and local issues are marked', ...)
  // 'Isu yang ramai di Jawa Timur'; 'hanya ramai di provinsi ini'
test('each state has its own words', ...)
  // empty: 'Radar belum pernah berjalan'; stale: 'Data terakhir'; raw: 'Daftar mentah per platform'; no match: 'Belum ada isu Bencana pada pembaruan ini' with 'Tampilkan semua'
test('a title is text: markup in it is not rendered', ...)
```

- [ ] **Step 2: Run.** Expected: fails on import.
- [ ] **Step 3: Implement.** An `<ol>`; a row is an `<li>` whose title is a button that calls `onSelect`. Figures from `figureLine`. The brief sits under the freshness line. "Perbarui sekarang" appears for `canCreate` only and is busy while `payload.running`. The drawer shows the reason, evidence grouped by platform (title as link out, source, figure), the keyword proposal as `KeywordTag` chips, and the row's action.
- [ ] **Step 4: Run.** Expected: pass.

### Task 9: Beranda, projects, routing

**Files:**
- Create: `src/pulse/Home.jsx`, `src/pulse/HomeProjects.jsx`, `src/pulse/ds/home.css`
- Modify: `src/pulse/pageMeta.js` (entry `home`: title `Beranda`, icon `House`, tagline `Isu ramai dan project aktif`, guide; not in `pageOrder`), `src/pulse/PulseApp.jsx`
- Test: `src/pulse/home.test.mjs`; update the tests that expect `/pulse` to be Ikhtisar (find with `grep -rn "'/pulse'" src --include='*.test.*'`)

**Interfaces:**
- Consumes: Tasks 6 to 8; `GET /admin/pulse/radar`, `GET /admin/pulse/home/projects`, `POST /admin/pulse/radar/refresh`; `PulsePageHead`.
- Produces:
  - `export default function Home({ user })`: reads both routes once on mount and again every 5 minutes while visible; keeps `cat`, `pf`, `prov`, `issue` in the address with `useSearchParams` and the last `cat`/`pf` in `localStorage` under `pulse-home-filters`.
  - `export default function HomeProjects({ rows, canCreate })`.
  - Routing in `PulseApp.jsx`: `/pulse` renders `Home` unless the address has `topic`, in which case it redirects to `/pulse/overview` with the same query; the sidebar gains "Beranda" above "Pencarian cepat", current on `/pulse`; the Ikhtisar link is current on `/pulse/overview` only; `ProjectBar` and the page title follow (`Beranda · PULSE`).

- [ ] **Step 1: Write the failing tests**

```javascript
test('a project row shows its totals, the last day against the day before in words, and unread alerts', ...)
  // '412 posting dalam 24 jam, naik 18%'; 'turun 22%'; 'sama dengan kemarin'; '3 alert baru'; href="/pulse/overview?topic=t1"
test('paused projects sit under their own disclosure and an empty installation offers the first project', ...)
  // <details> 'Dijeda (1)'; 'Belum ada project' with 'Buat project' -> /pulse/search
test('the page puts the map, the list and the projects in that order under one heading', ...)
test('/pulse is Beranda, an old link with a project goes to Ikhtisar, and the sidebar marks the right page', ...)
```

- [ ] **Step 2: Run.** Expected: fails.
- [ ] **Step 3: Implement.** Layout in `home.css`: a container query on the page; from 1180px the map takes seven of twelve columns beside the list, projects span below; under it they stack with a jump link "Project aktif". Skeleton while loading (`PulseSkeleton`). A failed request shows the product's connection sentence and "Coba lagi". The percentage is `round((a - b) / b * 100)`; with `b = 0` the text is `'baru ada hari ini'`.
- [ ] **Step 4: Run the whole frontend suite and `npx eslint src/pulse src/lib`.** Expected: all pass.

### Task 10: One real round, documents, switch-on

**Files:**
- Create: `server/app/pulse_radar_check.py`, `docs/operations/pulse-radar.md`
- Modify: `DESIGN.md` (section "Beranda and the issue radar (15 Nov 2026)": the map's three shades and unread hatch, one list with a scope, where the numbers come from, the states), `docs/operations/pulse-monitoring.md` (one paragraph pointing at the new document)
- Test: `server/tests/test_pulse_radar_check.py`

**Interfaces:**
- Produces: `python -m app.pulse_radar_check [--save]`: one real collection and compose; prints signals per platform, provinces read, issues, tokens and cost from `ai.hosted.usage()` before and after, and seconds taken; writes nothing without `--save`.

- [ ] **Step 1: Write the failing test** (`test_the_check_prints_counts_and_cost_and_writes_nothing_by_default`, with fakes for `collect` and the AI). **Step 2: Run.** Expected: fails. **Step 3: Implement.** **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Run it for real once** (`cd server && ../.venv/bin/python -m app.pulse_radar_check`). Record in `docs/operations/pulse-radar.md`: how many of the 34 province lists answered, which codes do not exist, tokens and USD for one compose, seconds. Report the figures to the owner.
- [ ] **Step 6: Verify on the copy server.** `python3 demo-output/tools/make_demo_db.py`, API on 8011 with `PULSE_MONITOR_ENABLED=false`, `--save` one round into the copy, then drive the page with `look.mjs`: `/pulse` at 1440, 1024 and 390 wide, light and dark; choose a province; choose an issue; open the drawer; follow "Pantau" to Pencarian cepat and check the keywords are filled and nothing was collected; the privacy sweep (`sweep.py`) over the new routes. Stop 8011 and delete the copy afterwards.
- [ ] **Step 7: Switch on.** Restart the live API once (new tables, the job). The switch is turned on in Monitor ("Radar isu Indonesia") only after the owner has seen the measured cost. Watch the first two scheduled runs in the log.
