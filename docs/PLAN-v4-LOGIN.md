# v0.4: login and self-service password change

Owner scope: deploy all existing UI and a real login screen; owner chooses a new password through the account screen. Existing saved password remains usable until the owner changes it.

## Implementation

- Root: Cloudflare AUTH_DB provisioning, explicit deployment assets, protected design gallery, CI integration, remote verification, changelog and PR merge.
- auth_backend: D1 schema, salted password hashing, server sessions, login/logout/change endpoints, CSRF and rate limits, tests.
- auth_ui: matching responsive login/account screens and workspace navigation.

## Acceptance

- Public login does not require browser Basic authentication.
- Workspace, account and design gallery require a server session.
- Login uses existing secret for one-time initialization only. Stored credential wins thereafter.
- Password change requires the current password, matching new values, and a server session. Invalidate all previous sessions and require sign-in again.
- Tests cover wrong/current/new credentials, expiry/revocation, CSRF, throttling, malformed requests and missing storage.
- Deploy all four workspace tabs plus login/account and four design concepts. Concepts remain explicitly labelled designs.
- Production checks log in and log out but never change the owner's password.
- No raw password in logs, Git, browser storage or committed artifacts.

## Limits

Shared internal team account, not per-user roles. AI generation and server project persistence remain future work. Browser rendering verification depends on CUA availability; report HTTP evidence separately.
