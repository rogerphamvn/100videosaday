const PILOT_ENVELOPE_ID = 'pilot-v1';
const MICROS_PER_USD = 1_000_000;

export class PilotBudgetError extends Error {
  constructor(code, message, status = 409, details = undefined) {
    super(message);
    this.name = 'PilotBudgetError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function toMicrousd(value, field = 'amountUsd') {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PilotBudgetError('pilot_budget_invalid', `${field} must be a positive finite number.`, 503);
  }
  const micros = Math.ceil(amount * MICROS_PER_USD);
  if (!Number.isSafeInteger(micros) || micros <= 0) {
    throw new PilotBudgetError('pilot_budget_invalid', `${field} is outside the supported range.`, 503);
  }
  return micros;
}

function fromMicrousd(value) {
  return Number((Number(value || 0) / MICROS_PER_USD).toFixed(6));
}

function db(env) {
  if (!env?.AUTH_DB?.prepare) throw new PilotBudgetError('pilot_budget_unavailable', 'Pilot budget storage is unavailable.', 503);
  return env.AUTH_DB;
}

function normalizeDatabaseError(error) {
  const message = String(error?.message || '');
  if (message.includes('UNIQUE constraint failed')) {
    return new PilotBudgetError('pilot_budget_reservation_exists', 'This stage already has a pilot budget reservation and will not be submitted again.', 409);
  }
  if (message.includes('pilot_budget_exceeded')) {
    return new PilotBudgetError('pilot_budget_exceeded', 'The fixed USD 2 pilot budget has no room for this call.', 409);
  }
  if (message.includes('pilot_budget_not_active')) {
    return new PilotBudgetError('pilot_budget_not_active', 'The pilot budget is paused or exhausted.', 409);
  }
  return new PilotBudgetError('pilot_budget_unavailable', 'Pilot budget reservation failed closed.', 503);
}

export async function reservePilotBudget({ runId, projectId, stage, modelId, amountUsd }, env) {
  const reservedMicrousd = toMicrousd(amountUsd, 'amountUsd');
  const reservationId = `budget_${crypto.randomUUID().replaceAll('-', '')}`;
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    await db(env).prepare(`INSERT INTO workflow_ai_budget_reservations
      (id, envelope_id, run_id, project_id, stage, model_id, reserved_microusd, actual_microusd, status, provider_run_id, hold_reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'reserved', NULL, NULL, ?, ?)`)
      .bind(reservationId, PILOT_ENVELOPE_ID, runId, projectId, stage, modelId, reservedMicrousd, timestamp, timestamp).run();
  } catch (error) {
    if (error instanceof PilotBudgetError) throw error;
    throw normalizeDatabaseError(error);
  }
  return { id: reservationId, envelopeId: PILOT_ENVELOPE_ID, reservedUsd: fromMicrousd(reservedMicrousd) };
}

export async function commitPilotBudget(reservationId, { actualUsd, providerRunId }, env) {
  const actual = Number(actualUsd);
  if (!Number.isFinite(actual) || actual < 0) throw new PilotBudgetError('pilot_budget_invalid', 'actualUsd must be a non-negative finite number.', 503);
  const actualMicrousd = Math.ceil(actual * MICROS_PER_USD);
  const timestamp = Math.floor(Date.now() / 1000);
  const result = await db(env).prepare(`UPDATE workflow_ai_budget_reservations
    SET status = 'committed', actual_microusd = ?, provider_run_id = ?, hold_reason = NULL, updated_at = ?
    WHERE id = ? AND status = 'reserved'`)
    .bind(actualMicrousd, String(providerRunId || '').slice(0, 200) || null, timestamp, reservationId).run();
  if (Number(result?.meta?.changes || 0) !== 1) {
    throw new PilotBudgetError('pilot_budget_settlement_conflict', 'Pilot budget settlement did not match an open reservation.', 503);
  }
}

export async function holdPilotBudget(reservationId, reason, settlement = {}, env) {
  const hasActual = settlement.actualUsd !== null && settlement.actualUsd !== undefined;
  const actual = hasActual ? Number(settlement.actualUsd) : null;
  if (hasActual && (!Number.isFinite(actual) || actual < 0)) {
    throw new PilotBudgetError('pilot_budget_invalid', 'held actualUsd must be a non-negative finite number.', 503);
  }
  const actualMicrousd = hasActual ? Math.ceil(actual * MICROS_PER_USD) : null;
  const providerRunId = String(settlement.providerRunId || '').slice(0, 200) || null;
  const timestamp = Math.floor(Date.now() / 1000);
  const result = await db(env).prepare(`UPDATE workflow_ai_budget_reservations
    SET status = 'held', actual_microusd = COALESCE(?, actual_microusd),
      provider_run_id = COALESCE(?, provider_run_id), hold_reason = ?, updated_at = ?
    WHERE id = ? AND status = 'reserved'`)
    .bind(actualMicrousd, providerRunId, String(reason || 'provider_outcome_uncertain').slice(0, 80), timestamp, reservationId).run();
  if (Number(result?.meta?.changes || 0) !== 1) {
    throw new PilotBudgetError('pilot_budget_settlement_conflict', 'Pilot budget hold did not match an open reservation.', 503);
  }
}

export async function releasePilotBudget(reservationId, reason, env) {
  // Safe only before provider submission: deleting the open reservation restores
  // capacity without inventing a settlement state unsupported by migration 0004.
  void reason;
  const result = await db(env).prepare("DELETE FROM workflow_ai_budget_reservations WHERE id = ? AND status = 'reserved'")
    .bind(reservationId).run();
  if (Number(result?.meta?.changes || 0) !== 1) {
    throw new PilotBudgetError('pilot_budget_settlement_conflict', 'Pilot budget release did not match an open reservation.', 503);
  }
}

export async function pilotBudgetSnapshot(env) {
  const database = db(env);
  const envelope = await database.prepare('SELECT * FROM workflow_ai_budget_envelopes WHERE id = ?').bind(PILOT_ENVELOPE_ID).first();
  if (!envelope) throw new PilotBudgetError('pilot_budget_unavailable', 'Pilot budget envelope is missing.', 503);
  const totals = await database.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status = 'reserved' THEN reserved_microusd ELSE 0 END), 0) AS reserved_microusd,
      COALESCE(SUM(CASE WHEN status = 'committed' THEN actual_microusd ELSE 0 END), 0) AS spent_microusd,
      COALESCE(SUM(CASE WHEN status = 'held' THEN MAX(reserved_microusd, COALESCE(actual_microusd, 0)) ELSE 0 END), 0) AS held_microusd,
      COALESCE(SUM(CASE
        WHEN status = 'committed' THEN COALESCE(actual_microusd, reserved_microusd)
        ELSE MAX(reserved_microusd, COALESCE(actual_microusd, 0))
      END), 0) AS accounted_microusd
    FROM workflow_ai_budget_reservations WHERE envelope_id = ?`).bind(PILOT_ENVELOPE_ID).first();
  const limit = Number(envelope.limit_microusd);
  const reserved = Number(totals?.reserved_microusd || 0);
  const held = Number(totals?.held_microusd || 0);
  const accounted = Number(totals?.accounted_microusd || 0);
  let state = held > 0 ? 'held' : envelope.state;
  if (state === 'active' && accounted >= limit) state = 'exhausted';
  return {
    envelopeId: PILOT_ENVELOPE_ID,
    capUsd: fromMicrousd(limit),
    reservedUsd: fromMicrousd(reserved),
    spentUsd: fromMicrousd(totals?.spent_microusd || 0),
    heldUsd: fromMicrousd(held),
    accountedUsd: fromMicrousd(accounted),
    remainingUsd: fromMicrousd(Math.max(0, limit - accounted)),
    state
  };
}

export const pilotBudgetInternals = { PILOT_ENVELOPE_ID, MICROS_PER_USD, toMicrousd, fromMicrousd };
