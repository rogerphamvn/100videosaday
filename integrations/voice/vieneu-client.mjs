import {
  IntegrationError,
  fetchAndReadWithTimeout,
  readBoundedInteger,
  requireHttpsBridge,
  requireToken,
  safeIdentifier,
  sha256Hex
} from '../shared.mjs';

export const DEFAULT_VIENEU_MODEL_REVISION = '61b85e3d937fbbacb387714180e8182823512523';
export const DEFAULT_VIENEU_VOICE = 'Hải Đăng';
export const VIENEU_CLIENT_RECIPE_VERSION = 'vieneu-client/1.0';

function validateInput(input) {
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  if (!text || text.length > 4_000) throw new IntegrationError('invalid_input', 'text must contain 1 to 4000 characters.', 400);
  const voiceId = typeof input?.voiceId === 'string' ? input.voiceId.trim() : DEFAULT_VIENEU_VOICE;
  if (!voiceId || voiceId.length > 64 || /[\u0000-\u001f\u007f]/u.test(voiceId)) {
    throw new IntegrationError('invalid_input', 'voiceId is invalid.', 400);
  }
  return { text, voiceId, projectId: safeIdentifier(input?.projectId, 'projectId') };
}

function isPcmWav(bytes) {
  if (bytes.byteLength < 44
    || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF'
    || String.fromCharCode(...bytes.slice(8, 12)) !== 'WAVE') return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let pcmFormat = false;
  let dataChunk = false;
  while (offset + 8 <= bytes.byteLength) {
    const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && size >= 16 && offset + 8 + size <= bytes.byteLength) {
      const format = view.getUint16(offset + 8, true);
      const channels = view.getUint16(offset + 10, true);
      const sampleRate = view.getUint32(offset + 12, true);
      const byteRate = view.getUint32(offset + 16, true);
      const blockAlign = view.getUint16(offset + 20, true);
      const bitsPerSample = view.getUint16(offset + 22, true);
      pcmFormat = format === 1
        && channels === 1
        && sampleRate === 48_000
        && bitsPerSample === 16
        && blockAlign === channels * (bitsPerSample / 8)
        && byteRate === sampleRate * blockAlign;
    }
    if (id === 'data') {
      dataChunk = size > 0 && offset + 8 + size <= bytes.byteLength;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  return pcmFormat && dataChunk;
}

export async function synthesizeVoice(input, env, options = {}) {
  const normalized = validateInput(input);
  const base = requireHttpsBridge(env?.VIENEU_BRIDGE_URL, 'vieneu_bridge_not_configured');
  const token = requireToken(env?.VIENEU_BRIDGE_TOKEN, 'vieneu_bridge_token_not_configured');
  const timeoutMs = readBoundedInteger(env?.VIENEU_TIMEOUT_MS, 45_000, 2_000, 120_000);
  const modelRevision = String(env?.VIENEU_MODEL_REVISION || '').trim();
  if (!/^[a-f0-9]{40}$/u.test(modelRevision)) {
    throw new IntegrationError('vieneu_model_revision_not_configured', 'VieNeu model revision must be an exact 40-character commit.', 503);
  }
  const scriptHash = await sha256Hex(`${VIENEU_CLIENT_RECIPE_VERSION}\u0000${modelRevision}\u0000${normalized.voiceId}\u0000${normalized.text}`);
  const endpoint = new URL('/v1/audio/speech', base);
  const { response, bytes } = await fetchAndReadWithTimeout(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'audio/wav' },
    body: JSON.stringify({
      model: 'vieneu-v3-turbo', input: normalized.text, voice: normalized.voiceId,
      response_format: 'wav', stream_format: 'audio', project_id: normalized.projectId,
      script_hash: scriptHash
    })
  }, timeoutMs, 20 * 1024 * 1024, options.fetchImpl);
  if (!response.ok) {
    const status = response.status === 429 ? 429 : [401, 403].includes(response.status) || response.status >= 500 ? 502 : response.status;
    const code = [401, 403].includes(response.status) ? 'vieneu_bridge_auth_error' : 'vieneu_bridge_error';
    throw new IntegrationError(code, `VieNeu bridge returned HTTP ${response.status}.`, status);
  }
  const contentType = (response.headers.get('Content-Type') || '').split(';', 1)[0].toLowerCase();
  if (contentType !== 'audio/wav' && contentType !== 'audio/x-wav') {
    throw new IntegrationError('vieneu_invalid_response', 'VieNeu bridge returned an unsupported content type.', 502);
  }
  if (!isPcmWav(bytes)) {
    throw new IntegrationError('vieneu_invalid_response', 'VieNeu bridge returned an invalid WAV payload.', 502);
  }
  const renderHashHeader = response.headers.get('X-Render-Hash');
  const renderHash = /^[a-f0-9]{64}$/u.test(renderHashHeader || '') ? renderHashHeader : null;
  return {
    audio: bytes, contentType: 'audio/wav', scriptHash,
    renderHash, voiceId: normalized.voiceId, modelRevision,
    requestId: response.headers.get('X-Request-Id') || null,
    cache: { key: renderHash || scriptHash, hit: response.headers.get('X-Cache') === 'HIT' }
  };
}

export { IntegrationError };
