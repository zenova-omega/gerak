# PULSE local SQLite backup and recovery

This standalone Python 3 CLI uses only the standard library. It does not import
the application, read configuration/environment credentials, contact providers,
upload data, schedule jobs, or switch the running application's database.
Use on a trusted local POSIX filesystem (macOS/Linux); encrypted SQLite and
remote/network filesystems are not supported.

## Commands

From the repository root, substitute explicit operator-selected paths:

```sh
python3 scripts/pulse-backup.py backup --source /absolute/path/pulse.sqlite --destination /absolute/path/private-backups/pulse-2026-11-13.sqlite
python3 scripts/pulse-backup.py verify --backup /absolute/path/private-backups/pulse-2026-11-13.sqlite
python3 scripts/pulse-backup.py restore --backup /absolute/path/private-backups/pulse-2026-11-13.sqlite --destination /absolute/path/isolated-restore/pulse.sqlite
```

Backup creates the destination and `<destination>.manifest.json`. Keep these
together. Restore creates only a NEW standalone SQLite file; it never replaces
an existing database. Verify and restore require the manifest. Success prints
only `backup: ok`, `verify: ok`, or `restore: ok`; failure returns nonzero with a
sanitized diagnostic. Paths, rows and SQLite error details are not printed.

Each command accepts `--timeout SECONDS` (default 30, positive, maximum 3600).
The monotonic budget covers SQLite work and checksum scanning, with short busy
waits and checks between backup batches. SQLite integrity scans use a progress
handler. This is not a hard OS I/O deadline: stalled filesystem calls can exceed
the budget. A busy source fails safely; retry later or increase the timeout.

## Guarantees and boundaries

- Backup uses SQLite's online backup API, including committed WAL transactions;
  uncommitted rows are excluded. The source is opened read-only, with no writes,
  migrations, checkpoints or application startup. SQLite may use its normal WAL
  shared-memory coordination files; do not remove live source sidecars.
- Newly created files are private (`0600`) and newly created directories are
  private (`0700`). Existing directories are not chmodded. Protect the parent
  directories yourself and do not allow concurrent renames or modifications of
  input/output files during an operation. This is an operator tool, not a
  security boundary against a malicious process sharing those directories.
- Existing destinations, directories, symlinks (including dangling symlinks),
  same-path sources, and destination SQLite sidecars are refused. Backup also
  refuses an existing manifest. Files are reserved with exclusive creation,
  not a check followed by an overwriting file open. Input symlinks are rejected.
- Manifest version 1 stores SHA-256, UTC creation time, SQLite version, schema
  version, application/user versions, and schema object names/types. It contains
  no row content, SQL/default expressions, source paths or credentials. Row
  counts are intentionally omitted. Schema names may still be sensitive.
- Verification checks SHA-256, SQLite `integrity_check`, and schema metadata.
  Backup artifacts must be standalone, without WAL/SHM/journal companions.
  Restore verifies first, then uses SQLite backup into an exclusively created
  file and checks the restored database's integrity. Checksums detect accidental
  corruption; the unsigned manifest does not prove authenticity against tampering.
- Failure cleanup unlinks only reserved files with the same device/inode that
  this process created. It never recursively deletes directories or removes
  preexisting files. New empty directories may remain. A crash/power loss or
  SIGKILL can leave incomplete files; the two-file bundle is not atomically
  published. Never treat it as usable until `verify` succeeds. Choose a new
  destination for retries, or have an operator inspect abandoned output first.
- Backup data itself contains the original database contents and is not
  encrypted. Store it securely. Do not open a retained backup for editing or
  point the app at it; restore to a separate file for inspection instead.

## Isolated verification

```sh
python3 -m unittest discover -s server/tests -p test_pulse_backup.py -v
```

Tests create temporary SQLite fixtures and invoke the actual CLI in subprocesses.
They cover roundtrip content/schema, WAL consistency, permissions, checksum and
integrity corruption, empty/missing inputs, bad manifests, same-path/overwrite,
symlink and sidecar refusal, and bounded busy failure cleanup. Direct unittest
execution intentionally avoids application pytest fixtures and shared `test.db`.

The parent/operator separately selects the configured database, runs a real
backup, verifies it, and restores into a new isolated location with sensitive
outputs suppressed. No real database was used for this implementation's tests.
Live cutover, retention policy, off-host storage and recovery authorization are
separate operator responsibilities.
