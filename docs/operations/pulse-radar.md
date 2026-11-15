# PULSE: the issue radar behind Beranda

Beranda (`/pulse`) shows what Indonesia is talking about before any project exists: a ranked list of issues, a map by province, and the active projects. The list comes from a background job, the radar. This note says what the job reads, how to switch it on, what it costs and what to look at when the page is empty or stale.

Stage 1 (15 Nov 2026) reads free public lists only. Discovery on X and paid measurement on the social supplier are a later stage and are not built.

## What one refresh does

1. Reads the lists. National news (top stories and eight sections), trending searches for the country and for each of the 34 provinces, and the most popular videos (overall and five categories). Each source may fail on its own; the run records what was missing and goes on.
2. Asks the hosted AI once to group the signals into issues: a neutral name, a category, one sentence on why, the signals behind it, proposed keywords. The answer engine is asked first and given 300 seconds. If it gives nothing, the faster engine is asked once (120 seconds). Only public material is sent: headlines, video titles, search terms. Nothing from a project.
3. Decides the rest on the server: figures per platform, the provinces an issue is searched in (read from the province lists, never from the AI's answer), evidence, order. An issue found only on province lists counts as national once five provinces carry it; under that it is local and shows only in those provinces' lists.
4. Stores the run and removes runs older than 30 days.

No database session is open during steps 1 and 2. One refresh at a time, held by a lease of 15 minutes on the radar's row in `pulse_worker_policies`.

On an installation that runs the local model (`AI_PROVIDER=ollama`) step 2 is skipped. The lists are still read and Beranda shows them as raw lists per platform.

## Switching it on

The switch is **Radar isu Indonesia** in Monitor, with the other collection switches. It is **off** after installation. While it is on, the job checks once a minute and refreshes when the last refresh started 30 minutes ago or more.

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

## Reading the page's states

| Beranda says | Meaning | Look at |
|---|---|---|
| "Radar belum pernah berjalan" | No run is stored. | Is the switch on? Run the check with `--save`. |
| "Data terakhir …" | The newest composed list is over an hour old. | The API log, lines starting `radar:`. |
| "Daftar mentah per platform" | Lists were read but no issues were composed for six hours. | Is the hosted AI reachable (`AI_PROVIDER`, the key, the balance)? |
| "… tidak terbaca" in the freshness line | A source or a province list failed in that refresh. | Usually passes by the next refresh. |
| A hatched province | That province's trending list was not read. | The same. |

Each refresh writes one log line: `radar: <state>, <n> signals, <n> issues, <n> missing`.

## Where things are

- Collectors: `server/app/services/pulse_radar_signals.py`. Grouping and its checks: `pulse_radar_compose.py`. The run, the order, the lease, what the page reads: `pulse_radar.py`. Project rows: `pulse_home.py`.
- Tables: `pulse_radar_runs`, `pulse_radar_issues`.
- Routes: `GET /api/admin/pulse/radar`, `GET /api/admin/pulse/radar/issues/{key}`, `POST /api/admin/pulse/radar/refresh`, `GET /api/admin/pulse/home/projects`.
- Design: `docs/superpowers/specs/2026-11-15-pulse-beranda-radar-isu-design.md`. Page rules: DESIGN.md, "Beranda and the issue radar".
