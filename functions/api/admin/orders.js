// GET /api/admin/orders — list recent orders (admin only)
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, isAdmin } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

export async function onRequestGet({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) return addCORS(Response.json({ error: '未登录' }, { status: 401 }), request);
  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);

  const admin = await isAdmin(db, payload.username, env);
  if (!admin) return addCORS(Response.json({ error: '无权限' }, { status: 403 }), request);

  const { results } = await db.prepare(
    'SELECT out_trade_no, username, plan, amount, paid, created_at, paid_at FROM orders ORDER BY created_at DESC LIMIT 50'
  ).all();

  return addCORS(Response.json({ orders: results }), request);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
