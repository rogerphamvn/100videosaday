# Independent review receipt — v0.8.1 API onboarding

Date: 2026-10-21 (Asia/Bangkok)
Decision: **ACCEPT — bounded API onboarding preparation**

## Accepted scope

- Authenticated `POST /api/provider-preflight` accepts only an empty JSON object and returns a sanitized readiness DTO.
- OpenRouter preflight performs only `GET https://openrouter.ai/api/v1/key` and `GET https://openrouter.ai/api/v1/models`; redirects are rejected, responses are time/size bounded, and raw provider bodies, headers and secrets are not returned.
- fal, Replicate and Jev are presence-only/configuration states. Their status is explicitly `configured_unverified` until a later verified integration exists.
- `WORKFLOW_AI_EXECUTION_ENABLED` and `WORKFLOW_MEDIA_EXECUTION_ENABLED` default to `false`. Provider credentials alone do not enable inference or media generation.
- The workflow UI contains no credential field, sends `{}` to the preflight endpoint, shows execution-off state, distinguishes OpenRouter verification from fal's unverified presence, and remains usable at 390 px.

## Security and truth checks

- Endpoint authentication, same-origin CSRF rejection, method restriction, empty-body enforcement and `Cache-Control: private, no-store` passed.
- Mocked production-path preflight made exactly two read-only GET requests with `redirect: error` and returned no credential value.
- Secret-shaped values placed in model/mapping configuration were redacted from both preflight and workflow readiness responses.
- With AI execution disabled, all four potentially paid workflow stages stopped before any outbound fetch.
- UI browser evidence recorded no credential inputs, no provider credential values in local/session storage, no JavaScript errors, and `scrollWidth === 390` at the 390 px viewport.

## Frozen reviewed hashes (SHA-256)

| File | SHA-256 |
|---|---|
| `cloudflare/worker.mjs` | `89756C10B6305E1CAA0CD599AEEB0C05854C72336607030FCFC2C648CB20FD63` |
| `integrations/workflow-providers.mjs` | `EA435682E319F6106DD4B4625716EE24EB0080782D9AE2135BD5634A23B60B17` |
| `integrations/provider-preflight.mjs` | `186642F946437D1B62A1F7B4DD2C63E3C804DE759F338399043D9FFFB09DA75C` |
| `scripts/test-provider-preflight.mjs` | `2558F55DEDE2666797013A6F06BDE90FBCCFA1F3A362593F666DBA947DEE3F21` |
| `prototype-v2/workflow.html` | `667E52D0550CDB64B1708D281D514FCA93DEC2BF2D1393E4F5936CFD45D31CA9` |
| `prototype-v2/workflow.css` | `D8C0B3C761E02B089F124C605850A4A46501039A743B1A6FD47F234F6B205AAD` |
| `prototype-v2/workflow.js` | `AC85264A500FC7528549D87A3DE996F600AB25F317B8514E13BBFDE4AD13D316` |

## Evidence reviewed

- `evidence/ui-v8-1/browser-results.json`
- `evidence/ui-v8-1/provider-panel-desktop.png`
- `evidence/ui-v8-1/provider-panel-mobile.png`
- `node scripts/test-provider-preflight.mjs`
- `node scripts/test-workflow-api.mjs`
- `node scripts/test-workflow.mjs`
- Cloudflare asset build, JavaScript syntax checks and `git diff --check`

## Material limits

This acceptance does not verify a live OpenRouter or fal credential, paid inference, media generation, provider quota, billing controls, model quality, long-video assembly, taste learning or 100-assets/day throughput. Browser success used mocked OpenRouter responses; current no-key runtime correctly reports missing configuration. Enabling execution later requires separate owner authorization, real credential verification and a budget/reservation control review.
