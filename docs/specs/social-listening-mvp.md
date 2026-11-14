# GERAK Social Listening MVP Specification

## Objective

Build a seven-day pilot that collects public mentions for one or two Indonesian watch topics from Xpoz, Indonesian news feeds/pages, and YouTube; normalizes them into one schema; scores relevance and Indonesian sentiment; and displays them in the existing Admin Pulse UI.

## MVP scope

- Sources: Xpoz (X, TikTok, Instagram), YouTube Data API v3, and an allowlist of 10 Indonesian news RSS feeds.
- One or two active watch topics during the free-trial pilot.
- Backend-only provider credentials; no secret is exposed through Vite or browser code.
- Manual `crawl now` plus scheduled collection.
- Deduplication by provider/content ID and canonical URL.
- Relevance filtering and three-class sentiment: positive, neutral, negative.
- Existing endpoints remain the UI contract:
  - `GET/POST /api/admin/pulse/topics`
  - `PUT/DELETE /api/admin/pulse/topics/{id}`
  - `POST /api/admin/pulse/topics/{id}/crawl`
  - `GET /api/admin/pulse/issues`
  - `GET /api/admin/pulse/issues/{id}`
- Store title/text excerpt, URL, author/channel, publication time, source, engagement metrics, collection time, sentiment result, and raw payload reference.

## Explicit non-goals

- Facebook Groups, private content, WhatsApp, login-gated pages, bypassing anti-bot controls, publishing, engagement automation, and historical backfill beyond provider availability.
- Perfect Indonesian sentiment or production-scale multi-tenancy.
- Downloading or redistributing complete copyrighted news articles or YouTube media.

## Pilot constraints

- Xpoz Free: 500 one-time credits and one continuous tracking slot. Budget no more than 420 credits for scheduled pilot traffic; retain at least 80 credits for retries and validation.
- YouTube: no more than 80 `search.list` calls/day in the application even if the project quota is higher; cache video/channel lookups and fetch comments only for relevant videos.
- News: prefer RSS; obey `robots.txt`, publisher terms, `Retry-After`, and conditional HTTP requests. Default one request/domain/30 seconds and maximum two concurrent domains.
- Retention: raw provider payloads 30 days for the MVP; normalized mention records 90 days. Make retention configurable.

## Acceptance criteria

- A user can create a topic, trigger ingestion, and see real source links in Pulse without mock fallback.
- Re-running the same collector does not create duplicate mentions.
- One provider failure does not prevent other providers from completing.
- Every collection run records provider, status, item count, duration, and error summary.
- A manually reviewed sample of 100 results reaches at least 80% relevance precision.
- Sentiment is shown as experimental and reaches at least 70% macro-F1 on a manually labelled sample of at least 150 Indonesian mentions before it is used for alerts.
- No provider key appears in the frontend bundle, network responses, or repository.

