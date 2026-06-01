#!/usr/bin/env python3
"""验证题目题解是否通过所有测试用例。
用法: python3 validate_problem.py <solution.cpp> <test_cases.json>
输出: JSON {success: bool, passed: int, total: int, failures: [...]}
"""

import sys, json, subprocess, os

def compile_cpp(source_path):
    exe_path = source_path.replace('.cpp', '.out')
    result = subprocess.run(
        ['g++', '-std=c++17', '-O2', '-Wall', source_path, '-o', exe_path],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        return None, result.stderr
    return exe_path, None

def run_test(exe_path, input_str, expected, timeout_sec=5):
    try:
        proc = subprocess.run(
            [exe_path],
            input=input_str,
            capture_output=True, text=True, timeout=timeout_sec
        )
        actual = proc.stdout.strip()
        expected_str = str(expected).strip()
        if actual == expected_str:
            return True, actual, None
        # 宽松数值比较
        a_lines = actual.split('\n')
        e_lines = expected_str.split('\n')
        if len(a_lines) == len(e_lines):
            ok = True
            for a, e in zip(a_lines, e_lines):
                a_parts = a.split()
                e_parts = e.split()
                if len(a_parts) != len(e_parts):
                    ok = False; break
                for av, ev in zip(a_parts, e_parts):
                    try:
                        if abs(float(av) - float(ev)) > 1e-6:
                            ok = False; break
                    except ValueError:
                        if av != ev:
                            ok = False; break
                if not ok:
                    break
            if ok:
                return True, actual, None
        return False, actual, '期望: %s | 实际: %s' % (expected_str[:80], actual[:80])
    except subprocess.TimeoutExpired:
        return False, '', '运行超时'
    except Exception as e:
        return False, '', str(e)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: validate_problem.py <solution.cpp> [test_cases.json]'}))
        sys.exit(1)

    solution_file = sys.argv[1]

    if len(sys.argv) >= 3:
        test_cases = json.loads(sys.argv[2])
    elif not sys.stdin.isatty():
        test_cases = json.loads(sys.stdin.read())
    else:
        print(json.dumps({'error': 'No test cases provided'}))
        sys.exit(1)

    if not test_cases:
        print(json.dumps({'error': '测试用例为空', 'success': False, 'passed': 0, 'total': 0, 'failures': []}))
        sys.exit(0)

    exe_path, compile_err = compile_cpp(solution_file)
    if compile_err:
        print(json.dumps({
            'success': False, 'passed': 0, 'total': len(test_cases),
            'error': '编译失败:\n' + compile_err[:500],
            'failures': [{'case': 0, 'input': '', 'expected': '', 'actual': compile_err[:200], 'error': 'compile_error'}]
        }, ensure_ascii=False))
        sys.exit(0)

    passed = 0
    failures = []
    for i, tc in enumerate(test_cases):
        inp = str(tc.get('input', ''))
        exp = str(tc.get('expected', ''))
        ok, actual, err = run_test(exe_path, inp, exp)
        if ok:
            passed += 1
        else:
            failures.append({
                'case': i + 1,
                'input': inp[:100],
                'expected': exp[:100],
                'actual': actual[:100],
                'error': err
            })

    try:
        os.unlink(exe_path)
    except:
        pass

    print(json.dumps({
        'success': passed == len(test_cases),
        'passed': passed,
        'total': len(test_cases),
        'failures': failures
    }, ensure_ascii=False))

if __name__ == '__main__':
    main()
