# Rinova Proxy — 里程碑归档文档（v2.0.0）

> **归档日期**：2026-07-04  
> **里程碑版本**：`@rinova/proxy-sdk@2.0.0` · `@rinova/proxy-cli@2.0.0`  
> **项目定位**：代理订阅链接 → Clash 配置文件转换工具（CLI + SDK）  
> **许可证**：MIT  
> **验证状态**：typecheck ✅ · build ✅ · test **40/40** ✅

> 🇺🇸 [English version](./MILESTONE-2.0.0-ARCHIVE.md)

本文档汇总原 `JMS-CONVERT-PLAN`、`JMS-CONVERT-SERVE-PLAN`、`JMS-CONVERT-SDK-PLAN`、`JMS-CONVERT-CLI-PLAN`、`JMS-I18N-PLAN`、`JMS-CONVERT-REVIEW` 六份规划/审核文档，作为 **2.0.0 首发里程碑** 的完整归档。

---

## 目录

1. [执行摘要](#一执行摘要)
2. [项目演进时间线](#二项目演进时间线)
3. [最终架构](#三最终架构)
4. [核心转换能力（CONVERT）](#四核心转换能力convert)
5. [HTTP 订阅服务（SERVE）](#五http-订阅服务serve)
6. [SDK 设计（SDK）](#六sdk-设计sdk)
7. [CLI 与 Monorepo 拆分（CLI）](#七cli-与-monorepo-拆分cli)
8. [国际化（I18N）](#八国际化i18n)
9. [策略组与分流设计](#九策略组与分流设计)
10. [Plan vs 实现对照](#十plan-vs-实现对照)
11. [质量审核结论](#十一质量审核结论)
12. [测试覆盖](#十二测试覆盖)
13. [安全性](#十三安全性)
14. [文档与发布](#十四文档与发布)
15. [后续扩展方向](#十五后续扩展方向)
16. [附录：源码结构](#附录源码结构)

---

## 一、执行摘要

### 1.1 一句话

**Rinova Proxy 2.0.0** 是一个零框架、最小依赖的 Node.js 工具：拉取 Base64 编码的代理订阅，解析 SS / VMess / Trojan / Hysteria2 节点，生成 ACL4SSR 风格链式策略组的 Clash 配置；同时提供 CLI（`proxy-cli`）和可编程 SDK（`@rinova/proxy-sdk`），支持 HTTP 本地订阅服务供 Clash Verge Rev 定时拉取。

### 1.2 里程碑交付物

| 交付物 | 包名 / 命令 | 版本 |
|--------|-------------|------|
| Node.js SDK | `@rinova/proxy-sdk` | 2.0.0 |
| CLI 工具 | `@rinova/proxy-cli` / `proxy-cli` | 2.0.0 |
| Monorepo 根 | `rinova-proxy` (private) | — |

### 1.3 各 Plan 完成度

| 原 Plan 文档 | 主题 | 完成度 |
|--------------|------|--------|
| JMS-CONVERT-PLAN | MVP 转换：fetch → parse → build | ✅ 100%（+ Hysteria2 扩展） |
| JMS-CONVERT-SERVE-PLAN | HTTP 本地订阅服务 | ✅ 100% |
| JMS-CONVERT-SDK-PLAN | 程序化 SDK API | ✅ 100% |
| JMS-CONVERT-CLI-PLAN | pnpm workspace 双包分离 | ✅ 100% |
| JMS-I18N-PLAN | en/zh 国际化 | ✅ ~98%（缺 i18n 单测） |
| JMS-CONVERT-REVIEW | 全面审核 | ✅ 通过 |

---

## 二、项目演进时间线

```
阶段 0 — 可行性验证（JMS-CONVERT-PLAN）
  └─ 确定：axios + js-yaml + commander，纯函数解析 SS/VMess/Trojan

阶段 1 — MVP CLI
  └─ 单次转换 -u，内置/外部规则，Clash YAML 输出

阶段 2 — HTTP 订阅服务（JMS-CONVERT-SERVE-PLAN）
  └─ -p 服务模式，/clash.yaml /health /refresh，Verge Rev 远程订阅

阶段 3 — 策略组链式修复
  └─ 🌍 国外网站 默认跟随 🚀 节点选择（ACL4SSR 模板对齐）

阶段 4 — SDK 化（JMS-CONVERT-SDK-PLAN）
  └─ convert() / convertFromLines()，子模块 exports

阶段 5 — Monorepo 拆分（JMS-CONVERT-CLI-PLAN）
  └─ @rinova/proxy-sdk + @rinova/proxy-cli，SDK 不含 Commander

阶段 6 — 国际化（JMS-I18N-PLAN）
  └─ t() / getLang()，locales/en.json + zh.json，Commander 双语 help

阶段 7 — 命名通用化 + 文档完善
  └─ jms-* → proxy-*，霓虹服务横幅，323 行 SDK API 文档

阶段 8 — 2.0.0 首发里程碑 ← 当前
  └─ 版本统一 2.0.0，CHANGELOG 重置为起始版本，全面审核通过
```

### 命名演进

| 阶段 | SDK 包名 | CLI 包名 | CLI 命令 |
|------|----------|----------|----------|
| 早期 | `jms-convert-tool` | 同包 bin | `jms-convert` |
| 中期 | `@rinova/jms-sdk` | `@rinova/jms-cli` | `jms-cli` |
| **2.0.0** | `@rinova/proxy-sdk` | `@rinova/proxy-cli` | `proxy-cli` |

---

## 三、最终架构

### 3.1 数据流（端到端）

```
代理订阅 URL
      ↓  HTTP GET (axios, User-Agent: @rinova/proxy-sdk/2.0.0)
Base64 编码文本（可能 URL-encoded）
      ↓  padBase64 + Buffer.from + decodeURIComponent 容错
多行代理 URI（每行一个节点）
      ↓  parseURI / parseLines（无效行 warn 跳过）
ProxyNode[] 结构化对象
      ↓  deduplicateNames（同名追加 -2, -3）
      ↓  buildConfig（策略组 + 规则）
ClashConfig 对象
      ↓  toYaml (js-yaml)
clash.yaml 字符串
      ↓
  ┌─ CLI: 写文件 / merge 现有配置
  └─ Server: 内存缓存 → GET /clash.yaml
```

### 3.2 Monorepo 目录

```
rinova-proxy/                         private · MIT · LICENSE
├── pnpm-workspace.yaml
├── package.json                      dev / build / test / typecheck / publish:*
├── README.md · README.zh.md
├── CHANGELOG.md · CHANGELOG.zh.md
├── MILESTONE-2.0.0-ARCHIVE.md        ← 英文版（主文档）
├── MILESTONE-2.0.0-ARCHIVE.zh.md     ← 本文档（中文版）
└── packages/
    ├── sdk/  → @rinova/proxy-sdk@2.0.0
    │   ├── package.json              axios + js-yaml（无 Commander）
    │   ├── README.md · README.zh.md  323 行 API 参考
    │   └── src/
    │       ├── index.ts              convert / convertFromLines + re-exports
    │       ├── parser.ts             SS / VMess / Trojan / Hysteria2
    │       ├── fetch.ts              拉取 + Base64 + 去重
    │       ├── builder.ts            Clash 配置组装
    │       ├── server.ts             HTTP 订阅服务
    │       ├── i18n.ts               t() / getLang()
    │       ├── locales/en.json · zh.json
    │       ├── utils.ts · types.ts
    │       └── __tests__/            40 test cases
    └── cli/  → @rinova/proxy-cli@2.0.0
        ├── package.json              @rinova/proxy-sdk + commander + js-yaml
        ├── README.md · README.zh.md
        └── src/index.ts              bin: proxy-cli（118 行）
```

### 3.3 依赖隔离

| 包 | 运行时依赖 | Commander |
|----|-----------|-----------|
| `@rinova/proxy-sdk` | axios, js-yaml | ❌ |
| `@rinova/proxy-cli` | `@rinova/proxy-sdk`, commander, js-yaml | ✅ |

---

## 四、核心转换能力（CONVERT）

> 来源：`JMS-CONVERT-PLAN.md`

### 4.1 支持协议

| 协议 | URI 前缀 | 格式 | Clash type | 2.0.0 状态 |
|------|----------|------|------------|------------|
| Shadowsocks | `ss://` | SIP002、Legacy、JMS 扩展（b64 内含 @） | `ss` | ✅ |
| VMess | `vmess://` | Base64 JSON | `vmess` | ✅ |
| Trojan | `trojan://` | URL 格式 | `trojan` | ✅ |
| Hysteria2 | `hysteria2://` / `hy2://` | URL 格式 + alpn/带宽 | `hysteria2` | ✅（Plan 后扩展） |

#### SS 解析要点

- SIP002：`ss://base64(method:password)@host:port#name`
- Legacy：`ss://base64(method:password@host:port)#name`
- 密码含冒号（AEAD 2022）：`split(':')` 保留后续部分
- 无 name 时回退到 `server`

#### VMess 解析要点

- 传输层：`ws` / `tcp` / `grpc` / `h2` / `quic` / `kcp`
- TLS：`tls` / `none`，支持 `sni`、`alpn`、`client-fingerprint`、`skip-cert-verify`
- 字段别名：`ps`/`remarks`、`add`/`host`

#### Trojan / Hysteria2 要点

- 使用原生 `URL` 解析
- 支持 `allowInsecure` / `insecure` / `skip-cert-verify`
- Hysteria2 支持 `up`/`down` 带宽参数

### 4.2 fetch 模块

```typescript
fetchSubscription(url: string): Promise<string[]>
```

- axios GET，15s 超时，`responseType: 'text'`
- URL-encoded 返回值自动 `decodeURIComponent`
- Base64 解码失败降级为纯文本
- 按行分割，过滤空行和 `#` 注释
- 空结果 throw 本地化 Error

### 4.3 节点去重

```typescript
deduplicateNames(nodes: { name: string }[]): void  // 就地修改
```

- 首个保留原名，后续同名追加 `-2`、`-3`
- 基数名去除已有 `-数字` 后缀后再计数

### 4.4 规则模式

| 模式 | 说明 |
|------|------|
| `builtin`（默认） | 内置常用域名规则（Google、GitHub、OpenAI、国内 CDN 等） |
| `external` | ACL4SSR RuleSet 远程链接（BanEasyAD、ProxyMedia、ChinaDomain） |

### 4.5 边界情况与容错（Plan 设计 → 2.0.0 实现）

| 问题 | 处理方式 | 状态 |
|------|----------|------|
| 订阅 4xx/网络错误 | axios 异常向上传播 | ✅ |
| Base64 填充不足 | `padBase64()` 补齐 `=` | ✅ |
| VMess JSON 缺失字段 | 默认值 + 可选链 | ✅ |
| URI 无法解析 | warn 跳过，不中断 | ✅ |
| 订阅空结果 | throw 本地化 Error | ✅ |
| 节点名重复 | deduplicateNames | ✅ |
| 中文 URL 编码 | `safeDecodeURI` / decodeURIComponent | ✅ |

---

## 五、HTTP 订阅服务（SERVE）

> 来源：`JMS-CONVERT-SERVE-PLAN.md`

### 5.1 用途

启动本地 HTTP 服务，Clash Verge Rev 配置为「远程订阅」源，由 Verge 定时拉取 `/clash.yaml`，实现节点自动更新。**不依赖任何外部中转服务**。

### 5.2 架构

```
proxy-cli -p 25500 -u "订阅URL" -i 60
      │
      ├─ 定时器（intervalMin 分钟）
      │    └─ fetch → parse → dedup → build → 内存缓存
      │
      └─ HTTP Server (127.0.0.1:25500)
           ├─ GET  /clash.yaml  → 缓存 YAML
           ├─ GET  /health      → JSON 状态
           └─ POST /refresh     → 手动刷新
```

Verge Rev 配置：

```
URL: http://127.0.0.1:25500/clash.yaml
更新间隔: 60
```

### 5.3 HTTP 端点详情

| 路径 | 方法 | Content-Type | 响应 |
|------|------|--------------|------|
| `/clash.yaml` | GET | `text/yaml` | 最新 YAML；无缓存 503 |
| `/health` | GET | `application/json` | `{ status, nodes, updatedAt, nextRefreshMin, lastError }` |
| `/refresh` | POST | `application/json` | `{ ok, skipped, nodes }`；GET 返回 405 |
| 其他 | * | — | 404 |

### 5.4 边界情况

| 场景 | 处理 |
|------|------|
| 首次拉取失败 | 不启动 HTTP，throw 退出 |
| 运行中刷新失败 | 保留上次缓存，`lastError` 记录，warn 日志 |
| 并发刷新 | `refreshing` 标志，返回 `{ skipped: true }` |
| 端口占用 | `EADDRINUSE` → throw 本地化 Error |
| 客户端频繁轮询 | 直接返回内存缓存，零 IO |

### 5.5 实现特性（超出 Plan）

- 绑定 `127.0.0.1`（非 `0.0.0.0`）
- 霓虹渐变 ANSI 启动横幅 + i18n 标题
- CLI 侧 `SIGINT`/`SIGTERM` graceful shutdown（`srv.close()`）
- SDK 内无 `process.exit()`

---

## 六、SDK 设计（SDK）

> 来源：`JMS-CONVERT-SDK-PLAN.md`

### 6.1 设计原则

| 决策 | 选择 | 原因 |
|------|------|------|
| API 风格 | 纯函数 | 无状态、可 tree-shake |
| `convert()` 含网络 | 是 | 最常见用例一键完成 |
| 导出粒度 | 主入口 + 4 子模块 | 普通用户 vs 高级用户 |
| 依赖 CLI | 否 | SDK 用户不需要 Commander |
| 错误处理 | throw Error，无 process.exit | 库安全 |

### 6.2 高层 API

```typescript
import { convert, convertFromLines } from '@rinova/proxy-sdk';

// 在线：拉取 → 解析 → 构建 → YAML
const { yaml, config, nodes } = await convert('https://sub-url', {
  rules: 'builtin',      // 'builtin' | 'external'
  deduplicate: true,     // 默认 true
});

// 离线：从 URI 行转换，无网络
const result = convertFromLines(['ss://...', 'trojan://...'], {
  rules: 'external',
});
```

### 6.3 子模块 exports

| 导入路径 | 导出 |
|----------|------|
| `@rinova/proxy-sdk` | `convert`, `convertFromLines`, `parseURI`, `parseLines`, `buildConfig`, `toYaml`, `fetchSubscription`, `deduplicateNames`, `startServer`, `t`, `getLang`, 类型 |
| `@rinova/proxy-sdk/parser` | `parseURI`, `parseLines` |
| `@rinova/proxy-sdk/fetch` | `fetchSubscription`, `deduplicateNames` |
| `@rinova/proxy-sdk/builder` | `buildConfig`, `toYaml` |
| `@rinova/proxy-sdk/server` | `startServer` |

### 6.4 类型

```typescript
ProxyNode      // name, type, server, port + 协议扩展字段
ProxyGroup     // name, type, proxies, url?, interval?
ClashConfig    // port, proxies, proxy-groups, rules, ...
ConvertOptions // { rules?, deduplicate? }
ConvertResult  // { config, yaml, nodes }
```

### 6.5 startServer API

```typescript
const server = await startServer({
  url: 'https://sub-url',
  port: 25500,
  intervalMin: 60,
  ruleMode: 'builtin',
});
server.close();  // 关闭
```

---

## 七、CLI 与 Monorepo 拆分（CLI）

> 来源：`JMS-CONVERT-CLI-PLAN.md`

### 7.1 拆分动机

原 CLI 与 SDK 同包时，SDK 用户被迫安装 Commander，版本耦合，install size 增大。

### 7.2 方案选择

| 方案 | 描述 | 结论 |
|------|------|------|
| A 单仓双包 | pnpm workspace | ✅ **采用** |
| B 不拆包 | 同包加 bin | ❌ SDK 仍带 Commander |
| C 独立仓库 | 两个 git repo | ❌ 维护成本高 |

### 7.3 CLI 命令参考

```bash
# 单次转换
proxy-cli -u "https://sub-url"
proxy-cli -u "https://..." -o ~/Downloads/clash.yaml
proxy-cli -u "https://..." --rules external
proxy-cli -u "https://..." --merge ~/.config/clash/config.yaml

# HTTP 订阅服务
proxy-cli -p 25500 -u "https://..." -i 60

# 本地开发
pnpm dev -u "https://..."
pnpm dev -p 25500 -u "https://..." -i 60
```

### 7.4 CLI 实现要点

- `runConvert` 调用 SDK `convert()`，不再手动编排 fetch→parse→build
- `--merge`：读取现有 YAML，替换 `proxies`，更新 proxy-groups 中失效节点引用
- `maskUrl()`：日志中掩码 query token
- Commander 版本与 package.json 同步：**2.0.0**

### 7.5 根脚本

| 命令 | 作用 |
|------|------|
| `pnpm dev` | CLI 开发模式（tsx） |
| `pnpm build` | SDK + CLI 编译 |
| `pnpm test` | SDK 全部 40 case |
| `pnpm typecheck` | 双包 TS 检查 |
| `pnpm publish:sdk` / `publish:cli` | npm 分包发布 |
| `pnpm publish:all-dry-run` | 发版前 dry-run |

---

## 八、国际化（I18N）

> 来源：`JMS-I18N-PLAN.md`

### 8.1 方案

零依赖 i18n：`locales/en.json` + `locales/zh.json` + `t()` 函数。

### 8.2 语言检测

```typescript
// LANG 或 LC_ALL 以 'zh' 开头 → 中文，否则英文
getLang(): 'en' | 'zh'
t(key: string, params?: Record<string, string | number>, fallback?: string): string
```

### 8.3 覆盖范围

| 区域 | 内容 |
|------|------|
| CLI 日志 | fetching、parsed、config_written、merged、shutting_down 等 |
| Server 日志 | refreshing、refresh_ok、refresh_skip、refresh_fail、port_in_use |
| Parser warn | skip_node |
| Error 消息 | err_* 系列（订阅空、协议不支持、SS/VMess 格式错误等） |
| Commander help | 中英文两套 option 描述 |
| 服务横幅 | server_title、server_banner_clash、server_banner_health |

### 8.4 使用示例

```bash
LANG=zh_CN.UTF-8 proxy-cli -u "https://..."
LANG=en_US.UTF-8 proxy-cli --help
```

```typescript
import { t, getLang } from '@rinova/proxy-sdk';
console.log(getLang());              // 'en' | 'zh'
console.log(t('parsed', { count: 5 }));
```

### 8.5 已知缺口（P4）

- 无 i18n 单元测试
- locale 键与 TS 引用无自动校验脚本

---

## 九、策略组与分流设计

### 9.1 链式引用（核心设计）

确保 Verge 主界面「节点选择」控制实际流量：

```
规则 MATCH / 国外域名
    ↓
🌍 国外网站（默认第一项 = 🚀 节点选择）
    ↓
🚀 节点选择 ← 用户在 Verge 切换节点
    ↓
具体代理节点
```

> **历史问题**：若 `🌍 国外网站` 默认指向 `♻️ 自动选择`，Verge 切换 `🚀 节点选择` 后 IP 不变（始终走 url-test 最快节点）。2.0.0 已按 ACL4SSR / jmspro.cc 模板修复。

### 9.2 策略组清单

| 组名 | 类型 | 作用 |
|------|------|------|
| 🚀 节点选择 | select | 主选节点，Verge 默认展示 |
| ♻️ 自动选择 | url-test | 测速选最低延迟（gstatic 204） |
| 🎯 直连 | select | 直连或经节点代理 |
| 🌍 国外网站 | select | 规则引用，**默认 🚀 节点选择** |
| 🇨🇳 国内网站 | select | 国内域名分流 |
| 🛑 广告拦截 | select | REJECT |

### 9.3 默认 Clash 端口

| 项 | 值 |
|----|-----|
| HTTP 代理 | 7890 |
| SOCKS | 7891 |
| external-controller | 127.0.0.1:9090 |
| allow-lan | true |
| mode | Rule |

---

## 十、Plan vs 实现对照

| Plan 设计 | 2.0.0 实现 | 说明 |
|-----------|------------|------|
| 项目名 `jms-convert-tool` | `rinova-proxy` | 仓库重命名 |
| 包名 `@rinova/jms-*` | `@rinova/proxy-*` | 通用化命名 |
| CLI 命令 `jms-convert` | `proxy-cli` | 最终命令名 |
| `serve` 子命令 | `-p` 旗标 | 避免 Commander 父子命令冲突 |
| 3 协议（SS/VMess/Trojan） | + Hysteria2 | 功能扩展 |
| `src/sdk.ts` 独立文件 | 合并入 `index.ts` | 结构简化，功能等价 |
| Plan 估 ~150-200 行 | ~765 行 TS（含测试 ~1200+） | 含 i18n、server、Hy2、测试 |
| server 中文硬编码 | 全面 i18n | I18N-PLAN 落地 |
| SDK 无 exports 字段 | 5 路 exports + .d.ts | 完整类型声明 |
| allow-lan: false（Plan） | allow-lan: true | 实际配置调整 |

---

## 十一、质量审核结论

> 来源：`JMS-CONVERT-REVIEW.md`（多轮审核，2.0.0 终态）

### 11.1 审核维度

| 维度 | 2.0.0 状态 |
|------|------------|
| 功能完整性 | ✅ 四协议 + CLI + SDK + HTTP 服务 + merge + i18n |
| 架构 | ✅ monorepo 双包，依赖隔离 |
| 代码质量 | ✅ 纯函数、无 SDK process.exit、错误本地化 |
| 测试 | ✅ 40/40 |
| 文档 | ✅ 根 README + SDK 323 行 API + CLI README + CHANGELOG |
| 安全性 | ✅ 127.0.0.1 绑定、URL 掩码、MIT |
| NPM 就绪 | ✅ publishConfig + files 白名单 |

### 11.2 最终评级

**通过 — 2.0.0 首发版功能、测试、文档均达标，建议发布 npm。**

### 11.3 非阻塞改进项（P4）

1. CLI 集成测试
2. i18n / locale 键完整性单测
3. `convert()` 网络路径 mock 测试
4. 版本号单一来源（package.json → CLI / User-Agent 自动读取）
5. `/health` 响应类型导出到 SDK types

---

## 十二、测试覆盖

```
pnpm test  → 40/40 ✅
```

| 套件 | 文件 | case 数 | 覆盖重点 |
|------|------|---------|----------|
| parser | `parser.test.ts` | 22 | SS SIP002/Legacy、VMess 各传输层、Trojan、Hy2、dedup、parseLines |
| builder | `builder.test.ts` | 2 | 🌍→🚀 链式引用、节点选择含全部节点 |
| sdk | `sdk.test.ts` | 10 | convertFromLines、dedup 开关、rules 模式、空输入 throw、re-exports |
| server | `server.test.ts` | 6 | /health、/clash.yaml、query 参数、POST /refresh、405、404 |

---

## 十三、安全性

| 项 | 状态 | 说明 |
|----|------|------|
| HTTP 绑定 | ✅ | 127.0.0.1 only |
| 订阅 token 泄露 | ✅ | CLI maskUrl 掩码日志 |
| SDK 进程控制 | ✅ | 无 process.exit |
| allow-lan: true | ⚠️ | Clash 默认行为，局域网可连 |
| 生成 yaml gitignore | ✅ | `*.yaml` 已 ignore |
| 依赖 | ✅ | axios、js-yaml、commander（CLI only） |

---

## 十四、文档与发布

### 14.1 文档清单

| 文档 | 路径 | 说明 |
|------|------|------|
| 项目 README | `README.md` / `README.zh.md` | 安装、CLI、SDK、策略组、i18n、测试 |
| SDK API | `packages/sdk/README.md` | 323 行完整 API 参考 |
| CLI 用法 | `packages/cli/README.md` | 命令示例 |
| 变更记录 | `CHANGELOG.md` 等 6 份 | 仅 [2.0.0] 起始记录 |
| **里程碑归档** | `MILESTONE-2.0.0-ARCHIVE.md` / `.zh.md` | 英文主文档 + 本文档 |

### 14.2 安装

```bash
# CLI 全局
pnpm add -g @rinova/proxy-cli
npm install -g @rinova/proxy-cli

# SDK 项目依赖
pnpm add @rinova/proxy-sdk
```

### 14.3 发布流程

```bash
pnpm install
pnpm build && pnpm test && pnpm typecheck
pnpm publish:all-dry-run
pnpm publish:sdk && pnpm publish:cli   # @rinova/proxy-*@2.0.0
```

---

## 十五、后续扩展方向

> 来源：`JMS-CONVERT-PLAN.md` 第八节 + SDK-PLAN Future

| 方向 | 描述 | 优先级 |
|------|------|--------|
| 多订阅源合并 | 多个 URL 合并输出 | P3 |
| 自定义规则模板 | 用户 rules.yaml 模板，只替换 proxies | P3 |
| Hermes 插件化 | 包装为 Hermes skill | P4 |
| Browser / Edge Workers | axios → native fetch | P4 |
| 流式解析 | 超大订阅分块解析 | P4 |
| CLI 集成测试 | mock convert / startServer | P4 |
| 版本号自动同步 | 单源 package.json | P4 |

---

## 附录：源码结构

### SDK 模块职责（~647 行 TS）

| 文件 | 行数 | 职责 |
|------|------|------|
| `parser.ts` | 194 | SS / VMess / Trojan / Hysteria2 URI 解析 |
| `server.ts` | 126 | HTTP 服务、定时刷新、缓存、霓虹横幅 |
| `index.ts` | 84 | convert / convertFromLines + re-exports |
| `builder.ts` | 75 | Clash 配置组装、规则集 |
| `fetch.ts` | 63 | 订阅拉取、Base64、去重 |
| `i18n.ts` | 48 | 语言检测、t() |
| `types.ts` | 40 | TypeScript 类型 |
| `utils.ts` | 17 | padBase64、safeDecodeURI |

### CLI（118 行）

- Commander 参数解析（中英文 help）
- `runConvert`：convert + 写文件 / merge
- 服务模式：startServer + graceful shutdown

---

## 归档说明

本文档替代以下原始文件（内容已整合，原文件已删除）：

- `JMS-CONVERT-PLAN.md` — MVP 转换方案
- `JMS-CONVERT-SERVE-PLAN.md` — HTTP 订阅服务方案
- `JMS-CONVERT-SDK-PLAN.md` — SDK 设计方案
- `JMS-CONVERT-CLI-PLAN.md` — Monorepo 拆分方案
- `JMS-I18N-PLAN.md` — 国际化方案
- `JMS-CONVERT-REVIEW.md` — 全面审核报告

**里程碑**：Rinova Proxy **v2.0.0** — 2026-07-04 首发。

---

*归档生成于 rinova-proxy monorepo，基于 40/40 测试通过、双包 typecheck/build 验证的代码快照。*
