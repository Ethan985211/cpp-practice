// Admin Contest API — GET list all, POST create, PUT update, DELETE remove
import { requireAdmin } from '../../_utils/admin.js';
import { listContests, getContest, createContest, updateContest, deleteContest } from '../../_utils/db.js';

function ok(data) { return Response.json(data); }
function err(msg, status = 400) { return Response.json({ error: msg }, { status }); }

export async function onRequestGet({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      const c = await getContest(db, parseInt(id));
      if (!c) return err('比赛不存在', 404);
      return ok({ contest: c });
    }
    const contests = await listContests(db);
    return ok({ contests });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
}

export async function onRequestPost({ env, request }) {
  try {
    const { db, username } = await requireAdmin(env, request);
    const data = await request.json();
    if (!data.title) return err('比赛标题不能为空');
    const id = await createContest(db, data, username);
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
    if (!id) return err('缺少比赛 ID');
    const data = await request.json();
    await updateContest(db, id, data);
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
    if (!id) return err('缺少比赛 ID');
    await deleteContest(db, id);
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
