# PULSE mention workspace refinement

Reference: the user's Brand24 Influencers & Sources screen, inspected read-only
in Chrome on 2026-11-11. The page showed a session-expired notice but its existing
navigation, filters and ranking table remained visible. No subscription changes.

Impeccable product guidance influenced the implementation: compact neutral
surfaces, predictable controls, progressive disclosure and truthful missing-data
states. PULSE branding and both themes are retained.

## Shipped

- Posting defaults to a readable single-column list; media grid is optional.
- Desktop quick filters use platform and sentiment checkboxes; counts respect
  other active filters. Below 1200px the existing full-filter drawer remains.
- Timeline and global project date editor are expandable. The selected period
  stays visible. Date filtering still applies across the project.
- Caption previews avoid repeating a title that is already a caption prefix.
- Ranking rows show stored profile photos or initials, and link to that exact
  account's posts on the matching platform. Project and alert scope are retained.
- Navigation places reading and analysis before collection operations.

No new collection, AI sentiment classification, reach estimation, or provider
permissions are introduced. Broken/expired media URLs retain the explicit
fallback; no fake portraits, thumbnails, or sentiment are substituted.

## Verification

- Live stored project: 451 posts; Instagram + TikTok selects 25.
- Account drilldown opens exactly 2 posts for the tested Instagram account.
- Empty platform selection displays 0 results and recovery action.
- List/grid switch, full-filter drawer and dark/light themes exercised in browser.
- At 390px viewport: document width 390px, no horizontal page overflow.
- Frontend non-browser suite: 80 tests passed. Legacy external-browser test is
  excluded; browser checks above were performed through the authorized UI session.
- Production build passes with existing Browserslist age and >500kB chunk warnings.

This pass improves the mention and account workflows, not feature parity with
Brand24 across the entire product.
