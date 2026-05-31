// Public Contests API — list active contests
import { getDB, initDB, listContests } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

export async function onRequestGet({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  try {
    const contests = await listContests(db);
    const active = contests.filter(c => c.is_active === 1);
    return addCORS(Response.json({ contests: active }), request);
  } catch (e) {
    return addCORS(Response.json({ error: e.message }, { status: 500 }), request);
  }
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
