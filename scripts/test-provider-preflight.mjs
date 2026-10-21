import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { preflightWorkflowProviders, providerPreflightInternals } from '../integrations/provider-preflight.mjs';
import { IntegrationError } from '../integrations/shared.mjs';
import { analyzeProduct, authorPromptPair, createStrategy, researchProduct, workflowProviderReadiness } from '../integrations/workflow-providers.mjs';
import worker from '../cloudflare/worker.mjs';

const SECRET = 'sk-or-v1-super-secret-preflight-test';
const configuredEnv = {
  OPENROUTER_API_KEY: SECRET,
  WORKFLOW_ANALYZE_MODEL_ID: 'anthropic/claude-opus-5.5',
  WORKFLOW_RESEARCH_MODEL_ID: 'google/gemini-3.8-flash',
  WORKFLOW_STRATEGY_MODEL_ID: 'anthropic/claude-opus-5.5',
  WORKFLOW_PROMPT_MODEL_ID: 'openai/gpt-6.1-sol',
  JEV_RESEARCH_BRIDGE_URL: 'https://jev.example',
  JEV_RESEARCH_BRIDGE_TOKEN: 'jev-secret-token',
  FAL_KEY: 'fal-secret-key',
  REPLICATE_API_TOKEN: 'replicate-secret-token'
};
const catalog = { data: [
  { id: 'anthropic/claude-opus-5.5' },
  { id: 'google/gemini-3.8-flash' },
  { id: 'openai/gpt-6.1-sol' }
] };

let calls = [];
const verifiedFetch = async (url, init) => {
  calls.push({ url: String(url), method: init.method, redirect: init.redirect, authorization: init.headers.Authorization });
  if (String(url).endsWith('/key')) return Response.json({ data: { label: 'workflow-key' } });
  if (String(url).endsWith('/models')) return Response.json(catalog);
  throw new Error('unexpected endpoint');
};

let result = await preflightWorkflowProviders({}, { fetchImpl: async () => { throw new Error('must not fetch'); } });
assert.equal(result.openrouter.status, 'not_configured');
assert.deepEqual(result.openrouter.checks, { key: 'not_checked', catalog: 'not_checked' });
assert.equal(result.openrouter.phase, 'secret');
assert.equal(result.executionEnabled, false);

result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: verifiedFetch });
assert.equal(result.openrouter.status, 'verified');
assert.deepEqual(result.openrouter.checks, { key: 'verified', catalog: 'verified' });
assert.equal(result.openrouter.phase, 'roles');
assert.equal(result.executionEnabled, false, 'credentials never enable execution');
assert.deepEqual(calls.map((call) => [call.method, call.url, call.redirect]), [
  ['GET', 'https://openrouter.ai/api/v1/key', 'error'],
  ['GET', 'https://openrouter.ai/api/v1/models', 'error']
]);
assert.ok(calls.every((call) => call.authorization === `Bearer ${SECRET}`));
assert.ok(Object.values(result.openrouter.roles).every((role) => role.status === 'verified'));
assert.equal(result.fal.status, 'configured_unverified');
assert.equal(result.replicate.status, 'configured_unverified');
assert.equal(result.jev.status, 'configured_unverified');
assert.doesNotMatch(JSON.stringify(result), new RegExp(SECRET, 'u'));
assert.doesNotMatch(JSON.stringify(result), /jev-secret|fal-secret|replicate-secret/u);

const accidentalModelSecret = 'sk-or-v1-accidentally-pasted-into-model-binding';
result = await preflightWorkflowProviders({
  ...configuredEnv,
  WORKFLOW_ANALYZE_MODEL_ID: accidentalModelSecret
}, { fetchImpl: verifiedFetch });
assert.equal(result.openrouter.status, 'role_mismatch');
assert.equal(result.openrouter.roles.analyze.status, 'role_mismatch');
assert.equal(result.openrouter.roles.analyze.configuredModelId, null);
assert.doesNotMatch(JSON.stringify(result), new RegExp(accidentalModelSecret, 'u'));

const readiness = workflowProviderReadiness({
  ...configuredEnv,
  WORKFLOW_ANALYZE_MODEL_ID: accidentalModelSecret,
  WORKFLOW_FAL_IMAGE_MODEL_ID: accidentalModelSecret,
  WORKFLOW_FAL_VIDEO_MODEL_ID: 'google/gemini-omni-flash/v1.1/text-to-video',
  WORKFLOW_REPLICATE_IMAGE_MODEL_ID: 'openai/gpt-image-2.5-flare',
  WORKFLOW_REPLICATE_VIDEO_MODEL_ID: accidentalModelSecret
});
assert.equal(readiness.openrouter.models.analyze, null);
assert.equal(readiness.media.mappings.falImage, null);
assert.equal(readiness.media.mappings.replicateVideo, null);
assert.equal(readiness.media.mappings.falVideo, 'google/gemini-omni-flash/v1.1/text-to-video');
assert.equal(readiness.media.mappings.replicateImage, 'openai/gpt-image-2.5-flare');
assert.doesNotMatch(JSON.stringify(readiness), new RegExp(accidentalModelSecret, 'u'));

calls = [];
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async (url, init) => {
  calls.push({ url: String(url), init });
  return new Response(`invalid json containing ${SECRET}`, { status: 200, headers: { 'Content-Type': 'application/json' } });
} });
assert.equal(result.openrouter.status, 'invalid_response');
assert.equal(calls.length, 1);
assert.doesNotMatch(JSON.stringify(result), new RegExp(SECRET, 'u'));

result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => new Response(`rejected ${SECRET}`, { status: 401 }) });
assert.equal(result.openrouter.status, 'key_rejected');
assert.equal(result.openrouter.phase, 'key');
assert.deepEqual(result.openrouter.checks, { key: 'key_rejected', catalog: 'not_checked' });
assert.doesNotMatch(JSON.stringify(result), new RegExp(SECRET, 'u'));

let diagnosticCall = 0;
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => {
  diagnosticCall += 1;
  if (diagnosticCall === 1) return Response.json({ data: { label: 'workflow-key' } });
  throw new Error(`network failure must not expose ${SECRET}`);
} });
assert.equal(result.openrouter.status, 'network_error');
assert.equal(result.openrouter.phase, 'catalog');
assert.deepEqual(result.openrouter.checks, { key: 'verified', catalog: 'network_error' });
assert.doesNotMatch(JSON.stringify(result), new RegExp(SECRET, 'u'));

diagnosticCall = 0;
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => {
  diagnosticCall += 1;
  return diagnosticCall === 1
    ? Response.json({ data: { label: 'workflow-key' } })
    : new Response('{"error":"temporary"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
} });
assert.equal(result.openrouter.status, 'provider_unavailable');
assert.deepEqual(result.openrouter.checks, { key: 'verified', catalog: 'provider_unavailable' });

diagnosticCall = 0;
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => {
  diagnosticCall += 1;
  if (diagnosticCall === 1) return Response.json({ data: { label: 'workflow-key' } });
  throw new IntegrationError('integration_timeout', 'must remain sanitized', 504);
} });
assert.equal(result.openrouter.status, 'timeout');
assert.equal(result.openrouter.phase, 'catalog');
assert.deepEqual(result.openrouter.checks, { key: 'verified', catalog: 'timeout' });

diagnosticCall = 0;
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => {
  diagnosticCall += 1;
  return diagnosticCall === 1
    ? Response.json({ data: { label: 'workflow-key' } })
    : Response.json({ data: [{ unavailable: true }] });
} });
assert.equal(result.openrouter.status, 'invalid_response');
assert.equal(result.openrouter.phase, 'catalog');
assert.deepEqual(result.openrouter.checks, { key: 'verified', catalog: 'invalid_response' });

diagnosticCall = 0;
const catalogWithHeadroom = JSON.stringify({ ...catalog, padding: 'x'.repeat(1_100_000) });
assert.ok(Buffer.byteLength(catalogWithHeadroom) > 1_048_576, 'fixture exceeds the previous 1 MiB ceiling');
assert.ok(Buffer.byteLength(catalogWithHeadroom) < providerPreflightInternals.MAX_CATALOG_PREFLIGHT_BYTES);
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => {
  diagnosticCall += 1;
  return diagnosticCall === 1
    ? Response.json({ data: { label: 'workflow-key' } })
    : new Response(catalogWithHeadroom, { headers: { 'Content-Type': 'application/json' } });
} });
assert.equal(result.openrouter.status, 'verified', 'catalog responses between 1 and 2 MiB remain verifiable');

diagnosticCall = 0;
const oversizedCatalog = new Uint8Array(providerPreflightInternals.MAX_CATALOG_PREFLIGHT_BYTES + 1);
result = await preflightWorkflowProviders(configuredEnv, { fetchImpl: async () => {
  diagnosticCall += 1;
  return diagnosticCall === 1
    ? Response.json({ data: { label: 'workflow-key' } })
    : new Response(oversizedCatalog, { headers: { 'Content-Type': 'application/json' } });
} });
assert.equal(result.openrouter.status, 'response_too_large');
assert.equal(result.openrouter.phase, 'catalog');
assert.deepEqual(result.openrouter.checks, { key: 'verified', catalog: 'response_too_large' });

const workflowUiSource = readFileSync(new URL('../prototype-v2/workflow.js', import.meta.url), 'utf8');
const uiMapper = workflowUiSource.match(/function providerUiState[\s\S]*?function providerStateLabel/u)?.[0] || '';
assert.match(uiMapper, /return safeStatus;/u, 'typed sanitized failures must not collapse to configured_unverified');
for (const status of ['key_rejected', 'invalid_response', 'network_error', 'provider_unavailable', 'timeout', 'response_too_large']) {
  assert.match(workflowUiSource, new RegExp(`\\b${status}\\b`, 'u'), `workflow UI preserves ${status}`);
}

let networkCalls = 0;
const executionOffEnv = { ...configuredEnv };
const forbiddenFetch = async () => { networkCalls += 1; throw new Error('execution-off must not fetch'); };
const disabledCases = [
  () => analyzeProduct({ project: {}, sources: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }] }, executionOffEnv, { fetchImpl: forbiddenFetch }),
  () => researchProduct({ project: { id: 'project_test', product: 'Test', market: 'Việt Nam' }, analysis: { productName: 'Test', category: 'Test' } }, executionOffEnv, { fetchImpl: forbiddenFetch }),
  () => createStrategy({ project: {}, analysis: {}, research: {} }, executionOffEnv, { fetchImpl: forbiddenFetch }),
  () => authorPromptPair({ project: { id: 'project_test' }, sources: [], sourceSnapshotId: 'snap_test000', analysis: {}, research: {}, strategy: {} }, executionOffEnv, { fetchImpl: forbiddenFetch })
];
for (const invoke of disabledCases) {
  await assert.rejects(invoke, (error) => error.code === 'ai_execution_disabled');
}
assert.equal(networkCalls, 0, 'execution OFF blocks every potentially paid workflow stage before network access');

class Statement {
  constructor(db, sql, values = []) { Object.assign(this, { db, sql, values }); }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  async first() { return this.db.prepare(this.sql).get(...this.values) || null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() {
    const value = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(value.changes), last_row_id: Number(value.lastInsertRowid) } };
  }
}
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../cloudflare/migrations/0001_auth.sql', import.meta.url), 'utf8'));
const apiEnv = {
  ...configuredEnv,
  INTERNAL_PASSWORD: 'provider-preflight-login-password',
  AUTH_DB: {
    prepare: sql => new Statement(db, sql),
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const output = [];
        for (const statement of statements) output.push(await statement.run());
        db.exec('COMMIT');
        return output;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  },
  ASSETS: { fetch: async () => new Response('asset') }
};
const origin = 'https://studio.example';
const apiRequest = (path, body, cookie = '') => new Request(`${origin}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(body)
});
const originalFetch = globalThis.fetch;
try {
  calls = [];
  globalThis.fetch = verifiedFetch;
  const unauthenticated = await worker.fetch(apiRequest('/api/provider-preflight', {}), apiEnv);
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get('Cache-Control') || '', /no-store/u);

  const crossOrigin = await worker.fetch(new Request(`${origin}/api/provider-preflight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
    body: '{}'
  }), apiEnv);
  assert.equal(crossOrigin.status, 403);

  const login = await worker.fetch(apiRequest('/api/auth/login', { username: 'team', password: apiEnv.INTERNAL_PASSWORD }), apiEnv);
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie').split(';', 1)[0];

  const wrongMethod = await worker.fetch(new Request(`${origin}/api/provider-preflight`, {
    method: 'GET',
    headers: { Cookie: cookie }
  }), apiEnv);
  assert.equal(wrongMethod.status, 405);

  const nonemptyBody = await worker.fetch(apiRequest('/api/provider-preflight', { probe: true }, cookie), apiEnv);
  assert.equal(nonemptyBody.status, 400);

  const apiResponse = await worker.fetch(apiRequest('/api/provider-preflight', {}, cookie), apiEnv);
  assert.equal(apiResponse.status, 200);
  assert.match(apiResponse.headers.get('Cache-Control') || '', /no-store/u);
  const apiPayload = await apiResponse.json();
  assert.equal(apiPayload.openrouter.status, 'verified');
  assert.deepEqual(calls.map((call) => [call.method, call.url, call.redirect]), [
    ['GET', 'https://openrouter.ai/api/v1/key', 'error'],
    ['GET', 'https://openrouter.ai/api/v1/models', 'error']
  ]);
  assert.doesNotMatch(JSON.stringify(apiPayload), new RegExp(SECRET, 'u'));
} finally {
  globalThis.fetch = originalFetch;
  db.close();
}

console.log('PROVIDER PREFLIGHT PASS: explicit read-only GET verification, sanitized failures, presence-only media readiness, and execution-OFF zero-fetch guard.');
