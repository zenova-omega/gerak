# Local response analysis and shared reporting scope

## Implemented

- Written against the local Ollama model (no paid fallback, no download, no additional collection); since 15 Nov 2026 the same workers run on the hosted model when `AI_PROVIDER=grok` (see `operations/pulse-hosted-ai.md`). Existing PULSE_SENTIMENT_ENABLED and AI_PROVIDER switches apply.
- Separate durable results for each posting's expressed stance and each available comment's sentiment and expressed stance. Target is the project's exact label. Supports/opposes refers to explicit approval/disapproval of an action or proposal, not belief in a claim, political affiliation, or the author's identity. Reporting, quotation and vague targets remain unclear.
- Content and target fingerprints invalidate changed evidence; a fenced shared inference lane prevents overlap with caption analysis. Failed jobs have bounded retries. Discovery rotates through stored posts. Comment and post jobs alternate; response and caption workers each receive a turn.
- Result categories open original evidence and model reasons. Unclear/low confidence/truncated inputs are marked for review. Model confidence is not calibrated accuracy. Missing analysis is never neutral.
- Shared project platform selection and publication period apply to overview, posting, accounts, network evidence, sentiment, comments and printable report. Comment scope is based on its parent post's publication date in WIB, not the comment's timestamp. Empty platform selection means no data.
- Reports freeze posting and response results together. A report opened before response results load needs **Perbarui laporan** before printing. Current period/platform are written into the report and retained in print preview.

## Live verification, 2026-11-12 WIB

Existing sources: 230 comments on five Penyadapan Presiden videos; Gibran has no stored comment bodies. Real local inference produced separate comment sentiment/stance results and Gibran posting stance results. Backlog remains processing, not completed.

Chrome verification: selecting YouTube and 2026-11-10 gives 61 posts and 230 available comments. Report and Chrome's six-page PDF preview show the same YouTube scope, date, and 61-post count. No PDF file was saved during this check. Native print dialog was canceled after inspection.

## Limits

- Only available comment snapshots, not every social-media comment or reply.
- Stance depends on a sufficiently specific project label; no manually configurable proposition yet.
- Network filtering trims existing evidence conservatively rather than rerunning its backend analysis.
- Standalone conversation groups now derive from the same filtered posting dataset. Expanded sources, counts, accounts, preview text and ordering are recomputed inside scope. Existing issue IDs preserve membership; no new similarity clustering is performed on the client. The legacy non-PULSE admin route retains its old issue browser.
- Relevance exclusions remain overview-local and are not yet a global reporting filter.
- Native print remains Save as PDF, not a server-generated download.
