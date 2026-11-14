# Pulse prototype backend

All routes retain the `/api/admin/pulse` prefix. Analytics, bootstrap,
manual crawls and run history require an authenticated admin.

## Configuration and spending

- Settings resolve `server/.env` and `services/listening-api/.env` relative
  to the code, not the working directory. Only `XPOZ_API_KEY` and
  `YOUTUBE_API_KEY` are imported from the listening service. Injected env
  variables override files. No credentials are returned in API responses.
- `XPOZ_MODE=mcp_stored` is the default: MCP initialization plus exactly one
  `getTwitterPostsByKeywords` call, `responseType=fast`, `limit=100`,
  `forceLatest=false`. Supports JSON and Xpoz compact/TOON responses.
- `XPOZ_MODE=rest_live` explicitly selects REST live search. Trial keys are
  not supported by that endpoint; plan restrictions are reported safely.
- YouTube makes one search request (up to 50 videos, region ID/language id)
  and at most one batched videos lookup. No pagination, retry, provider
  fallback, auto-upgrade, or operation polling is performed.
- The legacy topic scheduler skips metered providers. The separate monitor
  scheduler supports explicit opt-in schedules for RSS, X, YouTube, Instagram
  and TikTok. Created/bootstrap topics and new monitor schedules are inactive
  by default. Bootstrap performs no crawl.

### Shared automatic social quota

- Schedule source keys: `rss`, `xpoz` (X), `youtube`, `instagram`, `tiktok`.
  There are still only three budget/lease lanes: `rss`, `xpoz`, `youtube`.
  Instagram and TikTok jobs use the same atomic Xpoz daily reservation and
  persistent lease as X and manual IG/TikTok collections. No extra policy
  row or quota is created for these platforms.
- Automatic IG/TikTok use one bounded Xpoz MCP social search, maximum 20
  posts, `responseType=fast`, `forceLatest=false`. This can return cached
  or empty data; a successful job does not guarantee newly published posts.
- Queue order is earliest `available_at`, then creation time and ID. It is
  not a guaranteed per-project allocation. Exhausted budgets leave jobs queued.
  Failed requests and retry attempts consume the same daily budget.
- `pulse_quota_reservations` attributes new reservations to UTC day, project,
  platform and mode. `WorkerUsage` is the enforcement counter. Existing usage
  without a reservation ledger entry is shown as unattributed, not guessed.
  The prototype startup's metadata creation adds this new table without
  altering existing tables. Monitor API quota breakdown is global even when
  jobs, schedules and alerts are filtered to one project.
- General manual topic crawls and comment collection remain separate legacy
  paths and are not represented by this counter. The UI discloses this limit.
- Webhook ingestion is disabled (503) without `PULSE_WEBHOOK_SECRET`; a
  configured webhook requires the matching `X-Webhook-Secret` header (401
  otherwise).

## Routes and semantics

- `POST /bootstrap`: idempotently creates GERAK and Isu Penyadapan Presiden
  with RSS, Xpoz and YouTube, inactive/manual by default.
- `POST /topics/{id}/crawl`: retains `topic_id` and `ingested` (new rows only),
  adds `run_id` and a `providers` map. Each provider has a safe `status` and
  ingestion count. Error responses never contain remote bodies or URLs.
- `GET /topics/{id}/runs`: persisted completed run summaries, newest first.
  Summaries commit with the request; a process crash may leave no summary.
- `GET /analytics?topic_id=...`: returns `total_mentions`, `platforms`
  (`platform,count`), `timeline` (`date,count`), `influencers`
  (`author,platform,mentions,engagement,url`), `locations`, and
  `unknown_location_count`. Omit the topic to deduplicate by platform+URL
  across topics, selecting the latest observed snapshot.
- Timeline dates use UTC publication date, falling back to ingestion date.
  Influencer URLs are representative source-post URLs. Stable provider author
  IDs in item metrics prevent merging different YouTube channels with the
  same display name. Engagement sums observed likes, comments and shares;
  missing engagement is null, observed zero is zero. Views are never reach
  or engagement. Issue metadata also returns null for unobserved totals.
- Repeated ingestion updates observed metrics and issue aggregate deltas,
  without incrementing mention counts. Omitted metrics retain prior
  observations. Issue score uses engagement, not views or guessed reach.
- No verified point-coordinate provenance is collected by these adapters.
  All mentions remain unknown-location and `locations` is empty. Profile
  labels, place centroids and inferred locations are deliberately not mapped.

## Prototype limitations

Run **one server worker/process**. An in-process topic guard returns 409 for
overlapping same-topic manual crawls and is held through request commit;
scheduler crawls share that guard. This is not a distributed lock. Before
multi-worker deployment, add database uniqueness/migration for topic+URL,
distributed crawl exclusion and transactional upserts. Bootstrap is
idempotent for sequential requests; concurrent bootstrap is not guaranteed.
Webhook/crawl simultaneous writes are not globally serialized.

Existing tables are not altered. Startup `create_all` adds only the new
`pulse_crawl_runs` table. `seed.py`, compose files, and secret files are untouched.

## Verification

From `server/`: `../.venv/bin/python -m pytest -q`.
Provider tests mock HTTP; no metered calls are made by tests. The sanitized
shape fixture contains no real posts or credentials.

Provider references: [Xpoz REST](https://docs.xpoz.ai/rest-api/overview),
[Xpoz MCP tools](https://docs.xpoz.ai/mcp/tools/twitter),
[official Xpoz response parser](https://github.com/XPOZpublic/xpoz-python-sdk/blob/main/src/xpoz/_transform/_response_parser.py),
[YouTube search](https://developers.google.com/youtube/v3/docs/search/list),
[YouTube videos](https://developers.google.com/youtube/v3/docs/videos/list).
