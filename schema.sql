-- D1 Database Schema for C++ Practice Platform
-- Run this in Cloudflare D1: npx wrangler d1 execute cpp-practice-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS accounts (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_memberships_expire ON memberships(expire_at);
CREATE INDEX IF NOT EXISTS idx_orders_username ON orders(username);
