# Batch two verification, 13 November 2026 (WIB)

## Implemented
- Immutable version-1 snapshots in `pulse_reports`, authenticated list/create/read API. Owner/admin/analyst may save; viewer read-only. CSRF and project membership checked. Date/platform scope and nested report inputs validated. Renderer recalculates derived values from frozen inputs.
- Laporan includes save/list/reopen controls. JSON download and browser Print/PDF remain. Unsaved frozen drafts are not durable; server-saved archives are. Scope changes return to a live draft; reopened archives explicitly retain their own period/platforms.
- Sentimen includes an expandable evaluation panel based on stored manual corrections. Read-only confusion matrix and agreement, no model calls or retraining. No score when no valid pairs exist.
- Local SQLite CLI backup/verify/restore; restoration only to new paths, never live cutover.

## Real-data checks
- Saved and reopened `Penyadapan Presiden · 13 November 2026`, 789 posts, from server after leaving the report page. One archive persisted.
- Project evaluation had zero eligible manual labels, so UI correctly displayed no score. Synthetic scores were not inserted into the project.
- Created private backup and manifest at `/Users/sylviatirtanata/Library/Application Support/PULSE/backups/batch-two-2026-11-13/pulse-with-report.sqlite`.
- Verified checksum/schema/integrity, then restored to `restore-with-report-check.sqlite` in the same private directory. Restored database integrity `ok`; one archived report preserved. This is an isolated recovery check, not live failover.
- A pre-report backup (`pulse.sqlite`) and its separate restore-check file are also retained there. All artifacts are outside Git; no user data was deleted.
- Worker-policy and monitor-schedule hashes matched before/after. Preview server remains scheduler-disabled as before; persisted collection settings were not changed.

## Independent review
Fixed and tested: malformed nested snapshots rejected; analyst save access added with viewer/CSRF protection; extra period filter fields rejected.

Final regression: 313 backend tests passed; 128 frontend/helper tests passed. Scoped ESLint passed. Existing deprecation warnings and large bundle warnings remain. Browser retry test initially hit a shared Vite-cache collision; isolated test caches fixed it without increasing timeouts.

Deferred minor: archive listing currently loads snapshot JSON for a bounded page of 20 records. For large installations, move listing metadata to dedicated columns/projection before scaling retained report volume. Current project archive was verified; no load benchmark is claimed.

## Limits
- Snapshot is analyst-created stored source data, not a cryptographic proof of original-source authenticity.
- Reviewed-sample agreement is not general model accuracy; representative human-reviewed benchmark still requires real annotations.
- Backup contains sensitive database contents, is private but not encrypted, and is on the same local machine. Off-host storage, retention automation and live recovery remain operator decisions.
- No paid providers, crawling, model upgrade or retraining was performed.
