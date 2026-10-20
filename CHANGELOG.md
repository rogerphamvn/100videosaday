# Changelog

Dates use Asia/Bangkok. Versions describe project milestones, not provider releases. Current scope is design/local prototype, not a deployed AI app.

## [Unreleased]

- Live provider/research adapters; server projects/auth/storage.
- Typed draggable workflow editor, actual clip generation/import/editing/render/export.
- Executable motion packages, AI audit/repair and server-side agent taste learning.

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
