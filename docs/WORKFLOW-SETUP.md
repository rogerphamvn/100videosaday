# Product workflow setup

For owner key entry and read-only connection checks, follow [API-ONBOARDING.md](API-ONBOARDING.md). AI execution defaults to off even after adding keys.

`/workflow` requires the existing internal login and migrations through `0003_workflow.sql`. Never reset authentication tables when upgrading.

## Without provider keys

Create a project, upload product and packaging images, save drafts, import stage JSON and validate/export canonical mega/negative pairs. Sources are compressed in the browser to at most 256 KiB each, four per project; this is not original-media archival storage. Changing a source invalidates downstream results.

The pipeline reports a blocked state when a provider is absent. Imported JSON has imported provenance even if its contents claim a verified model invocation. Preparing a media request does not generate an image/video.

Measurement records are raw operator references, not comparison-ready experiments: market/window/sample context and source verification are not implemented. Winner candidates are manual decisions, not statistically proven winners.

## Server-only configuration

Use Wrangler secrets for keys, never client JavaScript, Git or chat. Configure only when provider use is authorized:

| Binding | Value / purpose |
|---|---|
| `OPENROUTER_API_KEY` | Server credential |
| `WORKFLOW_ANALYZE_MODEL_ID` | `anthropic/claude-opus-5.5` |
| `WORKFLOW_RESEARCH_MODEL_ID` | `google/gemini-3.8-flash` |
| `WORKFLOW_STRATEGY_MODEL_ID` | `anthropic/claude-opus-5.5` |
| `WORKFLOW_PROMPT_MODEL_ID` | `anthropic/claude-opus-5.5` or `openai/gpt-6.1-sol` |
| `JEV_RESEARCH_BRIDGE_URL` | HTTPS bridge implementing `RESEARCH-VOICE.md` |
| `JEV_RESEARCH_BRIDGE_TOKEN` | Secret bridge credential |

The model catalog is checked at invocation time. Unsupported IDs/modalities fail explicitly. Calls have response-size/time bounds; no fallback model is silently substituted. Returned research evidence is stored with the run. Model-authored marketing claims are not human approval.

Media mappings use `WORKFLOW_FAL_IMAGE_MODEL_ID`, `WORKFLOW_FAL_VIDEO_MODEL_ID`, `WORKFLOW_REPLICATE_IMAGE_MODEL_ID`, `WORKFLOW_REPLICATE_VIDEO_MODEL_ID`. Provider profiles and limits must be checked against current official schemas. Leave `WORKFLOW_MEDIA_EXECUTION_ENABLED` unset: the public workflow action remains planning-only in v0.8. A private adapter function is not a completed paid execution, polling or media-storage service.

## Verification

Run `npm ci`, `npm run build:validators`, `node scripts/test-prompt-runtime.mjs`, `node scripts/test-workflow.mjs`, `node scripts/test-workflow-api.mjs` and the existing release checks. Provider tests use mocked network responses and SQLite; they do not prove paid-model quality or throughput.

The existing $5 Cloudflare subscription is not a universal hard billing cap. This release provisions no new paid processing resources and makes no paid provider calls during deployment. See `PRD-v8-PRODUCT-PIPELINE.md` for remaining generation, video editing, taste-learning and throughput requirements.
