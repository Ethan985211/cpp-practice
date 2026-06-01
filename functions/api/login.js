// POST /api/login
import { sign } from '../_utils/jwt.js';
import { getDB, initDB, getAccount, getMembership, isAdmin } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return addCORS(Response.json({ error: '请输入用户名和密码' }, { status: 400 }), request);
    }

    const account = await getAccount(db, username.trim());
    if (!account) {
      return addCORS(Response.json({ error: '用户名或密码错误' }, { status: 401 }), request);
    }

    // Verify password
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hashBytes = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(account.salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256
    );
    const passwordHash = Array.from(new Uint8Array(hashBytes), b => b.toString(16).padStart(2, '0')).join('');

    if (passwordHash !== account.password_hash) {
      return addCORS(Response.json({ error: '用户名或密码错误' }, { status: 401 }), request);
    }

    const membership = await getMembership(db, username.trim());
    const admin = await isAdmin(db, username.trim(), env);
    const token = await sign({ username: username.trim(), role: admin ? 'admin' : 'user', member: membership.member, level: membership.level, expire_at: membership.expire_at });

    return addCORS(Response.json({
      success: true, token, username: username.trim(),
      role: admin ? 'admin' : 'user',
      membership
    }), request);
  } catch (e) {
    return addCORS(Response.json({ error: '登录失败: ' + e.message }, { status: 500 }), request);
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
