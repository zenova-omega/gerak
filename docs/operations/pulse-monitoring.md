# PULSE monitoring operations

## Runtime

The API starts a 30-second APScheduler tick when `PULSE_MONITOR_ENABLED=true` (default). New schedules are disabled. Legacy WatchTopic `is_active` does not authorize recurring collection anymore; manage schedules under Monitoring room.

Three logical provider lanes use the existing bounded adapters: RSS (up to 100 returned items), Xpoz (one bounded REST or stored-MCP query, up to 100), YouTube (one search + at most one videos batch, up to 50). Dispatch is sequential locally; database provider leases prevent a second process from running the same provider concurrently. Network timeout is 120 seconds, lease 180 seconds. A slow lane can delay other lanes; this is not subsecond streaming.

`pulse_crawl_jobs` is durable. Queue claims and daily budget reservations are committed before external calls. Retries only for timeouts/5xx, maximum three attempts, 60/120-second backoff. All attempts reserve budget, including failed/ambiguous requests. Expired running jobs become `interrupted`, never automatically replayed for free. The next scheduled run is separate. Auth/plan/quota/429/pending failures block the provider until an admin resolves and explicitly clears it. No automatic plan upgrade, REST fallback or MCP polling.

## Budget semantics

Limits are GLOBAL per provider across all scheduled topics and count collection attempts per UTC day, not money, vendor credits, or raw HTTP requests. Midnight UTC is 07:00 WIB. Stored MCP has handshake requests in addition to its tool query. Provider project quota/billing remains authoritative; external uses of the same key are not counted here. Manual crawl and explicit comment collection retain their existing confirmation flow and are outside the scheduled-worker counter.

User-approved deployment configuration (2026-11-11): ONLY `pulse-penyadapan-presiden`, Xpoz 4 attempts/day every 360 minutes, YouTube 6/day every 240 minutes, RSS 24/day every 60 minutes. Do not activate GERAK without separate instruction. No plan upgrades authorized.

## Data and alerts

Each actual ingestion appends `pulse_metric_snapshots` with observation time and nullable likes/comments/shares/views. Missing values are not copied from previous observations. Old stored data is not backfilled with invented timestamps. Post cards expose up to 100 recent snapshots (API max 200). The latest metrics on existing cards may retain previously available values for continuity; history is the exact new observation and makes missing values explicit.

First successful scheduled collection is baseline and does not emit activity alerts. Thereafter `recent_cluster_v1` requires new evidence, at least 5 total publications and 3 authors in the same existing simhash issue within the last 30 minutes. Only publication time is used; unknown/future/old publications cannot trigger. A two-hour per-issue cooldown and unique bucket key suppress duplicates. This is a transparent activity threshold, NOT a calibrated viral anomaly, engagement growth detector, semantic narrative clustering or identity/coordination verdict. Sparse or slow topics may never meet it. Future work: comparable-window baselines, metric-delta alerts, source completeness and calibration.

Terminal provider failures create operational alerts without an issue ID. Activity alerts open `/command-center/pulse?topic=<topic>&alert=<id>`, which requests exact topic + issue + publication window analytics. All alert/history/config APIs are admin-only. Acknowledgements persist server-side and are shared team state. Dashboard polls inbox every 30 seconds while open; no OS push/email delivery or notification while the browser is closed has been configured.

## Endpoints

- `GET /api/admin/pulse/monitor?topic_id=...&alert_offset=0`: workers, schedules, 50 latest jobs, topic-filtered alerts paginated 50/page, global unread count.
- `PUT /monitor/workers/{rss|xpoz|youtube}`: `{daily_limit:0..144, clear_block?:boolean}`. `clear_block` is needed only for a refused credential; waits and balance blocks lift by themselves (see the last section).
- `PUT /monitor/topics/{topic}/{provider}`: `{enabled:boolean, interval_minutes:5..1440}`.
- `POST /monitor/alerts/{id}/ack`: idempotent team acknowledgement.
- `GET /monitor/alerts/{id}/analysis`: issue/window-scoped analytics for activity alerts.
- `GET /monitor/items/{id}/snapshots?limit=100`: raw observation history.

Pause cancels queued/retry jobs; already-issued requests may complete. Set provider limit to zero to stop future claims globally. Restarting the API does not reset daily reservations or acknowledged alerts.

## Storage / deployment

Only additive tables are introduced; startup `create_all` creates them without rewriting historical sources. Production uses the same database for schedulers and API. SQLite is appropriate for this local prototype; validate Postgres transaction behavior and load before multi-host deployment. No retention deletion is enabled: plan snapshot/job/alert retention and backups before long-running production use.

## Checks

`cd server && ../.venv/bin/python -m pytest -q --tb=short`

`node --test src/lib/pulseData.test.js src/lib/pulseReplay.test.js`

`npm run build`

Tests use synthetic fixtures and mocked provider boundaries only; never insert simulated alert rows into the real prototype database to demonstrate the inbox.

## Deployment verification — 2026-11-11

Owner explicitly approved 4 Xpoz / 6 YouTube / 24 RSS attempts daily, only Penyadapan Presiden. Activated at 360/240/60-minute intervals. First scheduled cycle: RSS succeeded (100 snapshots, 3 inserts), Xpoz succeeded (100 snapshots, 1 insert), YouTube succeeded (50 snapshots, 4 inserts). First-run activity alerts intentionally suppressed. GERAK has no enabled schedule. Quota persisted at one reserved attempt per provider after completion.

Independent review fixes: source ingestion is serialized with a transaction-scoped topic lock, backed by unique `(topic_id,url)` index (legacy database audited: zero duplicate groups). Ingestion returns exact inserted IDs to alert evaluation; other ingesters cannot leak discoveries into a job. Activity triggers exclude publications before provider baseline. Inbox filters before pagination; mutation-in-flight disables page transitions. Production PostgreSQL race behavior still needs deployment-specific validation; concurrency regression was run with independent SQLite sessions.

## When collection stops, and what starts it again (14 Nov 2026)

A new installation collects without a local daily cap (`DEFAULT_LIMITS` is unlimited for news, X and YouTube; the free photo lookups too). Monitor can still set a cap per lane, or 0 to switch one off. Paid X profile photos stay off until switched on.

Collection stops only when the provider refuses, for as long as the cause lasts (`app/services/pulse_provider_block.py`):

- `rate_limited` and `pending`: a wait of 15 and 5 minutes (`blocked_until`), lifted by the next monitor tick after that time. Earlier these blocked the lane until someone unblocked it by hand.
- `access_or_quota_restricted` and `plan_restricted`: blocked until the balance has grown between two readings, which is the evidence of a top-up. The balance is read every 30 minutes at no credit cost (`account_tick`). A balance that only fell changes nothing, so a plan restriction with credit left stays blocked for a person to look at.
- `authentication_failed` and `not_configured`: blocked until an administrator unblocks the lane in Monitor.

`GET /sources/balance` reports `ok`, `paused`, `empty` or `access` from stored state. The app shows a notice on every page for `empty` and `access`. Nothing is sent outside the app.

Analysis does not depend on any of this. A post or comment that failed three attempts returns to the queue after two hours (`pulse_analysis_retry.py`), so a stopped local model or a restart no longer leaves items unanalysed for good. After a restart, analysis resumes when the previous lease runs out, at most 150 seconds later.

## Profile pictures that expire, and the archive pull (14 Nov 2026, evening)

- **Instagram pictures are kept on this server.** Instagram hands out signed picture links that stop working after a few days (59 of 79 stored links had already died). The free photo lane now downloads the picture while a post's link still works and stores the image itself (`pulse_account_profiles.photo_bytes`, a few KB each). Posts then point to `GET /profiles/photo/instagram/<username>`, so the picture does not expire and the browser no longer asks Instagram for it. A link that fails once is remembered and not asked again; a newer link is.
- **Dead links need the paid lane `profiles_ig`** ("Foto profil akun Instagram" in Monitor, off by default). One lookup costs 12 credits (measured twice), against about 2 an account for X. It is needed once per account whose links had died before the picture was saved, never for accounts collected from now on.
- **The X photo lane `profiles_x` is on without a daily cap** since 14 Nov, at about 2 credits an account, once per account.
- **The archive pull lets go of the database while the provider answers.** `backfill` used to keep its transaction open across every provider call, which locked out the monitor, the photo lane and any request that writes (saving a project failed with "database is locked") for the length of a pull. It now commits before each call and after each window.
- **A pull that finds nothing is not an error by itself.** If the project query requires several "konteks wajib" terms at once, every source can return zero rows for every day: check the query first.

## Complete collection through the provider's paid paging mode (14 Nov 2026, night)

The owner asked for the most complete data for at least the last 7 days, unless a project's own lookback says otherwise, and for paid lookups everywhere without a cap of ours.

- **The archive pull is complete.** `backfill` (saving a project's lookback, and "Tarik arsip" in Monitor) asks each source for every post of each day window: X, Instagram and TikTok through the provider's paging mode with fresh data (`fetch_xpoz_stored_items` / `fetch_xpoz_social_items` with `complete=True`), YouTube by following every page the API offers, news as before (one feed per day, about 100 entries; the feed has no further pages). Nothing is cut at 300 rows any more; rows are stored in batches of 150 with the database released between them.
- **Measured on 14 Nov 2026, one day of one query:** X 313 posts in paging mode with fresh data (100 in the direct answer) for 6 credits, about 2 a page of 100; Instagram 12 credits a search and TikTok 5, whatever they return (5 and 1 posts that day); YouTube 485 videos (50 before) for about 1,000 of the day's 10,000 API units and no credits.
- **A connection that never opened is asked again** (up to four times); a request that was sent is never repeated.
- **YouTube's daily units can run out during a large pull.** The pages already read are kept, and the YouTube lane then waits six hours at a time (`DAILY` in `pulse_provider_block.py`) until the new day's units arrive. No top-up applies.
- **Paid photo lanes are on by default without a daily cap:** `profiles_x` (about 2 credits an account), `profiles_tt` (5), `profiles_ig` (12, only for accounts whose picture links had died). Each account is bought once. TikTok pictures are stored on this server like Instagram's.
- **Not changed yet:** scheduled crawls between pulls still take one direct answer (the newest posts, at most 300) per run. A project busier than that between two runs needs the next step: follow the pages whenever a direct answer comes back full.

## A new project's first minutes (14 Nov 2026, night)

`POST /topics/{id}/start` (`{days, platforms?}`) is what the app calls right after creating a project, from Pencarian cepat and from the "Project baru" form. It saves the lookback, switches on recurring collection for every chosen source (`enable_schedules`: news every 15 minutes, X every 2 hours, YouTube every 3, Instagram and TikTok every 12, Reddit every 6; an existing schedule and a lane switched off in Monitor are left alone; the first scheduled run comes one interval later), and starts the complete pull in the background.

The pull (`pulse_lookback.run`) now works three lanes side by side: news then YouTube, X, and Instagram then TikTok then Reddit, newest day first. `GET /topics/{id}/lookback` returns `progress` (state, posts fetched and stored per platform, `finished`) while it runs; the app's waiting screen reads it every four seconds and opens the project after about three minutes or when every source has settled. Progress lives in the server process: a restart during a pull loses the display, not the posts already stored.

Sumber & Cakupan → "Kumpulkan semua posting" calls the same complete pull for one platform over the project's lookback (`POST /topics/{id}/backfill`).

## YouTube: channels besides search (15 Nov 2026)

The keyword search (`search.list`) has its own allowance of 100 calls a day per Google Cloud project; every other read shares 10,000 units a day at one unit a call (Google's quota page, read 15 Nov 2026; both reset at midnight Pacific time, 15.00 WIB). A scheduled YouTube run therefore does two things: the keyword search as before, and a sweep of the project's known channels. The sweep reads the upload list of up to 150 channels (those with the most stored videos for the project, then the most recent), keeps videos of the last 7 days whose title or description matches the project's query (`server/app/services/ingest/query_match.py`) and that are not stored yet, and fetches their details in batches of 50. A run costs at most about 150 units. When the search is refused but the channels could be read, the run succeeds; the job's result records `search: refused` and what the sweep read. A channel is found only after one of its videos was collected once, so new channels still depend on the search. Tried on 15 Nov 2026 on the two most active channels of one project: 3 units, 6 new matching videos.


## Profile locations of X accounts (15 Nov 2026)

The X profile lane (`profiles_x`) asks for the location text on a profile in the same call that fetches the picture and
the follower count, so it costs nothing extra: about 2 credits an account, 25 accounts a step. The text is stored in
`pulse_account_profiles.location` (and the platform's own "based in" value in `based_in`), with `location_at` as the
time it was asked. Accounts whose picture was fetched before 15 Nov 2026 have no `location_at` and are asked once more,
busiest first, which is a one-time cost of about 2 credits for each of them. The spread map on Jaringan, the card on
Ikhtisar and the report page read the text; an account that was asked and wrote none is sent as an empty text.

## Issue radar for Beranda (15 Nov 2026)

Beranda's list of issues is made by its own job, outside any project: every 30 minutes, while the switch "Radar isu Indonesia" in Monitor is on, it reads national news, trending searches for the country and the 34 provinces, and the most popular videos, and asks the hosted AI once to group them. The switch is off after installation. What a refresh costs, how to measure it and how to read the page's states are in [pulse-radar.md](pulse-radar.md).
