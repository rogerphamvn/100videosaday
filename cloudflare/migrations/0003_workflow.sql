CREATE TABLE IF NOT EXISTS workflow_projects (
  project_id TEXT PRIMARY KEY,
  active_run_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'blocked', 'failed', 'complete')),
  source_revision INTEGER NOT NULL DEFAULT 0 CHECK (source_revision >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('product', 'packaging')),
  filename TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 262144),
  source_slot INTEGER NOT NULL CHECK (source_slot BETWEEN 1 AND 4),
  content_hash TEXT NOT NULL,
  data_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  UNIQUE (project_id, kind, content_hash),
  UNIQUE (project_id, source_slot)
);

CREATE INDEX IF NOT EXISTS workflow_sources_project_idx
  ON workflow_sources (project_id, created_at);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  source_revision INTEGER NOT NULL CHECK (source_revision >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'blocked', 'failed', 'complete')),
  current_stage TEXT CHECK (current_stage IN ('analyze', 'research', 'strategy', 'prompts')),
  blocked_reason TEXT,
  error_json TEXT,
  lease_token TEXT,
  lease_expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  UNIQUE (project_id, request_id)
);

CREATE INDEX IF NOT EXISTS workflow_runs_project_idx
  ON workflow_runs (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_stage_outputs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('analyze', 'research', 'strategy', 'prompts')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'blocked', 'failed', 'complete', 'imported')),
  origin TEXT NOT NULL CHECK (origin IN ('model', 'imported')),
  output_json TEXT,
  provenance_json TEXT NOT NULL,
  blocked_reason TEXT,
  error_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  UNIQUE (run_id, stage)
);

CREATE INDEX IF NOT EXISTS workflow_stage_project_idx
  ON workflow_stage_outputs (project_id, run_id, stage);

CREATE TABLE IF NOT EXISTS workflow_drafts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  draft_type TEXT NOT NULL CHECK (draft_type IN ('brief', 'analysis', 'research', 'strategy', 'prompt_pair', 'creative', 'clone')),
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'archived')),
  parent_draft_id TEXT,
  winner_id TEXT,
  validation_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (validation_status IN ('not_applicable', 'valid', 'invalid')),
  authoring_trust TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (authoring_trust IN ('not_applicable', 'verified_runtime', 'unverified_external')),
  source_snapshot_id TEXT,
  stale INTEGER NOT NULL DEFAULT 0 CHECK (stale IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_draft_id) REFERENCES workflow_drafts(id)
);

CREATE INDEX IF NOT EXISTS workflow_drafts_project_idx
  ON workflow_drafts (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS workflow_media_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('fal', 'replicate')),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  model_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('blocked_config', 'ready', 'submitted', 'failed', 'complete')),
  execution_budget_usd REAL NOT NULL CHECK (execution_budget_usd > 0),
  request_json TEXT,
  provider_job_id TEXT,
  response_json TEXT,
  blocked_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES workflow_drafts(id)
);

CREATE INDEX IF NOT EXISTS workflow_media_project_idx
  ON workflow_media_jobs (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_measurements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES workflow_drafts(id)
);

CREATE INDEX IF NOT EXISTS workflow_measurements_draft_idx
  ON workflow_measurements (project_id, draft_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_winners (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  measurement_ids_json TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES workflow_drafts(id)
);

CREATE INDEX IF NOT EXISTS workflow_winners_project_idx
  ON workflow_winners (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_clones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  parent_draft_id TEXT NOT NULL,
  clone_draft_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES workflow_winners(id),
  FOREIGN KEY (parent_draft_id) REFERENCES workflow_drafts(id),
  FOREIGN KEY (clone_draft_id) REFERENCES workflow_drafts(id)
);

CREATE INDEX IF NOT EXISTS workflow_clones_project_idx
  ON workflow_clones (project_id, created_at DESC);
