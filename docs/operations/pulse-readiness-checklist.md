# PULSE operational readiness checklist

This is a release checklist, not a production-readiness certification. Local tests do not establish deployment access, recoverability, or model quality. No production system, account, backup, crawler, or model was exercised for this workflow change.

## Alert workflow contract

- Status values: `new`, `reviewing`, `done`. Legacy alerts default to `new`, even when acknowledged; reads do not backfill stored records.
- Optional assignee is free text, at most 120 characters, trimmed; blank/null clears it. It is not a verified account, notification, or access grant.
- `PUT /api/admin/pulse/monitor/alerts/{id}/workflow` accepts `status`, `assignee`, and required nonnegative `expected_revision`. Omitted assignee clears assignment. Unknown fields and invalid values are rejected.
- State, revision, and append-only change history (authenticated actor ID, UTC timestamp, before/after values) live in `PulseAlert.detail.workflow`. Existing evidence/detail keys remain intact. No schema migration.
- Writes lock the current row before reading its JSON. Stale revisions return HTTP 409; refresh and review before resubmitting. Identical writes do not append duplicate history.
- Acknowledgment remains separate and idempotent. Done does not acknowledge an alert; ack does not mark it done. Unread counts retain acknowledgment semantics.
- Existing authorization applies: standalone owner/admin can edit workflow; analyst ack access remains unchanged. Viewer workflow writes are denied. Existing session origin/CSRF checks remain required. Embedded deployment uses its existing admin authentication.
- Workflow edits do not modify schedules, quota, or crawl jobs. Opening forms/history does not write alerts or contact providers.

## Access and deployment: remaining verification

- [ ] Deployment owner records least-privilege owner/admin accounts and validates role-denial cases in an approved staging environment.
- [ ] Verify HTTPS, approved origins, session expiry/revocation, CSRF protection, and network restrictions in the deployed configuration. Do not record credentials here.
- [ ] Validate simultaneous workflow/ack writes on the actual database engine and deployment isolation level. Local SQLite checks are not PostgreSQL/load-test evidence.
- [ ] Review assignment visibility and history retention/access. History is application-managed JSON, not a tamper-evident external audit log; long-lived histories can increase response sizes.
- [ ] Approve operational ownership, escalation paths, and meaning of “done”. Free-text assignment does not notify or enforce response SLAs.

## Backup and recovery: not demonstrated

- [ ] Assign a backup owner and document approved RPO/RTO, retention, encryption, and restricted storage locations outside this repository.
- [ ] Include alert detail/history, acknowledgment fields, identities, and configuration in consistent database backups.
- [ ] Restore a backup into an isolated environment and verify record counts, workflow history, permissions, and application startup without starting collection.
- [ ] Record restore date, evidence, recovery duration, and owner approval. The existence of a backup file alone is not a tested recovery plan.

## Model evaluation: not established by workflow tests

- [ ] Identify exact model/version, prompts, language coverage, and data provenance.
- [ ] Evaluate on a held-out, human-reviewed Indonesian dataset representative of deployment sources, including ambiguity, sarcasm, and missing context.
- [ ] Record classification metrics, per-class failures, uncertainty handling, and human-review thresholds. Set acceptance criteria before deployment.
- [ ] Validate drift monitoring and reevaluation/rollback procedures after model or prompt changes.
- [ ] Keep source evidence separate from model inference. Alert thresholds and “done” status are not proof of factual accuracy, virality, or resolved real-world risk.

## Release evidence still required

- [ ] Parent integration verifies browser behavior, keyboard/focus, narrow layouts, both themes, auth errors, stale-form conflicts, and polling while editing.
- [ ] Parent integration records complete regression results and reviews concurrent changes outside this workflow's owned files.
- [ ] Operational owner signs off access, recovery drill, model evaluation, and rollout/rollback before any production activation.
