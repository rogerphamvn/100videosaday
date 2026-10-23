# Provider setup

Open **Thiết lập chạy** in the workflow toolbar. Save a provider key, select models for analysis/research/strategy/prompt, save, and run the connection check before the pilot. Existing Cloudflare environment keys do not need re-entry.

Keys entered in the app are shared by this internal team workspace. They are encrypted at rest in D1 with AES-GCM (random 12-byte IV, provider-bound authenticated data). `PROVIDER_VAULT_KEY` is a separate 32-byte hex Worker secret, never sent to the browser. Provision it once before enabling the UI. Do not replace this master secret casually: version 1 does not implement key rotation; changing it requires re-entering stored provider keys. Corrupt entries fail closed. Database backup alone is insufficient without the separately retained master secret.

Apply migrations through 0009 before deploying this version. The app stores ciphertext in D1; it does not modify Cloudflare Variables & Secrets through a management token. Key values are never returned, logged, or saved to browser storage. The existing server environment secret is used only when that provider has no vault record.

Model choices follow the current stage allowlist. Availability and pricing must pass live catalog preflight; a listed choice alone does not prove availability. Settings persist per project. A changed model requires a fresh run identity; active runs prevent edits.

The current pilot covers analysis → web research → motivators/hooks → mega/negative JSON. Media execution capability is enabled separately, but budgets start at zero/paused: saving a key does not start a job. Choose a verified model adapter, save a media budget, request a quote and explicitly confirm it. The initial UI cap is 2 USD; provider charges are not hard-capped by an app reservation. Long-video assembly and 100-video/day throughput remain unverified. See [NODE-WORKFLOW-RUNBOOK.md](NODE-WORKFLOW-RUNBOOK.md).
