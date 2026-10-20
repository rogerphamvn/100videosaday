# Integration review — Creative Hook Lab design package

**Review date:** 2026-10-20  
**Decision scope:** PRD-first design package only  
**Verdict:** **READY FOR OWNER REVIEW** — the package is internally consistent enough to hand off for visual/product review and implementation planning. This verdict does **not** approve a production application, model invocation, provider integration, paid generation, Cloudflare deployment, security posture, runtime behavior, or final creative quality.

## 1. Review boundary

This review checks whether the PRD, technical specification, provider research, canonical JSON contracts, examples, validation evidence, and three final raster mockups describe the same bounded product. It also checks that demo material does not masquerade as customer research, live model output, ad-performance evidence, or an approved winner.

The review did not invoke Claude Opus 5.5, Gemini 3.8 Flash, GPT-6.1 Sol, GPT Image 2.5, Omni Flash 1.1, Seedance 2.5, fal, Replicate, OpenRouter, or Cloudflare. No actual Astra model review was run. No API credentials, credits, deployment, browser runtime, responsive implementation, accessibility tree, or owner approval were available.

## 2. Version binding

The verdict applies only to the following byte versions. Any changed file requires targeted re-review; changes to schemas, examples, prompt previews, source/evidence rules, permissions, provider adapters, cost controls, or winner logic require a full integration re-check.

| Artifact | SHA-256 |
|---|---|
| `docs/PLAN.md` | `69a50e6effdb403b17cfe7020c4d711a33cdc4aba2ce63b4b2bdd980661bc33e` |
| `docs/DESIGN.md` | `8755a315008971c08d15a306817f076f2688795446e6dc3e55b0cc134ee8a079` |
| `docs/PRD.md` | `2c8f4e418c617f33f170982b4f8980e5f3ce98e3c0370ac5ec714952472eb770` |
| `docs/TECHNICAL-SPEC.md` | `5f7615cc77740cb80cb9422a21e3f8520f05cbae9e1f6f92df5c70f6fd0dc639` |
| `docs/provider-research.md` | `59ce95c7c3d228f3a38745f5d87f9dbcb8246ed5c77d217ce0ea8eb3715de292` |
| `contracts/mega-prompt.schema.json` | `f8757331c90c05f0bd93d4da2e88454b6d802a30d2e75a743a3f24198e521a5d` |
| `contracts/negative-prompt.schema.json` | `55e18ac4073e9fe8a9d20789f894caa426d662ff53c9e8088eba1efd413db8c7` |
| `contracts/README.md` | `8382948d4d1f2fe86113042852a1479c3026d762ab97aa1b23dc83d7bfb0dba3` |
| `examples/image-mega-prompt.demo.json` | `fc8429a0bf6c318145b6f531d3458228bbbb3a596d519dde82d7250080a6dcf9` |
| `examples/image-negative-prompt.demo.json` | `aa3a5344d4ea0bd047ce33ff3fcada0a788765bfc7666694f1606905d03b2656` |
| `examples/video-mega-prompt.demo.json` | `f429faa2e18cf224efd3ce1fb6d2aa5f065180e97e31b3e14b974d3f98e15adb` |
| `examples/video-negative-prompt.demo.json` | `36e42c2e8b97e0c08df86f61ac32b27bcecdb8cd5725b1b8656c91d06e9fc13c` |
| `scripts/validate-contracts.py` | `8e9175eb0f187243376f6b07b7ef0128b34258b07c0fcfb507a4b60826ef3236` |
| `evidence/contracts-verification.json` | `e4e0b9ef099d18f6e89de17c4da3cd97c6b3aa90c3e35301b6c46236ae4e8701` |
| `evidence/package-verification.json` | `f6306fd46f3b018f79202291cc326dd2362e8df1efa758067d6273edf0e1304b` |
| `evidence/VISUAL-REVIEW.md` | `2b81c7006a83f76b152e640602d4aaf09682d9920f74b2d70f33e41cf71cc07c` |
| `mockups/PROMPTS.json` | `11ebb7d39bb769f350c04aad1a721d67797e6c3af47302caab6a17daac290700` |
| `mockups/REVISION-HISTORY.json` | `585c0fb091ec41e5f1ecfb1663a9d225316e8e2dcecc495aa057eb8621068ee0` |
| `mockups/01-product-insight.png` | `d1fb11eaa241e7477dd279de366cae4910a1ecea16c22ba094328418d5cf3b24` |
| `mockups/02-creative-lab.png` | `a8e15620c719fe8abbe7d3d11fb4d2774e02166bf62aeb990bbaa37d7f9b22b5` |
| `mockups/03-winners-remix.png` | `f66ca6abc20eeb8ea43d3e70b4600de2c8f61b2b17ce538d875f5b00798c9f5b` |

## 3. Cross-artifact findings

| Gate | Result | Evidence and boundary |
|---|---|---|
| Current stage is PRD → UI | PASS | PRD, plan, design and mockups consistently limit the current deliverable to an internal concept package. Provider APIs and Cloudflare implementation are later phases. |
| Product truth and claims | PASS | PRD separates confirmed facts, OCR, inference, evidence gaps and approved claims. Mockup 01 labels the selected motivator as a hypothesis and shows no customer source. Runtime enforcement is still unbuilt. |
| Motivator-first flow | PASS | Product evidence → motivator candidates → use case/pain → cited trend candidate → taste/hook is consistent across PRD and technical specification. |
| Live research boundary | PASS | The architecture requires a real research connector and source records. An LLM alone is not treated as web access; missing connectors must show `needs_evidence` or “Chưa kết nối research live”. |
| Requested model labels vs verified IDs | PASS WITH PREFLIGHT | Provider research records the user-requested labels separately from verified endpoint/model IDs. Registry entries require capability and entitlement preflight before use. Exact Replicate model slugs remain intentionally unverified. |
| Canonical prompt contract | PASS | Technical specification now points to `contracts/mega-prompt.schema.json` and `contracts/negative-prompt.schema.json` as the only canonical shapes. Raster JSON in mockup 02 is explicitly a simplified preview, never a schema fixture or provider request. |
| Prompt authorship and provenance | PASS | Both contracts require authorship/provenance. All four examples identify themselves as `synthetic_fixture` with `demo:no-actual-model-call`; they do not claim actual Opus or Sol generation. |
| Negative prompt linkage | PASS | Negative artifacts bind to both mega-prompt ID and revision. Semantic validation rejects a revision mismatch. Provider adapters must compile allowlisted fields and retain omissions/warnings rather than forward the canonical object wholesale. |
| Provider capability variance | PASS AT DESIGN LEVEL | The registry/adapter design accounts for negative-prompt support differences, model snapshots, documented field allowlists, compile warnings and provider schema hashes. No adapter has been implemented or tested against a live provider. |
| Roles and permissions | PASS AT DESIGN LEVEL | PRD personas map to explicit scopes including `claims.approve`, `generation.run`, `performance.import` and `winner.review`. Multi-role membership is represented by `memberships` plus `membership_roles`. These are specification decisions, not working authorization controls. |
| Async safety | PASS AT DESIGN LEVEL | The specification treats queue delivery as at-least-once, requires idempotency/business keys, avoids an exactly-once claim, and uses `NEEDS_RECONCILIATION` when provider acceptance or charges cannot be proved. |
| Cost controls | PASS AT DESIGN LEVEL | Quote → budget reservation → user-confirmed run → settlement/release/reconciliation is defined. Mockups show planned counts and no fabricated price. No cost estimator or ledger exists yet. |
| Winner discipline | PASS | PRD requires objective, audience, placement, window, sample/spend and rule before reviewer decision. Mockup 03 uses blank metrics, “Ứng viên cần xác nhận”, and an explicit simulated-results banner. |
| Visual concept coherence | PASS WITH BOUNDED LIMITS | All three images were directly inspected at original detail. Navigation, light/forest palette, workflow hierarchy, demo labels and CTAs are coherent enough for owner review. They are not pixel-final UI. |
| Contract checks | PASS WITH TOOLING LIMIT | Latest evidence records 7/7 fixtures passing, including positive image/video pairs and five expected failures. The recorded engine is `contract-keyword-fallback`; `jsonschema` was unavailable, so independent Draft 2020-12 meta-schema validation remains an implementation/CI gate. |
| Package integrity | PASS WITH STATIC LIMIT | The package report records 13/13 local HTML references present, 13 JSON files parseable in its scoped check, and three PNGs with valid headers at 1586×992. This is static package evidence, not browser or runtime evidence. |

## 4. Defects closed before this verdict

1. The mockup-02 prompt used `product_lock`; the final prompt and visual now use the canonical `productLock` spelling.
2. The video negative example previously scoped a packaging constraint only to the end card while also forbidding earlier visibility. The final constraint scope is global.
3. The technical specification previously embedded a competing prompt shape. Section 8 now links the canonical contracts and examples instead.
4. Technical roles previously did not align with PRD personas. The final specification uses permission scopes and permits multiple roles per member without inventing mandatory approval pauses.
5. Negative-prompt artifacts previously lacked explicit authorship/provenance. The final contract and examples require them and bind the negative artifact to the mega-prompt revision.
6. Early mockup 01 implied unsupported customer attribution. The final screen says no customer source and frames the selected motivator as a test hypothesis.
7. Early mockup 03 drifted into a health-oriented motivator and implied an approved claim. The final screen uses “Chủ động khi nấu” and “Chưa duyệt claim — cần kiểm chứng”.

## 5. Direct visual inspection notes

- **01 Product & Insight:** clearly shows product/packaging sources, three motivator candidates, an evidence gap, a selected hypothesis, and a persistent demo/API-disconnected label. One Person row retains the phrase “quan tâm sức khỏe”; this is renderer microcopy, not researched audience evidence or an approved health claim. Production copy should be `Đối tượng / Người nấu ăn tại nhà`.
- **02 Creative Lab:** clearly shows three hook families, image/video/storyboard demo cards, lineage, planned count `3 × 2 × 2 = 12`, a simplified JSON inspector, and disconnected model labels. The pan depiction is illustrative only and must not become usage guidance or a real-SKU ad asset; a production fixture should use a cool pan/prep surface unless manufacturer evidence supports another use.
- **03 Winners & Remix:** clearly shows simulated results, blank CTR/CPA/spend, control/candidate/no-data states, locked invariants, lineage, six planned variants, and “Chưa chạy generation”. It does not establish a real winner.
- Typography, icons and spacing vary slightly between screens. The logo is a demo mark. Component tokens, responsive behavior, keyboard flow, screen-reader labels and measured contrast remain implementation work.

## 6. Required gates after owner review

1. Owner selects or revises the visual direction and confirms the internal workflow, persona permissions and approval policy.
2. Build one vertical slice using source/claim states and canonical contracts before adding paid generation.
3. Run provider entitlement/capability discovery and bind exact, currently available model IDs; do not infer Replicate slugs or unsupported parameters.
4. Implement provider adapters that compile documented allowlisted fields, record transformed/omitted constraints and redact secrets/presigned URLs.
5. Install an independent JSON Schema Draft 2020-12 validator in CI, validate both schemas against the meta-schema, rerun all fixtures, and add adapter contract tests.
6. Implement idempotency, webhook signature verification where supported, replay/stale-event handling, budget reservation/settlement, and reconciliation tests before any paid run.
7. Implement Cloudflare Access/RBAC, per-project authorization, upload validation, R2 lifecycle/retention, audit events and deletion/export paths before real internal data.
8. Replace demo research and product imagery with owner-supplied sources; verify SKU fidelity, packaging copy, claims and safe-use constraints before export.
9. Test desktop/mobile layouts, keyboard navigation, accessible names, focus states, contrast, error states and API-disconnected behavior in a real browser.
10. Import performance only with test context and retain reviewer evidence for every winner decision and remix branch.

## 7. Decision

The reviewed bytes form a coherent **design and implementation handoff package**. They are ready for owner review because the workflow is concrete, the canonical JSON boundary is explicit, demo evidence is labeled, provider uncertainty is recorded, cost/winner safeguards are designed, and the final mockups support the PRD without claiming live behavior.

Status after this review remains: **design package ready for owner review; implementation and runtime acceptance NEEDS the gates above.** This is not Astra acceptance and not owner approval.
