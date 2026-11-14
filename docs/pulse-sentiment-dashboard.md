# Sentiment dashboard

Route: `/pulse/sentiment?topic=<project-id>`. Reuses authenticated project analytics, global project date range and existing local sentiment queue. No additional provider calls, model download, cloud AI or quota changes.

- Four explicit categories: positive, neutral, negative, not analyzed. Percentages for labeled categories use labeled posts as denominator; coverage uses all returned posts.
- Stacked daily chart uses publication time in WIB, oldest first. Missing publication timestamps are excluded and counted. Dates without collected records are not invented as zeros.
- Clicking a segment opens posts filtered by project, global period, day and sentiment. Accessible table links offer the same drilldown; date buttons select the explanation panel.
- Explanation panel compares the selected date with its calendar predecessor within the loaded range, not the previous available date. No sentiment delta is shown if either day has no analyzed posts. Partial coverage is explicitly provisional. Unknown counts may be compared independently.
- Up to five matching posts ranked by observed engagement provide caption excerpts, saved sentiment reasons, account links and original source links. This is evidence contribution, not causal inference or political affiliation.
- Platform counts link to platform-plus-sentiment filters. The existing progress component polls every ten seconds and refreshes analytics in the background when completed counts change; progress covers all project dates while chart coverage follows selected dates.

Verification: unit tests for WIB dates, missing timestamps, unknown categories, absent calendar baseline, zero-analysis baseline and ranking; SSR evidence links retain global date range and remove stale author filters. Live browser verified clicking the negative segment for 2026-11-11 opened ten matching posts for the Gibran project. Local model continues existing backfill; completion is not claimed.
