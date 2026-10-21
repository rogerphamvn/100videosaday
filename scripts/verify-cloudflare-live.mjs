// Run only against an owner-authorized deployment. Does not change passwords.
// Supply CHLAB_PASSWORD via the process environment, never a command argument.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const origin = process.env.CHLAB_ORIGIN || 'https://100videosaday.happy-candlevn.workers.dev';
assert.equal(new URL(origin).protocol, 'https:');
assert.ok(process.env.CHLAB_PASSWORD, 'Set CHLAB_PASSWORD in the environment');
const call = (path, init = {}) => fetch(origin + path, { redirect: 'manual', ...init });
const jsonPost = (body, cookie = '') => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
  body: JSON.stringify(body)
});
const hash = value => createHash('sha256').update(value).digest('hex');
const loginPage = await call('/login');
assert.equal(loginPage.status, 200);
assert.equal(hash(Buffer.from(await loginPage.arrayBuffer())), hash(await readFile(new URL('../dist/login.html', import.meta.url))));
assert.equal((await call('/')).status, 302);
assert.equal((await call('/api/auth/session')).status, 401);
const crossOrigin = jsonPost({ username: 'team', password: process.env.CHLAB_PASSWORD });
crossOrigin.headers.Origin = 'https://untrusted.example';
assert.equal((await call('/api/auth/login', crossOrigin)).status, 403);
const signedIn = await call('/api/auth/login', jsonPost({
  username: 'team', password: process.env.CHLAB_PASSWORD
}));
assert.equal(signedIn.status, 200, 'Live login failed');
const header = signedIn.headers.get('set-cookie');
assert.ok(header?.includes('HttpOnly') && header.includes('Secure') && /SameSite=Strict/i.test(header));
const cookie = header.split(';')[0];
try {
  assert.equal((await call('/api/auth/session', { headers: { Cookie: cookie } })).status, 200);
  const files = [
    ['/', 'index.html'], ['/account', 'account.html'], ['/review', 'review.html'], ['/studio', 'studio.html'],
    ['/studio.css', 'studio.css'], ['/studio.js', 'studio.js'],
    ['/shared-shell.css', 'shared-shell.css'], ['/shared-shell.js', 'shared-shell.js'],
    ['/styles.css', 'styles.css'], ['/app.js', 'app.js'], ['/auth.css', 'auth.css'], ['/auth.js', 'auth.js'],
    ['/canvas-agent.css', 'canvas-agent.css'], ['/canvas-agent.js', 'canvas-agent.js'],
    ...['01-insight.png', '02-creative-lab.png', '03-remix.png', '04-video-studio.png']
      .map(name => [`/mockups/${name}`, `mockups/${name}`])
  ];
  for (const [route, local] of files) {
    const response = await call(route, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('cache-control'), /private.*no-store/, route);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(new URL(`../dist/${local}`, import.meta.url))), route);
    console.log(`PASS ${route}: 200, private, exact source hash`);
  }
  assert.equal((await call('/.env', { headers: { Cookie: cookie } })).status, 404);
  const dashboard = await call('/api/production/dashboard', { headers: { Cookie: cookie } });
  assert.equal(dashboard.status, 200);
  const production = await dashboard.json();
  assert.ok(Array.isArray(production.projects) && Array.isArray(production.batches));
  assert.equal(production.totals.readyCount, 0, 'Planning-only release must not report generated media');
  const integration = await call('/api/integrations/status', { headers: { Cookie: cookie } });
  assert.equal(integration.status, 200);
  const providers = await integration.json();
  assert.ok(['not_configured', 'configured_unverified'].includes(providers.research.status));
  assert.ok(['not_configured', 'configured_unverified'].includes(providers.voice.status));
  console.log('PASS production dashboard and honest integration readiness');
} finally {
  assert.equal((await call('/api/auth/logout', jsonPost({}, cookie))).status, 200);
  assert.equal((await call('/api/auth/session', { headers: { Cookie: cookie } })).status, 401);
}
console.log('LIVE PASS: login, cookie flags, CSRF, all UI assets, private routes and logout revocation. Owner password unchanged.');
