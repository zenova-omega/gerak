# PULSE: collecting Threads through Meta's official API

Read from Meta's documentation on 15 Nov 2026 (`developers.facebook.com/docs/threads`). PULSE tests the connection (`POST /api/admin/pulse/sources/threads/check`) and collects a project's posts by keyword on request (`POST /api/admin/pulse/sources/threads/collect`, the "Kumpulkan dari Threads" button on Sumber & Cakupan). Until Meta approves the search permission, a search returns only the posts of the account that owns the token.

## Steps

1. **Meta developer account and app.** At `developers.facebook.com`, create an app and choose the Threads use case. Note the Threads app ID and app secret.
2. **App settings.** Fill in the valid OAuth redirect URI, a deauthorize callback URL and a data deletion request URL. For publishing the app also needs an icon (512 to 1024 px), a privacy policy URL and data deletion instructions.
3. **Permissions.** Add `threads_basic` (needed for every call) and `threads_keyword_search`.
4. **Tester.** In the app dashboard: App roles, Roles, Add People, Threads Tester. The Threads account then accepts the invitation in Threads under Account settings, Website permissions. A tester can grant permissions while the app is in development.
5. **Authorise.** Open `https://threads.com/oauth/authorize?client_id=<app id>&redirect_uri=<redirect>&scope=threads_basic,threads_keyword_search&response_type=code`, approve, and take the `code` from the redirect (valid one hour, single use).
6. **Short-lived token.** `POST https://graph.threads.com/oauth/access_token` with `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code`. The token lasts one hour.
7. **Long-lived token.** `GET https://graph.threads.com/access_token?grant_type=th_exchange_token&client_secret=<secret>&access_token=<short token>`. It lasts 60 days. Put it in `server/.env` as `THREADS_ACCESS_TOKEN` (never in the repository or in chat).
8. **Keep it alive.** `GET https://graph.threads.com/refresh_access_token?grant_type=th_refresh_token&access_token=<token>` once the token is at least a day old and before it expires; each refresh gives another 60 days. An expired token cannot be refreshed: repeat steps 5 to 7.
9. **Business verification and App Review.** Advanced access needs a verified business. Submit the app for review with `threads_keyword_search`: a working test version, testing instructions, the use-case description, and the data handling questions. What the review asks for, where PULSE stands and drafts of the form texts are in `pulse-threads-app-review.md`.
10. **After approval**, searches cover public posts: `GET https://graph.threads.com/v1.0/keyword_search?q=<keyword>&search_type=RECENT&since=<date>&limit=100&fields=id,text,media_type,permalink,timestamp,username,has_replies,is_quote_post,is_reply`.

## Limits and conditions stated by Meta

- 2,200 searches per rolling 24 hours per user across all apps; searches without results do not count; up to 100 results a search. How further results are paged is not stated.
- `search_mode=TAG` searches hashtags; `media_type` narrows to TEXT, IMAGE or VIDEO; `author_username` narrows to one account.
- The permission is for showing public content that a business user searches for; use in a consumer app is prohibited. Analytics are allowed on aggregated, de-identified data. Storage and retention limits for Threads data were not stated on the pages read: check the developer policy before the review.
- A permission grant lasts 90 days.

## Getting a token that may search (measured 15 Nov 2026)

- **The dashboard's "User Token Generator" does not give the search permission.** The token it issued for app "Pulse" carries `threads_basic`, `threads_content_publish`, `threads_manage_replies`, `threads_manage_insights` and `threads_read_replies`, whatever permissions the use case lists. It lasts 60 days. A keyword search with it is refused: HTTP 403, error code 10, "Application does not have permission for this action". It can also post and reply on the account, which PULSE never does.
- **Graph API Explorer** (`developers.facebook.com/tools/explorer`) has a host choice `threads.net`. With it selected and "Meta App: Pulse", the button reads "Generate Threads Access Token" and opens the Threads consent window. The token it issued on 15 Nov 2026 carries `threads_keyword_search` together with every other Threads permission (publish, delete, replies, mentions, insights, profile discovery, location tagging, share to Instagram), and lasts about two hours. PULSE only reads; a token limited to `threads_basic` and `threads_keyword_search` needs steps 5 to 7.
- **Saving a token.** Copy it in the browser, then from `server/`: `pbpaste | ../.venv/bin/python -m app.pulse_threads_token`. The command asks Meta what the token may do, writes it over the old `THREADS_ACCESS_TOKEN` line in `server/.env`, and prints the app name, the permissions, whether keyword search is among them and the expiry. It never prints the token, and says "TIDAK BERUBAH" when the pasted token is the one already saved. Restart the server afterwards.
- **Making it last 60 days.** Copy the "Threads app secret" (Use cases, Access the Threads API, Settings, Show; not the "App secret" under App settings), then: `pbpaste | ../.venv/bin/python -m app.pulse_threads_token secret`. It saves `THREADS_APP_SECRET` and swaps the saved token for a long-lived one, sending its inputs in the request body. Run for real on 15 Nov 2026: the swap worked, and the long-lived token kept the expiry of the account's earlier long-lived token (14 Jan 2027) rather than a fresh 60 days.
- **With the Explorer token a search is accepted** (15 Nov 2026): three words asked, no refusal, no rows. That is the expected answer before App Review: only the token owner's posts are searched, and the account has none.

## What the code does

- `server/app/services/ingest/threads.py`: one `keyword_search` call per search word (`search_type=RECENT`, 100 results, `since` = the project's day range), at most 12 words a run. The API takes one word or phrase, so a project's query is split by `search_words` (`ingest/query_match.py`): every alternative joined by OR is asked for; of parts joined by AND, only the first. Each post that comes back is then checked against the whole query with `matches_query`. Nothing is retried. A refusal that asking again cannot cure ends the run with a reason: `permission`, `token`, `quota` or `network`.
- `server/app/services/threads_connection.py`: the connection check reads the token's permissions and expiry from `debug_token` (sent in the request body, so the token is never in an address). `GET /me/permissions` answered HTTP 500 on 15 Nov 2026 and is no longer used.
- The sources page shows the account, the expiry, whether the token may search, and the reason of the last refused collection. The collect button is enabled only when the stored connection check says the token carries the search permission.
- Hosts: `graph.threads.net` and `graph.threads.com` gave the same answers on 15 Nov 2026. The code uses `graph.threads.net`.
- Not built: a schedule. Threads is not a lane of the monitor; it is collected only when the button is pressed. Add the lane once a search returns public posts.
- Not known until a search succeeds: whether a `q` of several words means all of them or a phrase, and how further results are paged.

## Where PULSE stands (15 Nov 2026)

- The Meta app "Pulse" exists, in development, with the "Access the Threads API" use case. `threads_basic` and `threads_keyword_search` are added and "Ready for testing". The Threads account is a tester and has accepted. Redirect, uninstall and delete callback URLs, the privacy policy URL and the terms URL are empty.
- A long-lived token is saved (from Graph API Explorer, swapped with the app secret; valid until 14 Jan 2027; all eleven Threads permissions). A search is accepted and returns nothing, because before App Review only the account's own posts are searched and it has none. Nothing refreshes the token yet: before 14 Jan 2027 call the refresh in step 8 or save a new one.
- The dashboard describes `threads_keyword_search` as meant "to help the user manage their social media presence", and `threads_profile_discovery` as access to public profiles and their posts "to conduct competitor analyses". Read both against PULSE's use before App Review.
- The data supplier used for X, Instagram and TikTok offers no Threads tool.

## Jalur pencarian publik berbayar (SocialCrawl)

Bila `SOCIALCRAWL_API_KEY` diisi di `server/.env`, Threads dikumpulkan lewat pencarian SocialCrawl
(`server/app/services/ingest/socialcrawl.py`), bukan API resmi. Jalur ini menjangkau semua posting publik tanpa
menunggu persetujuan aplikasi.

- **Lengkap, tanpa batas lokal.** Setiap pengumpulan mencari semua kata pencarian project sampai halaman terakhir,
  pada rentang hari project (bawaan 7 hari). Pengumpulan hanya berhenti bila sumber menolak, termasuk saat kredit habis.
- **Otomatis.** `pulse_threads_auto.py` mencari setiap project yang dipantau (punya minimal satu jadwal aktif) setiap
  `PULSE_THREADS_AUTO_MINUTES` menit (bawaan 120; 0 = hanya lewat tombol). Project baru ikut dengan sendirinya.
  Setelah kredit diisi ulang, pengumpulan lanjut sendiri pada putaran berikutnya.
- **Isi tiap posting:** teks, username, nama tampilan, id akun, centang verifikasi, foto profil, waktu terbit, jumlah
  suka, balasan, repost, kutipan, tagar, dan media. Sumber ini tidak memberi lokasi posting maupun lokasi akun;
  tempat yang disebut di dalam teks tetap dibaca seperti sumber lain. Tautan foto profil dan media kedaluwarsa
  dalam hitungan jam.
- **Biaya terukur 15 Nov 2026:** sekitar 1 kredit per 15 posting yang dibaca. Satu pencarian penuh 7 hari memakai
  6 sampai 7 kredit per project (96 sampai 114 posting dibaca).
- **Kecepatan:** satu panggilan 45 baris selesai dalam 10 sampai 40 detik. Panggilan 100 baris pernah melewati dua
  menit, jadi halaman dibuat 45 baris. Satu kata yang tidak dijawab dilewati; dua berturut-turut menghentikan putaran.
- Sisa kredit dibaca dari setiap jawaban dan tampil di halaman Sumber. Cek tanpa biaya:
  `GET https://www.socialcrawl.dev/v1/credits/balance` dengan header `x-api-key`.
- Nama pemasok tidak dikirim ke browser; halaman Sumber hanya menyebut "pencarian publik".
- Kosongkan kuncinya untuk kembali ke API resmi.
