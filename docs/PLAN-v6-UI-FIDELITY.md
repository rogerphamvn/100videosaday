# Spatial Studio fidelity correction

Owner confirmed mockups/v2 as reference on 2026-10-20.

Problem: concept has photographic depth cards and distinct view composition; implementation still uses schematic source graphics and largely shared canvas. Production also has an independent navigation shell. Deployment alone did not establish visual fidelity.

Scope: preserve API/auth and existing interactions; unify navigation/chrome; implement visual hierarchy for Insight, Creative, Remix, Video, Production, Projects, Research, Voice, Quality and auth pages. Existing concept art remains labelled demo; never imply generated media or actual product evidence. No paid inference/Containers.

Ownership: ui_fidelity edits index/styles/app; production_shell edits studio/auth markup/styles; root shared shell, deployment allowlist, documentation and verification. Reviewer inspects final diff and runtime evidence.

Acceptance: consistent navigation reaches all views without losing features; photo-rich creative demo matches concept direction; real plan/API state remains separate from demo; keyboard and reduced-motion preserved; desktop/mobile layout inspected; build and auth/API regressions pass; deploy final exact files and merge with changelog. Screenshots must show actual rendered app, never a full concept image substituted for controls. Report any unavailable browser/live auth checks.
