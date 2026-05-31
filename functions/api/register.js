// POST /api/register
import { sign } from '../_utils/jwt.js';
import { getDB, initDB, createAccount, setUserRole } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  try {
    const { username, password } = await request.json();
    if (!username || !password || username.length < 2 || password.length < 4) {
      return addCORS(Response.json({ error: '用户名至少2个字符，密码至少4个字符' }, { status: 400 }), request);
    }
    if (username.length > 32) {
      return addCORS(Response.json({ error: '用户名最多32个字符' }, { status: 400 }), request);
    }

    // PBKDF2-SHA256 hashing in Workers
    const enc = new TextEncoder();
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = Array.from(saltBytes, b => b.toString(16).padStart(2, '0')).join('');

    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hashBytes = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256
    );
    const passwordHash = Array.from(new Uint8Array(hashBytes), b => b.toString(16).padStart(2, '0')).join('');

    const result = await createAccount(db, username.trim(), passwordHash, salt);
    if (result.error) {
      return addCORS(Response.json({ error: result.error }, { status: 409 }), request);
    }

    // First registered user becomes admin
    const count = await db.prepare('SELECT COUNT(*) as c FROM accounts').first();
    const role = count.c === 1 ? 'admin' : 'user';
    if (role === 'admin') await setUserRole(db, username.trim(), 'admin');

    const token = await sign({ username: username.trim(), role });
    return addCORS(Response.json({ success: true, token, username: username.trim(), role }), request);
  } catch (e) {
    return addCORS(Response.json({ error: '注册失败: ' + e.message }, { status: 500 }), request);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
