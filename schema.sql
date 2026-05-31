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

CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_memberships_expire ON memberships(expire_at);
CREATE INDEX IF NOT EXISTS idx_orders_username ON orders(username);
