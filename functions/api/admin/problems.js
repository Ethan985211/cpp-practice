// Admin Problem API — GET list all, POST create, PUT update, DELETE remove
import { requireAdmin } from '../../_utils/admin.js';
import { listProblems, getProblem, createProblem, updateProblem, deleteProblem } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

function ok(data, request) { return addCORS(Response.json(data), request); }
function err(msg, status = 400, request) { return addCORS(Response.json({ error: msg }, { status }), request); }

export async function onRequestGet({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      const p = await getProblem(db, parseInt(id));
      if (!p) return err('题目不存在', 404, request);
      return ok({ problem: p }, request);
    }
    const problems = await listProblems(db, false);
    return ok({ problems }, request);
  } catch (e) {
    return err(e.message, e.status || 500, request);
  }
}

export async function onRequestPost({ env, request }) {
  try {
    const { db, username } = await requireAdmin(env, request);
    const data = await request.json();
    if (!data.title) return err('标题不能为空', 400, request);
    const id = await createProblem(db, data, username);
    return ok({ success: true, id }, request);
  } catch (e) {
    return err(e.message, e.status || 500, request);
  }
}

export async function onRequestPut({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return err('缺少题目ID', 400, request);
    const data = await request.json();
    await updateProblem(db, parseInt(id), data);
    return ok({ success: true }, request);
  } catch (e) {
    return err(e.message, e.status || 500, request);
  }
}

export async function onRequestDelete({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return err('缺少题目ID', 400, request);
    await deleteProblem(db, parseInt(id));
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
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
