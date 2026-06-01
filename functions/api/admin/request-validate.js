// POST /api/admin/request-validate — queue a problem for validation
import { requireAdmin } from '../../_utils/admin.js';
import { getProblem } from '../../_utils/db.js';
import { addCORS } from '../../_utils/cors.js';

export async function onRequestPost({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const data = await request.json();
    const { problem_id } = data;

    if (!problem_id) {
      return addCORS(Response.json({ error: '缺少 problem_id' }, { status: 400 }), request);
    }

    const problem = await getProblem(db, parseInt(problem_id));
    if (!problem) {
      return addCORS(Response.json({ error: '题目不存在' }, { status: 404 }), request);
    }

    if (problem.is_published === 1) {
      return addCORS(Response.json({ error: '题目已发布，无需验证' }, { status: 400 }), request);
    }

    if (!problem.solution_code) {
      return addCORS(Response.json({ error: '题目没有题解代码，无法验证' }, { status: 400 }), request);
    }

    if (!problem.test_cases || problem.test_cases.length === 0) {
      return addCORS(Response.json({ error: '题目没有测试用例，无法验证' }, { status: 400 }), request);
    }

    // Validation will be picked up by cron job
    // Just confirm the request is valid
    console.log(`Validation requested for problem #${problem_id}: ${problem.title} (${problem.test_cases.length} test cases)`);

    return addCORS(Response.json({ 
      success: true, 
      message: `题目「${problem.title}」验证请求已接收，系统将在后台自动执行验证。`,
      problem_id,
      test_case_count: problem.test_cases.length
    }), request);
  } catch (e) {
    return addCORS(Response.json({ error: e.message }, { status: e.status || 500 }), request);
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
