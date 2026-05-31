// POST /api/login
import { sign } from '../_utils/jwt.js';
import { getDB, initDB, getAccount, getMembership } from '../_utils/db.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return Response.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    const account = await getAccount(db, username.trim());
    if (!account) {
      return Response.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // Verify password
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hashBytes = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(account.salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256
    );
    const passwordHash = Array.from(new Uint8Array(hashBytes), b => b.toString(16).padStart(2, '0')).join('');

    if (passwordHash !== account.password_hash) {
      return Response.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const membership = await getMembership(db, username.trim());
    const token = await sign({ username: username.trim(), role: account.role || 'user', member: membership.member, level: membership.level, expire_at: membership.expire_at });

    return Response.json({
      success: true, token, username: username.trim(),
      role: account.role || 'user',
      membership
    });
  } catch (e) {
    return Response.json({ error: '登录失败: ' + e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
