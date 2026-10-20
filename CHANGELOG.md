# Changelog

Dates use Asia/Bangkok. Versions describe project milestones, not provider releases. Current scope is design and a hosted prototype, not a connected AI app.

## [Unreleased]

- Live provider/research adapters; server projects/storage and per-user roles.
- Typed draggable workflow editor, actual clip generation/import/editing/render/export.
- Executable motion packages, AI audit/repair and server-side agent taste learning.

## [0.4.0] — 2026-10-20

- Added matching Vietnamese login and account screens, password visibility controls, accessible feedback and logout.
- Replaced browser Basic authentication with D1-backed salted password hashes and expiring, revocable server sessions.
- Owner can change the shared team password with current-password confirmation; changes invalidate previous sessions and never fall back to the bootstrap secret.
- Added same-origin JSON checks, request limits and login/password attempt limits.
- Deployed all current workspace tabs, account UI and a protected gallery of the four labelled design concepts.
- Added real SQLite auth regression tests and a production smoke script that checks hashes and logout without changing the owner's password.
- Fixed HTML alias redirects detected by live smoke tests; verified public login, all protected UI hashes and logout on Cloudflare.
- Per explicit owner approval, reset the shared account to the edited local handoff password so the owner can then change it through Account. No credential is stored in Git.
- AI generation/render and server project persistence remain future work. Browser visual reinspection unavailable because CUA transport is disconnected.

## [0.3.1] — 2026-10-20

- Deployed the existing prototype to https://100videosaday.happy-candlevn.workers.dev on Cloudflare Workers.
- Added fail-closed shared internal access, protected assets, private cache headers and explicit deployment allowlist.
- Added three-file build, access tests and CI coverage; credentials stay outside Git.
- Verified live 401/200 access and exact asset hashes, plus 7 existing prompt fixtures. Browser reinspection unavailable (CUA transport closed).
- AI APIs, rendering, server persistence and per-user authorization remain unimplemented.

## [0.3.0] — 2026-10-20

### Added

- Project → Product → Campaign → Run → FilmVersion hierarchy and isolation requirements.
- Video Studio concept; local 45/60-second planner with aspect ratios, integer-frame trims, overlap and shot reorder.
- Hybrid UX: wizard default, optional node workflow, planar timeline.
- Local project/hook-scoped taste feedback with evidence notes and versions.
- Long-form runtime specification: capability registry, edit-decision list, motion packages, render executor, audit coverage and bounded reversible repair.
- Living Taste: episodes, candidate/verified/active rules, authority, conflict/staleness, evaluation and rollback.
- Owner-authorized GitHub workflow: changelog, checks, task PR and merge after completed work.
- CI/release checks with independent Draft 2020-12 meta-validation and prompt fixtures.

### Fixed

- Mobile project selector remains accessible; workspace tabs use a narrow-screen 2×2 grid.
- Intermediate-width cards reflow instead of clipping hooks.
- System reduced motion takes precedence; scrolling follows effective motion.
- Motion tokens 120/220/400ms and key targets ≥44px.
- Shot reorder recomputes Start/Crossfade and timing.
- Video batch preview hides incompatible image controls; closing returns focus.
- Video concept uses consistent 12.4s trims and 62s−2s=60s math.
- CI pip cache explicitly uses `requirements-dev.txt`, avoiding setup failure from its default requirements-file discovery.

### Verification and limits

CUA observed hook selection/keyboard, scoped feedback, 45/60s plans, reorder, user motion toggle and zero-job previews. Settled iframe 390/768/1440px reported no horizontal document overflow; this is not physical-device testing. Live OS reduced-motion emulation, full accessibility, server isolation, provider generation, AI clip audit and video rendering remain unverified/unimplemented. No Cloudflare deployment or advertising publication.

## [0.2.0] — 2026-10-20

- Spatial Creative Studio: light chrome, dark canvas, restrained mint/lime, meaningful card depth.
- Three ImageGen concepts for Insight, Creative Lab and Remix.
- CSS3D prototype with selection, inspector, list mode, motion and keyboard/mobile contracts.

## [0.1.0] — 2026-10-20

- Detailed PRD, Cloudflare architecture, provider research and first three-screen design package.
- Evidence → motivator/use case → trend/taste → hooks → prompt → asset/test → remix workflow.
- Paired mega/negative JSON schemas, image/video demo pairs and seven valid/invalid fixture cases.
- Product locks, independent authorship/provenance, scoped negatives and exact prompt-revision binding.
