# Standalone PULSE verification

Pure client tests: `node --test src/pulse/api.test.mjs`.

Changed-file lint: `npx eslint src/main.jsx src/lib/api.js src/pulse/PulseApp.jsx src/components/admin/pulse/PulseDashboard.jsx`.

Build both modes: `npm run build` and `VITE_PULSE_ONLY=true VITE_API_URL=/api npm run build`.

## Manual browser checks (CUA only)

Use the connected browser through `mcp__cua_repl`. Do not use shell-launched browser automation. Never create an owner or enter real credentials on the user's behalf.

- Open `/pulse`: with no owner, the page explains local CLI provisioning and exposes no public signup.
- On a configured installation, check email/password labels, autocomplete, busy state, and login failures. The user enters credentials.
- Confirm a signed-in user sees only PULSE navigation and no GERAK links or bootstrap action.
- Navigate overview, monitor, network, accounts, infographics, posts, comments, and settings. Check that topic/alert query parameters survive navigation, and each view renders its own content.
- Toggle dark/light, reload, and verify theme persistence. Inspect desktop and narrow mobile layouts and keyboard focus.
- In settings, mismatched confirmation must not submit. A successful password change ends all sessions and returns to login. Have the user perform any real password change.
- Explicit logout must return to login; failures must remain visible. Confirm session expiry hides the dashboard.
- Confirm only the theme preference is persisted by PULSE: session and CSRF tokens are not stored in browser storage.

## Known repository-wide checks

The full lint run encountered hundreds of errors outside these owned files. The legacy `src/lib/pulse-ui.test.mjs` timed out waiting for `Test account`; it is not part of the pure client test command above. Neither result should be described as passing.
