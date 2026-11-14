# PULSE Batch Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Durable reports, review-based evaluation, safe local recovery tooling.
**Architecture:** Additive database report table and authenticated routes; read-only evaluation over annotations; independent SQLite operator CLI. Reuse existing frontend report renderer and theme tokens.
**Tech Stack:** FastAPI, SQLAlchemy, SQLite, React, existing PULSE components.
**Spec:** docs/superpowers/specs/2026-11-13-pulse-batch-two-design.md

## Global Constraints
- No crawler quota, schedule, provider or model changes.
- Preserve dirty worktree; no bulk reset or automatic commit.
- No fabricated labels, cloud upload or overwrite of live database.

## Review Focus
- Unauthorized snapshot writes and oversized/mismatched project payloads.
- Archived scope differs from live filters: visibly retain archived scope.
- Empty/unknown/irrelevant evaluation samples never become accuracy scores.
- Repeated save creates no accidental duplicate while request is pending.
- Backup restore rejects existing files, corrupted backup and unsafe destination.

### Task 1: Durable reports (parent)
Files: new server/app/models/pulse_report.py, server/app/routers/pulse_reports.py, server/tests/test_pulse_report_archive.py; registration in model init, main and pulse_main; src/pulse/ProjectReport.jsx and new ReportArchive controls.
Interface: GET /reports?topic_id= lists metadata; POST /reports {topic_id,title,snapshot} saves version 1; GET /reports/{id}?topic_id= returns stored snapshot. Snapshot is bounded and validated; user data only.
- [ ] Write failing auth, persistence, scope/validation tests; run pytest targeted.
- [ ] Implement additive model and routes; run tests green.
- [ ] Add save/list/open UI using archived snapshot, explicit title/period/platform and errors; test renderer and build.

### Task 2: Reviewed sentiment evaluation (parallel)
Files: new service/router/tests and src/pulse/SentimentEvaluation.jsx/css; parent registers route and mounts component.
Interface: GET /evaluation?topic_id=&from_date=&to_date=&platforms= returns sample counts, agreement, per-class matrix and caveat; component receives topicId, period and platforms.
- [ ] Write missing/known/unknown/irrelevant/scope/auth tests first; demonstrate red.
- [ ] Implement read-only scoring and UI; test green, no model/provider calls.

### Task 3: Local recovery (parallel)
Files: scripts/pulse-backup.py, isolated tests and docs/operations/pulse-backup.md.
Interface: explicit source/destination SQLite CLI, no app imports/startup. Backup/verify/restore commands, no overwrite.
- [ ] Write isolated safety/integrity tests first; demonstrate red.
- [ ] Implement consistent backup, verification and new-path restore; run green.
- [ ] Parent runs actual backup and isolated restore with sensitive outputs suppressed; records evidence.

### Integration
- [x] Run backend suite, frontend tests and build; inspect real browser archive/evaluation UI. 313 backend and 128 frontend tests pass.
- [x] Review changes independently, fix material issues, document limitations and paths without secrets. See docs/operations/pulse-batch-two-verification.md.
