// D1 database helpers

export function getDB(env) {
  if (!env || !env.DB) {
    throw new Error('D1 database not bound. Set DB binding in Cloudflare Pages dashboard.');
  }
  return env.DB;
}

// --- Account operations ---

export async function createAccount(db, username, passwordHash, salt) {
  const existing = await db.prepare('SELECT username FROM accounts WHERE username = ?').bind(username).first();
  if (existing) return { error: '用户名已存在' };

  await db.prepare(
    'INSERT INTO accounts (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)'
  ).bind(username, passwordHash, salt, Date.now()).run();
  return { success: true };
}

export async function getAccount(db, username) {
  return await db.prepare('SELECT * FROM accounts WHERE username = ?').bind(username).first();
}

// --- Session operations ---

export async function createSession(db, token, username, expiresIn = 86400) {
  const now = Date.now();
  const expiresAt = now + expiresIn * 1000;
  await db.prepare(
    'INSERT INTO sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, username, now, expiresAt).run();
}

export async function validateSession(db, token) {
  const row = await db.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, Date.now()).first();
  return row || null;
}

// --- Membership operations ---

export async function getMembership(db, username) {
  const row = await db.prepare(
    'SELECT * FROM memberships WHERE username = ? AND expire_at > ?'
  ).bind(username, Math.floor(Date.now() / 1000)).first();
  if (!row) return { member: false, level: null, expire_at: null, days_left: 0 };
  const daysLeft = Math.ceil((row.expire_at - Math.floor(Date.now() / 1000)) / 86400);
  return { member: true, level: row.level, expire_at: row.expire_at, days_left: daysLeft, activated_at: row.activated_at };
}

export async function activateMembership(db, username, level, days, tradeNo, amount) {
  const now = Math.floor(Date.now() / 1000);
  const expireAt = now + days * 86400;

  // Upsert: delete old then insert
  await db.prepare('DELETE FROM memberships WHERE username = ?').bind(username).run();
  await db.prepare(
    'INSERT INTO memberships (username, level, expire_at, activated_at, trade_no, amount) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(username, level, expireAt, now, tradeNo, amount).run();
}

// --- Order operations ---

export async function createOrder(db, outTradeNo, username, plan, amount) {
  await db.prepare(
    'INSERT INTO orders (out_trade_no, username, plan, amount, created_at, paid) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(outTradeNo, username, plan, amount, Date.now(), 0).run();
}

export async function markOrderPaid(db, outTradeNo) {
  await db.prepare(
    'UPDATE orders SET paid = 1, paid_at = ? WHERE out_trade_no = ?'
  ).bind(Date.now(), outTradeNo).run();
}

export async function getOrderStatus(db, outTradeNo) {
  const row = await db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').bind(outTradeNo).first();
  if (!row) return null;
  return { paid: row.paid === 1, out_trade_no: row.out_trade_no, username: row.username, plan: row.plan, amount: row.amount };
}
