# VieNeu preset-voice sidecar

This optional service runs VieNeu-TTS outside Cloudflare Workers. It exposes only authenticated preset-voice synthesis; it does not expose voice cloning.

Required environment:

- `VIENEU_API_KEY`: at least 16 characters; use the same value as the Worker's `VIENEU_BRIDGE_TOKEN` secret.
- `VIENEU_MODEL_REVISION`: exact 40-character model commit. The reviewed default is `61b85e3d937fbbacb387714180e8182823512523`.

Optional environment:

- `VIENEU_BACKEND=onnx|pytorch`; default `onnx` avoids downloading GPU weights.
- `VIENEU_PRECISION=fp32|int8`; use `int8` only after testing the target CPU and audio quality.
- `VIENEU_MAX_CONCURRENCY=1..32`; start at `1` on CPU. Benchmark before increasing.
- `VIENEU_CACHE_TTL_SECONDS`; exact script/model/voice WAV cache, default 7 days and bounded to 1 hour–30 days.
- `VIENEU_CACHE_MAX_FILES`; default 2,000 and bounded to 100–20,000 cached WAV files.
- `HF_HUB_OFFLINE=1`; requires the exact model snapshot to be present in the Hugging Face cache.

Build and run only after allocating a host with persistent model and output caches and enough CPU/GPU resources. The container downloads the pinned VieNeu model snapshot at startup unless offline mode is enabled. The SDK resolves its MOSS codec dependency separately; validate and freeze that cache in the deployment image before claiming a fully reproducible runtime. No model download or inference is performed by repository tests. The WAV cache key contains the client recipe, SDK version, exact model revision, backend, precision, preset voice, normalized script and explicit sampling settings; it stores generated audio, never the bridge bearer token.
