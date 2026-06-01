// POST /api/admin/validate-problem — update problem validation/publish status
import { requireAdmin } from '../../_utils/admin.js';
import { getDB } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

export async function onRequestPost({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const data = await request.json();
    const { problem_id, is_published } = data;

    if (!problem_id) {
      return addCORS(Response.json({ error: '缺少 problem_id' }, { status: 400 }), request);
    }

    const now = Date.now();
    await db.prepare(
      'UPDATE problems SET is_published = ?, updated_at = ? WHERE id = ?'
    ).bind(is_published ? 1 : 0, now, problem_id).run();

    return addCORS(Response.json({ success: true }), request);
  } catch (e) {
    return addCORS(Response.json({ error: e.message }, { status: e.status || 500 }), request);
  }
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
