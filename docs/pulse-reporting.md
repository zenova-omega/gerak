# PULSE reporting

`/pulse/reports?topic=<id>` uses the authenticated project analytics and shared publication-date range (WIB). The report is a deep-cloned, timestamped snapshot. Background sentiment polling does not alter the report until **Perbarui snapshot** is selected. Changing project or global date range creates a new snapshot.

Sections: deterministic executive summary; daily sentiment counts and stacked bars; top ten posts; top ten authors/sources by observed engagement; platform coverage and limitations. Unknown sentiment is separate from neutral. No estimated reach, political affiliation or fabricated causal explanation is generated. All-time reports explicitly state the range is all stored data. Missing dates and metrics remain disclosed.

**PDF:** the export button invokes browser print. Select Save as PDF, A4, disable browser headers/footers. Print CSS removes navigation and uses a full-width document. This is not a server-side PDF archive or scheduled delivery service; print output freezes the visible report snapshot. In-app source drilldowns are live, not historical snapshots.

**Threads:** source coverage includes Threads, its logo, stored-post count and a sanitized connection-check record. POST `/api/admin/pulse/sources/threads/check` uses existing authenticated source-management authorization and the server's configured credential. No token is returned or stored in the audit record. GET coverage never calls Meta. Public keyword collection and automatic Threads scheduling remain unimplemented; the UI and report explicitly say so. A successful `/me` or `/me/threads` response is not proof of public keyword-search permission.

Verification: report aggregation tests cover snapshot isolation, unknown counts, rankings, WIB chronology and empty data. SSR checks project dates, source URLs and explicit Threads gap. Existing source API contract verifies Threads is present but not claimed as scheduled/keyword-capable.
