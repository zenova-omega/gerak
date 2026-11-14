# Project overview

The standalone overview uses ProjectOverview, with project/keyword/date/platform selection in ProjectBar. Shared platform and publication period now carry through analysis and reports (see pulse-response-analysis.md). All five overview sections use the same filtered posts. Relevance selection remains overview-local.

## Evidence contracts

- Executive text is deterministic from observed posts, not generated claims. A bounded publication period compares the immediately preceding equal-length inclusive WIB period. An unbounded period has no percentage comparison. Zero baseline yields an absolute difference only. Collection coverage can differ between periods.
- Unique content conservatively merges NFKC-normalized identical title and text (case/whitespace-insensitive). Different video titles with the same boilerplate description remain separate. It does not claim semantic syndication detection. Empty content remains separate posts.
- Narrative groups use the existing issue IDs (text similarity grouping) and show original text as an example, not a verified narrative label. Only groups containing multiple selected posts are shown.
- Publication chronology is separate from first observation, derived from earliest stored metric snapshot. Latest crawled_at is only a refresh timestamp, never treated as first discovery.
- Relevance review is reversible and project-scoped. Overview excludes posts explicitly marked irrelevant by default. The posting page retains them. Original AI labels are unchanged by manual labels.
- Quality agreement uses only manually labeled and AI-labeled pairs in the selected overview scope. It is not a population accuracy estimate. Review queue includes explicit flags, label disagreements, and saved confidence below 0.65 (triage heuristic, not calibrated probability).
- Caption tone remains separate from the local response-analysis panel's comment sentiment and expressed stance. Comment examples are actual available YouTube comments, ranked by likes. Missing results are explicitly unavailable, never neutral.
- Metric growth uses like/comment/share fields available at both observations with identical field coverage. It does not extrapolate lifetime metrics into history. See pulse_growth.py for reset and timestamp handling.

## Interaction

Chart dates, accounts, narratives, top posts, sentiment categories, and growth rows open an inline evidence panel (up to 20 posts, count disclosed). Original source links and existing media previews remain available. No view/filter action invokes paid collection.

## Remaining work

Local diagnostic run (2026-11-12): installed qwen2.5:14b evaluated 15 synthetic examples, with 11/12 gold labels matched and 3 ambiguous examples requiring review. The error was a quotation labeled negative instead of neutral. This diagnostic uses its own prompt, not the production worker prompt, and is not evidence of real-project accuracy. No paid API or model download was used.

Semantic near-duplicate/syndication classifier; calibration on a representative manually labeled sample; reviewed exclusions consistently applied to standalone PDF exports. These are not presented as completed capabilities. Standalone conversation groups now share the project's platform and period scope.
