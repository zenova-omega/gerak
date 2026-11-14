# PULSE component layer

The standalone app loads `src/pulse/shadcn.css` (Tailwind utilities only, no GERAK globals). Semantic shadcn colors map to PULSE `--ps-*` tokens, shared across light and dark themes.

## Reuse

- `components/ui/shadcn`: official shadcn Button, Card and Badge sources; isolated from the existing GERAK Card.
- `PulseButton`: backwards-compatible wrapper for branded variants, busy state and safe default button type.
- `AnalyticsPanel`: CardHeader / CardTitle / CardDescription / CardContent / optional CardFooter, with an accessible region label.
- `OverviewAnalytics`: evidence-linked trend, sentiment, platforms and top accounts.
- `postsEvidenceLink`: retains project/global period while clearing unrelated author, sentiment, platform and day filters.

## Evidence and layout

Daily buckets use WIB publication time, not crawl time. Daily drilldown filters posting results without rewriting the global project period. Unknown sentiment is not neutral. Ranking uses observed interactions, not estimated influence or reach. Missing photos use initials. IG/TikTok thumbnails sit left of captions on desktop list view and stack on small screens/grid view.

## Scope and follow-up

This migration covers the shared button foundation, overview panels and post media layout, not every legacy monitoring/network control. No crawler or AI service is enabled by this UI change. Remaining work: migrate legacy forms/tables consistently, test complete keyboard flows, and reduce the large application chunk. Dependency installation reports existing project vulnerabilities; do a separate dependency audit before production release.
