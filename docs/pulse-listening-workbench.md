# Listening workbench

## Pencarian cepat

`/pulse/search` searches stored title, caption and author across projects. It is
an authenticated, literal substring search (2–200 characters), not a provider
search. It reads at most 501 matching records and returns up to 500, deduplicated
by platform and URL. A truncation notice asks for a narrower phrase. No project
is created, and no crawl quota is used. Post filters work within returned data.

## Kelompok percakapan

Existing groups use 64-bit SimHash of title plus text, maximum Hamming distance
3 against the group's first representative. This is near-duplicate detection,
not semantic clustering or evidence of coordination. The UI discloses this
and its all-project-time scope (up to 50 groups); global post dates do not filter
the existing groups endpoint. Account count is observed platform/name pairs,
not a verified count of people.

## Sentiment

`GET /api/admin/pulse/sentiment/status` exposes configuration status, never secrets.
An owner/admin can explicitly analyze one stored caption with
`POST /api/admin/pulse/items/{id}/sentiment`. The local installation now uses
`AI_PROVIDER=ollama` and the already-installed `qwen2.5:14b`. The adapter connects
only to 127.0.0.1:11434, ignores proxy variables, never downloads a model, and
never falls back to a cloud provider. Existing Claude support remains optional.

The backend sends up to 6,000 characters, requests structured label, confidence
and rationale, validates output, and saves method/model/time alongside existing
metrics. Invalid output remains unknown, not neutral. Results are cached per
stored item. Confidence is model-reported, not calibrated. Analysis assesses tone,
not truth, political affiliation or an account's intent. Human overrides and a
labeled Indonesian evaluation set are not implemented.

### Automatic local sentiment

Automatic backfill and crawler-post processing are now enabled with
`PULSE_SENTIMENT_ENABLED=true`, restricted to `AI_PROVIDER=ollama`.
The scheduler discovers up to 250 unqueued records per pass. A durable local
lane lease limits inference to one background post at a time, prioritizing
recently collected records. It commits the claim before inference and re-reads
current metrics on completion, retaining concurrently updated counters.

Existing valid sentiment is retained; missing text is skipped. Invalid output
stays unknown. Failed inference retries up to 3 attempts with backoff, after
which it remains visibly failed. Expired leases are recoverable after restart.
No model download, paid API fallback, or crawler quota change is performed.

`GET /api/admin/pulse/sentiment/progress?topic_id=…` is authenticated and reports
project-wide totals, analyzed, pending, running, failed, and skipped. Pending
includes records not yet discovered by the bounded scanner. Dashboard polling
runs every 10 seconds; changed analyzed/total counts trigger background analytics
refresh without resetting filters. Chart counts still honor the project period,
while queue progress intentionally covers all dates and is labeled accordingly.

## Alerts

Existing activity-threshold alerts remain separate. Since 15 November 2026 a
`volume_spike` alert is decided by the product's one spike rule, `spike_v1`
(`server/app/services/pulse_spikes.py`), the same rule that marks the trend
chart. The publications of one text group are counted per 30 minutes over the
last six hours: the window that just ended and up to eleven before it. The alert
fires when the latest window is a spike among them: it rose from the window
before, holds >=10 posts, is >=1.5x the usual window (the median of the others;
when that is 0, as for a group that goes from silence to ten posts, no ratio is
stated) and reaches a tenth of the highest window. It also needs >=3 observed
account names. Only windows that began after the schedule's baseline are read
and at least two are needed (a full observed hour), so historical initial
imports are suppressed. The windows are counted from what is stored when the
alert is decided, whenever it was collected: a source collected every few hours
brings the whole stretch at once, and its not-yet-collected hours must not read
as silence. Each alert stores the rule, the window's posts, the usual window,
the ratio, how many baseline windows were read, and current and baseline
evidence IDs (at most 200 baseline IDs); the existing analysis button opens the
issue/window. A two-hour cooldown avoids repeat spike alerts for the same group.
Alerts stored before that date carry `volume_spike_v1` (>=3x the preceding 30
minutes, nonzero) and are still shown with their own wording.

This describes observed volume only. Sampling changes, missed collections, and
source availability can bias it. It is not calibrated virality detection.
Rules run inside scheduled worker completion; this change does not enable
schedulers, change quotas, backfill notifications, or add push/email delivery.

## Local activation, 12 November 2026

The scheduler was subsequently enabled at the user's request. Limits remain
rss=24, xpoz=4, youtube=6 per UTC day (reset at 07:00 WIB). X/IG/TikTok share
the Xpoz budget. Both existing project schedules are retained. No upgrade.

Run from the project root in two terminals after stopping any existing instances:

```sh
OLLAMA_NO_CLOUD=1 OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

```sh
cd server
PULSE_MONITOR_ENABLED=true ENABLE_SCHEDULER=false ../.venv/bin/uvicorn app.pulse_main:app --host 127.0.0.1 --port 8000
```

These are local processes, not boot services. Monitoring requires the computer
to stay awake and the backend to remain running. Automatic local sentiment is
now enabled in addition to explicit per-post analysis.
