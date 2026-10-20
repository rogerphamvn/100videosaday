import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
let calls = 0;
const env = { INTERNAL_PASSWORD: 'test-only-secret', ASSETS: {
  fetch: async () => { calls++; return new Response('asset'); }
}};
const request = (path, auth) => new Request(`https://example.com${path}`, {
  headers: auth ? { Authorization: auth } : {}
});
assert.equal((await worker.fetch(request('/'), {})).status, 503);
for (const path of ['/', '/styles.css', '/app.js']) {
  for (const auth of [undefined, 'Basic ???', `Basic ${btoa('team:wrong')}`]) {
    assert.equal((await worker.fetch(request(path, auth), env)).status, 401);
  }
}
assert.equal(calls, 0);
const auth = `Basic ${btoa(`team:${env.INTERNAL_PASSWORD}`)}`;
for (const path of ['/', '/index.html', '/styles.css', '/app.js']) {
  const result = await worker.fetch(request(path, auth), env);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
}
assert.equal((await worker.fetch(request('/.env', auth), env)).status, 404);
assert.equal(calls, 4);
console.log('PASS: fail-closed config, asset auth, malformed/wrong credentials, private cache, route allowlist.');
