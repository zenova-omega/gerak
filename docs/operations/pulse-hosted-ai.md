# PULSE: AI paid by the token (hosted model)

PULSE can run its AI on a local model (default, nothing leaves the machine) or on a hosted model paid by the token. The hosted lane is faster: answers people wait for arrive in seconds, and background labelling runs several calls at once. With it on, the text of public posts and comments is sent to the AI service. Requests are sent with `store: false`, so the service does not keep them for later retrieval; what else the service does with API data is governed by its own terms, which this project has not reviewed.

## Switch it on

1. Create an account at `console.x.ai`, add prepaid credit, and create an API key on the API Keys page.
2. In `server/.env` add two lines (the key never goes anywhere else, and never into the repository):

   ```
   AI_PROVIDER=grok
   XAI_API_KEY=<the key>
   ```

3. Restart the API server. Tanya AI, AI summaries, AI Insights, keyword suggestions and one-post analysis now use the hosted model. Background labelling is still off: a key alone never starts spending on the queue.
4. Measure before the queue runs: `cd server && ../.venv/bin/python -m app.pulse_ai_check`. It makes about four paid calls on real items, stores nothing, and prints tokens, cost and time per call plus what the waiting queue would cost at that rate.
5. If the numbers are acceptable, add `PULSE_AI_HOSTED_BACKGROUND=true` to `server/.env` and restart. The queue is then worked by `PULSE_AI_PARALLEL` calls at once (default 8).

To go back to the local model: set `AI_PROVIDER=ollama` and restart. Labels already stored stay as they are.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `XAI_MODEL` | `grok-4.7` | Answers people wait for. This model always reasons; `XAI_REASONING_EFFORT` (default `low`) sets how much. |
| `XAI_BULK_MODEL` | `grok-4.20-0309-non-reasoning` | Background labelling. A model that does not reason, so no reasoning tokens are billed. |
| `PULSE_AI_HOSTED_BACKGROUND` | `false` | Paid labelling of the whole queue. |
| `PULSE_AI_PARALLEL` | `8` | Labelling calls in flight at once. |

Prices and rate limits change; read them on the service's pricing page before a large run. On 15 Nov 2026 the documented prices per million tokens were $2.00 in / $6.00 out for the answering model and $1.25 in / $2.50 out for the labelling model, and a new account's limit for the labelling model was 37 requests a second.

## What happens when the service refuses

- A rejected key or an empty credit (HTTP 401, 402, 403): the hosted lane pauses for 30 minutes and labelling stops by itself. Jobs that were in flight keep their attempts. The Sentimen page says that automatic analysis has stopped and that an administrator has to check. After the key or credit is fixed, restart the server or wait for the pause to end.
- A rate limit or an outage (429, 5xx, timeouts): each call is tried three times, then the lane pauses for one minute.
- Token counts and cost since the server started are kept in memory (`app.services.ai.hosted.usage()`); the service's own console is the record of spend.

## Not built yet

- A spend cap or a daily budget. The only guards are the off-by-default switch, the trial script and the pause on refusal.
- The service's batch interface (documented at 20% off, results within about a day).
- Usage on a page of the app.
