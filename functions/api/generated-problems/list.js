// GET /api/generated-problems/list — list AI-generated problems from D1
import { getDB, initDB } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

export async function onRequestGet({ env, request }) {
  const db = getDB(env);
  await initDB(db);

  // Get problems created by AI (created_by starts with 'ai-')
  const { results } = await db.prepare(
    "SELECT * FROM problems WHERE created_by LIKE 'ai-%' AND is_published = 1 ORDER BY id DESC"
  ).all();

  const problems = (results || []).map(r => {
    const difficultyLabels = ['', '简单', '中等', '困难'];
    return {
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      difficultyLabel: difficultyLabels[r.difficulty] || '中等',
      category: r.category,
      description: r.description,
      hint: r.hint,
      stage: 8,
      stageName: 'AI生成练习',
      tags: r.category ? r.category.split(',') : [],
      solution_hint: r.hint || ''
    };
  });

  return addCORS(Response.json(problems), request);
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
