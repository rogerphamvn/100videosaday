CREATE TABLE IF NOT EXISTS provider_project_models (
  project_id TEXT PRIMARY KEY REFERENCES production_projects(id),
  models_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
