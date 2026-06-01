// POST /api/orders/check — check order payment status
// Queries BOTH: our D1 database (for notify-marked orders) + epay directly (fallback)
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, markOrderPaid, activateMembership } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

const EPAY_PID = '11898';
const EPAY_KEY = 'a3NcrTlnT1anCcQGyAWb';
const EPAY_QUERY_URL = 'https://mzf.mapay.cc/mapi.php';

const PLAN_DAYS = {
  week: 7,
  month: 30,
  year: 365,
  '3year': 1095
};

// Pure JS MD5
function md5Pure(string) {
  function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }
  function cmn(q, a, b, x, s, t) { return add32(bit_rol(add32(add32(a, q), add32(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function md5blk(s) {
    var md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function md51(s) {
    var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
    for (i = 64; i <= n; i += 64) { md5cycle(state, md5blk(s.substring(i - 64, i))); }
    s = s.substring(i - 64);
    length = s.length;
    tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < length; i++) { tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3); }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tmp = n * 8;
    tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
    lo = parseInt(tmp[2], 16);
    hi = parseInt(tmp[1], 16) || 0;
    tail[14] = lo;
    tail[15] = hi;
    md5cycle(state, tail);
    return state;
  }
  function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
  function bit_rol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function rhex(n) {
    var s = '', j;
    for (j = 0; j <= 3; j++) { s += HEX_CHARS.charAt((n >> (j * 8 + 4)) & 0x0F) + HEX_CHARS.charAt((n >> (j * 8)) & 0x0F); }
    return s;
  }
  var HEX_CHARS = '0123456789abcdef';
  return rhex(md51(string)[0]) + rhex(md51(string)[1]) + rhex(md51(string)[2]) + rhex(md51(string)[3]);
}

function md5Utf8(str) {
  const utf8 = new TextEncoder().encode(str);
  let byteStr = '';
  for (let i = 0; i < utf8.length; i++) {
    byteStr += String.fromCharCode(utf8[i]);
  }
  return md5Pure(byteStr);
}

async function queryEpayOrder(outTradeNo) {
  const params = {
    act: 'order',
    pid: EPAY_PID,
    key: EPAY_KEY,
    out_trade_no: outTradeNo
  };
  const keys = Object.keys(params).sort();
  const signStr = keys.map(k => k + '=' + params[k]).join('&') + EPAY_KEY;
  const sign = md5Utf8(signStr);
  const url = EPAY_QUERY_URL + '?' + new URLSearchParams({ ...params, sign, sign_type: 'MD5' });
  
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await resp.text();
    // epay returns JSON: {"code":1,"msg":"...","data":{"status":1,...}}
    // status=1 means paid
    const data = JSON.parse(text);
    return { success: data.code === 1, status: data.data?.status, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) return addCORS(Response.json({ error: '未登录' }, { status: 401 }), request);
  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);

  let body;
  try { body = await request.json(); } catch { return addCORS(Response.json({ error: '无效请求' }, { status: 400 }), request); }
  const { out_trade_no } = body;

  // 1. Check D1 first
  const order = await db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').bind(out_trade_no).first();
  if (!order) return addCORS(Response.json({ error: '订单不存在' }, { status: 404 }), request);

  // 2. If already paid in D1, return immediately
  if (order.paid === 1) {
    return addCORS(Response.json({ paid: true, out_trade_no: order.out_trade_no }), request);
  }

  // 3. If not paid in D1, query epay directly as fallback
  const epayResult = await queryEpayOrder(out_trade_no);
  
  // epay order query: status=1 means TRADE_SUCCESS (paid)
  if (epayResult.success && epayResult.status === 1) {
    // Epay confirms paid! Activate membership now
    await db.prepare('UPDATE orders SET paid = 1, paid_at = ? WHERE out_trade_no = ?')
      .bind(Date.now(), out_trade_no).run();
    
    // Activate membership
    const days = PLAN_DAYS[order.plan] || 30;
    const levelMap = { week: 'week', month: 'month', year: 'year', '3year': 'permanent' };
    const level = levelMap[order.plan] || 'month';
    await activateMembership(db, order.username, level, days, out_trade_no, order.amount);

    return addCORS(Response.json({ paid: true, out_trade_no, source: 'epay-query' }), request);
  }

  return addCORS(Response.json({ paid: false, out_trade_no }), request);
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
