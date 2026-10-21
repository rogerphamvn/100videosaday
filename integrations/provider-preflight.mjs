import { fetchAndReadWithTimeout } from './shared.mjs';
import { workflowProviderInternals } from './workflow-providers.mjs';

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const MAX_PREFLIGHT_BYTES = 1_048_576;

const ROLE_BINDINGS = Object.freeze({
  analyze: 'WORKFLOW_ANALYZE_MODEL_ID',
  research: 'WORKFLOW_RESEARCH_MODEL_ID',
  strategy: 'WORKFLOW_STRATEGY_MODEL_ID',
  prompt: 'WORKFLOW_PROMPT_MODEL_ID'
});

function configured(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

function providerPresence(value) {
  return { status: configured(value) ? 'configured_unverified' : 'not_configured' };
}

function roleStatus(env, catalogIds = null) {
  return Object.fromEntries(Object.entries(ROLE_BINDINGS).map(([role, binding]) => {
    const configuredValue = configured(env?.[binding]) ? env[binding].trim() : null;
    const allowedModelIds = workflowProviderInternals.STAGE_MODEL_POLICY[role];
    const configuredModelId = configuredValue && allowedModelIds.includes(configuredValue) ? configuredValue : null;
    let status = 'not_configured';
    if (configuredValue && !configuredModelId) status = 'role_mismatch';
    else if (configuredModelId && catalogIds && !catalogIds.has(configuredModelId)) status = 'catalog_missing';
    else if (configuredModelId && catalogIds) status = 'verified';
    else if (configuredModelId) status = 'configured_unverified';
    return [role, { status, configuredModelId, allowedModelIds }];
  }));
}

async function getJson(url, authorization, fetchImpl) {
  try {
    const { response, bytes } = await fetchAndReadWithTimeout(url, {
      method: 'GET',
      redirect: 'error',
      headers: { Authorization: authorization, Accept: 'application/json' }
    }, 15_000, MAX_PREFLIGHT_BYTES, fetchImpl);
    if (!response.ok) return { ok: false, status: [401, 403].includes(response.status) ? 'key_rejected' : 'network_error' };
    let payload;
    try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { return { ok: false, status: 'invalid_response' }; }
    return { ok: true, payload };
  } catch {
    return { ok: false, status: 'network_error' };
  }
}

export async function preflightWorkflowProviders(env = {}, options = {}) {
  const result = {
    executionEnabled: env.WORKFLOW_AI_EXECUTION_ENABLED === 'true',
    openrouter: { status: 'not_configured', roles: roleStatus(env) },
    jev: { status: configured(env.JEV_RESEARCH_BRIDGE_URL) && configured(env.JEV_RESEARCH_BRIDGE_TOKEN) ? 'configured_unverified' : 'not_configured' },
    fal: providerPresence(env.FAL_KEY),
    replicate: providerPresence(env.REPLICATE_API_TOKEN)
  };
  if (!configured(env.OPENROUTER_API_KEY, 16)) return result;
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetch;
  const authorization = `Bearer ${env.OPENROUTER_API_KEY.trim()}`;
  const keyCheck = await getJson(OPENROUTER_KEY_URL, authorization, fetchImpl);
  if (!keyCheck.ok) {
    result.openrouter.status = keyCheck.status;
    return result;
  }
  if (!keyCheck.payload?.data || typeof keyCheck.payload.data !== 'object' || Array.isArray(keyCheck.payload.data)) {
    result.openrouter.status = 'invalid_response';
    return result;
  }
  const modelCheck = await getJson(OPENROUTER_MODELS_URL, authorization, fetchImpl);
  if (!modelCheck.ok) {
    result.openrouter.status = modelCheck.status;
    return result;
  }
  if (!Array.isArray(modelCheck.payload?.data) || modelCheck.payload.data.some((item) => typeof item?.id !== 'string')) {
    result.openrouter.status = 'invalid_response';
    return result;
  }
  const catalogIds = new Set(modelCheck.payload.data.map((item) => item.id));
  result.openrouter.roles = roleStatus(env, catalogIds);
  result.openrouter.status = Object.values(result.openrouter.roles).every((role) => role.status === 'verified') ? 'verified' : 'role_mismatch';
  return result;
}

export const providerPreflightInternals = { OPENROUTER_KEY_URL, OPENROUTER_MODELS_URL, ROLE_BINDINGS };
