#!/usr/bin/env python3
"""批量验证所有待发布题目：登录 CF API → 获取 is_published=0 的题目 → SSH CVM 验证 → 发布

用于 cron 定时任务，每10分钟运行一次。
用法: python3 hermes_validate_batch.py
"""

import json, sys, io, time
import paramiko
import urllib.request

CF_API = "https://cpp-practice.pages.dev/api"
CVM_HOST = "82.156.34.78"
CVM_USER = "root"
CVM_PASS = ".Jxh2917834376"
ADMIN_USER = "ethan"
ADMIN_PASS = "test1234"

def login():
    """获取 admin JWT token"""
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

def get_all_problems(token):
    """获取所有题目（含未发布）"""
    req = urllib.request.Request(
        f"{CF_API}/admin/problems",
        headers={"Authorization": f"Bearer {token}"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read())
    return data.get("problems", [])

def get_problem_detail(token, problem_id):
    """获取单个题目详情"""
    req = urllib.request.Request(
        f"{CF_API}/admin/problems?id={problem_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read())
    return data.get("problem")

def validate_on_cvm(solution_code, test_cases):
    """SSH 到 CVM，编译运行验证"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(CVM_HOST, username=CVM_USER, password=CVM_PASS, timeout=30)

    sftp = client.open_sftp()
    ts = int(time.time())
    cpp_path = f"/tmp/batch_validate_{ts}.cpp"
    sftp.putfo(io.BytesIO(solution_code.encode()), cpp_path)
    sftp.close()

    tc_json = json.dumps(test_cases, ensure_ascii=False)
    tc_escaped = tc_json.replace("'", "'\\''")
    stdin, stdout, stderr = client.exec_command(
        f"python3 /data/cpp-practice-site/validate_problem.py {cpp_path} '{tc_escaped}'",
        timeout=60
    )
    result = stdout.read().decode().strip()
    err = stderr.read().decode().strip()

    client.exec_command(f"rm -f {cpp_path} {cpp_path.replace('.cpp','.out')}")
    client.close()

    if err:
        print(f"  CVM stderr: {err[:200]}")
    
    try:
        return json.loads(result)
    except:
        return {"success": False, "error": f"解析验证结果失败: {result[:200]}"}

def update_published(token, problem_id):
    """更新题目为已发布"""
    req = urllib.request.Request(
        f"{CF_API}/admin/validate-problem",
        data=json.dumps({"problem_id": int(problem_id), "is_published": True}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read())

def main():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 批量验证开始")
    
    token = login()
    print(f"登录成功: {ADMIN_USER}")

    problems = get_all_problems(token)
    unpublished = [p for p in problems if p.get("is_published") != 1]
    
    if not unpublished:
        print("没有待验证题目，退出")
        return

    print(f"找到 {len(unpublished)} 个待验证题目")

    for p in unpublished:
        pid = p["id"]
        title = p.get("title", "未命名")
        print(f"\n--- 验证 #{pid}: {title} ---")
        
        # Get full detail
        detail = get_problem_detail(token, pid)
        if not detail:
            print(f"  ✗ 获取题目详情失败")
            continue

        solution_code = detail.get("solution_code", "")
        test_cases = detail.get("test_cases", [])

        if not solution_code:
            print(f"  ✗ 无题解代码，跳过")
            continue
        if not test_cases:
            print(f"  ✗ 无测试用例，跳过")
            continue

        print(f"  测试用例数: {len(test_cases)}")
        
        result = validate_on_cvm(solution_code, test_cases)
        
        if result.get("success"):
            passed = result.get("passed", 0)
            total = result.get("total", 0)
            print(f"  ✓ 全部通过 ({passed}/{total})")
            
            resp = update_published(token, pid)
            if resp.get("success"):
                print(f"  ✓ 已发布！")
            else:
                print(f"  ✗ 发布更新失败: {resp}")
        else:
            passed = result.get("passed", 0)
            total = result.get("total", 0)
            print(f"  ✗ 验证失败 ({passed}/{total})")
            for f in result.get("failures", [])[:3]:
                print(f"    用例 #{f.get('case')}: {f.get('error', '')}")

    print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] 批量验证完成")

if __name__ == "__main__":
    main()
