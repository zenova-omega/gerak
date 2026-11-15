# PULSE Beranda: national issue radar and active projects

Status: draft for the owner's approval, 15 November 2026. Nothing is built yet.

## Intent

The owner's words (15 Nov 2026): "create and design dashboard page / landing page untuk ini. buat seperti ada top 10 trending topics di Indonesia. active project apa saja", then: "saya ingin melihat isu2 di indonesia (mungkin bisa dibagi per category dan platform) dari sana baru bisa membuat project dan melihat yg lebih lagi apa", and on cost: "tidak usah mikir biaya. buat yg paling bagus saja".

So the page is where work starts. Today PULSE only knows what a project's keywords bring in, which means a user must already know what to monitor. Beranda shows what the country is talking about before any project exists, lets the user turn one issue into a project in one step, and shows the projects that are already running.

Users are the two in PRODUCT.md: a leader who scans in a minute, and an analyst who decides what to monitor and checks the evidence.

## Goals

1. A first page after sign-in, at `/pulse`, named **Beranda**.
2. The ten issues most discussed in Indonesia right now, each with a neutral name, a category, one sentence on why it is up, how loud it is on each platform, and whether it is rising.
3. A map of Indonesia by province that shows where the issues are loud, and for one issue where it is loud and where it happens. Choosing a province shows that province's issues, including the ones that are loud only there. (Asked for by the owner after the first sketch: "isu yg ramai ini buat dengan peta indonesia jadi kelihatan yg ramai itu" in which part of the country.)
4. Narrowing by category, platform and province without waiting.
5. Every issue opens its evidence: the articles, posts and videos it was built from, with links out.
6. One step from an issue to a new project, with keywords already proposed. An issue that an existing project already covers says so and opens that project.
7. The active projects with enough numbers to choose which to open: posts in the last 24 hours against the 24 before, unread alerts, last collection.

## Non-goals

- A public marketing page. PULSE is an organisation's own installation with no public sign-up; the sign-in screen stays as it is.
- Sentiment of national issues. A few dozen sampled posts would look more certain than they are. Tone comes after a project is created.
- Where social posts were written. X, TikTok and Instagram posts carry no usable location, and reading it from profile text is paid, patchy and self-declared. The map is drawn from search interest per province and from places named in coverage, and says so.
- Districts and cities as areas. Provinces are the unit; a city appears only as a pin for a named place.
- Threads. Its keyword search waits for Meta's approval.
- Creating projects automatically.
- Forecasts, "viral in two hours" claims, bot labels.

## Anti-goals (it has failed if)

- An issue is on the list and nobody can see where it came from.
- Opening the page, changing a filter or opening an issue spends quota or tokens. Only the scheduled refresh and an explicit "Perbarui sekarang" may.
- The page reveals which AI model, AI company or data supplier PULSE runs on, in the UI, in an API payload or in shipped JavaScript. (An issue that is itself about an AI company is content and is shown as it is.)
- The list looks complete when a platform could not be read.
- It reads as a command centre: neon, drama, big-number hero.

## What exists today (checked 15 Nov 2026)

- `/pulse` renders one project's Ikhtisar (`PulseDashboard view="overview"`), with `ProjectBar` above it. The logo and the catch-all route both lead there. There is no page above the project level.
- `GET /pulse/topics` returns id, label, query, sources and the seed post. No counts. `WatchTopic.is_active` is a dead field (always false); a project collects when it has an enabled row in `pulse_monitor_schedules`.
- Three projects exist, all collecting.
- Pencarian cepat (`/pulse/search`) already reads `q`, `required` and `excluded` from the address and creates a project when the user presses search.
- No national trend data is collected. The social supplier offers 52 tools and none is a trend list. It does offer `countTweets` (total posts for a phrase in a date range), keyword search for X, Instagram and TikTok, and TikTok hashtag search.
- Free public sources that answered today: Google's trending searches for Indonesia (`trends.google.com/trending/rss?geo=ID`, exactly 10 rows with approximate traffic and three news items each; this morning 5 of 10 were foreign sport fixtures), Google News Indonesia top stories (`news.google.com/rss?hl=id&gl=ID&ceid=ID:id`, 38 story groups with up to five related articles each; section feeds answer with a redirect), and YouTube `videos.list?chart=mostPopular&regionCode=ID` (1 quota unit a call; category 25 returned Indonesian political videos with view counts).
- The trending-searches feed also answers per province with ISO codes (`geo=ID-JK`, `ID-JB`, `ID-JI`, `ID-SU`, `ID-BA`, `ID-PA` all returned 200 this morning, 5 to 10 rows each), and the lists differ: "polda jawa timur" only in Jawa Timur, "ambles" only in Jawa Barat, "cek bsu dengan nik 2026" in Bali, "sscasn" in Papua. This is the only source found that says where something is loud.
- Province shapes and a place gazetteer already exist, uncommitted, from the project map on the Jaringan page: `src/pulse/indonesia-provinces.json` (34 provinces, 2017 boundaries, drawn for 760 x 330), `src/lib/pulseRegionMap.js` (`placePoint`, `bubbleRadius`, `mapViews`), `src/lib/pulsePlaces.js` (`placesIn`, `provinceNames`) and `src/pulse/RegionSpreadMap.jsx`. Another session is still working on them.
- The hosted AI offers live search tools on the Responses API (xAI docs read 15 Nov 2026): `{"type": "x_search"}` with `from_date`/`to_date`, and `{"type": "web_search"}`. Sources come back as `citations` and as `url_citation` annotations. Price: X search USD 5 per 1,000 posts fetched, web search USD 5 per 1,000 calls, tokens billed separately. Whether `store: false` works with tools is not documented.

## Approaches

**A. Combined radar (chosen).** Read every platform's own signal, let the AI group the signals into issues, then measure each issue on each platform and rank. Every issue carries evidence and per-platform numbers, and a ready keyword proposal. Most work, and the only one that meets "bukti yang mendasari kesimpulan".

**B. Ask the AI directly.** One call with live search writes the list. Fast to build and covers X natively. The numbers are not ours, an item can be wrong with no way to check it, and the whole page depends on one service. Kept as one signal inside A (X discovery), not as the page.

**C. Raw lists side by side.** Each platform's own trending list, unmerged. Honest and free, but it is keywords not issues, half of it is sport and K-pop, there are no categories, and X, TikTok and Instagram have no list. Kept as A's degraded mode when the AI is unavailable.

The owner handed the choice over ("buat yg paling bagus saja"); A is Claude's pick.

## The page

Route `/pulse` becomes Beranda. Ikhtisar keeps `/pulse/overview`. A link to `/pulse?topic=…` (old bookmarks, alert links) redirects to `/pulse/overview?topic=…`. The sidebar gets "Beranda" as its first item; the logo leads to it. `ProjectBar` is not shown on Beranda because nothing on it is scoped to one project.

Three parts: the map, the issue list, the projects. From about 1180px the map and the list sit side by side (map about seven twelfths) with the projects across the full width below; under that width they stack in that order, with a jump link to the projects.

### Peta

- Indonesia by province, drawn from the existing shapes. With no issue chosen, a province is shaded by how many issues of the current list are loud there: none, 1, 2, 3 or more (one colour in three steps, with the legend beside it). A province whose list could not be read is marked as unread, which is not the same as none.
- An issue is loud in a province when a search term that belongs to it is on that province's trending list in this refresh.
- Choosing a province (pointer or keyboard) scopes the list beside it: the title becomes "Isu yang ramai di Jawa Timur", the rows are the national issues loud there in the national order, followed by issues loud only there, marked "hanya ramai di provinsi ini". A "Seluruh Indonesia" control goes back. The province is kept in the address (`prov`).
- Choosing an issue in the list draws that issue alone: its provinces shaded by the approximate searches there, and a pin on each place its headlines name (through the existing gazetteer). The row then also says in how many provinces it is loud.
- One line under the map says what it is drawn from: popular searches per province and places named in coverage; X, TikTok and Instagram give no location. The map does not change with the platform switch.
- The shapes are the 34 provinces of 2017. Figures for the four newer Papuan provinces, if the source has them, are added to the province they were part of, and the guide says so.
- A "Lihat angka" table gives the same content without the map: province, number of issues, the top issue. Shade is never the only carrier: the count is in the tooltip, the table and the list.
- The radar gets its own map component that imports the shapes and helpers. It does not change the Jaringan map's files while the other session works on them.

### Isu yang ramai di Indonesia

- Heading, then a freshness line: "Diperbarui 08.10 WIB, tiap 30 menit". If a platform could not be read in that refresh the line says which.
- A two-sentence brief written by the AI, with numbered references to the rows below. Absent when the AI did not run.
- Category switch with counts: Semua, Politik, Hukum, Ekonomi, Bencana, Sosial, Teknologi, Olahraga, Hiburan, Dunia. Platform switch: Semua, Berita, X, TikTok, Instagram, YouTube, Google. Window: 24 jam, 7 hari. All three use the shared segmented switch (`.pu-segmented`). The choice lives in the address (`cat`, `pf`, `w`) so a view can be shared, and is remembered per viewer.
- An ordered list of ten rows, not cards. A row has: rank; title; category tag (neutral, never colour alone); movement as words with an icon ("Baru", "Naik 4", "Turun 1", nothing when unchanged); one sentence on why it is up; one line of platform figures, each with its unit ("Berita 64 artikel", "X 6,1 rb posting hari ini", "YouTube 2 video tren", "TikTok 300+", "Google 1 rb+ pencarian"); and one action.
- The action is "Pantau" for an issue no project covers, and "Buka project" plus a "Sudah dipantau" tag for one that a project covers. "Pantau" opens Pencarian cepat with the proposed keywords filled in; nothing is collected until the user presses search there. Viewers without owner or admin rights do not get "Pantau".
- With a platform chosen, that platform's figure leads the row. Berita, YouTube and Google order by their own signal (articles, views of the trending videos, approximate searches). X orders by today's count, measured issues first. TikTok and Instagram have no order of their own: the filter shows the measured issues with at least one post found there, in the combined order, under a line that says so. A capped sample never sets an order.
- Movement compares the combined rank with the run nearest to three hours earlier: "Naik n" or "Turun n" from two places up or down, nothing for less or when no such run exists. "Baru" marks an issue first seen less than six hours ago. Movement is shown only with all platforms selected.
- Activating a row opens the existing `EvidenceDrawer`: the sentence on why, with its sources; up to five evidence items per platform in the evidence-card anatomy from DESIGN.md, each linking out; the proposed keywords as read-only chips; and the same action as the row.

States: skeleton rows while loading. Never run: one explanation and, for an owner or admin, "Jalankan sekarang". Stale (older than twice the interval): a notice with the time. Partial: named in the freshness line. AI unavailable: a failed compose keeps the last composed run on the page, marked stale once it is older than twice the interval. Only when no composed run from the last six hours exists does the page fall back to raw lists per platform under a heading that says so, with no categories and no combined rank. A filter with no issue: one sentence and a reset. Balance empty: the existing balance notice; the radar goes on with the free sources.

### Project aktif

A list, one row a project: name; total posts and last collection time; posts in the last 24 hours with the change against the 24 before, in words; unread alerts. The row opens that project's Ikhtisar. "Project baru" leads to Pencarian cepat. Projects with every schedule off sit under a "Dijeda" disclosure. With no project: one sentence and "Buat project".

"Active" means at least one enabled collection schedule.

### Look

Product register, restrained. Existing `--ps-*` tokens, both themes, shadcn components from `src/components/ui/shadcn`, lucide icons, the platform marks already in use. No new colour: category tags are neutral, movement and "Sudah dipantau" use existing status roles. No side stripes, no gradient, no hero number, no card grid. Numbers are tabular and in Indonesian grouping.

## The radar on the server

A refresh has four steps. Each collector can fail on its own; the run records what was missing and carries on.

Discovery on X and the compose step need the hosted AI (`AI_PROVIDER=grok`). On an installation that runs the local model they are skipped: the free signals are still collected and Beranda shows the raw lists, without X. A compose for the local model is not built now.

1. **Collect signals.** News (top stories and the section feeds), Google trending searches for the country and for each of the 34 provinces, YouTube most popular (overall and categories 25, 24, 22, 17, 28), and X discovery: one hosted-AI call with the live X search tool asking for the public issues most discussed in Indonesia in the last 24 hours, keeping only items that come back with post links. TikTok and Instagram have no discovery list; they are measured in step 3.
2. **Compose.** One hosted-AI call (the answer model, no tools) over the numbered signals returns JSON: issues with a neutral Indonesian title, a category from the fixed list, one sentence of reason, the ids of the signals behind it, a keyword proposal in Pencarian cepat's own shape (`q`, `required`, `excluded`), a phrase to count on X, and hashtags; plus the brief. Search terms that are only on province lists and belong to no national issue are grouped into local issues in the same call. Where an issue is loud is never asked of the AI: it is read back from the province lists its search terms came from, with the approximate searches of each. The server checks it: an issue with no existing signal id is dropped, an unknown category becomes "Lainnya", and an issue whose title or reason speaks about the assistant itself is dropped. Public content is not rewritten (see the privacy note below). The previous run's issues are passed in so the same story keeps the same key; keyword overlap is the fallback.
3. **Measure.** For the ten highest issues: the X count for today and yesterday (`countTweets`), and sample posts from X, TikTok and Instagram by keyword. Counts every refresh; samples when an issue enters the ten and then every three hours. News, YouTube and Google figures come from the signals themselves. A sample that fills its limit is shown as "300+", never as a total.
4. **Rank and store.** Rank by the issue's position on each platform where it appears, with more platforms counting for more, so the order can be explained in one sentence in the page guide. Store the run and its issues; keep 30 days.

Schedule: every 30 minutes as its own job, with a lease like the other lanes and its own switch beside the other worker switches in Monitor. X discovery may run every second refresh.

Tables (new): `pulse_radar_runs` (times, state, what was missing, usage) and `pulse_radar_issues` (run, key, rank, title, category, reason, score, per-platform figures, provinces with their approximate searches, evidence, keyword proposal). A run also records which province lists were read.

Routes (signed-in users; refresh is owner and admin only):

- `GET /pulse/radar?window=24h|7d`: the latest run with all its issues, so category and platform filters happen in the browser. Each issue carries the project that covers it, if any. For `7d` the server re-ranks from the stored runs of the last seven days (an issue's scores summed across runs, by key); nothing extra is measured. Until seven days of runs exist the page says since when it counts.
- `GET /pulse/radar/issues/{key}`: evidence and history for the drawer.
- `POST /pulse/radar/refresh`: run now.
- `GET /pulse/home/projects`: the project rows described above.

An issue is "covered" when a project's query matches the issue's title or keywords (`matches_query`).

Payloads pass through `pulse_public`: no model, method or supplier name leaves the server. Only public material (headlines, public posts, video titles) is sent to the hosted AI; nothing from a project is.

This rule is about how PULSE works, not about public content. An issue, headline or post that names an AI company is shown unaltered. The privacy sweep for these routes therefore checks field names and system-written fields, and a fixture issue about an AI company must come through intact.

## Cost

The owner has said cost is not a constraint and will top up. It is still stated, and measured before the schedule is switched on.

- News and Google trending searches, country and 34 provinces: free. About 45 small requests a refresh, spaced out so the source is not hit in one burst.
- YouTube: 6 units a refresh, about 290 of the 10,000 daily units at 30 minutes.
- Hosted AI: estimated USD 0.10 in tokens a refresh, plus live X search at USD 5 per 1,000 posts fetched (50 to 150 posts a discovery call, so USD 0.25 to 0.75). Estimated USD 10 to 20 a day with discovery hourly. An estimate until one real round is measured.
- Social supplier: about 20 calls a refresh for counts and samples, around 1,000 a day. Credits per call are not known for `countTweets`; one count and one small search are measured first, with the balance read before and after, and the daily figure reported to the owner before the lane is switched on.

A script in the style of `pulse_ai_check` runs one real round by hand and prints signals, issues, tokens, cost and credits used. Tests never call the real model or the supplier.

## Build order

Each stage is usable on its own.

1. Beranda with the projects block, the map, and the radar from the free signals (including the province lists) plus the compose step. Routing, sidebar, filters, drawer, states, and movement (it needs only stored runs, so it appears after three hours of history).
2. X discovery and per-platform measurement, with the measured cost reported first.
3. The 7-day window and the hourly sparkline.

## Decisions Claude made (for the owner to check)

1. Beranda replaces Ikhtisar as the first page after sign-in.
2. The ten categories listed above, with Olahraga and Hiburan shown by default because they are what is trending; one press narrows the list.
3. "Google" is shown as a platform name, like YouTube, because it says what the number is. The AI company and the data supplier stay unnamed.
4. Refresh every 30 minutes in the background.
5. No sentiment on national issues.
6. Only the top ten are measured on the paid supplier; lower issues show free signals only.
7. "Pantau" goes through Pencarian cepat so the user sees and can edit the keywords before anything is collected.
8. The radar needs the hosted AI. An installation on the local model shows raw lists per platform, without X.
9. "Naik" and "Turun" compare with three hours earlier; "Baru" means first seen in the last six hours.
10. The TikTok and Instagram filters show at most the ten measured issues, in the combined order, because those platforms give no trend list.
11. The 7-day view is built from stored refreshes, so it fills up over the first week.
12. An issue about an AI company is shown unaltered; the "dapur" rule covers how PULSE works, not the news.

13. The map shows where an issue is searched for, province by province, and where coverage says it happens. It does not claim to show where posts were written.
14. One list beside the map, scoped to the country or to the chosen province, instead of two lists.
15. Local issues appear in their provinces' lists and not in the national ten. An issue found only on province lists is local while fewer than five provinces carry it (rule fixed after the first real round, where an issue on 15 province lists had come out as local).
16. Province shapes stay at the 34 provinces already drawn; the newer Papuan provinces are folded into them.

Items 8 to 12 answer the questions of an independent builder check read on 15 Nov 2026. Items 13 to 16 follow the owner's request for a map.

## Left to the builder

Exact rank weights; the layout breakpoints within DESIGN.md's grid; the sparkline's form; file and function names; how the lease is stored; prompt wording; skeleton shapes.

## To measure before switch-on

- Credits per `countTweets` call and per small keyword search, and which day boundary the count uses (the X figure is labelled "hari ini" only if that holds).
- One real discovery call: posts fetched, tokens, time, and whether `store: false` is accepted with the search tool.
- That the section feeds of the news source still follow the same shape after the redirect.
- That all 34 province codes answer on the trending-searches feed, which codes the newer Papuan provinces use, and that about 35 requests every 30 minutes are not refused.

## Testing

Server: each collector against a stand-in transport, including a failed source; compose validation with a stubbed AI (unknown signal id, unknown category, a model name in the text); key continuity across two runs; ranking with and without a platform filter; project coverage; the privacy sweep on the new routes; the projects route numbers against fixture posts. Also on the server: province attribution read from the lists (never from the AI's answer), a province list that failed, and local issues. Frontend: the map model as pure functions (shade steps, unread against none, the province scope of the list, pins from named places) and the table behind it; the filter and movement model as pure functions; render tests for each state; routing (`/pulse`, the `topic` redirect, the sidebar); a browser test on the copy server. The 502 server tests and 337 frontend tests stay green; tests that assume `/pulse` is Ikhtisar are updated.
