// POST /api/ai-analyze — AI code analysis (member or trial)
import { verify } from '../_utils/jwt.js';
import { getDB, initDB, getMembership, useAiTrial, getAiTrials } from '../_utils/db.js';
import { addCORS } from '../_utils/cors.js';

const AI_TRIAL_LIMIT = 3;
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

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
  const { code, problem_id, verdict, verdict_label, results } = body;
  if (!code || problem_id === undefined) {
    return addCORS(Response.json({ error: '缺少代码或题目ID' }, { status: 400 }), request);
  }

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

  const prompt = `你是C++算法教练。分析以下提交，并为学生生成一道**原创**配套练习题。

【题目ID】${problem_id}
【判题结果】${verdict_label || verdict} (${verdict})
【测试详情】
${resultsText}
【学生代码】
\`\`\`cpp
${code.slice(0, 3000)}
\`\`\`

请分析并返回JSON:
\`\`\`json
{
  "diagnosis": "错误原因一句话(中文,15字内)",
  "explanation": "详细解释(中文,100-200字)",
  "skills": ["需要练习的知识点1", "知识点2"],
  "tip": "一句话改进建议(中文)",
  "practice": {
    "title": "原创练习题名（不要用LeetCode已有题目名，结合新颖场景比如旅行/游戏/太空/动物等，让题目有趣）",
    "description": "题面描述(100-300字,说明输入输出要求，使用原创场景）",
    "difficulty": "easy/medium/hard（与原题难度匹配或稍低）",
    "tags": ["标签1", "标签2"],
    "solution_hint": "解题思路提示(50-100字)",
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

重要规则：
1. practice必须是一道**全新的原创题**，不是LeetCode/洛谷/Codeforces已有原题。改变场景包装（如买卖股票→收集魔法水晶），让算法核心不变但题目焕然一新。
2. 至少5个测试用例，每个用例互不相同，覆盖：边界最小值、最大规模、典型场景、特殊情况（空输入/全是相同值/极值等）。
3. sample_input/sample_output必须和test_cases[0]一致。
4. 只返回JSON，不要任何额外文字。`;

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

    return addCORS(Response.json({
      success: true,
      analysis,
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
