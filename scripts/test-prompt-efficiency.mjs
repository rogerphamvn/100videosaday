import assert from 'node:assert/strict';
import {
  PROMPT_POLICY_VERSION,
  applyOpenRouterPromptCaching,
  boundedStageContext,
  buildStableSystemPrompt,
  cacheUsageMetrics,
  conservativeCacheWriteMultiplier,
  sanitizeProviderUsage
} from '../integrations/prompt-efficiency.mjs';

const systemA = buildStableSystemPrompt({ stage: 'strategy', instruction: 'Create hooks.' });
const systemB = buildStableSystemPrompt({ stage: 'strategy', instruction: 'Create hooks.' });
assert.equal(systemA, systemB, 'stable prompt prefix is byte-identical for the same policy version');
assert.match(systemA, new RegExp(PROMPT_POLICY_VERSION.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
assert.equal(systemA.includes(new Date().toISOString().slice(0, 10)), false, 'stable prefix contains no request timestamp');

const researchContext = boundedStageContext('research', {
  project: { id: 'project_1', name: 'Project', product: 'Oil sprayer', market: 'VN', secret: 'omit-me' },
  analysis: { productName: 'Sprayer', category: 'Kitchen', painPoints: ['Pouring too much'], providerTrace: { huge: true } },
  conversationHistory: ['must not enter the stage prompt']
});
assert.deepEqual(Object.keys(researchContext), ['project', 'analysis']);
assert.equal('secret' in researchContext.project, false);
assert.equal('providerTrace' in researchContext.analysis, false);
assert.equal(JSON.stringify(researchContext).includes('conversationHistory'), false);

assert.throws(
  () => boundedStageContext('research', { project: { id: 'p' }, analysis: { productName: 'x'.repeat(525_000) } }),
  /exceeds/u,
  'oversized context fails closed instead of silently truncating evidence'
);

const longStablePrefix = `policy:${'x'.repeat(5_000)}`;
const baseBody = {
  model: 'anthropic/claude-opus-5.5',
  messages: [{ role: 'system', content: longStablePrefix }, { role: 'user', content: '{}' }],
  usage: { include: true }
};
const explicit = applyOpenRouterPromptCaching({
  modelId: 'anthropic/claude-opus-5.5',
  requestBody: baseBody,
  stablePrefix: longStablePrefix,
  options: { pilotContext: { projectId: 'project_1', runId: 'run_1' } }
});
assert.equal(explicit.cachePolicy.mode, 'explicit_ephemeral');
assert.equal(explicit.cachePolicy.keepAlive, false);
assert.equal(explicit.cachePolicy.imageInputs, 0);
assert.ok(explicit.cachePolicy.dynamicContextBytes > 0);
assert.equal(explicit.requestBody.session_id, 'chl:project_1:run_1');
assert.deepEqual(explicit.requestBody.messages[0].content[0].cache_control, { type: 'ephemeral' });
assert.equal('ttl' in explicit.requestBody.messages[0].content[0].cache_control, false, 'default ephemeral TTL avoids a higher write premium');
assert.equal(typeof baseBody.messages[0].content, 'string', 'cache adapter does not mutate the caller request');
assert.equal(conservativeCacheWriteMultiplier('anthropic/claude-opus-5.5', explicit.requestBody), 1.25);

const implicit = applyOpenRouterPromptCaching({
  modelId: 'openai/gpt-6.1-sol',
  requestBody: { ...baseBody, model: 'openai/gpt-6.1-sol' },
  stablePrefix: longStablePrefix,
  options: { pilotContext: { projectId: 'project_1', runId: 'run_1' } }
});
assert.equal(implicit.cachePolicy.mode, 'implicit');
assert.equal(typeof implicit.requestBody.messages[0].content, 'string');
assert.equal('cache_control' in implicit.requestBody, false, 'OpenAI implicit caching gets no Anthropic-only request field');
assert.equal(conservativeCacheWriteMultiplier('openai/gpt-6.1-sol', implicit.requestBody), 1.25);
assert.equal(conservativeCacheWriteMultiplier('google/gemini-3.8-flash', implicit.requestBody), 1);

const usage = {
  prompt_tokens: 2_000,
  completion_tokens: 100,
  total_tokens: 2_100,
  prompt_tokens_details: { cached_tokens: 1_500, cache_write_tokens: 0, provider_internal: 'omit' },
  server_tool_use: { web_search_requests: 1, unknown_tool: 99 },
  cache_discount: 0.012,
  is_byok: false,
  secret_payload: 'omit'
};
assert.deepEqual(sanitizeProviderUsage(usage), {
  promptTokens: 2_000,
  completionTokens: 100,
  totalTokens: 2_100,
  cachedTokens: 1_500,
  cacheWriteTokens: 0,
  webSearchRequests: 1,
  cacheDiscountUsd: 0.012,
  isByok: false
});
assert.deepEqual(cacheUsageMetrics(usage), {
  status: 'hit', cachedTokens: 1_500, cacheWriteTokens: 0, hitRate: 0.75, cacheDiscountUsd: 0.012
});
assert.equal(
  sanitizeProviderUsage({ prompt_tokens: 100 }, { cache_discount: 0.003 }).cacheDiscountUsd,
  0.003,
  'documented response-level cache discount is allowlisted without retaining response metadata'
);
assert.equal(
  cacheUsageMetrics({ prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 50 } }, { cache_discount: 0.003 }).cacheDiscountUsd,
  0.003
);
assert.deepEqual(cacheUsageMetrics(null), {
  status: 'unreported', cachedTokens: null, cacheWriteTokens: null, hitRate: null
});
assert.deepEqual(cacheUsageMetrics({
  prompt_tokens: 10,
  prompt_tokens_details: { cached_tokens: 11, cache_write_tokens: 0 }
}), { status: 'unreported', cachedTokens: null, cacheWriteTokens: null, hitRate: null, cacheDiscountUsd: null });
assert.equal(sanitizeProviderUsage({ prompt_tokens: null, completion_tokens: '', total_tokens: false, cost: null }), null, 'null, empty and boolean provider values are never coerced to zero');
assert.equal(sanitizeProviderUsage({ cost: -1 }), null, 'negative total cost is rejected even though a cache discount may be negative');

const shortAnthropic = applyOpenRouterPromptCaching({
  modelId: 'anthropic/claude-opus-5.5',
  requestBody: {
    model: 'anthropic/claude-opus-5.5',
    messages: [{ role: 'system', content: 'short stable policy' }, { role: 'user', content: '{}' }]
  },
  stablePrefix: 'short stable policy'
});
assert.equal(shortAnthropic.cachePolicy.mode, 'none', 'short Anthropic prefixes are not marked as cache candidates');
assert.equal(typeof shortAnthropic.requestBody.messages[0].content, 'string');

console.log('PROMPT EFFICIENCY PASS: stable versioned prefixes, bounded stage context, documented provider cache fields, conservative write estimates and sanitized cache usage provenance.');
