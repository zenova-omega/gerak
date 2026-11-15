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
| `PULSE_AI_POST_BATCH` | `3` | Short posts (up to 1,500 characters) labelled in one call; 1 = one post a call. Measured 15 Nov 2026 on 12 posts: single calls matched the stored labels 12 of 12, 3 a call differed on 1, 6 a call on 3. A post whose exact text was already labelled copies that label and is not sent. |
| `PULSE_AI_BATCH_MIN_QUEUE` | `1500` | Waiting posts above which the oldest 2,000 go to the service's batch interface: 20% cheaper on every token type, answered within about a day (best effort). Live calls keep taking the newest posts. 0 = never. Each request is the same single-post call, so a label is the one a live call would give; it carries `batch: true`. Comments are not sent this way. |
| `PULSE_AI_LOCAL_MAX_QUEUE` | `0` (off) | Above 0: while at most this many posts and comments wait, the local model (`OLLAMA_MODEL`) labels them for free, and a longer queue goes to the hosted model until it is down to a fifth of the limit. Without the local model analysis stays on the hosted one. Measured 15 Nov 2026 on 12 posts: local labels matched hosted ones on 10 of 12, at about 31 s a post (about 2,800 posts a day if it ran all day), so it is off until you accept that difference. |

Prices and rate limits change; read them on the service's pricing page before a large run. On 15 Nov 2026 the documented prices per million tokens were $2.00 in / $6.00 out for the answering model and $1.25 in / $2.50 out for the labelling model, and a new account's limit for the labelling model was 37 requests a second.

## What happens when the service refuses

- A rejected key or an empty credit (HTTP 401, 402, 403): the hosted lane pauses for 30 minutes and labelling stops by itself. Jobs that were in flight keep their attempts. The Sentimen page says that automatic analysis has stopped and that an administrator has to check. After the key or credit is fixed, restart the server or wait for the pause to end.
- A rate limit or an outage (429, 5xx, timeouts): each call is tried three times, then the lane pauses for one minute.
- Token counts and cost are written once a round to the table `pulse_ai_usage`, per day, lane (answers, labels_posts, labels_comments, text_kind, radar_compose, radar_x) and model. Read them with `cd server && ../.venv/bin/python -m app.pulse_ai_usage [days]`; the service's own console stays the record of what was billed. Usage of the last minute before a restart can be lost.

## Not built yet

- A spend cap or a daily budget. The only guards are the off-by-default switch, the trial script and the pause on refusal.
- Batch results were not seen live: a probe of two posts was still pending after several minutes, so the reader accepts both the `responses` and the `chat_get_completion` answer shapes. Check the first real batch in `pulse_ai_batches` and in the usage table (lane `labels_batch`).
- Usage on a page of the app (the table and the command above exist).
