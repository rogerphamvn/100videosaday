import assert from 'node:assert/strict';
import { getIntegrationStatus, researchWithJev, synthesizeVoice } from '../integrations/clients.mjs';

const token = '0123456789abcdef0123456789abcdef';
const revision = '61b85e3d937fbbacb387714180e8182823512523';

async function rejectsCode(fn, code) {
  await assert.rejects(fn, (error) => error?.code === code);
}

assert.deepEqual(getIntegrationStatus({}), {
  research: { provider: 'jev-bridge', configured: false, status: 'not_configured', mode: 'bounded-fanout', cache: 'bridge-reported' },
  voice: { provider: 'vieneu-v3-turbo', configured: false, status: 'not_configured', modelRevision: null, cloningEnabled: false }
});

await rejectsCode(
  () => researchWithJev({ query: 'oil sprayer', market: 'VN', projectId: 'p1' }, {}),
  'jev_bridge_not_configured'
);

let researchRequest;
const research = await researchWithJev(
  { query: 'oil sprayer', market: 'VN', projectId: 'p1' },
  { JEV_RESEARCH_BRIDGE_URL: 'https://jev.example.test', JEV_RESEARCH_BRIDGE_TOKEN: token },
  { fetchImpl: async (url, init) => {
    researchRequest = { url: String(url), init, body: JSON.parse(init.body) };
    return Response.json({
      requestId: 'req-1', status: 'complete', retrievedAt: '2026-10-20T07:00:00Z',
      evidence: [{ id: 's1', url: 'https://example.com/review', title: 'Review', snippet: 'Observed complaint from a public review.', retrievedAt: '2026-10-20T07:00:00Z', sourceType: 'forum' }],
      hypotheses: [{ text: 'Mess-free dosing may motivate buyers.', basedOn: ['s1'] }],
      cache: { hit: true, ageSeconds: 80 }
    });
  } }
);
assert.equal(research.evidence[0].url, 'https://example.com/review');
assert.equal(research.hypotheses[0].status, 'unverified');
assert.equal(research.cache.source, 'bridge-reported');
assert.equal(research.recipe.queries.length, 6);
assert.equal(researchRequest.url, 'https://jev.example.test/v1/research');
assert.equal(researchRequest.body.recipe.maxConcurrency, 3);
assert.match(researchRequest.init.headers.Authorization, /^Bearer /u);
assert.equal(researchRequest.init.redirect, 'manual');

await rejectsCode(
  () => researchWithJev(
    { query: 'oil sprayer', market: 'VN', projectId: 'p1' },
    { JEV_RESEARCH_BRIDGE_URL: 'http://client-controlled.invalid', JEV_RESEARCH_BRIDGE_TOKEN: token }
  ),
  'jev_bridge_not_configured_invalid'
);
assert.equal(getIntegrationStatus({
  JEV_RESEARCH_BRIDGE_URL: 'https://localhost.',
  JEV_RESEARCH_BRIDGE_TOKEN: token
}).research.configured, false);

await rejectsCode(
  () => researchWithJev(
    { query: 'oil sprayer', market: 'VN', projectId: 'p1' },
    { JEV_RESEARCH_BRIDGE_URL: 'https://jev.example.test', JEV_RESEARCH_BRIDGE_TOKEN: token },
    { fetchImpl: async () => Response.json({ requestId: 'bad', status: 'complete', retrievedAt: 'not-a-date', evidence: [] }) }
  ),
  'jev_invalid_response'
);

await rejectsCode(
  () => researchWithJev(
    { query: 'oil sprayer', market: 'VN', projectId: 'p1' },
    { JEV_RESEARCH_BRIDGE_URL: 'https://jev.example.test', JEV_RESEARCH_BRIDGE_TOKEN: token },
    { fetchImpl: async () => new Response(new Uint8Array(1_048_577), { headers: { 'Content-Type': 'application/json' } }) }
  ),
  'integration_response_too_large'
);

await assert.rejects(
  () => researchWithJev(
    { query: 'oil sprayer', market: 'VN', projectId: 'p1' },
    { JEV_RESEARCH_BRIDGE_URL: 'https://jev.example.test', JEV_RESEARCH_BRIDGE_TOKEN: token },
    { fetchImpl: async () => Response.json({ error: 'bad bridge token' }, { status: 401 }) }
  ),
  (error) => error?.code === 'jev_bridge_auth_error' && error?.status === 502
);

await rejectsCode(
  () => researchWithJev(
    { query: 'oil sprayer', market: 'VN', projectId: 'p1' },
    { JEV_RESEARCH_BRIDGE_URL: 'https://jev.example.test', JEV_RESEARCH_BRIDGE_TOKEN: token, JEV_RESEARCH_TIMEOUT_MS: 1000 },
    { fetchImpl: (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) }
  ),
  'integration_timeout'
);

const wav = new Uint8Array(48);
wav.set([82, 73, 70, 70]);
wav.set([87, 65, 86, 69], 8);
wav.set([102, 109, 116, 32], 12);
wav.set([100, 97, 116, 97], 36);
const wavView = new DataView(wav.buffer);
wavView.setUint32(4, 40, true);
wavView.setUint32(16, 16, true);
wavView.setUint16(20, 1, true);
wavView.setUint16(22, 1, true);
wavView.setUint32(24, 48_000, true);
wavView.setUint32(28, 96_000, true);
wavView.setUint16(32, 2, true);
wavView.setUint16(34, 16, true);
wavView.setUint32(40, 4, true);
wav.set([0, 0, 1, 0], 44);
let voiceRequest;
const voice = await synthesizeVoice(
  { text: 'Xin chào.', voiceId: 'Mai Anh', projectId: 'p1' },
  { VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token, VIENEU_MODEL_REVISION: revision },
  { fetchImpl: async (url, init) => {
    voiceRequest = { url: String(url), init, body: JSON.parse(init.body) };
    return new Response(wav, { status: 200, headers: { 'Content-Type': 'audio/wav', 'X-Request-Id': 'voice-1', 'X-Render-Hash': 'a'.repeat(64), 'X-Cache': 'HIT' } });
  } }
);
assert.equal(voice.contentType, 'audio/wav');
assert.equal(voice.audio.byteLength, 48);
assert.equal(voiceRequest.url, 'https://voice.example.test/v1/audio/speech');
assert.equal(voiceRequest.body.script_hash, voice.scriptHash);
assert.match(voiceRequest.init.headers.Authorization, /^Bearer /u);
assert.equal(voiceRequest.init.redirect, 'manual');
assert.equal(voice.modelRevision, revision);
assert.equal(voice.renderHash, 'a'.repeat(64));
assert.equal(voice.cache.hit, true);

const defaultVoice = await synthesizeVoice(
  { text: 'Xin chào.', projectId: 'p1' },
  { VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token, VIENEU_MODEL_REVISION: revision },
  { fetchImpl: async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.voice, 'Hải Đăng');
    return new Response(wav, { status: 200, headers: { 'Content-Type': 'audio/wav' } });
  } }
);
assert.equal(defaultVoice.voiceId, 'Hải Đăng');

const emptyWav = wav.slice(0, 44);
const emptyWavView = new DataView(emptyWav.buffer);
emptyWavView.setUint32(4, 36, true);
emptyWavView.setUint32(40, 0, true);
await rejectsCode(
  () => synthesizeVoice(
    { text: 'Xin chào.', voiceId: 'Mai Anh', projectId: 'p1' },
    { VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token, VIENEU_MODEL_REVISION: revision },
    { fetchImpl: async () => new Response(emptyWav, { status: 200, headers: { 'Content-Type': 'audio/wav' } }) }
  ),
  'vieneu_invalid_response'
);

await rejectsCode(
  () => synthesizeVoice(
    { text: 'Xin chào.', voiceId: 'Mai Anh', projectId: 'p1' },
    { VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token, VIENEU_MODEL_REVISION: revision },
    { fetchImpl: async () => Response.json({ audio: 'not accepted' }) }
  ),
  'vieneu_invalid_response'
);

await rejectsCode(
  () => synthesizeVoice(
    { text: 'Xin chào.', voiceId: 'Mai Anh', projectId: 'p1' },
    { VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token, VIENEU_MODEL_REVISION: revision },
    { fetchImpl: async () => Response.json({ error: 'busy' }, { status: 429 }) }
  ),
  'vieneu_bridge_error'
);

await assert.rejects(
  () => synthesizeVoice(
    { text: 'Xin chào.', voiceId: 'Mai Anh', projectId: 'p1' },
    { VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token, VIENEU_MODEL_REVISION: revision },
    { fetchImpl: async () => Response.json({ error: 'bad bridge token' }, { status: 403 }) }
  ),
  (error) => error?.code === 'vieneu_bridge_auth_error' && error?.status === 502
);

assert.equal(getIntegrationStatus({
  JEV_RESEARCH_BRIDGE_URL: 'https://jev.example.test', JEV_RESEARCH_BRIDGE_TOKEN: token,
  VIENEU_BRIDGE_URL: 'https://voice.example.test', VIENEU_BRIDGE_TOKEN: token,
  VIENEU_MODEL_REVISION: revision
}).voice.status, 'configured_unverified');

console.log('integration contract tests: PASS');
