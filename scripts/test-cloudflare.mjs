import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { authInternals } from '../cloudflare/worker.mjs';

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

  async run() {
    const result = this.database.sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

class D1Database {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec(readFileSync(new URL('../cloudflare/migrations/0001_auth.sql', import.meta.url), 'utf8'));
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

const assetCalls = [];
function createEnv(password = 'Bootstrap-password-123') {
  return {
    INTERNAL_PASSWORD: password,
    AUTH_DB: new D1Database(),
    ASSETS: {
      fetch: async request => {
        assetCalls.push(new URL(request.url).pathname);
        return new Response(`asset:${new URL(request.url).pathname}`, {
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  };
}

const ORIGIN = 'https://example.com';
function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    headers.set('Origin', options.origin ?? ORIGIN);
  }
  if (options.cookie) headers.set('Cookie', options.cookie);
  if (options.ip) headers.set('CF-Connecting-IP', options.ip);
  return new Request(`${ORIGIN}${path}`, {
    method: options.method || (options.json !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.json === undefined ? options.body : JSON.stringify(options.json)
  });
}

async function call(path, options = {}, env) {
  return worker.fetch(request(path, options), env);
}

function cookieFrom(response) {
  return response.headers.get('Set-Cookie')?.split(';', 1)[0] || '';
}

for (const path of ['/login', '/login.html', '/auth.css', '/auth.js', '/shared-shell.css', '/shared-shell.js']) {
  const response = await call(path, {}, createEnv());
  assert.equal(response.status, 200, `public ${path}`);
  assert.match(response.headers.get('Cache-Control'), /no-store/u);
}

const env = createEnv();
assert.equal((await call('/api/auth/login', {
  json: { username: 'team', password: env.INTERNAL_PASSWORD }
}, { ...env, AUTH_DB: undefined })).status, 503, 'missing D1 fails closed');
assert.equal((await call('/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
}, env)).status, 403, 'missing Origin rejected');
assert.equal((await call('/api/auth/login', {
  method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' }, body: '{}'
}, env)).status, 415, 'non-JSON rejected');
assert.equal((await call('/api/auth/login', {
  method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json-wrong' }, body: '{}'
}, env)).status, 415, 'JSON-like MIME type rejected');
assert.equal((await call('/api/auth/login', {
  method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: 'x'.repeat(17_000)
}, env)).status, 413, 'oversized JSON rejected');
let oversizedStreamCancelled = false;
const oversizedStream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('x'.repeat(9_000)));
    controller.enqueue(new TextEncoder().encode('x'.repeat(9_000)));
  },
  cancel() {
    oversizedStreamCancelled = true;
  }
});
const streamedOversize = await worker.fetch(new Request(`${ORIGIN}/api/auth/login`, {
  method: 'POST',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
  body: oversizedStream,
  duplex: 'half'
}), env);
assert.equal(streamedOversize.status, 413, 'chunked oversized JSON rejected while streaming');
assert.equal(oversizedStreamCancelled, true, 'oversized request stream is cancelled early');

const protectedNavigation = await call('/', { headers: { Accept: 'text/html' } }, env);
assert.equal(protectedNavigation.status, 302);
assert.match(protectedNavigation.headers.get('Location'), /^\/login/u);
assert.equal((await call('/styles.css', {}, env)).status, 401);
assert.equal((await call('/canvas-agent.css', {}, env)).status, 401);
assert.equal((await call('/canvas-agent.js', {}, env)).status, 401);
assert.equal((await call('/api/auth/session', {}, env)).status, 401);

const concurrentFailures = await Promise.all(Array.from({ length: 12 }, () =>
  call('/api/auth/login', {
    json: { username: 'team', password: 'wrong-password-value' }, ip: '203.0.113.10'
  }, env)
));
assert.equal(concurrentFailures.filter(response => response.status === 401).length, authInternals.LOGIN_MAX_FAILURES);
assert.equal(concurrentFailures.filter(response => response.status === 429).length, 4);
const blocked = await call('/api/auth/login', {
  json: { username: 'team', password: env.INTERNAL_PASSWORD }, ip: '203.0.113.10'
}, env);
assert.equal(blocked.status, 429);
assert.ok(blocked.headers.get('Retry-After'));

const login = await call('/api/auth/login', {
  json: { username: 'team', password: env.INTERNAL_PASSWORD }, ip: '203.0.113.11'
}, env);
assert.equal(login.status, 200);
const cookie = cookieFrom(login);
assert.match(cookie, /^__Host-creative_session=/u);
const setCookie = login.headers.get('Set-Cookie');
for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=28800']) {
  assert.ok(setCookie.includes(attribute), `cookie has ${attribute}`);
}
const rawToken = cookie.split('=')[1];
const storedSession = env.AUTH_DB.sqlite.prepare('SELECT token_hash FROM auth_sessions').get();
assert.notEqual(storedSession.token_hash, rawToken, 'raw session token is not persisted');
const credential = env.AUTH_DB.sqlite.prepare('SELECT * FROM auth_credentials WHERE id = 1').get();
assert.notEqual(credential.password_hash, env.INTERNAL_PASSWORD, 'bootstrap password is hashed');
assert.equal(credential.iterations, 100_000);

const expiryEnv = createEnv();
const expiryLogin = await call('/api/auth/login', {
  json: { username: 'team', password: expiryEnv.INTERNAL_PASSWORD }, ip: '203.0.113.20'
}, expiryEnv);
const expiryCookie = cookieFrom(expiryLogin);
const expiryTokenHash = await authInternals.sha256(expiryCookie.split('=')[1]);
expiryEnv.AUTH_DB.sqlite.prepare(
  'UPDATE auth_sessions SET expires_at = ? WHERE token_hash = ?'
).run(Math.floor(Date.now() / 1000) - 1, expiryTokenHash);
assert.equal((await call('/api/auth/session', { cookie: expiryCookie }, expiryEnv)).status, 401, 'expired session is rejected');

const session = await call('/api/auth/session', { cookie }, env);
assert.deepEqual(await session.json(), { authenticated: true, username: 'team' });
assert.equal((await call('/login', { cookie }, env)).headers.get('Location'), '/');
for (const [path, expectedAsset] of [
  ['/', '/index.html'], ['/account', '/account.html'], ['/review', '/review.html'],
  ['/mockups/01-insight.png', '/mockups/01-insight.png']
]) {
  const response = await call(path, { cookie }, env);
  assert.equal(response.status, 200, `protected ${path}`);
  assert.equal(await response.text(), `asset:${expectedAsset}`);
}
assert.equal((await call('/mockups/unlisted.png', { cookie }, env)).status, 404);
assert.equal((await call('/.env', { cookie }, env)).status, 404);

assert.equal((await call('/api/auth/password', {
  method: 'POST', cookie, headers: { 'Content-Type': 'application/json' }, body: '{}'
}, env)).status, 403, 'password change requires same-origin Origin');
assert.equal((await call('/api/auth/logout', {
  method: 'POST', cookie, headers: { 'Content-Type': 'application/json' }, body: '{}'
}, env)).status, 403, 'logout requires same-origin Origin');
assert.equal((await call('/api/auth/password', {
  cookie, json: {
    currentPassword: env.INTERNAL_PASSWORD,
    newPassword: 'too-short',
    confirmPassword: 'too-short'
  }
}, env)).status, 400, 'new password enforces minimum length');
assert.equal((await call('/api/auth/password', {
  cookie, json: {
    currentPassword: env.INTERNAL_PASSWORD,
    newPassword: 'New-password-456!',
    confirmPassword: 'different-password'
  }
}, env)).status, 400, 'new password confirmation must match');

const wrongCurrent = await call('/api/auth/password', {
  cookie, ip: '203.0.113.12', json: {
    currentPassword: 'Wrong-current-password',
    newPassword: 'New-password-456!',
    confirmPassword: 'New-password-456!'
  }
}, env);
assert.equal(wrongCurrent.status, 401);

const secondLogin = await call('/api/auth/login', {
  json: { username: 'team', password: env.INTERNAL_PASSWORD }, ip: '203.0.113.13'
}, env);
const secondCookie = cookieFrom(secondLogin);
const changed = await call('/api/auth/password', {
  cookie, ip: '203.0.113.12', json: {
    currentPassword: env.INTERNAL_PASSWORD,
    newPassword: 'New-password-456!',
    confirmPassword: 'New-password-456!'
  }
}, env);
assert.equal(changed.status, 200);
assert.equal((await changed.json()).reauthenticationRequired, true);
assert.match(changed.headers.get('Set-Cookie'), /Max-Age=0/u);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT credential_version FROM auth_credentials').get().credential_version, 2);
assert.equal(env.AUTH_DB.sqlite.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get().count, 0);
assert.equal((await call('/api/auth/session', { cookie }, env)).status, 401, 'changing password invalidates current session');
assert.equal((await call('/api/auth/session', { cookie: secondCookie }, env)).status, 401, 'changing password invalidates other sessions');

const oldPassword = await call('/api/auth/login', {
  json: { username: 'team', password: env.INTERNAL_PASSWORD }, ip: '203.0.113.14'
}, env);
assert.equal(oldPassword.status, 401, 'bootstrap secret never becomes fallback after rotation');
const newPassword = await call('/api/auth/login', {
  json: { username: 'team', password: 'New-password-456!' }, ip: '203.0.113.15'
}, env);
assert.equal(newPassword.status, 200);
const newCookie = cookieFrom(newPassword);

for (let index = 0; index < authInternals.LOGIN_MAX_FAILURES; index += 1) {
  const wrongPasswordChange = await call('/api/auth/password', {
    cookie: newCookie, ip: '203.0.113.16', json: {
      currentPassword: 'Still-wrong-current!',
      newPassword: 'Another-password-789!',
      confirmPassword: 'Another-password-789!'
    }
  }, env);
  assert.equal(wrongPasswordChange.status, 401);
}
const blockedPasswordChange = await call('/api/auth/password', {
  cookie: newCookie, ip: '203.0.113.16', json: {
    currentPassword: 'New-password-456!',
    newPassword: 'Another-password-789!',
    confirmPassword: 'Another-password-789!'
  }
}, env);
assert.equal(blockedPasswordChange.status, 429, 'current-password verification is rate-limited');

const logout = await call('/api/auth/logout', {
  cookie: newCookie, json: {}, ip: '203.0.113.15'
}, env);
assert.equal(logout.status, 200);
assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/u);
assert.equal((await call('/api/auth/session', { cookie: newCookie }, env)).status, 401, 'logout revokes session');

for (const response of [login, session, changed, logout, oldPassword, newPassword]) {
  assert.match(response.headers.get('Cache-Control'), /no-store/u);
}

console.log('PASS: D1 bootstrap, PBKDF2 storage, streamed body cap, atomic concurrent rate limit, hashed 8h sessions and expiry, route protection, password rotation, session invalidation and logout.');
