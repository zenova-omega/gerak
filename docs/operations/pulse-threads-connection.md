# Threads: local connection diagnostic

The backend reads `THREADS_ACCESS_TOKEN` as a Pydantic `SecretStr` from
`server/.secrets/THREADS_ACCESS_TOKEN`. The directory is Git-ignored and must
have mode 0700; the token file must have mode 0600. This is a local plaintext
secret protected by filesystem permissions, not encrypted storage.

Do not put this token in frontend variables, URLs, screenshots, commits or logs.
The supplied token was shared in chat: revoke/rotate it before production use.
Never put replacement tokens in chat. Edit the local secret file directly.
Environment variables and `server/.env` take precedence over the secrets file;
avoid duplicate settings. Existing server processes cache settings and need a
controlled restart after rotation. The diagnostic below uses a fresh process.

## Read-only check

From the repository's `server` directory:

```sh
../.venv/bin/python -m app.services.threads_connection
```

This checks the expected username `zenova.tech.group`, attempts to read granted
permissions, and requests up to five IDs from the authorized account's posts.
It does not publish, change permissions, schedule crawls, or fetch public keyword
results. Tokens use an Authorization header. Raw provider error messages are not
printed. No diagnostic output is persisted automatically.

## Verified 2026-11-11

- Profile authentication succeeded for the expected username.
- Own-post read succeeded with an empty result (0 posts).
- Permission enumeration failed: HTTP 500 / provider code 100. Scope list and
  expiry are not verified; this error alone does not establish missing scopes.
- No public issue search or Threads dashboard feed is enabled by this change.
- Backend regression suite: 172 passed, 1592 existing/dependency warnings.

Reference: [Meta's official Threads API collection](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api).
