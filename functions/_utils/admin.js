// Admin auth middleware
import { verify } from './jwt.js';
import { getDB, initDB, isAdmin } from './db.js';

export async function requireAdmin(env, request) {
  const db = getDB(env);
  await initDB(db);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) throw { status: 401, message: '请先登录' };

  const payload = await verify(token);
  if (!payload) throw { status: 401, message: '登录已过期' };

  const admin = await isAdmin(db, payload.username, env);
  if (!admin) throw { status: 403, message: '需要管理员权限' };

  return { db, username: payload.username };
}
