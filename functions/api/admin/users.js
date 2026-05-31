// Admin Users API — GET list users, PUT set role
import { requireAdmin } from '../_utils/admin.js';
import { listUsers, setUserRole } from '../_utils/db.js';

function ok(data) { return Response.json(data); }
function err(msg, status = 400) { return Response.json({ error: msg }, { status }); }

export async function onRequestGet({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const users = await listUsers(db);
    return ok({ users });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestPut({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const { username, role } = await request.json();
    if (!username || !role) return err('需要 username 和 role');
    if (!['admin', 'user'].includes(role)) return err('role 只能是 admin 或 user');
    await setUserRole(db, username, role);
    return ok({ success: true });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
