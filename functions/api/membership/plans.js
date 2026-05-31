// GET /api/membership/plans — list membership plans
import { addCORS } from '../../_utils/cors.js';

export async function onRequestGet({ request }) {
  return addCORS(Response.json({
    plans: [
      { id: 'week', name: '7天体验', price: '10.00', days: 7, tag: '尝鲜' },
      { id: 'month', name: '月度会员', price: '30.00', days: 30, tag: '推荐' },
      { id: 'year', name: '年度会员', price: '288.00', days: 365, tag: '热门' },
      { id: '3year', name: '三年会员', price: '500.00', days: 1095, tag: '超值' }
    ]
  }), request);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
