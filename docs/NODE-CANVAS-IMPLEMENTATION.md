# Node canvas implementation

Owner approved the two imagegen concepts on 2026-10-21 and authorized implementation and production deployment.

## Deliverable

- A full-viewport node canvas for the existing project workflow, with a compact toolbar and Chat / Settings inspector.
- Drag nodes without network writes on pointer movement; render transforms and connections on animation frames; persist at the end of interaction. Include pan, zoom, fit, keyboard and list alternatives.
- Chat commands and manual controls share real actions and state. Unsupported commands must report their limitation, never invent completed work. Paid actions retain backend checks.
- Show the current preflight blocker beside Run. Distinguish old failed run output from current readiness. A key/catalog success alone is not sufficient to enable spending.
- Project-scoped completed-stage cache with bounded TTL and entry count, source/model/config/upstream fingerprints and explicit reuse provenance. Do not reuse uncertain, invalid, stale or unvalidated outputs.
- Bounded retries for safe metadata reads; completed stages resume without paid duplication. Uncertain charges and charged-invalid outputs remain locked for reconciliation.

## Authority and limits

Pilot total remains USD 2; media execution remains disabled. This work does not authorize new media spending, arbitrary agent code execution, credential disclosure, or bypassing the provider spending cap. Node layout does not change the fixed execution dependency graph. Proposed video shots and duration controls must not claim actual rendering.

## Verification

Backend: source/project/model isolation, cache hit/expiry/invalidation/eviction and zero paid calls on reuse, same-run resumption, held-cost retry rejection, preflight freshness and safe retry bounds.

Frontend: real pointer drag and keyboard movement, edges follow nodes, pan/zoom/fit, project-scoped persistence, shared chat/manual settings, honest unsupported commands, explicit run blocker, inspector and mobile/list access.

Release: build, relevant suites, independent review, GitHub CI/merge, apply migration before deploying, then authenticated production browser checks without triggering a paid run.

## Initial production diagnosis

Free preflight on 2026-10-21 verified the actual Worker key/catalog with limit USD 2, remaining USD 2 and no reset. `includesByok` was false, so the spending-cap guard correctly kept Run disabled. The OpenRouter key edit UI did not expose an inclusion toggle when inspected. Changing this account setting requires a supported owner-side mechanism; UI changes must not disguise or bypass this blocker.
