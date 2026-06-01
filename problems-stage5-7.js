// ═══════════════════════════════════════════════════════════
// 传智杯 C++ 刷题训练营 — 阶段5-7 题目数据
// 阶段5: 图论 (8题, id 29-36)
// 阶段6: 数据结构进阶 (7题, id 37-43)
// 阶段7: 数学与综合 (7题, id 44-50)
// ═══════════════════════════════════════════════════════════

const PROBLEMS_STAGE5_7 = [
  // ═══ 阶段5: 图论 ═══
  {
    id: 29,
    title: "课程表",
    difficulty: "中等",
    stage: 5,
    stageName: "图论",
    prerequisites: [9],
    timeComplexity: "O(V+E)",
    spaceComplexity: "O(V+E)",
    category: "图论",
    tags: ["拓扑排序", "BFS", "DAG", "入度"],
    description: "你需要选修 n 门课程，编号为 0 到 n-1。给定先修课程列表 prerequisites，其中 prerequisites[i] = [a, b] 表示学习课程 a 前必须先修课程 b。请判断是否可能完成所有课程的学习。如果课程间存在循环依赖则无法完成。这是拓扑排序的经典应用，核心是检测有向图中是否存在环。",
    inputFormat: "第一行输入 n 和 m（m 为先修关系数量）。接下来 m 行每行两个整数 a b，表示学 a 前必须先学 b。",
    outputFormat: "能完成所有课程输出 YES，否则输出 NO。",
    sampleInput: "4 4\n1 0\n2 1\n3 2\n1 3",
    sampleOutput: "NO",
    constraints: "1 ≤ n ≤ 10⁵，0 ≤ m ≤ 10⁵，0 ≤ a, b < n，a ≠ b",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);

    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        adj[b].push_back(a);
        indegree[a]++;
    }

    queue<int> q;
    for (int i = 0; i < n; i++)
        if (indegree[i] == 0) q.push(i);

    int visited = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        visited++;
        for (int v : adj[u]) {
            if (--indegree[v] == 0)
                q.push(v);
        }
    }

    cout << (visited == n ? "YES" : "NO") << "\\n";
    return 0;
}`,
    solution: "Kahn 算法实现拓扑排序：先统计所有节点的入度，将入度为 0 的节点入队。每次出队一个节点表示该课程已修完，将其所有后继节点的入度减 1，若减到 0 则入队。最终若处理节点数等于 n 则无环可完成，否则存在循环依赖。时间复杂度 O(V+E)，空间复杂度 O(V+E)。这是图论入门必会算法，也是课程安排、任务调度等实际问题的抽象模型。",
    test_cases: [{"input":"4 4\n1 0\n2 1\n3 2\n1 3","expected":"NO","type":"sample"},{"input":"4 4\n1 0\n2 1\n3 2\n1 3","expected":"NO","type":"hidden"}],
  },
  {
    id: 30,
    title: "网络延迟时间",
    difficulty: "中等",
    stage: 5,
    stageName: "图论",
    prerequisites: [10],
    timeComplexity: "O((V+E)log V)",
    spaceComplexity: "O(V+E)",
    category: "图论",
    tags: ["最短路", "Dijkstra", "优先队列", "加权图"],
    description: "有 n 个网络节点，标记为 1 到 n。给定一个列表 times，表示信号经过有向边的传递时间。times[i] = (u, v, w) 表示从节点 u 到节点 v 需要 w 时间。从源节点 k 发出一个信号，需要多久才能使所有节点都收到信号？如果有些节点无法收到信号，返回 -1。",
    inputFormat: "第一行输入 n m k（n 个节点，m 条边，起点 k）。接下来 m 行每行 u v w 表示从 u 到 v 的边权重为 w。",
    outputFormat: "输出到达所有节点的最短时间（即最晚收到信号的节点的时间）。若无法全部到达则输出 -1。",
    sampleInput: "4 4 2\n2 1 1\n2 3 1\n3 4 1\n1 4 1",
    sampleOutput: "2",
    constraints: "1 ≤ n ≤ 100，1 ≤ m ≤ 6000，边权为正整数，1 ≤ u, v, k ≤ n",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    k--;

    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        u--; v--;
        adj[u].push_back({v, w});
    }

    const int INF = 0x3f3f3f3f;
    vector<int> dist(n, INF);
    dist[k] = 0;

    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    pq.push({0, k});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[v] > dist[u] + w) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }

    int ans = 0;
    for (int i = 0; i < n; i++) {
        if (dist[i] == INF) {
            cout << -1 << "\\n";
            return 0;
        }
        ans = max(ans, dist[i]);
    }
    cout << ans << "\\n";
    return 0;
}`,
    solution: "Dijkstra 算法配合最小堆求解单源最短路径。核心：维护距离数组 dist，每次从堆中取出距离最小的未确定节点进行松弛操作。若取出节点的距离大于已记录距离则跳过（惰性删除）。松弛操作：若通过当前节点 u 到达 v 比直接到达更短则更新 dist[v]。最后遍历所有 dist，取最大值即为最晚收到信号的时间。若有节点仍为 INF 则不可达返回 -1。时间复杂度 O((V+E)log V)。",
    test_cases: [{"input":"4 4 2\n2 1 1\n2 3 1\n3 4 1\n1 4 1","expected":"2","type":"sample"},{"input":"4 4 2\n2 1 1\n2 3 1\n3 4 1\n1 4 1","expected":"2","type":"hidden"}],
  },
  {
    id: 31,
    title: "最小基因变化",
    difficulty: "中等",
    stage: 5,
    stageName: "图论",
    prerequisites: [9, 11],
    timeComplexity: "O(N²·L)",
    spaceComplexity: "O(N)",
    category: "图论",
    tags: ["BFS", "最短路", "状态搜索", "字符串"],
    description: "一条基因序列由一个长度为 8 的字符串表示，其中每个字符是 'A'、'C'、'G'、'T' 之一。给定起始基因序列 start 和目标基因序列 end，以及一个基因库 bank。每次基因变化只能改变一个字符，且变化后的基因必须存在于基因库中。求从 start 到 end 的最少变化次数。如果无法完成则返回 -1。",
    inputFormat: "第一行为起始序列 start，第二行为目标序列 end，第三行为 n，接下来 n 行每行为基因库中的一个序列。",
    outputFormat: "输出最少变化次数，不可达则输出 -1。",
    sampleInput: "AACCGGTT\nAAACGGTA\n3\nAACCGGTA\nAACCGCTA\nAAACGGTA",
    sampleOutput: "2",
    constraints: "start.length = end.length = 8，0 ≤ n ≤ 1000，基因库中序列互不相同",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int diffCount(const string& a, const string& b) {
    int cnt = 0;
    for (int i = 0; i < 8; i++)
        if (a[i] != b[i]) cnt++;
    return cnt;
}

int main() {
    string start, target;
    cin >> start >> target;
    int n;
    cin >> n;
    vector<string> bank(n);
    for (int i = 0; i < n; i++) cin >> bank[i];

    unordered_set<string> bankSet(bank.begin(), bank.end());
    if (!bankSet.count(target)) {
        cout << -1 << "\\n";
        return 0;
    }

    queue<pair<string, int>> q;
    unordered_set<string> visited;
    q.push({start, 0});
    visited.insert(start);

    const char genes[] = {'A', 'C', 'G', 'T'};
    while (!q.empty()) {
        auto [cur, steps] = q.front(); q.pop();
        if (cur == target) {
            cout << steps << "\\n";
            return 0;
        }
        for (int i = 0; i < 8; i++) {
            char original = cur[i];
            for (char c : genes) {
                if (c == original) continue;
                cur[i] = c;
                if (bankSet.count(cur) && !visited.count(cur)) {
                    visited.insert(cur);
                    q.push({cur, steps + 1});
                }
            }
            cur[i] = original;
        }
    }
    cout << -1 << "\\n";
    return 0;
}`,
    solution: "将每种基因序列看作图中的一个节点，若两个序列只差一个字符则存在一条边。问题转化为求从 start 到 target 的最短路径，用 BFS 求解。BFS 过程中对当前序列每个位置尝试替换为 A/C/G/T 之一，若新序列在基因库中且未访问则入队。由于 BFS 逐层遍历，首次遇到 target 时的步数即为最少变化次数。关键优化：预处理基因库为哈希集合实现 O(1) 存在性查询。",
    test_cases: [{"input":"AACCGGTT\nAAACGGTA\n3\nAACCGGTA\nAACCGCTA\nAAACGGTA","expected":"2","type":"sample"},{"input":"AACCGGTT\nAAACGGTA\n3\nAACCGGTA\nAACCGCTA\nAAACGGTA","expected":"2","type":"hidden"}],
  },
  {
    id: 32,
    title: "克隆图",
    difficulty: "中等",
    stage: 5,
    stageName: "图论",
    prerequisites: [9, 11],
    timeComplexity: "O(V+E)",
    spaceComplexity: "O(V)",
    category: "图论",
    tags: ["DFS", "BFS", "深拷贝", "哈希表"],
    description: "给定一个无向连通图的引用，返回该图的深拷贝。图中的每个节点包含一个值 val 和一个邻居列表 neighbors。深拷贝意味着需要创建全新的节点，且新的图结构与原图完全相同。这是处理图遍历和对象拷贝的经典面试题。",
    inputFormat: "使用邻接表格式：第一行 n（节点数），接下来 n 行每行用空格分隔邻居列表（索引从 0 开始）。",
    outputFormat: "按输入格式输出克隆后图的邻接表。",
    sampleInput: "4\n1 3\n0 2\n1 3\n0 2",
    sampleOutput: "1 3\n0 2\n1 3\n0 2",
    constraints: "1 ≤ n ≤ 100，每条边最多出现一次",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    cin.ignore();

    vector<vector<int>> adj(n);
    for (int i = 0; i < n; i++) {
        string line;
        getline(cin, line);
        if (line.empty()) continue;
        stringstream ss(line);
        int v;
        while (ss >> v) adj[i].push_back(v);
    }

    // Clone via BFS/DFS with visited map
    unordered_map<int, int> clone; // old -> new index mapping
    vector<vector<int>> newAdj(n);
    vector<bool> visited(n, false);
    queue<int> q;
    q.push(0);
    visited[0] = true;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) {
            newAdj[u].push_back(v);
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }

    // Output cloned adjacency list
    for (int i = 0; i < n; i++) {
        for (size_t j = 0; j < newAdj[i].size(); j++)
            cout << newAdj[i][j] << " \\n"[j == newAdj[i].size() - 1];
        if (newAdj[i].empty()) cout << "\\n";
    }
    return 0;
}`,
    solution: "图深拷贝的核心是建立原节点到新节点的映射（哈希表），避免重复创建和正确处理图中的环。DFS 或 BFS 遍历原图：遇到新节点时创建副本并存入映射表，然后递归/迭代地克隆其所有邻居。由于使用映射表记录已克隆节点，遇到已访问节点时直接引用副本而不会陷入无限循环。时间复杂度 O(V+E)，每个节点和每条边恰好处理一次。",
    test_cases: [{"input":"4\n1 3\n0 2\n1 3\n0 2","expected":"1 3\n0 2\n1 3\n0 2","type":"sample"},{"input":"4\n1 3\n0 2\n1 3\n0 2","expected":"1 3\n0 2\n1 3\n0 2","type":"hidden"}],
  },
  {
    id: 33,
    title: "岛屿的最大面积",
    difficulty: "简单",
    stage: 5,
    stageName: "图论",
    prerequisites: [11],
    timeComplexity: "O(m×n)",
    spaceComplexity: "O(m×n)",
    category: "图论",
    tags: ["DFS", "BFS", "Flood Fill", "网格"],
    description: "给你一个 m×n 的二进制矩阵 grid，其中 1 表示陆地，0 表示水域。岛屿是由四个方向（水平/垂直）相邻的陆地形成的连通区域。求网格中最大岛屿的面积（即连通陆地的数量）。如果没有岛屿返回 0。",
    inputFormat: "第一行输入 m 和 n，接下来 m 行每行 n 个数字（0 或 1，无空格）。",
    outputFormat: "输出最大岛屿的面积。",
    sampleInput: "4 5\n11000\n11000\n00100\n00011",
    sampleOutput: "3",
    constraints: "1 ≤ m, n ≤ 50",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int m, n;
vector<vector<int>> grid;
int dx[4] = {0, 0, 1, -1};
int dy[4] = {1, -1, 0, 0};

int dfs(int x, int y) {
    if (x < 0 || x >= m || y < 0 || y >= n || grid[x][y] == 0)
        return 0;
    grid[x][y] = 0; // mark visited
    int area = 1;
    for (int i = 0; i < 4; i++)
        area += dfs(x + dx[i], y + dy[i]);
    return area;
}

int main() {
    cin >> m >> n;
    grid.resize(m, vector<int>(n));
    for (int i = 0; i < m; i++) {
        string row;
        cin >> row;
        for (int j = 0; j < n; j++)
            grid[i][j] = row[j] - '0';
    }

    int maxArea = 0;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            if (grid[i][j] == 1)
                maxArea = max(maxArea, dfs(i, j));

    cout << maxArea << "\\n";
    return 0;
}`,
    solution: "DFS Flood Fill 经典变体：遍历整个网格，遇到陆地（值为 1）时启动 DFS 探索整个连通区域，将访问过的陆地标记为 0（淹没），同时累加面积计数。DFS 返回该岛屿的总面积，与全局最大值比较更新。四个方向用方向数组 dx/dy 简化代码。时间复杂度 O(m×n)，每个格子恰好被访问一次。DFS 的递归深度取决于岛屿面积，本题数据范围安全。",
    test_cases: [{"input":"4 5\n11000\n11000\n00100\n00011","expected":"4","type":"sample"},{"input":"4 5\n11000\n11000\n00100\n00011","expected":"4","type":"hidden"}],
  },
  {
    id: 34,
    title: "太平洋大西洋水流",
    difficulty: "中等",
    stage: 5,
    stageName: "图论",
    prerequisites: [11, 33],
    timeComplexity: "O(m×n)",
    spaceComplexity: "O(m×n)",
    category: "图论",
    tags: ["DFS", "多源BFS", "网格", "逆流"],
    description: "给定一个 m×n 的矩阵 heights 表示大陆每个单元格的高度。太平洋在矩阵的左边界和上边界，大西洋在右边界和下边界。水只能从高往低流或流向同等高度的相邻单元格（四个方向）。找出所有水能同时流到太平洋和大西洋的单元格坐标，按任意顺序输出。",
    inputFormat: "第一行 m n，接下来 m 行每行 n 个整数表示高度。",
    outputFormat: "每行输出一个坐标 r c（从 0 开始）。",
    sampleInput: "5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4",
    sampleOutput: "0 4\n1 3\n1 4\n2 2\n3 0\n3 1\n4 0",
    constraints: "1 ≤ m, n ≤ 200，0 ≤ heights[i][j] ≤ 10⁵",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int m, n;
int dx[4] = {0, 0, 1, -1};
int dy[4] = {1, -1, 0, 0};

void dfs(int x, int y, vector<vector<bool>>& ocean, vector<vector<int>>& h) {
    ocean[x][y] = true;
    for (int i = 0; i < 4; i++) {
        int nx = x + dx[i], ny = y + dy[i];
        if (nx < 0 || nx >= m || ny < 0 || ny >= n) continue;
        if (!ocean[nx][ny] && h[nx][ny] >= h[x][y])
            dfs(nx, ny, ocean, h);
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin >> m >> n;
    vector<vector<int>> h(m, vector<int>(n));
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            cin >> h[i][j];

    vector<vector<bool>> pac(m, vector<bool>(n, false));
    vector<vector<bool>> atl(m, vector<bool>(n, false));

    for (int i = 0; i < m; i++) {
        dfs(i, 0, pac, h);
        dfs(i, n - 1, atl, h);
    }
    for (int j = 0; j < n; j++) {
        dfs(0, j, pac, h);
        dfs(m - 1, j, atl, h);
    }

    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            if (pac[i][j] && atl[i][j])
                cout << i << " " << j << "\\n";
    return 0;
}`,
    solution: "逆向思维：不从每个单元格出发判断能否流向海洋，而是从海洋边界逆流而上进行 DFS。从太平洋边界（左/上）出发，沿非递减方向 DFS，标记所有能到达太平洋的单元格。同样从大西洋边界（右/下）出发标记。若某单元格同时被两个标记覆盖，说明水可同时流向两大洋。关键在于逆向条件：从海洋逆流时只访问高度 ≥ 当前单元格的邻居（即水能从邻居流向当前格）。",
    test_cases: [{"input":"5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4","expected":"0 4\n1 3\n1 4\n2 2\n3 0\n3 1\n4 0","type":"sample"},{"input":"5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4","expected":"0 4\n1 3\n1 4\n2 2\n3 0\n3 1\n4 0","type":"hidden"}],
  },
  {
    id: 35,
    title: "冗余连接",
    difficulty: "中等",
    stage: 5,
    stageName: "图论",
    prerequisites: [13],
    timeComplexity: "O(n·α(n))",
    spaceComplexity: "O(n)",
    category: "图论",
    tags: ["并查集", "Union-Find", "环检测", "树"],
    description: "树可以看作一个无环连通无向图。给定一棵由 n 个节点（编号 1 到 n）构成的树，往树中添加一条额外的边后形成一张有 n 条边的图。输入的边列表 edges（长度为 n）表示图中的所有边。请找出并返回一条可以删除的边，使得剩余部分仍是一棵有 n 个节点的树。如果有多个答案，返回在 edges 中最后出现的那条。",
    inputFormat: "第一行 n，接下来 n 行每行两个整数 u v 表示一条无向边。",
    outputFormat: "输出冗余边的两个端点，空格分隔。",
    sampleInput: "5\n1 2\n2 3\n3 4\n1 4\n1 5",
    sampleOutput: "1 4",
    constraints: "3 ≤ n ≤ 1000，1 ≤ u, v ≤ n",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

vector<int> parent;

int find(int x) {
    return parent[x] == x ? x : parent[x] = find(parent[x]);
}

bool unite(int x, int y) {
    x = find(x); y = find(y);
    if (x == y) return false;
    parent[x] = y;
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    parent.resize(n + 1);
    for (int i = 1; i <= n; i++) parent[i] = i;

    vector<pair<int, int>> edges(n);
    for (int i = 0; i < n; i++)
        cin >> edges[i].first >> edges[i].second;

    pair<int, int> redundant;
    for (auto [u, v] : edges) {
        if (!unite(u, v))
            redundant = {u, v};
    }

    cout << redundant.first << " " << redundant.second << "\\n";
    return 0;
}`,
    solution: "并查集的经典应用——检测无向图中的环。遍历每条边，尝试用并查集合并两个端点：若两端点已经属于同一集合（find 结果相同），说明添加这条边会形成环，它就是冗余边。若不同则合并。因为题目要求返回最后出现的冗余边，按顺序遍历并在每次发现环时更新答案即可。时间复杂度接近 O(n)，得益于路径压缩和按秩合并（本题简化版只用路径压缩已足够）。",
    test_cases: [{"input":"5\n1 2\n2 3\n3 4\n1 4\n1 5","expected":"1 4","type":"sample"},{"input":"5\n1 2\n2 3\n3 4\n1 4\n1 5","expected":"1 4","type":"hidden"}],
  },
  {
    id: 36,
    title: "最小生成树",
    difficulty: "困难",
    stage: 5,
    stageName: "图论",
    prerequisites: [13, 30, 35],
    timeComplexity: "O(E log E)",
    spaceComplexity: "O(V+E)",
    category: "图论",
    tags: ["MST", "Kruskal", "并查集", "贪心", "最小生成树"],
    description: "给定一个无向带权连通图，有 n 个节点和 m 条边，每条边有起点 u、终点 v 和权重 w。请计算最小生成树的权重之和。如果图不连通则输出 -1。最小生成树是连接所有节点的权重和最小的边集合，且不包含环。",
    inputFormat: "第一行 n m。接下来 m 行每行 u v w 表示 u 和 v 之间有一条权重为 w 的无向边。",
    outputFormat: "输出最小生成树的边权和，若不连通输出 -1。",
    sampleInput: "4 5\n1 2 2\n1 3 3\n2 3 1\n2 4 4\n3 4 5",
    sampleOutput: "7",
    constraints: "1 ≤ n ≤ 10⁵，1 ≤ m ≤ 2×10⁵，1 ≤ w ≤ 10⁴",
    cppCode: `#include <bits/stdc++.h>
using namespace std;
using ll = long long;

struct Edge {
    int u, v, w;
    bool operator<(const Edge& o) const { return w < o.w; }
};

vector<int> parent;

int find(int x) {
    return parent[x] == x ? x : parent[x] = find(parent[x]);
}

void unite(int x, int y) {
    parent[find(x)] = find(y);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    vector<Edge> edges(m);
    for (int i = 0; i < m; i++) {
        cin >> edges[i].u >> edges[i].v >> edges[i].w;
    }

    sort(edges.begin(), edges.end());

    parent.resize(n + 1);
    for (int i = 1; i <= n; i++) parent[i] = i;

    ll total = 0;
    int cnt = 0;
    for (auto [u, v, w] : edges) {
        if (find(u) != find(v)) {
            unite(u, v);
            total += w;
            cnt++;
            if (cnt == n - 1) break;
        }
    }

    if (cnt == n - 1)
        cout << total << "\\n";
    else
        cout << -1 << "\\n";
    return 0;
}`,
    solution: "Kruskal 算法：贪心地选择权重最小的边，若该边连接的两个节点属于不同连通分量（用并查集判断），则将该边加入 MST 并合并连通分量。具体步骤：1) 对所有边按权重升序排序；2) 遍历每条边，用并查集 find 检查是否连通，若不连通则 unite 并累加权重；3) 当选中 n-1 条边或遍历完所有边时停止。若最终选中的边数不足 n-1 则图不连通。时间复杂度 O(E log E)，瓶颈在排序。",
    test_cases: [{"input":"4 5\n1 2 2\n1 3 3\n2 3 1\n2 4 4\n3 4 5","expected":"7","type":"sample"},{"input":"4 5\n1 2 2\n1 3 3\n2 3 1\n2 4 4\n3 4 5","expected":"7","type":"hidden"}],
  },

  // ═══ 阶段6: 数据结构进阶 ═══
  {
    id: 37,
    title: "LRU 缓存",
    difficulty: "中等",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [15],
    timeComplexity: "O(1)",
    spaceComplexity: "O(capacity)",
    category: "数据结构",
    tags: ["设计", "哈希表", "双向链表", "LRU"],
    description: "设计一个 LRU（最近最少使用）缓存数据结构，支持 get(key) 获取值（不存在则返回 -1）和 put(key, value) 存入键值对。当缓存满时，淘汰最久未使用的键值对。要求 get 和 put 操作均为 O(1) 时间复杂度。这是考察数据结构设计能力的经典题目。",
    inputFormat: "第一行为 capacity。接下来每行一个操作：1 key 表示 get，2 key value 表示 put，0 表示结束。",
    outputFormat: "对每个 get 操作输出 value 或 -1。",
    sampleInput: "2\n2 1 10\n2 2 20\n1 1\n2 3 30\n1 2\n1 3\n0",
    sampleOutput: "10\n-1\n30",
    constraints: "1 ≤ capacity ≤ 3000，操作数 ≤ 10⁵",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

class LRUCache {
    int cap;
    list<pair<int, int>> cache;
    unordered_map<int, list<pair<int, int>>::iterator> mp;

public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        auto it = mp.find(key);
        if (it == mp.end()) return -1;
        cache.splice(cache.begin(), cache, it->second);
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = mp.find(key);
        if (it != mp.end()) {
            it->second->second = value;
            cache.splice(cache.begin(), cache, it->second);
            return;
        }
        if ((int)cache.size() == cap) {
            mp.erase(cache.back().first);
            cache.pop_back();
        }
        cache.push_front({key, value});
        mp[key] = cache.begin();
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int cap, op;
    cin >> cap;
    LRUCache lru(cap);

    while (cin >> op && op) {
        if (op == 1) {
            int k; cin >> k;
            cout << lru.get(k) << "\\n";
        } else {
            int k, v; cin >> k >> v;
            lru.put(k, v);
        }
    }
    return 0;
}`,
    solution: "核心数据结构：哈希表 + 双向链表。哈希表提供 O(1) 键查找，双向链表维护访问顺序（头部最新，尾部最旧）。get 时通过哈希表定位节点，用 list::splice 将其移到头部（O(1)）。put 时：若键存在则更新值并移到头部；若满则删除链表尾节点并在哈希表中移除；最后在头部插入新节点。STL list::splice 将节点从原位置移动到新位置是 O(1) 的，这是实现 O(1) LRU 的关键。",
    test_cases: [{"input":"2\n2 1 10\n2 2 20\n1 1\n2 3 30\n1 2\n1 3\n0","expected":"10\n-1\n30","type":"sample"},{"input":"2\n2 1 10\n2 2 20\n1 1\n2 3 30\n1 2\n1 3\n0","expected":"10\n-1\n30","type":"hidden"}],
  },
  {
    id: 38,
    title: "最小栈",
    difficulty: "简单",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [13],
    timeComplexity: "O(1)",
    spaceComplexity: "O(n)",
    category: "数据结构",
    tags: ["栈", "辅助栈", "设计"],
    description: "设计一个支持 push、pop、top 操作，并能在常数时间 O(1) 内返回栈中最小元素的栈。实现 MinStack 类，要求所有操作的时间复杂度都是 O(1)。这是栈数据结构的经典变体设计题。",
    inputFormat: "第一行 n（操作数）。接下来 n 行：1 x 表示 push x，2 表示 pop，3 表示 top，4 表示 getMin。",
    outputFormat: "对 top 和 getMin 操作输出结果。",
    sampleInput: "7\n1 -2\n1 0\n1 -3\n4\n2\n3\n4",
    sampleOutput: "-3\n0\n-2",
    constraints: "操作数 ≤ 10⁵，-2³¹ ≤ x ≤ 2³¹-1",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

class MinStack {
    stack<int> data;
    stack<int> minStk;

public:
    void push(int x) {
        data.push(x);
        if (minStk.empty() || x <= minStk.top())
            minStk.push(x);
    }

    void pop() {
        if (data.top() == minStk.top())
            minStk.pop();
        data.pop();
    }

    int top() {
        return data.top();
    }

    int getMin() {
        return minStk.top();
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    MinStack stk;

    while (n--) {
        int op, x;
        cin >> op;
        if (op == 1) { cin >> x; stk.push(x); }
        else if (op == 2) stk.pop();
        else if (op == 3) cout << stk.top() << "\\n";
        else cout << stk.getMin() << "\\n";
    }
    return 0;
}`,
    solution: "使用两个栈：data 存储所有元素，minStk 存储当前最小值序列。push 时若新元素 ≤ minStk 栈顶则也压入 minStk（相等也压入以保证重复元素 pop 时正确）。pop 时若 data 栈顶等于 minStk 栈顶则同步弹出。getMin 直接返回 minStk 栈顶即可。所有操作均为 O(1)。注意 push 时需用 ≤ 而非 <，否则当有相同最小值时 pop 会错误移除 minStk 中的记录。",
    test_cases: [{"input":"7\n1 -2\n1 0\n1 -3\n4\n2\n3\n4","expected":"-3\n0\n-2","type":"sample"},{"input":"7\n1 -2\n1 0\n1 -3\n4\n2\n3\n4","expected":"-3\n0\n-2","type":"hidden"}],
  },
  {
    id: 39,
    title: "用栈实现队列",
    difficulty: "简单",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [13, 38],
    timeComplexity: "均摊 O(1)",
    spaceComplexity: "O(n)",
    category: "数据结构",
    tags: ["栈", "队列", "设计", "均摊分析"],
    description: "请你仅使用两个栈来实现一个先进先出（FIFO）的队列。实现的队列应支持 push、pop、peek 和 empty 操作。说明：你只能使用栈的标准操作（push to top, peek/pop from top, size, is empty）。",
    inputFormat: "第一行 n（操作数）。接下来 n 行：1 x 表示 push x，2 表示 pop，3 表示 peek，4 表示 empty。",
    outputFormat: "对 pop 和 peek 输出结果，对 empty 输出 1（空）或 0（非空）。",
    sampleInput: "6\n1 1\n1 2\n3\n2\n4\n2",
    sampleOutput: "1\n1\n0\n2",
    constraints: "操作数 ≤ 10⁵",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

class MyQueue {
    stack<int> inStack, outStack;

    void transfer() {
        if (outStack.empty()) {
            while (!inStack.empty()) {
                outStack.push(inStack.top());
                inStack.pop();
            }
        }
    }

public:
    void push(int x) {
        inStack.push(x);
    }

    int pop() {
        transfer();
        int val = outStack.top();
        outStack.pop();
        return val;
    }

    int peek() {
        transfer();
        return outStack.top();
    }

    bool empty() {
        return inStack.empty() && outStack.empty();
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    MyQueue q;

    while (n--) {
        int op, x;
        cin >> op;
        if (op == 1) { cin >> x; q.push(x); }
        else if (op == 2) cout << q.pop() << "\\n";
        else if (op == 3) cout << q.peek() << "\\n";
        else cout << (q.empty() ? 1 : 0) << "\\n";
    }
    return 0;
}`,
    solution: "用两个栈实现队列：inStack 用于入队，outStack 用于出队。push 操作直接压入 inStack。pop/peek 时若 outStack 为空，则将 inStack 中所有元素逐一弹出并压入 outStack（逆序），此时 outStack 栈顶即为队头。虽然单次 transfer 成本 O(n)，但每个元素最多被转移一次，均摊复杂度为 O(1)。这是理解栈与队列关系的经典设计题。",
    test_cases: [{"input":"6\n1 1\n1 2\n3\n2\n4\n2","expected":"1\n1\n0\n2","type":"sample"},{"input":"6\n1 1\n1 2\n3\n2\n4\n2","expected":"1\n1\n0\n2","type":"hidden"}],
  },
  {
    id: 40,
    title: "设计循环队列",
    difficulty: "中等",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [13],
    timeComplexity: "O(1)",
    spaceComplexity: "O(k)",
    category: "数据结构",
    tags: ["队列", "循环数组", "设计", "双指针"],
    description: "设计一个循环队列（Circular Queue）。循环队列是一种线性数据结构，其操作基于 FIFO 原则，队尾连接到队首以形成一个循环。实现 MyCircularQueue 类，支持 enQueue（入队）、deQueue（出队）、Front（队首）、Rear（队尾）、isEmpty、isFull 操作。要求所有操作 O(1)。",
    inputFormat: "第一行 k（队列容量）。接下来 n（操作数），然后 n 行：1 x 表示入队，2 表示出队，3 表示 Front，4 表示 Rear，5 表示 isEmpty，6 表示 isFull。",
    outputFormat: "入队和出队成功输出 1 失败输出 0；Front 和 Rear 无元素输出 -1；isEmpty/isFull 输出 1/0。",
    sampleInput: "3\n8\n1 1\n1 2\n1 3\n1 4\n4\n6\n2\n4",
    sampleOutput: "1\n1\n1\n0\n3\n1\n1\n2",
    constraints: "1 ≤ k ≤ 3000",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

class MyCircularQueue {
    vector<int> data;
    int head, tail, size, cap;

public:
    MyCircularQueue(int k) : data(k), head(0), tail(-1), size(0), cap(k) {}

    bool enQueue(int value) {
        if (isFull()) return false;
        tail = (tail + 1) % cap;
        data[tail] = value;
        size++;
        return true;
    }

    bool deQueue() {
        if (isEmpty()) return false;
        head = (head + 1) % cap;
        size--;
        return true;
    }

    int Front() {
        if (isEmpty()) return -1;
        return data[head];
    }

    int Rear() {
        if (isEmpty()) return -1;
        return data[tail];
    }

    bool isEmpty() { return size == 0; }
    bool isFull() { return size == cap; }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int k, n;
    cin >> k >> n;
    MyCircularQueue q(k);

    while (n--) {
        int op, x;
        cin >> op;
        if (op == 1) { cin >> x; cout << q.enQueue(x) << "\\n"; }
        else if (op == 2) cout << q.deQueue() << "\\n";
        else if (op == 3) cout << q.Front() << "\\n";
        else if (op == 4) cout << q.Rear() << "\\n";
        else if (op == 5) cout << q.isEmpty() << "\\n";
        else cout << q.isFull() << "\\n";
    }
    return 0;
}`,
    solution: "使用固定大小的数组配合两个指针 head 和 tail 以及一个 size 计数器。入队时 tail 前移（取模），出队时 head 前移（取模）。size 跟踪当前元素数量，避免 head==tail 时的二义性（不知道是空还是满）。所有操作直接访问数组对应位置，均为 O(1)。取模运算 (index + 1) % cap 实现循环。注意 Front 返回 data[head]，Rear 返回 data[tail]。",
    test_cases: [{"input":"3\n8\n1 1\n1 2\n1 3\n1 4\n4\n6\n2\n4","expected":"1\n1\n1\n0\n3\n1\n1\n3","type":"sample"},{"input":"3\n8\n1 1\n1 2\n1 3\n1 4\n4\n6\n2\n4","expected":"1\n1\n1\n0\n3\n1\n1\n3","type":"hidden"}],
  },
  {
    id: 41,
    title: "每日温度",
    difficulty: "中等",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [13, 38],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    category: "数据结构",
    tags: ["单调栈", "栈", "Next Greater"],
    description: "给定一个整数数组 temperatures 表示每天的温度，返回一个数组 answer，其中 answer[i] 是指对于第 i 天，下一个更高温度出现在几天后。如果之后都没有更高的温度，answer[i] 为 0。这是单调栈的经典应用——Next Greater Element 问题。",
    inputFormat: "第一行 n，第二行 n 个整数表示温度。",
    outputFormat: "一行 n 个整数表示结果。",
    sampleInput: "8\n73 74 75 71 69 72 76 73",
    sampleOutput: "1 1 4 2 1 1 0 0",
    constraints: "1 ≤ n ≤ 10⁵，30 ≤ temperatures[i] ≤ 100",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> temps(n);
    for (int i = 0; i < n; i++) cin >> temps[i];

    vector<int> answer(n, 0);
    stack<int> stk; // stores indices with decreasing temperature

    for (int i = 0; i < n; i++) {
        while (!stk.empty() && temps[i] > temps[stk.top()]) {
            int prev = stk.top(); stk.pop();
            answer[prev] = i - prev;
        }
        stk.push(i);
    }

    for (int i = 0; i < n; i++)
        cout << answer[i] << " \\n"[i == n - 1];
    return 0;
}`,
    solution: "维护一个单调递减栈（存储下标，对应温度递减）。遍历数组，对于当前温度 temps[i]：若栈非空且当前温度大于栈顶下标对应的温度，则栈顶元素找到了下一个更高温度，出栈并计算天数差 i - prev。重复此过程直到栈空或当前温度不大于栈顶温度，然后将当前下标入栈。遍历结束后栈中剩余下标没有更高温度，保持默认值 0。每个元素入栈出栈各一次，时间复杂度 O(n)。",
    test_cases: [{"input":"8\n73 74 75 71 69 72 76 73","expected":"1 1 4 2 1 1 0 0","type":"sample"},{"input":"8\n73 74 75 71 69 72 76 73","expected":"1 1 4 2 1 1 0 0","type":"hidden"},{"input":"1\n1","expected":"0","type":"hidden"}],
  },
  {
    id: 42,
    title: "滑动窗口最大值",
    difficulty: "困难",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [13, 41],
    timeComplexity: "O(n)",
    spaceComplexity: "O(k)",
    category: "数据结构",
    tags: ["单调队列", "双端队列", "滑动窗口", "deque"],
    description: "给定一个整数数组 nums 和一个大小为 k 的滑动窗口，窗口从数组最左侧移动到最右侧。每次只能看到窗口内的 k 个数字，窗口每次向右滑动一位。返回每个位置滑动窗口中的最大值。这是单调队列的经典应用。",
    inputFormat: "第一行 n k，第二行 n 个整数。",
    outputFormat: "输出 n-k+1 个整数，每个是滑动窗口移动过程中的最大值。",
    sampleInput: "8 3\n1 3 -1 -3 5 3 6 7",
    sampleOutput: "3 3 5 5 6 7",
    constraints: "1 ≤ n ≤ 10⁵，1 ≤ k ≤ n",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];

    deque<int> dq; // stores indices, values are decreasing
    vector<int> result;

    for (int i = 0; i < n; i++) {
        // Remove elements out of window
        while (!dq.empty() && dq.front() <= i - k)
            dq.pop_front();

        // Maintain decreasing order
        while (!dq.empty() && nums[i] >= nums[dq.back()])
            dq.pop_back();

        dq.push_back(i);

        if (i >= k - 1)
            result.push_back(nums[dq.front()]);
    }

    for (size_t i = 0; i < result.size(); i++)
        cout << result[i] << " \\n"[i == result.size() - 1];
    return 0;
}`,
    solution: "使用双端队列（deque）维护窗口内元素的单调递减序列（存储下标）。队列头部始终是当前窗口的最大值的下标。遍历数组时做三件事：1) 移除队头超出窗口范围的过期下标；2) 从队尾移除所有不大于当前元素的下标（它们不可能是之后窗口的最大值）；3) 将当前下标入队尾。当 i ≥ k-1 时记录队头对应值。每个元素最多入队出队各一次，因此总时间复杂度 O(n)，优于优先队列的 O(n log k)。",
    test_cases: [{"input":"8 3\n1 3 -1 -3 5 3 6 7","expected":"3 3 5 5 6 7","type":"sample"},{"input":"8 3\n1 3 -1 -3 5 3 6 7","expected":"3 3 5 5 6 7","type":"hidden"}],
  },
  {
    id: 43,
    title: "数据流的中位数",
    difficulty: "困难",
    stage: 6,
    stageName: "数据结构进阶",
    prerequisites: [4],
    timeComplexity: "O(log n) 每次插入",
    spaceComplexity: "O(n)",
    category: "数据结构",
    tags: ["堆", "优先队列", "大小堆", "数据流"],
    description: "设计一个数据结构，支持向数据流中添加整数，并能随时返回当前所有元素的中位数。如果元素个数为奇数，返回中间那个数；如果为偶数，返回中间两个数的平均值（向下取整）。要求每次添加操作时间复杂度 O(log n)。",
    inputFormat: "每行一个整数 x。输入 -10001 表示查询中位数，输入 -20000 表示结束。",
    outputFormat: "每次查询输出当前数据流的中位数。",
    sampleInput: "1\n2\n-10001\n3\n-10001\n-20000",
    sampleOutput: "1\n2",
    constraints: "操作数 ≤ 10⁵，-10⁴ ≤ x ≤ 10⁴",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

class MedianFinder {
    priority_queue<int> maxHeap; // left half (smaller values)
    priority_queue<int, vector<int>, greater<>> minHeap; // right half (larger values)

    void balance() {
        if (maxHeap.size() > minHeap.size() + 1) {
            minHeap.push(maxHeap.top());
            maxHeap.pop();
        } else if (minHeap.size() > maxHeap.size()) {
            maxHeap.push(minHeap.top());
            minHeap.pop();
        }
    }

public:
    void addNum(int num) {
        if (maxHeap.empty() || num <= maxHeap.top())
            maxHeap.push(num);
        else
            minHeap.push(num);
        balance();
    }

    int findMedian() {
        if (maxHeap.size() > minHeap.size())
            return maxHeap.top();
        else
            return (maxHeap.top() + minHeap.top()) / 2;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    MedianFinder mf;
    int x;
    while (cin >> x && x != -20000) {
        if (x == -10001)
            cout << mf.findMedian() << "\\n";
        else
            mf.addNum(x);
    }
    return 0;
}`,
    solution: "使用大小堆（对顶堆）结构：大顶堆 maxHeap 存储较小的一半元素，小顶堆 minHeap 存储较大的一半元素。插入时：若元素 ≤ maxHeap 堆顶则入大顶堆，否则入小顶堆。balance 函数维持两个堆的大小平衡：大顶堆最多比小顶堆多一个元素。查询中位数时：若大顶堆更大则堆顶即为中位数，否则两堆顶的平均值即为中位数（向下取整）。每次插入 O(log n)，查询 O(1)。",
    test_cases: [{"input":"1\n2\n-10001\n3\n-10001\n-20000","expected":"1\n2","type":"sample"},{"input":"1\n2\n-10001\n3\n-10001\n-20000","expected":"1\n2","type":"hidden"}],
  },

  // ═══ 阶段7: 数学与综合 ═══
  {
    id: 44,
    title: "快速幂",
    difficulty: "简单",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [14],
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    category: "数学",
    tags: ["快速幂", "二分", "模运算", "位运算"],
    description: "实现 pow(a, b)，计算 a 的 b 次幂并对 10⁹+7 取模。b 可能非常大（最大到 10⁹），直接循环乘 b 次会超时。请使用快速幂算法实现 O(log b) 的计算。这是算法竞赛中最常用的数学技巧之一，也是矩阵快速幂和乘法逆元的基础。",
    inputFormat: "输入两个整数 a 和 b。",
    outputFormat: "输出 a^b mod (10⁹+7)。",
    sampleInput: "3 5",
    sampleOutput: "243",
    constraints: "0 ≤ a ≤ 10⁹，0 ≤ b ≤ 10⁹",
    cppCode: `#include <bits/stdc++.h>
using namespace std;
using ll = long long;
const ll MOD = 1e9 + 7;

ll qpow(ll a, ll b) {
    ll result = 1;
    a %= MOD;
    while (b) {
        if (b & 1)
            result = (result * a) % MOD;
        a = (a * a) % MOD;
        b >>= 1;
    }
    return result;
}

int main() {
    ll a, b;
    cin >> a >> b;
    cout << qpow(a, b) << "\\n";
    return 0;
}`,
    solution: "快速幂基于二分思想：将指数 b 按二进制分解。a^b = a^(b₀·2⁰) × a^(b₁·2¹) × a^(b₂·2²) × ...。循环中每次判断 b 的最低位：若为 1 则乘入结果；然后将 a 自乘（a = a²），b 右移一位。循环 log₂(b) 次结束。模运算的性质 (a×b) mod m = (a mod m × b mod m) mod m 保证中间结果不溢出。时间复杂度 O(log b)，空间 O(1)。",
    test_cases: [{"input":"3 5","expected":"243","type":"sample"},{"input":"2.0 10","expected":"1","type":"hidden"},{"input":"2.1 3","expected":"1","type":"hidden"},{"input":"2.0 -2","expected":"1","type":"hidden"},{"input":"0.5 -3","expected":"1","type":"hidden"}],
  },
  {
    id: 45,
    title: "x 的平方根",
    difficulty: "简单",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [14, 5],
    timeComplexity: "O(log x)",
    spaceComplexity: "O(1)",
    category: "数学",
    tags: ["二分查找", "数学", "牛顿迭代"],
    description: "给你一个非负整数 x，计算并返回 x 的算术平方根的整数部分（向下取整）。不允许使用任何内置指数函数如 sqrt(x) 或 pow(x, 0.5)。这是二分查找在数学计算中的经典应用。",
    inputFormat: "输入一个非负整数 x。",
    outputFormat: "输出 x 的算术平方根的整数部分。",
    sampleInput: "8",
    sampleOutput: "2",
    constraints: "0 ≤ x ≤ 2³¹-1",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int x;
    cin >> x;
    if (x <= 1) { cout << x << "\\n"; return 0; }

    long long left = 1, right = x, ans = 0;
    while (left <= right) {
        long long mid = left + (right - left) / 2;
        if (mid * mid <= x) {
            ans = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    cout << ans << "\\n";
    return 0;
}`,
    solution: "二分查找在 [1, x] 范围内搜索最大的整数 ans 使得 ans² ≤ x。初始化 left=1, right=x，每次取中点 mid = left+(right-left)/2（避免溢出）。若 mid² ≤ x 则记录答案并向右搜索；否则向左搜索。当 left > right 时循环结束，ans 即为结果。关键细节：使用 long long 存储 mid*mid 防止 int 溢出。时间复杂度 O(log x)，比逐个尝试 O(√x) 高效得多。",
    test_cases: [{"input":"8","expected":"2","type":"sample"},{"input":"4","expected":"2","type":"hidden"},{"input":"8","expected":"2","type":"hidden"},{"input":"0","expected":"0","type":"hidden"},{"input":"1","expected":"1","type":"hidden"},{"input":"2147395599","expected":"46339","type":"hidden"}],
  },
  {
    id: 46,
    title: "计数质数",
    difficulty: "中等",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [14],
    timeComplexity: "O(n log log n)",
    spaceComplexity: "O(n)",
    category: "数学",
    tags: ["质数", "埃氏筛", "数论"],
    description: "统计所有小于非负整数 n 的质数的数量。质数是大于 1 且只能被 1 和自身整除的自然数。n 最大可达 5×10⁶，需要使用埃拉托斯特尼筛法（埃氏筛）实现高效筛选。这是数论中最基础的质数判定优化方法。",
    inputFormat: "输入一个整数 n。",
    outputFormat: "输出小于 n 的质数个数。",
    sampleInput: "10",
    sampleOutput: "4",
    constraints: "0 ≤ n ≤ 5×10⁶",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int countPrimes(int n) {
    if (n <= 2) return 0;
    vector<bool> isPrime(n, true);
    isPrime[0] = isPrime[1] = false;

    for (int i = 2; i * i < n; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j < n; j += i)
                isPrime[j] = false;
        }
    }

    int count = 0;
    for (int i = 2; i < n; i++)
        if (isPrime[i]) count++;
    return count;
}

int main() {
    int n;
    cin >> n;
    cout << countPrimes(n) << "\\n";
    return 0;
}`,
    solution: "埃氏筛的核心思想：从 2 开始，将每个质数的倍数全部标记为非质数。优化点：1) 外层循环只到 √n（因为更大质数的倍数已被更小质数标记）；2) 内层循环从 i² 开始（因为 i×k (k<i) 已被之前质数标记过）。算法标记所有合数后，遍历数组统计仍为 true 的数量即为质数个数。时间复杂度 O(n log log n)，空间 O(n)。这是 10⁷ 以内统计质数的最常用方法。",
    test_cases: [{"input":"10","expected":"4","type":"sample"},{"input":"10","expected":"4","type":"hidden"},{"input":"0","expected":"0","type":"hidden"},{"input":"1","expected":"0","type":"hidden"},{"input":"100","expected":"25","type":"hidden"},{"input":"2","expected":"0","type":"hidden"}],
  },
  {
    id: 47,
    title: "最大公约数",
    difficulty: "简单",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [14],
    timeComplexity: "O(log min(a,b))",
    spaceComplexity: "O(1)",
    category: "数学",
    tags: ["数论", "辗转相除", "欧几里得", "GCD"],
    description: "计算两个非负整数的最大公约数（GCD）。最大公约数是能同时整除两个数的最大正整数。请使用辗转相除法（欧几里得算法）实现，这是算法竞赛和实际开发中最常用的数学基础算法。",
    inputFormat: "输入两个整数 a 和 b。",
    outputFormat: "输出 a 和 b 的最大公约数。",
    sampleInput: "48 18",
    sampleOutput: "6",
    constraints: "0 ≤ a, b ≤ 10⁹",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int gcd(int a, int b) {
    while (b) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int main() {
    int a, b;
    cin >> a >> b;
    if (a == 0) cout << b << "\\n";
    else cout << gcd(a, b) << "\\n";
    return 0;
}`,
    solution: "辗转相除法（欧几里得算法）基于定理：gcd(a, b) = gcd(b, a mod b)。循环中每次用 b 更新为 a % b，a 更新为原来的 b，直到 b 为 0，此时 a 即为最大公约数。时间复杂度 O(log min(a,b))——每两次迭代至少将较大的数减半。C++17 起可使用 std::gcd，但自己实现有助于理解原理。扩展欧几里得算法可在此基础上进一步求解 ax + by = gcd(a,b) 的整数解。",
    test_cases: [{"input":"48 18","expected":"6","type":"sample"},{"input":"12 18","expected":"6","type":"hidden"},{"input":"7 13","expected":"1","type":"hidden"},{"input":"100 10","expected":"10","type":"hidden"},{"input":"1 1","expected":"1","type":"hidden"}],
  },
  {
    id: 48,
    title: "N 皇后",
    difficulty: "困难",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [12, 11],
    timeComplexity: "O(n!)",
    spaceComplexity: "O(n)",
    category: "搜索",
    tags: ["回溯", "DFS", "剪枝", "组合优化"],
    description: "按照国际象棋的规则，皇后可以攻击同一行、同一列、同一对角线上的棋子。n 皇后问题研究的是如何将 n 个皇后放置在 n×n 的棋盘上且彼此之间不能相互攻击。给定整数 n，返回所有不同的 n 皇后问题的解决方案数量。每种解法包含一个具体的摆放方式。",
    inputFormat: "输入一个整数 n。",
    outputFormat: "第一行输出方案总数。接下来每行输出一种方案（用 . 表示空位，Q 表示皇后，n 个字符，n 行构成一种方案，方案间空行分隔——如果 n ≤ 6 则输出所有方案；n > 6 只输出总数）。",
    sampleInput: "4",
    sampleOutput: "2\n.Q..\n...Q\nQ...\n..Q.\n\n..Q.\nQ...\n...Q\n.Q..",
    constraints: "1 ≤ n ≤ 12",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int n, total = 0;
vector<vector<string>> solutions;

void solve(int row, vector<int>& cols, unordered_set<int>& diag1,
           unordered_set<int>& diag2, vector<string>& board) {
    if (row == n) {
        total++;
        if (n <= 6) solutions.push_back(board);
        return;
    }
    for (int col = 0; col < n; col++) {
        if (cols[col] || diag1.count(row - col) || diag2.count(row + col))
            continue;
        cols[col] = 1;
        diag1.insert(row - col);
        diag2.insert(row + col);
        board[row][col] = 'Q';

        solve(row + 1, cols, diag1, diag2, board);

        board[row][col] = '.';
        cols[col] = 0;
        diag1.erase(row - col);
        diag2.erase(row + col);
    }
}

int main() {
    cin >> n;
    vector<int> cols(n, 0);
    unordered_set<int> diag1, diag2;
    vector<string> board(n, string(n, '.'));

    solve(0, cols, diag1, diag2, board);

    cout << total << "\\n";
    for (auto& sol : solutions) {
        for (auto& row : sol) cout << row << "\\n";
        cout << "\\n";
    }
    return 0;
}`,
    solution: "经典回溯问题：逐行放置皇后，对每行尝试所有列位置。用三个数据结构剪枝：cols 数组标记已占用的列，diag1 集合标记主对角线（row-col 为定值），diag2 集合标记副对角线（row+col 为定值）。若当前列的这三种检查都通过则可放置皇后，递归处理下一行后回溯还原状态。到达第 n 行时找到一个合法解。时间复杂度 O(n!)，但剪枝大幅减少实际搜索量。n ≤ 12 可接受。",
    test_cases: [{"input":"4","expected":"2\n.Q..\n...Q\nQ...\n..Q.\n\n..Q.\nQ...\n...Q\n.Q..","type":"sample"},{"input":"4","expected":"2\n.Q..\n...Q\nQ...\n..Q.\n\n..Q.\nQ...\n...Q\n.Q..","type":"hidden"},{"input":"1","expected":"1\nQ","type":"hidden"},{"input":"8","expected":"92","type":"hidden"}],
  },
  {
    id: 49,
    title: "解数独",
    difficulty: "困难",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [12, 48],
    timeComplexity: "O(9^(81-m))",
    spaceComplexity: "O(1)",
    category: "搜索",
    tags: ["回溯", "DFS", "剪枝", "数独"],
    description: "编写一个程序，通过填充空格来解决数独问题。数独的解法需遵循以下规则：数字 1-9 在每一行、每一列和每一个 3×3 的宫内只能出现一次。输入的数独只包含数字 1-9 和表示空格的字符 '.'。假设输入只有唯一解。",
    inputFormat: "9 行每行 9 个字符（1-9 或 .）。",
    outputFormat: "输出解出的数独，9 行每行 9 个数字。",
    sampleInput: "53..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79",
    sampleOutput: "534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179",
    constraints: "输入保证有唯一解",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

bool isValid(vector<vector<char>>& board, int r, int c, char num) {
    for (int i = 0; i < 9; i++) {
        if (board[r][i] == num) return false;
        if (board[i][c] == num) return false;
        int br = (r / 3) * 3 + i / 3;
        int bc = (c / 3) * 3 + i % 3;
        if (board[br][bc] == num) return false;
    }
    return true;
}

bool solve(vector<vector<char>>& board) {
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') {
                for (char num = '1'; num <= '9'; num++) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (solve(board)) return true;
                        board[r][c] = '.';
                    }
                }
                return false; // no valid number for this cell
            }
        }
    }
    return true; // all cells filled
}

int main() {
    vector<vector<char>> board(9, vector<char>(9));
    for (int i = 0; i < 9; i++) {
        string row;
        cin >> row;
        for (int j = 0; j < 9; j++)
            board[i][j] = row[j];
    }

    solve(board);

    for (int i = 0; i < 9; i++) {
        for (int j = 0; j < 9; j++)
            cout << board[i][j];
        cout << "\\n";
    }
    return 0;
}`,
    solution: "数独求解使用回溯法：遍历棋盘，找到第一个空格，依次尝试填入 1-9。每次填入前用 isValid 检查行、列、3×3 宫内是否有重复。若合法则填入并递归求解下一个空格；若后续无法求解则回溯（恢复为 '.'）。双层循环中遇到空格立即尝试并返回，避免递归深层爆栈。宫内索引计算：(row/3)*3 + i/3 得到行，(col/3)*3 + i%3 得到列。题目保证唯一解，最终 fill 整个棋盘。",
    test_cases: [{"input":"53..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79","expected":"534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179","type":"sample"},{"input":"53..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79","expected":"534678912\n672195348\n198342567\n859761423\n426853791\n713924856\n961537284\n287419635\n345286179","type":"hidden"}],
  },
  {
    id: 50,
    title: "接雨水",
    difficulty: "困难",
    stage: 7,
    stageName: "数学与综合",
    prerequisites: [41, 42],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    category: "数学",
    tags: ["双指针", "单调栈", "动态规划"],
    description: "给定 n 个非负整数表示宽度为 1 的柱子的高度图，计算按此排列的柱子下雨之后能接多少雨水。每个位置能接的雨水量取决于它左右两边最高柱子的较小值减去自身高度。这是经典的动态规划和双指针面试高频题。",
    inputFormat: "第一行 n，第二行 n 个整数表示柱子高度。",
    outputFormat: "输出能接的雨水总量。",
    sampleInput: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
    sampleOutput: "6",
    constraints: "1 ≤ n ≤ 2×10⁴，0 ≤ height[i] ≤ 10⁵",
    cppCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> height(n);
    for (int i = 0; i < n; i++) cin >> height[i];

    int left = 0, right = n - 1;
    int leftMax = 0, rightMax = 0;
    long long water = 0;

    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax)
                leftMax = height[left];
            else
                water += leftMax - height[left];
            left++;
        } else {
            if (height[right] >= rightMax)
                rightMax = height[right];
            else
                water += rightMax - height[right];
            right--;
        }
    }

    cout << water << "\\n";
    return 0;
}`,
    solution: "双指针法（最优解）：left 和 right 分别从两端向中间移动，维护 leftMax（左侧已遍历的最高柱子）和 rightMax（右侧已遍历的最高柱子）。每次移动较矮一侧的指针：若当前高度大于等于该侧最大值则更新最大值；否则当前位置能接的水量为该侧最大值减去当前高度（因为另一侧至少有这么高）。核心洞察：对于位置 left，若 height[left] < height[right]，则 leftMax 一定 ≤ rightMax，所以接水量由 leftMax 决定。时间复杂度 O(n)，空间 O(1)。",
    test_cases: [{"input":"12\n0 1 0 2 1 0 1 3 2 1 2 1","expected":"6","type":"sample"},{"input":"12\n0 1 0 2 1 0 1 3 2 1 2 1","expected":"6","type":"hidden"},{"input":"6\n4 2 0 3 2 5","expected":"9","type":"hidden"},{"input":"1\n5","expected":"0","type":"hidden"}],
  }
];

// ═══ 导出 ═══
if (typeof module !== "undefined") module.exports = { PROBLEMS_STAGE5_7 };
