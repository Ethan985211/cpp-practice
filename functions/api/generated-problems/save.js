// POST /api/generated-problems/save — save AI-generated practice problem to D1
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, createProblem } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return addCORS(Response.json({ error: '请先登录' }, { status: 401 }), request);
  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);

  let body;
  try { body = await request.json(); } catch {
    return addCORS(Response.json({ error: '无效请求' }, { status: 400 }), request);
  }

  const practice = body.problem;
  if (!practice || !practice.title) {
    return addCORS(Response.json({ error: '缺少题目信息' }, { status: 400 }), request);
  }

  // Map AI practice fields to D1 problem fields
  const difficultyMap = { easy: 1, medium: 2, hard: 3 };
  const difficulty = difficultyMap[practice.difficulty] || 2;
  const category = (practice.tags || []).join(',') || 'general';
  const description = practice.description || '';
  const hint = practice.solution_hint || '';

  // Check for duplicate title
  const existing = await db.prepare('SELECT id FROM problems WHERE title = ?').bind(practice.title).first();
  if (existing) {
    return addCORS(Response.json({
      success: true,
      duplicate: true,
      message: '题库中已有相似题目',
      problem_id: existing.id
    }), request);
  }

  const newId = await createProblem(db, {
    title: practice.title,
    difficulty,
    category,
    description,
    input_desc: '',
    output_desc: '',
    sample_input: '',
    sample_output: '',
    hint,
    solution_code: '',
    solution_text: hint,
    test_cases: []
  }, 'ai-' + payload.username);

  // Return problem in format frontend expects
  const problem = {
    id: newId,
    title: practice.title,
    difficulty,
    difficultyLabel: ['', '简单', '中等', '困难'][difficulty],
    category,
    description,
    hint,
    stage: 8,
    stageName: 'AI生成练习',
    tags: practice.tags || [],
    solution_hint: hint
  };

  return addCORS(Response.json({
    success: true,
    problem_id: newId,
    problem
  }), request);
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
