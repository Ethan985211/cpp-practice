// Public Contests API — list active contests
import { getDB, initDB, listContests } from '../_utils/db.js';

export async function onRequestGet({ env }) {
  const db = getDB(env);
  await initDB(db);
  try {
    const contests = await listContests(db);
    // Only return active contests for public view
    const active = contests.filter(c => c.is_active === 1);
    return Response.json({ contests: active });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
