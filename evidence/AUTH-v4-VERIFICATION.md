# Auth v0.4 verification — 20 October 2026

Scope: shared internal account for the hosted creative prototype, not multi-user authorization or a live generation service.

## Evidence

- Existing release suite: 7 prompt fixtures, both JSON meta-schemas, 34 HTML references and four concepts passed.
- SQLite-backed tests use `cloudflare/migrations/0001_auth.sql`, not a hand-written fake credential store.
- Local Wrangler/workerd with separate local D1: signed in with test-only bootstrap password, changed password, observed old password rejection and old session rejection, signed in with new password, and restored only the local test credential. All passed.
- Verification scripts never change the production password. Separately, the owner explicitly authorized resetting it to the edited local handoff password after the saved file was found to differ from the original bootstrap secret. Reset used a locally derived salted hash, expected credential version 1, and invalidated prior sessions; no raw password was printed or committed.
- Native browser control failed with `Transport closed`; actual rendered login/account screenshots and browser interaction are unverified.

## Expected deployment behavior

Public login assets; protected workspace/account/design gallery. Cookies are HttpOnly, Secure and SameSite=Strict. Password change invalidates every session by credential version. Stored credential always takes precedence over bootstrap secret.

## Independent review corrections

Review identified an initial non-atomic rate-limit check and whole-body buffering before a size check. Both were corrected: atomic UPSERT/RETURNING consumes an attempt before password verification; streaming parsing cancels input beyond 16 KiB. Regression tests passed: 12 concurrent attempts produce eight credential failures and four throttled responses; oversized chunked input cancels; expired sessions are rejected. Local workerd rotation was rerun successfully after these changes.

Independent reviewer `cloudflare_review` returned PASS for final auth implementation. First live smoke detected a 307 caused by Cloudflare's default HTML canonicalization conflicting with Worker alias routing. Set `assets.html_handling` to `none`; the Worker owns `/login`, `/account`, `/review` and `/` aliases.

## Final live receipt

Deployment version: `b3b563bb-7b50-429f-979f-e84b9ee6e8f4`.
Public login returned 200 and matched its source hash. Workspace redirected unauthenticated requests; session API returned 401; cross-origin login returned 403.
After the authorized reset, login using the owner's saved password passed. Workspace, account, gallery, both CSS/JS pairs and all four PNG concepts returned 200 with private/no-store and exact source hashes.
Authenticated unknown route returned 404; logout revoked the test session and a subsequent session check returned 401.
An attempted diagnostic that would retrieve a remote verifier was rejected by automatic approval review; it was not executed. Safe file metadata identified the edited handoff, and the owner explicitly authorized the reset instead.
