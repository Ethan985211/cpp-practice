// POST /api/orders/check — check order payment status
import { verify } from '../../_utils/jwt.js';
import { getDB, getOrderStatus } from '../../_utils/db.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) return Response.json({ error: '未登录' }, { status: 401 });
  const payload = await verify(token);
  if (!payload) return Response.json({ error: '登录已过期' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: '无效请求' }, { status: 400 }); }
  const { out_trade_no } = body;

  const order = await getOrderStatus(db, out_trade_no);
  if (!order) return Response.json({ error: '订单不存在' }, { status: 404 });

  return Response.json({ paid: order.paid, out_trade_no: order.out_trade_no });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
