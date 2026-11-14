# PULSE monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Deliver bounded recurring Xpoz/RSS/YouTube collection, durable queue, metric history and evidence-linked alert inbox.
**Architecture:** Additive SQLAlchemy tables; database CAS claims and quota reservations, separate provider lanes, finite attempts and lease expiry. No paid external requests during tests or installation; schedules opt-in through admin UI. Snapshot and alert writes share ingestion transaction.
**Tech Stack:** Existing FastAPI, SQLAlchemy async SQLite/Postgres, APScheduler, React/Vite.
**Spec:** docs/specs/2026-11-11-pulse-monitoring-room.md and user's direct implementation request.

## Global constraints
- Preserve dirty worktree and existing source data. No automatic plan upgrades, no credential logging.
- Snapshot raw observed metrics, never carry missing values into a new observation.
- First successful run is baseline; publication-time recency gates alerts. Do not seed fake alerts.
- Three logical provider lanes; globally bounded daily reservations include failures/retries. Provider billing credits are not inferred from call counts.
- API admin-only. Alert links constrain topic + issue + evidence range. Acknowledgement persisted server-side.
- No commits of unrelated existing changes. Work in current workspace at user's request.

## Review focus
- Restart after charged request: reservation persists; expired lease becomes interrupted, not free replay.
- Simultaneous claims: one CAS winner, daily budget cannot overspend.
- Backfill and nullable metrics: no false new-viral notifications or fabricated deltas.
- Paused schedule/disabled provider: queued jobs must not execute.
- Alert navigation: other topics/issues must not leak into selected analysis; stale UI requests cannot overwrite.

### Task 1: Persistence and snapshot history
- [ ] Tests: repeated ingest appends nullable raw snapshots and retains old observations; deletion cascades.
- [ ] Add models in models/pulse_monitor.py and hook ingest_items in services/pulse.py.
- [ ] Run backend tests before/after implementation.

### Task 2: Durable scheduler and provider execution
- [ ] Tests: enqueue idempotence, CAS single claim, quota rejection, reservation retained, pause, interrupted lease, finite backoff, baseline/backfill alert gating.
- [ ] Implement services/pulse_monitor.py with enqueue_due(db,now), claim_job(db,provider,now), finish_job(db,job,result,now); worker tick uses sessions around network boundary.
- [ ] Wire scheduler to queue instead of legacy direct recurring crawl. Bound provider item counts and one-page existing adapters.

### Task 3: Admin API and evidence alerts
- [ ] Tests: unauthenticated denied, config bounded, persistent ack, exact issue-scoped analytics and snapshot reads.
- [ ] Add monitoring router, strict Pydantic config, state/jobs/alerts endpoints, issue analytics and snapshots.

### Task 4: UI and handoff
- [ ] Add monitoring room panel: explicit opt-in schedule settings, global limits, queue status, polling inbox, ack and issue/window navigation.
- [ ] Validate build/lint/unit/backend suites; browser verify real data and empty alert state without provider calls.
- [ ] Independent review; document operation, limits and deferred advanced anomaly calibration.

## Execution ledger

- Task 1 complete: raw nullable snapshots append from all ingestion entry points; history endpoint/card UI. Existing DB preserved, no invented backfill.
- Task 2 complete: durable jobs, provider leases, CAS quota, finite retries, expiration fencing, pause and safe failure modes. Three logical lanes use sequential local dispatch to suit SQLite.
- Task 3 complete: admin-only config/state, idempotent ack, exact issue/window analysis, topic-filtered inbox with pagination.
- Task 4 complete: monitoring panel, opt-in settings, 30-second inbox polling, queue history, snapshot table, browser verification with real sources.
- Ruling: initial activity detection is transparent >=5 publications / >=3 authors / 30 minutes after baseline with two-hour cooldown; statistical virality and metric-growth alerts deferred until sufficient history. UI explicitly states threshold semantics.
- Ruling: quota is collection attempts per provider/day UTC, not vendor credits; manual crawl/comments remain separate explicitly labelled paths. User approved 4/6/24 attempts and activation only for Penyadapan Presiden.
- Independent review found duplicate-ingest race, baseline-backfill false alert, inaccessible old alerts, exact inserted-ID bookkeeping gap, and stale page refresh after ack. Each fixed with regression coverage; no source rows deleted. Unique index added after live duplicate audit returned zero.
- Live activation verified: RSS 100 snapshots/3 new, Xpoz 100/1 new, YouTube 50/4 new, all succeeded. Baseline created, no fabricated alerts; screenshot /tmp/pulse-monitoring-live.png.
- No commits: preserving user's accumulated dirty worktree.
