#!/usr/bin/env python3
"""批量验证所有待发布题目：SSH到CVM → curl CF API获取题目 → CVM本地编译运行 → curl CF API发布

用于 cron 定时任务，每10分钟运行一次。
注意：本地沙箱无法访问外网，所有HTTP调用通过CVM的curl完成。
用法: python3 hermes_validate_batch.py
"""

import json, sys, io, time
import paramiko

CVM_HOST = "82.156.34.78"
CVM_USER = "root"
CVM_PASS = ".Jxh2917834376"
CF_API = "https://cpp-practice.pages.dev/api"
ADMIN_USER = "ethan"
ADMIN_PASS = "test1234"

def ssh_exec(client, cmd, timeout=30):
    """执行CVM命令并返回stdout"""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

def cvm_curl(client, path, method="GET", data=None):
    """在CVM上执行curl调用CF API"""
    auth = f"Authorization: Bearer $TOKEN"
    
    if method == "GET":
        cmd = f'curl -s -H "{auth}" "{CF_API}{path}"'
    else:
        data_str = json.dumps(data).replace("'", "'\\''")
        if data:
            cmd = f'curl -s -X {method} -H "Content-Type: application/json" -H "{auth}" -d \'{data_str}\' "{CF_API}{path}"'
        else:
            cmd = f'curl -s -X {method} -H "{auth}" "{CF_API}{path}"'
    
    out, err = ssh_exec(client, cmd)
    try:
        return json.loads(out) if out else {}
    except:
        return {"_raw": out, "_error": err}

def main():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 批量验证开始")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(CVM_HOST, username=CVM_USER, password=CVM_PASS, timeout=30)
    print("SSH连接成功")

    # Step 1: Login to CF API via CVM curl
    login_data = json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS})
    login_cmd = f'curl -s -X POST -H "Content-Type: application/json" -d \'{login_data}\' "{CF_API}/login"'
    login_out, login_err = ssh_exec(client, login_cmd)
    
    login_result = json.loads(login_out) if login_out else {}
    token = login_result.get("token")
    if not token:
        print(f"登录失败: {login_out}")
        client.close()
        return
    print(f"登录成功: {ADMIN_USER} (角色: {login_result.get('role')})")
    
    # Step 2: Set TOKEN env variable for subsequent curl calls
    ssh_exec(client, f'export TOKEN="{token}"')
    
    # Use shell to keep TOKEN across commands
    def curl(path, method="GET", data=None):
        auth_hdr = f"Authorization: Bearer {token}"
        if method == "GET":
            cmd = f'curl -s -H \'{auth_hdr}\' "{CF_API}{path}"'
        else:
            data_str = json.dumps(data) if data else ""
            data_escaped = data_str.replace("'", "'\\''")
            cmd = f'curl -s -X {method} -H "Content-Type: application/json" -H \'{auth_hdr}\' -d \'{data_escaped}\' "{CF_API}{path}"'
        return cmd

    # Step 3: Get all problems
    get_cmd = curl("/admin/problems")
    out, err = ssh_exec(client, get_cmd)
    problems_data = json.loads(out) if out else {}
    problems = problems_data.get("problems", [])
    
    unpublished = [p for p in problems if p.get("is_published") != 1]
    
    if not unpublished:
        print("没有待验证题目，退出")
        client.close()
        return

    print(f"找到 {len(unpublished)} 个待验证题目")

    # Step 4: Validate each unpublished problem
    for p in unpublished:
        pid = p["id"]
        title = p.get("title", "未命名")
        print(f"\n--- 验证 #{pid}: {title} ---")
        
        # Get full detail
        detail_cmd = curl(f"/admin/problems?id={pid}")
        out, err = ssh_exec(client, detail_cmd)
        detail = json.loads(out).get("problem", {}) if out else {}
        
        if not detail:
            print(f"  ✗ 获取题目详情失败")
            continue

        solution_code = detail.get("solution_code", "")
        test_cases_raw = detail.get("test_cases", [])

        # Map D1 test_cases (output) to validate_problem expected format
        test_cases = []
        for tc in test_cases_raw:
            test_cases.append({
                "input": tc.get("input", ""),
                "expected": tc.get("output", tc.get("expected", "")),
                "type": tc.get("type", "sample")
            })

        if not solution_code:
            print(f"  ✗ 无题解代码，跳过")
            continue
        if not test_cases:
            print(f"  ✗ 无测试用例，跳过")
            continue

        print(f"  测试用例数: {len(test_cases)}")
        
        # Write solution and validate on CVM
        sftp = client.open_sftp()
        ts = int(time.time())
        cpp_path = f"/tmp/batch_val_{ts}_{pid}.cpp"
        sftp.putfo(io.BytesIO(solution_code.encode()), cpp_path)
        sftp.close()

        tc_json = json.dumps(test_cases, ensure_ascii=False)
        tc_escaped = tc_json.replace("'", "'\\''")
        val_out, val_err = ssh_exec(
            client,
            f"python3 /data/cpp-practice-site/validate_problem.py {cpp_path} '{tc_escaped}'",
            timeout=60
        )
        
        # Cleanup
        ssh_exec(client, f"rm -f {cpp_path} {cpp_path.replace('.cpp','.out')}")

        if val_err:
            print(f"  CVM stderr: {val_err[:200]}")

        try:
            result = json.loads(val_out) if val_out else {"error": "empty output"}
        except:
            result = {"success": False, "error": f"解析失败: {val_out[:200]}"}

        if result.get("success"):
            passed = result.get("passed", 0)
            total = result.get("total", 0)
            print(f"  ✓ 全部通过 ({passed}/{total})")
            
            # Publish via CF API
            pub_cmd = curl("/admin/validate-problem", "POST", {"problem_id": pid, "is_published": True})
            pub_out, pub_err = ssh_exec(client, pub_cmd)
            pub_result = json.loads(pub_out) if pub_out else {}
            
            if pub_result.get("success"):
                print(f"  ✓ 已发布！")
            else:
                print(f"  ✗ 发布更新失败: {pub_result}")
        else:
            passed = result.get("passed", 0)
            total = result.get("total", 0)
            print(f"  ✗ 验证失败 ({passed}/{total})")
            for f in result.get("failures", [])[:3]:
                print(f"    用例 #{f.get('case')}: {f.get('error', '')}")

    client.close()
    print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] 批量验证完成")

if __name__ == "__main__":
    main()
