const TEXT_LIMIT = 8_000;
const CONTEXT_LIMIT_BYTES = 524_288;
const CACHEABLE_PREFIX_MIN_BYTES = 4_096;

export const PROMPT_POLICY_VERSION = 'creative-hook-lab.prompt-policy/1.0.0';

const STAGE_RULES = Object.freeze({
  analyze: [
    'Use visible product and packaging evidence only.',
    'Separate observations from target, pain-point and use-case hypotheses.',
    'Keep unknowns explicit and do not invent product or health claims.',
    'Return one JSON object with productName, category, observedFeatures, targetHypotheses, painPoints, useCases and unknowns.'
  ],
  research: [
    'Use only supplied dated evidence or citations returned by the bounded search tool.',
    'Every synthesized statement must reference one or more supplied evidence IDs.',
    'Keep unsupported interpretations as unverified hypotheses.',
    'Return the requested JSON object without markdown.'
  ],
  strategy: [
    'Create motivators and hooks from the supplied analysis and cited research only.',
    'Each motivator and hook must retain research evidence IDs and a testable strength rationale.',
    'Do not claim predicted performance or treat a model score as market evidence.',
    'Return the requested JSON object without markdown.'
  ],
  prompts: [
    'Produce exactly one megaPrompt and one negativePrompt object that satisfy the supplied canonical schemas.',
    'Preserve exact source hashes, product and packaging identity locks, prompt linkage and schema revisions.',
    'Do not self-approve claims, evidence, overlays or generated performance.',
    'The runtime, not the model, binds authorship and invocation provenance after validation.',
    'Return exactly {"megaPrompt":{},"negativePrompt":{}} without markdown.'
  ]
});

function boundedText(value, maximum = TEXT_LIMIT) {
  if (typeof value !== 'string') return value;
  if (value.length <= maximum) return value;
  throw new TypeError(`Prompt context text exceeds ${maximum} characters.`);
}

function projectView(project = {}) {
  return {
    id: boundedText(project.id, 128),
    name: boundedText(project.name, 300),
    product: boundedText(project.product, 500),
    market: boundedText(project.market, 100)
  };
}

function analysisView(analysis = {}) {
  return Object.fromEntries(['productName', 'category', 'observedFeatures', 'targetHypotheses', 'painPoints', 'useCases', 'unknowns']
    .filter((key) => analysis[key] !== undefined)
    .map((key) => [key, analysis[key]]));
}

function researchView(research = {}) {
  return Object.fromEntries(['retrievedAt', 'evidence', 'hypotheses', 'synthesis']
    .filter((key) => research[key] !== undefined)
    .map((key) => [key, research[key]]));
}

function strategyView(strategy = {}) {
  return Object.fromEntries(['motivators', 'taste', 'hooks']
    .filter((key) => strategy[key] !== undefined)
    .map((key) => [key, strategy[key]]));
}

function assertBoundedContext(value) {
  const encoded = JSON.stringify(value);
  const bytes = new TextEncoder().encode(encoded).byteLength;
  if (bytes > CONTEXT_LIMIT_BYTES) throw new TypeError(`Prompt context exceeds ${CONTEXT_LIMIT_BYTES} bytes.`);
  return value;
}

export function boundedStageContext(stage, input = {}) {
  let selected;
  if (stage === 'analyze') selected = { project: projectView(input.project) };
  else if (stage === 'research') selected = { project: projectView(input.project), analysis: analysisView(input.analysis) };
  else if (stage === 'strategy') selected = { project: projectView(input.project), analysis: analysisView(input.analysis), research: researchView(input.research) };
  else if (stage === 'prompts') selected = {
    project: projectView(input.project),
    sourceSnapshotId: boundedText(input.sourceSnapshotId, 128),
    sources: Array.isArray(input.sources) ? input.sources.map(({ id, kind, mimeType, contentHash }) => ({ id, kind, mimeType, contentHash })) : [],
    analysis: analysisView(input.analysis),
    research: researchView(input.research),
    strategy: strategyView(input.strategy)
  };
  else throw new TypeError(`Unknown prompt stage: ${stage}`);
  return assertBoundedContext(selected);
}

export function buildStableSystemPrompt({ stage, instruction, schemaContract = null }) {
  const rules = STAGE_RULES[stage];
  if (!rules) throw new TypeError(`Unknown prompt stage: ${stage}`);
  const sections = [
    `Creative Hook Lab prompt policy ${PROMPT_POLICY_VERSION}.`,
    `Stage: ${stage}.`,
    String(instruction || '').trim(),
    'Stable rules:',
    ...rules.map((rule, index) => `${index + 1}. ${rule}`)
  ];
  if (schemaContract) sections.push(`Canonical schema contract (stable and versioned):\n${JSON.stringify(schemaContract)}`);
  return sections.filter(Boolean).join('\n');
}

function safeInteger(value) {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim() && /^\d+$/u.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function safeSignedCost(value) {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim() && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= 1_000_000 ? number : null;
}

function safeCost(value) {
  const number = safeSignedCost(value);
  return number !== null && number >= 0 ? number : null;
}

export function sanitizeProviderUsage(usage, responseMetadata = null) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
  const details = usage.prompt_tokens_details || usage.input_tokens_details || {};
  const promptTokens = safeInteger(usage.prompt_tokens ?? usage.input_tokens);
  const completionTokens = safeInteger(usage.completion_tokens ?? usage.output_tokens);
  const totalTokens = safeInteger(usage.total_tokens);
  let cachedTokens = safeInteger(details.cached_tokens);
  let cacheWriteTokens = safeInteger(details.cache_write_tokens);
  if (promptTokens !== null && (
    (cachedTokens !== null && cachedTokens > promptTokens)
    || (cacheWriteTokens !== null && cacheWriteTokens > promptTokens)
    || (cachedTokens !== null && cacheWriteTokens !== null && cachedTokens + cacheWriteTokens > promptTokens)
  )) {
    cachedTokens = null;
    cacheWriteTokens = null;
  }
  const webSearchRequests = safeInteger(usage.server_tool_use?.web_search_requests);
  const costUsd = safeCost(usage.cost ?? usage.total_cost);
  // OpenRouter documents cache_discount as a response-body field while some
  // compatible responses place it inside usage. Accept either location, but
  // copy only this allowlisted scalar into provenance.
  const cacheDiscountUsd = safeSignedCost(usage.cache_discount ?? responseMetadata?.cache_discount);
  const sanitized = Object.fromEntries(Object.entries({
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens,
    cacheWriteTokens,
    webSearchRequests,
    costUsd,
    cacheDiscountUsd,
    isByok: usage.is_byok === true ? true : usage.is_byok === false ? false : null
  }).filter(([, value]) => value !== null));
  return Object.keys(sanitized).length ? sanitized : null;
}

export function cacheUsageMetrics(usage, responseMetadata = null) {
  const sanitized = sanitizeProviderUsage(usage, responseMetadata);
  if (!sanitized) return { status: 'unreported', cachedTokens: null, cacheWriteTokens: null, hitRate: null };
  const cachedTokens = sanitized.cachedTokens ?? null;
  const cacheWriteTokens = sanitized.cacheWriteTokens ?? null;
  const promptTokens = sanitized.promptTokens ?? null;
  const hitRate = cachedTokens !== null && promptTokens && promptTokens > 0
    ? Math.round((cachedTokens / promptTokens) * 10_000) / 10_000
    : null;
  const status = cachedTokens > 0 ? 'hit' : cacheWriteTokens > 0 ? 'write' : cachedTokens === 0 || cacheWriteTokens === 0 ? 'miss' : 'unreported';
  return { status, cachedTokens, cacheWriteTokens, hitRate, cacheDiscountUsd: sanitized.cacheDiscountUsd ?? null };
}

function promptSessionId(options = {}) {
  const projectId = String(options?.pilotContext?.projectId || '').replace(/[^a-zA-Z0-9._:-]/gu, '').slice(0, 96);
  const runId = String(options?.pilotContext?.runId || '').replace(/[^a-zA-Z0-9._:-]/gu, '').slice(0, 96);
  if (!projectId || !runId) return null;
  return `chl:${projectId}:${runId}`.slice(0, 256);
}

function dynamicContextStats(messages = []) {
  let imageInputs = 0;
  const sanitized = messages.slice(1).map((message) => ({
    role: message?.role,
    content: Array.isArray(message?.content) ? message.content.map((block) => {
      if (block?.type === 'image_url') {
        imageInputs += 1;
        return { type: 'image_url', image_url: { url: '[bounded-image-input]' } };
      }
      return block;
    }) : message?.content
  }));
  return { dynamicContextBytes: new TextEncoder().encode(JSON.stringify(sanitized)).byteLength, imageInputs };
}

export function applyOpenRouterPromptCaching({ modelId, requestBody, stablePrefix, options = {} }) {
  const body = { ...requestBody, messages: requestBody.messages.map((message) => ({ ...message })) };
  const sessionId = promptSessionId(options);
  if (sessionId) body.session_id = sessionId;
  const prefixBytes = new TextEncoder().encode(String(stablePrefix || '')).byteLength;
  let mode = modelId.startsWith('openai/') || modelId.startsWith('google/') ? 'implicit' : 'none';
  if (modelId.startsWith('anthropic/') && prefixBytes >= CACHEABLE_PREFIX_MIN_BYTES) {
    const first = body.messages[0];
    first.content = [{ type: 'text', text: String(first.content), cache_control: { type: 'ephemeral' } }];
    mode = 'explicit_ephemeral';
  }
  const contextStats = dynamicContextStats(body.messages);
  return {
    requestBody: body,
    cachePolicy: {
      version: PROMPT_POLICY_VERSION,
      mode,
      stablePrefixBytes: prefixBytes,
      ...contextStats,
      sessionIdApplied: Boolean(sessionId),
      keepAlive: false
    }
  };
}

export function conservativeCacheWriteMultiplier(modelId, requestBody = {}) {
  const explicitBreakpoint = Boolean(requestBody.cache_control) || (requestBody.messages || []).some((message) =>
    Array.isArray(message?.content) && message.content.some((block) => Boolean(block?.cache_control))
  );
  if (explicitBreakpoint) return 1.25;
  if (modelId.startsWith('openai/')) return 1.25;
  return 1;
}

export const promptEfficiencyInternals = {
  CACHEABLE_PREFIX_MIN_BYTES,
  CONTEXT_LIMIT_BYTES,
  STAGE_RULES,
  promptSessionId
};
