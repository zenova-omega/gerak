# PULSE batch two: approved scope

User approved server report archive, sentiment evaluation from analyst corrections, and local backup. Existing local FastAPI/SQLAlchemy/React stack remains. No crawler quota, schedule, provider or model changes.

Approach: persist versioned report snapshots in the application database; reuse existing PostReview annotations for a read-only evaluation; provide an operator-only local SQLite backup/restore CLI. Cloud archive/storage and retraining are out of scope.

Reports: list per project, save a frozen report, reopen immutable snapshot after refresh, reuse print and JSON download. Auth required, bounded payloads, strict project identity, scope preserved. Archive is an analyst-created snapshot, not proof of source authenticity. No deletion API in this batch.

Evaluation: compare valid machine labels with manual sentiment corrections, show sample size, agreement and confusion matrix. Exclude unknown machine labels and irrelevant posts; follow project/date/platform filters. This is agreement on reviewed data, not general accuracy or a held-out benchmark. Empty samples show no score. Do not modify labels or call models.

Backup: consistent SQLite online backup, file permissions restricted, metadata/checksum, integrity verification and restore into a NEW file only. Never overwrite active database or print credentials. No cloud upload, scheduler or live restore. Test on isolated fixture first, then backup configured local database and verify isolated restoration if SQLite.
