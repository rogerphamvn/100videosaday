# Prompt efficiency and cache evidence

Creative Hook Lab uses two different cache layers. They must not be presented as the same thing:

1. The D1 stage cache reuses a validated stage result only when project, source revision, model, prompt policy and cache namespace still match. A D1 hit performs no provider request.
2. Provider prompt caching may reuse computation for an identical prompt prefix. It does not reuse or approve a stage result. A provider cache hit is proven only by the provider usage response.

## Request layout

`integrations/prompt-efficiency.mjs` keeps the reusable policy prefix first and the project/run context last. The stable prefix contains a version, stage rules and, for canonical prompt authoring, the versioned schemas. The dynamic context is selected per stage instead of forwarding an accumulated chat history:

- analysis receives project identity plus the product/packaging images;
- research receives project identity, the validated analysis and bounded evidence/search inputs;
- strategy receives project identity, validated analysis, dated evidence and research synthesis;
- prompt authoring receives the source snapshot metadata, validated upstream artifacts and the canonical schemas.

The selector removes provider traces, prior conversation history and unrelated runtime metadata. It does not truncate source images, required evidence, hashes or canonical schemas. An oversized selected context fails closed before a provider call.

## Provider behavior

OpenRouter documents automatic caching for supported OpenAI and Gemini routes, and explicit `cache_control` blocks for Anthropic routes. The adapter adds an Anthropic ephemeral breakpoint only when the stable prefix is large enough to be worth considering. It does not add filler to reach a provider minimum. A stable `session_id` groups the workflow run and gives OpenRouter a documented sticky-routing key for chat requests. No timer, keep-alive request or background request is used.

The social-post claim that all OpenAI prompt caches were reduced from 15 minutes to 5 minutes is not used as an implementation assumption. Current official documentation is model- and provider-specific: OpenRouter documents a 10-minute inactivity window for its sticky routing, a default 5-minute Anthropic breakpoint, variable Gemini implicit-cache lifetimes, and different OpenAI retention rules by model generation. These are separate mechanisms. The app relies on returned usage evidence instead of inferring a hit from elapsed time.

References:

- [OpenRouter prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching)
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)

Provider defaults and prices vary by model and can change. The application therefore does not promise a fixed saving such as 10x or 100x. It records these returned usage fields when present:

- `cached_tokens` — a measured cache read;
- `cache_write_tokens` — a measured cache write;
- `cache_discount` — provider-reported cost effect;
- prompt/input, completion/output and total token counts.

Only allowlisted numeric/boolean fields enter workflow provenance. Unknown provider usage fields are discarded. Missing cache fields are reported as `unreported`, never inferred as a hit.

OpenRouter documents `cache_discount` at the response level; compatible responses may also place it in `usage`. The normalizer accepts either location and stores only the validated number.

Each provider-authored stage also records `promptPolicy.stablePrefixBytes`, `dynamicContextBytes` and `imageInputs`. Image data URLs are represented by a fixed marker for the byte metric, so the UI can explain prompt context size without copying product bytes or secrets into provenance.

## Budget behavior

The USD 2 pilot guard reserves conservatively. The estimator applies a cache-write premium to Anthropic and OpenAI prompt input, because a first write can cost more than ordinary input on supported routes. Actual provider cost still reconciles the reservation. Cache reads never increase the advertised remaining budget before the provider reports actual cost.

The design deliberately avoids cache warming. A warm-up call spends tokens and can cost more than a normal one-off request. The stage-result cache is the stronger saving: when its validated fingerprint hits, the provider is not called at all.

## Verification

Run:

```powershell
node scripts/test-prompt-efficiency.mjs
node scripts/test-pilot-budget.mjs
node scripts/test-workflow.mjs
```

These tests verify request construction, conservative estimation and provider-usage normalization with mocked responses. They do not prove a live provider cache hit, a fixed discount, or paid-model output quality.
