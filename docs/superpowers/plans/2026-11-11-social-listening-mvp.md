# GERAK Social Listening MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing GERAK Pulse UI to a real MVP pipeline using Xpoz, Indonesian news crawling, and YouTube Data API.

**Architecture:** Add a FastAPI service under `services/listening-api` with provider adapters that emit a common `MentionCandidate`. PostgreSQL stores topics, normalized mentions, crawl runs, and sentiment output; APScheduler runs low-frequency pilot jobs. The existing React UI continues to call `/api/admin/pulse/*` through its current API client.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 16, httpx, feedparser, BeautifulSoup, trafilatura, transformers/PyTorch, APScheduler, pytest, respx, Docker Compose, React/Vite.

**Spec:** `docs/specs/social-listening-mvp.md`

## Global Constraints

- Provider secrets are server-side environment variables only.
- Xpoz trial usage is capped at 420 scheduled credits, with 80 credits reserved.
- YouTube `search.list` calls are capped at 80/day by the application.
- Crawl only public allowlisted news sources; obey robots, publisher terms, conditional requests, and rate limits.
- Store article excerpts and canonical links, not full republished articles or media.
- Provider failures are isolated and observable.

## Review Focus

- Duplicate provider results and URL variants must resolve to one mention.
- Missing timestamps, authors, or engagement metrics must not break normalization or UI rendering.
- Quota exhaustion must skip the affected provider and leave a visible crawl-run error, not retry indefinitely.
- A disallowed `robots.txt`, HTTP 429, or changed article markup must stop/skip politely.
- Irrelevant keyword collisions must be excluded and recorded for later query tuning.

---

## File structure

```text
services/listening-api/
  app/main.py                 FastAPI application and routes
  app/config.py               validated environment settings
  app/db.py                   SQLAlchemy session and engine
  app/models.py               topics, mentions, issues, crawl runs
  app/schemas.py              API and provider-neutral data contracts
  app/providers/base.py       provider adapter protocol
  app/providers/xpoz.py       Xpoz REST adapter and credit guard
  app/providers/youtube.py    YouTube search/video/comment adapter
  app/providers/news.py       RSS discovery and compliant article extraction
  app/services/ingestion.py   provider orchestration, normalization, dedupe
  app/services/relevance.py   topic relevance filtering
  app/services/sentiment.py   Indonesian sentiment inference
  app/services/clustering.py  MVP issue grouping and aggregates
  app/services/scheduler.py   polling schedules and provider budgets
  alembic/                    database migrations
  tests/                      unit and route tests with mocked providers
  Dockerfile
  pyproject.toml
docker-compose.listening.yml  local API + PostgreSQL
docs/operations/              setup, source policy, and trial runbook
```

### Task 1: Backend skeleton and secrets boundary

**Files:**
- Create: `services/listening-api/pyproject.toml`
- Create: `services/listening-api/app/{main,config,db,schemas}.py`
- Create: `services/listening-api/tests/test_health.py`
- Create: `services/listening-api/.env.example`
- Create: `docker-compose.listening.yml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `GET /health -> {"status":"ok"}` and `Settings` containing `database_url`, `xpoz_api_key`, `youtube_api_key`, and quota caps.

- [ ] Write `test_health_returns_ok` and `test_settings_reject_missing_database_url`.
- [ ] Run `cd services/listening-api && pytest tests/test_health.py -v`; expect failures before implementation.
- [ ] Implement the FastAPI app, typed settings, PostgreSQL session factory, and environment template. Ensure `.env` and credential files are ignored.
- [ ] Add Compose services for `listening-api` and PostgreSQL with health checks.
- [ ] Run `pytest -q` and `docker compose -f docker-compose.listening.yml config`; expect success.
- [ ] Commit: `feat(listening): scaffold backend service`.

### Task 2: Persistence and Pulse API contract

**Files:**
- Create: `services/listening-api/app/models.py`
- Create: `services/listening-api/alembic/versions/0001_listening_tables.py`
- Modify: `services/listening-api/app/main.py`
- Test: `services/listening-api/tests/test_topics_api.py`

**Interfaces:**
- Produces: topic CRUD, crawl-run records, normalized mentions, issue aggregates, and the existing `/api/admin/pulse/*` JSON shapes consumed by `src/hooks/usePulse.js`.

- [ ] Write route tests for create/list/update/delete topic and empty issue list.
- [ ] Write a migration test asserting unique `(provider, external_id)` and `canonical_url_hash` constraints.
- [ ] Implement models and migration with UTC timestamps and JSONB raw-payload metadata.
- [ ] Implement topic routes and issue read routes without collectors.
- [ ] Run `pytest tests/test_topics_api.py -v`; expect success.
- [ ] Commit: `feat(listening): add pulse persistence and topic API`.

### Task 3: Provider-neutral ingestion and deduplication

**Files:**
- Create: `services/listening-api/app/providers/base.py`
- Create: `services/listening-api/app/services/{ingestion,relevance}.py`
- Test: `services/listening-api/tests/test_ingestion.py`

**Interfaces:**
- Produces: `MentionCandidate`, `ProviderResult`, `ListeningProvider.collect(topic, cursor)`, and `ingest_topic(topic_id) -> CrawlRunSummary`.
- Consumes: database models and topic configuration from Task 2.

- [ ] Write tests proving identical external IDs, tracking parameters, and canonical URL variants are idempotent.
- [ ] Write tests proving one provider exception does not cancel successful providers.
- [ ] Implement URL canonicalization, text fingerprint fallback, relevance include/exclude terms, and per-provider run accounting.
- [ ] Run `pytest tests/test_ingestion.py -v`; expect success.
- [ ] Commit: `feat(listening): normalize and deduplicate provider results`.

### Task 4: Xpoz free-trial adapter

**Files:**
- Create: `services/listening-api/app/providers/xpoz.py`
- Test: `services/listening-api/tests/providers/test_xpoz.py`
- Create: `docs/operations/xpoz-trial.md`

**Interfaces:**
- Produces: `XpozProvider.collect()` for X, TikTok, and Instagram using `https://api.xpoz.ai` with bearer authentication.
- Consumes: `MentionCandidate` and provider protocol from Task 3.

- [ ] Obtain the free key at `https://xpoz.ai/get-token`; store it only as `XPOZ_API_KEY` in local `.env`.
- [ ] Write mocked tests for normalization, cursor handling, 401, 402 quota exhaustion, 429/retryable failures, and omitted optional fields.
- [ ] Implement REST calls with explicit requested fields, timeouts, bounded exponential backoff, and no automatic pagination during the trial.
- [ ] Implement a persistent credit ledger: X=2, TikTok=5, Instagram=12 per request; block scheduled calls above 420 total credits.
- [ ] Run one manual query per platform and save only redacted counts/latency in the runbook—never the token or full payload.
- [ ] Run provider tests; expect success.
- [ ] Commit: `feat(listening): add quota-safe Xpoz collector`.

### Task 5: Indonesian news collector

**Files:**
- Create: `services/listening-api/app/providers/news.py`
- Create: `services/listening-api/config/news_sources.yaml`
- Test: `services/listening-api/tests/providers/test_news.py`
- Create: `docs/operations/news-source-policy.md`

**Interfaces:**
- Produces: `NewsProvider.collect()` from an explicit RSS/site allowlist.
- Consumes: provider protocol from Task 3.

- [ ] Start with 10 sources whose RSS feeds and terms permit the intended use; record feed URL, domain, owner, robots check, polling interval, and excerpt policy.
- [ ] Write fixture-based tests for RSS/Atom parsing, canonical links, Jakarta/UTC timestamp conversion, conditional GET, robots disallow, 429 `Retry-After`, and markup change.
- [ ] Implement RSS-first discovery. Fetch article HTML only for new matching items, identify the crawler clearly, and extract title, metadata, canonical URL, and a short excerpt.
- [ ] Enforce one request/domain/30 seconds, maximum two concurrent domains, ETag/Last-Modified caching, and immediate skip on robots disallow.
- [ ] Run news tests against fixtures, then a one-source smoke test; expect no duplicate item on the second run.
- [ ] Commit: `feat(listening): add compliant Indonesian news collector`.

### Task 6: YouTube collector and application quota guard

**Files:**
- Create: `services/listening-api/app/providers/youtube.py`
- Test: `services/listening-api/tests/providers/test_youtube.py`
- Create: `docs/operations/youtube-setup.md`

**Interfaces:**
- Produces: `YouTubeProvider.collect()` using `search.list`, batched `videos.list`, and selective `commentThreads.list`.
- Consumes: provider protocol from Task 3.

- [ ] Create a Google Cloud project, enable YouTube Data API v3, restrict the key to that API and backend IP where possible, and store it as `YOUTUBE_API_KEY`.
- [ ] Write mocked tests for pagination, unavailable comments, deleted videos, cached video metadata, and the 80-search-call daily guard.
- [ ] Implement `search.list` with `type=video`, `regionCode=ID`, `relevanceLanguage=id`, `order=date`, `publishedAfter`, and `maxResults=50`.
- [ ] Batch IDs into `videos.list`; fetch comments only for relevance-approved videos and cap comments per video for the MVP.
- [ ] Persist daily usage and stop before the local cap; do not rotate projects or keys to evade quota.
- [ ] Run provider tests and one live topic query; expect normalized videos and comments.
- [ ] Commit: `feat(listening): add quota-aware YouTube collector`.

### Task 7: Indonesian relevance, sentiment, and issue grouping

**Files:**
- Create: `services/listening-api/app/services/{sentiment,clustering}.py`
- Create: `services/listening-api/evaluation/labels.csv`
- Test: `services/listening-api/tests/test_intelligence.py`

**Interfaces:**
- Produces: `score_sentiment(text) -> SentimentResult`, `is_relevant(topic, mention) -> RelevanceResult`, and `rebuild_issues(topic_id) -> list[Issue]`.
- Consumes: normalized mentions from Task 3.

- [ ] Write tests for Indonesian slang, negation, mixed language, empty text, quoted speech, and low-confidence neutral fallback.
- [ ] Implement a replaceable model adapter; begin with a locally hosted three-class Indonesian model and record model name/version with every prediction.
- [ ] Label at least 150 pilot mentions manually, including slang, sarcasm, and mixed language; calculate macro-F1 and confusion matrix.
- [ ] Keep the UI label `Eksperimental` and disable sentiment alerts unless macro-F1 is at least 0.70.
- [ ] Implement deterministic MVP grouping by topic + normalized named phrases + time window; aggregate source items, platforms, reach, engagement, and latest timestamp.
- [ ] Run intelligence tests and evaluation command; expect thresholds specified in the spec.
- [ ] Commit: `feat(listening): add Indonesian intelligence pipeline`.

### Task 8: Scheduler, real Pulse integration, and pilot verification

**Files:**
- Create: `services/listening-api/app/services/scheduler.py`
- Modify: `services/listening-api/app/main.py`
- Modify: `src/hooks/usePulse.js`
- Modify: `src/components/admin/pulse/PulseDashboard.jsx`
- Test: `services/listening-api/tests/test_crawl_routes.py`
- Create: `docs/operations/seven-day-pilot.md`

**Interfaces:**
- Produces: manual crawl endpoint, scheduled collection, provider/run status in the UI, and real Pulse results without silent mock substitution.
- Consumes: all provider and intelligence interfaces from Tasks 3–7.

- [ ] Write tests that manual crawl returns `202`, concurrent crawl for the same topic returns `409`, and partial provider failure remains visible.
- [ ] Schedule one or two pilot topics: X four times/day, TikTok twice/day, Instagram once/day; enforce the global 420-credit trial cap. Poll news RSS every 30 minutes and YouTube twice/day.
- [ ] Replace silent mock fallback in `usePulse.js` with an explicit demo flag (`VITE_PULSE_DEMO=true`) and visible backend error state.
- [ ] Show `last_crawled_at`, provider status, result count, and quota warning in Topic Manager/Pulse.
- [ ] Run `pytest -q`, `npm run lint`, `npm run build`, and a secret scan over the built frontend; expect all success and no provider keys.
- [ ] Execute the seven-day runbook. Review 100 results for relevance, label 150 for sentiment, and record missing-source/latency/quota findings.
- [ ] Commit: `feat(pulse): connect real social listening pipeline`.

## Trial operating schedule

For two topics over seven days, the maximum scheduled Xpoz budget is:

| Platform | Frequency/topic | Requests | Credits/request | Credits |
|---|---:|---:|---:|---:|
| X | 4/day | 56 | 2 | 112 |
| TikTok | 2/day | 28 | 5 | 140 |
| Instagram | 1/day | 14 | 12 | 168 |
| **Total** |  | 98 |  | **420** |

The remaining 80 credits are reserved for setup checks, failed-call investigation, and final validation. Do not paginate automatically during the free trial because each page is billed as another query.

## Go/no-go after seven days

Proceed to a paid pilot only if all of the following hold:

- Relevance precision is at least 80% on 100 manually reviewed results.
- At least two sources contribute useful unique results; no single provider supplies more than 90% of useful mentions.
- Median ingestion-to-dashboard latency is under 60 minutes for news and under four hours for social sources at the pilot polling rate.
- Sentiment is either macro-F1 ≥0.70 or clearly marked experimental and excluded from automated decisions.
- Projected paid acquisition cost per 1,000 useful mentions is acceptable after removing duplicate and irrelevant results.

