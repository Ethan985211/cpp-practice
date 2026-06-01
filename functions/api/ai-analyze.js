// POST /api/ai-analyze — AI code analysis (member or trial)
import { verify } from '../_utils/jwt.js';
import { getDB, initDB, getMembership, useAiTrial, getAiTrials, listProblems } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

const AI_TRIAL_LIMIT = 3;
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

// Stage mapping for AI-generated problems (must match list.js + save.js)
const TAG_STAGE_MAP = {
  '数组':1,'字符串':1,'哈希表':1,'矩阵':1,'输入输出':1,'基本语法':1,'模拟':1,'数组遍历':1,
  '双指针':2,'二分查找':2,'排序':2,'前缀和':2,'滑动窗口':2,'贪心':2,
  '深度优先搜索':3,'DFS':3,'广度优先搜索':3,'BFS':3,'回溯':3,'递归':3,'剪枝':3,'搜索':3,'递归与回溯':3,
  '动态规划':4,'DP':4,'背包':4,'记忆化搜索':4,'状态压缩':4,'区间DP':4,
  '图论':5,'最短路':5,'拓扑排序':5,'并查集':5,'最小生成树':5,'网络流':5,
  '树':6,'二叉树':6,'堆':6,'线段树':6,'树状数组':6,'字典树':6,'平衡树':6,
  '数学':7,'数论':7,'组合数学':7,'几何':7,'概率':7,'博弈':7,'位运算':7
};
const STAGE_NAMES = ['', '基础入门', '基础算法', '搜索与回溯', '动态规划入门', '图论', '数据结构进阶', '数学与综合'];
function assignStage(tags) {
  const t = typeof tags === 'string' ? tags.split(/[,，]+/) : (tags || []);
  for (const tag of t) { const s = TAG_STAGE_MAP[tag.trim()]; if (s) return s; }
  return 2;
}

// Query D1 for problems matching given tags
async function findMatchingProblems(db, tags, maxResults = 5) {
  if (!tags || tags.length === 0) return [];
  // Build LIKE conditions for each tag
  const conditions = tags.map(() => "category LIKE ?").join(" OR ");
  const params = tags.map(t => `%${t}%`);
  const { results } = await db.prepare(
    `SELECT id, title, difficulty, category, description FROM problems WHERE is_published = 1 AND (${conditions}) ORDER BY id DESC LIMIT ?`
  ).bind(...params, maxResults).all();
  return (results || []).map(r => ({
    id: r.id,
    title: r.title,
    difficulty: ['', '简单', '中等', '困难'][r.difficulty] || '中等',
    category: r.category,
    description: (r.description || '').slice(0, 120)
  }));
}

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);

  // Auth
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return addCORS(Response.json({ error: '请先登录' }, { status: 401 }), request);
  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);

  const username = payload.username;
  const membership = await getMembership(db, username);
  const isMember = membership.member;

  // Check access: member or trial available
  let usedTrial = false;
  if (!isMember) {
    const trials = await getAiTrials(db, username);
    if (trials.remaining <= 0) {
      return addCORS(Response.json({ error: '试用次数已用完，请开通会员使用 AI 分析' }, { status: 402 }), request);
    }
    const result = await useAiTrial(db, username);
    if (!result.success) {
      return addCORS(Response.json({ error: result.error }, { status: 402 }), request);
    }
    usedTrial = true;
  }

  // Parse body
  let body;
  try { body = await request.json(); } catch {
    return addCORS(Response.json({ error: '无效请求' }, { status: 400 }), request);
  }
  const { code, problem_id, verdict, verdict_label, results, problem_tags, problem_difficulty } = body;
  if (!code || problem_id === undefined) {
    return addCORS(Response.json({ error: '缺少代码或题目ID' }, { status: 400 }), request);
  }

  // Query existing problems matching the same tags/category
  const existingProbs = await findMatchingProblems(db, problem_tags || [], 5);

  // Build results summary
  let resultsText = '';
  const displayResults = (results || []).slice(0, 12);
  displayResults.forEach((r, i) => {
    resultsText += `测试${i+1}(${r.case_type || 'hidden'}): ${r.verdict || '?'}`;
    if (r.expected) {
      resultsText += ` | 期望: ${String(r.expected).slice(0, 60)} | 实际: ${String(r.stdout || r.actual || '').slice(0, 60)}`;
    }
    resultsText += '\n';
  });

  const prompt = `你是C++算法教练。分析以下提交，并为学生推荐练习。

【题目ID】${problem_id}
【原题难度】${problem_difficulty || '中等'}
【原题标签】${(problem_tags || []).join(', ')}
【判题结果】${verdict_label || verdict} (${verdict})
【测试详情】
${resultsText}
【学生代码】
\`\`\`cpp
${code.slice(0, 3000)}
\`\`\`

【题库已有相关练习题】（共${existingProbs.length}道）
${existingProbs.map(p => `- [ID:${p.id}] ${p.title} | 难度:${p.difficulty} | 标签:${p.category} | ${p.description}`).join('\n') || '（题库暂无相关题）'}

请判断：上述题库已有题是否足以覆盖学生的薄弱知识点？如果足够，直接推荐已有题；如果不够，创建一道新题。

返回JSON（只返回JSON，不要其他文字）：
\`\`\`json
{
  "diagnosis": "错误原因一句话(中文,15字内)",
  "explanation": "详细解释(中文,100-200字)",
  "skills": ["需要练习的知识点1", "知识点2"],
  "tip": "一句话改进建议(中文)",
  "recommended_problem_ids": [3, 7],
  "recommendation_reason": "为什么推荐这些已有题(或为什么不推荐,中文,30字内)",
  "practice": {
    "title": "原创练习题名（不要用LeetCode已有题目名，结合新颖场景比如旅行/游戏/太空/动物等，让题目有趣）",
    "description": "题面描述(100-300字,说明输入输出要求，使用原创场景）",
    "difficulty": "easy/medium/hard（与原题难度匹配或稍低）",
    "tags": ["标签1", "标签2"],
    "solution_hint": "解题思路提示(50-100字)",
    "solution_code": "完整的C++题解代码(必须可编译运行、包含#include和main函数、有适当的注释)",
    "input_desc": "输入格式说明",
    "output_desc": "输出格式说明",
    "sample_input": "样例输入",
    "sample_output": "样例输出",
    "constraints": "约束条件(如:1<=n<=10^5, |ai|<=10^9)",
    "test_cases": [
      {"input": "样例1输入", "expected": "样例1输出"},
      {"input": "测试2输入", "expected": "测试2输出"},
      {"input": "测试3输入", "expected": "测试3输出"},
      {"input": "测试4输入", "expected": "测试4输出"},
      {"input": "测试5输入", "expected": "测试5输出"}
    ]
  }
}
\`\`\`

判断规则：
1. 如果题库已有题能充分覆盖学生的薄弱知识点 → 设置recommended_problem_ids为题目ID数组，practice设为null
2. 如果题库已有题不够或没有匹配题 → recommended_problem_ids设为空数组[]，practice填完整的原创题信息
3. 如果部分覆盖但不完整 → 同时提供recommended_problem_ids和practice（推荐已有题+补充新题）
4. 每道原创题必须有至少5个互不相同的测试用例，覆盖边界最小值、最大规模、典型场景、特殊情况
5. sample_input/sample_output必须和test_cases[0]一致`;

  // Call DeepSeek
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return addCORS(Response.json({ error: 'AI 服务未配置' }, { status: 500 }), request);
  }

  try {
    const resp = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 3000
      })
    });

    if (!resp.ok) {
      return addCORS(Response.json({ error: `AI 服务错误: ${resp.status}` }, { status: 500 }), request);
    }

    const data = await resp.json();
    let content = data.choices[0].message.content;

    // Strip markdown code blocks
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0];
    } else if (content.includes('```')) {
      content = content.split('```')[1].split('```')[0];
    }

    let analysis;
    try {
      analysis = typeof content === 'string' ? JSON.parse(content.trim()) : content;
    } catch {
      return addCORS(Response.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 }), request);
    }

    // Get updated trial info
    const trials = await getAiTrials(db, username);

    // Fetch details for recommended problems if any
    let recommended = [];
    const recIds = analysis.recommended_problem_ids || [];
    if (recIds.length > 0) {
      const recProbs = await listProblems(db, true);
      const recMap = new Map();
      recProbs.forEach(p => recMap.set(p.id, p));
      recommended = recIds.map(id => {
        const p = recMap.get(id);
        if (!p) return null;
        const difficultyLabels = ['', '简单', '中等', '困难'];
        let testCases = [];
        try { testCases = JSON.parse(p.test_cases || '[]'); } catch {}
        const s = assignStage(p.category);
        return {
          id: p.id,
          title: p.title,
          difficulty: difficultyLabels[p.difficulty] || '中等',
          stage: s,
          stageName: STAGE_NAMES[s] || '基础算法',
          prerequisites: [],
          timeComplexity: '?',
          spaceComplexity: '?',
          category: p.category,
          tags: p.category ? p.category.split(',') : [],
          description: p.description,
          inputFormat: p.input_desc || '',
          outputFormat: p.output_desc || '',
          sampleInput: p.sample_input || '',
          sampleOutput: p.sample_output || '',
          constraints: '',
          cppCode: p.solution_code || '',
          solution: p.solution_text || p.hint || '',
          solution_hint: p.hint || '',
          testCasesCount: testCases.length
        };
      }).filter(Boolean);
    }

    return addCORS(Response.json({
      success: true,
      analysis,
      recommended_problems: recommended,
      ai_trials: { used: trials.used, remaining: trials.remaining },
      trial_used: usedTrial
    }), request);

  } catch (e) {
    return addCORS(Response.json({ error: `AI 服务异常: ${e.message}` }, { status: 500 }), request);
  }
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
