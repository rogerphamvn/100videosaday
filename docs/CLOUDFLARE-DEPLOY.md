# Cloudflare deployment

Live URL: https://100videosaday.happy-candlevn.workers.dev

This is the existing prototype hosted on Workers Static Assets, not a live AI service.
Project selections and taste notes remain browser-local. Moving from localhost does not transfer localStorage.

## Internal access

HTTP Basic authentication protects every asset through `run_worker_first: true`.
Username: `team`. Password: Cloudflare secret `INTERNAL_PASSWORD`.
Owner handoff: `.local/cloudflare-access.txt` (ignored by Git).
Missing secret returns 503; wrong or missing credentials return 401.
Shared prototype access does not provide per-user roles, SSO or audit logging.
Rotate with `npx --yes wrangler@4.151.2 secret put INTERNAL_PASSWORD`.

## Deploy from an authenticated workstation

```sh
node scripts/build-cloudflare.mjs
node scripts/test-cloudflare.mjs
npx --yes wrangler@4.151.2 deploy
```

Only index.html, styles.css and app.js enter dist. Unknown files stop the build.
Docs, credentials and QA pages are not deployed. The Worker also restricts asset paths.
No paid plan, custom domain or automatic deployment pipeline was configured.
GitHub CI validates build and authentication; merging alone does not deploy.

## Verified 20 October 2026

- Workers upload and trigger deployment succeeded.
- Live `/`, `/styles.css`, `/app.js`: unauthenticated 401, authenticated 200.
- All three downloaded assets matched local SHA-256 hashes.
- Authenticated `/.env`: 404.
- Local access tests and release checks passed (7 prompt fixtures).
- Browser reinspection unavailable: CUA transport closed.

Reference: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
