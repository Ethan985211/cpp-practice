// POST /api/generated-problems/save — save AI-generated practice problem to D1
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, createProblem } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

const CVM_JUDGE_URL = 'http://82.156.34.78/api/add-test-cases';

// Stage assignment based on tags
const TAG_STAGE_MAP = {
  '数组':1,'字符串':1,'哈希表':1,'链表':1,'栈':1,'队列':1,'模拟':1,'基础':1,'指针':1,
  '双指针':2,'滑动窗口':2,'前缀和':2,'二分查找':2,'排序':2,'贪心':2,'分治':2,
  'DFS':3,'BFS':3,'回溯':3,'剪枝':3,'递归':3,'搜索':3,'枚举':3,
  '动态规划':4,'DP':4,'背包':4,'记忆化搜索':4,'状态压缩':4,'线性DP':4,
  '图':5,'最短路':5,'Dijkstra':5,'拓扑排序':5,'MST':5,'并查集':5,'最小生成树':5,
  '树':6,'堆':6,'线段树':6,'Trie':6,'二叉搜索树':6,'平衡树':6,'单调栈':6,'优先队列':6,'前缀树':6,
  '数学':7,'数论':7,'组合':7,'博弈':7,'几何':7,'位运算':7,'概率':7,'矩阵':7
};
const STAGE_NAMES = {1:'基础入门',2:'基础算法',3:'搜索与回溯',4:'动态规划入门',5:'图论',6:'数据结构进阶',7:'数学与综合'};

function assignStage(tags) {
  for (const t of (tags || [])) {
    const s = TAG_STAGE_MAP[t.toLowerCase()];
    if (s) return s;
  }
  return 2;
}

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
    solution_code: practice.solution_code || '',
    solution_text: hint,
    test_cases: testCases
  }, 'ai-' + payload.username);

  // Build complete problem object for frontend
  const offsetId = newId + 100000;
  const stageNum = assignStage(practice.tags || []);
  const problem = {
    id: offsetId,
    id_raw: newId,
    title: finalTitle,
    difficulty: difficultyLabel,
    stage: stageNum,
    stageName: STAGE_NAMES[stageNum],
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
    cppCode: practice.solution_code || '',
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
    problem_id: offsetId,
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
