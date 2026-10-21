# Cloudflare deployment

Live app: https://100videosaday.happy-candlevn.workers.dev

Worker `100videosaday`; D1 `100videosaday-auth`, on the owner-confirmed existing Cloudflare account. No paid-plan upgrade or custom domain.

## Screens

- `/login`: public login replacing the browser Basic authentication dialog.
- `/`: Creative Lab by default; `?tab=insight|creative|remix|video` opens each creative view. Shared navigation connects these to all five operational panels.
- `/account`: password change and logout.
- `/review`: four clearly labelled ImageGen design concepts.
- `/studio`: persisted projects and batch planning, research/voice bridge UI and structural quality criteria.

Old creative workspace data remains demo/localStorage. Studio project/batch records use D1. AI generation/rendering and research/voice processors are not connected. The owner confirms Workers Paid and requests a $5 ceiling; no new Containers or paid pilot is provisioned. See `CLOUDFLARE-RUNTIME-PLAN.md` for costs and the difference between budget alerts and enforced caps.

## Internal account

Username: `team`. The saved password initializes D1 once from `INTERNAL_PASSWORD`.
Change it in Account using the current password and matching new values (12–128 characters).
A successful change invalidates all existing sessions. The bootstrap secret never overrides or acts as fallback to a stored credential.
The ignored `.local/cloudflare-access.txt` is the original handoff, not a live password store. After changing, use the password saved by the owner.

D1 stores salted PBKDF2 password hashes and hashes of random session tokens. Sessions expire after eight hours, with Secure/HttpOnly/SameSite=Strict cookies.
POST APIs enforce same-origin requests, JSON and body limits. Login and current-password verification have attempt limits.
This is a shared internal account, not per-user roles or self-service password recovery. Losing the password needs a separate owner-authorized administrative reset; do not delete the credential row as a shortcut.

## Deployment

```sh
node scripts/build-cloudflare.mjs
node scripts/test-cloudflare.mjs
npx --yes wrangler@4.151.2 d1 migrations apply 100videosaday-auth --remote
npx --yes wrangler@4.151.2 deploy
```

The explicit build contains thirteen UI files (including shared chrome CSS/JS) and four concept PNGs. Unknown output files stop the build.
CI validates the build, prompt contracts, SQLite-backed auth/production and bridge/API tests. Merging alone does not deploy.
For live smoke checks, set `CHLAB_PASSWORD` in the process environment and run `node scripts/verify-cloudflare-live.mjs`.
This logs in, verifies deployed hashes and logs out; it never changes the owner's password. Never put a password in command arguments.

## Verification boundaries

Password rotation, bootstrap non-fallback, session invalidation, CSRF, throttling and request validation are tested with the actual migration in SQLite.
Production verification checks login/logout and exact UI hashes without changing the owner's password.
Browser visual reinspection is separate; CUA transport was unavailable during this work.

References: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/ and https://developers.cloudflare.com/d1/reference/migrations/
