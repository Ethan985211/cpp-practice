// Admin Problem API — GET list all, POST create, PUT update, DELETE remove
import { requireAdmin } from '../_utils/admin.js';
import { listProblems, getProblem, createProblem, updateProblem, deleteProblem } from '../_utils/db.js';

function ok(data) { return Response.json(data); }
function err(msg, status = 400) { return Response.json({ error: msg }, { status }); }

export async function onRequestGet({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      const p = await getProblem(db, parseInt(id));
      if (!p) return err('题目不存在', 404);
      return ok({ problem: p });
    }
    const problems = await listProblems(db);
    return ok({ problems });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestPost({ env, request }) {
  try {
    const { db, username } = await requireAdmin(env, request);
    const data = await request.json();
    if (!data.title) return err('标题不能为空');
    const id = await createProblem(db, data, username);
    return ok({ success: true, id });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestPut({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id'));
    if (!id) return err('缺少题目 ID');
    const data = await request.json();
    await updateProblem(db, id, data);
    return ok({ success: true });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestDelete({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id'));
    if (!id) return err('缺少题目 ID');
    await deleteProblem(db, id);
    return ok({ success: true });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
