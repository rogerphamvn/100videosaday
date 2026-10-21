import { fetchAndReadWithTimeout } from './shared.mjs';
import { workflowProviderInternals } from './workflow-providers.mjs';

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const MAX_KEY_PREFLIGHT_BYTES = 65_536;
const MAX_CATALOG_PREFLIGHT_BYTES = 2_097_152;

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

function networkFailure(error) {
  if (error?.code === 'integration_timeout') return 'timeout';
  if (error?.code === 'integration_response_too_large') return 'response_too_large';
  if (error?.code === 'integration_redirect_blocked') return 'redirect_blocked';
  return 'network_error';
}

async function getJson(url, authorization, maxBytes, fetchImpl) {
  try {
    const { response, bytes } = await fetchAndReadWithTimeout(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { Authorization: authorization, Accept: 'application/json' }
    }, 15_000, maxBytes, fetchImpl);
    if (!response.ok) return { ok: false, status: [401, 403].includes(response.status) ? 'key_rejected' : 'provider_unavailable' };
    let payload;
    try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { return { ok: false, status: 'invalid_response' }; }
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, status: networkFailure(error) };
  }
}

export async function preflightWorkflowProviders(env = {}, options = {}) {
  const result = {
    executionEnabled: env.WORKFLOW_AI_EXECUTION_ENABLED === 'true',
    openrouter: {
      status: 'not_configured',
      phase: 'secret',
      checks: { key: 'not_checked', catalog: 'not_checked' },
      roles: roleStatus(env)
    },
    jev: { status: configured(env.JEV_RESEARCH_BRIDGE_URL) && configured(env.JEV_RESEARCH_BRIDGE_TOKEN) ? 'configured_unverified' : 'not_configured' },
    fal: providerPresence(env.FAL_KEY),
    replicate: providerPresence(env.REPLICATE_API_TOKEN)
  };
  if (!configured(env.OPENROUTER_API_KEY, 16)) return result;
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetch;
  const authorization = `Bearer ${env.OPENROUTER_API_KEY.trim()}`;
  result.openrouter.phase = 'key';
  const keyCheck = await getJson(OPENROUTER_KEY_URL, authorization, MAX_KEY_PREFLIGHT_BYTES, fetchImpl);
  if (!keyCheck.ok) {
    result.openrouter.status = keyCheck.status;
    result.openrouter.checks.key = keyCheck.status;
    return result;
  }
  if (!keyCheck.payload?.data || typeof keyCheck.payload.data !== 'object' || Array.isArray(keyCheck.payload.data)) {
    result.openrouter.status = 'invalid_response';
    result.openrouter.checks.key = 'invalid_response';
    return result;
  }
  result.openrouter.checks.key = 'verified';
  result.openrouter.phase = 'catalog';
  const modelCheck = await getJson(OPENROUTER_MODELS_URL, authorization, MAX_CATALOG_PREFLIGHT_BYTES, fetchImpl);
  if (!modelCheck.ok) {
    result.openrouter.status = modelCheck.status;
    result.openrouter.checks.catalog = modelCheck.status;
    return result;
  }
  if (!Array.isArray(modelCheck.payload?.data) || modelCheck.payload.data.some((item) => typeof item?.id !== 'string')) {
    result.openrouter.status = 'invalid_response';
    result.openrouter.checks.catalog = 'invalid_response';
    return result;
  }
  result.openrouter.checks.catalog = 'verified';
  result.openrouter.phase = 'roles';
  const catalogIds = new Set(modelCheck.payload.data.map((item) => item.id));
  result.openrouter.roles = roleStatus(env, catalogIds);
  result.openrouter.status = Object.values(result.openrouter.roles).every((role) => role.status === 'verified') ? 'verified' : 'role_mismatch';
  return result;
}

export const providerPreflightInternals = {
  OPENROUTER_KEY_URL,
  OPENROUTER_MODELS_URL,
  MAX_KEY_PREFLIGHT_BYTES,
  MAX_CATALOG_PREFLIGHT_BYTES,
  ROLE_BINDINGS
};
