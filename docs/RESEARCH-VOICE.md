# Research and voice integration

## Deployment boundary

Cloudflare Workers orchestrates these integrations; it does not run Chromium or a local TTS model. Both integrations use server-owned HTTPS bridge URLs and bearer tokens stored as Worker secrets. Product/user input cannot select the upstream host.

### Worker environment

| Secret or variable | Purpose |
|---|---|
| `JEV_RESEARCH_BRIDGE_URL` | Base HTTPS URL for the research bridge |
| `JEV_RESEARCH_BRIDGE_TOKEN` | Bearer secret for the research bridge |
| `JEV_RESEARCH_TIMEOUT_MS` | 1–60 seconds, default 25 seconds |
| `JEV_RESEARCH_CACHE_TTL_SECONDS` | Requested bridge TTL, 5 minutes–24 hours, default 6 hours |
| `VIENEU_BRIDGE_URL` | Base HTTPS URL for the VieNeu sidecar |
| `VIENEU_BRIDGE_TOKEN` | Bearer secret shared with sidecar `VIENEU_API_KEY` |
| `VIENEU_TIMEOUT_MS` | 2–120 seconds, default 45 seconds |
| `VIENEU_MODEL_REVISION` | Exact 40-character Hugging Face model commit |

The public status response reports booleans and the model revision only. It never returns URLs or secrets. Environment configuration reports `configured_unverified`; only a separate health/inference check may establish runtime readiness.

## Jev research recipe

`researchWithJev` decomposes one project/market question into six bounded intents: demand, pain, motivator, creative pattern, recent trend and counter-evidence. The bridge may execute up to three independent reads concurrently and is asked to cache by project + market + query for six hours. A declared TTL is policy input; only `cache.hit: true` from the bridge proves a cache hit. A canonical product-snapshot cache is future work because the current request has no product snapshot ID.

Every completed result must include HTTPS source URL, retrieval timestamp, title and excerpt. Published time is optional because many public pages do not expose it. Inferences remain in `hypotheses[]` with `status: unverified` and source IDs; they are not converted into product facts.

This layer does not represent Jev as a general search API. The reviewed Jev setup is a local DOM/browser agent plus deterministic fan-out patterns. A hosted bridge still needs to be deployed. Query decomposition and caching reduce repeated work; they do not guarantee faster results because source latency, pacing and anti-bot limits remain external.

For a 100-video/day target, run deep research once per project/market query and reuse that bridge result across creative variants during its TTL. Durable, versioned product-dossier persistence is not implemented yet.

## VieNeu-TTS voice layer

The client calls the sidecar's authenticated `POST /v1/audio/speech` endpoint and accepts bounded WAV only. The request identity covers client recipe + exact model revision + preset voice ID + normalized script. The sidecar's authoritative render cache also covers SDK version, backend, precision and explicit sampling settings, so changing a generation parameter cannot reuse stale audio. If the request omits a voice, the integration uses `Hải Đăng` as the SDK 3.8.3 technical default; this is not an acoustic-quality approval.

Pinned inputs reviewed on 20 October 2026:

- SDK: `vieneu==3.8.3`.
- Model: `pnnbao-ump/VieNeu-TTS-v3-Turbo` revision `61b85e3d937fbbacb387714180e8182823512523`.
- Code and released model assets: Apache License 2.0. Preserve license and attribution when redistributing. Other bundled/runtime dependencies retain their own notices.
- Preset voice roster is read from `list_preset_voices()` at startup; the model card and current SDK differ across revisions, so UI must not hard-code a count.

The pinned model revision does not by itself pin every transitive runtime asset. SDK 3.8.3 resolves the MOSS ONNX codec separately on CPU. Freeze and verify that cache in the actual deployment image before calling the runtime fully reproducible.

The sidecar intentionally omits voice enrollment/cloning. Preset voices are the supported production path. A later cloning flow must capture consent and usage authority for each reference voice before upload or synthesis. Successful WAV output is cached by the exact script hash for a bounded TTL; `X-Cache` is the source of truth for hit/miss status.

### Cost and throughput reality

VieNeu is open source, but inference is not resource-free. CPU uses host time and typically serves low concurrency; GPU adds machine cost but supports batching and higher concurrency. Upstream benchmark claims are useful for sizing, not a production capacity promise for this app. Before claiming 100 videos/day, benchmark the chosen host with real script lengths, target voices, concurrent jobs and audio quality review. Record p50/p95 synthesis time, failure rate, generated-audio minutes per hour and reviewer acceptance rate.

The voice service is one stage in the video factory. One hundred exported videos also require sufficient image/video generation, editing, audit, storage and retry capacity. No single TTS benchmark proves the whole pipeline target.

## Current readiness

The clients, sidecar code and offline contract tests are implemented. No bridge URL or token is committed, no model was downloaded, and no live synthesis was run. Until the two bridges are deployed and configured, `/api/research` and `/api/voice` must return an explicit 503 state rather than demo output.

## Primary sources

- VieNeu-TTS repository and SDK: https://github.com/pnnbao97/VieNeu-TTS
- VieNeu v3 Turbo model card: https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Turbo
- Jev browser agent: https://github.com/browser-use/jev-ultrafast
- Jev structured fan-out patterns: https://github.com/cobusgreyling/Jev

The reviewed `jev-ultrafast` package is version `0.1.0` under MIT. The `cobusgreyling/Jev` repository is an unofficial MIT showcase of structured TypeSafe patterns; it is not a hosted search service supplied by this app.
