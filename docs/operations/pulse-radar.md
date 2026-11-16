# PULSE: the issue radar behind Beranda

Beranda (`/pulse`) shows what Indonesia is talking about before any project exists: a ranked list of issues, a map by province, and the active projects. The list comes from a background job, the radar. This note says what the job reads, how to switch it on, what it costs and what to look at when the page is empty or stale.

Stage 1 (15 Nov 2026) reads free public lists only. Stage 2 (same day) adds what is loud on X and figures from X, TikTok and Instagram. Those steps cost money on every refresh, so they sit behind their own switch, which is off after installation. See "Stage 2" below.

## What one refresh does

1. Reads the lists. National news (top stories and eight sections), trending searches for the country and for each of the 34 provinces, and the most popular videos (overall and five categories). Each source may fail on its own; the run records what was missing and goes on.
2. Asks the hosted AI once to group the signals into issues: a neutral name, a category, one sentence on why, the signals behind it, proposed keywords. The answer engine is asked first and given 300 seconds. If it gives nothing, the faster engine is asked once (120 seconds). Only public material is sent: headlines, video titles, search terms. Nothing from a project.
3. Decides the rest on the server: figures per platform, the provinces an issue is searched in (read from the province lists, never from the AI's answer), evidence, order. An issue found only on province lists counts as national once five provinces carry it; under that it is local and shows only in those provinces' lists.
4. Stores the run and removes runs older than 30 days.

No database session is open during steps 1 and 2. One refresh at a time, held by a lease of 25 minutes on the radar's row in `pulse_worker_policies` (longer than every wait of a refresh together, the paid steps included).

On an installation that runs the local model (`AI_PROVIDER=ollama`) step 2 is skipped. The lists are still read and Beranda shows them as raw lists per platform.

## Switching it on

The switch is **Radar isu Indonesia** in Monitor, with the other collection switches. It is **off** after installation. While it is on, the job checks once a minute and makes the list **once a day at 08.00 WIB** (from 16 Nov 2026; before that every 30 minutes). The time is `PULSE_RADAR_DAILY_AT` (`HH:MM`, default `08:00`) on the installation's clock (`PULSE_ZONE_OFFSET_MINUTES`); both live in the server's settings, so the schedule is the same after every restart. A morning missed while the API was stopped or the laptop asleep is made up the minute the job runs again. A day's refresh that gives no list (nothing read, or no issues composed) is tried again every 30 minutes until the day has one. Movement on the page ("Baru", "Naik 3", "Turun 2") is told against the list of about a day earlier.

Someone who may change settings can also start one refresh from Beranda ("Perbarui sekarang", or "Jalankan sekarang" on a radar that never ran). That works with the switch off.

Reading Beranda never starts a refresh. Filters, the map and the evidence drawer are answered from the stored run.

## Measure before switching on

```bash
cd server && ../.venv/bin/python -m app.pulse_radar_check
```

One real round: prints signals per platform, provinces read, the issues in order, tokens, cost and seconds. It stores nothing. Add `--save` to store the round as a refresh, which is also the way to give a fresh installation its first list without waiting for the schedule.

## Measured on 15 Nov 2026

| What | Figure |
|---|---|
| Province lists read | 34 of 34 |
| Signals in one round | 230 (news 122, search terms 57, videos 51) |
| Reading the lists | about 20 seconds, 44 small requests, spaced 0.3 seconds apart for the provinces |
| Answer engine, one grouping | 114.5 s, 9,256 tokens in, 9,207 out (5,876 of them reasoning), USD 0.072, 40 issues |
| Faster engine, same signals | 19.9 s, 8,571 tokens in, 3,426 out, USD 0.019, 25 issues |
| A whole round after the fix below | 135.8 s; 227 signals; 40 issues (35 national, 5 local); 9,183 tokens in, 9,601 out; USD 0.074 |
| Video quota | 6 units a refresh, about 290 of the 10,000 daily units at 48 refreshes |

At 48 refreshes a day the AI costs about USD 3.60 a day on the answer engine, roughly USD 107 a month (about USD 0.90 a day if every refresh fell back to the faster one). The lists themselves are free.

The first real round stored no issues because the wait was 120 seconds and the answer engine needed 115. The wait is now 300 seconds, with the faster engine as a fallback.

## Stage 2: X, TikTok and Instagram (paid, off by default)

The switch is **Radar: X, TikTok, Instagram** in Monitor (`radar_social`). It only adds to a refresh that runs anyway; it does not start the radar. With it off a refresh asks nothing below and stores exactly what stage 1 stored.

With it on, a refresh also does this:

1. **Asks what is loud on X**, once a day (from 15 Nov 2026; it was hourly), or at once when someone presses the refresh button on Beranda. The hosted AI searches X live and names up to 12 issues, each with two or three post links. An issue without a post link is dropped; a link that is not a post is removed. The refresh between two searches carries the issues of the last one. A search that gives nothing (busy, refused, over 240 seconds, or an answer without a usable post link) is covered by the last search until that is 26 hours old; after that the list is composed without X and the page says "X belum lengkap". Every try is remembered, whatever came of it, and the next scheduled try waits two hours: a search can be billed although its answer could not be used, and without that memory it was repeated at every refresh. The button does not wait, and when its search gives nothing the last search still serves. What X found goes to the grouping step with the other signals. Because these issues can be up to a day older than the list, the page says when X was searched ("isu dari X dicari 11.17 WIB").
2. **Counts on X.** For the ten highest issues, and for every issue X itself found below them, the supplier counts the posts since yesterday that carry the issue's proposed keywords (the supplier counts by UTC date; that is the finest window it has). The order of the list is then settled with X as a fourth platform beside news, videos and searches. The end date of the count is inclusive (measured: 540 for the 14th, 49 for the 15th, 589 for both), so "since yesterday" is what it is. X is one platform among four: an issue that stands on X alone is ranked like one that stands only in the news. It does not pass issues on more platforms, however many posts it has (on stored runs it landed at row 11 to 13); it leads "Teratas di X" instead.
3. **Samples posts** for the ten highest of that order: one small search (20 rows, last three days) on X, TikTok and Instagram each. The five most engaged posts per platform are kept as evidence. A sample is bought again only when the last one for that issue and platform is over three hours old. X is sampled even when nothing was counted: the count only sees posts the supplier has stored, and the sample search is what stores them.

What the figures mean on the page: X is a count with a plus sign ("625+ posting", since yesterday). TikTok and Instagram are what a sample found ("12 ditemukan"; "20+ ditemukan" when the sample came back full). A sample is never a total, so TikTok and Instagram never order a list and have no column in the top ten per platform.

**The count on X is a lower bound, not the volume of X.** The supplier counts the posts it has stored, and it stores what it has been asked to look for. Measured on 15 Nov: `"wakil presiden"` counted 68 posts over two days, and an issue's count went from 1 to 13 after its own sample search had run. So the figure says "at least this many were observed", it compares issues of the same refresh fairly well, and it tends to grow for an issue that stays on the list. The page writes it with a plus, like the searches, and says "terpantau".

**An issue keeps its keywords while it lives** (paid switch on). The grouping step words the proposed keywords anew at every refresh; in the two real rounds the same issue was counted 1,059 and then 110 because its keywords had changed from `ufc, bilal hasan, gurule` to `ufc 334, bilal hasan, amanda nunes`. A count has to mean the same thing from one refresh to the next, so an issue that keeps its key keeps the keywords it was first given.

The supplier is not asked while its own lane is blocked in Monitor or when no key is set. A refusal or "too many requests" leaves that platform alone for the rest of the refresh. One answer that simply does not come loses that one issue; a second ends the platform for the refresh. Either way the run is stored as partial, the page says which platform is incomplete, and the API log has one line per lost answer: `radar: <platform> gave no answer for one issue (<kind>)`. The kind is our own word (timeout, rate_limited, plan_restricted, ...), never the supplier's text.

### Measure before switching it on

```bash
cd server && ../.venv/bin/python -m app.pulse_radar_check --social
```

Runs the paid steps whatever the switch says and prints, besides the usual lines, the supplier credits the round used. Without `--save` nothing is carried from earlier refreshes, so it shows the full price of a first round.

### Measured on 15 Nov 2026

| What | Figure |
|---|---|
| Live search of X, alone | 71.8 s, 18 searches, 59 posts read, 103,755 tokens in (81,536 cached), USD 0.39; it answered "at capacity" twice before that |
| One count on X | about 2 credits, 1 s |
| One sample of 20 rows | X about 7 credits and 4 to 6 s; TikTok about 5 and 5 to 8 s; Instagram about 17 and 7 s |
| First whole round (nothing to reuse) | 412 s; 7 issues from X; 17 counts; 322 credits; AI USD 0.43 for the search and the grouping together |
| Second round, 14 minutes later | 163 s; no search of X (the first one was carried); 17 counts and only the samples that were missing; 95 credits; AI USD 0.05 (grouping only); stored as ok |
| Third round, an hour after the first | 209 s; search carried; every issue kept its keywords and its count moved by a few posts at most (357 to 359, 110 to 112); samples of eight issues reused, two issues sampled new; AI USD 0.08 |

The credit figures are the account's balance before and after a round, and the projects' own collection draws on the same balance while a round runs (the third round read 334 credits although its own calls come to about 100). The per-call figures above are the ones to plan with.

A search that matches no post is answered with `status: no_data` and a sentence, with no rows. That is an empty sample (remembered for three hours, no figure), not a lost answer; read as a failure it was reported as incomplete and paid for again at every refresh.

In that first round one TikTok search and one X search gave no answer, and under the rule of that hour the platform was then left alone: six issues went without a TikTok sample and two without an X sample. Both searches answered in under 8 seconds when repeated. The rule was changed to the one above.

**Once a day (from 16 Nov 2026).** Every daily refresh is a first round: the search of X is due again and the samples of the day before are over three hours old. So a day costs what the first whole round above cost: about **USD 0.45 and 320 credits** with both switches on (USD 0.39 search, about USD 0.07 grouping, about 17 counts at 2 credits and ten samples at about 29), plus USD 0.39 and the same credits for each press of the refresh button. With only the first switch on, about USD 0.07 a day. The search of X is made at the day's refresh unless one was made in the last 20 hours (a press of the button the evening before); a refresh within those 20 hours carries its issues.

The figures below are for the half-hourly schedule before 16 Nov. A day with the switch on, at 48 refreshes: the search of X about USD 0.39 (one search a day), plus USD 0.39 for each press of the refresh button, and up to eleven more tries on a day when every search gives nothing; on top of about USD 3.60 for grouping. Counts about 1,600 to 2,100 credits (ten issues, and up to twelve more that X found); samples about 2,300 to 2,600 credits when each of ten issues is sampled again every three hours, more on a day when the ten highest change often. Roughly **USD 4 and 4,000 to 4,700 credits a day**, against USD 3.60 and no credits with the switch off. (With the hourly search of the first design it was USD 12 to 13.) The supplier plan read on 15 Nov had 225,000 credits a month, shared with every project's collection.

## Reading the page's states

| Beranda says | Meaning | Look at |
|---|---|---|
| "Radar belum pernah berjalan" | No run is stored. | Is the switch on? Run the check with `--save`. |
| "Data terakhir …" | The newest composed list was made before the last 08.00 WIB, and that morning's refresh is over an hour late. | The API log, lines starting `radar:`. |
| "Daftar mentah per platform" | Lists were read but no issues were composed for six hours. | Is the hosted AI reachable (`AI_PROVIDER`, the key, the balance)? |
| "… tidak terbaca" in the freshness line | A source or a province list failed in that refresh. | Usually passes by the next refresh. |
| "X belum lengkap", "TikTok belum lengkap", "Instagram belum lengkap" | Paid switch on, and that platform could not be asked everything: the search of X gave nothing and the last one is over 26 hours old, the supplier's lane is blocked or has no key, or answers were lost. | Monitor (is the supplier's lane blocked?), and the `radar:` lines of the API log. |
| A hatched province | That province's trending list was not read. | The same. |

Pictures: an issue keeps one picture link from its own sources (its trending video's thumbnail, or the picture the trending-search list shows), only from `i.ytimg.com` and `encrypted-tbn*.gstatic.com`, in `pulse_radar_issues.image`. Nothing is downloaded or stored; the page loads the picture straight from that host without a referrer. Issues found only in the news have none and show their category.

Each refresh writes one log line: `radar: <state>, <n> signals, <n> issues, <n> missing (<reason> <n>, ...)`. The reasons are the most common kinds of failure among the sources that were not read: an HTTP status (`http_503`), a network error class (`ProxyError`, `ConnectError`, `ReadTimeout`), `not_a_feed`, `empty`, or `no_key` for videos. Each source's reason is kept in the run's `usage['why']` (server only).

On 15 Nov every refresh failed for four hours with only "37 missing" in the log. The hosted AI (whose client ignores the environment's network settings) kept answering, so the cause was in what the list and supplier clients read from the environment (proxy or certificate settings, which on macOS include the system proxy), most likely around the laptop's sleep, not in the sources themselves. The exact cause was not confirmed; a restart of the API cleared it. A line full of `ProxyError` or `ConnectError` while the AI lane is fine points there: restart the API.

The final write is tried up to four times (2, 5 and 10 seconds apart) when the database is busy: the installation's database has one writer at a time, and on 15 Nov a refresh lost its whole list to "database is locked". Each retry writes `radar: the list could not be stored (database busy), trying again`. A refresh that still stores nothing is not started again by the schedule for 30 minutes, and a lock left by a stopped process is taken over the minute it runs out.

## Where things are

- Collectors: `server/app/services/pulse_radar_signals.py`. Grouping and its checks: `pulse_radar_compose.py`. The run, the order, the lease, what the page reads: `pulse_radar.py` (`assemble` builds a refresh with no database in it; `refresh` leases, reads what earlier refreshes left, writes). Project rows: `pulse_home.py`.
- Stage 2: the search of X in `pulse_radar_x.py` (the engine's `search_x` is in `ai/providers/grok.py`); counts and samples in `pulse_radar_measure.py`. The last search of X and the time of each sample are kept in the run's `usage` (`discovery`, `sampled`), which never leaves the server.
- Tables: `pulse_radar_runs`, `pulse_radar_issues`.
- Routes: `GET /api/admin/pulse/radar`, `GET /api/admin/pulse/radar/issues/{key}`, `POST /api/admin/pulse/radar/refresh`, `GET /api/admin/pulse/home/projects`.
- Design: `docs/superpowers/specs/2026-11-15-pulse-beranda-radar-isu-design.md`. Page rules: DESIGN.md, "Beranda and the issue radar".
