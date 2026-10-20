CREATE TABLE IF NOT EXISTS production_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product TEXT NOT NULL,
  market TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS production_projects_updated_idx
  ON production_projects (updated_at DESC);

CREATE TABLE IF NOT EXISTS production_batches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds IN (45, 60)),
  format TEXT NOT NULL CHECK (format IN ('9:16', '1:1', '16:9')),
  concept_count INTEGER NOT NULL CHECK (concept_count > 0),
  variations_per_concept INTEGER NOT NULL CHECK (variations_per_concept > 0),
  render_concurrency INTEGER NOT NULL CHECK (render_concurrency > 0),
  estimated_shot_seconds REAL NOT NULL CHECK (estimated_shot_seconds > 0),
  expected_pass_rate REAL NOT NULL CHECK (expected_pass_rate > 0 AND expected_pass_rate <= 1),
  retry_rate REAL NOT NULL CHECK (retry_rate >= 0 AND retry_rate <= 1),
  window_hours REAL NOT NULL CHECK (window_hours > 0),
  budget_usd REAL,
  shots_per_asset INTEGER NOT NULL CHECK (shots_per_asset > 0),
  estimated_attempts INTEGER NOT NULL CHECK (estimated_attempts >= target_count),
  provider_calls INTEGER NOT NULL CHECK (provider_calls > 0),
  estimated_render_seconds REAL NOT NULL CHECK (estimated_render_seconds > 0),
  estimated_wall_seconds REAL NOT NULL CHECK (estimated_wall_seconds > 0),
  status TEXT NOT NULL CHECK (status IN ('planned', 'blocked_provider')),
  assumptions_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id),
  UNIQUE (project_id, request_id)
);

CREATE INDEX IF NOT EXISTS production_batches_project_idx
  ON production_batches (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS production_assets (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0),
  concept_number INTEGER NOT NULL CHECK (concept_number > 0),
  variation_number INTEGER NOT NULL CHECK (variation_number > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds IN (45, 60)),
  format TEXT NOT NULL CHECK (format IN ('9:16', '1:1', '16:9')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'blocked_provider')),
  quality_status TEXT NOT NULL DEFAULT 'unverified' CHECK (quality_status IN ('unverified', 'passed', 'failed')),
  quality_gates_json TEXT NOT NULL,
  shots_json TEXT NOT NULL,
  media_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (project_id) REFERENCES production_projects(id),
  UNIQUE (batch_id, ordinal),
  UNIQUE (batch_id, concept_number, variation_number)
);

CREATE INDEX IF NOT EXISTS production_assets_batch_idx
  ON production_assets (batch_id, ordinal);
