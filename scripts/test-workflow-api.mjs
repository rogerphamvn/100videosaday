import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../cloudflare/worker.mjs';

class Statement {
  constructor(db, sql, values = []) { Object.assign(this, { db, sql, values }); }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  async first() { return this.db.prepare(this.sql).get(...this.values) || null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
for (const migration of ['0001_auth.sql', '0002_production.sql', '0003_workflow.sql', '0004_pilot_budget.sql', '0005_ai_stage_cache.sql', '0006_provider_credentials.sql', '0007_project_models.sql']) {
  db.exec(readFileSync(new URL(`../cloudflare/migrations/${migration}`, import.meta.url), 'utf8'));
}
const store = {
  prepare: sql => new Statement(db, sql),
  async batch(statements) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      db.exec('COMMIT');
      return results;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
};

const ORIGIN = 'https://studio.example';
const env = {
  AUTH_DB: store,
  INTERNAL_PASSWORD: 'workflow-api-test-password-123',
  ASSETS: { fetch: async request => new Response(new URL(request.url).pathname) }
};

function jsonRequest(path, body, { cookie = '', origin = ORIGIN } = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: origin }),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function call(path, body, options) {
  return worker.fetch(jsonRequest(path, body, options), env);
}

function cookieFrom(response) {
  return response.headers.get('Set-Cookie')?.split(';', 1)[0] || '';
}

const sourceBytes = new Uint8Array(20 * 1024);
sourceBytes.fill(0x5a);
sourceBytes.set([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00,
  0x08, 0x02, 0x00, 0x00, 0x00
]);
const sourceDataUrl = `data:image/png;base64,${Buffer.from(sourceBytes).toString('base64')}`;
const unauthenticated = await call('/api/workflow', {
  action: 'source.put', projectId: 'not-created', kind: 'product', dataUrl: sourceDataUrl
});
assert.equal(unauthenticated.status, 401);
assert.equal((await unauthenticated.json()).error, 'authentication_required');

const login = await call('/api/auth/login', { username: 'team', password: env.INTERNAL_PASSWORD });
assert.equal(login.status, 200);
const cookie = cookieFrom(login);
assert.match(cookie, /^__Host-creative_session=/u);

assert.equal((await call('/api/provider-preflight', {})).status, 401);
assert.equal((await call('/api/provider-preflight', {}, { cookie, origin: 'https://attacker.example' })).status, 403);
assert.equal((await call('/api/provider-preflight', undefined, { cookie })).status, 405);
assert.equal((await call('/api/provider-preflight', { FAL_KEY: 'never-accept-browser-secrets' }, { cookie })).status, 400);
const preflight = await call('/api/provider-preflight', {}, { cookie });
assert.equal(preflight.status, 200);
assert.match(preflight.headers.get('cache-control'), /no-store/u);
const readiness = await preflight.json();
assert.equal(readiness.executionEnabled, false);
assert.equal(readiness.openrouter.status, 'not_configured');
assert.equal(readiness.fal.status, 'not_configured');

const crossOrigin = await call('/api/workflow', {
  action: 'source.put', projectId: 'not-created', kind: 'product', dataUrl: sourceDataUrl
}, { cookie, origin: 'https://attacker.example' });
assert.equal(crossOrigin.status, 403);
assert.equal((await crossOrigin.json()).error, 'origin_forbidden');

const created = await call('/api/production/projects', {
  name: 'Workflow API project', product: 'Real source under review', market: 'VN'
}, { cookie });
assert.equal(created.status, 201);
const { project } = await created.json();

const unauthenticatedModels = await call(`/api/provider-models?projectId=${encodeURIComponent(project.id)}`, undefined);
assert.equal(unauthenticatedModels.status, 401);
assert.equal((await unauthenticatedModels.json()).error, 'authentication_required');

const defaultModelsResponse = await call(`/api/provider-models?projectId=${encodeURIComponent(project.id)}`, undefined, { cookie });
assert.equal(defaultModelsResponse.status, 200);
const defaultModels = await defaultModelsResponse.json();
assert.deepEqual(defaultModels, {
  models: {
    analyze: 'anthropic/claude-opus-5.5',
    research: 'google/gemini-3.8-flash',
    strategy: 'anthropic/claude-opus-5.5',
    prompt: 'anthropic/claude-opus-5.5'
  },
  choices: {
    analyze: ['anthropic/claude-opus-5.5'],
    research: ['google/gemini-3.8-flash'],
    strategy: ['anthropic/claude-opus-5.5'],
    prompt: ['anthropic/claude-opus-5.5', 'openai/gpt-6.1-sol']
  },
  source: 'default',
  revision: 0
});

const selectedModels = { ...defaultModels.models, prompt: 'openai/gpt-6.1-sol' };
const crossOriginModels = await call('/api/provider-models', { projectId: project.id, models: selectedModels }, { cookie, origin: 'https://attacker.example' });
assert.equal(crossOriginModels.status, 403);
assert.equal((await crossOriginModels.json()).error, 'origin_forbidden');

const savedModelsResponse = await call('/api/provider-models', { projectId: project.id, models: selectedModels }, { cookie });
assert.equal(savedModelsResponse.status, 200);
const savedModels = await savedModelsResponse.json();
assert.equal(savedModels.source, 'project');
assert.equal(savedModels.revision, 1);
assert.equal(savedModels.models.prompt, 'openai/gpt-6.1-sol');
const persistedModels = await call(`/api/provider-models?projectId=${encodeURIComponent(project.id)}`, undefined, { cookie });
assert.equal(persistedModels.status, 200);
assert.deepEqual((await persistedModels.json()).models, selectedModels);

const wrongRole = await call('/api/provider-models', {
  projectId: project.id,
  models: { ...selectedModels, research: 'anthropic/claude-opus-5.5' }
}, { cookie });
assert.equal(wrongRole.status, 400);
assert.equal((await wrongRole.json()).error, 'model_role_mismatch');
assert.equal(db.prepare('SELECT revision FROM provider_project_models WHERE project_id = ?').get(project.id).revision, 1, 'wrong-role rejection cannot mutate model settings');

const upload = await call('/api/workflow', {
  action: 'source.put', projectId: project.id, kind: 'product', filename: 'product-source.png', dataUrl: sourceDataUrl
}, { cookie });
assert.equal(upload.status, 201, 'authenticated workflow upload larger than the legacy 16 KiB API cap succeeds');
const { source } = await upload.json();
assert.equal(source.byteSize, sourceBytes.byteLength);
assert.equal(source.kind, 'product');
assert.match(source.contentHash, /^sha256:[a-f0-9]{64}$/u);

const busyTimestamp = Math.floor(Date.now() / 1000);
db.prepare(`INSERT INTO workflow_runs
  (id, project_id, request_id, request_fingerprint, source_revision, status, current_stage, blocked_reason, error_json, lease_token, lease_expires_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'running', 'analyze', NULL, NULL, NULL, NULL, ?, ?)`)
  .run('busy-model-settings-run', project.id, 'busy-model-settings', 'busy-model-fingerprint', 1, busyTimestamp, busyTimestamp);
const busySave = await call('/api/provider-models', { projectId: project.id, models: defaultModels.models }, { cookie });
assert.equal(busySave.status, 409);
assert.equal((await busySave.json()).error, 'workflow_busy');
assert.equal(db.prepare('SELECT revision FROM provider_project_models WHERE project_id = ?').get(project.id).revision, 1, 'busy rejection cannot advance the model revision');
db.prepare('DELETE FROM workflow_runs WHERE id = ?').run('busy-model-settings-run');

const requestId = 'model-fingerprint-request';
const firstRun = await call('/api/workflow', { action: 'run.start', projectId: project.id, requestId }, { cookie });
assert.equal(firstRun.status, 503, 'execution-disabled run still persists an idempotency fingerprint without making a provider call');
assert.equal((await firstRun.json()).error, 'ai_execution_disabled');
const firstRunRow = db.prepare('SELECT request_fingerprint, status FROM workflow_runs WHERE project_id = ? AND request_id = ?').get(project.id, requestId);
assert.equal(firstRunRow.status, 'blocked');

const changedModelsResponse = await call('/api/provider-models', { projectId: project.id, models: defaultModels.models }, { cookie });
assert.equal(changedModelsResponse.status, 200);
const changedModels = await changedModelsResponse.json();
assert.equal(changedModels.revision, 2);
assert.equal(changedModels.models.prompt, 'anthropic/claude-opus-5.5');

const staleRetry = await call('/api/workflow', { action: 'run.start', projectId: project.id, requestId }, { cookie });
assert.equal(staleRetry.status, 409);
assert.equal((await staleRetry.json()).error, 'idempotency_conflict', 'changing project model revision invalidates an old requestId fingerprint');
assert.equal(db.prepare('SELECT request_fingerprint FROM workflow_runs WHERE project_id = ? AND request_id = ?').get(project.id, requestId).request_fingerprint, firstRunRow.request_fingerprint);

const defaultProjectResponse = await call('/api/production/projects', {
  name: 'Default environment model project', product: 'Default model fingerprint source', market: 'VN'
}, { cookie });
assert.equal(defaultProjectResponse.status, 201);
const { project: defaultProject } = await defaultProjectResponse.json();
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM provider_project_models WHERE project_id = ?').get(defaultProject.id).count,
  0,
  'default-model regression must exercise a project with no persisted model row'
);

const defaultProjectUpload = await call('/api/workflow', {
  action: 'source.put', projectId: defaultProject.id, kind: 'product', filename: 'default-model-source.png', dataUrl: sourceDataUrl
}, { cookie });
assert.equal(defaultProjectUpload.status, 201);

const defaultRequestId = 'default-env-model-fingerprint-request';
const defaultFirstRun = await call('/api/workflow', {
  action: 'run.start', projectId: defaultProject.id, requestId: defaultRequestId
}, { cookie });
assert.equal(defaultFirstRun.status, 503);
assert.equal((await defaultFirstRun.json()).error, 'ai_execution_disabled');
const defaultFirstRunRow = db.prepare(
  'SELECT id, request_fingerprint, status FROM workflow_runs WHERE project_id = ? AND request_id = ?'
).get(defaultProject.id, defaultRequestId);
assert.equal(defaultFirstRunRow.status, 'blocked');

env.WORKFLOW_PROMPT_MODEL_ID = 'openai/gpt-6.1-sol';
const changedDefaultRetry = await call('/api/workflow', {
  action: 'run.start', projectId: defaultProject.id, requestId: defaultRequestId
}, { cookie });
assert.equal(changedDefaultRetry.status, 409);
assert.equal(
  (await changedDefaultRetry.json()).error,
  'idempotency_conflict',
  'changing a revision-0 default environment model invalidates an old requestId fingerprint'
);

delete env.WORKFLOW_PROMPT_MODEL_ID;
const unchangedDefaultRetry = await call('/api/workflow', {
  action: 'run.start', projectId: defaultProject.id, requestId: defaultRequestId
}, { cookie });
assert.equal(unchangedDefaultRetry.status, 503, 'restoring the original default model safely resumes the same blocked run');
assert.equal((await unchangedDefaultRetry.json()).error, 'ai_execution_disabled');
const defaultRunRows = db.prepare(
  'SELECT id, request_fingerprint FROM workflow_runs WHERE project_id = ? AND request_id = ?'
).all(defaultProject.id, defaultRequestId);
assert.equal(defaultRunRows.length, 1, 'an unchanged retry must not create a duplicate workflow run');
assert.equal(defaultRunRows[0].id, defaultFirstRunRow.id);
assert.equal(defaultRunRows[0].request_fingerprint, defaultFirstRunRow.request_fingerprint);

const oversizedChunk = new TextEncoder().encode(`{"action":"source.put","padding":"${'x'.repeat(64 * 1024)}`);
let emitted = 0;
const oversizedBody = new ReadableStream({
  pull(controller) {
    if (emitted >= 25) { controller.close(); return; }
    controller.enqueue(oversizedChunk);
    emitted += 1;
  }
});
const oversized = await worker.fetch(new Request(`${ORIGIN}/api/workflow`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
  body: oversizedBody,
  duplex: 'half'
}), env);
assert.equal(oversized.status, 413);
assert.equal((await oversized.json()).error, 'request_too_large');

const reloaded = await call(`/api/workflow?projectId=${encodeURIComponent(project.id)}`, undefined, { cookie });
assert.equal(reloaded.status, 200);
const snapshot = await reloaded.json();
assert.equal(snapshot.project.id, project.id);
assert.equal(snapshot.workflow.sourceRevision, 1);
assert.equal(snapshot.sources.length, 1);
assert.equal(snapshot.sources[0].id, source.id);
assert.equal(snapshot.sources[0].byteSize, sourceBytes.byteLength);
assert.equal(snapshot.sources[0].contentHash, source.contentHash);
assert.equal(snapshot.sources[0].dataUrl, sourceDataUrl, 'persisted source bytes survive a fresh authenticated snapshot read');

console.log('WORKFLOW API PASS: auth/CSRF, per-project model defaults and persistence, role validation, busy guard, persisted and revision-0 default model idempotency, streamed size cap, and persisted source reload.');
db.close();
