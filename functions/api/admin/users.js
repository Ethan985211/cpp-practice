// Admin Users API — GET list users, PUT set role
import { requireAdmin } from '../../_utils/admin.js';
import { listUsers, setUserRole } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

function ok(data, request) { return addCORS(Response.json(data), request); }
function err(msg, status = 400, request) { return addCORS(Response.json({ error: msg }, { status }), request); }

export async function onRequestGet({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const users = await listUsers(db);
    return ok({ users }, request);
  } catch (e) {
    return err(e.message, e.status || 500, request);
  }
}

export async function onRequestPut({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const { username, role } = await request.json();
    if (!username || !role) return err('需要 username 和 role', 400, request);
    if (!['admin', 'user'].includes(role)) return err('role 只能是 admin 或 user', 400, request);
    await setUserRole(db, username, role);
    return ok({ success: true }, request);
  } catch (e) {
    return err(e.message, e.status || 500, request);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
