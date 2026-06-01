// Proxy requests to CVM judge server
// Routes: /api/proxy/judge, /api/proxy/run, /api/proxy/health, etc.
// All forwarded to http://82.156.34.78:8766/api/{path}

const CVM_BASE = 'http://82.156.34.78.nip.io:8766';

const PROXY_HEADERS = [
  'accept', 'accept-encoding', 'accept-language',
  'content-type', 'content-length', 'authorization',
  'user-agent', 'referer', 'origin', 'cookie'
];

export async function onRequest(context) {
  const { request, params } = context;
  const { path } = params;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  if (!path) {
    return new Response(JSON.stringify({ error: 'missing path' }), {
      status: 400,
      headers: corsHeaders()
    });
  }

  const url = new URL(request.url);
  const targetUrl = `${CVM_BASE}/api/${path}${url.search}`;

  try {
    // Build clean headers (strip CF-specific ones)
    const headers = new Headers();
    for (const [key, value] of request.headers) {
      if (PROXY_HEADERS.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    const init = {
      method: request.method,
      headers: headers
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.text();
    }

    const resp = await fetch(targetUrl, init);
    const respBody = await resp.text();
    const contentType = resp.headers.get('Content-Type') || 'application/json';

    return new Response(respBody, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        ...corsHeaders()
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'proxy_error', detail: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };
}
