# PULSE project keyword builder

## Existing support

`ProjectBar.jsx` already saved an explicit project query through `useTopics`.
`projectQuery.js` already mapped comma-separated main terms to OR, required
terms to AND, and excluded terms to NOT. It quoted phrases, removed exact
duplicates, rejected reserved punctuation/newlines, enforced the 250-character
builder limit, and only parsed queries that exactly round-tripped through the
builder. Other queries opened in Boolean mode. No automatic crawl was part of
the save flow.

The inspected `WatchTopicCreate`, `WatchTopicUpdate`, topic response, and
`WatchTopic` model support `query`, not a keyword-builder config object. Seed
JSON is for the reference post, not keyword metadata. This change neither
repurposes that JSON nor adds unsupported request fields or backend changes.

## New behavior

The editor has four labeled inputs, an Indonesian plain-language explanation,
the exact generated Boolean query, and a character count. Existing theme tokens
and a two-column desktop/single-column narrow layout keep this a product form,
not a new dashboard surface. Chip removal targets are at least 44px tall.

| Input | Stored query mapping |
| --- | --- |
| Istilah utama | Main `any`: one or more quoted OR alternatives |
| Variasi istilah | Additional alternatives in the same main `any` group |
| Konteks wajib | `all`: each term appended with AND |
| Istilah yang dikecualikan | `exclude`: each term appended with NOT |
| Akun personal publik (opsional) | `@nama` terms in the same main `any` group. Accepts `@nama`, `nama` or a profile link (X, Instagram, TikTok, Threads); anything else is refused. |

Accounts are searched as mentions in post text (replies and tags), not as the account's whole timeline, and an account joins the OR group, so a required AND context still applies to it. Only public accounts of figures, parties or institutions are meant here. They reopen under main terms, like variations. Added 15 Nov 2026 for reputation work on a public figure.

Example: main `transportasi`, variations `angkutan`, required `Jakarta, publik`,
excluded `iklan` saves:

```text
("transportasi" OR "angkutan") AND "Jakarta" AND "publik" NOT "iklan"
```

Variations are manually entered, never inferred or fetched. They do not create
an additional AND group. Exact duplicates across main and variations collapse;
case is preserved. At least one main term is required. Commas delimit terms;
embedded commas require advanced mode.

### Persistence and draft safety

- Only explicit **Simpan perubahan** / **Buat project** submits a request.
  Typing, removing chips, previewing, and changing keyword mode do not save.
- Variations persist in the query's OR group, not as separate metadata. After
  reopening, they appear under main terms. The UI explains this limitation.
- Switching from builder to Boolean mode copies only a valid builder draft.
  Invalid drafts remain visible for correction, instead of restoring old text.
- Switching back parses the current Boolean draft, not the initial saved query.
  Its OR alternatives appear under main terms. Unsupported syntax disables the
  builder switch and remains editable in Boolean mode, without approximation.
- Advanced query text is submitted verbatim (including surrounding whitespace).
  Blank-only input still fails validation. Existing any/all/exclude behavior is
  unchanged, and no automatic migration is performed.
- Preview describes intended Boolean matching, not verified provider results.
  Existing warnings about provider differences and the Xpoz limit remain.
- Saving does not request collection or enable a schedule. No provider calls,
  live project writes, browser checks, or running-service restarts were used to
  implement this change.

## Local regression checks

```sh
node --test src/pulse/keyword-builder.test.mjs src/pulse/keyword-editor.test.mjs src/pulse/projectQuery.test.js
```

New tests cover variant OR mapping, validation, explanation, lossless query
round-tripping, conservative legacy parsing, four labeled controls, invalid-save
state, read-only fieldset, and headless rendered preview. They do not claim
browser interaction or provider integration coverage.

Verification on 12 November 2026: 11 focused tests passed; targeted source lint
passed. The broader non-browser frontend run passed 106 of 107 tests.
`src/pulse/overview-evidence.test.mjs` failed its `Konten unik` assertion against
the current overview, outside this change's ownership. Browser tests were
excluded, and backend tests were not run. Other headless suites emitted Vite
WebSocket port-conflict, stale Browserslist, and React SVG title warnings. The
new keyword-editor harness disables WebSockets explicitly.
