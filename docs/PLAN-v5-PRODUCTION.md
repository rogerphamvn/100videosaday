# v0.5 — production studio, research and voice

Owner requests: synchronize the hosted interface, design for 100 quality videos per day, accelerate research with Jev, and use confirmed `pnnbao97/VieNeu-TTS` to reduce voice costs.

## Delivery and ownership

1. `studio_ui`: implement a cohesive production/research/voice/quality workspace linked to existing creative tabs and account controls.
2. `production_core`: persist projects and idempotent batch plans in D1; calculate capacity from explicit assumptions; create planned assets without pretending generated files exist.
3. `research_voice`: verify upstream capabilities/licenses, implement bounded bridge clients and an optional VieNeu sidecar with presets and reproducible setup.
4. Root: authenticated API routing, build/deployment, integration tests, evidence review, changelog/PR merge and release receipt.

## Acceptance

- Creating a project or 100-item plan persists on the server and can be fetched again.
- Duplicate plan requests do not create duplicate assets; mismatched reuse is rejected.
- Throughput estimates include shot count, retries and acceptance yield. No measured throughput is invented.
- Quality requires product fidelity, supported claims, intelligible voice, continuity, correct format and meaningful diversity. A plan/self-score is not evidence of a finished video.
- Research source URL/date/excerpt are separate from hypotheses. Reuse a source dossier per product/market instead of re-searching per output.
- Jev and VieNeu are genuine adapters with explicit missing-configuration errors; no fake research or audio.
- Voice uses permitted preset voices. Compute and review costs remain visible; self-hosting is not described as free.
- Hosted UI assets and authenticated API behavior are verified after deployment. No production credential resets.

## Work that cannot yet be claimed

Actual 100 approved videos/day needs configured image/video providers, deployed browser/TTS/render executors and a measured end-to-end run. This release must expose those missing dependencies and the benchmark needed rather than promise a result without media output.
