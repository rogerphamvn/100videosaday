import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { commitPilotBudget, pilotBudgetSnapshot, reservePilotBudget } from '../integrations/pilot-budget.mjs';
import { workflowProviderInternals } from '../integrations/workflow-providers.mjs';

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

function makeEnv(overrides = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const migration of ['0001_auth.sql', '0002_production.sql', '0003_workflow.sql', '0004_pilot_budget.sql']) {
    sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  const timestamp = 1_798_000_000;
  sqlite.prepare('INSERT INTO production_projects (id,name,product,market,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run('pilot_project', 'Pilot', 'Oil sprayer', 'VN', timestamp, timestamp);
  sqlite.prepare("INSERT INTO workflow_runs (id,project_id,request_id,request_fingerprint,source_revision,status,current_stage,created_at,updated_at) VALUES (?,?,?,?,?,'running','analyze',?,?)")
    .run('pilot_run', 'pilot_project', 'pilot-request', 'fingerprint', 1, timestamp, timestamp);
  return {
    AUTH_DB: { prepare: (sql) => new Statement(sqlite, sql) },
    WORKFLOW_PILOT_EXECUTION_ENABLED: 'true',
    OPENROUTER_API_KEY: 'test-openrouter-key-123456',
    ...overrides,
    sqlite
  };
}

const catalogModels = {
  'anthropic/claude-opus-5.5': {
    id: 'anthropic/claude-opus-5.5', context_length: 1_000_000,
    architecture: { input_modalities: ['text', 'image'] },
    supported_parameters: ['max_completion_tokens', 'response_format', 'tools'],
    pricing: { prompt: '0.000004', completion: '0.00002', web_search: '0.01' }
  },
  'google/gemini-3.8-flash': {
    id: 'google/gemini-3.8-flash', context_length: 1_048_576,
    architecture: { input_modalities: ['text'] },
    supported_parameters: ['max_completion_tokens', 'response_format', 'tools'],
    pricing: { prompt: '0.000000825', completion: '0.000004125', web_search: '0.014' }
  }
};

const maxSizedDataUrl = `data:image/jpeg;base64,${'A'.repeat(Math.ceil((256 * 1024 * 4) / 3))}`;
const analyzeMessages = [
  { role: 'system', content: 'Return JSON.' },
  { role: 'user', content: [
    { type: 'text', text: 'Analyze these bounded sources.' },
    { type: 'image_url', image_url: { url: maxSizedDataUrl } },
    { type: 'image_url', image_url: { url: maxSizedDataUrl } }
  ] }
];
const analyzeEstimate = workflowProviderInternals.estimatePilotCall({
  stage: 'analyze', requestBody: { messages: analyzeMessages }, catalogModel: catalogModels['anthropic/claude-opus-5.5'], imageInput: true, webSearch: false
});
assert.equal(analyzeEstimate.imageCount, 2);
assert.ok(analyzeEstimate.inputTokens < 50_000, 'base64 transport bytes are not miscounted as text tokens');
assert.ok(analyzeEstimate.estimatedUsd < 0.25, 'two max-byte, max-1600px sources fit the fixed pilot envelope');

function successFetch(requestBodies, { failChat = false, includesByok = true } = {}) {
  return async (url, init = {}) => {
    const href = String(url);
    if (href.endsWith('/api/v1/models')) return Response.json({ data: Object.values(catalogModels) });
    if (href.endsWith('/api/v1/key')) return Response.json({ data: { limit: 2, limit_remaining: 2, limit_reset: null, include_byok_in_limit: includesByok } });
    if (href.endsWith('/api/v1/chat/completions')) {
      if (failChat) throw new Error('simulated connection loss');
      const body = JSON.parse(init.body);
      requestBodies.push(body);
      const isResearch = body.tools?.[0]?.type === 'openrouter:web_search';
      return Response.json({
        id: `generation-${requestBodies.length}`,
        model: body.model,
        choices: [{ message: {
          content: JSON.stringify({ ok: true }),
          annotations: isResearch ? [{ type: 'url_citation', url_citation: { url: 'https://evidence.example/item', title: 'Evidence', content: 'Observed public evidence snippet.' } }] : []
        } }],
        usage: { cost: 0.01, prompt_tokens: 100, completion_tokens: 20, server_tool_use: isResearch ? { web_search_requests: 1 } : undefined }
      });
    }
    throw new Error(`Unexpected URL: ${href}`);
  };
}

const env = makeEnv();
const requestBodies = [];
const options = { fetchImpl: successFetch(requestBodies), pilotContext: { runId: 'pilot_run', projectId: 'pilot_project' } };
for (const [stage, modelId, webSearch] of [
  ['analyze', 'anthropic/claude-opus-5.5', false],
  ['research', 'google/gemini-3.8-flash', true],
  ['strategy', 'anthropic/claude-opus-5.5', false],
  ['prompts', 'anthropic/claude-opus-5.5', false]
]) {
  const result = await workflowProviderInternals.callOpenRouterJson({ modelId, stage, system: 'Return JSON.', content: '{}', webSearch }, env, options);
  assert.equal(result.output.ok, true);
}

assert.deepEqual(requestBodies.map((body) => body.max_completion_tokens), [2048, 3072, 3072, 8192]);
assert.deepEqual(requestBodies[1].tools, [{ type: 'openrouter:web_search', parameters: { engine: 'exa', max_uses: 1, max_results: 3, max_total_results: 3 } }]);
assert.equal(requestBodies[1].max_tool_calls, 1);
assert.equal(requestBodies.every((body) => body.provider.allow_fallbacks === false), true);
assert.equal(requestBodies.every((body) => body.provider.require_parameters === true), true);
const rows = env.sqlite.prepare('SELECT * FROM workflow_ai_budget_reservations ORDER BY created_at, stage').all();
assert.equal(rows.length, 4);
assert.equal(rows.every((row) => row.status === 'committed'), true);
const budget = await pilotBudgetSnapshot(env);
assert.equal(budget.capUsd, 2);
assert.equal(budget.spentUsd, 0.04);
assert.equal(budget.reservedUsd, 0, 'committed reservations are not displayed as active reserves');
assert.ok(budget.accountedUsd <= 2);

const callsBeforeDuplicate = requestBodies.length;
await assert.rejects(
  () => workflowProviderInternals.callOpenRouterJson({ modelId: 'anthropic/claude-opus-5.5', stage: 'analyze', system: 'Return JSON.', content: '{}' }, env, options),
  (error) => error.code === 'pilot_budget_reservation_exists'
);
assert.equal(requestBodies.length, callsBeforeDuplicate, 'duplicate stage reservation blocks a second paid POST');

const holdEnv = makeEnv();
const heldFetch = successFetch([], { failChat: true });
await assert.rejects(
  () => workflowProviderInternals.callOpenRouterJson({ modelId: 'anthropic/claude-opus-5.5', stage: 'analyze', system: 'Return JSON.', content: '{}' }, holdEnv, { fetchImpl: heldFetch, pilotContext: { runId: 'pilot_run', projectId: 'pilot_project' } }),
  (error) => error.code === 'budget_reconciling' && error.details?.retryable === false && error.details?.resumeSameRun === false
);
const heldBudget = await pilotBudgetSnapshot(holdEnv);
assert.equal(heldBudget.state, 'held');
assert.ok(heldBudget.heldUsd > 0, 'uncertain provider outcome keeps its reservation');
await assert.rejects(
  () => reservePilotBudget({ runId: 'another_run', projectId: 'pilot_project', stage: 'research', modelId: 'test/model', amountUsd: 0.01 }, holdEnv),
  (error) => error.code === 'pilot_budget_not_active'
);

const uncappedEnv = makeEnv();
let uncappedChats = 0;
const uncappedFetch = async (url, init) => {
  if (String(url).endsWith('/api/v1/chat/completions')) uncappedChats += 1;
  return successFetch([], { includesByok: false })(url, init);
};
await assert.rejects(
  () => workflowProviderInternals.callOpenRouterJson({ modelId: 'anthropic/claude-opus-5.5', stage: 'analyze', system: 'Return JSON.', content: '{}' }, uncappedEnv, { fetchImpl: uncappedFetch, pilotContext: { runId: 'pilot_run', projectId: 'pilot_project' } }),
  (error) => error.code === 'openrouter_pilot_key_cap_required'
);
assert.equal(uncappedChats, 0, 'provider call is blocked before spend when the key cap is not complete');
assert.equal(uncappedEnv.sqlite.prepare('SELECT COUNT(*) AS count FROM workflow_ai_budget_reservations').get().count, 0);

const guardEnv = makeEnv();
const guardedReservation = await reservePilotBudget({ runId: 'pilot_run', projectId: 'pilot_project', stage: 'analyze', modelId: 'test/model', amountUsd: 1.1 }, guardEnv);
await assert.rejects(
  () => reservePilotBudget({ runId: 'another_run', projectId: 'pilot_project', stage: 'research', modelId: 'test/model', amountUsd: 1 }, guardEnv),
  (error) => error.code === 'pilot_budget_exceeded'
);
guardEnv.sqlite.prepare('DELETE FROM workflow_runs WHERE id = ?').run('pilot_run');
assert.equal(guardEnv.sqlite.prepare('SELECT COUNT(*) AS count FROM workflow_ai_budget_reservations WHERE id = ?').get(guardedReservation.id).count, 1, 'deleting a run cannot reset the global pilot envelope');

const releaseEnv = makeEnv();
const releasedReservation = await reservePilotBudget({ runId: 'pilot_run', projectId: 'pilot_project', stage: 'analyze', modelId: 'test/model', amountUsd: 1.1 }, releaseEnv);
await commitPilotBudget(releasedReservation.id, { actualUsd: 0.1, providerRunId: 'provider-small' }, releaseEnv);
const releasedBudget = await pilotBudgetSnapshot(releaseEnv);
assert.equal(releasedBudget.accountedUsd, 0.1, 'a known committed cost releases unused reservation headroom');
assert.equal(releasedBudget.remainingUsd, 1.9);
await reservePilotBudget({ runId: 'another_run', projectId: 'pilot_project', stage: 'research', modelId: 'test/model', amountUsd: 1.9 }, releaseEnv);

const overrunEnv = makeEnv();
const overrunReservation = await reservePilotBudget({ runId: 'pilot_run', projectId: 'pilot_project', stage: 'analyze', modelId: 'test/model', amountUsd: 0.1 }, overrunEnv);
await commitPilotBudget(overrunReservation.id, { actualUsd: 2.5, providerRunId: 'provider-overrun' }, overrunEnv);
const overrunBudget = await pilotBudgetSnapshot(overrunEnv);
assert.equal(overrunBudget.spentUsd, 2.5, 'actual provider cost remains truthful even when it exceeds the reservation');
assert.equal(overrunBudget.remainingUsd, 0);
assert.equal(overrunBudget.state, 'exhausted');
await assert.rejects(
  () => reservePilotBudget({ runId: 'another_run', projectId: 'pilot_project', stage: 'research', modelId: 'test/model', amountUsd: 0.01 }, overrunEnv),
  (error) => ['pilot_budget_exceeded', 'pilot_budget_not_active'].includes(error.code)
);

const estimatorViolationEnv = makeEnv();
const estimatorReservation = await reservePilotBudget({ runId: 'pilot_run', projectId: 'pilot_project', stage: 'analyze', modelId: 'test/model', amountUsd: 0.1 }, estimatorViolationEnv);
await commitPilotBudget(estimatorReservation.id, { actualUsd: 0.2, providerRunId: 'provider-estimator-violation' }, estimatorViolationEnv);
const estimatorBudget = await pilotBudgetSnapshot(estimatorViolationEnv);
assert.equal(estimatorBudget.spentUsd, 0.2);
assert.equal(estimatorBudget.state, 'paused', 'actual cost above its reservation pauses the whole pilot even below USD 2');
await assert.rejects(
  () => reservePilotBudget({ runId: 'another_run', projectId: 'pilot_project', stage: 'research', modelId: 'test/model', amountUsd: 0.01 }, estimatorViolationEnv),
  (error) => error.code === 'pilot_budget_not_active'
);

console.log('PILOT BUDGET PASS: fixed USD 2 envelope, four bounded stages, explicit one-call Exa search, provider-key backstop, idempotent reservations, and held uncertain outcomes.');
