// CORS helper for CF Pages Functions
// Allow cross-origin requests from CVM HTTP and localhost

const ALLOWED_ORIGINS = [
  'http://82.156.34.78',
  'http://localhost',
  'http://127.0.0.1',
  'https://cpp-practice.pages.dev',
];

export function addCORS(response, request) {
  const origin = request?.headers?.get?.('Origin') || '';
  const allowed = ALLOWED_ORIGINS.find(o => origin.startsWith(o)) || ALLOWED_ORIGINS[0];
  response.headers.set('Access-Control-Allow-Origin', allowed);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONS preflight handler
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
