// Admin Users API — GET list users, PUT set role/membership/ai_trials
import { requireAdmin } from '../../_utils/admin.js';
import { listUsers, setUserRole, activateMembership } from '../../_utils/db.js';
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
    const body = await request.json();
    const { username, role, membership_level, membership_days, ai_trials_used } = body;
    
    if (role && ['admin', 'user'].includes(role)) {
      await setUserRole(db, username, role);
    }
    
    if (membership_level && membership_days) {
      await activateMembership(db, username, membership_level, membership_days, 'admin_grant', '0.00');
    }
    
    if (ai_trials_used !== undefined && ai_trials_used !== null) {
      await db.prepare('UPDATE accounts SET ai_trials_used = ? WHERE username = ?')
        .bind(ai_trials_used, username).run();
    }
    
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
