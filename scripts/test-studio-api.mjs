import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../cloudflare/worker.mjs';
class Statement {
  constructor(db, sql, values = []) { Object.assign(this, { db, sql, values }); }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  async first() { return this.db.prepare(this.sql).get(...this.values) || null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}
const db = new DatabaseSync(':memory:');
for (const migration of ['0001_auth.sql', '0002_production.sql']) {
  db.exec(readFileSync(new URL(`../cloudflare/migrations/${migration}`, import.meta.url), 'utf8'));
}
const store = {
  prepare: sql => new Statement(db, sql),
  async batch(statements) {
    db.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      db.exec('COMMIT'); return results;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
};
const env = { AUTH_DB: store, INTERNAL_PASSWORD: 'test-only-studio-password', ASSETS: {
  fetch: async request => new Response(new URL(request.url).pathname)
}};
let cookie = '';
const call = (path, body, origin = 'https://studio.example') => worker.fetch(new Request(`https://studio.example${path}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
}), env);
assert.equal((await call('/api/production/dashboard')).status, 401);
assert.equal((await call('/api/integrations/status')).status, 401);
const login = await call('/api/auth/login', { username: 'team', password: env.INTERNAL_PASSWORD });
assert.equal(login.status, 200);
cookie = login.headers.get('set-cookie').split(';')[0];
assert.equal((await call('/studio')).status, 200);
assert.equal((await call('/api/production/projects', {}, 'https://other.example')).status, 403);
assert.equal((await call('/api/production/projects', { name: 'x'.repeat(20000) })).status, 413);
const created = await call('/api/production/projects', { name: 'Test project', product: 'Test product', market: 'VN' });
assert.equal(created.status, 201);
const { project } = await created.json();
const status = await (await call('/api/integrations/status')).json();
assert.equal(status.research.configured, false);
assert.equal(status.voice.configured, false);
assert.equal((await call('/api/research', { projectId: 'does-not-exist', query: 'pain points' })).status, 404);
assert.equal((await call('/api/research', { projectId: project.id, query: 'test product pain points', market: 'VN' })).status, 503);
assert.equal((await call('/api/voice', { projectId: project.id, text: 'Đây là nội dung kiểm thử.', voiceId: 'test-preset' })).status, 503);
const plan = await call('/api/production/plan', { projectId: project.id, requestId: 'test-integrated-100' });
assert.equal(plan.status, 201);
const { batch } = await plan.json();
const detail = await (await call(`/api/production/batches/${batch.id}`)).json();
assert.equal(detail.assets.length, 100);
assert.equal(detail.batch.readyCount, 0);
assert.equal(detail.batch.execution.paidExecutionStarted, false);
const dashboard = await (await call('/api/production/dashboard')).json();
assert.equal(dashboard.projects.length, 1);
assert.equal(dashboard.batches.length, 1);
assert.equal(dashboard.totals.readyCount, 0);
// A real bridge result with a Vietnamese preset must survive HTTP header encoding.
const originalFetch = globalThis.fetch;
env.VIENEU_BRIDGE_URL = 'https://voice.example.com';
env.VIENEU_BRIDGE_TOKEN = 'test-bridge-token-0000';
env.VIENEU_MODEL_REVISION = 'a'.repeat(40);
const wav = new Uint8Array(48);
const view = new DataView(wav.buffer);
wav.set(new TextEncoder().encode('RIFF'));
wav.set(new TextEncoder().encode('WAVEfmt '), 8);
wav.set(new TextEncoder().encode('data'), 36);
view.setUint32(4, 40, true); view.setUint32(16, 16, true);
view.setUint16(20, 1, true); view.setUint16(22, 1, true);
view.setUint32(24, 48000, true); view.setUint32(28, 96000, true);
view.setUint16(32, 2, true); view.setUint16(34, 16, true);
view.setUint32(40, 4, true);
try {
  globalThis.fetch = async () => new Response(wav, { headers: { 'Content-Type': 'audio/wav' } });
  const audio = await call('/api/voice', { projectId: project.id, text: 'Kiểm thử giọng Việt.' });
  assert.equal(audio.status, 200);
  assert.equal(decodeURIComponent(audio.headers.get('X-Voice-Id')), 'Hải Đăng');
  assert.deepEqual(new Uint8Array(await audio.arrayBuffer()), wav);
} finally { globalThis.fetch = originalFetch; }
console.log('STUDIO API PASS: session/CSRF/body limits, persistent project +100-plan, exact routing, missing bridges fail closed, zero fabricated videos.');
db.close();
