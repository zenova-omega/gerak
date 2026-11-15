# PULSE — single-organization on-prem release

PULSE has a separate `/pulse` interface and local email/password identities. Existing GERAK users/data are not migrated or deleted. The legacy embedded dashboard remains available to existing GERAK admins during transition. **Use `app.pulse_main:app` for a PULSE-only deployment:** it exposes no GERAK endpoints and rejects GERAK bearer tokens.

## First owner

On the server, with the existing database configuration:

```sh
cd /Users/sylviatirtanata/gerak-ui/server
../.venv/bin/python -m app.pulse_admin create --email YOUR_EMAIL --name YOUR_NAME --role owner
```

The terminal prompts for the password twice without echo. There is no public signup, default password, or automatic reuse of the prototype admin password. Create further users using the same command with `admin`, `analyst`, or `viewer`. Owner/admin may configure/crawl; analyst may read and acknowledge alerts; viewer may only read. Roles are enforced by API, not hidden buttons. This release has CLI provisioning, not email invitations.

Recover access locally: `python -m app.pulse_admin reset-password --email YOUR_EMAIL`. Password changes and resets invalidate all sessions for that user. Email recovery/MFA are not implemented.

## Run standalone

```sh
../.venv/bin/uvicorn app.pulse_main:app --host 127.0.0.1 --port 8000
```

Stop the existing backend on port 8000 first. Do not start another scheduler against the same database without reviewing worker ownership. Production should have one managed scheduler process. Build the frontend with `npm run build`; serve it behind an HTTPS reverse proxy, redirect `/` to `/pulse`, proxy `/api` to loopback backend, and SPA-fallback `/pulse/*` to index.html. Set `VITE_API_URL` to the exact HTTPS API URL before building and `CORS_ORIGINS` to the exact frontend origin (JSON array). Do not expose Vite or Uvicorn directly to the internet. Same-site frontend/API deployment is required.

The active local SQLite database is deliberately preserved. No switch to an empty Postgres database was performed. Before a database migration: stop collection, back up via SQLite online backup or stopped-file copy, migrate all topic/item/comment/snapshot/job/user/session tables, verify counts and restore on a disposable database, then switch `DATABASE_URL`. PostgreSQL production migration/restore testing remains a separate rollout gate.

## Security and operations

### Container package (not activated)

`deploy/pulse/compose.yaml` builds separate PULSE frontend/API containers. It intentionally starts with a **new named volume**, not a copy or replacement of the running prototype. Before using it for existing data, stop the original collector and arrange a verified backup/import into `/data/pulse.db` owned by UID 10001. Do not run both collectors against duplicate imports with live provider keys.

Set `PULSE_ORIGIN` to the exact HTTPS origin without trailing slash, provide provider keys through deployment secrets/environment, and install your organization's certificate as `deploy/pulse/tls/cert.pem` and private key as `key.pem` (never commit these). Run `docker compose -f deploy/pulse/compose.yaml up -d --build` only after that setup. Create owner via `docker compose -f deploy/pulse/compose.yaml exec api python -m app.pulse_admin create --email YOUR_EMAIL --name YOUR_NAME --role owner`.

The package has not been started on this machine: Docker daemon was unavailable during verification. Image build, TLS and backup/restore must be verified on the deployment host. API has no published host port and trusts forwarded headers only from the proxy's reserved address (`PULSE_PROXY_IP`, default `172.30.82.2`). Nginx overwrites scheme and client IP. If the default `172.30.82.0/24` subnet conflicts with your LAN/Docker networks, set `PULSE_NETWORK_CIDR` and a matching `PULSE_PROXY_IP` together. Never expose the API container port or attach untrusted containers to the network.

Response headers have not been checked on a running nginx either. On the deployment host, `curl -skI https://<origin>/pulse/sentiment` must show `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Cache-Control: no-store`; `curl -skI https://<origin>/pulse/brand/icon.svg` must show the first three and no `Cache-Control`. Every `add_header` stays at server level in `deploy/pulse/nginx.conf`: a location with its own `add_header` stops inheriting the list (guarded by `src/pulse/deploy-nginx.test.mjs`).

### Controls

- Passwords: salted PBKDF2-HMAC-SHA256, 600,000 iterations; 12–128 characters.
- Opaque session token in HttpOnly SameSite=Strict cookie, SHA-256 digest stored server-side, absolute expiry eight hours, revocable. CSRF token plus exact Origin required for cookie-authenticated writes. Cookie Secure except HTTP loopback development; HTTPS mandatory for LAN deployment.
- Login and password-change limits persisted and atomically reserved: five attempts/email and twenty/IP per fixed 15-minute UTC bucket, separate budgets for each operation. Includes successes. IP checked first; obsolete budget rows pruned after two buckets. Password hashing runs outside the async event loop. Non-loopback HTTP authentication is rejected; configured frontend hostnames define allowed API hostnames for this same-host deployment.
- Separate identity/audit tables; authentication events and authorized mutation attempts logged, not request bodies or secrets. Audit is not yet a tamper-proof/compliance log. Login budget rows and expired sessions need an operator retention policy.
- Keep provider credentials server-side; approved provider limits unchanged. On-prem application does **not** mean offline operation: Xpoz, YouTube and news still require outbound connections.
- Release gates before wider use: HTTPS, trusted proxy/host configuration, firewall, off-machine encrypted backups with restore drill, monitored process supervision, disk retention, authorization review and penetration testing. This local implementation is not a security certification.

## Evidence improvements

Chronological cards use stored publication times; first observed is not proven origin. Relationships distinguish mention and similarity from proven reposts. Account profile fields must carry observed/unknown status, and demographics must not be guessed. No additional OSINT provider or model has been activated in this release.

The paid collection lane is stored under its supplier's name (`pulse_worker_policies.provider`, `pulse_monitor_schedules.provider`, `watch_topics.sources`, `source_items.source`) and environment variables keep that name too. The API calls the same lane `social` in every answer and accepts `social` in `PUT /monitor/workers/{provider}` and `/monitor/topics/{id}/{provider}`; use the stored name in SQL and `social` in API calls.

Which engine and prompt version produced a sentiment, emotion or stance label is kept with the stored result (`metrics.sentiment.model` and `.method` on a post, `result.model` on a response-analysis job) for audit and re-runs. The API never returns those fields and a report is filed without them, so look in the database, not in the browser, when you need them.

The Infografik view counts document frequency (one occurrence per post) after stripping RSS HTML markup, common Indonesian words, URLs and handles. Word clicks show up to ten matching source posts. Publishing-hour bars use observed timestamps converted to WIB, not crawl times. Jakarta heat cells require valid coordinates, positive counts and provenance; the current issue has no mapped coordinates. The locally bundled 2017 outline is reference context only: see `deploy/pulse/MAP-ATTRIBUTION.md` for OpenStreetMap/geoBoundaries source and ODbL terms. No live map tiles or geocoding service is called.

References: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### Report PDF

The API container carries Chromium to turn the report into a PDF (`POST /api/admin/pulse/reports/pdf`). The browser sends the report pages as one HTML document; the server checks that the document points at nothing outside itself (no scripts, frames, remote or local addresses, only embedded pictures and ordinary links) and refuses it otherwise, then renders it with Chromium started without network. `PULSE_CHROMIUM` names the binary; `PULSE_CHROMIUM_NO_SANDBOX=true` is set in the image because a container usually cannot give Chromium its own sandbox. If no Chromium is found the endpoint answers 503 and the app offers the browser's print dialog instead. The image grows by roughly 300 MB. This image has not been built on this machine (the Docker daemon was unavailable): on the deployment host, build it and download one report to confirm fonts and page breaks. nginx accepts a 12 MB body for this one route.
