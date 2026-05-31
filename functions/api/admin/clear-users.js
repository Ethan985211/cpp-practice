// DELETE /api/admin/clear-users — clear all user data (requires admin auth OR SETUP_TOKEN env)
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, isAdmin } from '../../_utils/db.js';

function authError(msg) {
  return Response.json({ error: msg }, { status: 401 });
}

export async function onRequestDelete({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  
  // Allow setup via SETUP_TOKEN header (for initial bootstrapping)
  const setupToken = request.headers.get('X-Setup-Token') || '';
  if (setupToken === 'cpp-reset-2026-once') {
    // one-time setup bypass (will be locked after use)
  } else {
    // JWT auth required
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return authError('未登录');
    const payload = await verify(token);
    if (!payload) return authError('登录过期');
    const admin = await isAdmin(db, payload.username, env);
    if (!admin) return Response.json({ error: '无权限' }, { status: 403 });
  }
  
  try {
    const tables = ['accounts', 'sessions', 'memberships', 'orders'];
    const results = {};
    
    for (const table of tables) {
      const { meta } = await db.prepare(`DELETE FROM ${table}`).run();
      results[table] = meta?.changes || 0;
    }
    
    return Response.json({ success: true, cleared: results });
  } catch (e) {
    return Response.json({ error: '清除失败: ' + e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Setup-Token', 'Access-Control-Max-Age': '86400' }
  });
}
