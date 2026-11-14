# PULSE listening workbench · 11 November 2026

## Implemented

- Keyword builder: comma-separated phrase chips, removable terms, OR alternatives, AND-required phrases, NOT exclusions, live preview and 250-character validation. Existing complex Boolean queries open intact in advanced mode. Saving uses the existing authenticated project API; it does not start collection.
- Posting: actual provider avatar when available, initial fallback and platform badge, expandable account/source preview, original profile/post links for IG/TikTok, media previews open by default with load-failure messaging.
- Right-hand filter drawer: existing multi-platform/content/author/date/engagement/media filters plus multi-select post sentiment, active filter removal, live result count, saved views per project in this browser (maximum 20). Saved views do not replace the global publication-date range.
- Overview sentiment distribution: positive, neutral, negative and unknown; each category navigates to matching posts while retaining topic and alert parameters. Publication period continues through the existing per-project store.

## Data boundaries

Sentiment currently reads `post.metrics.sentiment`, as a canonical string or an object with `label` and optional `method`. Only positive/neutral/negative labels count as analyzed. Issue-level sentiment is deliberately not copied to posts. No new classifier or AI provider is activated by this change. Missing post labels display “Belum dianalisis”. This is the UI/data contract, not a claim that all existing posts have been analyzed.

Avatar URL support uses the existing safe-media validation. Instagram's normalizer already retains `profilePicUrl`. A UI cannot manufacture avatars that the stored provider response lacks. Display names are never treated as verified account handles. Images are loaded from their provider/CDN with no-referrer; external delivery can expire or reject the request.

Filters here narrow the mentions workbench; they do not silently change account or network analysis. Only the existing global date range applies across those pages. Saving filters is local-browser persistence, not team-shared storage. No new geo/language/demographic filter is advertised without corresponding data.

## Recommended collection/enrichment agents (not activated)

| Worker role | Dataset/fields needed | Why | Budget boundary |
|---|---|---|---|
| Discovery, existing Xpoz/news/YouTube workers | platform, native post ID, canonical URL, author ID, matched keyword, query version, published_at, collected_at, provider | Reproducible keyword coverage and deduplication | Existing shared daily quota; cursor/checkpoint per project/platform |
| Public profile enrichment | stable platform account ID, handle, display name, profile URL, avatar URL, followers, fetched_at | Reliable avatar and account ranking; no cross-platform identity guesses | Cache per account; refresh only stale/missing fields; quota reservation before requests |
| Media metadata | preview URL, media type, expiry if provided, retrieval status | Distinguish media unavailable, expired and loading failure | Use provider metadata before any additional fetch; no private-media access |
| Metrics refresh | post ID, sampled_at, likes/comments/shares/views, unavailable fields | Growth velocity instead of comparing lifetime totals | Prioritize active spikes, back off old posts; do not convert missing to zero |
| Comment/reply collection | comment ID, parent comment/post ID, author ID, text, publication time, likes, pagination cursor, coverage status | Top comments and directly evidenced reply chains | Separate provider quota units from job-attempt limits; retain page/coverage markers |
| Narrative relationships | repost_of/reply_to/quote_of native IDs, shared URL, evidence type, observed time | Separate direct propagation links from content similarity | Never infer a causal edge from publication order alone |
| Post-level sentiment enrichment | content hash, language, target, label, confidence policy, evidence excerpt, model/version, analyzed_at, human override | Explainable sentiment, reprocessing only when content changes | Local/cloud provider choice and explicit cost cap; no credentials passed to model |
| Coverage/quality checks | schema version, rejected/duplicate counts, missing-avatar/media/sentiment rates, errors, quota ledger | Make collection gaps visible before increasing collection volume | Reads stored data; no external quota |

Suggested order: coverage audit → public profile/media metadata → per-post sentiment → targeted metric refresh → comments and native relationship IDs. These are roles in the existing queue, not uncontrolled autonomous crawlers. Provider access and field availability must be verified before enabling each role.

## Not part of this change

No new crawler runs, paid upgrades, additional quotas, account login bypass, demographic inference, GPS inference, satellite integration, or sentiment backfill. Unknown values remain explicit. AI sentiment about a statement is not the author's political affiliation or a verification of the statement.

## Verification and handoff

- 78 non-browser frontend tests pass with `node --test --test-concurrency=1 --test-timeout=30000`. A repeated parallel run hung in the existing chronology SSR suite and was stopped; the sequential rerun passed. The existing legacy `pulse-ui.test.mjs` browser script was not run; browser interaction is reserved for CUA.
- 166 backend tests pass; existing deprecation warnings remain.
- Targeted ESLint and production build pass. Build warns about a >500 kB chunk and old Browserslist metadata.
- Browser reached the actual PULSE login page, but the session was not authenticated. Authenticated visual/interaction verification is pending user login; no bypass or test session was created.
- Local services were initially stopped. Preview frontend is on 127.0.0.1:5173; backend on 127.0.0.1:8000 uses `app.pulse_main:app` with process-only `PULSE_MONITOR_ENABLED=false ENABLE_SCHEDULER=false`. Persisted schedules and quotas were not edited. This preview process does not run automatic crawls.

### Authenticated follow-up

After user login, CUA verified 451 posts across five platforms on the Presiden project. Keyword-builder inputs produced the expected OR/AND/NOT preview without saving or changing the project's existing query. Clicking Negative opened the same project's posts with `sentiment=negative` and correctly showed zero results: all 451 stored posts lack per-post sentiment. The Instagram + TikTok checkbox combination returned 25 posts (20 + 5). Account preview expanded and canonical profile/post links were present. External media was not uniformly successful: at least one preview reported load failure and some images remained pending with naturalWidth 0. This is not proof that avatars/media consistently load. Saved-view persistence and light-theme visual appearance were not exercised in this follow-up. Evidence screenshot: `.codex/artifacts/pulse-listening-verified.png`.
