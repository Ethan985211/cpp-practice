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

  const difficultyLabels = ['', '简单', '中等', '困难'];

  const problems = (results || []).map(r => {
    let testCases = [];
    try { testCases = JSON.parse(r.test_cases || '[]'); } catch {}

    return {
      id: r.id,
      title: r.title,
      difficulty: difficultyLabels[r.difficulty] || '中等',
      stage: 8,
      stageName: 'AI生成练习',
      prerequisites: [],
      timeComplexity: '?',
      spaceComplexity: '?',
      category: r.category,
      tags: r.category ? r.category.split(',') : [],
      description: r.description,
      inputFormat: r.input_desc || '',
      outputFormat: r.output_desc || '',
      sampleInput: r.sample_input || '',
      sampleOutput: r.sample_output || '',
      constraints: '',
      cppCode: '',
      solution: r.solution_text || r.hint || '',
      solution_hint: r.hint || '',
      testCasesCount: testCases.length
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
