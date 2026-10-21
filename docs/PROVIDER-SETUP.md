# Provider setup

Open **Thiết lập chạy** in the workflow toolbar. Save a provider key, select models for analysis/research/strategy/prompt, save, and run the connection check before the pilot. Existing Cloudflare environment keys do not need re-entry.

Keys entered in the app are shared by this internal team workspace. They are encrypted at rest in D1 with AES-GCM (random 12-byte IV, provider-bound authenticated data). `PROVIDER_VAULT_KEY` is a separate 32-byte hex Worker secret, never sent to the browser. Provision it once before enabling the UI. Do not replace this master secret casually: version 1 does not implement key rotation; changing it requires re-entering stored provider keys. Corrupt entries fail closed. Database backup alone is insufficient without the separately retained master secret.

Apply migrations 0006 and 0007 before deploying this version. The app stores ciphertext in D1; it does not modify Cloudflare Variables & Secrets through a management token. Key values are never returned, logged, or saved to browser storage. The existing server environment secret is used only when that provider has no vault record.

Model choices follow the current stage allowlist. Availability and pricing must pass live catalog preflight; a listed choice alone does not prove availability. Settings persist per project. A changed model requires a fresh run identity; active runs prevent edits.

The current pilot covers analysis → web research → motivators/hooks → mega/negative JSON. fal/Replicate key storage does not enable media submission, rendering, or a 100-video/day service. The media budget and execution remain off.
