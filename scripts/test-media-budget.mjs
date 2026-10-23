import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const db = new DatabaseSync(':memory:');
// Exercise actual SQLite triggers independently of the runtime's mocked SQL layer.
for (const name of readdirSync(new URL('../cloudflare/migrations/', import.meta.url)).filter(x => x.endsWith('.sql')).sort()) {
  db.exec(readFileSync(new URL(`../cloudflare/migrations/${name}`, import.meta.url), 'utf8'));
}
// Relational provenance is covered by workflow/runtime tests; isolate monetary triggers here.
db.exec('PRAGMA foreign_keys = OFF');
db.exec("INSERT INTO media_budget_envelopes(project_id,limit_microusd,max_job_microusd,state,revision,created_at,updated_at) VALUES('p',0,0,'paused',1,1,1)");
const insert = db.prepare("INSERT INTO media_runtime_jobs(id,project_id,node_id,quote_id,draft_id,provider,media_type,model_id,request_fingerprint,idempotency_key,status,reserved_microusd,created_at,updated_at) VALUES(?,'p','image',?,'d','openrouter','image','model','fingerprint',?,'reserved',?,1,1)");
assert.throws(() => insert.run('j0','q0','i0',1), /media_budget_not_active/);
db.exec("UPDATE media_budget_envelopes SET limit_microusd=2000000,max_job_microusd=1200000,state='active' WHERE project_id='p'");
assert.throws(() => insert.run('j0','q0','i0',1300000), /media_job_budget_exceeded/);
insert.run('j1','q1','i1',1200000);
assert.throws(() => insert.run('j2','q2','i2',1200000), /media_project_budget_exceeded/);
assert.throws(() => insert.run('duplicate','q1','different-key',100000), /UNIQUE/);
assert.throws(() => insert.run('duplicate','different-quote','i1',100000), /UNIQUE/);
db.exec("UPDATE media_runtime_jobs SET status='complete',actual_microusd=500000 WHERE id='j1'");
insert.run('j2','q2','i2',1200000);
db.exec("UPDATE media_runtime_jobs SET status='held' WHERE id='j2'");
assert.equal(db.prepare("SELECT state FROM media_budget_envelopes WHERE project_id='p'").get().state, 'held');
assert.throws(() => insert.run('j3','q3','i3',1), /media_budget_not_active/);
db.exec("UPDATE media_budget_envelopes SET state='active' WHERE project_id='p'; UPDATE media_runtime_jobs SET actual_microusd=1500000 WHERE id='j2'");
assert.equal(db.prepare("SELECT state FROM media_budget_envelopes WHERE project_id='p'").get().state, 'held');
db.close();
console.log('MEDIA BUDGET PASS: real SQLite default-zero lock, atomic reserve ceiling, quote/key uniqueness, holds and cost-overrun guard.');
