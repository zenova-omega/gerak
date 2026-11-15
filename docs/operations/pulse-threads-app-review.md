# PULSE: Meta App Review for Threads keyword search

Until Meta approves `threads_keyword_search` for the app "Pulse", a search only covers the posts of the account that owns the token. This page lists what the review asks for, where PULSE stands, and drafts of the texts the form wants.

Read on 15 Nov 2026: the app dashboard of "Pulse" (Dashboard, Publish, App settings > Basic, the Threads use case), and Meta's pages "App Review submission walkthrough" (updated 30 Jun 2026), "Keyword and topic tag search" (21 Jan 2026), "Tech Providers", "Access Verification" (23 Oct 2026) and the Platform Terms. The Platform Terms were read in full. Not read: the screen recordings guide (its address returned "page not found") and the Developer Policies.

## Decide this first: is the use allowed?

Two rules decide whether a submission can pass at all. No wording in the form changes them.

1. **Platform Terms, section 3.a.iii, prohibit surveillance.** They define it as processing platform data about people, places, groups or events for law enforcement or national security purposes. If PULSE is operated by or for a body with such a purpose, Threads data may not be used in it, approved app or not. Do not submit in that case.
2. **The permission's allowed use** (as the dashboard words it) is to help the user manage their social media presence. Analytics are allowed on aggregated and de-identified data. PULSE stores each matching post with its author's username and shows posts one by one, which is more than aggregate analytics. Whether Meta accepts topic monitoring by a communications team under this wording is Meta's decision.

Section 3.a.v also prohibits building or adding to user profiles without the user's consent. PULSE fetches no profile data for Threads authors today; keep it that way. Section 3.a.viii prohibits any use other than the permitted purposes in Meta's documentation, which makes rule 2 binding and not only a review criterion.

"Platform Data" in these terms includes usernames and anything derived from the data, aggregated or not (section 12.l). Sentiment labels and summaries made from Threads posts are therefore covered too.

**The form must say who operates PULSE and why.** The drafts below leave that in brackets for the operator to fill in truthfully.

## What the review asks for, and where PULSE stands

| Requirement | Status on 15 Nov 2026 | Who |
|---|---|---|
| One successful API call per requested permission, within 30 days before submitting. The "Request advanced access" button stays grey until Meta has logged it (up to 2 days). | Done on 15 Nov 2026 for both permissions. Repeat the calls if submitting after 15 Dec 2026. | done |
| Business verification of the business portfolio that owns the app. | Not checked here. | business admin |
| "Become a Tech Provider to submit to App Review" (button on the app's Dashboard). | Not started. Access Verification is retired according to Meta's page; what the button asks for now was not opened. | business admin |
| App icon, 1024 x 1024, without Meta's marks. | File ready: `public/pulse/brand/icon-1024.png`. Not uploaded. | app admin |
| Privacy policy URL (the only item the Publish page lists as open). It must be public, readable by Meta's crawlers and not blocked by country (section 4). | Draft: `pulse-privacy-policy-draft.md`. PULSE has no public address to put it at. | operator |
| User data deletion: an instructions URL or a callback. Section 3.d asks for a clearly marked way to request deletion, prompt deletion on request from the person or from Meta, and deletion once keeping the data is no longer needed. | Instructions drafted in the same file. Built on 15 Nov 2026: posts older than `PULSE_RETENTION_DAYS` (365 in this deployment's `server/.env`) are deleted once a day, and `python -m app.pulse_forget request` deletes one account's posts or one link on request. See "Deleting stored posts" below. | operator |
| App category and app purpose. Purpose is "Yourself or your own business" when only people with a role on the app use it. | Empty. | app admin |
| Contact email. | Set. | done |
| Meta can reach the app to test it: a public address, or instructions. Reviewers use their own test accounts. | Missing. PULSE runs on `127.0.0.1` only. A review needs an HTTPS address and a sign-in for the reviewer. | operator |
| A screen recording per permission: 1080p or better, English interface or English captions, no audio, showing a user granting the permission and the app using it. | Not recorded. PULSE's interface is Indonesian, so captions are needed. The permission is granted outside PULSE (Graph API Explorer); record that step too. | operator |
| A usage description per permission, each in its own words. | Drafts below. | operator |
| Data handling questions. | Answered in the form; the facts are below. | operator |
| Redirect, uninstall and delete callback URLs in the use case's Settings. | Empty. Needed for a "connect your Threads account" flow inside PULSE, which does not exist. | later |

Meta states a decision "within a week" after submission. Changing basic or advanced app settings after submitting may trigger a new review. After approval, Meta may end access to a permission the app has not used for 28 days (section 7.e.iii), so the collection has to keep running.

## Facts for the data handling questions

What PULSE does with Threads data today (code: `server/app/services/ingest/threads.py`, `server/app/services/threads_connection.py`):

- **Read from Threads:** `/me` (id, username), up to five ids of the account's own posts (counted, not stored), the token's permissions and expiry, and `/keyword_search` with the fields `id, text, media_type, permalink, timestamp, username, has_replies, is_quote_post, is_reply`.
- **Stored:** for each post that matches a project's keywords: the link, the text, the author's username and the time. Stored in the PULSE database on the PULSE server. No likes, views, insights or profile data.
- **Never done:** publishing, replying, reposting, deleting, or contacting an author through the API. The saved token nevertheless carries every Threads permission; a token limited to `threads_basic` and `threads_keyword_search` needs the authorisation steps in `pulse-threads-api.md`.
- **Processing:** each stored post gets a sentiment and emotion label, and posts are quoted in AI summaries and answers. Since 15 Nov 2026 the prototype sends post text to a hosted AI service for this. For Threads data that is using a service provider: section 5 requires that the provider first agrees in writing to process the data only for the operator and for no purpose of its own, and Meta may ask for the list of providers and proof of the agreements. Running the local model instead (`AI_PROVIDER=ollama`) keeps the text on the server.
- **Shown:** post lists, trend and sentiment charts, account lists by author name, reports and PDF exports that quote posts.
- **Retention:** 12 months from the day a post was published (from the day it was last collected when the source gives no date). Filed reports are not deleted by age.
- **Volume:** only when someone presses "Kumpulkan dari Threads": at most 12 searches a run, 100 posts a search. No schedule.

## Deleting stored posts

Code: `server/app/services/pulse_retention.py`; command: `server/app/pulse_forget.py`. From `server/`:

- `../.venv/bin/python -m app.pulse_forget request --platform threads --author <username>` or `request --url <link>`: counts what a person's request would delete. Add `--apply` to delete. With the post go its figures over time, its analysis rows, its review, its conversation group when no post is left in it, its place in alerts, every stored AI summary of the project, the Tanya AI answers that cite it, its copies in filed reports, the account's profile (picture, followers, location) once no post of the account remains, and the account's comments under other posts.
- `../.venv/bin/python -m app.pulse_forget expired`: counts what is past the retention period; the scheduler deletes it once a day (first run ten minutes after a server start). A stored summary goes only when it cites a deleted post; filed reports stay.

Tried on a copy of the data on 15 Nov 2026: 58 posts older than 90 days and, separately, all 80 posts of one X account were deleted with nothing left dangling. Nothing in the real data is older than 365 days (oldest post: 22 May 2026), so the first deletion by age can happen on 22 May 2027.

Not reached by either path:

- the issue radar's headlines and links (pruned on its own 30-day schedule), and the link a project was started from;
- on deletion by age: figures inside a stored summary that quote a post without citing it, a group's title copied from its first post, and alert titles; a request clears the summaries and the group's title and AI line;
- a person named in AI-written prose without a citation; copies of the database file and backups;
- one comment by its own link: a commenter is deleted by username and platform;
- an account is matched by the name as stored, and a link exactly as stored. Two YouTube channels with the same title cannot be told apart.

Deleting a project now goes through the same code: its posts, what was read from them, its filed reports and the profiles of accounts left with no post are deleted with it. Before 15 Nov 2026 it left analysis rows behind; the 250 such rows found in the real data (queued on 11 Nov 2026, never worked on, holding no result) were deleted that day.

## Drafts for the form (English)

Fill in every bracket. Do not paste a draft that still has one.

### How to access the app

> Pulse is a web application at [https address]. Sign in with the reviewer account [email] and the password given in this form. Pulse does not use a Meta login. After signing in, open the project "[project name]", then "Sumber & Cakupan" (Sources & Coverage) in the left menu, open the "Threads" row and press "Kumpulkan dari Threads" (Collect from Threads). The collected posts are listed under "Posting" (Posts) with the platform filter set to Threads. The Threads account connected to this instance is [@username], an account of [organisation].

### threads_basic

> Pulse uses threads_basic to confirm which Threads account is connected and that its access token is still valid before any other call. It reads the account's id and username, shows the username to the workspace administrator on the Sources & Coverage page as the connected account, and counts up to five of the account's own posts to confirm that reading works. Nothing else from the profile is read, and the posts counted are not stored.

### threads_keyword_search

> Pulse is a media monitoring workspace used by [the communications team of organisation]. [One sentence: what the team is responsible for and why it follows public conversation.] A team member sets up a project with keywords. With the team's own Threads account connected, Pulse sends those keywords to the keyword search endpoint on that account's behalf and shows the team the public posts that mention them: the text, the author's username, the time, and a link that opens the post on Threads. Pulse adds counts over time and a sentiment label per post, and quotes posts in summaries written for the team. A search runs when a team member asks for it, with at most 12 searches per request. Pulse does not publish, reply, repost, delete, or contact authors through the API. Without this permission the team sees only its own posts and cannot learn what is said publicly on Threads about the topics it answers for.

### Screen recording: what to show

Record at 1440 pixels wide or less, mouse only, with a large cursor and English captions for Indonesian labels.

1. The Threads consent window in which the account grants `threads_basic` and `threads_keyword_search` to "Pulse" (from Graph API Explorer: host `threads.net`, "Generate Threads Access Token").
2. Signing in to Pulse and opening the project. Caption the keywords.
3. "Sumber & Cakupan": the Threads row with the connected account and the line that the token may search.
4. Pressing "Kumpulkan dari Threads" and the result notice.
5. "Posting" filtered to Threads: the collected post; open it to show the link back to Threads.
6. The trend and sentiment charts with the Threads post counted.

Before approval a search only returns the connected account's own posts, so publish one post on that account that contains a project keyword before recording.

## Order of work

1. Settle the two rules at the top.
2. Give PULSE (or a review copy of it) a public HTTPS address and a reviewer sign-in.
3. Publish the privacy policy and the data deletion instructions at that address (retention and deletion are built).
4. Business verification, then "Become a Tech Provider".
5. Upload the icon; set category and purpose; enter the privacy policy and deletion URLs.
6. Record the screens.
7. In App Review, request advanced access for the two permissions, paste the descriptions, attach the recordings, submit.
