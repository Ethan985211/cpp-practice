// Proxy judge/ai requests to CVM (avoids mixed-content HTTPS→HTTP block)
// All other /api/* routes are handled by dedicated Functions

const CVM_HOST = '82.156.34.78.nip.io';
const CVM_URL = 'http://' + CVM_HOST;

export async function onRequestPost({ request }) {
  const url = new URL(request.url);
  const targetPath = url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.set('Host', CVM_HOST);

  const resp = await fetch(CVM_URL + targetPath, {
    method: 'POST',
    headers,
    body: request.body,
    redirect: 'follow'
  });

  const respHeaders = new Headers(resp.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(resp.body, {
    status: resp.status,
    headers: respHeaders
  });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const targetPath = url.pathname + url.search;

  const resp = await fetch(CVM_URL + targetPath, {
    method: 'GET',
    headers: { 'Host': '82.156.34.78' },
    redirect: 'follow'
  });

  const respHeaders = new Headers(resp.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(resp.body, {
    status: resp.status,
    headers: respHeaders
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400'
    }
  });
}
