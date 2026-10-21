import { researchWithJev } from './research/jev-client.mjs';
import { IntegrationError, fetchAndReadWithTimeout } from './shared.mjs';
import { PilotBudgetError, commitPilotBudget, holdPilotBudget, reservePilotBudget } from './pilot-budget.mjs';
import megaPromptSchema from '../contracts/mega-prompt.schema.json' with { type: 'json' };
import negativePromptSchema from '../contracts/negative-prompt.schema.json' with { type: 'json' };

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';
const MAX_PROVIDER_RESPONSE_BYTES = 1_048_576;
const PILOT_MAX_USD = 2;
const PILOT_STAGE_OUTPUT_TOKENS = Object.freeze({ analyze: 2_048, research: 3_072, strategy: 3_072, prompts: 8_192 });
// This deliberately exceeds Claude's documented visual-token ceiling for a
// single bounded image. The workflow upload path independently enforces a
// 1,600 px maximum edge before any provider request is constructed.
const PILOT_IMAGE_TOKEN_ALLOWANCE = 20_000;
const PILOT_REQUEST_OVERHEAD_TOKENS = 2_048;
const PILOT_WEB_SEARCH_ALLOWANCE_USD = 0.02;
const PROMPT_AUTHOR_MODELS = new Map([
  ['anthropic/claude-opus-5.5', 'claude-opus-5.5'],
  ['openai/gpt-6.1-sol', 'gpt-6.1-sol']
]);
const STAGE_MODEL_POLICY = Object.freeze({
  analyze: ['anthropic/claude-opus-5.5'],
  research: ['google/gemini-3.8-flash'],
  strategy: ['anthropic/claude-opus-5.5'],
  prompt: [...PROMPT_AUTHOR_MODELS.keys()]
});

const MEDIA_CAPABILITIES = new Map([
  ['fal:openai/gpt-image-2.5/flare/text-to-image', { mediaType: 'image', negativeChannel: false, inputProfile: 'fal-image' }],
  ['fal:openai/gpt-image-2.5/sunburst/text-to-image', { mediaType: 'image', negativeChannel: false, inputProfile: 'fal-image' }],
  ['fal:google/gemini-omni-flash/v1.1/text-to-video', { mediaType: 'video', negativeChannel: false, inputProfile: 'fal-video', aspectRatios: ['16:9', '9:16'], durationPolicy: 'env_preflight' }],
  ['fal:bytedance/seedance-2.5/text-to-video', { mediaType: 'video', negativeChannel: false, inputProfile: 'fal-video', aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'], minDuration: 4, maxDuration: 30 }],
  ['replicate:openai/gpt-image-2.5-flare', { mediaType: 'image', negativeChannel: false, inputProfile: 'replicate-image' }],
  ['replicate:openai/gpt-image-2.5-sunburst', { mediaType: 'image', negativeChannel: false, inputProfile: 'replicate-image' }],
  ['replicate:google/gemini-omni-1.1', { mediaType: 'video', negativeChannel: false, inputProfile: 'replicate-video', aspectRatios: ['16:9', '9:16'], durationPolicy: 'env_preflight' }],
  ['replicate:bytedance/seedance-2.5', { mediaType: 'video', negativeChannel: false, inputProfile: 'replicate-video', aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'], minDuration: 4, maxDuration: 30 }]
]);

export class WorkflowProviderError extends Error {
  constructor(code, message, status = 502, details = undefined) {
    super(message);
    this.name = 'WorkflowProviderError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function requiredEnv(env, name, minimum = 1) {
  const value = typeof env?.[name] === 'string' ? env[name].trim() : '';
  if (value.length < minimum) throw new WorkflowProviderError('provider_not_configured', `${name} is not configured.`, 503, { binding: name });
  return value;
}

function requiredStageModel(env, stage) {
  const binding = `WORKFLOW_${stage.toUpperCase()}_MODEL_ID`;
  const modelId = requiredEnv(env, binding);
  const allowed = STAGE_MODEL_POLICY[stage] || [];
  if (!allowed.includes(modelId)) {
    throw new WorkflowProviderError('workflow_model_policy_mismatch', `${binding} does not match the approved workflow role.`, 503, { binding, modelId, allowed });
  }
  return modelId;
}

function requireAiExecutionEnabled(env, options = {}) {
  if (env?.WORKFLOW_AI_EXECUTION_ENABLED === 'true') return 'general';
  if (env?.WORKFLOW_PILOT_EXECUTION_ENABLED === 'true' && options?.pilotContext) return 'pilot';
  throw new WorkflowProviderError('ai_execution_disabled', 'Workflow AI execution is disabled. Provider credentials alone never enable paid calls.', 503);
}

function fetchImpl(options) {
  return typeof options?.fetchImpl === 'function' ? options.fetchImpl : fetch;
}

function decodeJson(bytes, code = 'provider_invalid_response') {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new WorkflowProviderError(code, 'Provider returned invalid JSON.', 502);
  }
}

async function openRouterCatalog(env, options = {}) {
  const apiKey = requiredEnv(env, 'OPENROUTER_API_KEY', 16);
  const { response, bytes } = await fetchAndReadWithTimeout(OPENROUTER_MODELS_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
  }, 20_000, MAX_PROVIDER_RESPONSE_BYTES, fetchImpl(options));
  if (!response.ok) throw new WorkflowProviderError('openrouter_catalog_failed', `OpenRouter catalog returned HTTP ${response.status}.`, 502);
  const payload = decodeJson(bytes, 'openrouter_catalog_invalid');
  if (!Array.isArray(payload?.data)) throw new WorkflowProviderError('openrouter_catalog_invalid', 'OpenRouter catalog omitted data.', 502);
  return payload.data;
}

function safeNumber(value) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export async function openRouterPilotKeyStatus(env, options = {}) {
  const apiKey = requiredEnv(env, 'OPENROUTER_API_KEY', 16);
  const { response, bytes } = await fetchAndReadWithTimeout(OPENROUTER_KEY_URL, {
    method: 'GET', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
  }, 20_000, MAX_PROVIDER_RESPONSE_BYTES, fetchImpl(options));
  if (!response.ok) throw new WorkflowProviderError('openrouter_key_status_failed', `OpenRouter key status returned HTTP ${response.status}.`, 502);
  const payload = decodeJson(bytes, 'openrouter_key_status_invalid')?.data;
  const limitUsd = safeNumber(payload?.limit);
  const remainingUsd = safeNumber(payload?.limit_remaining);
  const rawReset = payload?.limit_reset;
  const reset = rawReset === null ? null : ['daily', 'weekly', 'monthly'].includes(rawReset) ? rawReset : 'unknown';
  const includesByok = payload?.include_byok_in_limit === true;
  const hardCapReady = limitUsd !== null && limitUsd <= PILOT_MAX_USD && remainingUsd !== null && remainingUsd <= PILOT_MAX_USD && reset === null && includesByok;
  return { limitUsd, remainingUsd, reset, includesByok, hardCapReady };
}

async function requireCatalogModel(modelId, env, options, { imageInput = false, authoring = false } = {}) {
  if (!modelId) throw new WorkflowProviderError('provider_not_configured', 'Workflow model ID is not configured.', 503);
  if (authoring && !PROMPT_AUTHOR_MODELS.has(modelId)) {
    throw new WorkflowProviderError('prompt_author_model_not_approved', 'Prompt author model must be an approved Opus or Sol mapping.', 503, { requestedModelId: modelId });
  }
  const catalog = await openRouterCatalog(env, options);
  const model = catalog.find((item) => item?.id === modelId);
  if (!model) throw new WorkflowProviderError('model_unavailable', 'Configured model ID is absent from the runtime OpenRouter catalog.', 503, { requestedModelId: modelId });
  const inputModalities = model.architecture?.input_modalities ?? model.architecture?.modality ?? [];
  if (imageInput && !String(Array.isArray(inputModalities) ? inputModalities.join(',') : inputModalities).toLowerCase().includes('image')) {
    throw new WorkflowProviderError('model_capability_missing', 'Configured analysis model does not advertise image input.', 503, { requestedModelId: modelId });
  }
  return model;
}

function messageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((item) => typeof item === 'string' ? item : item?.text || '').join('');
  return '';
}

function parseModelJson(text) {
  const trimmed = String(text || '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '');
  try { return JSON.parse(trimmed); } catch { throw new WorkflowProviderError('model_output_invalid', 'Model did not return the required JSON object.', 502); }
}

async function throwBudgetReconciling(reservation, reason, env) {
  if (reservation) await holdPilotBudget(reservation.id, reason, env);
  throw new WorkflowProviderError(
    'budget_reconciling',
    'The paid provider outcome requires manual budget reconciliation before any further request.',
    409,
    { retryable: false, resumeSameRun: false, reservationState: 'held' }
  );
}

function throwPaidStageLocked(error, options) {
  if (!options?.pilotContext) throw error;
  throw new WorkflowProviderError(
    'paid_stage_locked',
    'The provider cost was recorded, but this stage output failed validation. Automatic paid retry is disabled; replace the stage through the reviewed import path.',
    409,
    { retryable: false, resumeSameRun: false, manualImportRequired: true, validationCode: String(error?.code || 'stage_output_invalid').slice(0, 80) }
  );
}

function catalogPrice(catalogModel, field) {
  const price = safeNumber(catalogModel?.pricing?.[field]);
  if (price === null || price <= 0) throw new WorkflowProviderError('pilot_pricing_unavailable', `OpenRouter catalog omitted a usable ${field} price.`, 503);
  return price;
}

function messagesWithoutImageTransport(messages) {
  return messages.map((message) => ({
    ...message,
    content: Array.isArray(message?.content)
      ? message.content.map((item) => item?.type === 'image_url'
        ? { ...item, image_url: { ...(item.image_url || {}), url: '[bounded-image-input]' } }
        : item)
      : message?.content
  }));
}

function estimatePilotCall({ stage, requestBody, catalogModel, imageInput, webSearch }) {
  const maxOutputTokens = PILOT_STAGE_OUTPUT_TOKENS[stage];
  const contextLength = Number(catalogModel?.context_length);
  if (!Number.isInteger(maxOutputTokens) || !Number.isFinite(contextLength) || contextLength <= maxOutputTokens) {
    throw new WorkflowProviderError('pilot_pricing_unavailable', 'Model context or stage output limit is unavailable.', 503);
  }
  const promptPrice = catalogPrice(catalogModel, 'prompt');
  const completionPrice = catalogPrice(catalogModel, 'completion');
  const requestBytes = new TextEncoder().encode(JSON.stringify(messagesWithoutImageTransport(requestBody.messages))).byteLength;
  const imageCount = imageInput ? requestBody.messages.flatMap((message) => Array.isArray(message.content) ? message.content : []).filter((item) => item?.type === 'image_url').length : 0;
  let inputTokens = requestBytes + PILOT_REQUEST_OVERHEAD_TOKENS + imageCount * PILOT_IMAGE_TOKEN_ALLOWANCE;
  // Search-result excerpts are server-injected. Reserving the entire remaining
  // context is intentionally conservative and avoids guessing their token size.
  if (webSearch) inputTokens = contextLength - maxOutputTokens;
  if (inputTokens + maxOutputTokens > contextLength) throw new WorkflowProviderError('pilot_context_exceeded', 'The bounded request can exceed the model context.', 413);
  const webCost = webSearch ? Math.max(safeNumber(catalogModel?.pricing?.web_search) || 0, PILOT_WEB_SEARCH_ALLOWANCE_USD) : 0;
  const estimatedUsd = inputTokens * promptPrice + maxOutputTokens * completionPrice + webCost;
  if (!Number.isFinite(estimatedUsd) || estimatedUsd <= 0 || estimatedUsd > PILOT_MAX_USD) {
    throw new WorkflowProviderError('pilot_call_exceeds_budget', 'This call cannot fit inside the USD 2 pilot envelope.', 409);
  }
  return { estimatedUsd, inputTokens, imageCount, maxOutputTokens, promptPrice, completionPrice };
}

function extractCitations(payload) {
  const message = payload?.choices?.[0]?.message || {};
  const candidates = [...(Array.isArray(message.annotations) ? message.annotations : []), ...(Array.isArray(message.citations) ? message.citations : [])];
  const citations = [];
  for (const item of candidates) {
    const citation = item?.url_citation || item?.citation || item;
    const rawUrl = typeof citation === 'string' ? citation : citation?.url;
    if (typeof rawUrl !== 'string') continue;
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:' || url.username || url.password) continue;
      citations.push({
        url: url.href,
        title: typeof citation?.title === 'string' ? citation.title.trim().slice(0, 500) : '',
        snippet: typeof citation?.content === 'string' ? citation.content.trim().slice(0, 2_000) : ''
      });
    } catch { /* ignore malformed provider citations */ }
  }
  return [...new Map(citations.map((item) => [item.url, item])).values()];
}

async function callOpenRouterJson({ modelId, stage, system, content, imageInput = false, authoring = false, webSearch = false }, env, options = {}) {
  const apiKey = requiredEnv(env, 'OPENROUTER_API_KEY', 16);
  const catalogModel = await requireCatalogModel(modelId, env, options, { imageInput, authoring });
  const supported = Array.isArray(catalogModel.supported_parameters) ? catalogModel.supported_parameters : [];
  const requestBody = {
    model: modelId,
    messages: [{ role: 'system', content: system }, { role: 'user', content }],
    usage: { include: true }
  };
  if (supported.includes('temperature')) requestBody.temperature = 0.2;
  if (supported.includes('response_format')) requestBody.response_format = { type: 'json_object' };
  if (webSearch) {
    if (!supported.includes('tools')) throw new WorkflowProviderError('model_capability_missing', 'Configured research model does not advertise tool use.', 503, { requestedModelId: modelId });
    requestBody.tools = [{ type: 'openrouter:web_search', parameters: { engine: 'exa', max_uses: 1, max_results: 3, max_total_results: 3 } }];
    requestBody.max_tool_calls = 1;
  }

  const executionMode = requireAiExecutionEnabled(env, options);
  let reservation = null;
  if (executionMode === 'pilot') {
    if (!supported.includes('max_completion_tokens')) {
      throw new WorkflowProviderError('model_capability_missing', 'Configured model does not advertise max_completion_tokens required by the pilot cap.', 503, { requestedModelId: modelId });
    }
    const estimate = estimatePilotCall({ stage, requestBody, catalogModel, imageInput, webSearch });
    requestBody.max_completion_tokens = estimate.maxOutputTokens;
    requestBody.provider = {
      allow_fallbacks: false,
      require_parameters: true,
      max_price: { prompt: estimate.promptPrice * 1_000_000, completion: estimate.completionPrice * 1_000_000 }
    };
    const keyStatus = await openRouterPilotKeyStatus(env, options);
    if (!keyStatus.hardCapReady || keyStatus.remainingUsd < estimate.estimatedUsd) {
      throw new WorkflowProviderError('openrouter_pilot_key_cap_required', 'OpenRouter key must have a non-resetting total limit of at most USD 2, include BYOK usage, and have enough remaining allowance.', 503, { keyStatus });
    }
    try {
      reservation = await reservePilotBudget({ ...options.pilotContext, stage, modelId, amountUsd: estimate.estimatedUsd }, env);
    } catch (error) {
      if (error instanceof PilotBudgetError) throw new WorkflowProviderError(error.code, error.message, error.status, error.details);
      throw error;
    }
  }

  let response, bytes;
  try {
    ({ response, bytes } = await fetchAndReadWithTimeout(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody)
    }, 60_000, MAX_PROVIDER_RESPONSE_BYTES, fetchImpl(options)));
  } catch (error) {
    if (reservation) await throwBudgetReconciling(reservation, 'provider_outcome_uncertain', env);
    throw error;
  }
  if (!response.ok) {
    if (reservation) await throwBudgetReconciling(reservation, 'provider_http_error', env);
    throw new WorkflowProviderError('openrouter_request_failed', `OpenRouter returned HTTP ${response.status}.`, response.status === 429 ? 503 : 502);
  }
  let payload;
  try { payload = decodeJson(bytes, 'openrouter_invalid_response'); }
  catch (error) {
    if (reservation) await throwBudgetReconciling(reservation, 'provider_response_invalid', env);
    throw error;
  }
  const actualModelId = typeof payload?.model === 'string' ? payload.model : '';
  const providerRunId = typeof payload?.id === 'string' ? payload.id : '';
  if (!actualModelId || !providerRunId) {
    if (reservation) await throwBudgetReconciling(reservation, 'provider_provenance_missing', env);
    throw new WorkflowProviderError('openrouter_provenance_missing', 'OpenRouter omitted actual model or run ID.', 502);
  }
  if (actualModelId !== modelId) {
    if (reservation) await throwBudgetReconciling(reservation, 'provider_model_mismatch', env);
    throw new WorkflowProviderError(authoring ? 'prompt_author_model_mismatch' : 'model_execution_mismatch', 'Actual model does not match the approved configured model.', 502, { requestedModelId: modelId, actualModelId });
  }
  if (authoring && !PROMPT_AUTHOR_MODELS.has(actualModelId)) {
    if (reservation) await throwBudgetReconciling(reservation, 'provider_model_mismatch', env);
    throw new WorkflowProviderError('prompt_author_model_mismatch', 'Actual prompt author is outside the approved model family.', 502, { requestedModelId: modelId, actualModelId });
  }
  if (webSearch && Number(payload?.usage?.server_tool_use?.web_search_requests) !== 1) {
    if (reservation) await throwBudgetReconciling(reservation, 'web_search_usage_unverified', env);
    throw new WorkflowProviderError('web_search_usage_unverified', 'OpenRouter did not confirm exactly one bounded web-search request.', 502);
  }
  if (reservation) {
    const actualCost = safeNumber(payload?.usage?.cost ?? payload?.usage?.total_cost);
    if (actualCost === null) {
      await throwBudgetReconciling(reservation, 'provider_usage_missing', env);
    }
    try {
      await commitPilotBudget(reservation.id, { actualUsd: actualCost, providerRunId }, env);
    } catch (error) {
      await throwBudgetReconciling(reservation, 'settlement_failed', env);
    }
  }
  let output;
  try { output = parseModelJson(messageContent(payload)); }
  catch (error) { throwPaidStageLocked(error, options); }
  return {
    output,
    citations: extractCitations(payload),
    provenance: {
      origin: 'model',
      provider: 'openrouter',
      requestedModelId: modelId,
      actualModelId,
      providerRunId,
      verificationStatus: 'actual_invocation_verified',
      raw: { id: payload.id, model: payload.model, provider: payload.provider ?? null, usage: payload.usage ?? null }
    }
  };
}

function nonEmptyArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw new WorkflowProviderError('model_output_invalid', `${field} must be a non-empty array.`, 502);
}

function validateAnalysis(output) {
  if (!output || typeof output !== 'object') throw new WorkflowProviderError('model_output_invalid', 'Analysis output must be an object.', 502);
  boundedString(output.productName, 'productName', 200);
  boundedString(output.category, 'category', 200);
  for (const field of ['observedFeatures', 'targetHypotheses', 'painPoints', 'useCases', 'unknowns']) nonEmptyArray(output[field], field);
  for (const field of ['observedFeatures', 'targetHypotheses', 'painPoints', 'useCases', 'unknowns']) boundedArray(output[field], field, 50);
  return output;
}

function boundedString(value, field, maximum = 2_000) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new WorkflowProviderError('model_output_invalid', `${field} must be non-empty text up to ${maximum} characters.`, 502);
}

function boundedArray(value, field, maximumItems) {
  if (value.length > maximumItems) throw new WorkflowProviderError('model_output_invalid', `${field} exceeds ${maximumItems} items.`, 502);
  for (const [index, item] of value.entries()) {
    if (typeof item === 'string') boundedString(item, `${field}[${index}]`);
    else if (!item || typeof item !== 'object' || JSON.stringify(item).length > 8_000) throw new WorkflowProviderError('model_output_invalid', `${field}[${index}] is invalid or too large.`, 502);
  }
}

function validateCitedItems(items, field, evidenceIds) {
  nonEmptyArray(items, field);
  boundedArray(items, field, 50);
  for (const [index, item] of items.entries()) {
    if (!item || typeof item.statement !== 'string' || !item.statement.trim()) throw new WorkflowProviderError('model_output_invalid', `${field}[${index}].statement is required.`, 502);
    if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0 || item.evidenceRefs.some((id) => !evidenceIds.has(id))) {
      throw new WorkflowProviderError('uncited_research_output', `${field}[${index}] must cite returned research evidence IDs.`, 502);
    }
  }
}

export async function analyzeProduct({ project, sources }, env, options = {}) {
  requireAiExecutionEnabled(env, options);
  if (!Array.isArray(sources) || sources.length === 0) throw new WorkflowProviderError('source_required', 'At least one product or packaging image is required.', 409);
  const modelId = requiredStageModel(env, 'analyze');
  const content = [{ type: 'text', text: `Analyze only visible product evidence. Project: ${JSON.stringify(project)}. Return JSON keys productName, category, observedFeatures, targetHypotheses, painPoints, useCases, unknowns. Label inference as hypotheses; never invent claims.` }];
  for (const source of sources) content.push({ type: 'image_url', image_url: { url: source.dataUrl } });
  const result = await callOpenRouterJson({ modelId, stage: 'analyze', imageInput: true, system: 'You are an evidence-bounded product analyst. Output JSON only.', content }, env, options);
  try { result.output = validateAnalysis(result.output); }
  catch (error) { throwPaidStageLocked(error, options); }
  return result;
}

export async function researchProduct({ project, analysis }, env, options = {}) {
  requireAiExecutionEnabled(env, options);
  const query = `${project.product}; ${analysis.productName || ''}; ${analysis.category || ''}`.slice(0, 400);
  if (String(env?.WORKFLOW_RESEARCH_PROVIDER || 'JEV').toUpperCase() === 'OPENROUTER') {
    return researchWithOpenRouter({ project, analysis, query }, env, options);
  }
  let jev;
  try {
    jev = await researchWithJev({ projectId: project.id, market: normalizeMarket(project.market), query }, env, { fetchImpl: fetchImpl(options) });
  } catch (error) {
    if (error instanceof IntegrationError) throw new WorkflowProviderError(error.code, error.message, error.status, error.details);
    throw error;
  }
  if (jev.status !== 'complete') throw new WorkflowProviderError('research_pending', 'Jev research is queued; resume after evidence is complete.', 503, { jevRequestId: jev.requestId, jevStatus: jev.status, resumeMode: 'same_project_query' });
  const modelId = requiredStageModel(env, 'research');
  const result = await callOpenRouterJson({
    modelId, stage: 'research',
    system: 'Synthesize only from supplied dated evidence. Output JSON only and cite evidence IDs on every claim.',
    content: JSON.stringify({ analysis, evidence: jev.evidence, required: { keys: ['motivators', 'trends', 'painPoints', 'useCases'], item: { statement: 'string', evidenceRefs: ['source-id'] } } })
  }, env, options);
  try {
    if (!result.output || typeof result.output !== 'object') throw new WorkflowProviderError('model_output_invalid', 'Research synthesis must be an object.', 502);
    const evidenceIds = new Set(jev.evidence.map((item) => item.id));
    for (const field of ['motivators', 'trends', 'painPoints', 'useCases']) validateCitedItems(result.output[field], field, evidenceIds);
  } catch (error) { throwPaidStageLocked(error, options); }
  return {
    output: { retrievedAt: jev.retrievedAt, evidence: jev.evidence, hypotheses: jev.hypotheses, synthesis: result.output, jev: { requestId: jev.requestId, cache: jev.cache, recipe: jev.recipe } },
    provenance: { ...result.provenance, jevRequestId: jev.requestId, jevRetrievedAt: jev.retrievedAt }
  };
}

function validateResearchUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    return url.href;
  } catch {
    throw new WorkflowProviderError('research_evidence_invalid', 'OpenRouter research evidence requires credential-free HTTPS URLs.', 502);
  }
}

async function researchWithOpenRouter({ project, analysis, query }, env, options) {
  const modelId = requiredStageModel(env, 'research');
  const retrievedAt = new Date().toISOString();
  const result = await callOpenRouterJson({
    modelId,
    stage: 'research',
    webSearch: true,
    system: 'Research current product demand, pain points, motivators, use cases and creative trends with the supplied web-search tool. Output JSON only. Every evidence URL must come from the tool citations. Do not invent publication dates.',
    content: JSON.stringify({
      query,
      market: normalizeMarket(project.market),
      analysis,
      required: {
        evidence: [{ id: 'source-1', url: 'https://cited-source.example/path', sourceType: 'official|search|marketplace|social|forum|video|ads|other' }],
        synthesis: Object.fromEntries(['motivators', 'trends', 'painPoints', 'useCases'].map((field) => [field, [{ statement: 'string', evidenceRefs: ['source-1'] }]])),
        hypotheses: [{ text: 'string', basedOn: ['source-1'] }]
      }
    })
  }, env, options);
  try {
  if (!result.output || typeof result.output !== 'object') throw new WorkflowProviderError('model_output_invalid', 'OpenRouter research output must be an object.', 502);
  nonEmptyArray(result.output.evidence, 'evidence');
  boundedArray(result.output.evidence, 'evidence', 20);
  if (result.citations.length === 0) throw new WorkflowProviderError('research_citations_missing', 'OpenRouter web search returned no machine-verifiable citations.', 502);
  const citationByUrl = new Map(result.citations.map((item) => [item.url, item]));
  const evidenceIds = new Set();
  const evidence = result.output.evidence.map((item, index) => {
    const id = typeof item?.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(item.id) ? item.id : `source-${index + 1}`;
    if (evidenceIds.has(id)) throw new WorkflowProviderError('research_evidence_invalid', 'OpenRouter research evidence IDs must be unique.', 502);
    evidenceIds.add(id);
    const url = validateResearchUrl(item?.url);
    const citation = citationByUrl.get(url);
    if (!citation) throw new WorkflowProviderError('research_citation_mismatch', 'Every OpenRouter research URL must match a provider citation.', 502, { evidenceId: id });
    boundedString(citation.title, `citation[${index}].title`, 500);
    boundedString(citation.snippet, `citation[${index}].snippet`, 2_000);
    const sourceType = ['official', 'search', 'marketplace', 'social', 'forum', 'video', 'ads', 'other'].includes(item?.sourceType) ? item.sourceType : 'other';
    return { id, url, title: citation.title, snippet: citation.snippet, sourceType, retrievedAt };
  });
  for (const field of ['motivators', 'trends', 'painPoints', 'useCases']) validateCitedItems(result.output.synthesis?.[field], field, evidenceIds);
  const hypotheses = Array.isArray(result.output.hypotheses) ? result.output.hypotheses.slice(0, 50).map((item) => ({ ...item, status: 'unverified' })) : [];
  return {
    output: { retrievedAt, evidence, hypotheses, synthesis: result.output.synthesis, openrouter: { engine: 'exa', maxToolCalls: 1, maxResults: 3, citationCount: result.citations.length } },
    provenance: { ...result.provenance, researchProvider: 'openrouter', webSearchEngine: 'exa', webRetrievedAt: retrievedAt }
  };
  } catch (error) { throwPaidStageLocked(error, options); }
}

function normalizeMarket(value) {
  const upper = String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  if (upper === 'VN' || upper.includes('VIET')) return 'VN';
  if (upper === 'US' || upper.includes('UNITED STATES')) return 'US';
  return 'GLOBAL';
}

export async function createStrategy({ project, analysis, research }, env, options = {}) {
  requireAiExecutionEnabled(env, options);
  const modelId = requiredStageModel(env, 'strategy');
  const result = await callOpenRouterJson({
    modelId, stage: 'strategy',
    system: 'Create evidence-linked motivators, taste and testable hooks. Output JSON only. Do not claim performance.',
    content: JSON.stringify({
      project, analysis, research,
      required: {
        motivators: { type: 'array', item: { statement: 'string', strengthRationale: 'string', evidenceRefs: ['research evidence ID'] } },
        taste: { type: 'object', required: ['direction'] },
        hooks: { type: 'array', item: { title: 'string', painPoint: 'string', useCase: 'string', testHypothesis: 'string', strengthRationale: 'string', evidenceRefs: ['research evidence ID'] } }
      }
    })
  }, env, options);
  try {
  nonEmptyArray(result.output?.motivators, 'motivators');
  nonEmptyArray(result.output?.hooks, 'hooks');
  if (!result.output?.taste || typeof result.output.taste !== 'object') throw new WorkflowProviderError('model_output_invalid', 'taste must be an object.', 502);
  boundedArray(result.output.motivators, 'motivators', 20);
  boundedArray(result.output.hooks, 'hooks', 50);
  const evidenceIds = new Set((research?.evidence || []).map((item) => item.id));
  for (const field of ['motivators', 'hooks']) {
    for (const [index, item] of result.output[field].entries()) {
      boundedString(item.statement || item.hook || item.title, `${field}[${index}] statement`, 1_000);
      boundedString(item.strengthRationale, `${field}[${index}].strengthRationale`, 1_500);
      if (field === 'hooks') {
        boundedString(item.painPoint, `${field}[${index}].painPoint`, 1_000);
        boundedString(item.useCase, `${field}[${index}].useCase`, 1_000);
        boundedString(item.testHypothesis, `${field}[${index}].testHypothesis`, 1_500);
      }
      if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0 || item.evidenceRefs.some((ref) => !evidenceIds.has(ref))) {
        throw new WorkflowProviderError('uncited_strategy_output', `${field}[${index}] must cite research evidence IDs.`, 502);
      }
    }
  }
  if (JSON.stringify(result.output.taste).length > 32_000) throw new WorkflowProviderError('model_output_invalid', 'taste is too large.', 502);
  return result;
  } catch (error) { throwPaidStageLocked(error, options); }
}

export async function authorPromptPair({ project, sources, sourceSnapshotId, analysis, research, strategy }, env, options = {}) {
  requireAiExecutionEnabled(env, options);
  const modelId = requiredStageModel(env, 'prompt');
  const promptId = `mp_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`;
  const negativePromptId = `np_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`;
  const authoredAt = new Date().toISOString();
  const result = await callOpenRouterJson({
    modelId, stage: 'prompts',
    authoring: true,
    system: 'Author the canonical Creative Hook Lab megaPrompt and negativePrompt JSON pair. Output exactly {"megaPrompt":{},"negativePrompt":{}}. Bind negativePrompt to exact mega prompt ID and revision. Represent every supplied upload exactly once as productEvidence=true with its exact contentHash, hashStatus="verified_bytes", product uploads kind="product_photo", packaging uploads kind="packaging_photo". Add an exact product_identity or packaging_identity productLock reference to each matching evidenceId. Use supplied source hashes and citations only. No human claim registry is supplied: set approvedClaims=[], every sourceEvidence.reviewStatus="unverified", strategy.hook.claimRefs=[], and every textOverlays array=[]. Never self-approve a claim or evidence item.',
    content: JSON.stringify({
      project, sourceSnapshotId,
      sources: sources.map(({ id, kind, mimeType, contentHash }) => ({ id, kind, mimeType, contentHash })),
      analysis, research, strategy,
      contract: {
        schemas: { megaPrompt: megaPromptSchema, negativePrompt: negativePromptSchema },
        fixed: {
          megaPrompt: { schemaVersion: 'creative-hook-lab.mega-prompt/1.0.0', promptId, revision: 1 },
          negativePrompt: { schemaVersion: 'creative-hook-lab.negative-prompt/1.0.0', negativePromptId, revision: 1, megaPromptId: promptId, megaPromptRevision: 1 },
          provenance: { projectId: project.id, sourceSnapshotId, compilerContract: 'allowlisted-provider-adapter/v1', providerPayloadPolicy: 'compile_known_fields_only' }
        },
        runtimeBoundAfterResponse: ['authorship.modelFamily', 'authorship.authoredAt', 'authorship.verificationStatus', 'authorship.invocationRef']
      }
    })
  }, env, options);
  try {
  if (!result.output?.megaPrompt || !result.output?.negativePrompt) throw new WorkflowProviderError('model_output_invalid', 'Prompt author omitted the canonical pair.', 502);
  const modelFamily = PROMPT_AUTHOR_MODELS.get(result.provenance.actualModelId);
  const authorship = { modelFamily, authoringMode: 'model_authored', authoredAt, verificationStatus: 'actual_invocation_verified', invocationRef: result.provenance.providerRunId };
  result.output.megaPrompt.schemaVersion = 'creative-hook-lab.mega-prompt/1.0.0';
  result.output.megaPrompt.promptId = promptId;
  result.output.megaPrompt.revision = 1;
  result.output.megaPrompt.authorship = { ...authorship };
  result.output.megaPrompt.provenance = { ...(result.output.megaPrompt.provenance || {}), projectId: project.id, sourceSnapshotId, compilerContract: 'allowlisted-provider-adapter/v1', providerPayloadPolicy: 'compile_known_fields_only' };
  result.output.negativePrompt.schemaVersion = 'creative-hook-lab.negative-prompt/1.0.0';
  result.output.negativePrompt.negativePromptId = negativePromptId;
  result.output.negativePrompt.revision = 1;
  result.output.negativePrompt.megaPromptId = promptId;
  result.output.negativePrompt.megaPromptRevision = 1;
  result.output.negativePrompt.mediaType = result.output.megaPrompt.mediaType;
  result.output.negativePrompt.authorship = { ...authorship };
  result.output.negativePrompt.provenance = { ...(result.output.negativePrompt.provenance || {}), projectId: project.id, sourceSnapshotId, compilerContract: 'allowlisted-provider-adapter/v1', providerPayloadPolicy: 'compile_known_fields_only' };
  return result;
  } catch (error) { throwPaidStageLocked(error, options); }
}

function workflowModel(env, stage) {
  const value = typeof env?.[`WORKFLOW_${stage.toUpperCase()}_MODEL_ID`] === 'string'
    ? env[`WORKFLOW_${stage.toUpperCase()}_MODEL_ID`].trim()
    : '';
  return (STAGE_MODEL_POLICY[stage] || []).includes(value) ? value : null;
}

function mappedMediaModel(env, binding, provider, mediaType) {
  const value = typeof env?.[binding] === 'string' ? env[binding].trim() : '';
  const capability = MEDIA_CAPABILITIES.get(`${provider}:${value}`);
  return capability?.mediaType === mediaType ? value : null;
}

export function workflowProviderReadiness(env = {}) {
  const researchProvider = String(env.WORKFLOW_RESEARCH_PROVIDER || 'JEV').toUpperCase() === 'OPENROUTER' ? 'openrouter' : 'jev';
  const mediaBindings = {
    'fal:image': 'WORKFLOW_FAL_IMAGE_MODEL_ID',
    'fal:video': 'WORKFLOW_FAL_VIDEO_MODEL_ID',
    'replicate:image': 'WORKFLOW_REPLICATE_IMAGE_MODEL_ID',
    'replicate:video': 'WORKFLOW_REPLICATE_VIDEO_MODEL_ID'
  };
  const modelChoices = [...MEDIA_CAPABILITIES.entries()].map(([key, capability]) => {
    const [provider, ...modelParts] = key.split(':');
    const modelId = modelParts.join(':');
    const binding = mediaBindings[`${provider}:${capability.mediaType}`];
    return {
      provider,
      mediaType: capability.mediaType,
      modelId,
      configured: Boolean(binding && env?.[binding] === modelId),
      supported: true,
      executionImplemented: false,
      status: 'planning_only'
    };
  });
  for (const mediaType of ['image', 'video']) modelChoices.push({
    provider: 'openrouter', mediaType, modelId: null, configured: false,
    supported: false, executionImplemented: false, status: 'adapter_not_implemented'
  });
  return {
    executionEnabled: env.WORKFLOW_AI_EXECUTION_ENABLED === 'true',
    pilotExecutionEnabled: env.WORKFLOW_PILOT_EXECUTION_ENABLED === 'true',
    openrouter: {
      configured: typeof env.OPENROUTER_API_KEY === 'string' && env.OPENROUTER_API_KEY.length >= 16,
      models: {
        analyze: workflowModel(env, 'analyze'),
        research: workflowModel(env, 'research'),
        strategy: workflowModel(env, 'strategy'),
        prompts: workflowModel(env, 'prompt')
      },
      modelPolicy: STAGE_MODEL_POLICY,
      policySatisfied: Object.entries(STAGE_MODEL_POLICY).every(([stage, allowed]) => allowed.includes(workflowModel(env, stage))),
      catalogPreflightRequired: true
    },
    jev: {
      configured: typeof env.JEV_RESEARCH_BRIDGE_URL === 'string' && typeof env.JEV_RESEARCH_BRIDGE_TOKEN === 'string',
      datedCitationsRequired: true
    },
    research: {
      provider: researchProvider,
      configured: researchProvider === 'openrouter'
        ? typeof env.OPENROUTER_API_KEY === 'string' && env.OPENROUTER_API_KEY.length >= 16 && Boolean(workflowModel(env, 'research'))
        : typeof env.JEV_RESEARCH_BRIDGE_URL === 'string' && typeof env.JEV_RESEARCH_BRIDGE_TOKEN === 'string',
      webSearchEnabled: researchProvider === 'openrouter'
    },
    media: {
      executionEnabled: env.WORKFLOW_MEDIA_EXECUTION_ENABLED === 'true',
      maxBudgetUsd: finitePositive(env.WORKFLOW_MEDIA_MAX_BUDGET_USD),
      modelChoices,
      mappings: {
        falImage: mappedMediaModel(env, 'WORKFLOW_FAL_IMAGE_MODEL_ID', 'fal', 'image'),
        falVideo: mappedMediaModel(env, 'WORKFLOW_FAL_VIDEO_MODEL_ID', 'fal', 'video'),
        replicateImage: mappedMediaModel(env, 'WORKFLOW_REPLICATE_IMAGE_MODEL_ID', 'replicate', 'image'),
        replicateVideo: mappedMediaModel(env, 'WORKFLOW_REPLICATE_VIDEO_MODEL_ID', 'replicate', 'video')
      }
    }
  };
}

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function mediaModelEnv(provider, mediaType) {
  return `WORKFLOW_${provider.toUpperCase()}_${mediaType.toUpperCase()}_MODEL_ID`;
}

function compilePromptPair(pair, capability, env) {
  const mega = pair.megaPrompt;
  const creative = mega.creative || {};
  const positiveParts = [
    mega.productLock?.identity,
    mega.strategy?.hook?.promise,
    mega.taste?.direction,
    creative.scene,
    creative.composition,
    creative.camera,
    creative.subjectAction,
    creative.visual,
    creative.action
  ].filter((value) => typeof value === 'string' && value.trim());
  const negatives = pair.negativePrompt.constraints.map((item) => item.instruction);
  const warnings = [];
  if (!capability.negativeChannel) {
    const policy = pair.negativePrompt.policy?.unsupportedHandling;
    if (policy === 'fail_closed') throw new WorkflowProviderError('negative_channel_required', 'Prompt policy requires a provider negative channel.', 422);
    if (policy === 'compile_into_positive_prompt') {
      positiveParts.push(`Hard exclusions: ${negatives.join('; ')}`);
      warnings.push('negative_constraints_compiled_into_positive_prompt');
    } else if (policy === 'omit_and_report') {
      warnings.push(`negative_constraints_omitted:${negatives.length}`);
    } else {
      throw new WorkflowProviderError('negative_policy_invalid', 'Negative prompt unsupportedHandling is invalid.', 422);
    }
  }
  const duration = Number(creative.durationS || 0) || null;
  if (capability.mediaType === 'video' && duration) {
    if (capability.durationPolicy === 'env_preflight') {
      const allowed = String(env.WORKFLOW_OMNI_ALLOWED_DURATIONS || '').split(',').map(Number).filter(Number.isFinite);
      if (!allowed.includes(duration)) throw new WorkflowProviderError('media_capability_unverified', 'Requested Omni duration is absent from WORKFLOW_OMNI_ALLOWED_DURATIONS.', 503, { duration });
    }
    if (capability.minDuration && (duration < capability.minDuration || duration > capability.maxDuration)) {
      throw new WorkflowProviderError('media_capability_mismatch', 'Requested duration is outside the verified model range.', 422, { duration, min: capability.minDuration, max: capability.maxDuration });
    }
  }
  return { prompt: positiveParts.join('\n'), negativePrompt: capability.negativeChannel ? negatives.join('; ') : null, warnings, duration };
}

export function prepareMediaRequest({ provider, mediaType, modelId: selectedModelId, promptPair, executionBudgetUsd }, env = {}) {
  if (provider === 'openrouter') throw new WorkflowProviderError('media_provider_not_implemented', 'OpenRouter media generation is not implemented in this runtime.', 503, { provider, mediaType });
  if (!['fal', 'replicate'].includes(provider) || !['image', 'video'].includes(mediaType)) throw new WorkflowProviderError('invalid_media_request', 'Provider or media type is invalid.', 400);
  if (env.WORKFLOW_MEDIA_EXECUTION_ENABLED !== 'true') throw new WorkflowProviderError('media_execution_disabled', 'Media execution is disabled.', 503);
  const maxBudget = finitePositive(env.WORKFLOW_MEDIA_MAX_BUDGET_USD);
  if (!maxBudget || !Number.isFinite(executionBudgetUsd) || executionBudgetUsd <= 0 || executionBudgetUsd > maxBudget) {
    throw new WorkflowProviderError('media_budget_blocked', 'Execution budget is missing or exceeds the configured maximum.', 503, { maxBudgetUsd: maxBudget });
  }
  const modelId = requiredEnv(env, mediaModelEnv(provider, mediaType));
  if (selectedModelId !== undefined && selectedModelId !== null && selectedModelId !== modelId) {
    throw new WorkflowProviderError('media_model_selection_mismatch', 'Selected media model does not match the server-approved provider mapping.', 409, { provider, mediaType, configuredModelId: modelId });
  }
  const capability = MEDIA_CAPABILITIES.get(`${provider}:${modelId}`);
  if (!capability || capability.mediaType !== mediaType) throw new WorkflowProviderError('media_model_mapping_invalid', 'Configured media model is not in the verified capability map.', 503, { provider, mediaType, modelId });
  const compiled = compilePromptPair(promptPair, capability, env);
  const output = promptPair.megaPrompt.output || {};
  if (capability.aspectRatios && !capability.aspectRatios.includes(output.aspectRatio)) {
    throw new WorkflowProviderError('media_capability_mismatch', 'Canonical aspect ratio is unsupported by the configured model.', 422, { aspectRatio: output.aspectRatio, supported: capability.aspectRatios });
  }
  const input = { prompt: compiled.prompt };
  if (capability.inputProfile === 'fal-image') Object.assign(input, { image_size: { width: output.widthPx, height: output.heightPx }, output_format: 'png', quality: 'high', num_images: 1 });
  if (capability.inputProfile === 'replicate-image') Object.assign(input, { aspect_ratio: output.aspectRatio, output_format: 'png' });
  if (capability.inputProfile === 'fal-video' || capability.inputProfile === 'replicate-video') Object.assign(input, { aspect_ratio: output.aspectRatio, duration: compiled.duration });
  return { provider, mediaType, modelId, executionBudgetUsd, input, warnings: compiled.warnings };
}

export async function submitMediaJob(prepared, env, options = {}) {
  let url;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  let body;
  if (prepared.provider === 'fal') {
    const key = requiredEnv(env, 'FAL_KEY', 16);
    url = `https://queue.fal.run/${prepared.modelId}`;
    headers.Authorization = `Key ${key}`;
    body = prepared.input;
  } else {
    const token = requiredEnv(env, 'REPLICATE_API_TOKEN', 16);
    url = `https://api.replicate.com/v1/models/${prepared.modelId}/predictions`;
    headers.Authorization = `Token ${token}`;
    headers.Prefer = 'respond-async';
    body = { input: prepared.input };
  }
  const { response, bytes } = await fetchAndReadWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) }, 30_000, 262_144, fetchImpl(options));
  if (!response.ok) throw new WorkflowProviderError('media_provider_failed', `${prepared.provider} returned HTTP ${response.status}.`, response.status === 429 ? 503 : 502);
  const payload = decodeJson(bytes, 'media_provider_invalid');
  const providerJobId = payload.request_id || payload.id;
  if (typeof providerJobId !== 'string' || !providerJobId) throw new WorkflowProviderError('media_provider_invalid', 'Media provider omitted job ID.', 502);
  return { providerJobId, raw: payload };
}

export const workflowProviderInternals = {
  MEDIA_CAPABILITIES,
  PROMPT_AUTHOR_MODELS,
  STAGE_MODEL_POLICY,
  compilePromptPair,
  callOpenRouterJson,
  estimatePilotCall,
  normalizeMarket
};
