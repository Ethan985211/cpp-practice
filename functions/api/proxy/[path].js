// Proxy requests to CVM judge server
// Routes: /api/proxy/judge, /api/proxy/run, /api/proxy/health, etc.
// All forwarded to http://82.156.34.78/api/{path}

const CVM_BASE = 'http://82.156.34.78';

export async function onRequest(context) {
  const { request, params } = context;
  const { path } = params;

  if (!path) {
    return new Response(JSON.stringify({ error: 'missing path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const targetUrl = `${CVM_BASE}/api/${path}${url.search}`;

  try {
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
    });

    const resp = await fetch(proxyRequest);
    const respBody = await resp.text();

    return new Response(respBody, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'proxy_error', detail: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
