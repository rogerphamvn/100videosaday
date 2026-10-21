# v0.8 independent review receipt

Date: 2026-10-21 (Asia/Bangkok)
Reviewer: `/root/cloudflare_review`
Review type: ordinary independent source/runtime review; this was not an invoked Astra review.

## Decision

**PASS for the bounded v0.8 release.** The reviewed version implements an authenticated, project-scoped product workflow through persisted sources, staged analysis/research/strategy records, canonical prompt validation, planning-only media requests, external creative measurements, manual winner candidates and clone lineage. It does not complete the original end-to-end media factory.

## Version binding

| Artifact | SHA-256 |
|---|---|
| `cloudflare/migrations/0003_workflow.sql` | `CDA9FE754426677E24408ED3BC0CB85430BE30ACA84CA07E6BAB2F82D98E1321` |
| `cloudflare/workflow.mjs` | `D132BC70D4FA7165A843C71332F756BB946DB2BD0A6EAB1BFC42F67541DB970F` |
| `integrations/workflow-providers.mjs` | `F73075E213DDF6C8A52684FED35010145FF7B09E9C25F2B021F609458F70C386` |
| `cloudflare/prompt-validation.mjs` | `436BA5677CF8301789CC1AA88FE8F7452F12F5D401C404EDC996520825FA6424` |
| `cloudflare/prompt-validators.generated.mjs` | `F3DA4F03D16444263A82C2FA946A7E2D57C5255909B6E0658449B1B5D5FA6D21` |
| `cloudflare/worker.mjs` | `E6469023CC28B2E5DC038DED6BC321F427E6BB2D8C6E4470A752AE331BAF52CC` |
| `prototype-v2/workflow.html` | `F879C1240B35648AFE838C19DB161756C20814FBE4DA5F6AE36198AB25797702` |
| `prototype-v2/workflow.css` | `E579CCE73B427FA6CCB71622801900573658637CB046B92A1F9A5E87A5517C6C` |
| `prototype-v2/workflow.js` | `B2C1066C35A6C7FD8FC79A2A20905C0DFF43D04894A429C812C5592CC069C52C` |
| `prototype-v2/shared-shell.js` | `A10127A585369F878631EAA0F0ED46B07F44765E5336FC5246214FD368385846` |

Any relevant change to these bytes requires a new review decision.

## Findings closed

- Source writes and source revision invalidation use an atomic D1 batch. A provider response is rejected if the source snapshot changes while a stage is running.
- Every uploaded product and packaging source is bound by kind plus content hash to verified bytes and an exact role-specific identity reference. Merely listing an unused hash cannot satisfy the lock.
- OpenRouter stage roles are allowlisted. Catalog presence, image capability and the actual returned model ID are checked; a provider model mismatch fails before stage output is accepted.
- Runtime models cannot self-approve claims, evidence, overlays or audio claim references. Imported prompts remain `unverified_external` and cannot enter the media queue.
- Request fingerprints, per-run leases and a project active-run compare-and-swap prevent duplicate competing runs. Manual imports cannot interleave with a live model lease, while sequential recovery imports after a blocked run remain possible.
- Draft type is immutable, so an ordinary draft cannot be converted into a clone and bypass winner lineage.
- Source changes clear the active run, mark downstream drafts stale, hide historical stages in the active UI and disable prompt export.
- The prompt author receives the complete canonical mega/negative schemas and fixed IDs, revisions and provenance context. The server then binds actual invocation metadata and validates the returned pair.
- Vietnamese market labels normalize to `VN` before the Jev request. Research and strategy outputs require dated evidence references and required motivator/hook fields.
- Worker routing keeps `/workflow` and `/api/workflow` behind the existing session gate, same-origin POST check and bounded streamed request body.

## Verification

- `npm run build:validators`: PASS; validators compile without runtime schema compilation.
- `node scripts/build-cloudflare.mjs`: PASS; 18 allowlisted UI files and four concept images.
- `node scripts/test-cloudflare.mjs`: PASS.
- `node scripts/test-production.mjs`: PASS.
- `node scripts/test-integrations.mjs`: PASS.
- `node scripts/test-studio-api.mjs`: PASS.
- `node scripts/test-canvas-agent.cjs`: PASS.
- `node scripts/test-prompt-runtime.mjs`: PASS.
- `node scripts/test-workflow.mjs`: PASS, including source races, exact model roles/actual model mismatch, identity locks, import/run concurrency, unapproved claims, media no-submit behavior and lineage.
- `node scripts/test-workflow-api.mjs`: PASS, including authentication, CSRF, 1.5 MiB streamed cap, upload above the legacy 16 KiB cap and persisted reload.
- `scripts/check-release.py`: PASS with two meta-schemas, seven fixtures, 60 HTML references and four concepts.
- JavaScript syntax checks and `git diff --check`: PASS.

The local authenticated Worker browser run passed project creation/isolation, product and packaging persistence, blocked provider state, sequential manual stage imports, evidence rendering, prompt validation/export, external creative measurement, manual winner/clone lineage, source invalidation, desktop rendering and a 390 px mobile viewport with no horizontal overflow or JavaScript errors. Evidence:

- `../ui-v8-workflow/browser-results.json` — `6662EA00D3FB85D0A03A78E4A9CCB70B4D255582CF67E2CA2AA630C53704E276`
- `../ui-v8-workflow/workflow-desktop.png` — `B9CB6B0C20026B8EBC93C0B57FB3D08238E67621B2D0A455512D5608880CA4E3`
- `../ui-v8-workflow/workflow-mobile.png` — `108C25C08CAD2E14CF83710F38D52B62AD7BADCDB5BA28D2A218EC77C9E67366`

This browser evidence is a local Worker/D1 run with imported fixtures and missing-provider fail-closed behavior. It is not a live Cloudflare or paid-model quality test.

## Material limits retained

- No paid provider call was made. Image/video submit, polling, durable media storage, provider webhook verification, output QA and cost reconciliation are not implemented.
- Long-form 45–60 second assembly, automatic audit/edit/motion/voice, autonomous taste learning and verified 100-accepted-videos/day throughput remain unimplemented.
- Measurement rows are raw operator references. Market/window/sample context and evidence verification are absent, so winner candidates are manual labels rather than comparison-ready or statistically proven winners.
- Source images are browser-compressed and stored in D1 with a 256 KiB per-image cap; this is not original-media archival storage.
- OpenRouter stage calls have response/time bounds but no per-run quote, reservation or token-cost ceiling. Provider keys should remain absent until execution and spend are separately authorized and governed.
- Provider documentation and mocked contracts establish design compatibility only; exact account access, live schemas, latency and output quality remain unverified.
