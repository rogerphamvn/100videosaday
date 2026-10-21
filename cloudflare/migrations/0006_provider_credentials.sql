CREATE TABLE IF NOT EXISTS provider_credentials (
  provider TEXT PRIMARY KEY CHECK (provider IN ('openrouter', 'fal', 'replicate')),
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version = 1),
  updated_at INTEGER NOT NULL
);
