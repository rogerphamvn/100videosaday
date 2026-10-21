# Changelog

Dates use Asia/Bangkok. Versions describe project milestones, not provider releases. The hosted workflow has guarded AI adapters; paid end-to-end production and media generation remain unverified.

## [Unreleased]

- Live research/voice processors, media storage and per-user roles.
- Editable execution graphs and actual clip generation/import/editing/render/export.
- Executable motion packages, AI audit/repair and server-side agent taste learning.
- Prepared the owner-click first real pipeline pilot with a fixed 2 USD app envelope, OpenRouter non-resetting credential-cap readiness checks, visible reserved/held/spent/remaining states, safe retry/reconciliation errors and an explicit no-media boundary; actual provider billing enforcement remains unverified until the paid pilot runs.
- Replaced the unavailable Jev dependency for this pilot with OpenRouter Web Search readiness and source cards that preserve URL/title/snippet plus optional provider, publisher/type, published date and retrieval date when returned; absent provider fields are omitted rather than inferred.
- Added a bounded pilot runbook and acceptance checklist; setup alone does not claim a successful paid run, creative quality or production throughput.
- Added server-driven fal.ai/OpenRouter/Replicate image/video model selectors with project-scoped browser preferences. Supported canonical models may be saved as planning preferences before mapping; unsupported, unconfigured and adapter-not-implemented states stay visible, and media submit remains disabled while execution is off.
- Fixed OpenRouter preflight diagnostics so key verification and catalog failures remain separate, sanitized states instead of collapsing to `configured_unverified`.
- Increased the bounded catalog response allowance to 2 MiB after the public catalog measured 786,103 bytes; no key value, upstream body or paid inference is exposed or executed.
- Replaced the unsupported edge-runtime `redirect: error` fetch mode with `manual` plus an explicit 3xx rejection, fixing the immediate key-phase `network_error` without allowing redirects.

## [0.9.0] — 2026-10-21

- Replaced the long workflow form with an overview/video node canvas and a shared Chat / Settings inspector based on the approved visual concepts. Layout changes do not rewire execution dependencies.
- Added pointer dragging, pan/zoom/fit, keyboard/list alternatives, per-project browser layout persistence and in-session undo/redo. Direct commands operate supported app actions and report unsupported requests; this is not an autonomous general-purpose LLM chat agent.
- Exposed current pilot readiness next to Run, separate from historical run errors. The actual production key is verified, but its BYOK-inclusive spending cap still needs owner-side configuration; no cap bypass or paid inference was performed.
- Added a project-scoped, validated AI-stage cache with bounded TTL, entry count and entry size; source, model, upstream and schema changes invalidate reuse. Research freshness has a separate six-hour maximum.
- Added bounded retries for safe metadata GET requests. Paid POST requests are not automatically replayed, completed stages are reused, and uncertain or charged-invalid outcomes remain blocked for reconciliation.
- Added an owner-run, hidden-input helper to enable BYOK inclusion on an existing non-resetting key capped at no more than USD 2. It does not store management credentials or change the spending limit.
- Media nodes and shot durations remain planning controls; media execution, clip assembly and verified 100-video/day throughput are outside this release.
- Browser smoke caught and fixed inspector layout styles overriding the HTML hidden attribute; media settings now appear only for relevant nodes.

## [0.8.1] — 2026-10-21

- Prepared server model configuration and a blank local environment template for OpenRouter and fal.ai.
- Added an authenticated read-only connection check and collapsible key-entry guidance; secrets are entered in Cloudflare, never in the application browser.
- OpenRouter key/catalog checks return sanitized statuses; fal, Jev and Replicate remain explicitly unverified when only configured.
- AI execution defaults to off before any workflow provider call. Adding keys or checking metadata cannot enable paid inference.
- Added mock network, secret-redaction and authenticated API regression coverage. No real keys or paid inference used; media execution and cost reservation remain unfinished.

## [0.8.0] — 2026-10-21

- Added authenticated product workflow with D1-persisted product/packaging images, source hashes, project snapshots, stage runs and draft lineage.
- Added OpenRouter stage adapters for analysis, cited Jev research synthesis, motivators/taste/hooks and canonical prompt authoring; missing keys/models report blocked states.
- Added build-time compiled mega/negative schema validators plus runtime cross-reference, provenance, source revision, claim and video timing checks.
- Source changes invalidate downstream stages; bounded payloads, project isolation, atomic source revisions and idempotent run leases protect stored state.
- Added validated JSON import/export, planning-only provider payload preparation, external creative measurement records and winner-to-clone lineage.
- Added workflow UI to the Spatial navigation and deployment build; API, prompt and workflow regression tests use local SQLite and mocked providers.
- No paid provider execution was performed. Media submit/poll/persistence/QA, long-video assembly, autonomous taste learning and verified 100-video/day throughput remain unfinished. This release does not claim a complete production factory.

## [0.7.0] — 2026-10-21

- Added genuine desktop canvas drag/pan/zoom with project-and-workspace-scoped local persistence.
- Added a collapsible direct-command panel and manual node controls backed by the same reducer, plus bounded undo history.
- Added editable custom notes; existing product/hook content remains read-only to preserve prompt/source consistency.
- Added keyboard/manual alternatives in mobile and list view so page scrolling remains available.
- Supported local commands can add/edit/move notes, arrange/reset the canvas, undo and adjust existing video planning controls.
- Unsupported commands explicitly report that AI/API execution is unconnected. No provider spend, autonomous LLM execution or media rendering is introduced.
- Added pure command/state tests and authenticated asset routing for the canvas module; existing auth/production/API regressions and release checks pass.

## [0.6.0] — 2026-10-20

- Corrected Spatial Studio fidelity after owner identified the gap between concept art and deployed UI.
- Added common navigation across all nine creative/production areas; login now opens Creative Lab.
- Reworked Insight, Creative, Remix and Video layouts with scoped concept-photo crops, charcoal stages, mint selection and planar inspectors.
- Harmonized Production, Projects, Research, Voice, Quality, login and account surfaces.
- Kept concept imagery explicitly demo-only; product switching clears unrelated imagery and updates prompt context.
- Removed fake video playback controls and bound timeline rulers to the selected duration.
- Added shared deployment assets and responsive single-column controls/navigation for small screens.
- API/auth regression tests remain in place. No additional paid processing or media-generation capability is introduced.

## [0.5.0] — 2026-10-20

- Added Production Studio with server-persisted projects, idempotent batch plans, 45/60-second shot plans and explicit planning-only capacity estimates.
- Connected research and voice UI to authenticated bridge adapters; absent bridges return unavailable rather than fabricated sources or audio.
- Added bounded Jev research contracts and optional VieNeu-TTS CPU sidecar with preset voices, pinned backbone revision and cache. Sidecar is not yet deployed or inference-tested.
- Added structural quality gates and human approval requirements; no audit executor or verified daily throughput is claimed.
- Added Cloudflare runtime cost proposal and a benchmark protocol for 100 accepted videos/day.
- Added SQLite-backed production/API tests and integration error/limit tests. All current UI assets are included in the deployment build.
- Containers, queues, media generation, editing and full end-to-end production remain pending.

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
