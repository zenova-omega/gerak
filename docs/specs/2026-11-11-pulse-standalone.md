# PULSE on-prem product increment

## Authorized scope

User chose single-organization on-prem first, separate PULSE branding/login, and the previously discussed evidence-first improvements. Later in this same implementation they added word map, Jakarta heat map and professional dashboard menus. Preserve existing real data, existing approved quotas and GERAK access during transition; no paid package upgrade, new demographic inference, or invented locations.

## Implementation decisions

- Existing React/FastAPI stack retained; dedicated `/pulse` tree without GERAK context providers, with neutral light/dark surfaces and pastel accents.
- Separate PULSE users and server-revocable opaque cookie sessions. CLI-only provisioning/recovery; no shared prototype password, public owner signup, or self-assigned role. First owner/password remains a user action.
- Dedicated PULSE-only ASGI entrypoint excludes GERAK routes. Embedded route retains old administrator authorization for backward compatibility.
- Single organization shares all existing listening topics. This is not multi-tenant isolation.
- Owner/admin can mutate configuration/crawl. Analyst can read/acknowledge alerts; viewer reads only. APIs enforce permissions even if UI shows unavailable actions.
- Local SQLite remains live. Container package prepared but not started; no database migration or scheduler duplication.
- Chronological cards default, retain 2D/3D/replay. Publication order and earliest observed are not proven causal origin. Per-account inspection uses only evidence supplied by current network.
- Professional views: overview, monitor, network, accounts, infographics, posts, comments, settings. Topic/alert scope persists across navigation.
- Word frequency and publishing hours derive from stored posts. Jakarta is an explicitly labeled coordinate-grid heatmap, not an administrative boundary map or inferred audience demographics. Empty/missing provenance stays empty. No external geocoder or new crawler.

## Release checks

- Auth API tests: anonymous access, product separation, CSRF/origin, logout/revocation, password changes, roles, expiry, disabled users, rate limits and HTTP rejection.
- Frontend: data transformations, session client separation, chronological selection/paging, navigation scope, infographic calculations, build and changed-file lint.
- Browser: real chronology/cards/profile and standalone login/light/dark. Authenticated standalone end-to-end awaits user-owned first account; API behavior tested against isolated fixtures.
- Docker config validation only on this host; daemon unavailable. Image build/start, certificate installation, backups and restore drill remain deployment prerequisites.
- Existing repository-wide lint errors are not represented as a clean global lint run.

See `docs/operations/pulse-onprem.md` for operator commands and security limitations.

## Verified outcome

- Full backend suite: **128 passed**. Targeted pure frontend/data/component tests: **46 passed**. Changed-file ESLint and `git diff --check` passed. Normal and PULSE-only Vite builds passed with existing large-chunk and stale Browserslist warnings.
- Security review produced three backend findings (transport, password-attempt limits, budget growth) and two frontend session-race findings. All were patched with regression coverage; nonlocal HTTP and remote-loopback spoofing are rejected; cross-tab signals carry no credentials.
- Browser verified real 260-post chronology, account selection, clean word frequencies, keyword evidence drilldown, empty Jakarta location coverage, offline reference outline, and standalone light/dark login. First-account configuration became available during the turn; authenticated standalone navigation awaits the user's password/login.
- The full test glob also ran the old `src/lib/pulse-ui.test.mjs`, which timed out waiting for `Test account`. It was not rerun with shell browser automation. Repository-wide lint is non-green; changed-file checks do not supersede that. See `src/pulse/VERIFICATION.md` for manual CUA checks.
- Docker Compose syntax validated. Docker daemon unavailable, so containers/TLS deployment not executed; active database and provider quota settings were not migrated or increased.
