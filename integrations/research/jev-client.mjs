import {
  IntegrationError,
  fetchAndReadWithTimeout,
  readBoundedInteger,
  requireHttpsBridge,
  requireToken,
  safeIdentifier
} from '../shared.mjs';

const MARKETS = new Set(['VN', 'US', 'GLOBAL']);
const SOURCE_TYPES = new Set(['search', 'marketplace', 'social', 'forum', 'video', 'ads', 'official', 'other']);

export function buildResearchRecipe({ query, market }, cacheTtlSeconds = 21_600) {
  const locale = market === 'VN' ? 'Vietnamese' : market === 'US' ? 'English (United States)' : 'local market language';
  return {
    version: 'research-recipe/1.0',
    strategy: 'bounded-fanout',
    maxConcurrency: 3,
    cacheTtlSeconds,
    cacheScope: 'project-market-query',
    cacheNote: 'This is a requested bridge policy. A cache hit is only true when the bridge reports it.',
    queries: [
      { id: 'demand', purpose: 'buyer demand and use cases', query: `${query} use cases buyer demand`, locale },
      { id: 'pain', purpose: 'pain points and recurring complaints', query: `${query} problems complaints reviews`, locale },
      { id: 'motivator', purpose: 'functional and emotional motivators', query: `${query} why people buy benefits motivations`, locale },
      { id: 'creative', purpose: 'creative hooks and ad patterns', query: `${query} ads hooks creatives`, locale },
      { id: 'trend', purpose: 'recent video and social trends', query: `${query} trends short video`, locale },
      { id: 'counter', purpose: 'counter-evidence, barriers and objections', query: `${query} not worth it objections alternatives`, locale }
    ]
  };
}

function validateInput(input) {
  const query = typeof input?.query === 'string' ? input.query.trim() : '';
  if (query.length < 3 || query.length > 400) {
    throw new IntegrationError('invalid_input', 'query must contain 3 to 400 characters.', 400);
  }
  const market = String(input?.market || '').toUpperCase();
  if (!MARKETS.has(market)) throw new IntegrationError('invalid_input', 'market must be VN, US or GLOBAL.', 400);
  const projectId = safeIdentifier(input?.projectId, 'projectId');
  return { query, market, projectId };
}

function validTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validateEvidence(item, index) {
  if (!item || typeof item !== 'object') throw new IntegrationError('jev_invalid_response', `evidence[${index}] is invalid.`, 502);
  let url;
  try { url = new URL(item.url); } catch { throw new IntegrationError('jev_invalid_response', `evidence[${index}].url is invalid.`, 502); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new IntegrationError('jev_invalid_response', `evidence[${index}].url must use credential-free HTTPS.`, 502);
  const title = String(item.title || '').trim();
  const snippet = String(item.snippet || '').trim();
  if (!title || title.length > 300 || !snippet || snippet.length > 1_200) {
    throw new IntegrationError('jev_invalid_response', `evidence[${index}] title or snippet is invalid.`, 502);
  }
  if (!validTimestamp(item.retrievedAt) || (item.publishedAt && !validTimestamp(item.publishedAt))) {
    throw new IntegrationError('jev_invalid_response', `evidence[${index}] timestamps are invalid.`, 502);
  }
  const sourceType = SOURCE_TYPES.has(item.sourceType) ? item.sourceType : 'other';
  return {
    id: safeIdentifier(item.id || `source-${index + 1}`, `evidence[${index}].id`, 502),
    url: url.toString(), title, snippet, sourceType,
    retrievedAt: item.retrievedAt,
    ...(item.publishedAt ? { publishedAt: item.publishedAt } : {})
  };
}

function validateHypothesis(item, index, sourceIds) {
  const text = String(item?.text || '').trim();
  if (!text || text.length > 800) throw new IntegrationError('jev_invalid_response', `hypotheses[${index}] is invalid.`, 502);
  const basedOn = Array.isArray(item.basedOn) ? item.basedOn.filter((id) => sourceIds.has(id)) : [];
  return { text, status: 'unverified', basedOn };
}

function validateBridgeResponse(payload, recipe) {
  if (!payload || typeof payload !== 'object') throw new IntegrationError('jev_invalid_response', 'Jev bridge returned invalid JSON.', 502);
  const status = payload.status;
  if (!['complete', 'queued'].includes(status)) throw new IntegrationError('jev_invalid_response', 'Jev bridge returned an invalid status.', 502);
  const retrievedAt = payload.retrievedAt;
  if (!validTimestamp(retrievedAt)) throw new IntegrationError('jev_invalid_response', 'Jev bridge omitted a valid retrievedAt timestamp.', 502);
  const evidence = status === 'complete'
    ? (Array.isArray(payload.evidence) ? payload.evidence.map(validateEvidence) : [])
    : [];
  if (status === 'complete' && evidence.length === 0) {
    throw new IntegrationError('jev_invalid_response', 'A complete Jev response must contain evidence.', 502);
  }
  const sourceIds = new Set();
  const sourceUrls = new Set();
  for (const item of evidence) {
    if (sourceIds.has(item.id) || sourceUrls.has(item.url)) {
      throw new IntegrationError('jev_invalid_response', 'Jev bridge returned duplicate evidence.', 502);
    }
    sourceIds.add(item.id);
    sourceUrls.add(item.url);
  }
  const hypotheses = Array.isArray(payload.hypotheses)
    ? payload.hypotheses.map((item, index) => validateHypothesis(item, index, sourceIds))
    : [];
  return {
    requestId: safeIdentifier(payload.requestId, 'requestId', 502),
    status,
    retrievedAt,
    recipe,
    evidence,
    hypotheses,
    cache: {
      hit: payload.cache?.hit === true,
      ageSeconds: Number.isFinite(payload.cache?.ageSeconds) ? Math.max(0, payload.cache.ageSeconds) : null,
      source: payload.cache?.hit === true ? 'bridge-reported' : 'none'
    }
  };
}

export async function researchWithJev(input, env, options = {}) {
  const normalized = validateInput(input);
  const base = requireHttpsBridge(env?.JEV_RESEARCH_BRIDGE_URL, 'jev_bridge_not_configured');
  const token = requireToken(env?.JEV_RESEARCH_BRIDGE_TOKEN, 'jev_bridge_token_not_configured');
  const timeoutMs = readBoundedInteger(env?.JEV_RESEARCH_TIMEOUT_MS, 25_000, 1_000, 60_000);
  const cacheTtlSeconds = readBoundedInteger(env?.JEV_RESEARCH_CACHE_TTL_SECONDS, 21_600, 300, 86_400);
  const recipe = buildResearchRecipe(normalized, cacheTtlSeconds);
  const endpoint = new URL('/v1/research', base);
  const { response, bytes } = await fetchAndReadWithTimeout(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...normalized, recipe })
  }, timeoutMs, 1_048_576, options.fetchImpl);
  if (!response.ok) {
    const status = [401, 403].includes(response.status) ? 502 : response.status >= 500 ? 502 : response.status;
    const code = [401, 403].includes(response.status) ? 'jev_bridge_auth_error' : 'jev_bridge_error';
    throw new IntegrationError(code, `Jev bridge returned HTTP ${response.status}.`, status);
  }
  let payload;
  try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new IntegrationError('jev_invalid_response', 'Jev bridge returned non-JSON content.', 502); }
  return validateBridgeResponse(payload, recipe);
}

export { IntegrationError };
