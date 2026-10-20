import { getIntegrationStatus } from '../integrations/clients.mjs';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store, max-age=0'
};

const QUALITY_GATES = [
  'productFidelity',
  'claims',
  'voicePronunciation',
  'audio',
  'continuity',
  'format',
  'novelty'
];

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function finiteNumber(value, minimum, maximum, field, errors) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    errors[field] = `must be a finite number between ${minimum} and ${maximum}`;
    return false;
  }
  return true;
}

function integer(value, minimum, maximum, field, errors) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    errors[field] = `must be an integer between ${minimum} and ${maximum}`;
    return false;
  }
  return true;
}

function requiredText(value, minimum, maximum, field, errors) {
  if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > maximum) {
    errors[field] = `must be text between ${minimum} and ${maximum} characters`;
    return false;
  }
  return true;
}

async function bodyJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function providerReadiness(env) {
  const integrations = getIntegrationStatus(env);
  return {
    research: integrations.research,
    voice: integrations.voice,
    render: {
      provider: 'video-render-bridge',
      configured: false,
      status: 'not_configured',
      reason: 'executor_and_health_check_not_implemented'
    }
  };
}

function blankQualityGates() {
  const gates = {};
  for (const name of QUALITY_GATES) gates[name] = { status: 'unverified', evidenceRef: null };
  gates.humanApproval = {
    status: 'unverified', reviewerType: null, approvedBy: null, evidenceRef: null
  };
  return gates;
}

function evidenceReference(value) {
  if (!value || typeof value !== 'object') return null;
  for (const key of ['evidenceRef', 'evidence', 'path', 'reference']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  return null;
}

export function gateAssetQuality(asset) {
  // Structural contract only. It does not verify evidence authenticity or persist/reconcile asset state.
  const gates = asset?.qualityGates && typeof asset.qualityGates === 'object' ? asset.qualityGates : {};
  const failedGates = [];
  let explicitlyFailed = false;
  for (const name of QUALITY_GATES) {
    const gate = gates[name];
    if (gate?.status === 'fail') explicitlyFailed = true;
    if (gate?.status !== 'pass' || !evidenceReference(gate)) failedGates.push(name);
  }
  const approval = gates.humanApproval ?? asset?.humanApproval;
  if (approval?.status === 'rejected') explicitlyFailed = true;
  if (
    approval?.status !== 'approved'
    || approval?.reviewerType !== 'human'
    || typeof approval.approvedBy !== 'string'
    || !approval.approvedBy.trim()
    || !evidenceReference(approval)
  ) {
    failedGates.push('humanApproval');
  }
  return {
    qualified: failedGates.length === 0,
    status: failedGates.length === 0 ? 'passed' : explicitlyFailed ? 'failed' : 'unverified',
    failedGates
  };
}

function shotPlan(durationSeconds) {
  const fps = 30;
  const overlapFrames = 15;
  const sourceFrames = durationSeconds === 60 ? [372, 372, 372, 372, 372] : [360, 360, 360, 315];
  let startFrame = 0;
  return sourceFrames.map((frames, index) => {
    const shot = {
      shotNumber: index + 1,
      startFrame,
      endFrame: startFrame + frames,
      sourceFrames: frames,
      startSeconds: startFrame / fps,
      sourceSeconds: frames / fps,
      transitionIn: index === 0 ? 'cut' : 'crossfade',
      overlapFrames: index === 0 ? 0 : overlapFrames,
      generationStatus: 'not_started'
    };
    startFrame = shot.endFrame - overlapFrames;
    return shot;
  });
}

function validateProject(input) {
  const errors = {};
  requiredText(input?.name, 1, 120, 'name', errors);
  requiredText(input?.product, 1, 500, 'product', errors);
  requiredText(input?.market, 1, 120, 'market', errors);
  return errors;
}

function normalizePlan(input) {
  const plan = {
    requestId: typeof input.requestId === 'string' ? input.requestId.trim() : input.requestId,
    projectId: typeof input.projectId === 'string' ? input.projectId.trim() : input.projectId,
    targetCount: input.targetCount ?? 100,
    durationSeconds: input.durationSeconds ?? 45,
    format: input.format ?? '9:16',
    conceptCount: input.conceptCount ?? 10,
    variationsPerConcept: input.variationsPerConcept ?? 10,
    renderConcurrency: input.renderConcurrency ?? 4,
    estimatedShotSeconds: input.estimatedShotSeconds ?? 120,
    expectedPassRate: input.expectedPassRate ?? 0.8,
    retryRate: input.retryRate ?? 0.1,
    windowHours: input.windowHours ?? 24,
    budgetUsd: hasOwn(input, 'budgetUsd') ? input.budgetUsd : null
  };
  const errors = {};
  requiredText(plan.requestId, 1, 128, 'requestId', errors);
  requiredText(plan.projectId, 1, 128, 'projectId', errors);
  integer(plan.targetCount, 1, 500, 'targetCount', errors);
  if (![45, 60].includes(plan.durationSeconds)) errors.durationSeconds = 'must be 45 or 60';
  if (!['9:16', '1:1', '16:9'].includes(plan.format)) errors.format = 'must be 9:16, 1:1 or 16:9';
  integer(plan.conceptCount, 1, 100, 'conceptCount', errors);
  integer(plan.variationsPerConcept, 1, 100, 'variationsPerConcept', errors);
  integer(plan.renderConcurrency, 1, 100, 'renderConcurrency', errors);
  finiteNumber(plan.estimatedShotSeconds, 1, 3600, 'estimatedShotSeconds', errors);
  finiteNumber(plan.expectedPassRate, 0.01, 1, 'expectedPassRate', errors);
  finiteNumber(plan.retryRate, 0, 1, 'retryRate', errors);
  finiteNumber(plan.windowHours, 1, 168, 'windowHours', errors);
  if (plan.budgetUsd !== null) finiteNumber(plan.budgetUsd, 0, 1_000_000, 'budgetUsd', errors);
  if (
    Number.isInteger(plan.targetCount)
    && Number.isInteger(plan.conceptCount)
    && Number.isInteger(plan.variationsPerConcept)
    && plan.conceptCount * plan.variationsPerConcept !== plan.targetCount
  ) {
    errors.variationCapacity = 'conceptCount × variationsPerConcept must equal targetCount so every requested concept is represented';
  }
  return { plan, errors };
}

async function fingerprint(plan) {
  const bytes = new TextEncoder().encode(JSON.stringify(plan));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function projectDto(row) {
  return {
    id: row.id,
    name: row.name,
    product: row.product,
    market: row.market,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.batch_count === undefined ? {} : { batchCount: Number(row.batch_count) })
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function batchDto(row) {
  const assumptions = parseJson(row.assumptions_json, {});
  return {
    id: row.id,
    projectId: row.project_id,
    requestId: row.request_id,
    targetCount: Number(row.target_count),
    durationSeconds: Number(row.duration_seconds),
    format: row.format,
    conceptCount: Number(row.concept_count),
    variationsPerConcept: Number(row.variations_per_concept),
    renderConcurrency: Number(row.render_concurrency),
    estimatedShotSeconds: Number(row.estimated_shot_seconds),
    expectedPassRate: Number(row.expected_pass_rate),
    retryRate: Number(row.retry_rate),
    windowHours: Number(row.window_hours),
    budgetUsd: row.budget_usd === null ? null : Number(row.budget_usd),
    shotsPerAsset: Number(row.shots_per_asset),
    estimatedAttempts: Number(row.estimated_attempts),
    providerCalls: Number(row.provider_calls),
    status: row.status,
    plannedCount: Number(row.target_count),
    readyCount: 0,
    qualityVerifiedCount: 0,
    capacity: assumptions.capacity,
    cost: assumptions.cost,
    execution: assumptions.execution,
    providerReadiness: assumptions.providerReadiness,
    assumptions: assumptions.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assetDto(row) {
  return {
    id: row.id,
    batchId: row.batch_id,
    projectId: row.project_id,
    ordinal: Number(row.ordinal),
    conceptNumber: Number(row.concept_number),
    variationNumber: Number(row.variation_number),
    durationSeconds: Number(row.duration_seconds),
    format: row.format,
    status: row.status,
    qualityStatus: row.quality_status,
    qualityGates: parseJson(row.quality_gates_json, blankQualityGates()),
    shots: parseJson(row.shots_json, []),
    mediaUrl: row.media_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function rows(statement) {
  if (typeof statement.all === 'function') {
    const result = await statement.all();
    return result.results ?? result;
  }
  throw new Error('D1 statement does not support all()');
}

async function dashboard(env) {
  const [projectRows, batchRows] = await Promise.all([
    rows(env.AUTH_DB.prepare(`
      SELECT p.*, COUNT(b.id) AS batch_count
      FROM production_projects p
      LEFT JOIN production_batches b ON b.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `)),
    rows(env.AUTH_DB.prepare(`
      SELECT * FROM production_batches
      ORDER BY created_at DESC
    `))
  ]);
  const projects = projectRows.map(projectDto);
  const batches = batchRows.map(batchDto);
  return json({
    projects,
    batches,
    totals: {
      projectCount: projects.length,
      batchCount: batches.length,
      targetPlanned: batches.reduce((total, batch) => total + batch.targetCount, 0),
      readyCount: 0
    },
    providerReadiness: providerReadiness(env),
    disclaimer: 'Capacity and cost are planning estimates. Planned assets are not generated, quality-verified, or ready.'
  });
}

async function createProject(request, env) {
  const input = await bodyJson(request);
  if (!input) return json({ error: 'invalid_json' }, 400);
  const errors = validateProject(input);
  if (Object.keys(errors).length) return json({ error: 'validation_failed', fields: errors }, 400);
  const now = Math.floor(Date.now() / 1000);
  const project = {
    id: id('project'),
    name: input.name.trim(),
    product: input.product.trim(),
    market: input.market.trim(),
    createdAt: now,
    updatedAt: now
  };
  await env.AUTH_DB.prepare(`
    INSERT INTO production_projects (id, name, product, market, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(project.id, project.name, project.product, project.market, now, now).run();
  return json({ project }, 201);
}

async function findBatch(env, batchId) {
  return env.AUTH_DB.prepare('SELECT * FROM production_batches WHERE id = ?').bind(batchId).first();
}

async function getBatch(env, batchId) {
  const row = await findBatch(env, batchId);
  if (!row) return json({ error: 'batch_not_found' }, 404);
  const assetRows = await rows(env.AUTH_DB.prepare(
    'SELECT * FROM production_assets WHERE batch_id = ? ORDER BY ordinal'
  ).bind(batchId));
  return json({ batch: batchDto(row), assets: assetRows.map(assetDto) });
}

function unitCost(env) {
  if (env.VIDEO_SHOT_UNIT_COST_USD === undefined || env.VIDEO_SHOT_UNIT_COST_USD === '') return null;
  const parsed = Number(env.VIDEO_SHOT_UNIT_COST_USD);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function createPlan(request, env) {
  const input = await bodyJson(request);
  if (!input) return json({ error: 'invalid_json' }, 400);
  const { plan, errors } = normalizePlan(input);
  if (Object.keys(errors).length) return json({ error: 'validation_failed', fields: errors }, 400);
  const project = await env.AUTH_DB.prepare('SELECT * FROM production_projects WHERE id = ?')
    .bind(plan.projectId).first();
  if (!project) return json({ error: 'project_not_found' }, 404);

  const requestFingerprint = await fingerprint(plan);
  const existing = await env.AUTH_DB.prepare(
    'SELECT * FROM production_batches WHERE project_id = ? AND request_id = ?'
  ).bind(plan.projectId, plan.requestId.trim()).first();
  if (existing) {
    if (existing.request_fingerprint !== requestFingerprint) {
      return json({ error: 'idempotency_conflict', batchId: existing.id }, 409);
    }
    return json({ batch: batchDto(existing), idempotent: true });
  }

  const shots = shotPlan(plan.durationSeconds);
  const estimatedAttempts = Math.ceil(plan.targetCount / plan.expectedPassRate);
  const providerCalls = Math.ceil(estimatedAttempts * shots.length * (1 + plan.retryRate));
  const estimatedRenderSeconds = providerCalls * plan.estimatedShotSeconds;
  const estimatedWallSeconds = Math.ceil(estimatedRenderSeconds / plan.renderConcurrency);
  const feasibleWithinWindow = estimatedWallSeconds <= plan.windowHours * 3600;
  const readiness = providerReadiness(env);
  // This release has no verified executor or provider health reconciliation. Configuration alone cannot unlock work.
  const status = 'blocked_provider';
  const shotUnitCostUsd = unitCost(env);
  const estimatedTotalUsd = shotUnitCostUsd === null ? null : Number((providerCalls * shotUnitCostUsd).toFixed(2));
  const assumptions = {
    capacity: {
      classification: feasibleWithinWindow ? 'feasible_estimate' : 'exceeds_window_estimate',
      feasibleWithinWindow,
      generationWindowFeasibleEstimate: feasibleWithinWindow,
      provenThroughput: null,
      fullPipelineFeasibility: 'unknown',
      scope: 'shot_generation_only',
      estimatedRenderSeconds,
      estimatedWallSeconds,
      estimatedWallHours: Number((estimatedWallSeconds / 3600).toFixed(2)),
      windowHours: plan.windowHours,
      excludedStages: [
        'research', 'script', 'prompt_authoring', 'voice', 'assembly', 'quality_audit',
        'human_review', 'publishing'
      ],
      disclaimer: 'Generation-only deterministic estimate. End-to-end 100-video/day throughput is unproven until every excluded stage is benchmarked.'
    },
    cost: {
      shotUnitCostUsd,
      estimatedTotalUsd,
      fullPipelineCostUsd: null,
      scope: 'shot_generation_only',
      excludedCosts: ['research', 'script', 'voice', 'assembly', 'quality_audit', 'human_review', 'storage', 'delivery'],
      budgetUsd: plan.budgetUsd,
      withinBudget: plan.budgetUsd === null || estimatedTotalUsd === null ? null : estimatedTotalUsd <= plan.budgetUsd,
      status: shotUnitCostUsd === null ? 'unknown_unit_cost' : 'estimated'
    },
    execution: {
      enabled: false,
      mode: 'planning_only',
      paidExecutionStarted: false,
      qualityReconciliationEnabled: false,
      blockedReason: 'executor_and_provider_health_not_verified'
    },
    providerReadiness: readiness,
    model: {
      targetCountMeans: 'planned_asset_records_not_completed_videos',
      attemptFormula: 'ceil(targetCount / expectedPassRate)',
      providerCallFormula: 'ceil(estimatedAttempts × shotsPerAsset × (1 + retryRate))',
      overlapFrames: 15,
      fps: 30,
      qualityApproval: 'structural contract: seven evidence-backed gates plus explicit human approval with reviewerType=human',
      operationalAuditActive: false
    }
  };
  const now = Math.floor(Date.now() / 1000);
  const batchId = id('batch');
  const batchStatement = env.AUTH_DB.prepare(`
    INSERT INTO production_batches (
      id, project_id, request_id, request_fingerprint, target_count, duration_seconds, format,
      concept_count, variations_per_concept, render_concurrency, estimated_shot_seconds,
      expected_pass_rate, retry_rate, window_hours, budget_usd, shots_per_asset,
      estimated_attempts, provider_calls, estimated_render_seconds, estimated_wall_seconds,
      status, assumptions_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    batchId, plan.projectId, plan.requestId.trim(), requestFingerprint, plan.targetCount,
    plan.durationSeconds, plan.format, plan.conceptCount, plan.variationsPerConcept,
    plan.renderConcurrency, plan.estimatedShotSeconds, plan.expectedPassRate, plan.retryRate,
    plan.windowHours, plan.budgetUsd, shots.length, estimatedAttempts, providerCalls,
    estimatedRenderSeconds, estimatedWallSeconds, status, JSON.stringify(assumptions), now, now
  );
  const gateJson = JSON.stringify(blankQualityGates());
  const shotsJson = JSON.stringify(shots);
  const assetRows = [];
  for (let ordinal = 1; ordinal <= plan.targetCount; ordinal += 1) {
    const conceptNumber = Math.floor((ordinal - 1) / plan.variationsPerConcept) + 1;
    const variationNumber = ((ordinal - 1) % plan.variationsPerConcept) + 1;
    assetRows.push([
      id('asset'), batchId, plan.projectId, ordinal, conceptNumber, variationNumber,
      plan.durationSeconds, plan.format, status, gateJson, shotsJson, now, now
    ]);
  }
  // Seven rows × thirteen bound values stays below D1's per-statement bind limit.
  const assetStatements = [];
  for (let offset = 0; offset < assetRows.length; offset += 7) {
    const chunk = assetRows.slice(offset, offset + 7);
    const valuesSql = chunk.map(() => (
      "(?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?, NULL, ?, ?)"
    )).join(', ');
    assetStatements.push(env.AUTH_DB.prepare(`
      INSERT INTO production_assets (
        id, batch_id, project_id, ordinal, concept_number, variation_number, duration_seconds,
        format, status, quality_status, quality_gates_json, shots_json, media_url, created_at, updated_at
      ) VALUES ${valuesSql}
    `).bind(...chunk.flat()));
  }
  try {
    await env.AUTH_DB.batch([batchStatement, ...assetStatements]);
  } catch (error) {
    const raced = await env.AUTH_DB.prepare(
      'SELECT * FROM production_batches WHERE project_id = ? AND request_id = ?'
    ).bind(plan.projectId, plan.requestId).first();
    if (!raced) throw error;
    if (raced.request_fingerprint !== requestFingerprint) {
      return json({ error: 'idempotency_conflict', batchId: raced.id }, 409);
    }
    return json({ batch: batchDto(raced), idempotent: true });
  }
  const created = await findBatch(env, batchId);
  return json({ batch: batchDto(created), idempotent: false }, 201);
}

export async function handleProduction(request, env, pathname) {
  if (!env.AUTH_DB) return json({ error: 'production_store_unavailable' }, 503);
  if (pathname === '/api/production/dashboard' && request.method === 'GET') return dashboard(env);
  if (pathname === '/api/production/projects' && request.method === 'POST') return createProject(request, env);
  if (pathname === '/api/production/plan' && request.method === 'POST') return createPlan(request, env);
  const batchMatch = pathname.match(/^\/api\/production\/batches\/([A-Za-z0-9_-]+)$/u);
  if (batchMatch && request.method === 'GET') return getBatch(env, batchMatch[1]);
  return null;
}

export const productionInternals = {
  QUALITY_GATES,
  blankQualityGates,
  normalizePlan,
  providerReadiness,
  shotPlan
};
