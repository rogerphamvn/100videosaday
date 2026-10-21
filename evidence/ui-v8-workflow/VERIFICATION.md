# v0.8 verification — 2026-10-21

Scope: persisted product workflow and provider wiring. This is not acceptance of the complete original video-production objective.

## Automated checks

- Eight Node suites passed: auth, production plans, integration bridges, Studio API, canvas reducer/commands, runtime prompt validation, workflow state/provider contracts, full Worker workflow API.
- Python independent Draft 2020-12 release check passed: 2 meta-schemas, 7 fixtures, 60 HTML references, 4 concept images.
- Workflow API covers unauthenticated 401, same-origin 403, streamed body cap 413, source upload over 16 KiB and persisted reload.
- Workflow tests cover atomic source rollback, kind/hash/identity reference completeness, project isolation, stale source races, same/different request ID concurrency, import exclusion/recovery, immutable draft type, exact actual model identity, Vietnamese market normalization, canonical schema delivery to prompt writer, claim restrictions, imported trust, measured creative references and clone lineage.
- Build contains 18 UI files and 4 concept PNGs. Wrangler dry-run passed with bundled canonical JSON schemas and static validators; no dynamic runtime schema compiler.

## Browser evidence

Isolated Chrome via Playwright against local Wrangler with the actual migrations and local-only test credentials. `browser-results.json` and desktop/mobile captures accompany this record. Test assets and imported stage data are artificial verification inputs, not customer evidence or paid inference.

Observed: product and packaging upload, reload persistence, project isolation, honest missing-provider state, sequential stage imports, visible trend/motivator/hook, validated canonical JSON export after refresh, external creative registration, measurement, manual winner candidate and clone lineage. Changing sources cleared active stages and disabled old prompt export. At mobile width 390, scrollWidth was 390. No page JavaScript errors.

Frozen browser UI SHA256:

- workflow.html: `f879c1240b35648afe838c19db161756c20814fbe4da5f6ae36198ab25797702`
- workflow.css: `e579cce73b427fa6ccb71622801900573658637cb046b92a1f9a5e87a5517c6c`
- workflow.js: `b2c1066c35a6c7fd8fc79a2a20905c0dff43d04894a429c812c5592cc069c52c`
- shared-shell.js: `a10127a585369f878631eaa0f0ed46b07f44765e5336fc5246214fd368385846`

## Limits

Deployment: existing Worker `100videosaday`, version `b52b645c-0931-482f-a035-c76b4c611212`; additive remote migration `0003_workflow.sql` passed. Public live smoke passed exact hashes for login/auth/shared assets and access protection for workflow assets/API; see `live-public-results.json`. No credentials were changed and no paid inference was invoked.

No live paid model call, real research quality evaluation, generated image/video, end-to-end media polling/storage, 45–60-second film assembly, autonomous editing/taste learning or 100 accepted videos/day benchmark. Measurements are operator references without normalized experiment context. Runtime tests use mocks for providers. Production authentication is not retested with the owner's changed password; it is left unchanged. Independent review is an ordinary source/browser review, not an invoked Astra workflow.
