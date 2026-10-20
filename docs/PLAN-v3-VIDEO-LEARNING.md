# Plan v3 — projects, long-form video, motion runtime and taste learning

20/10/2026. User adds these requirements while the v2 Spatial Creative Studio UI revision is active. Preserve that visual direction and existing v1 records. New requirement overrides only the previous deferral of video editing: now design a scoped AI-assisted video assembly workspace.

## Deliverables for this stage

- Product addendum: projects, products, films, duration/format variants, AI audit/edit/motion, taste learning and hybrid UX.
- Technical addendum: capability-driven shot planning, deterministic edit-decision list, motion-package execution/renderer boundary, project isolation and versioned learning.
- Local visual prototype: project switch, duration/format planning, shot timeline/inspector, demo audit, scoped local feedback. No provider calls or real video render without source/provider setup.
- Updated three v2 UI images plus one new Video Studio image and a review index. Images remain static concepts.
- Source and browser observations separated; fix observed UI defects; review exact files before packaging.

## Ownership

Root: plan, concept images, review index, CUA observations, packaging/checkpoint.
product_prd: PRD-v3-PROJECTS-VIDEO-LEARNING.md.
architecture_spec: TECH-v3-VIDEO-TASTE-RUNTIME.md and independent integration review.
prompt_contracts: prototype-v2 implementation and self-review only.

## Decision on node UX

Use a wizard as the fastest default. A node canvas exposes reusable agent pipeline/data dependencies for advanced work. A timeline owns audiovisual timing, trims, transitions and audio. Node dragging alone cannot conveniently represent time or be the only accessible operation. Make both representations read the same versioned film plan, with selection and edit provenance preserved. The local prototype may demonstrate scene order through keyboard/move controls rather than an unfinished node editor.

## Guardrails that express product correctness

- Requested model durations are preferences; registry capability determines possible generation durations. A shot is not a frame.
- Final duration = sum of placed clip ranges minus transition overlaps plus explicit holds/gaps. Generate source footage with handles as needed, then trim; four 15s sources with overlaps are not automatically a 60s film.
- A motion skill becomes an audited, versioned executable package with schema, instruction, allowed recipes/assets, adapter and tests; no arbitrary execution of model-proposed code.
- An audit records coverage and confidence. Sampled frame analysis does not prove all frames correct; full timeline technical checks and perceptual review have different scopes.
- Learning means evidence-backed memory and preferences, not automatic model-weight updates. Isolate workspace/project/brand/media family and bind every change to feedback/artifact/test evidence. Bad self-score cannot approve its own new rule.
- Every run writes an episode after completing its scoped checks; failed/aborted runs store failure status. Candidate lessons are separate from active rules, with authority policy, evaluation and rollback.
- Keep explicit generated/not generated, simulated/observed and estimated/settled states. No paid jobs, publication or Cloudflare deployment in this prototype/design stage.
