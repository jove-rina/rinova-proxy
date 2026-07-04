# JMS Convert Tool — 本地订阅转换服务方案

## 一、概述

在现有 CLI 工具基础上增加 `serve` 子命令，启动一个 HTTP 服务。Verge Rev 将其配置为「远程订阅」源，由 Verge 自带定时刷新机制驱动更新，**不依赖任何外部服务**。

## 二、架构

```
┌─────────────────────────────────────────────┐
│  jms-convert-tool serve                     │
│                                             │
│  定时器 (60 分钟)                            │
│    ↓ 拉取 → fetch → parser → builder        │
│    ↓ 缓存 clashConfig (内存)                 │
│                                             │
│  HTTP 服务 (localhost:25500)                 │
│    GET /clash.yaml  → 返回缓存的 YAML        │
│    GET /health     → 返回状态 JSON           │
└──────────────┬──────────────────────────────┘
               │
    Verge Rev ─┘ 配置远程订阅:
                 http://127.0.0.1:25500/clash.yaml
                 更新间隔: 60 分钟
```

**数据流**：
```
JMS 订阅 → 定时拉取 → 解析 → 缓存 → HTTP 响应
           ↑ 独立于 HTTP 请求，后台协程驱动
```

## 三、接口设计

### `jms-convert-tool serve`

```bash
# 基础用法
pnpm dev -u "https://jms-sub-url"

# 指定端口和刷新间隔
pnpm dev -p 25500 -u "https://jms-sub-url" -i 60
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `-u, --url` | (必填) | JMS 订阅链接 |
| `-p, --port` | 25500 | 监听端口 |
| `-i, --interval` | 60 | 刷新间隔（分钟） |
| `--rules` | builtin | 同现有规则模式 |

### HTTP 端点

| 路径 | 方法 | 说明 |
|------|------|------|
| `/clash.yaml` | GET | 返回 Clash 配置（YAML） |
| `/health` | GET | 返回健康状态和节点统计 |
| `/refresh` | POST | 手动触发立即刷新 |

### Verge 配置

Verge Rev → Profiles → 添加远程订阅：
```
URL: http://127.0.0.1:25500/clash.yaml
更新间隔: 60
```

## 四、实现策略

### 4.1 新增文件：`src/server.ts`

- 使用 Node 内置 `http` 模块（零依赖新增）
- 启动后立即拉取一次，然后按 `interval` 定时刷新
- 缓存：`{ config: string, nodes: number, updatedAt: number }`
- 端点返回正确 Content-Type

```typescript
// 伪代码
function startServer(url: string, port: number, intervalMin: number) {
  let cache: CacheEntry | null = null;

  async function refresh() {
    const lines = await fetchSubscription(url);
    const nodes = parseLines(lines);
    deduplicateNames(nodes);
    const config = buildConfig(nodes, ruleMode);
    cache = { yaml: toYaml(config), count: nodes.length, time: Date.now() };
  }

  // 立即刷新
  refresh();
  // 定时刷新
  setInterval(refresh, intervalMin * 60_000);

  // HTTP 服务
  http.createServer((req, res) => {
    if (req.url === '/clash.yaml') {
      res.writeHead(200, { 'Content-Type': 'text/yaml' });
      res.end(cache?.yaml ?? '');
    } else if (req.url === '/health') { ... }
  }).listen(port);
}
```

### 4.2 修改 `src/index.ts`

- 增加 `serve` 子命令（commander 支持 `.command()`）
- `jms-convert serve ...` 走 server 分支
- 原有 `-u` 参数保持不变，做单次转换

```typescript
program
  .command('serve')
  .description('启动本地订阅转换服务')
  .requiredOption('-u, --url <url>', 'JMS 订阅链接')
  .option('-p, --port <port>', '监听端口', '25500')
  .option('-i, --interval <min>', '刷新间隔（分钟）', '60')
  .option('--rules <mode>', '规则模式', 'builtin')
  .action((opts) => startServer(opts));
```

## 五、零新增依赖

| 用途 | 方案 |
|------|------|
| HTTP 服务 | Node.js 内置 `http` 模块 |
| 定时器 | Node.js 内置 `setInterval` |
| 启动参数 | Commander 已有 |
| 订阅拉取 + 解析 + 构建 | 复用现有 `fetch/parser/builder` |

## 六、边界情况

| 场景 | 处理 |
|------|------|
| 首次启动拉取失败 | 启动时报错退出，不启动 HTTP |
| 运行中刷新失败 | 保留上次缓存，日志 warn，不中断服务 |
| 客户端并发请求 | HTTP 同步返回缓存，无竞态（缓存一次性更新） |
| 端口被占用 | 捕获 `EADDRINUSE`，提示用户换端口 |
| Verge 频繁轮询 | 直接返回缓存，开销极小（纯内存读） |

## 七、与现有项目的关系

```
src/
├── index.ts    ← 增加 serve 子命令
├── server.ts   ← 新增：HTTP 服务 + 定时刷新
├── fetch.ts    ← 不变
├── parser.ts   ← 不变
├── builder.ts  ← 不变
├── utils.ts    ← 不变
└── types.ts    ← 不变
```

**无侵入**：现有 `-u` CLI 模式保持完全兼容，新增的 `serve` 模式是平行扩展。

## 八、总结

| 维度 | 评估 |
|------|------|
| 新增代码量 | ~80 行（`server.ts` + `index.ts` 子命令） |
| 新增依赖 | 0 |
| 对现有功能影响 | 无（平行子命令） |
| 预期效果 | Verge 定时拉本地服务 = 自动更新节点 |

---

### 实现说明

实际 CLI 接口与 Plan 略有调整：

| Plan 设计 | 实际实现 | 原因 |
|-----------|----------|------|
| `jms-convert serve -u URL` 子命令 | `jms-convert -p 25500 -u URL` 旗标 |  避免 Commander 父子命令选项冲突，用法更扁平 |
| `-p` 无默认值 | 默认 **25500**（传 `-p` 可不带值） | 减少记忆负担，与文档一致 |

核心功能（HTTP 服务、定时刷新、缓存降级、端点）均按 Plan 实现。
