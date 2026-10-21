import { handleProduction } from './production.mjs';
import { handleWorkflow } from './workflow.mjs';
import { preflightWorkflowProviders } from '../integrations/provider-preflight.mjs';
import { ensureAiCachePolicy } from '../integrations/workflow-cache.mjs';
import { getIntegrationStatus, researchWithJev, synthesizeVoice } from '../integrations/clients.mjs';

const USERNAME = 'team';
const COOKIE_NAME = '__Host-creative_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const MAX_JSON_BYTES = 16 * 1024;
const PBKDF2_ITERATIONS = 100_000;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_FAILURES = 8;

const PUBLIC_ASSETS = new Map([
  ['/login', '/login.html'],
  ['/login.html', '/login.html'],
  ['/auth.css', '/auth.css'],
  ['/auth.js', '/auth.js'],
  ['/shared-shell.css', '/shared-shell.css'],
  ['/shared-shell.js', '/shared-shell.js']
]);

const PRIVATE_ASSETS = new Map([
  ['/workflow', '/workflow.html'],
  ['/workflow.html', '/workflow.html'],
  ['/workflow.css', '/workflow.css'],
  ['/workflow.js', '/workflow.js'],
  ['/workflow-canvas.js', '/workflow-canvas.js'],
  ['/workflow-canvas.css', '/workflow-canvas.css'],
  ['/', '/index.html'],
  ['/index.html', '/index.html'],
  ['/styles.css', '/styles.css'],
  ['/app.js', '/app.js'],
  ['/canvas-agent.css', '/canvas-agent.css'],
  ['/canvas-agent.js', '/canvas-agent.js'],
  ['/account', '/account.html'],
  ['/account.html', '/account.html'],
  ['/review', '/review.html'],
  ['/review.html', '/review.html'],
  ['/studio', '/studio.html'],
  ['/studio.html', '/studio.html'],
  ['/studio.css', '/studio.css'],
  ['/studio.js', '/studio.js'],
  ['/mockups/01-insight.png', '/mockups/01-insight.png'],
  ['/mockups/02-creative-lab.png', '/mockups/02-creative-lab.png'],
  ['/mockups/03-remix.png', '/mockups/03-remix.png'],
  ['/mockups/04-video-studio.png', '/mockups/04-video-studio.png']
]);

const BASE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow'
};

const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function passwordHash(password, salt, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: encoder.encode(salt),
    iterations
  }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

async function constantTimeEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right))
  ]);
  const a = new Uint8Array(leftDigest);
  const b = new Uint8Array(rightDigest);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function responseHeaders(extra = {}) {
  return { ...BASE_HEADERS, ...extra };
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders({ 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders })
  });
}

function text(message, status = 200, extraHeaders = {}) {
  return new Response(message, { status, headers: responseHeaders(extraHeaders) });
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return '';
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function ensureCredential(env) {
  if (!env.AUTH_DB) return null;
  let credential = await env.AUTH_DB.prepare(
    'SELECT username, salt, password_hash, iterations, credential_version FROM auth_credentials WHERE id = 1'
  ).first();
  if (credential) return credential;
  if (!env.INTERNAL_PASSWORD) return null;

  const salt = randomToken(24);
  const hash = await passwordHash(env.INTERNAL_PASSWORD, salt);
  const timestamp = nowSeconds();
  await env.AUTH_DB.prepare(
    `INSERT OR IGNORE INTO auth_credentials
      (id, username, salt, password_hash, iterations, credential_version, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(USERNAME, salt, hash, PBKDF2_ITERATIONS, timestamp, timestamp).run();

  credential = await env.AUTH_DB.prepare(
    'SELECT username, salt, password_hash, iterations, credential_version FROM auth_credentials WHERE id = 1'
  ).first();
  return credential || null;
}

async function verifyPassword(password, credential) {
  const candidate = await passwordHash(password, credential.salt, Number(credential.iterations));
  return constantTimeEqual(candidate, credential.password_hash);
}

async function authenticate(request, env) {
  const token = cookieValue(request, COOKIE_NAME);
  if (!token || !env.AUTH_DB) return null;
  const tokenHash = await sha256(token);
  const timestamp = nowSeconds();
  const session = await env.AUTH_DB.prepare(
    `SELECT c.username, c.credential_version, s.token_hash, s.expires_at
       FROM auth_sessions s
       JOIN auth_credentials c ON c.id = 1 AND c.credential_version = s.credential_version
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`
  ).bind(tokenHash, timestamp).first();
  if (!session) return null;
  return { ...session, token, tokenHash };
}

function assertSameOrigin(request) {
  const origin = request.headers.get('Origin');
  return origin === new URL(request.url).origin;
}

async function readJson(request, maxBytes = MAX_JSON_BYTES) {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return { error: json({ error: 'content_type_required' }, 415) };
  }
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { error: json({ error: 'request_too_large' }, 413) };
  }
  if (!request.body) return { error: json({ error: 'invalid_json' }, 400) };
  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      try {
        await reader.cancel('request_too_large');
      } catch {
        // The size rejection remains authoritative if cancellation races EOF.
      }
      return { error: json({ error: 'request_too_large' }, 413) };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { value: JSON.parse(body) };
  } catch {
    return { error: json({ error: 'invalid_json' }, 400) };
  }
}

function clientRateKey(request, scope) {
  return `${scope}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
}

async function consumeRateAttempt(request, env, scope = 'login') {
  const timestamp = nowSeconds();
  const windowStart = timestamp - (timestamp % LOGIN_WINDOW_SECONDS);
  const ipHash = await sha256(clientRateKey(request, scope));
  await env.AUTH_DB.prepare(
    'DELETE FROM auth_login_attempts WHERE window_start < ?'
  ).bind(windowStart - LOGIN_WINDOW_SECONDS).run();
  const row = await env.AUTH_DB.prepare(
    `INSERT INTO auth_login_attempts (ip_hash, window_start, attempts)
     VALUES (?, ?, 1)
     ON CONFLICT(ip_hash, window_start) DO UPDATE SET attempts = attempts + 1
     RETURNING attempts`
  ).bind(ipHash, windowStart).first();
  return { ipHash, windowStart, attempts: Number(row?.attempts || 1) };
}

async function clearLoginFailures(env, rate) {
  await env.AUTH_DB.prepare(
    'DELETE FROM auth_login_attempts WHERE ip_hash = ? AND window_start = ?'
  ).bind(rate.ipHash, rate.windowStart).run();
}

async function login(request, env) {
  const credential = await ensureCredential(env);
  if (!credential) return json({ error: 'auth_not_configured' }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { username, password } = parsed.value || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return json({ error: 'invalid_credentials' }, 401);
  }

  const rate = await consumeRateAttempt(request, env);
  if (rate.attempts > LOGIN_MAX_FAILURES) {
    return json({ error: 'too_many_attempts' }, 429, { 'Retry-After': String(LOGIN_WINDOW_SECONDS) });
  }

  const validUsername = await constantTimeEqual(username, credential.username);
  const validPassword = await verifyPassword(password, credential);
  if (!validUsername || !validPassword) {
    return json({ error: 'invalid_credentials' }, 401);
  }

  await clearLoginFailures(env, rate);
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const createdAt = nowSeconds();
  const expiresAt = createdAt + SESSION_TTL_SECONDS;
  await env.AUTH_DB.prepare(
    'DELETE FROM auth_sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL'
  ).bind(createdAt).run();
  await env.AUTH_DB.prepare(
    `INSERT INTO auth_sessions
      (token_hash, credential_version, created_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, NULL)`
  ).bind(tokenHash, Number(credential.credential_version), createdAt, expiresAt).run();
  return json(
    { authenticated: true, username: credential.username, expiresAt },
    200,
    { 'Set-Cookie': sessionCookie(token) }
  );
}

function validNewPassword(password) {
  return typeof password === 'string'
    && password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH;
}

async function changePassword(request, env, session) {
  if (!session) return json({ error: 'authentication_required' }, 401);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { currentPassword, newPassword, confirmPassword } = parsed.value || {};
  if (!validNewPassword(newPassword)) {
    return json({ error: 'password_length', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH }, 400);
  }
  if (newPassword !== confirmPassword) return json({ error: 'password_confirmation_mismatch' }, 400);
  if (typeof currentPassword !== 'string') return json({ error: 'current_password_required' }, 400);

  const rate = await consumeRateAttempt(request, env, 'password');
  if (rate.attempts > LOGIN_MAX_FAILURES) {
    return json({ error: 'too_many_attempts' }, 429, { 'Retry-After': String(LOGIN_WINDOW_SECONDS) });
  }

  const credential = await ensureCredential(env);
  if (!credential || Number(credential.credential_version) !== Number(session.credential_version)) {
    return json({ error: 'session_stale' }, 401, { 'Set-Cookie': clearSessionCookie() });
  }
  if (!await verifyPassword(currentPassword, credential)) {
    return json({ error: 'current_password_incorrect' }, 401);
  }
  try {
    await clearLoginFailures(env, rate);
  } catch {
    // The bounded-window cleanup on the next attempt will retry it.
  }
  if (await verifyPassword(newPassword, credential)) {
    return json({ error: 'new_password_must_differ' }, 400);
  }

  const newSalt = randomToken(24);
  const newHash = await passwordHash(newPassword, newSalt);
  const timestamp = nowSeconds();
  const expectedVersion = Number(credential.credential_version);
  const statements = [
    env.AUTH_DB.prepare(
      `UPDATE auth_credentials
          SET salt = ?, password_hash = ?, iterations = ?,
              credential_version = credential_version + 1, updated_at = ?
        WHERE id = 1 AND credential_version = ? AND password_hash = ?`
    ).bind(newSalt, newHash, PBKDF2_ITERATIONS, timestamp, expectedVersion, credential.password_hash),
    env.AUTH_DB.prepare(
      'DELETE FROM auth_sessions WHERE credential_version <= ?'
    ).bind(expectedVersion)
  ];
  const results = await env.AUTH_DB.batch(statements);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
    return json({ error: 'credential_changed_retry' }, 409, { 'Set-Cookie': clearSessionCookie() });
  }
  return json({ passwordChanged: true, reauthenticationRequired: true }, 200, {
    'Set-Cookie': clearSessionCookie()
  });
}

async function logout(request, env, session) {
  if (session && env.AUTH_DB) {
    await env.AUTH_DB.prepare(
      'UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
    ).bind(nowSeconds(), session.tokenHash).run();
  }
  return json({ authenticated: false }, 200, { 'Set-Cookie': clearSessionCookie() });
}

async function handleApi(request, env, pathname) {
  if (request.method === 'POST' && !assertSameOrigin(request)) {
    return json({ error: 'origin_forbidden' }, 403);
  }
  if (pathname === '/api/auth/login' && request.method === 'POST') return login(request, env);

  const session = await authenticate(request, env);
  if (pathname === '/api/auth/session' && request.method === 'GET') {
    if (!session) return json({ authenticated: false }, 401);
    return json({ authenticated: true, username: session.username });
  }
  if (pathname === '/api/auth/password' && request.method === 'POST') {
    return changePassword(request, env, session);
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    return logout(request, env, session);
  }
  if (pathname === '/api/provider-preflight') {
    if (!session) return json({ error: 'authentication_required' }, 401);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const parsed = await readJson(request);
    if (parsed.error) return parsed.error;
    if (!parsed.value || Array.isArray(parsed.value) || typeof parsed.value !== 'object') {
      return json({ error: 'preflight_body_invalid' }, 400);
    }
    const bodyKeys = Object.keys(parsed.value);
    if (bodyKeys.some((key) => key !== 'projectId')) return json({ error: 'preflight_body_invalid' }, 400);
    let maxGetAttempts = 2;
    if (bodyKeys.includes('projectId')) {
      const projectId = parsed.value.projectId;
      if (typeof projectId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(projectId)) {
        return json({ error: 'project_id_invalid' }, 400);
      }
      try {
        const project = await env.AUTH_DB.prepare('SELECT id FROM production_projects WHERE id = ?').bind(projectId).first();
        if (!project) return json({ error: 'project_not_found' }, 404);
        const policy = await ensureAiCachePolicy(env, projectId);
        maxGetAttempts = Number(policy.preflight_get_attempts);
      } catch { return json({ error: 'preflight_policy_unavailable' }, 503); }
    }
    try { return json(await preflightWorkflowProviders(env, { maxGetAttempts })); }
    catch { return json({ error: 'preflight_unavailable' }, 503); }
  }
  if (pathname === '/api/workflow' || pathname.startsWith('/api/workflow/')) {
    if (!session) return json({ error: 'authentication_required' }, 401);
    let forwarded = request;
    if (request.method === 'POST') {
      const parsed = await readJson(request, 1_572_864);
      if (parsed.error) return parsed.error;
      const headers = new Headers(request.headers); headers.delete('Content-Length');
      forwarded = new Request(request.url, {method:'POST',headers,body:JSON.stringify(parsed.value)});
    }
    const response = await handleWorkflow(forwarded, env);
    if (!response) return json({error:'not_found'},404);
    const secured = new Response(response.body,response);
    for (const [key,value] of Object.entries(BASE_HEADERS)) secured.headers.set(key,value);
    return secured;
  }
  if (pathname.startsWith('/api/production/') || ['/api/integrations/status', '/api/research', '/api/voice'].includes(pathname)) {
    if (!session) return json({ error: 'authentication_required' }, 401);
    if (pathname === '/api/integrations/status' && request.method === 'GET') {
      return json(getIntegrationStatus(env));
    }
    if (pathname.startsWith('/api/production/')) {
      let forwarded = request;
      if (request.method === 'POST') {
        const parsed = await readJson(request);
        if (parsed.error) return parsed.error;
        const headers = new Headers(request.headers);
        headers.delete('Content-Length');
        forwarded = new Request(request.url, { method: 'POST', headers, body: JSON.stringify(parsed.value) });
      }
      const response = await handleProduction(forwarded, env, pathname);
      if (response) {
        const secured = new Response(response.body, response);
        for (const [key, value] of Object.entries(BASE_HEADERS)) secured.headers.set(key, value);
        return secured;
      }
    }
    if (['/api/research', '/api/voice'].includes(pathname) && request.method === 'POST') {
      const parsed = await readJson(request);
      if (parsed.error) return parsed.error;
      const input = parsed.value;
      if (!input || typeof input.projectId !== 'string' || input.projectId.length > 100) {
        return json({ error: 'project_required', message: 'Hãy chọn một dự án đã lưu.' }, 400);
      }
      const project = await env.AUTH_DB.prepare('SELECT id FROM production_projects WHERE id = ?').bind(input.projectId).first();
      if (!project) return json({ error: 'project_not_found', message: 'Không tìm thấy dự án.' }, 404);
      try {
        if (pathname === '/api/research') return json(await researchWithJev(input, env));
        const voice = await synthesizeVoice(input, env);
        return new Response(voice.audio, {
          headers: responseHeaders({
            'Content-Type': 'audio/wav',
            'X-Script-Hash': voice.scriptHash,
            'X-Voice-Id': encodeURIComponent(voice.voiceId),
            'X-Model-Revision': voice.modelRevision
          })
        });
      } catch (error) {
        const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 502;
        return json({ error: error.code || 'integration_failed', message: 'Dịch vụ chưa sẵn sàng hoặc không trả kết quả hợp lệ.' }, status);
      }
    }
  }
  return json({ error: 'not_found' }, 404);
}

function isNavigation(request, pathname) {
  return request.headers.get('Accept')?.includes('text/html')
    || pathname === '/'
    || pathname.endsWith('.html')
    || ['/account', '/review', '/studio', '/workflow'].includes(pathname);
}

async function assetResponse(request, env, assetPath) {
  const url = new URL(request.url);
  url.pathname = assetPath;
  url.search = '';
  const assetRequest = new Request(url, request);
  const asset = await env.ASSETS.fetch(assetRequest);
  const response = new Response(asset.body, asset);
  for (const [key, value] of Object.entries(BASE_HEADERS)) response.headers.set(key, value);
  return response;
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) return handleApi(request, env, pathname);
  if (!['GET', 'HEAD'].includes(request.method)) return text('Method not allowed', 405, { Allow: 'GET, HEAD' });
  if (!env.ASSETS) return text('Static assets are not configured.', 503);

  const publicAsset = PUBLIC_ASSETS.get(pathname);
  if (publicAsset) {
    if ((pathname === '/login' || pathname === '/login.html') && await authenticate(request, env)) {
      return new Response(null, { status: 302, headers: responseHeaders({ Location: '/' }) });
    }
    return assetResponse(request, env, publicAsset);
  }

  const privateAsset = PRIVATE_ASSETS.get(pathname);
  if (!privateAsset) return text('Not found', 404);
  const session = await authenticate(request, env);
  if (!session) {
    if (isNavigation(request, pathname)) {
      const next = encodeURIComponent(`${pathname}${url.search}`);
      return new Response(null, { status: 302, headers: responseHeaders({ Location: `/login?next=${next}` }) });
    }
    return text('Authentication required.', 401);
  }
  return assetResponse(request, env, privateAsset);
}

export const authInternals = {
  COOKIE_NAME,
  LOGIN_MAX_FAILURES,
  ensureCredential,
  passwordHash,
  sha256
};

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch {
      return json({ error: 'service_unavailable' }, 503);
    }
  }
};
