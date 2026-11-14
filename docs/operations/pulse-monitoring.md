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
- `PUT /monitor/workers/{rss|xpoz|youtube}`: `{daily_limit:0..144, clear_block?:boolean}`.
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
