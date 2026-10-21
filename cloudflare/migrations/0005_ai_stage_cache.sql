CREATE TABLE IF NOT EXISTS workflow_ai_cache_policies (
  project_id TEXT PRIMARY KEY,
  ttl_seconds INTEGER NOT NULL CHECK (ttl_seconds BETWEEN 3600 AND 604800),
  max_entries INTEGER NOT NULL CHECK (max_entries BETWEEN 4 AND 64),
  preflight_get_attempts INTEGER NOT NULL CHECK (preflight_get_attempts BETWEEN 1 AND 3),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_ai_stage_cache (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('analyze', 'research', 'strategy', 'prompts')),
  fingerprint TEXT NOT NULL,
  output_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  UNIQUE (project_id, stage, fingerprint)
);

CREATE INDEX IF NOT EXISTS workflow_ai_stage_cache_project_idx
  ON workflow_ai_stage_cache (project_id, expires_at, last_accessed_at DESC);
