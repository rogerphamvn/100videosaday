import { validatePromptPair } from './prompt-validation.mjs';
import {
  WorkflowProviderError,
  analyzeProduct,
  authorPromptPair,
  createStrategy,
  prepareMediaRequest,
  researchProduct,
  validateWorkflowStageOutput,
  workflowProviderReadiness
} from '../integrations/workflow-providers.mjs';
import { PilotBudgetError, pilotBudgetSnapshot } from '../integrations/pilot-budget.mjs';
import { PROMPT_POLICY_VERSION } from '../integrations/prompt-efficiency.mjs';
import { aiCacheSnapshot, deleteAiStageCache, ensureAiCachePolicy, readAiStageCache, setAiCachePolicy, writeAiStageCache } from '../integrations/workflow-cache.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0' };
const MAX_REQUEST_BYTES = 1_572_864;
const MAX_SOURCE_BYTES = 262_144;
const MAX_SOURCE_COUNT = 4;
const MAX_SOURCE_EDGE_PX = 1_600;
const MAX_PAYLOAD_BYTES = 262_144;
const STAGES = ['analyze', 'research', 'strategy', 'prompts'];
const DRAFT_TYPES = new Set(['brief', 'analysis', 'research', 'strategy', 'prompt_pair', 'creative', 'clone']);
const PROMPT_FAMILIES = new Map([
  ['anthropic/claude-opus-5.5', 'claude-opus-5.5'],
  ['openai/gpt-6.1-sol', 'gpt-6.1-sol']
]);
const encoder = new TextEncoder();

class WorkflowError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function now() { return Math.floor(Date.now() / 1000); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function parseJson(value, fallback = null) { try { return JSON.parse(value); } catch { return fallback; } }
function byteLength(value) { return encoder.encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength; }

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requiredId(value, field = 'projectId') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value)) {
    throw new WorkflowError('validation_failed', `${field} is invalid.`, 400, { field });
  }
  return value;
}

function requiredText(value, field, maximum = 500, minimum = 1) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < minimum || text.length > maximum) throw new WorkflowError('validation_failed', `${field} must contain ${minimum} to ${maximum} characters.`, 400, { field });
  return text;
}

async function readJsonBounded(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') throw new WorkflowError('content_type_required', 'Content-Type application/json is required.', 415);
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new WorkflowError('request_too_large', 'Workflow request exceeds 1.5 MiB.', 413);
  if (!request.body) throw new WorkflowError('invalid_json', 'JSON body is required.', 400);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      try { await reader.cancel('request_too_large'); } catch {}
      throw new WorkflowError('request_too_large', 'Workflow request exceeds 1.5 MiB.', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value;
  } catch {
    throw new WorkflowError('invalid_json', 'Request body must be a JSON object.', 400);
  }
}

async function rows(statement) {
  const result = await statement.all();
  return result.results ?? result;
}

async function projectRow(env, projectId) {
  if (!env.AUTH_DB) throw new WorkflowError('database_not_configured', 'Workflow database is not configured.', 503);
  const project = await env.AUTH_DB.prepare('SELECT * FROM production_projects WHERE id = ?').bind(projectId).first();
  if (!project) throw new WorkflowError('project_not_found', 'Project was not found.', 404);
  return project;
}

async function ensureWorkflowProject(env, projectId) {
  const timestamp = now();
  await env.AUTH_DB.prepare(`
    INSERT OR IGNORE INTO workflow_projects (project_id, active_run_id, status, source_revision, created_at, updated_at)
    VALUES (?, NULL, 'draft', 0, ?, ?)
  `).bind(projectId, timestamp, timestamp).run();
  return env.AUTH_DB.prepare('SELECT * FROM workflow_projects WHERE project_id = ?').bind(projectId).first();
}

function projectDto(row) {
  return { id: row.id, name: row.name, product: row.product, market: row.market, createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) };
}

function sourceDto(row) {
  return { id: row.id, projectId: row.project_id, kind: row.kind, filename: row.filename, mimeType: row.mime_type, byteSize: Number(row.byte_size), slot: Number(row.source_slot), contentHash: row.content_hash, dataUrl: row.data_url, createdAt: Number(row.created_at) };
}

function runDto(row) {
  if (!row) return null;
  return { id: row.id, projectId: row.project_id, requestId: row.request_id, sourceRevision: Number(row.source_revision), status: row.status, currentStage: row.current_stage, blockedReason: row.blocked_reason, error: parseJson(row.error_json), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) };
}

function stageDto(row) {
  const provenance = parseJson(row.provenance_json, {});
  return { id: row.id, runId: row.run_id, projectId: row.project_id, stage: row.stage, status: row.status, origin: provenance.cacheHit === true ? 'cache' : row.origin, output: parseJson(row.output_json), provenance, blockedReason: row.blocked_reason, error: parseJson(row.error_json), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) };
}

function draftDto(row) {
  return { id: row.id, projectId: row.project_id, draftType: row.draft_type, title: row.title, payload: parseJson(row.payload_json, {}), revision: Number(row.revision), status: row.status, parentDraftId: row.parent_draft_id, winnerId: row.winner_id, validationStatus: row.validation_status, authoringTrust: row.authoring_trust, sourceSnapshotId: row.source_snapshot_id, stale: Boolean(row.stale), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) };
}

function mediaJobDto(row) {
  return { id: row.id, projectId: row.project_id, draftId: row.draft_id, provider: row.provider, mediaType: row.media_type, modelId: row.model_id, status: row.status, executionBudgetUsd: Number(row.execution_budget_usd), request: parseJson(row.request_json), providerJobId: row.provider_job_id, response: parseJson(row.response_json), blockedReason: row.blocked_reason, createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) };
}

function measurementDto(row) {
  return { id: row.id, projectId: row.project_id, draftId: row.draft_id, metric: row.metric, value: Number(row.value), unit: row.unit, evidenceRef: row.evidence_ref, observedAt: row.observed_at, createdAt: Number(row.created_at) };
}

function winnerDto(row) {
  return { id: row.id, projectId: row.project_id, draftId: row.draft_id, measurementIds: parseJson(row.measurement_ids_json, []), rationale: row.rationale, createdAt: Number(row.created_at) };
}

function cloneDto(row) {
  return { id: row.id, projectId: row.project_id, winnerId: row.winner_id, parentDraftId: row.parent_draft_id, cloneDraftId: row.clone_draft_id, createdAt: Number(row.created_at) };
}

export async function workflowSnapshot(env, projectId) {
  const project = await projectRow(env, projectId);
  const workflow = await ensureWorkflowProject(env, projectId);
  const [sourceRows, runRows, stageRows, draftRows, mediaRows, measurementRows, winnerRows, cloneRows, pilotBudget, aiCache] = await Promise.all([
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_sources WHERE project_id = ? ORDER BY created_at, id').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE project_id = ? ORDER BY created_at DESC').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_stage_outputs WHERE project_id = ? ORDER BY created_at, stage').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_drafts WHERE project_id = ? ORDER BY updated_at DESC').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_media_jobs WHERE project_id = ? ORDER BY created_at DESC').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_measurements WHERE project_id = ? ORDER BY created_at DESC').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_winners WHERE project_id = ? ORDER BY created_at DESC').bind(projectId)),
    rows(env.AUTH_DB.prepare('SELECT * FROM workflow_clones WHERE project_id = ? ORDER BY created_at DESC').bind(projectId)),
    pilotBudgetSnapshot(env),
    aiCacheSnapshot(env, projectId)
  ]);
  return {
    project: projectDto(project),
    workflow: { status: workflow.status, sourceRevision: Number(workflow.source_revision), activeRunId: workflow.active_run_id },
    sources: sourceRows.map(sourceDto),
    runs: runRows.map(runDto),
    activeRun: runDto(runRows.find((item) => item.id === workflow.active_run_id)),
    stages: stageRows.map(stageDto), drafts: draftRows.map(draftDto), mediaJobs: mediaRows.map(mediaJobDto),
    measurements: measurementRows.map(measurementDto), winners: winnerRows.map(winnerDto), clones: cloneRows.map(cloneDto),
    providerReadiness: workflowProviderReadiness(env),
    pilotBudget,
    aiCache,
    limits: { requestBytes: MAX_REQUEST_BYTES, sourceBytes: MAX_SOURCE_BYTES, sourceCount: MAX_SOURCE_COUNT, draftPayloadBytes: MAX_PAYLOAD_BYTES }
  };
}

async function currentSourceSnapshot(env, projectId) {
  const workflow = await ensureWorkflowProject(env, projectId);
  const sourceRows = await rows(env.AUTH_DB.prepare('SELECT * FROM workflow_sources WHERE project_id = ? ORDER BY source_slot, id').bind(projectId));
  const basis = `${projectId}|${Number(workflow.source_revision)}|${sourceRows.map((row) => `${row.kind}:${row.content_hash}`).join('|')}`;
  return { id: `snap_${(await sha256Hex(basis)).slice(0, 32)}`, revision: Number(workflow.source_revision), sources: sourceRows.map(sourceDto) };
}

function projectCacheFacts(project) {
  return { id: project.id, name: project.name, product: project.product, market: project.market };
}

async function stageCacheFingerprint(stage, context, env, sourceSnapshot) {
  const modelBindings = {
    analyze: env.WORKFLOW_ANALYZE_MODEL_ID,
    research: env.WORKFLOW_RESEARCH_MODEL_ID,
    strategy: env.WORKFLOW_STRATEGY_MODEL_ID,
    prompts: env.WORKFLOW_PROMPT_MODEL_ID
  };
  const sources = sourceSnapshot.sources.map(({ id, kind, mimeType, contentHash, slot }) => ({ id, kind, mimeType, contentHash, slot }));
  const common = {
    contract: 'workflow-ai-stage-cache/1', promptPolicyVersion: PROMPT_POLICY_VERSION, stage, sourceSnapshotId: sourceSnapshot.id,
    sourceRevision: sourceSnapshot.revision, modelId: modelBindings[stage] || null,
    credentialNamespace: await sha256Hex(String(env.OPENROUTER_API_KEY || 'not-configured')),
    pilotBillingMode: String(env.WORKFLOW_PILOT_BILLING_MODE || 'strict_total'),
    researchProvider: String(env.WORKFLOW_RESEARCH_PROVIDER || 'JEV').toUpperCase(),
    project: projectCacheFacts(context.project),
    autopilotDirective: context.autopilotDirective||null
  };
  if (stage === 'analyze') common.input = { sources };
  if (stage === 'research') common.input = { analysis: context.analyze };
  if (stage === 'strategy') common.input = { analysis: context.analyze, research: context.research };
  if (stage === 'prompts') common.input = {
    sources, analysis: context.analyze, research: context.research, strategy: context.strategy,
    promptPolicy: 'creative-hook-lab.prompt-authoring/1', megaSchema: 'creative-hook-lab.mega-prompt/1.0.0', negativeSchema: 'creative-hook-lab.negative-prompt/1.0.0'
  };
  return sha256Hex(stableJson(common));
}

function validCachedProvenance(stage, provenance, env) {
  const expected = {
    analyze: env.WORKFLOW_ANALYZE_MODEL_ID,
    research: env.WORKFLOW_RESEARCH_MODEL_ID,
    strategy: env.WORKFLOW_STRATEGY_MODEL_ID,
    prompts: env.WORKFLOW_PROMPT_MODEL_ID
  }[stage];
  return typeof expected === 'string' && provenance?.actualModelId === expected
    && typeof provenance?.providerRunId === 'string' && provenance.providerRunId.length > 0
    && provenance?.verificationStatus === 'actual_invocation_verified';
}

function validatePromptContext(pair, projectId, snapshot) {
  validatePromptPayload(pair);
  for (const prompt of [pair.megaPrompt, pair.negativePrompt]) {
    if (prompt.provenance?.projectId !== projectId || prompt.provenance?.sourceSnapshotId !== snapshot.id) {
      throw new WorkflowError('prompt_context_mismatch', 'Prompt provenance does not match the current project source snapshot.', 422, { expectedProjectId: projectId, expectedSourceSnapshotId: snapshot.id });
    }
  }
  const kindByEvidenceKind = { product_photo: 'product', packaging_photo: 'packaging' };
  const expected = new Map(snapshot.sources.map((source) => [`${source.kind}|${source.contentHash}`, source]));
  const suppliedItems = (pair.megaPrompt.sourceEvidence || []).filter((item) => item.productEvidence === true);
  const supplied = new Map();
  for (const item of suppliedItems) {
    const sourceKind = kindByEvidenceKind[item.kind];
    const key = sourceKind ? `${sourceKind}|${item.contentHash}` : null;
    if (!key || supplied.has(key) || item.hashStatus !== 'verified_bytes') {
      throw new WorkflowError('prompt_source_evidence_mismatch', 'Each uploaded source requires one verified evidence item with the matching source kind.', 422);
    }
    supplied.set(key, item);
  }
  if (expected.size !== supplied.size || [...expected.keys()].some((key) => !supplied.has(key))) {
    throw new WorkflowError('prompt_source_evidence_mismatch', 'Prompt source evidence must exactly match every current product and packaging upload by kind and hash.', 422);
  }
  const identityReferences = pair.megaPrompt.productLock?.references || [];
  for (const [key, source] of expected) {
    const evidence = supplied.get(key);
    const role = source.kind === 'product' ? 'product_identity' : 'packaging_identity';
    if (!identityReferences.some((reference) => reference.evidenceRef === evidence.evidenceId && reference.role === role && reference.fidelity === 'exact')) {
      throw new WorkflowError('prompt_identity_lock_incomplete', `Every ${source.kind} source must have an exact ${role} reference.`, 422, { sourceId: source.id, evidenceId: evidence.evidenceId });
    }
  }
  return pair;
}

function bytesFromBase64(value) {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) throw new WorkflowError('invalid_source', 'Image data URL contains invalid base64.', 400);
  let binary;
  try { binary = atob(value); } catch { throw new WorkflowError('invalid_source', 'Image data URL contains invalid base64.', 400); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function validMagic(mimeType, bytes) {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mimeType === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

function uint16be(bytes, offset) { return bytes[offset] * 256 + bytes[offset + 1]; }
function uint24le(bytes, offset) { return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65_536; }
function uint32be(bytes, offset) { return bytes[offset] * 16_777_216 + bytes[offset + 1] * 65_536 + bytes[offset + 2] * 256 + bytes[offset + 3]; }

function jpegDimensions(bytes) {
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 1 >= bytes.length) break;
    const length = uint16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (sofMarkers.has(marker) && length >= 7) {
      return { width: uint16be(bytes, offset + 5), height: uint16be(bytes, offset + 3) };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes) {
  if (bytes.length < 30) return null;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === 'VP8X') return { width: uint24le(bytes, 24) + 1, height: uint24le(bytes, 27) + 1 };
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10)
    };
  }
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: (bytes[26] + bytes[27] * 256) & 0x3fff, height: (bytes[28] + bytes[29] * 256) & 0x3fff };
  }
  return null;
}

function imageDimensions(mimeType, bytes) {
  if (mimeType === 'image/png' && bytes.length >= 24 && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR') {
    return { width: uint32be(bytes, 16), height: uint32be(bytes, 20) };
  }
  if (mimeType === 'image/jpeg') return jpegDimensions(bytes);
  if (mimeType === 'image/webp') return webpDimensions(bytes);
  return null;
}

async function parseSource(input) {
  const match = typeof input.dataUrl === 'string' && input.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/u);
  if (!match) throw new WorkflowError('invalid_source', 'Source must be a JPEG, PNG, or WEBP base64 data URL.', 400);
  const bytes = bytesFromBase64(match[2]);
  if (bytes.length === 0 || bytes.length > MAX_SOURCE_BYTES) throw new WorkflowError('source_too_large', 'Decoded source image exceeds 256 KiB.', 413);
  if (!validMagic(match[1], bytes)) throw new WorkflowError('source_magic_mismatch', 'Source bytes do not match the declared image type.', 400);
  const dimensions = imageDimensions(match[1], bytes);
  if (!dimensions || !Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new WorkflowError('source_dimensions_invalid', 'Source image dimensions could not be verified.', 400);
  }
  if (dimensions.width > MAX_SOURCE_EDGE_PX || dimensions.height > MAX_SOURCE_EDGE_PX) {
    throw new WorkflowError('source_dimensions_exceeded', `Source image edges must not exceed ${MAX_SOURCE_EDGE_PX} px.`, 413, { maxEdgePx: MAX_SOURCE_EDGE_PX });
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { mimeType: match[1], bytes, contentHash: `sha256:${hash}`, widthPx: dimensions.width, heightPx: dimensions.height };
}

async function atomicBatch(env, statements) {
  if (typeof env.AUTH_DB?.batch !== 'function') {
    throw new WorkflowError('database_batch_unavailable', 'Workflow source changes require atomic D1 batch support.', 503);
  }
  return env.AUTH_DB.batch(statements);
}

async function putSource(input, env) {
  const projectId = requiredId(input.projectId);
  await projectRow(env, projectId);
  await ensureWorkflowProject(env, projectId);
  if (!['product', 'packaging'].includes(input.kind)) throw new WorkflowError('validation_failed', 'kind must be product or packaging.', 400, { field: 'kind' });
  const usedSlots = new Set((await rows(env.AUTH_DB.prepare('SELECT source_slot FROM workflow_sources WHERE project_id = ?').bind(projectId))).map((row) => Number(row.source_slot)));
  const sourceSlot = [1, 2, 3, 4].find((slot) => !usedSlots.has(slot));
  if (!sourceSlot) throw new WorkflowError('source_limit_reached', 'A project can contain at most four source images.', 409);
  const parsed = await parseSource(input);
  const source = { id: id('src'), projectId, kind: input.kind, filename: input.filename ? requiredText(input.filename, 'filename', 120) : null, ...parsed, dataUrl: input.dataUrl, createdAt: now() };
  try {
    await atomicBatch(env, [
      env.AUTH_DB.prepare(`INSERT INTO workflow_sources
      (id, project_id, kind, filename, mime_type, byte_size, source_slot, content_hash, data_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(source.id, projectId, source.kind, source.filename, source.mimeType, source.bytes.length, sourceSlot, source.contentHash, source.dataUrl, source.createdAt),
      env.AUTH_DB.prepare(`UPDATE workflow_projects SET source_revision = source_revision + 1, active_run_id = NULL,
        status = 'draft', updated_at = ? WHERE project_id = ?`).bind(source.createdAt, projectId),
      env.AUTH_DB.prepare("UPDATE workflow_drafts SET stale = 1, updated_at = ? WHERE project_id = ? AND draft_type IN ('prompt_pair', 'creative', 'clone')")
        .bind(source.createdAt, projectId)
    ]);
  } catch (error) {
    if (String(error?.message || error).includes('workflow_sources.project_id, workflow_sources.source_slot')) throw new WorkflowError('source_slot_conflict', 'Concurrent source upload claimed the same slot; retry.', 409);
    if (String(error?.message || error).includes('UNIQUE')) throw new WorkflowError('duplicate_source', 'This source is already stored with the same kind.', 409);
    throw error;
  }
  return sourceDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_sources WHERE id = ? AND project_id = ?').bind(source.id, projectId).first());
}

async function deleteSource(input, env) {
  const projectId = requiredId(input.projectId), sourceId = requiredId(input.sourceId, 'sourceId');
  await projectRow(env, projectId);
  await ensureWorkflowProject(env, projectId);
  const timestamp = now();
  const results = await atomicBatch(env, [
    env.AUTH_DB.prepare(`UPDATE workflow_projects SET source_revision = source_revision + 1, active_run_id = NULL,
      status = 'draft', updated_at = ? WHERE project_id = ?
      AND EXISTS (SELECT 1 FROM workflow_sources WHERE id = ? AND project_id = ?)`)
      .bind(timestamp, projectId, sourceId, projectId),
    env.AUTH_DB.prepare(`UPDATE workflow_drafts SET stale = 1, updated_at = ? WHERE project_id = ?
      AND draft_type IN ('prompt_pair', 'creative', 'clone')
      AND EXISTS (SELECT 1 FROM workflow_sources WHERE id = ? AND project_id = ?)`)
      .bind(timestamp, projectId, sourceId, projectId),
    env.AUTH_DB.prepare('DELETE FROM workflow_sources WHERE id = ? AND project_id = ?').bind(sourceId, projectId)
  ]);
  if (Number(results.at(-1)?.meta?.changes || 0) !== 1) throw new WorkflowError('source_not_found', 'Source was not found in this project.', 404);
  return { deleted: true, sourceId };
}

function validatePromptPayload(payload) {
  if (!payload?.megaPrompt || !payload?.negativePrompt) throw new WorkflowError('invalid_prompt_pair', 'payload must contain megaPrompt and negativePrompt.', 422);
  const result = validatePromptPair(payload.megaPrompt, payload.negativePrompt);
  if (!result?.valid) throw new WorkflowError('invalid_prompt_pair', 'Canonical prompt pair validation failed.', 422, { errors: result?.errors || ['unknown_validation_error'] });
  return payload;
}

function boundedPayload(payload, field = 'payload') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new WorkflowError('validation_failed', `${field} must be an object.`, 400, { field });
  if (byteLength(payload) > MAX_PAYLOAD_BYTES) throw new WorkflowError('payload_too_large', `${field} exceeds 256 KiB.`, 413, { field });
  return payload;
}

async function putDraft(input, env) {
  const projectId = requiredId(input.projectId);
  await projectRow(env, projectId);
  const draftType = DRAFT_TYPES.has(input.draftType) ? input.draftType : null;
  if (!draftType) throw new WorkflowError('validation_failed', 'draftType is invalid.', 400, { field: 'draftType' });
  const payload = boundedPayload(input.payload);
  let validationStatus = 'not_applicable', authoringTrust = 'not_applicable', sourceSnapshotId = null;
  if (draftType === 'prompt_pair' || draftType === 'clone') {
    if (draftType === 'clone' && !input.draftId) throw new WorkflowError('clone_creation_forbidden', 'Clone drafts are created only from measured winners.', 409);
    const snapshot = await currentSourceSnapshot(env, projectId);
    validatePromptContext(payload, projectId, snapshot);
    validationStatus = 'valid'; authoringTrust = 'unverified_external'; sourceSnapshotId = snapshot.id;
  }
  if (draftType === 'creative') await validateCreativePayload(payload, env, projectId);
  const timestamp = now();
  if (!input.draftId) {
    const draftId = id('draft'), title = input.title ? requiredText(input.title, 'title', 120) : `${draftType} draft`;
    await env.AUTH_DB.prepare(`INSERT INTO workflow_drafts
      (id, project_id, draft_type, title, payload_json, revision, status, parent_draft_id, winner_id, validation_status, authoring_trust, source_snapshot_id, stale, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 'draft', NULL, NULL, ?, ?, ?, 0, ?, ?)`)
      .bind(draftId, projectId, draftType, title, JSON.stringify(payload), validationStatus, authoringTrust, sourceSnapshotId, timestamp, timestamp).run();
    return draftDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ?').bind(draftId, projectId).first());
  }
  const draftId = requiredId(input.draftId, 'draftId');
  const existing = await env.AUTH_DB.prepare('SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ?').bind(draftId, projectId).first();
  if (!existing) throw new WorkflowError('draft_not_found', 'Draft was not found in this project.', 404);
  if (existing.draft_type !== draftType) throw new WorkflowError('draft_type_immutable', 'An existing draft cannot be converted to another draft type.', 409, { currentDraftType: existing.draft_type });
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== Number(existing.revision)) throw new WorkflowError('revision_conflict', 'Draft revision changed; refresh before saving.', 409, { currentRevision: Number(existing.revision) });
  const title = input.title ? requiredText(input.title, 'title', 120) : existing.title;
  const result = await env.AUTH_DB.prepare(`UPDATE workflow_drafts SET draft_type = ?, title = ?, payload_json = ?, validation_status = ?, authoring_trust = ?, source_snapshot_id = ?, stale = 0, revision = revision + 1, updated_at = ?
    WHERE id = ? AND project_id = ? AND revision = ?`).bind(draftType, title, JSON.stringify(payload), validationStatus, authoringTrust, sourceSnapshotId, timestamp, draftId, projectId, input.expectedRevision).run();
  if (Number(result?.meta?.changes || 0) !== 1) throw new WorkflowError('revision_conflict', 'Draft revision changed; refresh before saving.', 409);
  return draftDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ?').bind(draftId, projectId).first());
}

async function validateCreativePayload(payload, env, projectId) {
  if (payload.testingStatus !== 'ready') throw new WorkflowError('creative_not_testable', 'Creative testingStatus must be ready.', 422);
  const artifact = payload.artifact;
  if (!artifact || !['external_import', 'provider_output'].includes(artifact.origin) || !['image', 'video'].includes(artifact.mediaType)) {
    throw new WorkflowError('creative_artifact_invalid', 'Creative artifact origin and mediaType are required.', 422);
  }
  let locator;
  try { locator = new URL(artifact.locator); } catch { throw new WorkflowError('creative_artifact_invalid', 'Creative artifact locator must be a URL.', 422); }
  if (locator.protocol !== 'https:' || locator.username || locator.password) throw new WorkflowError('creative_artifact_invalid', 'Creative artifact locator must use credential-free HTTPS.', 422);
  requiredText(artifact.evidenceRef, 'artifact.evidenceRef', 1000, 3);
  const promptDraftId = requiredId(payload.promptDraftId, 'promptDraftId');
  const promptDraft = await env.AUTH_DB.prepare("SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ? AND draft_type IN ('prompt_pair','clone') AND validation_status = 'valid' AND stale = 0").bind(promptDraftId, projectId).first();
  if (!promptDraft) throw new WorkflowError('prompt_draft_not_found', 'Creative must reference a same-project prompt-pair draft.', 409);
  validatePromptContext(parseJson(promptDraft.payload_json), projectId, await currentSourceSnapshot(env, projectId));
  if (artifact.origin === 'provider_output') {
    const mediaJobId = requiredId(payload.mediaJobId, 'mediaJobId');
    const job = await env.AUTH_DB.prepare("SELECT id FROM workflow_media_jobs WHERE id = ? AND project_id = ? AND draft_id = ? AND status = 'complete'")
      .bind(mediaJobId, projectId, promptDraftId).first();
    if (!job) throw new WorkflowError('completed_media_required', 'Provider creative requires a completed same-project media job.', 409);
  }
  return { promptDraftId, artifact };
}

async function deleteDraft(input, env) {
  const projectId = requiredId(input.projectId), draftId = requiredId(input.draftId, 'draftId');
  await projectRow(env, projectId);
  const references = await env.AUTH_DB.prepare(`SELECT
    (SELECT COUNT(*) FROM workflow_measurements WHERE project_id = ? AND draft_id = ?) +
    (SELECT COUNT(*) FROM workflow_winners WHERE project_id = ? AND draft_id = ?) +
    (SELECT COUNT(*) FROM workflow_media_jobs WHERE project_id = ? AND draft_id = ?) AS count`)
    .bind(projectId, draftId, projectId, draftId, projectId, draftId).first();
  if (Number(references?.count || 0) > 0) throw new WorkflowError('draft_in_use', 'Draft has measurements, winner, or media lineage and cannot be deleted.', 409);
  const result = await env.AUTH_DB.prepare('DELETE FROM workflow_drafts WHERE id = ? AND project_id = ?').bind(draftId, projectId).run();
  if (Number(result?.meta?.changes || 0) !== 1) throw new WorkflowError('draft_not_found', 'Draft was not found in this project.', 404);
  return { deleted: true, draftId };
}

function runFingerprintBasis(env, projectId, sourceRevision) {
  return JSON.stringify({projectId,sourceRevision,promptPolicyVersion:PROMPT_POLICY_VERSION,revision:Number(env.WORKFLOW_MODEL_REVISION||0),models:['ANALYZE','RESEARCH','STRATEGY','PROMPT'].map(role=>env[`WORKFLOW_${role}_MODEL_ID`]||null),runDirective:String(env.WORKFLOW_RUN_DIRECTIVE_JSON||'')});
}
async function assertModelRevision(env, projectId) {
  if (env.WORKFLOW_MODEL_REVISION === undefined) return;
  const row=await env.AUTH_DB.prepare('SELECT revision FROM provider_project_models WHERE project_id=?').bind(projectId).first();
  if(Number(row?.revision||0)!==Number(env.WORKFLOW_MODEL_REVISION))throw new WorkflowError('model_settings_changed','Model settings changed; reload before running.',409);
}
async function createRun(env, projectId, sourceRevision, requestId) {
  const requestFingerprint = await sha256Hex(runFingerprintBasis(env,projectId,sourceRevision));
  const run = { id: id('run'), projectId, requestId, requestFingerprint, sourceRevision, status: 'pending', createdAt: now() };
  await env.AUTH_DB.prepare(`INSERT INTO workflow_runs
    (id, project_id, request_id, request_fingerprint, source_revision, status, current_stage, blocked_reason, error_json, lease_token, lease_expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, NULL, NULL, ?, ?)`)
    .bind(run.id, projectId, requestId, requestFingerprint, sourceRevision, run.createdAt, run.createdAt).run();
  return env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE id = ? AND project_id = ?').bind(run.id, projectId).first();
}

async function activeOrNewRun(env, projectId, requestId) {
  await assertModelRevision(env,projectId);
  const workflow = await ensureWorkflowProject(env, projectId);
  const fingerprint = await sha256Hex(runFingerprintBasis(env,projectId,Number(workflow.source_revision)));
  let run = await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE project_id = ? AND request_id = ?').bind(projectId, requestId).first();
  if (run && run.request_fingerprint !== fingerprint) throw new WorkflowError('idempotency_conflict', 'requestId was already used with a different source snapshot.', 409, { runId: run.id });
  if (run?.status === 'complete') return run;
  const observedActiveId = workflow.active_run_id;
  if (observedActiveId && observedActiveId !== run?.id) {
    const active = await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE id = ? AND project_id = ?').bind(observedActiveId, projectId).first();
    const liveLease = active?.lease_token && Number(active.lease_expires_at || 0) >= now();
    if (active && Number(active.source_revision) === Number(workflow.source_revision) && (['pending', 'running'].includes(active.status) || liveLease)) {
      throw new WorkflowError('workflow_busy', 'Another workflow run is already active for this project source snapshot.', 409, { runId: active.id });
    }
  }
  let created = false;
  if (!run) {
    try { run = await createRun(env, projectId, Number(workflow.source_revision), requestId); created = true; }
    catch (error) {
      if (!String(error?.message || error).includes('UNIQUE')) throw error;
      run = await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE project_id = ? AND request_id = ?').bind(projectId, requestId).first();
      if (!run || run.request_fingerprint !== fingerprint) throw new WorkflowError('idempotency_conflict', 'Concurrent requestId conflict.', 409);
    }
  }
  if (workflow.active_run_id !== run.id) {
    const claimed = await env.AUTH_DB.prepare(`UPDATE workflow_projects SET active_run_id = ?, status = 'draft', updated_at = ?
      WHERE project_id = ? AND source_revision = ? AND active_run_id IS ?`)
      .bind(run.id, now(), projectId, Number(workflow.source_revision), workflow.active_run_id).run();
    if (Number(claimed?.meta?.changes || 0) !== 1) {
      const current = await ensureWorkflowProject(env, projectId);
      if (current.active_run_id !== run.id) {
        if (created) await env.AUTH_DB.prepare('DELETE FROM workflow_runs WHERE id = ? AND project_id = ?').bind(run.id, projectId).run();
        throw new WorkflowError('workflow_busy', 'Another workflow run claimed this project source snapshot.', 409, { runId: current.active_run_id });
      }
    }
  }
  return run;
}

async function activeRunForImport(env, projectId) {
  const workflow = await ensureWorkflowProject(env, projectId);
  const active = workflow.active_run_id
    ? await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE id = ? AND project_id = ?').bind(workflow.active_run_id, projectId).first()
    : null;
  if (active && Number(active.source_revision) === Number(workflow.source_revision)) {
    const liveLease = active.lease_token && Number(active.lease_expires_at || 0) >= now();
    const importedStage = active.status === 'pending'
      ? await env.AUTH_DB.prepare("SELECT id FROM workflow_stage_outputs WHERE run_id = ? AND project_id = ? AND origin = 'imported' LIMIT 1").bind(active.id, projectId).first()
      : null;
    if (active.status === 'running' || liveLease || (active.status === 'pending' && !String(active.request_id).startsWith('import-') && !importedStage)) {
      throw new WorkflowError('workflow_busy', 'Stage import cannot interleave with an active model workflow.', 409, { runId: active.id });
    }
    if (active.status !== 'complete') return active;
  }
  return activeOrNewRun(env, projectId, `import-${crypto.randomUUID()}`);
}

async function upsertStage(env, { runId, projectId, stage, status, origin, output = null, provenance = {}, blockedReason = null, error = null }) {
  const timestamp = now();
  const existing = await env.AUTH_DB.prepare('SELECT id FROM workflow_stage_outputs WHERE run_id = ? AND project_id = ? AND stage = ?').bind(runId, projectId, stage).first();
  if (existing) {
    await env.AUTH_DB.prepare(`UPDATE workflow_stage_outputs SET status = ?, origin = ?, output_json = ?, provenance_json = ?, blocked_reason = ?, error_json = ?, updated_at = ?
      WHERE id = ? AND run_id = ? AND project_id = ?`)
      .bind(status, origin, output === null ? null : JSON.stringify(output), JSON.stringify(provenance), blockedReason, error ? JSON.stringify(error) : null, timestamp, existing.id, runId, projectId).run();
    return;
  }
  await env.AUTH_DB.prepare(`INSERT INTO workflow_stage_outputs
    (id, run_id, project_id, stage, status, origin, output_json, provenance_json, blocked_reason, error_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id('stage'), runId, projectId, stage, status, origin, output === null ? null : JSON.stringify(output), JSON.stringify(provenance), blockedReason, error ? JSON.stringify(error) : null, timestamp, timestamp).run();
}

async function stageMap(env, runId, projectId) {
  const stageRows = await rows(env.AUTH_DB.prepare('SELECT * FROM workflow_stage_outputs WHERE run_id = ? AND project_id = ?').bind(runId, projectId));
  return new Map(stageRows.map((row) => [row.stage, stageDto(row)]));
}

async function assertRunSourceCurrent(env, run) {
  await assertModelRevision(env,run.project_id);
  const workflow = await ensureWorkflowProject(env, run.project_id);
  if (Number(workflow.source_revision) !== Number(run.source_revision) || workflow.active_run_id !== run.id) {
    throw new WorkflowError('source_snapshot_changed', 'Product sources changed while this run was executing; start a new requestId.', 409, {
      runId: run.id,
      expectedSourceRevision: Number(run.source_revision),
      currentSourceRevision: Number(workflow.source_revision)
    });
  }
}

function assertAuthoredPair(pair, provenance) {
  const family = PROMPT_FAMILIES.get(provenance.actualModelId);
  if (!family) throw new WorkflowError('prompt_author_model_not_approved', 'Actual prompt author is not an approved family.', 502);
  for (const [name, prompt] of [['megaPrompt', pair.megaPrompt], ['negativePrompt', pair.negativePrompt]]) {
    if (prompt.authorship?.modelFamily !== family || prompt.authorship?.verificationStatus !== 'actual_invocation_verified' || prompt.authorship?.invocationRef !== provenance.providerRunId) {
      throw new WorkflowError('prompt_authorship_mismatch', `${name} authorship does not match actual provider provenance.`, 502);
    }
  }
  validatePromptPayload(pair);
  const mega = pair.megaPrompt;
  const overlays = mega.mediaType === 'video'
    ? (mega.creative?.shots || []).flatMap((shot) => shot.textOverlays || [])
    : (mega.creative?.textOverlays || []);
  const audioClaimRefs = mega.mediaType === 'video'
    ? (mega.creative?.shots || []).flatMap((shot) => shot.audio || []).filter((cue) => cue.claimRef)
    : [];
  if ((mega.approvedClaims || []).length > 0 || (mega.strategy?.hook?.claimRefs || []).length > 0 || overlays.length > 0 || audioClaimRefs.length > 0) {
    throw new WorkflowError('human_claim_approval_required', 'Runtime models cannot self-approve claims, overlays, or claim references.', 422);
  }
  if ((mega.sourceEvidence || []).some((evidence) => evidence.reviewStatus !== 'unverified')) {
    throw new WorkflowError('human_evidence_review_required', 'Runtime models cannot mark source evidence approved.', 422);
  }
}

async function createPromptDraft(env, projectId, pair, runId, { authoringTrust = 'verified_runtime' } = {}) {
  const snapshot = await currentSourceSnapshot(env, projectId);
  validatePromptContext(pair, projectId, snapshot);
  const timestamp = now(), draftId = id('draft');
  const result = await env.AUTH_DB.prepare(`INSERT INTO workflow_drafts
    (id, project_id, draft_type, title, payload_json, revision, status, parent_draft_id, winner_id, validation_status, authoring_trust, source_snapshot_id, stale, created_at, updated_at)
    SELECT ?, ?, 'prompt_pair', ?, ?, 1, 'draft', NULL, NULL, 'valid', ?, ?, 0, ?, ?
    FROM workflow_projects WHERE project_id = ? AND source_revision = ?`)
    .bind(draftId, projectId, `Prompt pair · ${runId}`, JSON.stringify(pair), authoringTrust, snapshot.id, timestamp, timestamp, projectId, snapshot.revision).run();
  if (Number(result?.meta?.changes || 0) !== 1) throw new WorkflowError('source_snapshot_changed', 'Product sources changed before the prompt draft could be saved.', 409, { runId });
  return draftId;
}

export async function executeWorkflowRun(env, projectId, options = {}) {
  const project = await projectRow(env, projectId);
  const requestId = requiredText(options.requestId, 'requestId', 128);
  const run = await activeOrNewRun(env, projectId, requestId);
  if (run.status === 'complete') return runDto(run);
  const leaseToken = id('lease'), leaseNow = now();
  const claim = await env.AUTH_DB.prepare(`UPDATE workflow_runs SET lease_token = ?, lease_expires_at = ?, updated_at = ?
    WHERE id = ? AND project_id = ? AND (lease_token IS NULL OR lease_expires_at < ?)`)
    .bind(leaseToken, leaseNow + 600, leaseNow, run.id, projectId, leaseNow).run();
  if (Number(claim?.meta?.changes || 0) !== 1) throw new WorkflowError('workflow_busy', 'This idempotent workflow run is already executing.', 409, { runId: run.id });
  try {
  const sources = (await rows(env.AUTH_DB.prepare('SELECT * FROM workflow_sources WHERE project_id = ? ORDER BY created_at, id').bind(projectId))).map(sourceDto);
  try {
    for (const source of sources) {
      const parsed = await parseSource({ dataUrl: source.dataUrl });
      if (parsed.contentHash !== source.contentHash || parsed.mimeType !== source.mimeType || parsed.bytes.byteLength !== source.byteSize) {
        throw new WorkflowError('source_integrity_mismatch', 'Stored source bytes no longer match their verified upload metadata.', 409, { sourceId: source.id });
      }
    }
  } catch (error) {
    const normalized = error instanceof WorkflowError ? error : new WorkflowError('source_revalidation_failed', 'Stored product sources could not be revalidated.', 409);
    await markRunError(env, run, 'analyze', normalized, 'blocked');
    throw normalized;
  }
  if (!sources.some((source) => source.kind === 'product')) {
    const error = new WorkflowError('product_source_required', 'Upload at least one product image. Packaging remains optional.', 409, { runId: run.id });
    await markRunError(env, run, 'analyze', error, 'blocked');
    throw error;
  }
  const sourceSnapshot = await currentSourceSnapshot(env, projectId);
  const cachePolicy = await ensureAiCachePolicy(env, projectId),maxStages=Number.isInteger(options.maxStages)?Math.max(1,Math.min(options.maxStages,STAGES.length)):STAGES.length;
  let stages = await stageMap(env, run.id, projectId);
  const context = { project: projectDto(project), sources, autopilotDirective:options.autopilotDirective||null };
  let advancedStages=0;
  for (const stage of STAGES) {
    const prior = stages.get(stage);
    if (['complete', 'imported'].includes(prior?.status)) { context[stage === 'prompts' ? 'prompts' : stage] = prior.output; continue; }
    if(advancedStages>=maxStages)break;
    const timestamp = now();
    await env.AUTH_DB.prepare("UPDATE workflow_runs SET status = 'running', current_stage = ?, blocked_reason = NULL, error_json = NULL, updated_at = ? WHERE id = ? AND project_id = ?")
      .bind(stage, timestamp, run.id, projectId).run();
    await env.AUTH_DB.prepare("UPDATE workflow_projects SET status = 'running', updated_at = ? WHERE project_id = ? AND source_revision = ? AND active_run_id = ?")
      .bind(timestamp, projectId, Number(run.source_revision), run.id).run();
    await upsertStage(env, { runId: run.id, projectId, stage, status: 'running', origin: 'model', provenance: {} });
    try {
      await assertRunSourceCurrent(env, run);
      const cacheFingerprint = await stageCacheFingerprint(stage, context, env, sourceSnapshot);
      let cached = await readAiStageCache(env, projectId, stage, cacheFingerprint);
      if (cached && ((!cached.output || typeof cached.output !== 'object' || Array.isArray(cached.output)) || !validCachedProvenance(stage, cached.provenance, env))) {
        await deleteAiStageCache(env, projectId, cached.id);
        cached = null;
      }
      if (cached) {
        try {
          boundedPayload(cached.output, `${stage} cached output`);
          if (stage === 'prompts') {
            assertAuthoredPair(cached.output, cached.provenance);
            validatePromptContext(cached.output, projectId, sourceSnapshot);
          } else {
            validateWorkflowStageOutput(stage, cached.output, { research: context.research });
          }
        } catch {
          await deleteAiStageCache(env, projectId, cached.id);
          cached = null;
        }
      }
      if (cached) {
        const provenance = { ...cached.provenance, cacheHit: true, cacheId: cached.id, cacheHitAt: cached.hitAt };
        await upsertStage(env, { runId: run.id, projectId, stage, status: 'complete', origin: 'model', output: cached.output, provenance });
        context[stage] = cached.output;
        if (stage === 'prompts') await createPromptDraft(env, projectId, cached.output, run.id);
        stages = await stageMap(env, run.id, projectId);
        advancedStages+=1;
        continue;
      }
      let result;
      const providerOptions = { ...options, maxGetAttempts: Number(cachePolicy.preflight_get_attempts), pilotContext: { runId: run.id, projectId } };
      if (stage === 'analyze') result = await analyzeProduct({ project: context.project, sources }, env, providerOptions);
      if (stage === 'research') result = await researchProduct({ project: context.project, analysis: context.analyze }, env, providerOptions);
      if (stage === 'strategy') result = await createStrategy({ project: context.project, analysis: context.analyze, research: context.research }, env, providerOptions);
      if (stage === 'prompts') result = await authorPromptPair({ project: context.project, sources, sourceSnapshotId: sourceSnapshot.id, analysis: context.analyze, research: context.research, strategy: context.strategy }, env, providerOptions);
      await assertRunSourceCurrent(env, run);
      boundedPayload(result.output, `${stage} output`);
      if (stage === 'prompts') assertAuthoredPair(result.output, result.provenance);
      if (stage === 'prompts') validatePromptContext(result.output, projectId, sourceSnapshot);
      await writeAiStageCache(env, projectId, stage, cacheFingerprint, result.output, result.provenance);
      await upsertStage(env, { runId: run.id, projectId, stage, status: 'complete', origin: 'model', output: result.output, provenance: result.provenance });
      context[stage] = result.output;
      if (stage === 'prompts') await createPromptDraft(env, projectId, result.output, run.id);
      stages = await stageMap(env, run.id, projectId);
      advancedStages+=1;
    } catch (error) {
      const normalized = error instanceof WorkflowError || error instanceof WorkflowProviderError
        ? error : new WorkflowError('workflow_stage_failed', 'Workflow stage failed.', 502);
      const state = normalized.status === 503 || normalized.status === 409 ? 'blocked' : 'failed';
      const blockedProvenance = normalized.code === 'research_pending' ? { jev: normalized.details } : {};
      await upsertStage(env, { runId: run.id, projectId, stage, status: state, origin: 'model', provenance: blockedProvenance, blockedReason: normalized.code, error: { code: normalized.code, message: normalized.message, details: normalized.details } });
      await markRunError(env, run, stage, normalized, state);
      normalized.details = { ...(normalized.details || {}), runId: run.id, stage };
      throw normalized;
    }
  }
  stages=await stageMap(env,run.id,projectId);
  if(!STAGES.every(stage=>['complete','imported'].includes(stages.get(stage)?.status))){
    return runDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE id = ? AND project_id = ?').bind(run.id,projectId).first());
  }
  const timestamp = now();
  const completion = await atomicBatch(env, [
    env.AUTH_DB.prepare(`UPDATE workflow_runs SET status = 'complete', current_stage = 'prompts', blocked_reason = NULL, error_json = NULL, updated_at = ?
      WHERE id = ? AND project_id = ? AND source_revision = ?
      AND EXISTS (SELECT 1 FROM workflow_projects WHERE project_id = ? AND source_revision = ? AND active_run_id = ?)`)
      .bind(timestamp, run.id, projectId, Number(run.source_revision), projectId, Number(run.source_revision), run.id),
    env.AUTH_DB.prepare("UPDATE workflow_projects SET status = 'complete', updated_at = ? WHERE project_id = ? AND source_revision = ? AND active_run_id = ?")
      .bind(timestamp, projectId, Number(run.source_revision), run.id)
  ]);
  if (Number(completion[0]?.meta?.changes || 0) !== 1 || Number(completion[1]?.meta?.changes || 0) !== 1) {
    const error = new WorkflowError('source_snapshot_changed', 'Product sources changed before the run could be completed.', 409, { runId: run.id });
    await env.AUTH_DB.prepare("UPDATE workflow_runs SET status = 'blocked', blocked_reason = ?, error_json = ?, updated_at = ? WHERE id = ? AND project_id = ?")
      .bind(error.code, JSON.stringify({ code: error.code, message: error.message }), timestamp, run.id, projectId).run();
    throw error;
  }
  return runDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE id = ? AND project_id = ?').bind(run.id, projectId).first());
  } finally {
    await env.AUTH_DB.prepare('UPDATE workflow_runs SET lease_token = NULL, lease_expires_at = NULL WHERE id = ? AND project_id = ? AND lease_token = ?')
      .bind(run.id, projectId, leaseToken).run();
  }
}

async function markRunError(env, run, stage, error, state) {
  const timestamp = now(), payload = { code: error.code, message: error.message, details: error.details };
  await env.AUTH_DB.prepare('UPDATE workflow_runs SET status = ?, current_stage = ?, blocked_reason = ?, error_json = ?, updated_at = ? WHERE id = ? AND project_id = ?')
    .bind(state, stage, error.code, JSON.stringify(payload), timestamp, run.id, run.project_id).run();
  await env.AUTH_DB.prepare('UPDATE workflow_projects SET status = ?, updated_at = ? WHERE project_id = ? AND source_revision = ? AND active_run_id = ?')
    .bind(state, timestamp, run.project_id, Number(run.source_revision), run.id).run();
}

function validateImportedResearch(output) {
  boundedPayload(output, 'output');
  if (!Array.isArray(output.evidence) || output.evidence.length === 0) throw new WorkflowError('research_evidence_required', 'Imported research requires cited evidence.', 422);
  for (const item of output.evidence) {
    try {
      const url = new URL(item.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { throw new WorkflowError('research_evidence_invalid', 'Every research source requires a credential-free HTTPS URL.', 422); }
    if (!Number.isFinite(Date.parse(item.retrievedAt)) || (item.publishedAt && !Number.isFinite(Date.parse(item.publishedAt)))) throw new WorkflowError('research_evidence_invalid', 'Every research source requires valid retrieval and publication dates.', 422);
  }
}

async function importStage(input, env) {
  const projectId = requiredId(input.projectId);
  await projectRow(env, projectId);
  await ensureWorkflowProject(env, projectId);
  if (!STAGES.includes(input.stage)) throw new WorkflowError('validation_failed', 'stage is invalid.', 400, { field: 'stage' });
  const output = boundedPayload(input.output, 'output');
  if (input.stage === 'research') validateImportedResearch(output);
  if (input.stage === 'prompts') validatePromptContext(output, projectId, await currentSourceSnapshot(env, projectId));
  const actualModelId = requiredText(input.actualModelId, 'actualModelId', 200);
  const run = await activeRunForImport(env, projectId);
  const provenance = {
    origin: 'imported', actualModelId,
    providerRunId: input.providerRunId ? requiredText(input.providerRunId, 'providerRunId', 200) : null,
    verificationStatus: 'unverified_external',
    ...(input.note ? { note: requiredText(input.note, 'note', 500) } : {})
  };
  await upsertStage(env, { runId: run.id, projectId, stage: input.stage, status: 'imported', origin: 'imported', output, provenance });
  if (input.stage === 'prompts') await createPromptDraft(env, projectId, output, run.id, { authoringTrust: 'unverified_external' });
  const stages = await stageMap(env, run.id, projectId);
  const complete = STAGES.every((stage) => ['complete', 'imported'].includes(stages.get(stage)?.status));
  const timestamp = now();
  await env.AUTH_DB.prepare('UPDATE workflow_runs SET status = ?, current_stage = ?, blocked_reason = NULL, error_json = NULL, updated_at = ? WHERE id = ? AND project_id = ?')
    .bind(complete ? 'complete' : 'pending', input.stage, timestamp, run.id, projectId).run();
  await env.AUTH_DB.prepare('UPDATE workflow_projects SET status = ?, updated_at = ? WHERE project_id = ? AND source_revision = ? AND active_run_id = ?')
    .bind(complete ? 'complete' : 'draft', timestamp, projectId, Number(run.source_revision), run.id).run();
  return stageDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_stage_outputs WHERE run_id = ? AND project_id = ? AND stage = ?').bind(run.id, projectId, input.stage).first());
}

async function queueMedia(input, env, options = {}) {
  const projectId = requiredId(input.projectId), draftId = requiredId(input.draftId, 'draftId');
  await projectRow(env, projectId);
  if (input.provider === 'openrouter') throw new WorkflowProviderError('media_provider_not_implemented', 'OpenRouter media generation is not implemented in this runtime.', 503, { provider: 'openrouter', mediaType: input.mediaType ?? null });
  if (!['fal', 'replicate'].includes(input.provider) || !['image', 'video'].includes(input.mediaType)) throw new WorkflowError('invalid_media_request', 'Provider or media type is invalid.', 400);
  const draft = await env.AUTH_DB.prepare("SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ? AND draft_type IN ('prompt_pair','clone')").bind(draftId, projectId).first();
  if (!draft) throw new WorkflowError('prompt_draft_not_found', 'Prompt-pair draft was not found in this project.', 404);
  if (draft.validation_status !== 'valid' || Number(draft.stale) !== 0 || draft.authoring_trust !== 'verified_runtime') {
    throw new WorkflowError('prompt_not_execution_trusted', 'Media generation requires a current prompt authored by a verified runtime invocation.', 409, { validationStatus: draft.validation_status, authoringTrust: draft.authoring_trust, stale: Boolean(draft.stale) });
  }
  const pair = validatePromptContext(parseJson(draft.payload_json), projectId, await currentSourceSnapshot(env, projectId));
  const budget = Number(input.executionBudgetUsd);
  if (!Number.isFinite(budget) || budget <= 0) throw new WorkflowError('validation_failed', 'executionBudgetUsd must be a positive number.', 400, { field: 'executionBudgetUsd' });
  const jobId = id('media'), timestamp = now();
  let prepared;
  try {
    prepared = prepareMediaRequest({ provider: input.provider, mediaType: input.mediaType, modelId: input.modelId, promptPair: pair, executionBudgetUsd: budget }, env);
  } catch (error) {
    const normalized = error instanceof WorkflowProviderError ? error : new WorkflowProviderError('media_configuration_failed', 'Media configuration failed.', 503);
    await env.AUTH_DB.prepare(`INSERT INTO workflow_media_jobs
      (id, project_id, draft_id, provider, media_type, model_id, status, execution_budget_usd, request_json, provider_job_id, response_json, blocked_reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, 'blocked_config', ?, NULL, NULL, NULL, ?, ?, ?)`)
      .bind(jobId, projectId, draftId, input.provider, input.mediaType, budget, normalized.code, timestamp, timestamp).run();
    normalized.details = { ...(normalized.details || {}), mediaJobId: jobId };
    throw normalized;
  }
  await env.AUTH_DB.prepare(`INSERT INTO workflow_media_jobs
    (id, project_id, draft_id, provider, media_type, model_id, status, execution_budget_usd, request_json, provider_job_id, response_json, blocked_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'blocked_config', ?, ?, NULL, NULL, 'quote_confirm_not_implemented', ?, ?)`)
    .bind(jobId, projectId, draftId, prepared.provider, prepared.mediaType, prepared.modelId, budget, JSON.stringify(prepared), timestamp, timestamp).run();
  throw new WorkflowProviderError('media_quote_confirmation_required', 'Media request was compiled but not submitted. A separate provider quote and explicit confirmation flow is not implemented.', 503, { mediaJobId: jobId });
}

async function recordMeasurement(input, env) {
  const projectId = requiredId(input.projectId), draftId = requiredId(input.draftId, 'draftId');
  await projectRow(env, projectId);
  const draft = await env.AUTH_DB.prepare("SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ? AND draft_type = 'creative'").bind(draftId, projectId).first();
  if (!draft) throw new WorkflowError('draft_not_found', 'Draft was not found in this project.', 404);
  await validateCreativePayload(parseJson(draft.payload_json), env, projectId);
  const metric = requiredText(input.metric, 'metric', 80), unit = requiredText(input.unit, 'unit', 40), evidenceRef = requiredText(input.evidenceRef, 'evidenceRef', 1000, 3);
  const value = Number(input.value);
  if (!Number.isFinite(value)) throw new WorkflowError('validation_failed', 'value must be finite.', 400, { field: 'value' });
  const observedAt = requiredText(input.observedAt, 'observedAt', 50);
  if (!Number.isFinite(Date.parse(observedAt))) throw new WorkflowError('validation_failed', 'observedAt must be an ISO date-time.', 400, { field: 'observedAt' });
  const measurementId = id('measure'), timestamp = now();
  await env.AUTH_DB.prepare(`INSERT INTO workflow_measurements
    (id, project_id, draft_id, metric, value, unit, evidence_ref, observed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(measurementId, projectId, draftId, metric, value, unit, evidenceRef, observedAt, timestamp).run();
  return measurementDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_measurements WHERE id = ? AND project_id = ?').bind(measurementId, projectId).first());
}

async function selectWinner(input, env) {
  const projectId = requiredId(input.projectId), draftId = requiredId(input.draftId, 'draftId');
  await projectRow(env, projectId);
  const draft = await env.AUTH_DB.prepare("SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ? AND draft_type = 'creative'").bind(draftId, projectId).first();
  if (!draft) throw new WorkflowError('creative_not_found', 'Testable creative was not found in this project.', 404);
  await validateCreativePayload(parseJson(draft.payload_json), env, projectId);
  const ids = Array.isArray(input.measurementIds) ? [...new Set(input.measurementIds.map((value) => requiredId(value, 'measurementId')))] : [];
  if (ids.length === 0 || ids.length > 20) throw new WorkflowError('measurement_evidence_required', 'Winner selection requires 1 to 20 measurement IDs.', 422);
  const placeholders = ids.map(() => '?').join(',');
  const matched = await rows(env.AUTH_DB.prepare(`SELECT id FROM workflow_measurements WHERE project_id = ? AND draft_id = ? AND id IN (${placeholders})`).bind(projectId, draftId, ...ids));
  if (matched.length !== ids.length) throw new WorkflowError('measurement_scope_mismatch', 'Every measurement must belong to the selected project and draft.', 409);
  const rationale = requiredText(input.rationale, 'rationale', 1000, 3), winnerId = id('winner'), timestamp = now();
  await env.AUTH_DB.prepare(`INSERT INTO workflow_winners (id, project_id, draft_id, measurement_ids_json, rationale, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(winnerId, projectId, draftId, JSON.stringify(ids), rationale, timestamp).run();
  return winnerDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_winners WHERE id = ? AND project_id = ?').bind(winnerId, projectId).first());
}

async function cloneWinner(input, env) {
  const projectId = requiredId(input.projectId), winnerId = requiredId(input.winnerId, 'winnerId');
  await projectRow(env, projectId);
  const winner = await env.AUTH_DB.prepare(`SELECT w.*, d.draft_type, d.title, d.payload_json
    FROM workflow_winners w JOIN workflow_drafts d ON d.id = w.draft_id AND d.project_id = w.project_id
    WHERE w.id = ? AND w.project_id = ?`).bind(winnerId, projectId).first();
  if (!winner) throw new WorkflowError('winner_not_found', 'Winner was not found in this project.', 404);
  const creativePayload = parseJson(winner.payload_json, {});
  const { promptDraftId } = await validateCreativePayload(creativePayload, env, projectId);
  const promptDraft = await env.AUTH_DB.prepare("SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ? AND draft_type IN ('prompt_pair','clone') AND validation_status = 'valid' AND stale = 0").bind(promptDraftId, projectId).first();
  if (!promptDraft) throw new WorkflowError('prompt_draft_not_found', 'Winner prompt lineage is missing.', 409);
  const cloneId = id('clone'), cloneDraftId = id('draft'), timestamp = now();
  const title = input.title ? requiredText(input.title, 'title', 120) : `Clone · ${winner.title}`;
  const payload = parseJson(promptDraft.payload_json, {});
  const lineagePayload = { ...payload, workflowLineage: { winnerId, creativeDraftId: winner.draft_id, parentPromptDraftId: promptDraftId, clonedAt: new Date(timestamp * 1000).toISOString(), status: 'draft' } };
  if (byteLength(lineagePayload) > MAX_PAYLOAD_BYTES) throw new WorkflowError('payload_too_large', 'Cloned payload exceeds 256 KiB.', 413);
  const statements = [
    env.AUTH_DB.prepare(`INSERT INTO workflow_drafts
      (id, project_id, draft_type, title, payload_json, revision, status, parent_draft_id, winner_id, validation_status, authoring_trust, source_snapshot_id, stale, created_at, updated_at)
      VALUES (?, ?, 'clone', ?, ?, 1, 'draft', ?, ?, 'valid', ?, ?, 0, ?, ?)`)
      .bind(cloneDraftId, projectId, title, JSON.stringify(lineagePayload), promptDraftId, winnerId, promptDraft.authoring_trust, promptDraft.source_snapshot_id, timestamp, timestamp),
    env.AUTH_DB.prepare(`INSERT INTO workflow_clones
      (id, project_id, winner_id, parent_draft_id, clone_draft_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(cloneId, projectId, winnerId, promptDraftId, cloneDraftId, timestamp)
  ];
  if (typeof env.AUTH_DB.batch === 'function') await env.AUTH_DB.batch(statements); else { for (const statement of statements) await statement.run(); }
  return {
    clone: cloneDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_clones WHERE id = ? AND project_id = ?').bind(cloneId, projectId).first()),
    draft: draftDto(await env.AUTH_DB.prepare('SELECT * FROM workflow_drafts WHERE id = ? AND project_id = ?').bind(cloneDraftId, projectId).first())
  };
}

async function updateCachePolicy(input, env) {
  const projectId = requiredId(input.projectId);
  await projectRow(env, projectId);
  try {
    await setAiCachePolicy(env, projectId, {
      ttlHours: input.ttlHours,
      maxEntries: input.maxEntries,
      preflightGetAttempts: input.preflightGetAttempts
    });
  } catch (error) {
    if (error?.code === 'cache_policy_invalid') throw new WorkflowError(error.code, error.message, error.status, error.details);
    throw error;
  }
  return aiCacheSnapshot(env, projectId);
}

async function dispatchAction(input, env) {
  switch (input.action) {
    case 'source.put': return { status: 201, key: 'source', value: await putSource(input, env) };
    case 'source.delete': return { status: 200, value: await deleteSource(input, env) };
    case 'draft.put': return { status: input.draftId ? 200 : 201, key: 'draft', value: await putDraft(input, env) };
    case 'draft.delete': return { status: 200, value: await deleteDraft(input, env) };
    case 'run.start': return { status: 200, key: 'run', value: await executeWorkflowRun(env, requiredId(input.projectId), { requestId: input.requestId }) };
    case 'cache.policy.set': return { status: 200, key: 'aiCache', value: await updateCachePolicy(input, env) };
    case 'stage.import': return { status: 201, key: 'stage', value: await importStage(input, env) };
    case 'media.queue': return { status: 201, key: 'mediaJob', value: await queueMedia(input, env) };
    case 'measurement.record': return { status: 201, key: 'measurement', value: await recordMeasurement(input, env) };
    case 'winner.select': return { status: 201, key: 'winner', value: await selectWinner(input, env) };
    case 'winner.clone': return { status: 201, value: await cloneWinner(input, env) };
    default: throw new WorkflowError('unknown_action', 'Workflow action is not supported.', 400, { action: input.action ?? null });
  }
}

export async function handleWorkflow(request, env) {
  try {
    const url = new URL(request.url);
    if (url.pathname !== '/api/workflow') return null;
    if (request.method === 'GET') return json(await workflowSnapshot(env, requiredId(url.searchParams.get('projectId'))));
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const input = await readJsonBounded(request);
    const result = await dispatchAction(input, env);
    return json(result.key ? { [result.key]: result.value } : result.value, result.status);
  } catch (error) {
    const known = error instanceof WorkflowError || error instanceof WorkflowProviderError || error instanceof PilotBudgetError;
    const status = known ? error.status : 503;
    const payload = { error: known ? error.code : 'workflow_unavailable', message: known ? error.message : 'Workflow service is unavailable.' };
    if (known && error.details) payload.details = error.details;
    if (known && error.details?.runId && env.AUTH_DB) {
      const run = await env.AUTH_DB.prepare('SELECT * FROM workflow_runs WHERE id = ?').bind(error.details.runId).first();
      if (run) payload.run = runDto(run);
    }
    if (known && error.details?.mediaJobId && env.AUTH_DB) {
      const job = await env.AUTH_DB.prepare('SELECT * FROM workflow_media_jobs WHERE id = ?').bind(error.details.mediaJobId).first();
      if (job) payload.mediaJob = mediaJobDto(job);
    }
    return json(payload, status);
  }
}

export const workflowInternals = {
  MAX_REQUEST_BYTES, MAX_SOURCE_BYTES, MAX_SOURCE_COUNT, MAX_SOURCE_EDGE_PX, MAX_PAYLOAD_BYTES, STAGES,
  imageDimensions, parseSource, putSource, deleteSource, putDraft, importStage, queueMedia,
  recordMeasurement, selectWinner, cloneWinner, updateCachePolicy, readJsonBounded, validateImportedResearch,
  stageCacheFingerprint
};
