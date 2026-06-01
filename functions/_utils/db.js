// D1 database helpers

let _initialized = false;

export async function initDB(db) {
  if (_initialized) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS accounts (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      ai_trials_used INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      username TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      expire_at INTEGER NOT NULL,
      activated_at INTEGER NOT NULL,
      trade_no TEXT DEFAULT '',
      amount TEXT DEFAULT '0.00'
    );
    CREATE TABLE IF NOT EXISTS orders (
      out_trade_no TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      paid INTEGER DEFAULT 0,
      paid_at INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1,
      category TEXT DEFAULT 'general',
      description TEXT DEFAULT '',
      input_desc TEXT DEFAULT '',
      output_desc TEXT DEFAULT '',
      sample_input TEXT DEFAULT '',
      sample_output TEXT DEFAULT '',
      hint TEXT DEFAULT '',
      solution_code TEXT DEFAULT '',
      solution_text TEXT DEFAULT '',
      test_cases TEXT DEFAULT '[]',
      is_published INTEGER DEFAULT 1,
      created_by TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      problem_ids TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 0,
      created_by TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contest_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contest_id INTEGER NOT NULL,
      problem_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      score INTEGER DEFAULT 0,
      submitted_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_progress (
      username TEXT PRIMARY KEY,
      progress TEXT DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_memberships_expire ON memberships(expire_at);
    CREATE INDEX IF NOT EXISTS idx_orders_username ON orders(username);
    CREATE INDEX IF NOT EXISTS idx_contest_subs_contest ON contest_submissions(contest_id);
    CREATE INDEX IF NOT EXISTS idx_contest_subs_user ON contest_submissions(username);
  `;
  // D1 doesn't support multiple statements, run one by one
  for (const stmt of sql.split(';').map(s => s.trim()).filter(s => s.length > 0)) {
    await db.prepare(stmt).run();
  }
  // Add role column to existing accounts table (ignore error if already exists)
  try { await db.prepare("ALTER TABLE accounts ADD COLUMN role TEXT DEFAULT 'user'").run(); } catch (_) {}
  // Add ai_trials_used column
  try { await db.prepare("ALTER TABLE accounts ADD COLUMN ai_trials_used INTEGER DEFAULT 0").run(); } catch (_) {}
  _initialized = true;
}

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

// --- Admin helpers ---

export async function isAdmin(db, username, env) {
  // Check DB role first
  const acct = await db.prepare('SELECT role FROM accounts WHERE username = ?').bind(username).first();
  if (acct && acct.role === 'admin') return true;
  // Also check env-configured admin list (ADMIN_USERNAMES=user1,user2)
  if (env && env.ADMIN_USERNAMES) {
    const admins = env.ADMIN_USERNAMES.split(',').map(s => s.trim());
    if (admins.includes(username)) return true;
  }
  return false;
}

export async function setUserRole(db, username, role) {
  await db.prepare('UPDATE accounts SET role = ? WHERE username = ?').bind(role, username).run();
}

export async function listUsers(db) {
  const { results } = await db.prepare(
    'SELECT username, role, created_at FROM accounts ORDER BY created_at DESC'
  ).all();
  return results || [];
}

// --- Problem helpers ---

export async function listProblems(db, publishedOnly = false) {
  let sql = 'SELECT * FROM problems';
  if (publishedOnly) sql += ' WHERE is_published = 1';
  sql += ' ORDER BY id DESC';
  const { results } = await db.prepare(sql).all();
  return (results || []).map(r => ({ ...r, test_cases: JSON.parse(r.test_cases || '[]') }));
}

export async function getProblem(db, id) {
  const row = await db.prepare('SELECT * FROM problems WHERE id = ?').bind(id).first();
  if (!row) return null;
  return { ...row, test_cases: JSON.parse(row.test_cases || '[]') };
}

export async function createProblem(db, data, username) {
  const now = Date.now();
  const info = await db.prepare(
    `INSERT INTO problems (title, difficulty, category, description, input_desc, output_desc,
     sample_input, sample_output, hint, solution_code, solution_text, test_cases, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    data.title, data.difficulty || 1, data.category || 'general',
    data.description || '', data.input_desc || '', data.output_desc || '',
    data.sample_input || '', data.sample_output || '', data.hint || '',
    data.solution_code || '', data.solution_text || '',
    JSON.stringify(data.test_cases || []), username, now, now
  ).run();
  return info.meta?.last_row_id || 0;
}

export async function updateProblem(db, id, data) {
  const now = Date.now();
  await db.prepare(
    `UPDATE problems SET title=?, difficulty=?, category=?, description=?, input_desc=?, output_desc=?,
     sample_input=?, sample_output=?, hint=?, solution_code=?, solution_text=?, test_cases=?, updated_at=?
     WHERE id=?`
  ).bind(
    data.title, data.difficulty || 1, data.category || 'general',
    data.description || '', data.input_desc || '', data.output_desc || '',
    data.sample_input || '', data.sample_output || '', data.hint || '',
    data.solution_code || '', data.solution_text || '',
    JSON.stringify(data.test_cases || []), now, id
  ).run();
}

export async function deleteProblem(db, id) {
  await db.prepare('DELETE FROM problems WHERE id = ?').bind(id).run();
}

// --- Contest helpers ---

export async function listContests(db) {
  const { results } = await db.prepare(
    'SELECT * FROM contests ORDER BY created_at DESC'
  ).all();
  return (results || []).map(r => ({ ...r, problem_ids: JSON.parse(r.problem_ids || '[]') }));
}

export async function getContest(db, id) {
  const row = await db.prepare('SELECT * FROM contests WHERE id = ?').bind(id).first();
  if (!row) return null;
  return { ...row, problem_ids: JSON.parse(row.problem_ids || '[]') };
}

export async function createContest(db, data, username) {
  const now = Date.now();
  const info = await db.prepare(
    `INSERT INTO contests (title, description, start_time, end_time, problem_ids, is_active, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(
    data.title, data.description || '', data.start_time || 0, data.end_time || 0,
    JSON.stringify(data.problem_ids || []), data.is_active || 0, username, now
  ).run();
  return info.meta?.last_row_id || 0;
}

export async function updateContest(db, id, data) {
  await db.prepare(
    `UPDATE contests SET title=?, description=?, start_time=?, end_time=?, problem_ids=?, is_active=?
     WHERE id=?`
  ).bind(
    data.title, data.description || '', data.start_time || 0, data.end_time || 0,
    JSON.stringify(data.problem_ids || []), data.is_active || 0, id
  ).run();
}

export async function deleteContest(db, id) {
  await db.prepare('DELETE FROM contests WHERE id = ?').bind(id).run();
  await db.prepare('DELETE FROM contest_submissions WHERE contest_id = ?').bind(id).run();
}

// --- Contest submissions ---

export async function submitContestCode(db, contestId, problemId, username, code) {
  const info = await db.prepare(
    'INSERT INTO contest_submissions (contest_id, problem_id, username, code, status, submitted_at) VALUES (?,?,?,?,?,?)'
  ).bind(contestId, problemId, username, code, 'pending', Date.now()).run();
  return info.meta?.last_row_id || 0;
}

export async function getContestRanking(db, contestId) {
  // Rank by: most problems solved, then total score
  const { results } = await db.prepare(
    `SELECT username, COUNT(DISTINCT problem_id) as solved, SUM(score) as total_score
     FROM contest_submissions WHERE contest_id = ? AND status = 'accepted'
     GROUP BY username ORDER BY solved DESC, total_score DESC`
  ).bind(contestId).all();
  return results || [];
}

// --- AI Trial helpers ---

const AI_TRIAL_LIMIT = 3;

export async function getAiTrials(db, username) {
  const row = await db.prepare('SELECT ai_trials_used FROM accounts WHERE username = ?').bind(username).first();
  if (!row) return { used: 0, remaining: AI_TRIAL_LIMIT };
  const used = row.ai_trials_used || 0;
  return { used, remaining: Math.max(0, AI_TRIAL_LIMIT - used) };
}

export async function useAiTrial(db, username) {
  const trials = await getAiTrials(db, username);
  if (trials.remaining <= 0) return { success: false, error: '试用次数已用完' };
  await db.prepare('UPDATE accounts SET ai_trials_used = ai_trials_used + 1 WHERE username = ?').bind(username).run();
  return { success: true, remaining: trials.remaining - 1, used: trials.used + 1 };
}
