# Pulse network and comments implementation plan

> Execute natively in the existing dirty workspace; preserve unrelated work. User approved direct implementation and a bounded live comment fetch.

**Goal:** Show evidence-backed account relationships, earliest observed narratives, amplification indicators, automation signals, and real YouTube comments.

**Architecture:** Pure analysis over existing source snapshots; store bounded YouTube comment snapshots in source metrics without schema migration. Authenticated API exposes analysis and read-only snapshots. No background provider calls.

**Stack:** Existing FastAPI/SQLAlchemy, React, SVG, CSS.

**Spec:** Approved chat scope: existing data, top five YouTube videos, at most 50 top-level comments per video. No payments or upgrades.

## Constraints and review focus
- Mention is not endorsement; text similarity and chronological precedence are not causal repost edges.
- Earliest means earliest published timestamp within this sample; missing dates never establish origin.
- Automation signals are explainable triage, not bot probability, authenticity, or political profiling.
- Deleted/disabled comments, quota errors, malformed responses: report status; never invent data or automatically retry.
- Unknown metrics stay null; repeated collection uses snapshot cache, no repeated spend.
- Bounded graph and narrative analysis disclose sampling; source links remain available.

## Tasks
1. Tests first: graph mention dedup/self links, earliest timestamp ordering, duplicate narrative grouping, insufficient account history; implement `analyze_network(posts)` in services/pulse_network.py.
2. Tests first: normalize YouTube top-level comments, single-page request and safe errors; implement comments service with top-five selection, persistence and cached responses. Add admin-only collection route.
3. Extend analytics response with network, narrative and comments metadata; test API regression and topic isolation.
4. Add NetworkAnalysis and CommentsPanel React components, SVG relationship map, narrative chronology, evidence drawers, account signal table; wire per-post comments and global top comments.
5. Run backend suite, frontend tests/build/lint; collect five videos once, verify persisted result and inspect browser interactions; open final dashboard and capture screenshots.

## Verification
`cd server && ../.venv/bin/python -m pytest -q --tb=short`
`node --test src/lib/pulseData.test.js`
`npm run build`
Browser checks: topic changes, graph selection, narrative evidence, comments filter/sort, empty/error states.

## Execution record
- Implemented pure sample analysis and explicit cached YouTube comment collection; no new database tables.
- Live collection succeeded: 50 + 50 + 50 + 50 + 30 = 230 top-level comments, five videos, no quota errors.
- Ruling: preserve existing dirty working tree and do not commit unrelated accumulated prototype work; direct user request is implementation in the running Pulse app.
- Ruling: literal `@mentions` and lexical similarity only, never inferred repost ancestry; geography remains unavailable without provenance.
- Reviewer identified malformed comment author/date and error-envelope handling plus overview snapshot loss. Added failing regressions and fixed all three.
- Browser verified topic selection, two graph modes, signal evidence, comment filter/sort and per-video expansion.
- Snapshot cache intentionally does not refresh automatically (including error snapshots); future refresh/retry requires explicit product controls and approval.
- API reference: https://developers.google.com/youtube/v3/docs/commentThreads/list
