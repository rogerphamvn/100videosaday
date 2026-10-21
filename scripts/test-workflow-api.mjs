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
for (const migration of ['0001_auth.sql', '0002_production.sql', '0003_workflow.sql']) {
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
sourceBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
sourceBytes.fill(0x5a, 8);
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

const upload = await call('/api/workflow', {
  action: 'source.put', projectId: project.id, kind: 'product', filename: 'product-source.png', dataUrl: sourceDataUrl
}, { cookie });
assert.equal(upload.status, 201, 'authenticated workflow upload larger than the legacy 16 KiB API cap succeeds');
const { source } = await upload.json();
assert.equal(source.byteSize, sourceBytes.byteLength);
assert.equal(source.kind, 'product');
assert.match(source.contentHash, /^sha256:[a-f0-9]{64}$/u);

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

console.log('WORKFLOW API PASS: worker auth 401, same-origin CSRF 403, streamed 1.5 MiB cap 413, >16 KiB source upload, and persisted snapshot reload.');
db.close();
