CREATE TABLE IF NOT EXISTS workflow_ai_budget_envelopes (
  id TEXT PRIMARY KEY,
  limit_microusd INTEGER NOT NULL CHECK (limit_microusd > 0),
  state TEXT NOT NULL CHECK (state IN ('active', 'paused', 'exhausted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO workflow_ai_budget_envelopes
  (id, limit_microusd, state, created_at, updated_at)
VALUES ('pilot-v1', 2000000, 'active', unixepoch(), unixepoch());

CREATE TABLE IF NOT EXISTS workflow_ai_budget_reservations (
  id TEXT PRIMARY KEY,
  envelope_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('analyze', 'research', 'strategy', 'prompts')),
  model_id TEXT NOT NULL,
  reserved_microusd INTEGER NOT NULL CHECK (reserved_microusd > 0),
  actual_microusd INTEGER CHECK (actual_microusd >= 0),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'committed', 'held')),
  provider_run_id TEXT,
  hold_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (envelope_id) REFERENCES workflow_ai_budget_envelopes(id),
  UNIQUE (envelope_id, run_id, stage)
);

CREATE INDEX IF NOT EXISTS workflow_ai_budget_reservations_envelope_idx
  ON workflow_ai_budget_reservations (envelope_id, created_at);

-- The trigger is the concurrency boundary. D1 serializes the INSERT and this
-- check in one SQLite transaction, so concurrent runs cannot reserve more than
-- the single, non-resetting USD 2 pilot envelope.
CREATE TRIGGER IF NOT EXISTS workflow_ai_budget_reserve_guard
BEFORE INSERT ON workflow_ai_budget_reservations
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM workflow_ai_budget_envelopes
      WHERE id = NEW.envelope_id AND state = 'active'
    ) THEN RAISE(ABORT, 'pilot_budget_not_active')
    WHEN (
      COALESCE((
        SELECT SUM(CASE
          WHEN status = 'committed' THEN COALESCE(actual_microusd, reserved_microusd)
          ELSE MAX(reserved_microusd, COALESCE(actual_microusd, 0))
        END)
        FROM workflow_ai_budget_reservations
        WHERE envelope_id = NEW.envelope_id
      ), 0) + NEW.reserved_microusd
    ) > (
      SELECT limit_microusd
      FROM workflow_ai_budget_envelopes
      WHERE id = NEW.envelope_id
    ) THEN RAISE(ABORT, 'pilot_budget_exceeded')
  END;
END;

CREATE TRIGGER IF NOT EXISTS workflow_ai_budget_actual_guard
AFTER UPDATE OF actual_microusd ON workflow_ai_budget_reservations
FOR EACH ROW
WHEN NEW.actual_microusd > NEW.reserved_microusd OR (
    SELECT COALESCE(SUM(CASE
      WHEN status = 'committed' THEN COALESCE(actual_microusd, reserved_microusd)
      ELSE MAX(reserved_microusd, COALESCE(actual_microusd, 0))
    END), 0)
    FROM workflow_ai_budget_reservations
    WHERE envelope_id = NEW.envelope_id
  ) >= (
    SELECT limit_microusd FROM workflow_ai_budget_envelopes WHERE id = NEW.envelope_id
  )
BEGIN
  UPDATE workflow_ai_budget_envelopes
  SET state = CASE
    WHEN (
      SELECT COALESCE(SUM(CASE
        WHEN status = 'committed' THEN COALESCE(actual_microusd, reserved_microusd)
        ELSE MAX(reserved_microusd, COALESCE(actual_microusd, 0))
      END), 0)
      FROM workflow_ai_budget_reservations
      WHERE envelope_id = NEW.envelope_id
    ) >= limit_microusd THEN 'exhausted'
    ELSE 'paused'
  END,
  updated_at = unixepoch()
  WHERE id = NEW.envelope_id;
END;

-- Any uncertain provider outcome freezes the shared envelope. A held reserve
-- therefore cannot coexist with a later paid request while reconciliation is
-- still pending.
CREATE TRIGGER IF NOT EXISTS workflow_ai_budget_hold_guard
AFTER UPDATE OF status ON workflow_ai_budget_reservations
FOR EACH ROW
WHEN NEW.status = 'held'
BEGIN
  UPDATE workflow_ai_budget_envelopes
  SET state = 'paused', updated_at = unixepoch()
  WHERE id = NEW.envelope_id AND state = 'active';
END;
