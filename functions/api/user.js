// GET /api/user — return current user info + membership status
import { verify } from '../_utils/jwt.js';
import { getDB, initDB, getMembership, isAdmin, getAiTrials } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

export async function onRequestGet({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) {
    return addCORS(Response.json({ error: '未登录' }, { status: 401 }), request);
  }

  const payload = await verify(token);
  if (!payload) {
    return addCORS(Response.json({ error: '登录已过期，请重新登录' }, { status: 401 }), request);
  }

  const membership = await getMembership(db, payload.username);
  const admin = await isAdmin(db, payload.username, env);
  const trials = await getAiTrials(db, payload.username);

  return addCORS(Response.json({
    logged_in: true,
    username: payload.username,
    role: admin ? 'admin' : 'user',
    ai_trials: { used: trials.used, remaining: trials.remaining },
    membership: {
      member: membership.member,
      level: membership.level,
      expire_at: membership.expire_at,
      days_left: membership.days_left
    }
  }), request);
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
