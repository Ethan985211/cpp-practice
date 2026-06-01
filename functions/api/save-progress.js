// POST /api/save-progress — sync user progress to D1
import { verify } from '../_utils/jwt.js';
import { getDB, initDB } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return addCORS(Response.json({ error: '请先登录' }, { status: 401 }), request);

  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);

  let body;
  try { body = await request.json(); } catch {
    return addCORS(Response.json({ error: '无效请求' }, { status: 400 }), request);
  }

  const username = payload.username;

  if (body.progress) {
    await db.prepare(
      'INSERT OR REPLACE INTO user_progress (username, progress, updated_at) VALUES (?, ?, ?)'
    ).bind(username, JSON.stringify(body.progress), Date.now()).run();
  }

  return addCORS(Response.json({ success: true }), request);
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
