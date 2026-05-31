// POST /api/admin/bootstrap — one-time admin setup (requires BOOTSTRAP_KEY env var)
import { getDB, initDB, setUserRole } from '../../_utils/db.js';

export async function onRequestPost({ env, request }) {
  if (!env.BOOTSTRAP_KEY) {
    return Response.json({ error: 'BOOTSTRAP_KEY not configured' }, { status: 500 });
  }
  
  const db = getDB(env);
  await initDB(db);
  
  try {
    const { key, username, role } = await request.json();
    if (key !== env.BOOTSTRAP_KEY) {
      return Response.json({ error: 'Invalid bootstrap key' }, { status: 403 });
    }
    if (!username) {
      return Response.json({ error: 'username required' }, { status: 400 });
    }
    
    const targetRole = role || 'admin';
    // Check user exists
    const acct = await db.prepare('SELECT username FROM accounts WHERE username = ?').bind(username).first();
    if (!acct) {
      return Response.json({ error: '用户不存在' }, { status: 404 });
    }
    
    await setUserRole(db, username, targetRole);
    return Response.json({ success: true, username, role: targetRole });
  } catch (e) {
    return Response.json({ error: 'Bootstrap failed: ' + e.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
