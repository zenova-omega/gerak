# PULSE calculation dictionary, part 1: day, interactions, tone share, account

Status: draft for the owner's approval, 15 November 2026. Nothing is built yet.

## Intent

The owner's words (15 Nov 2026): "semua harus konsisten untuk perhitungannya. imagine ini akan menjadi enginer untuk user lain". An inventory of the server and the browser the same day found twelve groups of figures that are computed by more than one rule. The owner chose to start with the four definitions every other figure rests on: the day a post belongs to, a post's interactions, the base of a sentiment share, and what counts as one account.

A figure is consistent when one named rule produces it wherever it appears: page, report, AI summary, alert, and whatever another user of the engine reads from the API.

## Goals

1. Each of the four quantities has one definition with a name and a version (`day_v1`, `interactions_v1`, `tone_share_v1`, `account_v1`; the tone share is `tone_share_v2` since 16 Nov 2026).
2. Every place that computes one of them today calls that definition instead of its own.
3. The server and the browser cannot drift apart: both are tested against the same file of worked cases.
4. A reader of the API can see which rule produced a number.

## Non-goals

- Spikes. One spike rule (`spike_v1`) is being built in another session on the owner's instruction. This work does not touch its files.
- Rolling windows ("24 jam", "7 hari"), change against a previous period, rounding and number formats outside the tone share, grouping of similar content, and the recomputation inside reports and the AI summary. They are parts 2 to 4 and get their own approval.
- Moving the filters to the server. Period and platform filters stay in the browser, so that changing a view never fetches or collects anything.
- Storing figures inside filed reports. A filed report keeps its posts and rebuilds its figures when it is opened (that is how it works today), so it follows the rules in force when it is opened. See decision 7.
- Collection windows. Look-back and backfill decide what is asked of the suppliers, in the UTC dates the suppliers take. They are requests, not figures, and stay as they are.
- Zones with daylight saving. See decision 2.

## Anti-goals (it has failed if)

- A number changes on screen and nobody can say which rule changed it.
- The same project shows two different totals for the same thing on two pages after this work.
- A definition exists in two files again, however small.

## What exists today (read 15 Nov 2026)

- **Day.** The server stores `published_at` as UTC without a zone. Most places shift it seven hours (`services/pulse.py`, `pulse_chat.py`, `pulse_summary.py`); Monitor's "days with posts" (`routers/pulse_monitor.py`) and the look-back windows use UTC days. A post whose source gave only a date is stored at 00:00:00 UTC; the browser's `hasClock` knows that, the server has no such rule. The browser has five timestamp readers (`sentimentDate`, `postTime`, `publishedDay`, `timeOf`, `replayTime`) that differ on a zone written `+0700`, and two places (`evidenceFigures.js`, `IssueCard.jsx`) read the browser's own time zone. Weeks start on Monday in the trend chart and on the first day with data in long reports.
- **Interactions.** Server: `observed_engagement` (likes + comments + shares, digit strings accepted, nothing observed gives None), `_engagement` in `services/pulse.py` (nothing observed gives 0, feeds the stored issue score), `_engagement` in `pulse_chat.py` (integers only), `metrics.engagement or 0` in `pulse_network.py`. Browser: `postInteractions` (any finite number, negatives included), while `pulseReplay.js` ranks on the raw stored total. "Dibagikan" for a set of posts is a plain sum in `EvidencePosts.jsx` and `services/pulse.py`, and "own shares or the largest carried by a repost" in `contentShares` and `pulse_network.observed_total`.
- **Tone share.** "Belum dianalisis" is inside the base on the Sentimen page by default (a toggle removes it), in Beranda's project rows and in the post shares of `VoiceOverview`; it is outside the base in reports, conversation groups, comment opinion and the AI summary. One reader accepts a plain-text label, another only the stored object.
- **Account.** Four keys on the server and five in the browser: platform with provider id or name; platform with name only; lower-cased name without "@"; raw `platform|author`; and for X the lower-cased handle.

## Approaches

**A. One definition per side, held together by shared cases (chosen).** A module on the server and a module in the browser each hold the four rules and nothing else. A file of worked cases (input, expected answer) is read by both test suites, so a change on one side fails the other. The server also writes each post's own figures (day, clock, interactions, account key, tone) into the payload once, and the browser reads those instead of computing them. Sums and shares over a filtered set are still done in the browser, with the same module.

**B. Everything on the server.** One implementation, no drift possible. But every filter change would become a request, which breaks the product rule that changing a view fetches nothing, and it would slow every page.

**C. Fix the listed call sites one by one.** Least work now. Nothing stops the next page from writing a sixth account key.

A is the owner's "one rule" with the product's "no fetch on view change" kept.

## The four definitions

### `day_v1`: the day a post belongs to

- **Zone.** One setting for the installation: a fixed offset from UTC and its short name, default +07:00 and "WIB". The server sends both to the browser; no file writes "+7" or "WIB" by hand where this work touches it. A fixed offset covers Indonesia's three zones; a zone with daylight saving is not supported by this version.
- **A post with a clock** belongs to the calendar date of `published_at` in that zone.
- **A post without a clock** (`clock_v1`: the stored time is exactly 00:00:00 UTC, because the source gave a date only) belongs to the date the source gave, unshifted. It never takes part in an hour-by-hour figure or in "who was first" by time; such figures say how many posts were left out for that reason.
- **A post without a date** is in no dated figure. It is counted in a total only when no period is chosen, and the page says how many there are.
- **A period** is whole days of the zone, first and last day included.
- **A week** runs Monday to Sunday in the zone.
- A timestamp is read one way: with its own zone when it carries one (`Z`, `+07:00`, `+0700`), as UTC when it carries none. Never in the browser's zone.

### `interactions_v1`: what people did with a post

- Likes + comments + shares, over the ones the source reported. Views are exposure and are never added.
- A reported figure is a whole number of zero or more, or a string of digits. Anything else is not reported.
- When none of the three is reported, the source's own total (`metrics.engagement`) stands in if it is reported. Otherwise the answer is **unknown**, shown as "—". Unknown is never 0.
- A total over posts is the sum over the posts whose interactions are known, given with how many posts that is.
- Ordering by interactions: known before unknown, larger first, then earlier publication, then id.
- `content_shares_v1`, for a set of posts known to be one piece of content (a conversation group, a narrative, and the evidence drawer opened from one): the sum of their own shares, or the largest count carried by a repost (`original_shares`) when that is larger; unknown when no share figure exists.
- `shares_total_v1`, for any other set (a project, a period, a filtered list): the sum of the posts' own shares over the posts that report them. A repost carries none of its own, so nothing is counted twice; shares of an original that was not collected are not in this total, and the page's guide says so.

### `tone_share_v1`: the base of a sentiment percentage

- A post's tone is positif, netral or negatif when the stored label is one of the three, in either stored form; otherwise it is **belum dianalisis**.
- A share is always of the **analysed** posts. "Belum dianalisis" is given beside the three as a count (and its part of all posts), never inside them and never drawn as a tone.
- Percentages are whole numbers that add up to 100 (largest remainder). A tone with at least one post that would print as 0 prints "<1%".
- The toggle "Hanya yang sudah dianalisis" on the Sentimen page then no longer changes any percentage; it only shows or hides the "belum dianalisis" rows and segment.

### `tone_share_v2`: the base of a sentiment percentage (16 Nov 2026, replaces `tone_share_v1`)

The owner read "15% dari yang dianalisis" on the Positif card and chose the total instead ("mungkin \"dari yg dianalisis\" kurang jelas \"dari total posts\" lebih baik", then "Ganti ke total posting"; and: the toggle is the only difference, the base is always the total, so the four make 100 and the toggle decides whether "belum dianalisis" is shown inside it).

- A post's tone is read as in v1: positif, netral or negatif when the stored label is one of the three, in either stored form; otherwise **belum dianalisis**.
- A share is of **every post in scope**, the ones not analysed yet included. "Belum dianalisis" is the fourth part, so Positif + Netral + Negatif + Belum dianalisis = 100. While posts wait, the three tones add up to less than 100.
- Whole numbers by largest remainder; a tie goes in the order positive, neutral, negative, belum dianalisis. A part with at least one post that would print as 0 prints "<1%". No posts at all: no shares (`percent` and `text` are null).
- `tone_shares(counts)` / `toneShares(counts)` return `{total, analysed, unknown, percent, text}`, `percent` and `text` keyed by the four parts.
- Labels say "dari total posting". The toggle "Hanya yang sudah dianalisis" only shows or hides the fourth part; hidden, its room on a bar stays empty, so each segment is still drawn at its share of all posts.
- **Sentimen bersih** = (positif − negatif) ÷ total posting × 100, which is the positive share minus the negative share; it has no value while nothing is analysed (nobody has read the tone, which is not 0). A change in points, of one tone's share or of the net score, compares the same base in both windows, and a window with nothing analysed has no reading. A backlog therefore pulls the tone shares and the net score towards 0 until analysis catches up; that is the cost of this base, accepted by the owner.
- **Comments are a sample** (the most-liked comments of the busiest posts), not a backlog that drains, so their tone is read over the analysed comments: `sample_tone_shares` / `sampleToneShares`, the same rounding over the three tones, the waiting comments shown as coverage beside it. This is exactly the v1 rule, kept for comments only.
- Where it is printed: Beranda's project cards, Ikhtisar (Sentimen bersih), Sentimen (cards, daily chart tooltip, voices, per-platform bars), Siapa yang bicara (tiers, place tiles, "paling negatif" with its own `total`), evidence drawers, conversation groups, the report and its PDF, the AI summary ("SENTIMEN UNTUK DIKUTIP") and its pictures, Tanya AI's data block and charts, and every API payload carrying `tone`.
- `server/app/pulse_measures_report.py --compare` prints v1 against v2 for each project of a database copy.

### `account_v1`: what counts as one account

- An account is counted per platform: the same name on X and on Instagram is two accounts.
- The key is `platform:identity`. Identity is chosen per platform so that one account can never get two keys:

| Platform | Identity | Stored posts, 15 Nov 2026 |
|---|---|---|
| X | the handle: trimmed, leading "@" removed, lower-cased. Mentions in text name handles, so the network needs this form. | 7,887 posts, 3,848 accounts by id and by handle alike |
| YouTube | the channel id (`metrics.author_id`) | 4,517 posts, every row has an id; 3 channel titles are shared by different channels |
| Instagram, TikTok | the provider id; the normalised handle only for a row without one | every row has an id; 3 accounts appear under two handles and are one account by id |
| Threads, Reddit | the normalised handle | Threads has an id on 113 of 119 rows, Reddit on none; an id-based key would split one Threads account |
| Berita | the publisher's name, trimmed and lower-cased | no row has an id and 632 of 3,094 have no site, so a site-based key would split publishers (560 by name, 732 by site-or-name) |
| Anything else | provider id when every stored row of that platform has one, else the normalised name | |

- The name shown for an account is the most recently published `author` text under that key.
- The stored key of the profile-picture store (`profile_key` in `pulse_profiles.py`) is an address, not a figure: it names where a looked-up picture is kept and which paid look-ups were already made. It is not re-keyed, so no look-up is bought twice, and no count of accounts is ever taken from it.
- The rule for a platform is "id" only while every row of that platform carries one. The before-and-after script reports, per platform, the names seen both with and without an id; that number has to be 0 for an id-keyed platform, and the script fails the step when it is not.

## How it is built

- Server: `server/app/services/pulse_measures.py` holds the four rules, their names and versions, and a plain-language Indonesian sentence for each. `GET /api/admin/pulse/measures` returns that list. The analytics payload gains, per post, `measures: {day, clock, interactions, account, tone}` and, once, the zone offset and the rule versions used.
- Browser: `src/lib/pulseMeasures.js` holds the same four rules. A post's own figures are read from `post.measures`; the module computes them itself only for a post that has none (a stored report snapshot from before this work).
- Shared cases: `shared/pulse-measures.cases.json`, read by a pytest file and a node test file. Every rule above has cases, including the awkward ones named in this document.
- Call sites are moved one definition at a time, in this order: day, interactions, account, tone share. After each one, a script prints the affected figures for the three live projects before and after (posts per day, total interactions, number of accounts, the three tone shares), read from a copy of the database, and the owner sees that table.
- The existing helpers (`observed_engagement`, `postInteractions`, `contentShares`, `sentimentDate`, `publishedDay`, `account_key` and the others named above) become one-line calls into the two modules or are removed, so no second copy of a rule remains. A test fails when a file outside the two modules shifts a timestamp by hand, sums likes, comments and shares, or builds an account key.

## Constraints

- Other sessions are editing this checkout. Files reserved by the spike work are not touched: `pulse_spikes.py`, `pulse_listening.py`, the `volume_spike` part of `services/pulse_monitor.py`, `pulse_summary.py`, `src/pulse/TrendChart.jsx`, `src/lib/pulseTrendSpikes.js`, `src/lib/pulseMonitor.js`, and and `ProjectOverview.jsx` and `SummaryInfographics.jsx` as whole files. Where one of them holds a call site of these four rules, that call site waits until the session says it is done, and is listed as open.
- The owner works on the live page: verification on a copy of the database; the live API is restarted once per definition at most.
- No model, engine or supplier name in any payload or page. Tests never call the real model or the supplier.
- No commit unless the owner asks.

## Decisions Claude made (for the owner to check)

1. The share base is analysed posts only. Reason: "belum dianalisis" is not a tone, reports and the AI summary already count this way, and with the hosted AI almost every post is analysed (7 of 5,890 in the Gibran project were not).
2. The zone is a setting of the installation, WIB by default, instead of a hard-coded seven hours, because the engine is meant for other users.
3. A post without a clock keeps the date its source gave and stays out of hour-by-hour figures. The rule that recognises it stays "midnight UTC exactly"; storing an explicit mark at collection time is a later step.
4. The account identity per platform in the table above. It was checked against the 16,385 stored posts with an author. Against the key the Ikhtisar page uses today, the number of accounts stays the same on X, YouTube, Instagram, TikTok and Reddit; Berita goes from 560 to 558 because two publishers are written in two letter cases; Threads goes from 113 to 112 because one account was split between its id and its handle.
5. Unknown interactions print as "—", not 0, everywhere.
6. "Dibagikan" has two named rules: one for a single piece of content, one for any other set (see `interactions_v1`).
7. A filed report follows the rules in force when it is opened, because it already rebuilds its figures on opening; keeping old figures would need a second copy of every old rule. From this work on a report records the rule versions it was filed under and says, when opened under newer ones, that its figures were recounted. **This one is the owner's to confirm:** the alternative is to store the figures in each report at filing, which is a larger change.
8. The profile-picture store keeps its own key, and the collection windows keep UTC dates; both are listed as the only exemptions in the guard test.

Decisions 6 to 8 and the changes to the zone answer the questions of an independent builder check read on 15 Nov 2026.

## Left to the builder

Function and file names inside the two modules; the exact shape of the cases file; how the before-and-after script is written; the wording of the Indonesian rule sentences, within the product's copy rules.

## Testing

The shared cases in both suites. For each moved call site, the existing tests of that page or route stay green or are updated where the old expectation encoded the old rule, with the reason stated. The guard test described under "How it is built". A browser check on the copy server of the pages whose numbers moved, in both themes.
