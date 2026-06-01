// POST /api/admin/mark-paid — manually mark order as paid (admin only)
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, isAdmin, activateMembership } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

const PLAN_DAYS = { week: 7, month: 30, year: 365, '3year': 1095 };

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) return addCORS(Response.json({ error: '未登录' }, { status: 401 }), request);
  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);

  const admin = await isAdmin(db, payload.username, env);
  if (!admin) return addCORS(Response.json({ error: '无权限' }, { status: 403 }), request);

  let body;
  try { body = await request.json(); } catch { return addCORS(Response.json({ error: '无效请求' }, { status: 400 }), request); }
  const { out_trade_no } = body;

  const order = await db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').bind(out_trade_no).first();
  if (!order) return addCORS(Response.json({ error: '订单不存在' }, { status: 404 }), request);
  if (order.paid === 1) return addCORS(Response.json({ error: '订单已支付' }, { status: 400 }), request);

  await db.prepare('UPDATE orders SET paid = 1, paid_at = ? WHERE out_trade_no = ?')
    .bind(Date.now(), out_trade_no).run();

  const days = PLAN_DAYS[order.plan] || 30;
  const levelMap = { week: 'week', month: 'month', year: 'year', '3year': 'permanent' };
  const level = levelMap[order.plan] || 'month';
  await activateMembership(db, order.username, level, days, out_trade_no, order.amount);

  return addCORS(Response.json({ success: true, order: out_trade_no, user: order.username, plan: order.plan, days }), request);
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
