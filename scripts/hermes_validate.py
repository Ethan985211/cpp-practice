#!/usr/bin/env python3
"""Hermes 验证工作流：从 D1 取出题目 → CVM 编译运行 → 更新发布状态

用法:
  python3 hermes_validate.py <problem_id>
  python3 hermes_validate.py --data '<solution_code>' '<test_cases_json>' --title "题名"

需要 CF Pages admin 账号密码在环境变量或参数指定。
"""

import sys, json, os, io, subprocess, time
import paramiko

CF_API = "https://cpp-practice.pages.dev/api"
CVM_HOST = "82.156.34.78"
CVM_USER = "root"
CVM_PASS = ".Jxh2917834376"
ADMIN_USER = os.environ.get("CPP_ADMIN_USER", "ethan")
ADMIN_PASS = os.environ.get("CPP_ADMIN_PASS", "test1234")

def login():
    """获取 admin JWT token"""
    import urllib.request
    req = urllib.request.Request(
        f"{CF_API}/login",
        data=json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS}).encode(),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read())
    if not data.get("token"):
        raise RuntimeError(f"登录失败: {data}")
    return data["token"]

def get_problem(token, problem_id):
    """从 admin API 获取题目详情"""
    import urllib.request
    # 需要看所有题目（包括未发布），用 admin list?
    # 直接查询单个题目
    req = urllib.request.Request(
        f"{CF_API}/admin/problems?id={problem_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        return data.get("problem")
    except Exception as e:
        print(f"获取题目失败: {e}")
        return None

def update_validation(token, problem_id, is_published):
    """更新题目发布状态"""
    import urllib.request
    req = urllib.request.Request(
        f"{CF_API}/admin/validate-problem",
        data=json.dumps({"problem_id": int(problem_id), "is_published": is_published}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read())

def validate_on_cvm(solution_code, test_cases_str):
    """SSH 到 CVM，编译运行验证"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(CVM_HOST, username=CVM_USER, password=CVM_PASS, timeout=30)

    # 写 solution 文件
    sftp = client.open_sftp()
    cpp_path = f"/tmp/validate_{int(time.time())}.cpp"
    sftp.putfo(io.BytesIO(solution_code.encode()), cpp_path)
    sftp.close()

    # 运行验证
    tc_escaped = test_cases_str.replace("'", "'\\''")
    stdin, stdout, stderr = client.exec_command(
        f"python3 /data/cpp-practice-site/validate_problem.py {cpp_path} '{tc_escaped}'",
        timeout=60
    )
    result = stdout.read().decode().strip()
    err = stderr.read().decode().strip()

    # 清理
    client.exec_command(f"rm -f {cpp_path} {cpp_path.replace('.cpp','.out')}")

    client.close()

    if err:
        print(f"CVM stderr: {err}")
    return json.loads(result)

def validate_by_data(solution_code, test_cases, title="未命名题目"):
    """直接用数据验证（不查询 D1）"""
    tc_json = json.dumps(test_cases, ensure_ascii=False)
    print(f"验证题目: {title}")
    print(f"测试用例数: {len(test_cases)}")

    result = validate_on_cvm(solution_code, tc_json)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if result.get("success"):
        print(f"✓ 全部 {result['total']} 个测试用例通过")
    else:
        print(f"✗ {result.get('passed', 0)}/{result.get('total', 0)} 通过")
        for f in result.get("failures", []):
            print(f"  用例 #{f['case']}: {f.get('error', '')}")
    return result

def validate_by_id(problem_id):
    """通过 D1 题目 ID 验证"""
    print(f"获取题目 #{problem_id}...")
    token = login()
    problem = get_problem(token, problem_id)

    if not problem:
        print(f"题目 #{problem_id} 不存在")
        return None

    print(f"题目: {problem.get('title')}")
    test_cases = json.loads(problem.get("test_cases", "[]"))
    solution_code = problem.get("solution_code", "")

    if not solution_code:
        print("题目无题解代码")
        return None

    if not test_cases:
        print("题目无测试用例，跳过验证并发布")
        update_validation(token, problem_id, True)
        return {"success": True, "passed": 0, "total": 0, "note": "no test cases"}

    result = validate_by_data(solution_code, test_cases, problem.get("title", ""))

    # 更新 D1 状态
    if result.get("success"):
        resp = update_validation(token, problem_id, True)
        print(f"已发布: {resp}")
    else:
        print("验证未通过，题目保持未发布状态")

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: hermes_validate.py <problem_id>")
        print("      hermes_validate.py --data '<json>'  (直接传入题目数据)")
        sys.exit(1)

    if sys.argv[1] == "--data":
        # 直接从参数读取数据
        if len(sys.argv) < 3:
            print("需要 JSON 数据参数")
            sys.exit(1)
        data = json.loads(sys.argv[2])
        validate_by_data(
            data.get("solution_code", ""),
            data.get("test_cases", []),
            data.get("title", "未命名题目")
        )
    else:
        problem_id = int(sys.argv[1])
        validate_by_id(problem_id)
