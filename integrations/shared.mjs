export class IntegrationError extends Error {
  constructor(code, message, status = 502, details = undefined) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function readBoundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function isAllowedBridgeUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return false; }
  const hostname = url.hostname.toLowerCase().replace(/\.$/u, '');
  const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/u.test(hostname);
  const isIpv6 = hostname.includes(':');
  return url.protocol === 'https:'
    && !url.username && !url.password && !url.hash
    && hostname.includes('.')
    && hostname !== 'localhost'
    && !hostname.endsWith('.localhost')
    && !hostname.endsWith('.local')
    && !isIpv4 && !isIpv6;
}

export function requireHttpsBridge(raw, code) {
  if (!raw) throw new IntegrationError(code, 'Integration bridge is not configured.', 503);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new IntegrationError(`${code}_invalid`, 'Integration bridge URL is invalid.', 503);
  }
  if (!isAllowedBridgeUrl(raw)) {
    throw new IntegrationError(`${code}_invalid`, 'Integration bridge must use a credential-free HTTPS URL.', 503);
  }
  return url;
}

export function requireToken(value, code) {
  if (typeof value !== 'string' || value.length < 16 || value.length > 512) {
    throw new IntegrationError(code, 'Integration bridge token is not configured.', 503);
  }
  return value;
}

export async function fetchAndReadWithTimeout(url, init, timeoutMs, maxBytes, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('integration_timeout'), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, redirect: 'error', signal: controller.signal });
    if (!response.body) return { response, bytes: new Uint8Array() };
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('integration_response_too_large');
        throw new IntegrationError('integration_response_too_large', 'Integration bridge response is too large.', 502);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { response, bytes };
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    if (error?.name === 'AbortError' || controller.signal.aborted) {
      throw new IntegrationError('integration_timeout', 'Integration bridge timed out.', 504);
    }
    throw new IntegrationError('integration_unreachable', 'Integration bridge is unreachable.', 502);
  } finally {
    clearTimeout(timer);
  }
}

export function safeIdentifier(value, field = 'id', status = 400) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value)) {
    throw new IntegrationError(status === 400 ? 'invalid_input' : 'integration_invalid_response', `${field} is invalid.`, status);
  }
  return value;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
