import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleWorkflow, executeWorkflowRun, workflowInternals } from '../cloudflare/workflow.mjs';
import { validatePromptPair } from '../cloudflare/prompt-validation.mjs';
import { analyzeProduct, prepareMediaRequest, WorkflowProviderError } from '../integrations/workflow-providers.mjs';
import { aiCacheSnapshot, readAiStageCache, setAiCachePolicy, writeAiStageCache } from '../integrations/workflow-cache.mjs';

class D1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new D1Statement(this.database, this.sql, values); }
  async first() { return this.database.sqlite.prepare(this.sql).get(...this.values) || null; }
  async all() { return { results: this.database.sqlite.prepare(this.sql).all(...this.values) }; }
  async run() {
    if (this.database.failStageCompleteOnce && this.sql.includes('UPDATE workflow_stage_outputs SET status') && this.values[0] === 'complete') {
      this.database.failStageCompleteOnce = false;
      throw new Error('injected_stage_persistence_failure');
    }
    const result = this.database.sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

class D1Database {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.failBatchAtIndex = null;
    this.failStageCompleteOnce = false;
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    for (const file of ['0001_auth.sql', '0002_production.sql', '0003_workflow.sql', '0004_pilot_budget.sql', '0005_ai_stage_cache.sql']) {
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
function pngBytes(width = 1, height = 1, ...tail) {
  return [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
    (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    0x08, 0x02, 0x00, 0x00, 0x00, ...tail
  ];
}
const png = (...tail) => dataUrl(pngBytes(1, 1, ...tail));

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

const jpegFixture = [0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0xc8, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00];
const webpFixture = [0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc7, 0x00, 0x00, 0x63, 0x00, 0x00];
assert.deepEqual((await workflowInternals.parseSource({ dataUrl: dataUrl(jpegFixture, 'image/jpeg') })).widthPx, 200);
assert.deepEqual((await workflowInternals.parseSource({ dataUrl: dataUrl(webpFixture, 'image/webp') })).heightPx, 100);
await assert.rejects(
  () => workflowInternals.parseSource({ dataUrl: dataUrl(pngBytes(1_601, 100)) }),
  (error) => error.code === 'source_dimensions_exceeded' && error.status === 413
);

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
  WORKFLOW_AI_EXECUTION_ENABLED: 'true',
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
let analyzeAttempts = 0;
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
      analyzeAttempts += 1;
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

const analyzeAttemptsBeforePersistenceTest = analyzeAttempts;
readyEnv.AUTH_DB.failStageCompleteOnce = true;
await assert.rejects(
  () => executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-ready-1', fetchImpl: mockFetch }),
  (error) => error.code === 'workflow_stage_failed',
  'a local stage-row failure occurs only after the validated provider result is cached'
);
assert.equal(analyzeAttempts, analyzeAttemptsBeforePersistenceTest + 1);
await assert.rejects(
  () => executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-ready-1', fetchImpl: mockFetch }),
  (error) => error.code === 'human_claim_approval_required',
  'an actual model invocation still cannot self-approve marketing claims'
);
assert.equal(analyzeAttempts, analyzeAttemptsBeforePersistenceTest + 1, 'retry reuses the validated analyze cache and performs no second provider POST');
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
assert.throws(() => prepareMediaRequest({ provider: 'fal', mediaType: 'image', modelId: 'unapproved/model', promptPair: authoredPair, executionBudgetUsd: 1 }, readyEnv), (error) => error instanceof WorkflowProviderError && error.code === 'media_model_selection_mismatch');
assert.throws(() => prepareMediaRequest({ provider: 'openrouter', mediaType: 'image', modelId: 'unverified/model', promptPair: authoredPair, executionBudgetUsd: 1 }, readyEnv), (error) => error instanceof WorkflowProviderError && error.code === 'media_provider_not_implemented');

result = await call(readyEnv, { action: 'cache.policy.set', projectId: 'project_ready', ttlHours: 48, maxEntries: 8, preflightGetAttempts: 3 });
assert.equal(result.response.status, 200);
assert.deepEqual(result.body.aiCache.policy, { ttlHours: 48, effectiveResearchTtlHours: 6, maxEntries: 8, preflightGetAttempts: 3 });
result = await call(readyEnv, { action: 'cache.policy.set', projectId: 'project_ready', ttlHours: 999, maxEntries: 8, preflightGetAttempts: 3 });
assert.equal(result.response.status, 400, 'cache policy rejects values above the server safety ceiling');

const corruptAnalyzeRow = readyEnv.AUTH_DB.sqlite.prepare("SELECT id FROM workflow_ai_stage_cache WHERE project_id = ? AND stage = 'analyze'").get('project_ready');
readyEnv.AUTH_DB.sqlite.prepare('UPDATE workflow_ai_stage_cache SET output_json = ? WHERE id = ?')
  .run(JSON.stringify({ productName: 'Corrupt cached analysis', category: 'Kitchen', observedFeatures: [] }), corruptAnalyzeRow.id);
const analyzeBeforeCorruptRepair = analyzeAttempts, callsBeforeAnalyzeRepair = fetchCalls;
const analyzeRepairRun = await executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-cache-repair-analyze', fetchImpl: mockFetch });
assert.equal(analyzeRepairRun.status, 'complete');
assert.equal(analyzeAttempts, analyzeBeforeCorruptRepair + 1, 'semantically invalid analyze cache is deleted and regenerated');
assert.ok(fetchCalls > callsBeforeAnalyzeRepair, 'repairing invalid analyze cache invokes the analyze provider exactly once');
assert.equal(readyEnv.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM workflow_ai_stage_cache WHERE id = ?').get(corruptAnalyzeRow.id).count, 0);
let repairedState = (await call(readyEnv, undefined, '?projectId=project_ready')).body;
assert.equal(repairedState.stages.find((stage) => stage.runId === analyzeRepairRun.id && stage.stage === 'analyze').output.productName, 'Test product');

const corruptResearchRow = readyEnv.AUTH_DB.sqlite.prepare("SELECT id FROM workflow_ai_stage_cache WHERE project_id = ? AND stage = 'research'").get('project_ready');
const corruptResearch = {
  retrievedAt: '2026-10-21T00:10:00Z',
  evidence: [{ id: 'source-1', url: 'https://evidence.example/use-case', title: 'Observed use case', snippet: 'A dated source snippet.', sourceType: 'official', retrievedAt: '2026-10-21T00:10:00Z' }],
  hypotheses: [{ text: 'Corrupt hypothesis', status: 'unverified', basedOn: ['unknown-source'] }],
  synthesis: Object.fromEntries(['motivators', 'trends', 'painPoints', 'useCases'].map((key) => [key, [{ statement: 'Corrupt cached statement', evidenceRefs: ['unknown-source'] }]])),
  jev: { requestId: 'jev-corrupt' }
};
readyEnv.AUTH_DB.sqlite.prepare('UPDATE workflow_ai_stage_cache SET output_json = ? WHERE id = ?').run(JSON.stringify(corruptResearch), corruptResearchRow.id);
const callsBeforeResearchRepair = fetchCalls;
const researchRepairRun = await executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-cache-repair-research', fetchImpl: mockFetch });
assert.equal(researchRepairRun.status, 'complete');
assert.ok(fetchCalls > callsBeforeResearchRepair, 'semantically invalid research cache is deleted and regenerated');
assert.equal(readyEnv.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM workflow_ai_stage_cache WHERE id = ?').get(corruptResearchRow.id).count, 0);
repairedState = (await call(readyEnv, undefined, '?projectId=project_ready')).body;
const repairedResearch = repairedState.stages.find((stage) => stage.runId === researchRepairRun.id && stage.stage === 'research').output;
assert.deepEqual(repairedResearch.synthesis.motivators[0].evidenceRefs, ['source-1']);
assert.equal(JSON.stringify(repairedResearch).includes('unknown-source'), false, 'corrupt cached citations never become downstream stage input');

const callsBeforeCacheRun = fetchCalls;
const cachedRun = await executeWorkflowRun(readyEnv, 'project_ready', { requestId: 'owner-run-cache-reuse-2', fetchImpl: mockFetch });
assert.equal(cachedRun.status, 'complete');
assert.equal(fetchCalls, callsBeforeCacheRun, 'a fully valid stage-cache run performs zero metadata GETs and zero paid POSTs');
readyState = (await call(readyEnv, undefined, '?projectId=project_ready')).body;
const cachedStages = readyState.stages.filter((stage) => stage.runId === cachedRun.id);
assert.equal(cachedStages.length, 4);
assert.equal(cachedStages.every((stage) => stage.origin === 'cache' && stage.provenance.cacheHit === true && !('cacheFingerprint' in stage.provenance)), true);
assert.equal(readyState.aiCache.stats.validEntries, 4);
assert.equal(readyState.aiCache.lastHits.length, 4);
const researchCache = readyEnv.AUTH_DB.sqlite.prepare("SELECT expires_at - created_at AS ttl FROM workflow_ai_stage_cache WHERE project_id = ? AND stage = 'research'").get('project_ready');
assert.ok(researchCache.ttl <= 21_600, 'research cache freshness is hard-capped at six hours');

const cacheContext = { project: readyState.project, sources: readyState.sources };
const cacheSourceSnapshot = { id: readySnapshotId, revision: readyState.workflow.sourceRevision, sources: readyState.sources };
const baseFingerprint = await workflowInternals.stageCacheFingerprint('analyze', cacheContext, readyEnv, cacheSourceSnapshot);
assert.notEqual(await workflowInternals.stageCacheFingerprint('analyze', cacheContext, { ...readyEnv, OPENROUTER_API_KEY: 'different-key-namespace-123456' }, cacheSourceSnapshot), baseFingerprint, 'active key namespace invalidates stage cache');
assert.notEqual(await workflowInternals.stageCacheFingerprint('analyze', cacheContext, { ...readyEnv, WORKFLOW_ANALYZE_MODEL_ID: 'different/model' }, cacheSourceSnapshot), baseFingerprint, 'model binding invalidates stage cache');
assert.notEqual(await workflowInternals.stageCacheFingerprint('analyze', cacheContext, { ...readyEnv, WORKFLOW_PILOT_BILLING_MODE: 'openrouter_credits' }, cacheSourceSnapshot), baseFingerprint, 'pilot billing mode invalidates stage cache');
assert.notEqual(await workflowInternals.stageCacheFingerprint('analyze', cacheContext, readyEnv, { ...cacheSourceSnapshot, revision: cacheSourceSnapshot.revision + 1 }), baseFingerprint, 'source revision invalidates stage cache');
assert.notEqual(await workflowInternals.stageCacheFingerprint('analyze', cacheContext, readyEnv, { ...cacheSourceSnapshot, sources: cacheSourceSnapshot.sources.map((source, index) => index ? source : { ...source, contentHash: 'sha256:different' }) }), baseFingerprint, 'source content hash invalidates stage cache');
assert.notEqual(await workflowInternals.stageCacheFingerprint('analyze', { ...cacheContext, project: { ...cacheContext.project, id: 'different_project' } }, readyEnv, cacheSourceSnapshot), baseFingerprint, 'project identity invalidates stage cache');

insertProject(readyEnv, 'project_cache_other');
await writeAiStageCache(readyEnv, 'project_cache_other', 'analyze', 'scope-test', { productName: 'Other project' }, { actualModelId: 'anthropic/claude-opus-5.5', providerRunId: 'other-run', verificationStatus: 'actual_invocation_verified' });
assert.equal(await readAiStageCache(readyEnv, 'project_ready', 'analyze', 'scope-test'), null, 'cache reads cannot cross project scope');
assert.ok(await readAiStageCache(readyEnv, 'project_cache_other', 'analyze', 'scope-test'));
await writeAiStageCache(readyEnv, 'project_ready', 'analyze', 'expired-test', { productName: 'Expired' }, { actualModelId: 'anthropic/claude-opus-5.5', providerRunId: 'expired-run', verificationStatus: 'actual_invocation_verified' });
readyEnv.AUTH_DB.sqlite.prepare("UPDATE workflow_ai_stage_cache SET expires_at = 0 WHERE project_id = ? AND fingerprint = 'expired-test'").run('project_ready');
assert.equal(await readAiStageCache(readyEnv, 'project_ready', 'analyze', 'expired-test'), null, 'expired cache rows are pruned before read');

await setAiCachePolicy(readyEnv, 'project_ready', { ttlHours: 48, maxEntries: 4, preflightGetAttempts: 2 });
for (let index = 0; index < 2; index += 1) {
  await writeAiStageCache(readyEnv, 'project_ready', 'analyze', `extra-${index}`, { productName: `Extra ${index}` }, { actualModelId: 'anthropic/claude-opus-5.5', providerRunId: `extra-run-${index}`, verificationStatus: 'actual_invocation_verified' });
}
assert.equal((await aiCacheSnapshot(readyEnv, 'project_ready')).stats.entries, 4, 'cache cleanup enforces the configured per-project row limit');

console.log('WORKFLOW PASS: atomic D1 sources, project scope, source-race aborts, exact model roles, cited provider stages, idempotent lease, bounded validated-stage cache reuse, no model self-approved claims, trusted prompt provenance, planning-only media gate, measured winner evidence, and clone lineage.');
