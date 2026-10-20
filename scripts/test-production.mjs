import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { gateAssetQuality, handleProduction, productionInternals } from '../cloudflare/production.mjs';

class D1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new D1Statement(this.database, this.sql, values);
  }

  async first() {
    return this.database.sqlite.prepare(this.sql).get(...this.values) || null;
  }

  async all() {
    return { results: this.database.sqlite.prepare(this.sql).all(...this.values) };
  }

  async run() {
    const result = this.database.sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

class D1Database {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    this.sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0001_auth.sql', import.meta.url), 'utf8'));
    this.sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0002_production.sql', import.meta.url), 'utf8'));
  }

  prepare(sql) {
    return new D1Statement(this, sql);
  }

  async batch(statements) {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

const ORIGIN = 'https://studio.example';
function request(path, body, method = body === undefined ? 'GET' : 'POST') {
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function call(env, path, body, method) {
  const response = await handleProduction(request(path, body, method), env, path);
  assert.ok(response instanceof Response, `${path} is handled`);
  return response;
}

async function payload(response) {
  return response.json();
}

const env = { AUTH_DB: new D1Database() };
assert.equal(await handleProduction(request('/api/other'), env, '/api/other'), null, 'unknown route delegates to root');
assert.equal((await call({}, '/api/production/dashboard')).status, 503, 'missing D1 fails closed');

let response = await call(env, '/api/production/dashboard');
assert.equal(response.status, 200);
let body = await payload(response);
assert.deepEqual(body.totals, { projectCount: 0, batchCount: 0, targetPlanned: 0, readyCount: 0 });
assert.equal(body.providerReadiness.research.configured, false);
assert.equal(body.providerReadiness.voice.configured, false);
assert.match(body.disclaimer, /not generated/u);

response = await call(env, '/api/production/projects', { name: '', product: 'Bottle', market: 'VN' });
assert.equal(response.status, 400, 'invalid project is rejected');
response = await call(env, '/api/production/projects', {
  name: 'Oil Sprayer Launch', product: 'Exact product source pending', market: 'Vietnam'
});
assert.equal(response.status, 201);
const project = (await payload(response)).project;
assert.match(project.id, /^project_/u);

response = await call(env, '/api/production/projects', {
  name: 'Travel Tumbler', product: 'Tumbler source pending', market: 'Vietnam'
});
const otherProject = (await payload(response)).project;

const basePlan = {
  requestId: 'owner-run-2026-10-20-001',
  projectId: project.id,
  targetCount: 100,
  durationSeconds: 60,
  format: '9:16',
  conceptCount: 10,
  variationsPerConcept: 10,
  renderConcurrency: 4,
  estimatedShotSeconds: 120,
  expectedPassRate: 0.8,
  retryRate: 0.1,
  windowHours: 24
};

response = await call(env, '/api/production/plan', { ...basePlan, projectId: 'project_stale' });
assert.equal(response.status, 404, 'stale project is rejected');
response = await call(env, '/api/production/plan', { ...basePlan, requestId: undefined });
assert.equal(response.status, 400, 'requestId is required');
response = await call(env, '/api/production/plan', { ...basePlan, expectedPassRate: 0 });
assert.equal(response.status, 400, 'invalid pass rate is rejected');
response = await call(env, '/api/production/plan', {
  ...basePlan, conceptCount: 5, variationsPerConcept: 10
});
assert.equal(response.status, 400, 'concept/variation product must exactly match target');
response = await call(env, '/api/production/plan', {
  ...basePlan, targetCount: 50, conceptCount: 10, variationsPerConcept: 100
});
assert.equal(response.status, 400, 'oversized variation shape cannot silently collapse to concept one');

response = await call(env, '/api/production/plan', basePlan);
assert.equal(response.status, 201);
body = await payload(response);
assert.equal(body.idempotent, false);
const batch = body.batch;
assert.equal(batch.targetCount, 100);
assert.equal(batch.plannedCount, 100);
assert.equal(batch.readyCount, 0);
assert.equal(batch.qualityVerifiedCount, 0);
assert.equal(batch.status, 'blocked_provider');
assert.equal(batch.shotsPerAsset, 5);
assert.equal(batch.estimatedAttempts, 125);
assert.equal(batch.providerCalls, 688);
assert.equal(batch.capacity.estimatedRenderSeconds, 82_560);
assert.equal(batch.capacity.estimatedWallSeconds, 20_640);
assert.equal(batch.capacity.feasibleWithinWindow, true);
assert.equal(batch.capacity.generationWindowFeasibleEstimate, true);
assert.equal(batch.capacity.provenThroughput, null);
assert.equal(batch.capacity.fullPipelineFeasibility, 'unknown');
assert.equal(batch.capacity.scope, 'shot_generation_only');
assert.ok(batch.capacity.excludedStages.includes('human_review'));
assert.equal(batch.cost.status, 'unknown_unit_cost');
assert.equal(batch.cost.estimatedTotalUsd, null);
assert.equal(batch.cost.fullPipelineCostUsd, null);
assert.equal(batch.execution.enabled, false);
assert.equal(batch.execution.paidExecutionStarted, false);
assert.equal(batch.execution.qualityReconciliationEnabled, false);
assert.equal(batch.assumptions.operationalAuditActive, false);

assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM production_assets').get().count, 100);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM production_assets WHERE media_url IS NOT NULL').get().count, 0);
assert.equal(env.AUTH_DB.sqlite.prepare("SELECT COUNT(*) AS count FROM production_assets WHERE quality_status != 'unverified'").get().count, 0);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(DISTINCT concept_number || \'-\' || variation_number) AS count FROM production_assets').get().count, 100);

response = await call(env, `/api/production/batches/${batch.id}`);
assert.equal(response.status, 200);
body = await payload(response);
assert.equal(body.assets.length, 100);
assert.equal(body.assets[0].mediaUrl, null);
assert.equal(body.assets[0].qualityStatus, 'unverified');
assert.equal(body.assets[0].shots.length, 5);
assert.equal(body.assets[0].shots.at(-1).endFrame, 1800, 'shot plan resolves to exact 60 seconds');
assert.equal(body.assets[0].shots.every(shot => shot.generationStatus === 'not_started'), true);
assert.equal(body.assets[0].qualityGates.humanApproval.status, 'unverified');

response = await call(env, '/api/production/plan', basePlan);
assert.equal(response.status, 200, 'exact retry is idempotent');
assert.equal((await payload(response)).idempotent, true);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM production_batches').get().count, 1);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM production_assets').get().count, 100);

response = await call(env, '/api/production/plan', { ...basePlan, durationSeconds: 45 });
assert.equal(response.status, 409, 'same project/requestId with different payload conflicts');

response = await call(env, '/api/production/plan', { ...basePlan, projectId: otherProject.id });
assert.equal(response.status, 201, 'request IDs are isolated per project');
const secondBatch = (await payload(response)).batch;
assert.notEqual(secondBatch.id, batch.id);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM production_assets').get().count, 200);

response = await call(env, '/api/production/dashboard');
body = await payload(response);
assert.deepEqual(body.totals, { projectCount: 2, batchCount: 2, targetPlanned: 200, readyCount: 0 });
assert.equal(body.projects.find(item => item.id === project.id).batchCount, 1);
assert.equal(body.batches.every(item => item.readyCount === 0), true);

response = await call(env, '/api/production/plan', {
  ...basePlan,
  projectId: otherProject.id,
  requestId: 'non-default-shape-12',
  targetCount: 12,
  conceptCount: 3,
  variationsPerConcept: 4
});
assert.equal(response.status, 201, 'valid non-default shape is accepted');
const shapedBatch = (await payload(response)).batch;
const shapedRows = env.AUTH_DB.sqlite.prepare(`
  SELECT concept_number, COUNT(*) AS count
  FROM production_assets
  WHERE batch_id = ?
  GROUP BY concept_number
  ORDER BY concept_number
`).all(shapedBatch.id);
assert.deepEqual(shapedRows.map(row => ({ ...row })), [
  { concept_number: 1, count: 4 },
  { concept_number: 2, count: 4 },
  { concept_number: 3, count: 4 }
]);

const blankEvaluation = gateAssetQuality({ qualityGates: productionInternals.blankQualityGates() });
assert.equal(blankEvaluation.qualified, false);
assert.equal(blankEvaluation.failedGates.length, 8);
const selfScored = productionInternals.blankQualityGates();
for (const gateName of productionInternals.QUALITY_GATES) {
  selfScored[gateName] = { status: 'pass', score: 1 };
}
selfScored.humanApproval = { status: 'approved', approvedBy: 'agent', score: 1 };
assert.equal(gateAssetQuality({ qualityGates: selfScored }).qualified, false, 'scores are not evidence');

const evidenced = productionInternals.blankQualityGates();
for (const gateName of productionInternals.QUALITY_GATES) {
  evidenced[gateName] = { status: 'pass', evidenceRef: `evidence://${gateName}/asset-1` };
}
evidenced.humanApproval = {
  status: 'approved', reviewerType: 'human', approvedBy: 'owner-reviewer',
  evidenceRef: 'review://asset-1/approval'
};
assert.deepEqual(gateAssetQuality({ qualityGates: evidenced }), {
  qualified: true, status: 'passed', failedGates: []
});
evidenced.continuity.evidenceRef = '';
assert.equal(gateAssetQuality({ qualityGates: evidenced }).qualified, false, 'one missing evidence blocks quality');
evidenced.continuity.status = 'fail';
assert.equal(gateAssetQuality({ qualityGates: evidenced }).status, 'failed', 'explicit gate failure is preserved');

const exact45 = productionInternals.shotPlan(45);
assert.equal(exact45.length, 4);
assert.equal(exact45.at(-1).endFrame, 1350, '45-second plan is frame-exact');

const readyEnv = {
  AUTH_DB: new D1Database(),
  JEV_RESEARCH_BRIDGE_URL: 'https://jev.internal',
  JEV_RESEARCH_BRIDGE_TOKEN: 'test-token-123456',
  VIENEU_BRIDGE_URL: 'https://voice.internal',
  VIENEU_BRIDGE_TOKEN: 'test-token-123456',
  VIENEU_MODEL_REVISION: 'a'.repeat(40),
  VIDEO_RENDER_BRIDGE_URL: 'https://render.internal',
  VIDEO_RENDER_BRIDGE_TOKEN: 'test-token-123456',
  VIDEO_SHOT_UNIT_COST_USD: '0.05'
};
response = await call(readyEnv, '/api/production/projects', {
  name: 'Configured project', product: 'Source pending', market: 'Vietnam'
});
const readyProject = (await payload(response)).project;
response = await call(readyEnv, '/api/production/plan', {
  ...basePlan, projectId: readyProject.id, requestId: 'configured-run', budgetUsd: 40
});
body = await payload(response);
assert.equal(body.batch.providerReadiness.research.status, 'configured_unverified');
assert.equal(body.batch.providerReadiness.voice.status, 'configured_unverified');
assert.equal(body.batch.providerReadiness.render.configured, false);
assert.equal(body.batch.status, 'blocked_provider', 'configuration without health/executor proof stays blocked');
assert.equal(body.batch.cost.estimatedTotalUsd, 34.4);
assert.equal(body.batch.cost.withinBudget, true);
assert.equal(body.batch.readyCount, 0, 'configured providers still do not fabricate completions');

console.log('PASS: persisted projects, project-scoped idempotent 100-asset plans, exact shot timelines, conservative capacity/cost estimates, zero fabricated completions, and a structural quality-gate contract.');
