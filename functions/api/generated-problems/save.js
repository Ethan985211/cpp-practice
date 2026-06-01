// POST /api/generated-problems/save — save AI-generated practice problem to D1
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, createProblem } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

const CVM_JUDGE_URL = 'http://82.156.34.78/api/add-test-cases';

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

  // Detect difficulty format
  const difficultyMap = { easy: 1, medium: 2, hard: 3 };
  const difficulty = difficultyMap[practice.difficulty] || 
    (practice.difficulty === '简单' ? 1 : practice.difficulty === '中等' ? 2 : practice.difficulty === '困难' ? 3 : 2);
  const difficultyLabel = ['', '简单', '中等', '困难'][difficulty];
  const category = (practice.tags || []).join(',') || 'general';
  const description = practice.description || '';
  const hint = practice.solution_hint || '';

  // Check for duplicate title — if exists, append suffix instead of rejecting
  let finalTitle = practice.title;
  let duplicate = false;
  const existing = await db.prepare('SELECT id FROM problems WHERE title = ?').bind(practice.title).first();
  if (existing) {
    // Check with suffixes until we find a unique name
    const suffixes = ['（练习）', '（变体）', '（进阶）'];
    for (const suffix of suffixes) {
      const testTitle = practice.title + suffix;
      const recheck = await db.prepare('SELECT id FROM problems WHERE title = ?').bind(testTitle).first();
      if (!recheck) { finalTitle = testTitle; break; }
    }
    if (finalTitle === practice.title) {
      // All suffixes taken, use timestamp
      finalTitle = practice.title + '（' + Date.now().toString(36) + '）';
    }
    duplicate = true;
  }

  // Normalize test cases
  const testCases = (practice.test_cases || []).map(tc => ({
    input: String(tc.input || ''),
    expected: String(tc.expected || ''),
    type: 'hidden'
  }));

  const newId = await createProblem(db, {
    title: finalTitle,
    difficulty,
    category,
    description,
    input_desc: practice.input_desc || '',
    output_desc: practice.output_desc || '',
    sample_input: practice.sample_input || '',
    sample_output: practice.sample_output || '',
    hint,
    solution_code: '',
    solution_text: hint,
    test_cases: testCases
  }, 'ai-' + payload.username);

  // Build complete problem object for frontend
  const problem = {
    id: newId,
    title: finalTitle,
    difficulty: difficultyLabel,
    stage: 8,
    stageName: 'AI生成练习',
    prerequisites: [],
    timeComplexity: '?',
    spaceComplexity: '?',
    category,
    tags: practice.tags || [],
    description,
    inputFormat: practice.input_desc || '',
    outputFormat: practice.output_desc || '',
    sampleInput: practice.sample_input || '',
    sampleOutput: practice.sample_output || '',
    constraints: practice.constraints || '',
    cppCode: '',
    solution: hint,
    solution_hint: hint,
    testCasesCount: testCases.length
  };

  // Forward test cases to CVM judge server (fire-and-forget)
  if (testCases.length > 0) {
    try {
      await fetch(CVM_JUDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: newId, test_cases: testCases })
      });
    } catch (e) {
      // Non-critical: CVM might be unreachable from CF Pages
      console.log('CVM test cases sync failed:', e.message);
    }
  }

  return addCORS(Response.json({
    success: true,
    problem_id: newId,
    problem,
    duplicate: duplicate || false
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
