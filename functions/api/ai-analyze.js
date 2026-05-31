// POST /api/ai-analyze — AI code analysis (member or trial)
import { verify } from '../_utils/jwt.js';
import { getDB, initDB, getMembership, useAiTrial, getAiTrials } from '../_utils/db.js';

const AI_TRIAL_LIMIT = 3;
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);

  // Auth
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return Response.json({ error: '请先登录' }, { status: 401 });
  const payload = await verify(token);
  if (!payload) return Response.json({ error: '登录已过期' }, { status: 401 });

  const username = payload.username;
  const membership = await getMembership(db, username);
  const isMember = membership.member;

  // Check access: member or trial available
  let usedTrial = false;
  if (!isMember) {
    const trials = await getAiTrials(db, username);
    if (trials.remaining <= 0) {
      return Response.json({ error: '试用次数已用完，请开通会员使用 AI 分析' }, { status: 402 });
    }
    const result = await useAiTrial(db, username);
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 402 });
    }
    usedTrial = true;
  }

  // Parse body
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: '无效请求' }, { status: 400 });
  }
  const { code, problem_id, verdict, verdict_label, results } = body;
  if (!code || problem_id === undefined) {
    return Response.json({ error: '缺少代码或题目ID' }, { status: 400 });
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

  const prompt = `你是C++算法教练。分析以下提交:

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
    "title": "配套练习题目标题",
    "description": "题面描述(含示例)",
    "difficulty": "easy/medium/hard",
    "tags": ["标签1", "标签2"],
    "solution_hint": "解题思路提示"
  }
}
\`\`\`
只返回JSON。`;

  // Call DeepSeek
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
  }

  try {
    const resp = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({ error: `AI 服务错误: ${resp.status}` }, { status: 500 });
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
      return Response.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    // Get updated trial info
    const trials = await getAiTrials(db, username);

    return Response.json({
      success: true,
      analysis,
      ai_trials: { used: trials.used, remaining: trials.remaining },
      trial_used: usedTrial
    });

  } catch (e) {
    return Response.json({ error: `AI 服务异常: ${e.message}` }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
