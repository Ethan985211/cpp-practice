// GET /api/membership/plans — list membership plans
export async function onRequestGet() {
  return Response.json({
    plans: [
      { id: 'week', name: '7天体验', price: '10.00', days: 7, tag: '尝鲜' },
      { id: 'month', name: '月度会员', price: '30.00', days: 30, tag: '推荐' },
      { id: 'year', name: '年度会员', price: '288.00', days: 365, tag: '热门' },
      { id: '3year', name: '三年会员', price: '500.00', days: 1095, tag: '超值' }
    ]
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }
  });
}
