// POST /api/generated-problems/generate-solution — backfill solution_code for existing problems
import { verify } from '../../_utils/jwt.js';
import { getDB, initDB, isAdmin } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

export async function onRequestPost({ env, request }) {
  const db = getDB(env);
  await initDB(db);

  // Admin auth
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return addCORS(Response.json({ error: '请先登录' }, { status: 401 }), request);
  const payload = await verify(token);
  if (!payload) return addCORS(Response.json({ error: '登录已过期' }, { status: 401 }), request);
  const admin = await isAdmin(db, payload.username, env);
  if (!admin) return addCORS(Response.json({ error: '需要管理员权限' }, { status: 403 }), request);

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return addCORS(Response.json({ error: 'AI 服务未配置' }, { status: 500 }), request);

  let body;
  try { body = await request.json(); } catch {
    return addCORS(Response.json({ error: '无效请求' }, { status: 400 }), request);
  }
  const problemIds = body.problem_ids;
  if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
    return addCORS(Response.json({ error: '缺少 problem_ids 数组' }, { status: 400 }), request);
  }

  const results = [];
  for (const rawId of problemIds) {
    // Convert frontend ID (100000+offset) to DB ID
    const dbId = rawId > 100000 ? rawId - 100000 : rawId;
    try {
      // Get problem from D1
      const { results: rows } = await db.prepare(
        'SELECT id, title, description, difficulty, category, test_cases, input_desc, output_desc, sample_input, sample_output, constraints, solution_text, solution_code FROM problems WHERE id = ?'
      ).bind(dbId).all();

      if (!rows || rows.length === 0) {
        results.push({ id: rawId, success: false, error: '题目不存在' });
        continue;
      }
      const p = rows[0];

      // Skip if already has solution_code
      if (p.solution_code && p.solution_code.trim().length > 20) {
        results.push({ id: rawId, success: true, skipped: true, reason: '已有题解代码' });
        continue;
      }

      // Build prompt
      const difficultyLabels = ['', '简单', '中等', '困难'];
      let testCases = [];
      try { testCases = JSON.parse(p.test_cases || '[]'); } catch {}
      const sampleTc = testCases.length > 0 ? testCases[0] : null;

      const prompt = `你是一位C++算法教练。请为以下算法题编写完整的C++题解代码。

【题目名称】${p.title}
【难度】${difficultyLabels[p.difficulty] || '中等'}
【标签】${p.category || ''}
【题目描述】${p.description || ''}
【输入格式】${p.input_desc || ''}
【输出格式】${p.output_desc || ''}
${sampleTc ? `【样例输入】${sampleTc.input}\n【样例输出】${sampleTc.expected}` : ''}
【约束条件】${p.constraints || ''}

请返回一个JSON对象（只返回JSON，不要其他文字）：
\`\`\`json
{
  "solution_code": "完整的C++题解代码（必须可编译运行、包含必要的#include头文件、包含int main()函数、有适当的注释、代码规范整洁）"
}
\`\`\`

要求：
1. 代码必须完整可编译运行，包含所有必要的#include
2. 必须包含main函数，main中读取输入并调用solve函数输出结果
3. 添加有意义的注释
4. 使用标准C++17语法
5. 时间复杂度要最优`;

      const resp = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2500
        })
      });

      if (!resp.ok) {
        results.push({ id: rawId, success: false, error: `AI API error: ${resp.status}` });
        continue;
      }

      const data = await resp.json();
      let content = data.choices[0].message.content;

      // Strip markdown code blocks
      if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        content = content.split('```')[1].split('```')[0];
      }

      let parsed;
      try {
        parsed = typeof content === 'string' ? JSON.parse(content.trim()) : content;
      } catch {
        results.push({ id: rawId, success: false, error: 'AI 返回格式异常' });
        continue;
      }

      const solutionCode = parsed.solution_code || '';
      if (!solutionCode || solutionCode.trim().length < 10) {
        results.push({ id: rawId, success: false, error: 'AI 未生成有效代码' });
        continue;
      }

      // Update D1
      await db.prepare(
        'UPDATE problems SET solution_code = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(solutionCode, dbId).run();

      results.push({ id: rawId, success: true, dbId, solution_length: solutionCode.length });
    } catch (e) {
      results.push({ id: rawId, success: false, error: e.message });
    }
  }

  return addCORS(Response.json({ success: true, results }), request);
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
