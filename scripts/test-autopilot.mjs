import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { commitAutopilotBudget, reserveAutopilotBudget } from '../integrations/autopilot-budget.mjs';
import { advanceAutopilot, autopilotInternals, handleAutopilot } from '../cloudflare/autopilot.mjs';

const sqlite = new DatabaseSync(':memory:');
for (const name of readdirSync(new URL('../cloudflare/migrations/', import.meta.url)).filter(x => x.endsWith('.sql')).sort()) {
  sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/${name}`, import.meta.url), 'utf8'));
}
sqlite.exec('PRAGMA foreign_keys = OFF');
class Statement {
  constructor(sql) { this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  run() { const result = sqlite.prepare(this.sql).run(...this.args); return { meta: { changes: Number(result.changes) } }; }
  first() { return sqlite.prepare(this.sql).get(...this.args) || null; }
  all() { return { results: sqlite.prepare(this.sql).all(...this.args) }; }
}
const env = { AUTH_DB: { prepare: sql => new Statement(sql) } };
const t = 1_800_000_000;
const insertPlan = (id, project, budget = 2_000_000, media = 1_100_000) => {
  sqlite.prepare("INSERT OR IGNORE INTO media_budget_envelopes(project_id,limit_microusd,max_job_microusd,state,revision,created_at,updated_at) VALUES(?,?,?,'active',2,?,?)").run(project, budget, media, t, t);
  return sqlite.prepare("INSERT INTO autopilot_plans(id,project_id,fingerprint,confirmation_id,status,goal,output_json,budget_microusd,max_media_microusd,preset,readiness_json,frozen_json,expires_at,created_at) VALUES(?,?,?,?, 'ready','goal','{}',?,?, 'balanced','{}',?, ?,?)").run(id, project, `fp-${id}`, `confirm-${id}`, budget, media, JSON.stringify({ mediaBudgetAuthorization: { before: { revision: 1 } } }), t + 900, t);
};
const insertRun = (id, plan, project, key) => sqlite.prepare("INSERT INTO autopilot_runs(id,plan_id,project_id,idempotency_key,request_fingerprint,status,phase,confirmed_at,deadline_at,created_at,updated_at) VALUES(?,?,?,?,?,'queued','workflow',?,?,?,?)").run(id, plan, project, key, `fp-${plan}`, t, t + 1000, t, t);

assert.throws(() => insertPlan('bad', 'p0', 1_000_000, 1_000_001), /autopilot_budget_invalid/);
insertPlan('p1', 'project-1');
insertRun('r1', 'p1', 'project-1', 'key-1');
await reserveAutopilotBudget({ runId: 'r1', stepKey: 'workflow:analyze', amountUsd: 0.9 }, env);
await reserveAutopilotBudget({ runId: 'r1', stepKey: 'media:submit', amountUsd: 1.1 }, env);
await assert.rejects(() => reserveAutopilotBudget({ runId: 'r1', stepKey: 'workflow:research', amountUsd: 0.001 }, env), e => e.code === 'autopilot_budget_exceeded');

const analyze = sqlite.prepare("SELECT id FROM autopilot_budget_reservations WHERE run_id='r1' AND step_key='workflow:analyze'").get();
await assert.rejects(() => commitAutopilotBudget(analyze.id, { actualUsd: 1.2, providerRunId: 'provider-overrun' }, env), e => e.code === 'autopilot_budget_actual_overrun');
assert.equal(sqlite.prepare("SELECT status FROM autopilot_budget_reservations WHERE id=?").get(analyze.id).status, 'held');
assert.equal(sqlite.prepare("SELECT status FROM autopilot_runs WHERE id='r1'").get().status, 'held');
insertPlan('p2', 'project-1');
assert.throws(() => insertRun('r2', 'p2', 'project-1', 'key-2'), /UNIQUE|constraint/i, 'only one unresolved run per project is allowed');

insertPlan('p3', 'project-2', 2_000_000, 1_000_000);
insertRun('r3', 'p3', 'project-2', 'key-3');
const version = sqlite.prepare("SELECT version FROM autopilot_runs WHERE id='r3'").get().version;
assert.equal(Number(sqlite.prepare("UPDATE autopilot_runs SET lease_token='one',version=version+1 WHERE id='r3' AND version=?").run(version).changes), 1);
assert.equal(Number(sqlite.prepare("UPDATE autopilot_runs SET lease_token='two',version=version+1 WHERE id='r3' AND version=?").run(version).changes), 0, 'stale lease claimant must lose');
sqlite.prepare("UPDATE autopilot_runs SET cancel_requested=1 WHERE id='r3'").run();
await assert.rejects(() => reserveAutopilotBudget({ runId: 'r3', stepKey: 'workflow:analyze', amountUsd: 0.1 }, env), e => e.code === 'autopilot_run_not_spendable');

insertPlan('p4', 'project-4', 2_000_000, 1_000_000);
sqlite.prepare("UPDATE media_budget_envelopes SET revision=3 WHERE project_id='project-4'").run();
assert.throws(() => {
  sqlite.exec('BEGIN');
  try {
    sqlite.prepare("UPDATE media_budget_envelopes SET revision=revision+1 WHERE project_id='project-4' AND revision=1").run();
    insertRun('r4', 'p4', 'project-4', 'key-4');
    sqlite.exec('COMMIT');
  } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
}, /autopilot_media_budget_stale/);
assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM autopilot_runs WHERE id='r4'").get().count, 0, 'stale media-budget CAS must create no run');
assert.equal(sqlite.prepare("SELECT status FROM autopilot_plans WHERE id='p4'").get().status, 'ready', 'stale media-budget CAS must not consume plan');

sqlite.close();

const db2 = new DatabaseSync(':memory:');
for (const name of readdirSync(new URL('../cloudflare/migrations/', import.meta.url)).filter(x => x.endsWith('.sql')).sort()) db2.exec(readFileSync(new URL(`../cloudflare/migrations/${name}`, import.meta.url), 'utf8'));
class D1Statement {
  constructor(sql) { this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  run() { const result = db2.prepare(this.sql).run(...this.args); return { meta: { changes: Number(result.changes) } }; }
  first() { return db2.prepare(this.sql).get(...this.args) || null; }
  all() { return { results: db2.prepare(this.sql).all(...this.args) }; }
}
const d1 = {
  prepare: sql => new D1Statement(sql),
  batch(statements) {
    db2.exec('BEGIN');
    try { const out = statements.map(statement => statement.run()); db2.exec('COMMIT'); return out; }
    catch (error) { db2.exec('ROLLBACK'); throw error; }
  }
};
const functionalEnv = {
  AUTH_DB: d1,
  WORKFLOW_AUTOPILOT_ENABLED: 'true', WORKFLOW_PILOT_EXECUTION_ENABLED: 'true', WORKFLOW_MEDIA_EXECUTION_ENABLED: 'true',
  OPENROUTER_API_KEY: 'openrouter-test-key-000000000', FAL_KEY: 'fal-test-key-000000000000000',
  WORKFLOW_MODEL_REVISION: '1', WORKFLOW_ANALYZE_MODEL_ID: 'anthropic/claude-opus-5.5', WORKFLOW_RESEARCH_MODEL_ID: 'google/gemini-3.8-flash',
  WORKFLOW_STRATEGY_MODEL_ID: 'anthropic/claude-opus-5.5', WORKFLOW_PROMPT_MODEL_ID: 'anthropic/claude-opus-5.5'
};
const now = Math.floor(Date.now() / 1000);
db2.prepare("INSERT INTO production_projects(id,name,product,market,created_at,updated_at) VALUES('project-api','API','Product','VN',?,?)").run(now, now);
db2.prepare("INSERT INTO workflow_projects(project_id,status,source_revision,created_at,updated_at) VALUES('project-api','draft',1,?,?)").run(now, now);
db2.prepare("INSERT INTO workflow_sources(id,project_id,kind,filename,mime_type,byte_size,source_slot,content_hash,data_url,created_at) VALUES('source-api','project-api','product','p.png','image/png',1,1,'hash-api','data:image/png;base64,AA==',?)").run(now);
db2.prepare("INSERT INTO media_node_settings(project_id,node_id,provider,media_type,model_id,parameters_json,revision,created_at,updated_at) VALUES('project-api','image','fal','image','openai/gpt-image-2.5/flare/text-to-image','{}',1,?,?)").run(now, now);
db2.prepare("INSERT INTO media_budget_envelopes(project_id,limit_microusd,max_job_microusd,state,revision,created_at,updated_at) VALUES('project-api',0,0,'paused',1,?,?)").run(now, now);
db2.prepare("INSERT INTO autopilot_scheduler_state(id,last_tick_at,last_result) VALUES(1,?,'idle')").run(now);

let fetches = 0;
functionalEnv.MEDIA_FETCH = async () => { fetches += 1; throw new Error('provider fetch forbidden in tests'); };
assert.deepEqual(await advanceAutopilot(functionalEnv), { idle: true });
assert.equal(fetches, 0, 'idle scheduler tick must not call a provider');

const planRequest = values => new Request('https://test/api/autopilot/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: 'project-api', goal: 'Create one direct-response product image', output: { mediaType: 'image', nodeId: 'image' }, budgetUsd: 2, maxPerJobUsd: 1.1, creativePriority: 'quality', ...values }) });
const beforeReservations = db2.prepare('SELECT COUNT(*) count FROM autopilot_budget_reservations').get().count;
const planOneResponse = await handleAutopilot(planRequest({}), functionalEnv); assert.equal(planOneResponse.status, 201);
const planOne = (await planOneResponse.json()).plan;
assert.equal(planOne.creativePriority, 'quality');
assert.equal(JSON.stringify(planOne).includes('credentialNamespaces'), false, 'credential hashes must not leave the server');
assert.equal(db2.prepare('SELECT COUNT(*) count FROM autopilot_budget_reservations').get().count, beforeReservations, 'planning must not reserve or spend');
const planTwo = (await (await handleAutopilot(planRequest({ goal: 'Second confirmed option' }), functionalEnv)).json()).plan;

const wrongStart = await handleAutopilot(new Request('https://test/api/autopilot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: planOne.id, confirmationId: 'confirm_wrong', idempotencyKey: 'intent-api' }) }), functionalEnv);
assert.equal(wrongStart.status, 409); assert.equal(db2.prepare('SELECT COUNT(*) count FROM autopilot_runs').get().count, 0);
const startBody = { planId: planOne.id, confirmationId: planOne.confirmationId, idempotencyKey: 'intent-api' };
const startedResponse = await handleAutopilot(new Request('https://test/api/autopilot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(startBody) }), functionalEnv);
assert.equal(startedResponse.status, 202);
const started = (await startedResponse.json()).run;
assert.equal(started.budget.reservedUsd, 1.1, 'media allocation is earmarked before text stages');
assert.equal(db2.prepare("SELECT state FROM media_budget_envelopes WHERE project_id='project-api'").get().state, 'active');
const replay = await handleAutopilot(new Request('https://test/api/autopilot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(startBody) }), functionalEnv);
assert.equal(replay.status, 200); assert.equal((await replay.json()).run.id, started.id);
const conflict = await handleAutopilot(new Request('https://test/api/autopilot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: planTwo.id, confirmationId: planTwo.confirmationId, idempotencyKey: 'intent-api' }) }), functionalEnv);
assert.equal(conflict.status, 409); assert.equal((await conflict.json()).error, 'autopilot_idempotency_conflict');
const waitingTick = await advanceAutopilot({ ...functionalEnv, FAL_KEY: undefined });
assert.equal(waitingTick.runId, started.id);
assert.equal(db2.prepare("SELECT status FROM autopilot_runs WHERE id=?").get(started.id).status, 'waiting', 'missing provider key must persist a resumable waiting state');
assert.equal(fetches, 0, 'waiting preflight must not call any paid provider');
const claimed = await Promise.all([autopilotInternals.claim(functionalEnv), autopilotInternals.claim(functionalEnv)]);
assert.equal(claimed.filter(Boolean).length, 1, 'overlapping scheduler claims must have one winner');
const claimedRun = claimed.find(Boolean);
db2.prepare("INSERT INTO workflow_drafts(id,project_id,draft_type,title,payload_json,validation_status,authoring_trust,source_snapshot_id,created_at,updated_at) VALUES('cached-draft','project-api','prompt_pair','Cached','{}','valid','verified_runtime','snapshot',?,?)").run(now, now);
db2.prepare("INSERT INTO media_quotes(id,project_id,node_id,draft_id,selection_revision,provider,media_type,model_id,input_hash,request_json,reserved_microusd,estimate_source,status,expires_at,created_at) VALUES('cached-quote','project-api','image','cached-draft',1,'fal','image','openai/gpt-image-2.5/flare/text-to-image','cached-fingerprint','{}',100000,'project_job_ceiling','consumed',?,?)").run(now + 600, now);
db2.prepare("INSERT INTO media_runtime_jobs(id,project_id,node_id,quote_id,draft_id,provider,media_type,model_id,request_fingerprint,idempotency_key,status,reserved_microusd,actual_microusd,result_json,created_at,updated_at) VALUES('cached-job','project-api','image','cached-quote','cached-draft','fal','image','openai/gpt-image-2.5/flare/text-to-image','cached-fingerprint','cached-key','complete',100000,100000,'{\"urls\":[\"https://example.com/cached.png\"]}',?,?)").run(now, now);
await autopilotInternals.acceptCachedMedia(functionalEnv, claimedRun, { id: 'cached-job' });
assert.equal(db2.prepare("SELECT status FROM autopilot_budget_reservations WHERE run_id=? AND step_key='media:submit'").get(started.id).status, 'released', 'cache hit must release this run media earmark');
db2.prepare("UPDATE autopilot_runs SET lease_token=NULL,lease_expires_at=NULL WHERE id=?").run(started.id);
const resumedTick = await advanceAutopilot(functionalEnv);
assert.equal(resumedTick.runId, started.id, 'next scheduled tick must resume the same durable run');
const completedCached = await d1.prepare('SELECT * FROM autopilot_runs WHERE id=?').bind(started.id).first();
assert.equal(completedCached.status, 'complete');
assert.equal((await autopilotInternals.runDto(functionalEnv, completedCached)).budget.spentUsd, 0, 'cached prior output must not charge this run ledger');
assert.equal(fetches, 0, 'durable cache-hit resume must not call a provider');

db2.close();
console.log('AUTOPILOT PASS: aggregate/overrun/CAS/lease guards; no-spend plan; explicit idempotent start; media earmark; waiting state; scheduled cache-hit resume; zero provider fetch.');
