import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleWorkflow, executeWorkflowRun, workflowInternals } from '../cloudflare/workflow.mjs';
import { validatePromptPair } from '../cloudflare/prompt-validation.mjs';
import { analyzeProduct, prepareMediaRequest, WorkflowProviderError } from '../integrations/workflow-providers.mjs';

class D1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new D1Statement(this.database, this.sql, values); }
  async first() { return this.database.sqlite.prepare(this.sql).get(...this.values) || null; }
  async all() { return { results: this.database.sqlite.prepare(this.sql).all(...this.values) }; }
  async run() {
    const result = this.database.sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

class D1Database {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.failBatchAtIndex = null;
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    for (const file of ['0001_auth.sql', '0002_production.sql', '0003_workflow.sql']) {
      this.sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/${file}`, import.meta.url), 'utf8'));
    }
  }
  prepare(sql) { return new D1Statement(this, sql); }
  async batch(statements) {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const [index, statement] of statements.entries()) {
        if (index === this.failBatchAtIndex) throw new Error('injected_batch_failure');
        results.push(await statement.run());
      }
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
}

const ORIGIN = 'https://studio.example';
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const imageMegaFixture = JSON.parse(readFileSync(new URL('../examples/image-mega-prompt.demo.json', import.meta.url), 'utf8'));
const imageNegativeFixture = JSON.parse(readFileSync(new URL('../examples/image-negative-prompt.demo.json', import.meta.url), 'utf8'));

function apiRequest(body, query = '') {
  return new Request(`${ORIGIN}/api/workflow${query}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function call(env, body, query = '') {
  const response = await handleWorkflow(apiRequest(body, query), env);
  assert.ok(response instanceof Response);
  return { response, body: await response.json() };
}

function dataUrl(bytes, mime = 'image/png') { return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`; }
const png = (...tail) => dataUrl([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...tail]);

function promptPair(projectId, snapshotId, sources, { actual = false, invocationRef = 'demo:no-actual-model-call' } = {}) {
  const megaPrompt = deepClone(imageMegaFixture), negativePrompt = deepClone(imageNegativeFixture);
  megaPrompt.provenance.projectId = projectId; negativePrompt.provenance.projectId = projectId;
  megaPrompt.provenance.sourceSnapshotId = snapshotId; negativePrompt.provenance.sourceSnapshotId = snapshotId;
  const product = sources.find((source) => source.kind === 'product');
  const packaging = sources.find((source) => source.kind === 'packaging');
  megaPrompt.sourceEvidence[0].contentHash = product.contentHash;
  megaPrompt.sourceEvidence[0].hashStatus = 'verified_bytes';
  megaPrompt.sourceEvidence[0].reviewStatus = 'unverified';
  megaPrompt.sourceEvidence[1].productEvidence = Boolean(packaging);
  if (packaging) {
    megaPrompt.sourceEvidence[1].contentHash = packaging.contentHash;
    megaPrompt.sourceEvidence[1].hashStatus = 'verified_bytes';
    megaPrompt.sourceEvidence[1].reviewStatus = 'unverified';
  }
  megaPrompt.sourceEvidence[2].productEvidence = false;
  if (actual) {
    for (const prompt of [megaPrompt, negativePrompt]) {
      prompt.authorship = { modelFamily: 'gpt-6.1-sol', authoringMode: 'model_authored', authoredAt: '2026-10-21T00:00:00Z', verificationStatus: 'actual_invocation_verified', invocationRef };
    }
    megaPrompt.productLock.syntheticDemo = false;
    for (const evidence of megaPrompt.sourceEvidence.filter((item) => item.productEvidence)) evidence.hashStatus = 'verified_bytes';
    for (const evidence of megaPrompt.sourceEvidence) evidence.reviewStatus = 'unverified';
    megaPrompt.approvedClaims = [];
    megaPrompt.strategy.hook.claimRefs = [];
    megaPrompt.creative.textOverlays = [];
  }
  negativePrompt.policy.unsupportedHandling = 'compile_into_positive_prompt';
  return { megaPrompt, negativePrompt };
}

function insertProject(env, id, name = id, market = 'Vietnam') {
  const timestamp = 1_798_000_000;
  env.AUTH_DB.sqlite.prepare('INSERT INTO production_projects (id,name,product,market,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run(id, name, 'Product source pending', market, timestamp, timestamp);
}

const env = { AUTH_DB: new D1Database() };
insertProject(env, 'project_alpha');
insertProject(env, 'project_beta');

const atomicEnv = { AUTH_DB: new D1Database() };
insertProject(atomicEnv, 'project_atomic');
await call(atomicEnv, undefined, '?projectId=project_atomic');
atomicEnv.AUTH_DB.failBatchAtIndex = 1;
let atomicResult = await call(atomicEnv, { action: 'source.put', projectId: 'project_atomic', kind: 'product', dataUrl: png(91) });
assert.equal(atomicResult.response.status, 503);
atomicEnv.AUTH_DB.failBatchAtIndex = null;
atomicResult = await call(atomicEnv, undefined, '?projectId=project_atomic');
assert.equal(atomicResult.body.sources.length, 0, 'failed source batch rolls back inserted bytes');
assert.equal(atomicResult.body.workflow.sourceRevision, 0, 'failed source batch cannot desynchronize source revision');

let result = await call(env, undefined, '?projectId=project_alpha');
assert.equal(result.response.status, 200);
assert.deepEqual(result.body.sources, []);
assert.equal(result.body.limits.sourceCount, 4);

result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'product', dataUrl: dataUrl([1, 2, 3]) });
assert.equal(result.response.status, 400, 'magic bytes are validated');

result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'packaging', filename: 'box.png', dataUrl: png(1) });
assert.equal(result.response.status, 201);
assert.equal(result.body.source.slot, 1);

result = await call(env, { action: 'run.start', projectId: 'project_alpha', requestId: 'packaging-only-run' });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'product_source_required', 'packaging alone cannot drive product analysis');

result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'product', filename: 'product.png', dataUrl: png(2) });
assert.equal(result.response.status, 201);
const productSource = result.body.source;
result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'product', dataUrl: png(2) });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'duplicate_source');

let snapshot = (await call(env, undefined, '?projectId=project_alpha')).body;
const pair = promptPair('project_alpha', `snap_${(await import('node:crypto')).createHash('sha256').update(`project_alpha|${snapshot.workflow.sourceRevision}|${snapshot.sources.sort((a, b) => a.slot - b.slot).map((source) => `${source.kind}:${source.contentHash}`).join('|')}`).digest('hex').slice(0, 32)}`, snapshot.sources, { actual: true, invocationRef: 'external-import-1' });
const importedPairValidation = validatePromptPair(pair.megaPrompt, pair.negativePrompt);
assert.equal(importedPairValidation.valid, true, JSON.stringify(importedPairValidation.errors));
const wrongSourceKindPair = deepClone(pair);
[wrongSourceKindPair.megaPrompt.sourceEvidence[0].kind, wrongSourceKindPair.megaPrompt.sourceEvidence[1].kind] = [wrongSourceKindPair.megaPrompt.sourceEvidence[1].kind, wrongSourceKindPair.megaPrompt.sourceEvidence[0].kind];
result = await call(env, { action: 'draft.put', projectId: 'project_alpha', draftType: 'prompt_pair', title: 'Wrong source roles', payload: wrongSourceKindPair });
assert.equal(result.response.status, 422);
assert.equal(result.body.error, 'prompt_source_evidence_mismatch', 'hash presence cannot substitute for the correct product/packaging evidence kind');
const missingIdentityPair = deepClone(pair);
missingIdentityPair.megaPrompt.productLock.references[0].role = 'packaging_identity';
result = await call(env, { action: 'draft.put', projectId: 'project_alpha', draftType: 'prompt_pair', title: 'Missing identity lock', payload: missingIdentityPair });
assert.equal(result.response.status, 422);
assert.equal(result.body.error, 'prompt_identity_lock_incomplete');

result = await call(env, { action: 'draft.put', projectId: 'project_alpha', draftType: 'prompt_pair', title: 'Imported pair', payload: pair });
assert.equal(result.response.status, 201);
const importedPrompt = result.body.draft;
assert.equal(importedPrompt.validationStatus, 'valid');
assert.equal(importedPrompt.authoringTrust, 'unverified_external');
assert.equal(importedPrompt.stale, false);

result = await call(env, { action: 'media.queue', projectId: 'project_alpha', draftId: importedPrompt.id, provider: 'fal', mediaType: 'image', executionBudgetUsd: 1 });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'prompt_not_execution_trusted');

const creativePayload = {
  testingStatus: 'ready', promptDraftId: importedPrompt.id,
  artifact: { origin: 'external_import', mediaType: 'image', locator: 'https://cdn.example/creative-1.png', evidenceRef: 'external-test-asset-1' }
};
result = await call(env, { action: 'draft.put', projectId: 'project_alpha', draftType: 'creative', title: 'Tested creative', payload: creativePayload });
assert.equal(result.response.status, 201);
const creative = result.body.draft;
result = await call(env, { action: 'draft.put', projectId: 'project_beta', draftType: 'creative', title: 'Cross-project prompt attempt', payload: creativePayload });
assert.equal(result.response.status, 409, 'creative prompt lineage is project-scoped');
result = await call(env, { action: 'draft.put', projectId: 'project_alpha', draftId: importedPrompt.id, expectedRevision: importedPrompt.revision, draftType: 'creative', title: 'Type confusion attempt', payload: creativePayload });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'draft_type_immutable');

result = await call(env, { action: 'measurement.record', projectId: 'project_beta', draftId: creative.id, metric: 'ctr', value: 1.2, unit: '%', evidenceRef: 'ads-report-1', observedAt: '2026-10-21T01:00:00Z' });
assert.equal(result.response.status, 404, 'cross-project creative IDs are rejected');
result = await call(env, { action: 'measurement.record', projectId: 'project_alpha', draftId: creative.id, metric: 'ctr', value: 1.2, unit: '%', evidenceRef: 'ads-report-1', observedAt: '2026-10-21T01:00:00Z' });
assert.equal(result.response.status, 201);
const measurement = result.body.measurement;
result = await call(env, { action: 'winner.select', projectId: 'project_alpha', draftId: creative.id, measurementIds: [measurement.id], rationale: 'Observed CTR in referenced report.' });
assert.equal(result.response.status, 201);
const winner = result.body.winner;
result = await call(env, { action: 'winner.clone', projectId: 'project_beta', winnerId: winner.id });
assert.equal(result.response.status, 404, 'winner lineage is project-scoped');
result = await call(env, { action: 'winner.clone', projectId: 'project_alpha', winnerId: winner.id, title: 'Winner clone draft' });
assert.equal(result.response.status, 201);
assert.equal(result.body.draft.draftType, 'clone');
assert.equal(result.body.draft.payload.workflowLineage.creativeDraftId, creative.id);
assert.equal(result.body.draft.status, 'draft', 'clone is not auto-promoted as a winner');

result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'product', dataUrl: png(3) });
assert.equal(result.response.status, 201);
snapshot = (await call(env, undefined, '?projectId=project_alpha')).body;
assert.equal(snapshot.drafts.find((draft) => draft.id === importedPrompt.id).stale, true, 'source changes invalidate downstream prompt snapshots');
result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'packaging', dataUrl: png(4) });
assert.equal(result.response.status, 201);
result = await call(env, { action: 'source.put', projectId: 'project_alpha', kind: 'product', dataUrl: png(5) });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'source_limit_reached');

result = await call(env, { action: 'stage.import', projectId: 'project_beta', stage: 'research', actualModelId: 'external/model', output: { evidence: [{ url: 'https://example.com/a', retrievedAt: 'not-a-date' }] } });
assert.equal(result.response.status, 422, 'research imports require dated citations');

const resumeEnv = { AUTH_DB: new D1Database() };
insertProject(resumeEnv, 'project_resume');
await call(resumeEnv, { action: 'source.put', projectId: 'project_resume', kind: 'product', dataUrl: png(21) });
result = await call(resumeEnv, { action: 'run.start', projectId: 'project_resume', requestId: 'resume-blocked-run' });
assert.equal(result.response.status, 503);
assert.equal(result.body.run.status, 'blocked');
result = await call(resumeEnv, { action: 'stage.import', projectId: 'project_resume', stage: 'analyze', actualModelId: 'external/analyzer', output: { productName: 'Imported product', category: 'Kitchen' } });
assert.equal(result.response.status, 201);
const resumedRunId = result.body.stage.runId;
result = await call(resumeEnv, { action: 'stage.import', projectId: 'project_resume', stage: 'research', actualModelId: 'external/researcher', output: { evidence: [{ url: 'https://evidence.example/resume', retrievedAt: '2026-10-21T03:00:00Z', publishedAt: '2026-10-20T00:00:00Z' }] } });
assert.equal(result.response.status, 201, 'sequential imports can continue a provider run that was previously blocked');
assert.equal(result.body.stage.runId, resumedRunId);

// Full sequential provider run on a separate project, using mocked network responses.
const readyEnv = {
  AUTH_DB: new D1Database(),
  OPENROUTER_API_KEY: 'test-openrouter-key-123456',
  WORKFLOW_ANALYZE_MODEL_ID: 'anthropic/claude-opus-5.5',
  WORKFLOW_RESEARCH_MODEL_ID: 'google/gemini-3.8-flash',
  WORKFLOW_STRATEGY_MODEL_ID: 'anthropic/claude-opus-5.5',
  WORKFLOW_PROMPT_MODEL_ID: 'openai/gpt-6.1-sol',
  JEV_RESEARCH_BRIDGE_URL: 'https://jev.example',
  JEV_RESEARCH_BRIDGE_TOKEN: 'jev-token-123456789',
  WORKFLOW_MEDIA_EXECUTION_ENABLED: 'true',
  WORKFLOW_MEDIA_MAX_BUDGET_USD: '5',
  WORKFLOW_FAL_IMAGE_MODEL_ID: 'openai/gpt-image-2.5/flare/text-to-image'
};
insertProject(readyEnv, 'project_ready', 'project_ready', 'Việt Nam');
await call(readyEnv, { action: 'source.put', projectId: 'project_ready', kind: 'product', dataUrl: png(11) });
await call(readyEnv, { action: 'source.put', projectId: 'project_ready', kind: 'packaging', dataUrl: png(12) });
const readySnapshot = (await call(readyEnv, undefined, '?projectId=project_ready')).body;
const cryptoModule = await import('node:crypto');
const readySnapshotId = `snap_${cryptoModule.createHash('sha256').update(`project_ready|${readySnapshot.workflow.sourceRevision}|${readySnapshot.sources.sort((a, b) => a.slot - b.slot).map((source) => `${source.kind}:${source.contentHash}`).join('|')}`).digest('hex').slice(0, 32)}`;
const authoredPair = promptPair('project_ready', readySnapshotId, readySnapshot.sources, { actual: true, invocationRef: 'or-prompts' });
assert.deepEqual(validatePromptPair(authoredPair.megaPrompt, authoredPair.negativePrompt), { valid: true, errors: [] });
const selfApprovedPair = deepClone(authoredPair);
selfApprovedPair.megaPrompt.approvedClaims = deepClone(imageMegaFixture.approvedClaims);
selfApprovedPair.megaPrompt.strategy.hook.claimRefs = ['claim_mist_control'];
selfApprovedPair.megaPrompt.creative.textOverlays = deepClone(imageMegaFixture.creative.textOverlays);
assert.equal(validatePromptPair(selfApprovedPair.megaPrompt, selfApprovedPair.negativePrompt).valid, true, 'schema validity alone cannot prove human claim approval');

const catalog = { data: [
  { id: 'google/gemini-3.8-flash', architecture: { input_modalities: ['text'] }, supported_parameters: ['response_format'] },
  { id: 'anthropic/claude-opus-5.5', architecture: { input_modalities: ['text', 'image'] }, supported_parameters: ['response_format'] },
  { id: 'openai/gpt-6.1-sol', architecture: { input_modalities: ['text'] }, supported_parameters: ['response_format'] }
] };
let fetchCalls = 0;
let promptAttempts = 0;
let observedJevMarket = null;
let observedPromptAuthorInput = null;
const mockFetch = async (url, init = {}) => {
  fetchCalls += 1;
  const href = String(url);
  if (href === 'https://openrouter.ai/api/v1/models') return Response.json(catalog);
  if (href === 'https://jev.example/v1/research') {
    observedJevMarket = JSON.parse(init.body).market;
    return Response.json({
      requestId: 'jev-ready-1', status: 'complete', retrievedAt: '2026-10-21T00:10:00Z',
      evidence: [{ id: 'source-1', url: 'https://evidence.example/use-case', title: 'Observed use case', snippet: 'A dated source snippet.', sourceType: 'official', retrievedAt: '2026-10-21T00:10:00Z', publishedAt: '2026-10-20T00:00:00Z' }],
      hypotheses: [{ text: 'A use-case hypothesis', basedOn: ['source-1'] }], cache: { hit: false }
    });
  }
  if (href === 'https://openrouter.ai/api/v1/chat/completions') {
    const request = JSON.parse(init.body), system = request.messages[0].content;
    let output, runId;
    if (system.includes('evidence-bounded product analyst')) {
      runId = 'or-analyze'; output = { productName: 'Test product', category: 'Kitchen', observedFeatures: ['Visible cylinder'], targetHypotheses: ['Home cooks'], painPoints: ['Direct pouring'], useCases: ['Prepare a pan'], unknowns: ['Capacity'] };
    } else if (system.includes('Synthesize only')) {
      runId = 'or-research'; output = Object.fromEntries(['motivators', 'trends', 'painPoints', 'useCases'].map((key) => [key, [{ statement: `${key} statement`, evidenceRefs: ['source-1'] }]]));
    } else if (system.includes('Create evidence-linked')) {
      runId = 'or-strategy'; output = { motivators: [{ statement: 'Control the preparation step', strengthRationale: 'The cited use case makes the benefit concrete.', evidenceRefs: ['source-1'] }], taste: { direction: 'Editorial utility' }, hooks: [{ title: 'Stop before pouring', painPoint: 'Direct pouring is hard to control.', useCase: 'Prepare a pan before cooking.', testHypothesis: 'A visible control moment will earn more qualified stops.', strengthRationale: 'Pain and action appear in one frame.', evidenceRefs: ['source-1'] }] };
    } else {
      runId = 'or-prompts';
      promptAttempts += 1;
      observedPromptAuthorInput = JSON.parse(request.messages[1].content);
      output = promptAttempts === 1 ? selfApprovedPair : authoredPair;
    }
    return Response.json({ id: runId, model: request.model, provider: 'mock-provider', choices: [{ message: { content: JSON.stringify(output) } }], usage: { total_tokens: 10 } });
  }
  throw new Error(`Unexpected URL ${href}`);
};

const wrongActualModelFetch = async (url, init = {}) => {
  const href = String(url);
  if (href === 'https://openrouter.ai/api/v1/models') return Response.json(catalog);
  if (href === 'https://openrouter.ai/api/v1/chat/completions') {
    return Response.json({
      id: 'or-wrong-actual-model', model: 'google/gemini-3.8-flash',
      choices: [{ message: { content: JSON.stringify({ productName: 'Wrong model output', category: 'Kitchen', observedFeatures: ['Visible'], targetHypotheses: ['Test'], painPoints: ['Test'], useCases: ['Test'], unknowns: ['Test'] }) } }]
    });
  }
  throw new Error(`Unexpected URL ${href}`);
};
await assert.rejects(
  () => analyzeProduct({ project: { id: 'project_ready' }, sources: [{ dataUrl: png(30) }] }, readyEnv, { fetchImpl: wrongActualModelFetch }),
  (error) => error.code === 'model_execution_mismatch' && error.details.requestedModelId === 'anthropic/claude-opus-5.5' && error.details.actualModelId === 'google/gemini-3.8-flash',
  'non-authoring stages reject a provider response from a different actual model before accepting output'
);
const modelMismatchEnv = { ...readyEnv, AUTH_DB: new D1Database() };
insertProject(modelMismatchEnv, 'project_model_mismatch');
await call(modelMismatchEnv, { action: 'source.put', projectId: 'project_model_mismatch', kind: 'product', dataUrl: png(32) });
await assert.rejects(
  () => executeWorkflowRun(modelMismatchEnv, 'project_model_mismatch', { requestId: 'wrong-actual-model-run', fetchImpl: wrongActualModelFetch }),
  (error) => error.code === 'model_execution_mismatch'
);
const modelMismatchState = (await call(modelMismatchEnv, undefined, '?projectId=project_model_mismatch')).body;
const rejectedAnalyzeStage = modelMismatchState.stages.find((stage) => stage.stage === 'analyze');
assert.equal(rejectedAnalyzeStage.status, 'failed');
assert.equal(rejectedAnalyzeStage.output, null, 'wrong actual model output is never persisted as a completed stage');
assert.equal(modelMismatchState.drafts.length, 0);

const policyEnv = { ...readyEnv, WORKFLOW_ANALYZE_MODEL_ID: 'google/gemini-3.8-flash' };
insertProject(policyEnv, 'project_policy');
await call(policyEnv, { action: 'source.put', projectId: 'project_policy', kind: 'product', dataUrl: png(31) });
await assert.rejects(
  () => executeWorkflowRun(policyEnv, 'project_policy', { requestId: 'policy-run-1', fetchImpl: mockFetch }),
  (error) => error.code === 'workflow_model_policy_mismatch' && error.details.allowed.includes('anthropic/claude-opus-5.5'),
  'stage model roles fail closed instead of silently swapping Opus and Gemini'
);

const raceEnv = { ...readyEnv, AUTH_DB: new D1Database() };
insertProject(raceEnv, 'project_race');
await call(raceEnv, { action: 'source.put', projectId: 'project_race', kind: 'product', dataUrl: png(41) });
let sourceChangedDuringProviderCall = false;
const raceFetch = async (url, init) => {
  if (String(url) === 'https://openrouter.ai/api/v1/chat/completions' && !sourceChangedDuringProviderCall) {
    sourceChangedDuringProviderCall = true;
    await workflowInternals.putSource({ projectId: 'project_race', kind: 'packaging', dataUrl: png(42) }, raceEnv);
  }
  return mockFetch(url, init);
};
await assert.rejects(
  () => executeWorkflowRun(raceEnv, 'project_race', { requestId: 'race-run-1', fetchImpl: raceFetch }),
  (error) => error.code === 'source_snapshot_changed',
  'a source edit during a provider call prevents stale stage completion'
);
const raceState = (await call(raceEnv, undefined, '?projectId=project_race')).body;
assert.equal(raceState.workflow.status, 'draft');
assert.equal(raceState.workflow.activeRunId, null);
assert.equal(raceState.drafts.filter((draft) => draft.draftType === 'prompt_pair').length, 0);

await assert.rejects(
  () => executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-ready-1', fetchImpl: mockFetch }),
  (error) => error.code === 'human_claim_approval_required',
  'an actual model invocation still cannot self-approve marketing claims'
);
let completedRun = await executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-ready-1', fetchImpl: mockFetch });
assert.equal(completedRun.status, 'complete');
assert.equal(observedJevMarket, 'VN', 'the default Vietnamese project label is normalized before the Jev request');
assert.equal(observedPromptAuthorInput.contract.schemas.megaPrompt.properties.schemaVersion.const, 'creative-hook-lab.mega-prompt/1.0.0');
assert.equal(observedPromptAuthorInput.contract.schemas.negativePrompt.properties.schemaVersion.const, 'creative-hook-lab.negative-prompt/1.0.0');
assert.equal(observedPromptAuthorInput.contract.schemas.megaPrompt.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(observedPromptAuthorInput.contract.schemas.negativePrompt.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.match(observedPromptAuthorInput.contract.fixed.megaPrompt.promptId, /^mp_[a-z0-9_-]{8,63}$/u);
assert.equal(observedPromptAuthorInput.contract.fixed.negativePrompt.megaPromptId, observedPromptAuthorInput.contract.fixed.megaPrompt.promptId);
let readyState = (await call(readyEnv, undefined, '?projectId=project_ready')).body;
const generatedDraft = readyState.drafts.find((draft) => draft.draftType === 'prompt_pair');
assert.equal(generatedDraft.validationStatus, 'valid');
assert.equal(generatedDraft.authoringTrust, 'verified_runtime');
assert.equal(generatedDraft.sourceSnapshotId, readySnapshotId);
assert.equal(generatedDraft.payload.megaPrompt.promptId, observedPromptAuthorInput.contract.fixed.megaPrompt.promptId, 'runtime persists the exact prompt ID sent in the schema-bound author request');
assert.equal(generatedDraft.payload.negativePrompt.megaPromptId, generatedDraft.payload.megaPrompt.promptId);
const callsAfterComplete = fetchCalls;
completedRun = await executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-ready-1', fetchImpl: mockFetch });
assert.equal(completedRun.id, readyState.activeRun.id);
assert.equal(fetchCalls, callsAfterComplete, 'same requestId is idempotent and does not repeat provider calls');

readyEnv.AUTH_DB.sqlite.prepare("UPDATE workflow_runs SET status='running', lease_token=?, lease_expires_at=? WHERE id=?").run('other-worker', Math.floor(Date.now() / 1000) + 600, completedRun.id);
await assert.rejects(() => executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-ready-1', fetchImpl: mockFetch }), (error) => error.code === 'workflow_busy');
const runCountBeforeCompetingRequest = readyEnv.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM workflow_runs WHERE project_id=?').get('project_ready').count;
await assert.rejects(() => executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'competing-run-ready-2', fetchImpl: mockFetch }), (error) => error.code === 'workflow_busy');
assert.equal(readyEnv.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM workflow_runs WHERE project_id=?').get('project_ready').count, runCountBeforeCompetingRequest, 'a competing requestId cannot create a second paid run');
result = await call(readyEnv, { action: 'stage.import', projectId: 'project_ready', stage: 'research', actualModelId: 'external/research', output: { evidence: [{ url: 'https://evidence.example/manual', retrievedAt: '2026-10-21T02:00:00Z', publishedAt: '2026-10-20T00:00:00Z' }] } });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'workflow_busy', 'manual import cannot interleave with a leased model run');
readyEnv.AUTH_DB.sqlite.prepare("UPDATE workflow_runs SET status='complete', lease_token=NULL, lease_expires_at=NULL WHERE id=?").run(completedRun.id);

result = await call(readyEnv, { action: 'media.queue', projectId: 'project_ready', draftId: generatedDraft.id, provider: 'fal', mediaType: 'image', executionBudgetUsd: 2 });
assert.equal(result.response.status, 503);
assert.equal(result.body.error, 'media_quote_confirmation_required');
assert.equal(result.body.mediaJob.status, 'blocked_config');
assert.equal(fetchCalls, callsAfterComplete, 'media queue compiles only and never performs a paid provider call');

const failClosed = deepClone(authoredPair);
failClosed.negativePrompt.policy.unsupportedHandling = 'fail_closed';
assert.throws(() => prepareMediaRequest({ provider: 'fal', mediaType: 'image', promptPair: failClosed, executionBudgetUsd: 1 }, readyEnv), (error) => error instanceof WorkflowProviderError && error.code === 'negative_channel_required');

console.log('WORKFLOW PASS: atomic D1 sources, project scope, source-race aborts, exact model roles, cited provider stages, idempotent lease, no model self-approved claims, trusted prompt provenance, planning-only media gate, measured winner evidence, and clone lineage.');
