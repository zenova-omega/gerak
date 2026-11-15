# PULSE demography: who is speaking, on Akun & sumber

Asked for by the owner on 15 Nov 2026 ("Tambahkan fitur demography … data apa yg ada … infographic apa yg relevant"). The readers are political figures and their teams; the decision it serves is how to run a campaign or handle an issue. The owner chose "Data yang ada saja" (no estimated age or gender) and "Di Akun & sumber" (no new page).

## Intent

A political team looking at an issue needs to know who is carrying it and how each kind of speaker feels: is it ordinary accounts or a few large ones, the press or the public, which group is the most negative, and where the accounts say they are. That tells them whom to answer, whom to reach, and whether an issue is a wave or a push. PULSE holds no age, gender, occupation or religion for the accounts it reads, and none of its sources reports them; this feature shows only what the sources do report, and says how much of the conversation each figure rests on.

## What the data holds (measured on the live database, 15 Nov 2026)

| Field | Where it comes from | Share of posts it is known on (three largest projects) |
|---|---|---|
| Platform | every post | 100% |
| Voice: news or social media | `voice_v1` (`src/lib/pulseVoice.js`: platform `news` is Pemberitaan, the rest Suara warganet) | 100% |
| Follower count of the author | `metrics.author_followers`, attached from `pulse_account_profiles` by `pulse_profiles.attach_profiles` | 61% to 85% of social posts (YouTube 100%, X 58% to 84%, TikTok 57% to 68%, Instagram 4% to 46%, Threads and Reddit 0%); news never |
| Country the platform names for an X account ("based in") | `pulse_account_profiles.based_in`; **not yet attached to posts** | 43% to 62% of X posts |
| Province from the location an X owner wrote on the profile | `metrics.author_location`, read by `provinceOfLocation` (`src/lib/pulsePlaces.js`) | 14% to 25% of X posts |
| Tone and emotion | `tone_share_v1`, `metrics.emotion` | about 95% to 99% |

Not available from any source: age, gender, occupation, education, religion, ethnicity.

## Goals

- One section at the top of Akun & sumber that answers "who is carrying this issue, and how does each group feel", led by sentences counted from the data and backed by pictures that open the posts behind them.
- Every figure defined once as a rule with a name and version, implemented in both runtimes from shared cases (the pattern of the calculation dictionary, parts 1 and 2).
- Every figure states what share of the selection it rests on.

## Non-goals

- Age, gender or any other attribute the sources do not report, estimated or otherwise.
- Telling apart media, creators and private persons among social media accounts. No source says which an account is; a list or a guess would be an invented classification. Voice stays `voice_v1`, and size (followers) is the axis within social media.
- The report and Tanya AI. The rules are written so both can read them later; this work does not change either.
  One exception follows from `account_origin_v1` being the one rule for X account locations: Tanya AI's account locations (`location_summary`) and the report's X-account location figures (`accountSpread`, read by `pulseReportPages.js`) now count by it, so every X account counts and two spellings of one handle are one account.
- A new page or a new menu item.

## Anti-goals (it has failed if)

- A figure presents an attribute of a person that no source reported.
- Any picture or list labels individual accounts with political leanings, or offers a list of individuals by group for targeting. (X's developer terms forbid profiling individuals by political affiliation; Meta's forbid inferring sensitive characteristics.) Groups are shown as counts; the names shown are the accounts already shown in the account ranking, with their posts.
- A group's tone is called "most negative" on a handful of posts.
- The section makes the page below it jump while it loads.

## Approaches considered

1. **A section in Akun & sumber (chosen).** The page already answers "who" and holds the account ranking, so a group leads straight to its accounts. Only this session's files and new files change, so it does not collide with the account identity work (dictionary task 4) in progress in another session.
2. **A new "Demografi" page.** Easiest to find, but it repeats the platform split (Akun & sumber), the account location map (Jaringan) and the public/news split (Sentimen), and needs `PulseDashboard.jsx`, which task 4 is editing.
3. **Estimated gender from display names.** Declined by the owner: data that exists only.

## The readings (calculation dictionary, part 3)

All take posts already scoped to the project bar's period and platforms (and the page's sentiment scope, as Akun & sumber already applies). "Account", "interactions", "tone" are part 1's `account_v1`, `interactions_v1` (totalled with `interactions_total`), `tone_share_v1`.

### `followers_v1`: an account's follower count

The figure on the account's most recently collected post that carries one (`crawled_at`, then `first_observed_at`); with no collection time, the larger figure. A count that is not a whole number of zero or more is not reported. This is the rule `followerIndex` in `src/lib/pulseAccountFilters.js` applies today, keyed by `account_v1` instead of its own key. `followerIndex` should call it once task 4 has settled the account key (sent to that session as an open point; this work does not edit that file).

### `account_tier_v1`: the size of a speaker

- Posts with voice `news` form the row **Pemberitaan**, whatever their source.
- A social media post belongs to its account's tier by `followers_v1`: **≥1 jt**, **100 rb – <1 jt**, **10 rb – <100 rb**, **1 rb – <10 rb**, **<1 rb**, or **Pengikut tidak diketahui** when the account has no follower count.
- Per row: accounts, posts and their share of all posts in the selection, interactions (`interactions_total`: value and the posts it rests on) and their share of the selection's known interactions, tone shares and the analysed count, the posts and known interactions of each platform (most posts first), and the three accounts with the most interactions (ordered as every list by interactions is).
- The shares of posts add up to 100% across all rows. Interaction shares are over the known interactions, and the row says on how many of its posts they are known.
- Coverage: the share of social media posts whose account's follower count is known, and the share of social media's known interactions that come from those accounts (`followersKnownShare`, `followersKnownInteractionShare`; Pemberitaan is in neither base). The two can differ widely: on the largest project, 86% of posts but about 31% of interactions.

### `account_origin_v1`: where X accounts are

X only; other platforms report no location. **One rule for every place that counts X accounts by location**: this section, the "Lokasi akun X" map and the Jaringan summary card (`accountSpread` in `src/lib/pulsePlaces.js`), and what Tanya AI is told (`location_summary` in `server/app/services/pulse_places.py`). Today those two count in their own way (keyed by `author_id ?? author`, only accounts with a dated post, the location of whichever post is read last); this work moves both onto the rule and updates their shared place cases, so a figure here and on the map one click away can never differ.
- **Per account** (`account_v1`): the location text and the "based in" value of its most recently collected post that carries them, as `followers_v1` reads followers.
- **Base**: every X account in the selection. It splits into accounts the profile job has not asked yet (no `author_location` on any post), accounts whose owner wrote no location (`''`), and accounts with a location text. Every share says which base it is over.
- **Country**: the platform's "based in". `Indonesia`; another country (**luar negeri**); a region only, such as "Southeast Asia" or "East Asia & Pacific" (**hanya wilayah**: a region can include Indonesia, so it is never called abroad); or none. Needs the server to attach `metrics.author_based_in` next to `author_location` in `attach_profiles` (one line; the profile job already stores it).
- **Province**: `provinceOfLocation` of the location text; a text that names no province (a city abroad, "Bumi") has none.
- Per country group and per province: accounts, posts, tone shares. Up to 8 provinces, most accounts first, ties by posts then name.
- Both state their base: "provinsi terbaca pada N dari M akun X (P%)".
- The map keeps its timeline on top of the rule: an account appears on the day of its first dated post.

### `group_lead_v1`: the sentences that open the section

Built from the readings above, never by a model. `groupLead` / `group_lead` decide what may be said and return it as data (both runtimes, shared cases); `leadSentences` only writes it, and the page shows what it writes. The rows a sentence may name are the five tiers and Pemberitaan; "Pengikut tidak diketahui" names a gap in the data, not a kind of speaker, and is never named as one.
- **At least two rows to compare**: "who carries it" and "most negative" are said only when at least two nameable rows are left to compare (for "most negative", at least two rows that reach 20 analysed posts); with one row there is nothing to compare and the sentence is left out.
- **Who carries it**, on each measure (posts; known interactions), counted in whole posts and interactions: the nameable row with the most is named only when its lead over the next nameable row is larger than what "Pengikut tidak diketahui" holds on that measure, since accounts whose follower count is unknown could overturn a smaller lead (a tie is no lead). Both named: one sentence, "Paling banyak ditulis akun <1 rb (61% posting), tetapi interaksi terbesar dari akun ≥1 jt (47% dari interaksi yang tercatat).", said once when it is the same row ("Paling banyak ditulis dan paling besar interaksinya dari …"). One named: "Paling banyak ditulis akun <1 rb (61% posting)." or "Interaksi terbesar dari akun ≥1 jt (47% dari interaksi yang tercatat)." An interaction share is always said to be of the known interactions.
- **The gap instead**: when "Pengikut tidak diketahui" holds more than 0 and at least as much as the leader on a measure, that measure's sentence states the gap and the two platforms it mostly sits on (reported data), each with its share of the gap: "Sebanyak 69% dari interaksi yang tercatat berasal dari akun yang pengikutnya tidak diketahui; dari bagian ini, 68% di Instagram dan 31% di TikTok." (posts: "Sebanyak 50% posting berasal dari …"; one platform: "; seluruhnya di Instagram."). When no row can be named and the gap is smaller than the leader, nothing is said on that measure. Posts come before interactions.
- **Most negative group**: among the nameable rows with at least 20 analysed posts, the highest negative share (ties: more analysed posts, then row order), with its count: "Paling negatif: akun 10–100 rb, 54% dari 300 posting yang dianalisis." A row with no negative post (0%) is never named. When "Pengikut tidak diketahui" also has 20 analysed posts, the sentence says the comparison leaves out the accounts whose follower count is unknown ("Paling negatif di luar akun yang pengikutnya tidak diketahui: …"), and when that row is more negative a clause says so with its share and base ("; akun yang pengikutnya tidak diketahui lebih negatif (53% dari 950 posting yang dianalisis)").
- **Where**: the province with the most X accounts, with the share of X accounts whose province is read. Left out when fewer than 10 accounts have one.
- **Narrowed to one sentiment**: when Akun & sumber shows one sentiment only (`?sentiment=…`, which the page applies to its posts), the tone column and the most-negative sentence are not shown, and one line says they need every sentiment. The rules themselves do not change.
- **Why the gap rule**: on the largest project (15 Nov) the first version said "Paling banyak ditulis akun <1 rb (17% posting), tetapi interaksi terbesar dari akun 100 rb–1 jt (10%)" and "Paling negatif: akun <1 rb, 37% dari 1.391 posting yang dianalisis", while <1 rb led ≥1 jt by one point beside 11% of posts with unknown followers, and the unknown row held 69% of known interactions (mostly two accounts close to the project's subject, on Instagram and TikTok) and was the most negative (53% of 950). Both sentences pointed the reader at the wrong accounts; a shared case of that shape now holds the rule.

## Where it is shown

Akun & sumber, first block of `AccountsInsights` (`src/pulse/PageExtras.jsx`), above "Konsentrasi percakapan". Title "Siapa yang bicara". Sketch at a laptop width:

```
Siapa yang bicara
  Paling banyak ditulis akun <1 rb (61% posting), tetapi interaksi terbesar dari akun ≥1 jt (47% dari interaksi yang tercatat).
  Paling negatif: akun 10–100 rb, 54% dari 300 posting yang dianalisis.
  Akun X paling banyak dari DKI Jakarta (158 akun); provinsi terbaca pada 19% akun X.

  Kelompok          Akun   Posting           Interaksi         Nada
  Pemberitaan        549   ▇▇▇▇ 16%          —                 ▇▇▇▇▇▇▇▇░ netral 85%
  ≥1 jt               40   ▇ 4%              ▇▇▇▇▇▇▇ 47%       ▇▇▇▇▇▇░░░
  100 rb–1 jt        …
  …
  Pengikut tidak diketahui …
  Pengikut diketahui pada 85% posting media sosial dan 60% interaksi media sosial yang tercatat.

  Asal akun X:  Indonesia ▇▇▇▇▇▇▇▇ 88% · hanya wilayah 3% · luar negeri 1% · tidak diketahui
  Provinsi: DKI Jakarta 158 · Jawa Barat 46 · … (each with its tone bar)
```

- Rows are one grid (group, accounts, two share bars, one tone bar), not cards. The posts bar and the interactions bar use two series colours with a key; the tone bar uses the sentiment colours of the Sentimen page.
- A row opens the shared evidence drawer with its posts; the three named accounts appear in the drawer heading with `AccountAvatar`.
- The country and province block links to Jaringan with the map open on its "Lokasi akun X" layer (today `?focus=map` opens "Tempat disebut"; a parameter for the account layer is added in `NetworkAnalysis.jsx` / `RegionSpreadMap.jsx`, which task 4 does not hold).
- At phone width the grid becomes one block per group (figures stacked), with no sideways scroll.
- Nothing is drawn for a group with no posts; an empty selection shows nothing; while posts load, the block keeps its height.

## How it is built

- Browser: `src/lib/pulseDemography.js`; server: `server/app/services/pulse_demography.py`; shared cases `shared/pulse-demography.cases.json`, read by `src/lib/pulseDemography.test.js` and `server/tests/test_pulse_demography.py`. They import part 1's functions, as part 2 does.
- Places: `accountSpread` (`src/lib/pulsePlaces.js`) and `location_summary` (`server/app/services/pulse_places.py`) call `account_origin_v1`; their shared place cases follow.
- Server payload: `attach_profiles` in `server/app/services/pulse_profiles.py` adds `author_based_in`. That file belongs to the profile work committed by another session (`1ebaf4d`): tell that session before editing.
- Picture: `src/pulse/WhoIsSpeaking.jsx` and `src/pulse/ds/who-is-speaking.css`, built from the design system (`--ps-*` tokens, the chart series and sentiment colours, `AccountAvatar`, the shared evidence drawer); no new package.
- The rule list (`GET /api/admin/pulse/measures`, in `server/app/routers/pulse.py`) is left as it is for now, as part 2 did: the route file and part 1's module may collide with task 4. The four rules' Indonesian sentences live in the two new modules and join the list with part 2's when that route is settled.

## Constraints

- Other sessions edit this checkout. Task 4 (account identity) is editing `pulse.py`, `pulse_network.py`, `pulseOverview.js`, `pulseProjectFilters.js`, `pulseConversationGroups.js`, `pulseReport.js`, `pulseReportPages.js`, `pulseReplay.js`, `pulseAccountFilters.js`, `EvidencePosts.jsx`, `NarrativePanel.jsx`, `ReportPages.jsx`, perhaps `AccountRankingRow.jsx`, `PulseDashboard.jsx`, `NetworkExplorer.jsx`. This work does not edit those; it calls their exports where it needs them.
- Checks run on a copy of the database; the live server is not restarted for this (the server change goes live at the next restart, announced first).
- No model, engine or supplier name in any payload or page. No commit unless the owner asks.

## Decisions Claude made (for the owner to check)

Items 7 to 10 settle the questions a builder asked after reading the first draft.


1. Tier bounds 1 rb, 10 rb, 100 rb, 1 jt, and news as its own row instead of a tier.
2. Social media accounts are not split into media, creators and private persons.
3. "Most negative" needs at least 20 analysed posts in the group.
4. Up to 8 provinces; the "where" sentence needs at least 10 X accounts with a province.
5. The platform's "based in" country is shown, labelled as what the platform says; a region-only value is its own group ("hanya wilayah"), never "luar negeri".
6. The report and Tanya AI's new sentences are left for later (Tanya AI's account locations do move onto `account_origin_v1`).
7. `account_origin_v1` is the one rule behind the map, the Jaringan card and Tanya AI's account locations (from the owner's rule that every figure is counted one way); its base is every X account in the selection, with not-yet-asked and no-location accounts counted apart.
8. The opening sentences never name "Pengikut tidak diketahui"; they may name Pemberitaan.
9. Under a one-sentiment filter the tone column and the most-negative sentence are hidden.
10. The four rules join `GET /measures` later, with part 2's.
11. (Fix wave, after the real figures.) A group is named as carrying posts or interactions only when its lead is larger than what accounts with an unknown follower count hold on that measure; otherwise the lead says the gap and its two largest platforms. "Paling negatif" says it leaves out the accounts whose follower count is unknown when that gap has 20 analysed posts, and adds the gap's tone when it is more negative. The coverage line states interactions beside posts.

## Left to the builder

Function names; the cases file's shape (follow parts 1 and 2); Indonesian wording within the product's copy rules; how the grid and bars are drawn within the chart rules in DESIGN.md.

## Testing

Shared cases in both suites, including: an empty selection; a selection of news only; accounts whose follower count changes between posts; posts without an author; a tier with fewer than 20 analysed posts; X accounts with a location that names no province and with none at all; no X posts; a lead equal to and one larger than the unknown row's count; a row with no negative post; a selection shaped like the largest project (a near-tie on posts, the unknown row at 69% of known interactions on Instagram and TikTok and the most negative). Every shared origin case also checks that `accountSpread` and `location_summary` count what `account_origin_v1` counts. A rendering test for the section's states (nothing, thin data, full data). A browser check on the copy in both themes and at phone width.
