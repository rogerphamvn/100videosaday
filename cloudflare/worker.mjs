async function equalSecret(actual, expected) {
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([actual, expected].map(value =>
    crypto.subtle.digest('SHA-256', encode.encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
export default {
  async fetch(request, env) {
    const headers = {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow'
    };
    if (!env.INTERNAL_PASSWORD) return new Response('Internal access is not configured.', { status: 503, headers });
    let credentials = '';
    try {
      const auth = request.headers.get('Authorization') || '';
      if (auth.startsWith('Basic ')) credentials = atob(auth.slice(6));
    } catch { /* Reject malformed credentials. */ }
    if (!await equalSecret(credentials, `team:${env.INTERNAL_PASSWORD}`)) {
      return new Response('Internal workspace. Sign in to continue.', {
        status: 401,
        headers: { ...headers, 'WWW-Authenticate': 'Basic realm="100videosaday", charset="UTF-8"' }
      });
    }
    if (!['/', '/index.html', '/styles.css', '/app.js'].includes(new URL(request.url).pathname)) {
      return new Response('Not found', { status: 404, headers });
    }
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  }
};
