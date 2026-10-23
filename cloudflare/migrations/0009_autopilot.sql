CREATE TABLE IF NOT EXISTS autopilot_plans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  confirmation_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('ready','blocked','consumed','expired')),
  goal TEXT NOT NULL,
  output_json TEXT NOT NULL,
  budget_microusd INTEGER NOT NULL CHECK (budget_microusd BETWEEN 1 AND 2000000),
  max_media_microusd INTEGER NOT NULL CHECK (max_media_microusd BETWEEN 1 AND 2000000),
  preset TEXT NOT NULL CHECK (preset IN ('balanced','quality','speed')),
  readiness_json TEXT NOT NULL,
  frozen_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS autopilot_plans_project_idx
  ON autopilot_plans(project_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS autopilot_plan_budget_guard
BEFORE INSERT ON autopilot_plans
FOR EACH ROW WHEN NEW.max_media_microusd > NEW.budget_microusd
BEGIN
  SELECT RAISE(ABORT,'autopilot_budget_invalid');
END;

CREATE TABLE IF NOT EXISTS autopilot_runs (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','waiting','paused','held','failed','complete','cancelled')),
  phase TEXT NOT NULL CHECK (phase IN ('workflow','media_quote','media_submit','media_poll','done')),
  workflow_run_id TEXT,
  media_quote_id TEXT,
  media_job_id TEXT,
  blocked_reason TEXT,
  error_json TEXT,
  cancel_requested INTEGER NOT NULL DEFAULT 0 CHECK (cancel_requested IN (0,1)),
  initiator TEXT NOT NULL DEFAULT 'team' CHECK (initiator='team'),
  confirmed_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  poll_count INTEGER NOT NULL DEFAULT 0 CHECK (poll_count >= 0),
  lease_token TEXT,
  lease_expires_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES autopilot_plans(id),
  FOREIGN KEY (project_id) REFERENCES production_projects(id) ON DELETE CASCADE,
  UNIQUE(project_id,idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS autopilot_one_unresolved_run_per_project
  ON autopilot_runs(project_id)
  WHERE status IN ('queued','running','waiting','paused','held');

CREATE INDEX IF NOT EXISTS autopilot_runs_claim_idx
  ON autopilot_runs(status, lease_expires_at, updated_at);

CREATE TRIGGER IF NOT EXISTS autopilot_run_media_budget_guard
BEFORE INSERT ON autopilot_runs
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM media_budget_envelopes b JOIN autopilot_plans p ON p.id=NEW.plan_id
    WHERE b.project_id=NEW.project_id AND b.state='active'
      AND b.limit_microusd>=p.budget_microusd
      AND b.max_job_microusd>=p.max_media_microusd
      AND b.revision=CAST(json_extract(p.frozen_json,'$.mediaBudgetAuthorization.before.revision') AS INTEGER)+1
  ) THEN RAISE(ABORT,'autopilot_media_budget_stale') END;
END;

CREATE TABLE IF NOT EXISTS autopilot_scheduler_state (
  id INTEGER PRIMARY KEY CHECK (id=1),
  last_tick_at INTEGER NOT NULL,
  last_result TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS autopilot_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','complete','paused','held','released','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_job_id TEXT,
  detail_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES autopilot_runs(id) ON DELETE CASCADE,
  UNIQUE(run_id,step_key)
);

CREATE TABLE IF NOT EXISTS autopilot_budget_reservations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  reserved_microusd INTEGER NOT NULL CHECK (reserved_microusd > 0),
  actual_microusd INTEGER CHECK (actual_microusd >= 0),
  status TEXT NOT NULL CHECK (status IN ('reserved','committed','held','released')),
  provider_run_id TEXT,
  hold_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES autopilot_runs(id) ON DELETE CASCADE,
  UNIQUE(run_id,step_key)
);

CREATE TRIGGER IF NOT EXISTS autopilot_budget_reserve_guard
BEFORE INSERT ON autopilot_budget_reservations
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM autopilot_runs
      WHERE id=NEW.run_id AND status IN ('queued','running') AND cancel_requested=0
    ) THEN RAISE(ABORT,'autopilot_run_not_spendable')
    WHEN (
      COALESCE((SELECT SUM(CASE
        WHEN status='released' THEN 0
        WHEN status='committed' THEN COALESCE(actual_microusd,reserved_microusd)
        ELSE MAX(reserved_microusd,COALESCE(actual_microusd,0)) END)
        FROM autopilot_budget_reservations WHERE run_id=NEW.run_id),0)
      + NEW.reserved_microusd
    ) > (
      SELECT budget_microusd FROM autopilot_plans
      WHERE id=(SELECT plan_id FROM autopilot_runs WHERE id=NEW.run_id)
    ) THEN RAISE(ABORT,'autopilot_budget_exceeded')
  END;
END;

CREATE TRIGGER IF NOT EXISTS autopilot_budget_hold_guard
AFTER UPDATE OF status ON autopilot_budget_reservations
FOR EACH ROW WHEN NEW.status='held'
BEGIN
  UPDATE autopilot_runs SET status='held',blocked_reason='autopilot_budget_held',updated_at=unixepoch(),version=version+1
  WHERE id=NEW.run_id AND status NOT IN ('complete','cancelled');
END;

CREATE TRIGGER IF NOT EXISTS autopilot_budget_actual_guard
AFTER UPDATE OF actual_microusd ON autopilot_budget_reservations
FOR EACH ROW WHEN NEW.actual_microusd > NEW.reserved_microusd OR (
  SELECT COALESCE(SUM(CASE WHEN status='released' THEN 0 WHEN status='committed' THEN COALESCE(actual_microusd,reserved_microusd) ELSE MAX(reserved_microusd,COALESCE(actual_microusd,0)) END),0)
  FROM autopilot_budget_reservations WHERE run_id=NEW.run_id
) > (
  SELECT budget_microusd FROM autopilot_plans WHERE id=(SELECT plan_id FROM autopilot_runs WHERE id=NEW.run_id)
)
BEGIN
  UPDATE autopilot_budget_reservations SET status='held',hold_reason='actual_cost_exceeded_confirmed_reserve',updated_at=unixepoch()
  WHERE id=NEW.id;
  UPDATE autopilot_runs SET status='held',blocked_reason='actual_cost_exceeded_confirmed_reserve',updated_at=unixepoch(),version=version+1
  WHERE id=NEW.run_id AND status NOT IN ('complete','cancelled');
END;

