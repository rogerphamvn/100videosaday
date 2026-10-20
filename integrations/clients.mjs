export { researchWithJev, buildResearchRecipe } from './research/jev-client.mjs';
export { synthesizeVoice, DEFAULT_VIENEU_MODEL_REVISION, DEFAULT_VIENEU_VOICE, VIENEU_CLIENT_RECIPE_VERSION } from './voice/vieneu-client.mjs';
export { IntegrationError } from './shared.mjs';

import { isAllowedBridgeUrl } from './shared.mjs';

const exactRevision = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/u.test(value);
const hasBridge = (url, token) => {
  return isAllowedBridgeUrl(url) && typeof token === 'string' && token.length >= 16 && token.length <= 512;
};

export function getIntegrationStatus(env = {}) {
  const researchConfigured = hasBridge(env.JEV_RESEARCH_BRIDGE_URL, env.JEV_RESEARCH_BRIDGE_TOKEN);
  const voiceBridgeConfigured = hasBridge(env.VIENEU_BRIDGE_URL, env.VIENEU_BRIDGE_TOKEN);
  const voiceRevisionConfigured = exactRevision(env.VIENEU_MODEL_REVISION);
  return {
    research: {
      provider: 'jev-bridge',
      configured: researchConfigured,
      status: researchConfigured ? 'configured_unverified' : 'not_configured',
      mode: 'bounded-fanout',
      cache: 'bridge-reported'
    },
    voice: {
      provider: 'vieneu-v3-turbo',
      configured: voiceBridgeConfigured && voiceRevisionConfigured,
      status: voiceBridgeConfigured && voiceRevisionConfigured ? 'configured_unverified' : 'not_configured',
      modelRevision: voiceRevisionConfigured ? env.VIENEU_MODEL_REVISION : null,
      cloningEnabled: false
    }
  };
}
