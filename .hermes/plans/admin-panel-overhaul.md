# Admin Panel 全面重写实施计划

> **For Hermes:** 直接实施，不需要 subagent。所有改动在 /tmp/cpp-practice-repo 中。

**目标:** 修复管理员后台"不真实"问题——补充删除用户、会员管理、AI次数管理、订单管理功能，让用户管理标签页功能完整可用。

**架构:** CF Pages Functions (D1 + JWT) + 单文件 HTML 前端。改动影响: db.js、admin/users.js、index.html。

**技术栈:** Cloudflare Workers (JS), D1 (SQLite), JWT HS256

---

## Task 1: db.js 新增 deleteUser 函数

**目标:** 后端支持删除用户（同时清理 sessions/memberships/orders）

**文件:** 修改 `/tmp/cpp-practice-repo/functions/_utils/db.js`

在第 207 行 `listUsers` 之后，第 208 行 `// --- Problem helpers ---` 之前插入:

```javascript
export async function deleteUser(db, username) {
  // Skip if trying to delete the last admin
  const acct = await db.prepare('SELECT role FROM accounts WHERE username = ?').bind(username).first();
  if (!acct) return { error: '用户不存在' };
  
  await db.prepare('DELETE FROM sessions WHERE username = ?').bind(username).run();
  await db.prepare('DELETE FROM memberships WHERE username = ?').bind(username).run();
  await db.prepare('DELETE FROM orders WHERE username = ?').bind(username).run();
  await db.prepare('DELETE FROM user_progress WHERE username = ?').bind(username).run();
  await db.prepare('DELETE FROM accounts WHERE username = ?').bind(username).run();
  return { success: true };
}
```

---

## Task 2: /api/admin/users 新增 DELETE 处理器

**目标:** 管理员可以通过 API 删除用户

**文件:** 修改 `/tmp/cpp-practice-repo/functions/api/admin/users.js`

1. 在 import 行中加入 `deleteUser`:
```
import { listUsers, setUserRole, activateMembership, deleteUser } from '../../_utils/db.js';
```

2. 在 `onRequestPut` 之后、`onRequestOptions` 之前新增:

```javascript
export async function onRequestDelete({ env, request }) {
  try {
    const { db } = await requireAdmin(env, request);
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    if (!username) return err('缺少用户名', 400, request);
    const result = await deleteUser(db, username);
    if (result.error) return err(result.error, 404, request);
    return ok({ success: true }, request);
  } catch (e) {
    return err(e.message, e.status || 500, request);
  }
}
```

3. 修改 OPTIONS handler 的 Allow-Methods 加入 DELETE:
```
'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
```

---

## Task 3: 重写 loadAdminUsers — 完整用户管理

**目标:** 前端用户管理标签页显示完整信息+完整操作

**文件:** 修改 `/tmp/cpp-practice-repo/index.html`

替换 `loadAdminUsers` 函数 (行 2174-2193):

```javascript
async function loadAdminUsers() {
  const body = document.getElementById("adminBody");
  try {
    const resp = await adminAuthFetch(AUTH_URL + "/api/admin/users");
    const data = await resp.json();
    if (!resp.ok) { body.innerHTML = `<p style="color:var(--red)">加载失败: ${data.error}</p>`; return; }
    const users = data.users || [];
    
    // Also fetch memberships for all users
    const memResp = await adminAuthFetch(AUTH_URL + "/api/admin/users");
    const memData = await memResp.json();
    
    body.innerHTML = `<table class="admin-table"><thead><tr>
      <th>用户名</th><th>角色</th><th>会员</th><th>AI次数</th><th>注册时间</th><th>操作</th>
    </tr></thead>
    <tbody>${users.map(u => {
      const created = new Date(u.created_at).toLocaleString("zh-CN");
      const roleLabel = u.role === "admin" ? '<span style="color:var(--purple)">管理员</span>' : '用户';
      const memberLabel = u.member_level ? `<span style="color:var(--accent)">${u.member_level}</span>` : '-';
      const trialsUsed = u.ai_trials_used || 0;
      const currentUser = (u.username === acctUsername);
      
      return `<tr>
        <td>${escHtml(u.username)}${currentUser ? ' <span style="font-size:10px;color:var(--text3)">(你)</span>' : ''}</td>
        <td>${roleLabel}</td>
        <td>${memberLabel}</td>
        <td>${trialsUsed}/3</td>
        <td style="font-size:12px">${created}</td>
        <td class="actions">
          ${u.role !== "admin" 
            ? `<button onclick="adminPromoteUser('${u.username}','admin')">提为管理员</button>`
            : `<button class="danger" onclick="adminPromoteUser('${u.username}','user')">降为用户</button>`}
          <button onclick="adminSetMembership('${u.username}')">会员管理</button>
          <button onclick="adminResetTrials('${u.username}')">重置AI</button>
          ${!currentUser ? `<button class="danger" onclick="adminDeleteUser('${u.username}')">删除用户</button>` : ''}
        </td>
      </tr>`}).join("")}</tbody></table>`;
  } catch(e) { body.innerHTML = `<p style="color:var(--red)">加载失败</p>`; }
}
```

新增操作函数 (在 loadAdminUsers 之后):

```javascript
async function adminDeleteUser(username) {
  if (!confirm(`确定永久删除用户 "${username}"？此操作不可撤销。`)) return;
  try {
    const resp = await adminAuthFetch(AUTH_URL + "/api/admin/users?username=" + encodeURIComponent(username), { method: "DELETE" });
    const result = await resp.json();
    if (resp.ok && result.success) loadAdminUsers();
    else alert("删除失败: " + (result.error || "未知错误"));
  } catch(e) { alert("删除失败: 网络错误"); }
}

async function adminResetTrials(username) {
  if (!confirm(`确定重置 "${username}" 的 AI 试用次数？`)) return;
  try {
    const resp = await adminAuthFetch(AUTH_URL + "/api/admin/users", {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, ai_trials_used: 0})
    });
    const result = await resp.json();
    if (resp.ok && result.success) loadAdminUsers();
    else alert("重置失败: " + (result.error || "未知错误"));
  } catch(e) { alert("重置失败: 网络错误"); }
}

async function adminSetMembership(username) {
  const level = prompt("会员等级 (week/month/year):", "month");
  if (!level) return;
  const days = prompt("有效天数 (7/30/365):", "30");
  if (!days) return;
  try {
    const resp = await adminAuthFetch(AUTH_URL + "/api/admin/users", {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, membership_level: level, membership_days: parseInt(days)})
    });
    const result = await resp.json();
    if (resp.ok && result.success) loadAdminUsers();
    else alert("设置失败: " + (result.error || "未知错误"));
  } catch(e) { alert("设置失败: 网络错误"); }
}
```

---

## Task 4: 修改 listUsers 返回会员和试用信息

**目标:** 后端用户列表包含 member_level 和 ai_trials_used

**文件:** 修改 `/tmp/cpp-practice-repo/functions/_utils/db.js`

修改 `listUsers` 函数 (行 202-207):

```javascript
export async function listUsers(db) {
  const { results } = await db.prepare(
    `SELECT a.username, a.role, a.ai_trials_used, a.created_at, m.level as member_level, m.expire_at as member_expire
     FROM accounts a LEFT JOIN memberships m ON a.username = m.username AND m.expire_at > ?
     ORDER BY a.created_at DESC`
  ).bind(Math.floor(Date.now() / 1000)).all();
  return (results || []).map(r => ({
    ...r,
    member_level: r.member_expire ? r.member_level : null,
    member_expire: r.member_expire || null
  }));
}
```

---

## Task 5: 新增管理员订单标签页

**目标:** 管理员可以在面板中查看订单列表和手动激活

**文件:** 修改 `/tmp/cpp-practice-repo/index.html`

1. 在 admin-tabs 中新增订单标签 (行 2261 后):
```html
<button class="admin-tab" data-admin-tab="orders" onclick="switchAdminTab('orders')">订单管理</button>
```

2. 在 switchAdminTab 中新增条件 (行 1859 后):
```javascript
else if (tab === "orders") loadAdminOrders();
```

3. 新增 loadAdminOrders 函数:
```javascript
async function loadAdminOrders() {
  const body = document.getElementById("adminBody");
  try {
    const resp = await adminAuthFetch(AUTH_URL + "/api/admin/orders");
    const data = await resp.json();
    if (!resp.ok) { body.innerHTML = `<p style="color:var(--red)">加载失败: ${data.error}</p>`; return; }
    const orders = data.orders || [];
    body.innerHTML = orders.length === 0 ? '<p style="color:var(--text2)">暂无订单</p>' : 
      `<table class="admin-table"><thead><tr>
        <th>订单号</th><th>用户</th><th>套餐</th><th>金额</th><th>状态</th><th>创建时间</th><th>操作</th>
      </tr></thead>
      <tbody>${orders.map(o => {
        const created = new Date(o.created_at).toLocaleString("zh-CN");
        const planMap = {week:'7天',month:'30天',year:'365天',year3:'1095天'};
        return `<tr>
          <td style="font-size:11px">${o.out_trade_no}</td>
          <td>${escHtml(o.username)}</td>
          <td>${planMap[o.plan] || o.plan}</td>
          <td>¥${o.amount}</td>
          <td>${o.paid ? '<span style="color:var(--green)">已支付</span>' : '<span style="color:var(--red)">未支付</span>'}</td>
          <td style="font-size:12px">${created}</td>
          <td class="actions">
            ${!o.paid ? `<button class="primary" onclick="adminMarkPaid('${o.out_trade_no}','${o.username}','${o.plan}')">手动激活</button>` : ''}
          </td>
        </tr>`}).join("")}</tbody></table>`;
  } catch(e) { body.innerHTML = `<p style="color:var(--red)">加载失败</p>`; }
}

async function adminMarkPaid(tradeNo, username, plan) {
  if (!confirm(`确定手动激活订单并开通会员？`)) return;
  try {
    const resp = await adminAuthFetch(AUTH_URL + "/api/admin/mark-paid", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({out_trade_no: tradeNo, username, plan})
    });
    const result = await resp.json();
    if (resp.ok && result.success) { loadAdminOrders(); alert("激活成功"); }
    else alert("激活失败: " + (result.error || "未知错误"));
  } catch(e) { alert("激活失败: 网络错误"); }
}
```

---

## Task 6: 检查 orders.js 端点是否完整可用

**文件:** 检查 `/tmp/cpp-practice-repo/functions/api/admin/orders.js`

确认 GET 返回完整订单数据，如有问题一并修复。

---

## Task 7: 部署验证

1. git commit + push
2. 等待 CF Pages 部署
3. 浏览器验证: 登录 → 管理后台 → 用户管理（验证删除/提管理员/会员/重置AI）
4. 浏览器验证: 订单管理（验证查看和手动激活）
