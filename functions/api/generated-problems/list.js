// GET /api/generated-problems/list — list AI-generated problems from D1
import { getDB, initDB } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

// Stage assignment based on category/tags
const STAGE_MAP = [
  { stage: 1, name: '基础入门', tags: ['数组','字符串','哈希表','链表','栈','队列','模拟','基础','指针'] },
  { stage: 2, name: '基础算法', tags: ['双指针','滑动窗口','前缀和','二分查找','排序','贪心','分治'] },
  { stage: 3, name: '搜索与回溯', tags: ['DFS','BFS','回溯','剪枝','递归','搜索','枚举'] },
  { stage: 4, name: '动态规划入门', tags: ['动态规划','DP','背包','记忆化搜索','状态压缩','线性DP'] },
  { stage: 5, name: '图论', tags: ['图','最短路','Dijkstra','拓扑排序','MST','并查集','最小生成树'] },
  { stage: 6, name: '数据结构进阶', tags: ['树','堆','线段树','Trie','二叉搜索树','平衡树','单调栈','优先队列','前缀树'] },
  { stage: 7, name: '数学与综合', tags: ['数学','数论','组合','博弈','几何','位运算','概率','矩阵'] },
];

function assignStage(category, tags) {
  const allTags = [...(tags || []), category].filter(Boolean).map(t => t.toLowerCase());
  for (const s of STAGE_MAP) {
    if (s.tags.some(kw => allTags.includes(kw.toLowerCase()))) {
      return { stage: s.stage, name: s.name };
    }
  }
  return { stage: 2, name: '基础算法' };
}

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

    const category = r.category || '';
    const tags = category ? category.split(',').map(t => t.trim()) : [];
    const si = assignStage(category, tags);

    return {
      id: r.id + 100000,
      id_raw: r.id,
      title: r.title,
      difficulty: difficultyLabels[r.difficulty] || '中等',
      stage: si.stage,
      stageName: si.name,
      prerequisites: [],
      timeComplexity: '?',
      spaceComplexity: '?',
      category: r.category,
      tags: tags,
      description: r.description || '',
      inputFormat: r.input_desc || '',
      outputFormat: r.output_desc || '',
      sampleInput: r.sample_input || '',
      sampleOutput: r.sample_output || '',
      constraints: '',
      cppCode: r.solution_code || '',
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
