# Acceptance benchmark: 100 quality videos per day

## What counts

A counted video must be an actual decodable final file, have a content hash and lineage to product evidence, source shots, approved script, voice/preset version and edit plan. It must pass product fidelity, claims, voice pronunciation, audio, continuity, output format and creative novelty checks, with recorded human approval.

Planned rows, provider requests, partial shots, failed exports and simple size conversions of one creative do not prove 100 distinct quality videos.

## Capacity planning

`attempted finished concepts = ceil(target accepted / expected acceptance yield)`

`shot calls = ceil(attempted finished concepts × shots per concept × (1 + retry fraction))`

For an illustrative 60-second plan: 100 accepted targets / 0.8 assumed yield = 125 attempts; five shots × 1.1 retry multiplier gives 688 shot calls after rounding. At an assumed 120 seconds per call with four concurrent jobs, the generation-only estimate is about 5.73 hours. None of those inputs is a measured provider benchmark.

The planner excludes research, script authoring, prompt refinement, voice, assembly/render, content audit, manual review, publishing and queue contention. Their latencies and costs are unknown until measured. A feasible shot-generation estimate is not a promise that the full day target will be met.

## Proposed qualification run

1. Freeze product reference assets, supported claims, market, creative diversity criteria, provider model revisions and budget.
2. Produce a small representative pilot (including difficult packaging/text/hand-action cases), listen to voice and review actual final files.
3. Measure p50/p95 stage time, peak concurrency, queue wait, rejection/repair rates and accepted-video cost.
4. Run a bounded 24-hour load trial with provider quotas and spending cap enforced.
5. Count only approved unique final videos. Report every failed attempt and resource cost.
6. Repeat across three consecutive days before treating 100/day as an operational capacity; changes in models, hardware or product complexity require rechecking.

## Research and voice efficiency

- Reuse a product/market research dossier across the concept matrix. Re-query expired evidence and new objections, not every variation. Record URLs and observation dates.
- Request at most three concurrent Jev research subtasks with host pacing and blocked-source handling in the deployed bridge. Local historical timings are not a throughput guarantee.
- Cache voice by script, preset, model revision and synthesis parameters. Preview a short sample before producing a batch; preserve intelligibility and complete words when fitting narration.
- VieNeu can reduce per-request vendor charges when self-hosted, but CPU/GPU, memory, hosting, maintenance and listening review still cost money.

## Current release boundary

Persistent project/batch planning and quality-gate contracts are executable and tested. Research/voice bridge clients and the VieNeu service package are prepared. Hosted bridge endpoints, image/video generation, assembly, automated audiovisual audit and end-to-end load qualification remain prerequisites. Measured accepted videos/day: **not yet established**.
