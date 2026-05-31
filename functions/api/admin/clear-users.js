// POST /api/admin/clear-users — clear all user data (accounts, sessions, memberships, orders)
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, isAdmin } from '../../_utils/db.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return Response.json({ error: '未登录' }, { status: 401 });
  
  const payload = await verify(token);
  if (!payload) return Response.json({ error: '登录过期' }, { status: 401 });
  
  const admin = await isAdmin(db, payload.username, env);
  if (!admin) return Response.json({ error: '无权限' }, { status: 403 });
  
  try {
    const { tables } = await request.json().catch(() => ({}));
    const targets = tables || ['accounts', 'sessions', 'memberships', 'orders'];
    const results = {};
    
    for (const table of targets) {
      const { meta } = await db.prepare(`DELETE FROM ${table}`).run();
      results[table] = meta?.changes || meta?.rows_written || 0;
    }
    
    return Response.json({ success: true, cleared: results });
  } catch (e) {
    return Response.json({ error: '清除失败: ' + e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
