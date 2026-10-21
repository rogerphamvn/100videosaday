const DEFAULT_TTL_SECONDS = 86_400;
const DEFAULT_MAX_ENTRIES = 16;
const DEFAULT_PREFLIGHT_GET_ATTEMPTS = 2;
const MAX_CACHE_ENTRY_BYTES = 262_144;
const MAX_RESEARCH_TTL_SECONDS = 21_600;

function timestamp() { return Math.floor(Date.now() / 1000); }
function parseJson(value, fallback = null) { try { return JSON.parse(value); } catch { return fallback; } }
function database(env) {
  if (!env?.AUTH_DB?.prepare) throw new Error('workflow_cache_database_unavailable');
  return env.AUTH_DB;
}
function integerInRange(value, minimum, maximum, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    const error = new Error(`${field} must be an integer from ${minimum} to ${maximum}.`);
    error.code = 'cache_policy_invalid'; error.status = 400; error.details = { field, minimum, maximum };
    throw error;
  }
  return number;
}

export async function ensureAiCachePolicy(env, projectId) {
  const now = timestamp();
  await database(env).prepare(`INSERT OR IGNORE INTO workflow_ai_cache_policies
    (project_id, ttl_seconds, max_entries, preflight_get_attempts, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(projectId, DEFAULT_TTL_SECONDS, DEFAULT_MAX_ENTRIES, DEFAULT_PREFLIGHT_GET_ATTEMPTS, now, now).run();
  return database(env).prepare('SELECT * FROM workflow_ai_cache_policies WHERE project_id = ?').bind(projectId).first();
}

async function prune(env, projectId, policy) {
  const db = database(env), now = timestamp();
  await db.prepare('DELETE FROM workflow_ai_stage_cache WHERE project_id = ? AND expires_at <= ?').bind(projectId, now).run();
  await db.prepare(`DELETE FROM workflow_ai_stage_cache WHERE id IN (
    SELECT id FROM workflow_ai_stage_cache WHERE project_id = ?
    ORDER BY last_accessed_at DESC, created_at DESC, id DESC LIMIT -1 OFFSET ?
  )`).bind(projectId, Number(policy.max_entries)).run();
}

export async function setAiCachePolicy(env, projectId, { ttlHours, maxEntries, preflightGetAttempts }) {
  const ttl = integerInRange(ttlHours, 1, 168, 'ttlHours') * 3600;
  const entries = integerInRange(maxEntries, 4, 64, 'maxEntries');
  const attempts = integerInRange(preflightGetAttempts, 1, 3, 'preflightGetAttempts');
  await ensureAiCachePolicy(env, projectId);
  await database(env).prepare(`UPDATE workflow_ai_cache_policies
    SET ttl_seconds = ?, max_entries = ?, preflight_get_attempts = ?, updated_at = ? WHERE project_id = ?`)
    .bind(ttl, entries, attempts, timestamp(), projectId).run();
  const policy = await ensureAiCachePolicy(env, projectId);
  const now = timestamp();
  await database(env).prepare(`UPDATE workflow_ai_stage_cache SET expires_at = MIN(expires_at, ? + CASE
    WHEN stage = 'research' THEN MIN(?, ?)
    ELSE ? END) WHERE project_id = ?`)
    .bind(now, ttl, MAX_RESEARCH_TTL_SECONDS, ttl, projectId).run();
  await prune(env, projectId, policy);
  return policy;
}

export async function readAiStageCache(env, projectId, stage, fingerprint) {
  const policy = await ensureAiCachePolicy(env, projectId);
  await prune(env, projectId, policy);
  const row = await database(env).prepare(`SELECT * FROM workflow_ai_stage_cache
    WHERE project_id = ? AND stage = ? AND fingerprint = ? AND expires_at > ?`)
    .bind(projectId, stage, fingerprint, timestamp()).first();
  if (!row) return null;
  const accessedAt = timestamp();
  await database(env).prepare('UPDATE workflow_ai_stage_cache SET hit_count = hit_count + 1, last_accessed_at = ? WHERE id = ? AND project_id = ?')
    .bind(accessedAt, row.id, projectId).run();
  return { id: row.id, output: parseJson(row.output_json), provenance: parseJson(row.provenance_json, {}), hitAt: accessedAt };
}

export async function deleteAiStageCache(env, projectId, cacheId) {
  await database(env).prepare('DELETE FROM workflow_ai_stage_cache WHERE id = ? AND project_id = ?').bind(cacheId, projectId).run();
}

export async function writeAiStageCache(env, projectId, stage, fingerprint, output, provenance) {
  const policy = await ensureAiCachePolicy(env, projectId), now = timestamp();
  const outputJson = JSON.stringify(output), provenanceJson = JSON.stringify(provenance);
  const entryBytes = new TextEncoder().encode(outputJson).byteLength + new TextEncoder().encode(provenanceJson).byteLength;
  if (entryBytes > MAX_CACHE_ENTRY_BYTES) return false;
  const id = `cache_${crypto.randomUUID()}`;
  const ttlSeconds = stage === 'research' ? Math.min(Number(policy.ttl_seconds), MAX_RESEARCH_TTL_SECONDS) : Number(policy.ttl_seconds);
  await database(env).prepare(`INSERT OR IGNORE INTO workflow_ai_stage_cache
    (id, project_id, stage, fingerprint, output_json, provenance_json, created_at, expires_at, last_accessed_at, hit_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .bind(id, projectId, stage, fingerprint, outputJson, provenanceJson, now, now + ttlSeconds, now).run();
  await prune(env, projectId, policy);
  return true;
}

export async function aiCacheSnapshot(env, projectId) {
  const policy = await ensureAiCachePolicy(env, projectId);
  await prune(env, projectId, policy);
  const now = timestamp();
  const counts = await database(env).prepare(`SELECT COUNT(*) AS entries,
    COALESCE(SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END), 0) AS valid_entries
    FROM workflow_ai_stage_cache WHERE project_id = ?`).bind(now, projectId).first();
  const hitRows = await database(env).prepare(`SELECT id, stage, last_accessed_at FROM workflow_ai_stage_cache
    WHERE project_id = ? AND hit_count > 0 ORDER BY last_accessed_at DESC, id DESC LIMIT 5`).bind(projectId).all();
  return {
    policy: {
      ttlHours: Number(policy.ttl_seconds) / 3600,
      effectiveResearchTtlHours: Math.min(Number(policy.ttl_seconds), MAX_RESEARCH_TTL_SECONDS) / 3600,
      maxEntries: Number(policy.max_entries), preflightGetAttempts: Number(policy.preflight_get_attempts)
    },
    stats: { entries: Number(counts?.entries || 0), validEntries: Number(counts?.valid_entries || 0) },
    lastHits: (hitRows.results ?? hitRows).map((row) => ({ stage: row.stage, cacheId: row.id, hitAt: Number(row.last_accessed_at) }))
  };
}

export const workflowCacheInternals = {
  DEFAULT_TTL_SECONDS, DEFAULT_MAX_ENTRIES, DEFAULT_PREFLIGHT_GET_ATTEMPTS,
  MAX_CACHE_ENTRY_BYTES, MAX_RESEARCH_TTL_SECONDS, integerInRange
};
