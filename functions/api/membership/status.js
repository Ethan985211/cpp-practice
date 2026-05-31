// GET /api/membership/status — current user membership status
import { verify } from '../../_utils/jwt.js';
import { getDB, getMembership } from '../../_utils/db.js';

export async function onRequestGet({ env, request }) {
  const db = getDB(env);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: '未登录' }, { status: 401 });
  }

  const payload = await verify(token);
  if (!payload) {
    return Response.json({ error: '登录已过期' }, { status: 401 });
  }

  const membership = await getMembership(db, payload.username);
  return Response.json(membership);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
