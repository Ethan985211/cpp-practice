// POST /api/epay/notify — epay payment notification (IPN)
import { getDB, initDB, markOrderPaid, activateMembership } from '../../_utils/db.js';

const EPAY_KEY = 'a3NcrTlnT1anCcQGyAWb';

const PLAN_DAYS = {
  week: 7,
  month: 30,
  year: 365,
  '3year': 1095
};

// Pure JS MD5 (same as in create-order.js)
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

// MD5 helper that properly handles UTF-8 (md5Pure is ASCII-only)
function md5Utf8(str) {
  const utf8 = new TextEncoder().encode(str);
  let byteStr = '';
  for (let i = 0; i < utf8.length; i++) {
    byteStr += String.fromCharCode(utf8[i]);
  }
  return md5Pure(byteStr);
}

export async function onRequestPost({ env, request }) {
  return handleNotify(env, request, false);
}

export async function onRequestGet({ env, request }) {
  return handleNotify(env, request, true);
}

async function handleNotify(env, request, isGet) {
  const db = getDB(env);
  await initDB(db);

  // Parse params (POST body or GET query string)
  let params;
  try {
    if (isGet) {
      const url = new URL(request.url);
      params = {};
      for (const [k, v] of url.searchParams) { params[k] = v; }
    } else {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        params = await request.json();
      } else {
        const text = await request.text();
        params = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } catch {
    return new Response('fail', { status: 400 });
  }

  // Verify sign
  const receivedSign = params.sign;
  const keys = Object.keys(params).filter(k => k !== 'sign' && k !== 'sign_type').sort();
  const signStr = keys.map(k => k + '=' + (params[k] || '')).join('&') + EPAY_KEY;
  const computedSign = md5Utf8(signStr);

  if (receivedSign !== computedSign) {
    return new Response('sign error', { status: 400 });
  }

  // Check trade status
  const tradeStatus = params.trade_status;
  if (tradeStatus !== 'TRADE_SUCCESS') {
    return new Response('success'); // Not a success payment, acknowledge
  }

  const outTradeNo = params.out_trade_no;
  if (!outTradeNo) return new Response('fail', { status: 400 });

  // Get order info
  const order = await db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').bind(outTradeNo).first();
  if (!order) return new Response('fail', { status: 400 });

  // Skip if already paid
  if (order.paid === 1) return new Response('success');

  // Mark order paid
  await markOrderPaid(db, outTradeNo);

  // Activate membership
  const days = PLAN_DAYS[order.plan] || 30;
  const levelMap = { week: 'week', month: 'month', year: 'year', '3year': 'permanent' };
  const level = levelMap[order.plan] || 'month';
  const amount = params.money || order.amount;

  await activateMembership(db, order.username, level, days, outTradeNo, amount);

  return new Response('success');
}
