# PULSE: Monitoring room — proposed next phase

Status: design proposal, not activated. The implemented explorer uses stored sources. No new crawl, recurring provider spend, OS push permission, or external notification channel is enabled by this change.

## Delivered explorer

Network 2D is default; perspective 3D and chronological publication timeline remain selectable. Real API nodes, mention/similarity evidence, and publication timestamps only. Frame counts exclude future evidence. Unknown dates appear only in full sample. Stable deterministic layout, max 120 accounts by relationship evidence, explicit coverage. Colors encode platforms, not political affiliation or geography. Account selector and SVG keyboard controls provide evidence access.

Original vector badge vocabulary: spark/star for top-three observed account engagement (ties included); chip + review marker for automation signals. Positive finite metrics only; no unknown-to-zero badge inference. Snapshot badges hidden in historical replay. Existing text repetition and burst thresholds retained; not a bot classifier.

## Recommended monitoring flow

Configured collection → normalize/deduplicate → append metric snapshots → score window changes → persist alert → in-app inbox → open issue explorer at alert's time window → inspect evidence → acknowledge/resolve.

1. Establish collection coverage first. Each source needs provider, platform ID, canonical URL, author ID, published_at, first_seen_at, last_seen_at, ingestion run, topic IDs and raw provenance. Save partial/failed-run statuses. Do not substitute crawl time for publication time.
2. Append metrics with observed_at rather than overwriting all history. Keep likes/comments/shares/views nullable and distinct. Track video comments with parent IDs, sampling limits and collection timestamps. True diffusion requires explicit parent/repost/quote IDs; content similarity remains noncausal.
3. Add per-topic freshness panel: last successful run, provider lag, coverage, quota/budget use, failure state, next scheduled collection. Prefer warning about stale data to a misleading live badge.
4. Run publication-time and discovery-time windows separately. Backfills and first-time imports form baseline; they must not trigger a breaking-news alert solely because many historical posts arrived at once.
5. Initial tunable alert rule proposal: recent 30-minute publication window with at least 20 unique posts and 10 authors, plus at least 3× the median comparable window, only after sufficient baseline and successful collection. These are calibration starting points, not validated virality thresholds. Small topics need different thresholds. Never calculate a ratio against zero baseline without a minimum-volume gate.
6. Additional alerts: new narrative cluster with supporting posts; distinct-platform expansion; sustained engagement delta from metric snapshots; collecting failure or exhausted quota. Name them according to what is observed, not causal claims.
7. Persist alerts with topic/issue ID, time window, rule version, triggering inputs, evidence IDs, severity, created_at, dedup key, acknowledged_at/by and resolved_at. Cooldown and hysteresis prevent repeated notifications for the same ongoing burst. Separate ingestion retries from new events.
8. In-app inbox first: unread count, severity, evidence summary, freshness, and “Analyze spread” action. Opening an alert loads that issue and time window, not a different or global topic. Multi-user acknowledgement must be server-backed, not solely localStorage.
9. SSE or bounded polling can deliver stored alerts while the dashboard is open. Browser push/email/chat integrations require explicit channel choice and permission; notifications outside the browser need a separate persistent delivery mechanism.
10. A monitoring wall should show issue queue, fastest-changing topics, timeline/network drilldown, and source health. Analyst view preserves evidence and searchable posts/comments. Geographical heatmaps remain unavailable until location provenance exists.

## Operational prerequisites before enabling collection

Existing APScheduler checks due active topics every five minutes. Inspect current scheduler enable setting and run topology before enabling. Current locking is process-local; production needs durable distributed job ownership, retries with backoff, observable errors, rate limits, per-provider quota budgets, and no silent exception swallowing. Use one scheduler owner or a durable worker queue. Protect admin authorization and topic access; audit rule changes and notification acknowledgements.

Choose collection interval and daily provider budget with the owner. Paid tier must never activate automatically on quota exhaustion. Measure end-to-end latency as publication → provider availability → successful collection → alert delivery; “instant” is not guaranteed by periodic polling.

## Suggested rollout

Phase 1: timestamp/metric history + source health + baseline-aware alert tests, initially shadow mode.
Phase 2: durable in-app inbox + issue/time deep links + acknowledgement + bounded delivery.
Phase 3: calibrated detection + approved scheduled collection budget + optional external push + multi-user operational hardening.

Tests required: no alert on backfill/initial baseline; no duplicate after retries; sparse/zero baseline handled; partial provider failures visible; old late-arriving posts differentiated; metric decreases/resets handled; authenticated alert endpoints; exact evidence/time deep link; restart-safe read/ack state; quotas fail closed.
