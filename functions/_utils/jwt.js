// JWT implementation using Web Crypto API (Cloudflare Workers runtime)
// Uses HMAC-SHA256 (HS256)

const JWT_SECRET = typeof JWT_SECRET_ENV !== 'undefined' ? JWT_SECRET_ENV : 'cpp-practice-jwt-secret-2026';

function base64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

export async function sign(payload, expiresIn = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signingInput = headerB64 + '.' + payloadB64;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput));
  const sigB64 = base64url(String.fromCharCode(...new Uint8Array(sig)));

  return signingInput + '.' + sigB64;
}

export async function verify(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const signingInput = parts[0] + '.' + parts[1];
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(signingInput));
    if (!valid) return null;

    const payload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSecret() {
  return JWT_SECRET;
}
