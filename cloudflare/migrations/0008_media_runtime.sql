CREATE TABLE IF NOT EXISTS media_node_settings (
  project_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openrouter', 'fal', 'replicate')),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  model_id TEXT NOT NULL,
  parameters_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, node_id),
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_budget_envelopes (
  project_id TEXT PRIMARY KEY,
  limit_microusd INTEGER NOT NULL DEFAULT 0 CHECK (limit_microusd BETWEEN 0 AND 5000000),
  max_job_microusd INTEGER NOT NULL DEFAULT 0 CHECK (max_job_microusd BETWEEN 0 AND 5000000),
  state TEXT NOT NULL DEFAULT 'paused' CHECK (state IN ('active', 'paused', 'exhausted', 'held')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_quotes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  selection_revision INTEGER NOT NULL CHECK (selection_revision > 0),
  provider TEXT NOT NULL CHECK (provider IN ('openrouter', 'fal', 'replicate')),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  model_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  request_json TEXT NOT NULL,
  estimated_microusd INTEGER,
  reserved_microusd INTEGER NOT NULL CHECK (reserved_microusd > 0),
  estimate_source TEXT NOT NULL CHECK (estimate_source IN ('provider_historical_estimate', 'catalog_pricing', 'project_job_ceiling')),
  hard_provider_cap INTEGER NOT NULL DEFAULT 0 CHECK (hard_provider_cap IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'consumed', 'expired')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES workflow_drafts(id),
  FOREIGN KEY (project_id, node_id) REFERENCES media_node_settings(project_id, node_id)
);

CREATE INDEX IF NOT EXISTS media_quotes_project_idx
  ON media_quotes (project_id, node_id, created_at DESC);

CREATE TABLE IF NOT EXISTS media_runtime_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  quote_id TEXT NOT NULL UNIQUE,
  draft_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openrouter', 'fal', 'replicate')),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  model_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'submitted', 'processing', 'complete', 'failed', 'held')),
  reserved_microusd INTEGER NOT NULL CHECK (reserved_microusd > 0),
  actual_microusd INTEGER CHECK (actual_microusd >= 0),
  provider_job_id TEXT,
  provider_state_json TEXT,
  result_json TEXT,
  hold_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES workflow_drafts(id),
  FOREIGN KEY (quote_id) REFERENCES media_quotes(id),
  UNIQUE (project_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS media_runtime_jobs_project_idx
  ON media_runtime_jobs (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS media_runtime_jobs_fingerprint_idx
  ON media_runtime_jobs (project_id, request_fingerprint, status);

CREATE TABLE IF NOT EXISTS media_result_chunks (
  job_id TEXT NOT NULL,
  asset_index INTEGER NOT NULL CHECK (asset_index BETWEEN 0 AND 9),
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  base64_chunk TEXT NOT NULL,
  PRIMARY KEY (job_id, asset_index, chunk_index),
  FOREIGN KEY (job_id) REFERENCES media_runtime_jobs(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS media_budget_reserve_guard
BEFORE INSERT ON media_runtime_jobs
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM media_budget_envelopes
      WHERE project_id = NEW.project_id AND state = 'active'
        AND limit_microusd > 0 AND max_job_microusd > 0
    ) THEN RAISE(ABORT, 'media_budget_not_active')
    WHEN NEW.reserved_microusd > (
      SELECT max_job_microusd FROM media_budget_envelopes WHERE project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'media_job_budget_exceeded')
    WHEN (
      COALESCE((
        SELECT SUM(CASE
          WHEN status = 'complete' THEN COALESCE(actual_microusd, reserved_microusd)
          ELSE MAX(reserved_microusd, COALESCE(actual_microusd, 0))
        END)
        FROM media_runtime_jobs
        WHERE project_id = NEW.project_id AND status IN ('reserved', 'submitted', 'processing', 'complete', 'held')
      ), 0) + NEW.reserved_microusd
    ) > (
      SELECT limit_microusd FROM media_budget_envelopes WHERE project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'media_project_budget_exceeded')
  END;
END;

CREATE TRIGGER IF NOT EXISTS media_budget_hold_guard
AFTER UPDATE OF status ON media_runtime_jobs
FOR EACH ROW WHEN NEW.status = 'held'
BEGIN
  UPDATE media_budget_envelopes SET state = 'held', updated_at = unixepoch()
  WHERE project_id = NEW.project_id;
END;

CREATE TRIGGER IF NOT EXISTS media_budget_actual_guard
AFTER UPDATE OF actual_microusd ON media_runtime_jobs
FOR EACH ROW WHEN NEW.actual_microusd > NEW.reserved_microusd
BEGIN
  UPDATE media_budget_envelopes SET state = 'held', updated_at = unixepoch()
  WHERE project_id = NEW.project_id;
END;
