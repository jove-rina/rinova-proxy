# 变更记录

## [1.2.0] — 2026-07-04

### 新增

- **Monorepo 拆分**：SDK（`@rinova/jms-sdk`）与 CLI（`@rinova/jms-cli`）双包分离，pnpm workspace 管理。
  - SDK 依赖 axios + js-yaml，**不含 Commander**
  - CLI 依赖 `@rinova/jms-sdk` + commander + js-yaml
  - `pnpm build` / `pnpm test` / `pnpm typecheck` 根脚本覆盖双包
- **SDK (`@rinova/jms-sdk`)**: 程序化 API，支持在 Node.js 项目中 import 使用。
  - `convert(url)` — 一键拉取订阅 → 解析 → Clash 配置
  - `convertFromLines(lines)` — 离线转换（无网络请求）
  - 子模块按需导入：`@rinova/jms-sdk/parser`、`/fetch`、`/builder`、`/server`
  - 包名改为 `@rinova/jms-sdk`，支持 scoped publish
- **i18n 国际化**: 零依赖本地化模块，支持 en/zh 双语。
  - `t(key, params?)` — 按 `LANG`/`LC_ALL` 自动中英切换
  - `getLang()` — 获取当前语言代码
  - `locales/en.json` + `locales/zh.json`，覆盖全部日志、错误消息、Commander help
- **`package.json` exports**: 主入口 + 4 子模块，类型声明完整。
- **SDK 空节点保护**: `convert()` / `convertFromLines()` 在无有效节点时 throw `Error`。
- **`publishConfig`**: `"access": "public"` + `files` 白名单，NPM 发布就绪。

### 修复

- **CLI bin 更名**：`jms-convert` → `jms-cli`（`package.json` bin + Commander name）
- **CLI 改用 `convert()`**：`runConvert` 改为调用 SDK 高层 API，不再手动编排 fetch→parse→build
- **server SDK 化**: 端口冲突 `process.exit(1)` → throw；移除全局 `process.on('SIGINT')`，CLI 侧接管退出逻辑。

### 测试

- 新增 `src/__tests__/sdk.test.ts`（10 case），覆盖 convertFromLines、空节点 throw、去重、规则模式。
- 测试总数：**40 case**（parser 22 + builder 2 + sdk 10 + server 6）。

### 文档

- README 新增「SDK 使用」章节，含安装、示例、子模块表格。
- README 项目结构新增 `sdk.ts` / `sdk.test.ts`。
- README 新增「国际化（i18n）」章节，说明 `LANG` 用法。
- README 安装部分改为优先展示 npm 发布命令。
- CHANGELOG 首次记录 SDK 与包名变更。

### 发布

- 已发布至 npm：`@rinova/jms-sdk@1.2.0` + `@rinova/jms-cli@1.2.0`
- 使用方式：`pnpm add -g @rinova/jms-cli` 或 `pnpm add @rinova/jms-sdk`

---

## [1.1.1] — 2026-07-04

### 修复

- **策略组链路**：`🌍 国外网站` 的默认第一项由 `♻️ 自动选择` 改为 `🚀 节点选择`，与 ACL4SSR / jmspro.cc 模板一致。
  - **现象**：在 Verge 中切换 `🚀 节点选择` 后，查 IP 始终显示同一地址（url-test 选中的最快节点）。
  - **原因**：规则（含 `MATCH` 兜底）指向 `🌍 国外网站`，而该组默认走 `♻️ 自动选择`，与 `🚀 节点选择` 未串联。
  - **修复后流量路径**：`规则 → 🌍 国外网站 → 🚀 节点选择 → 用户选中的节点`。

### 测试

- 新增 `src/__tests__/builder.test.ts`（2 case），验证 `🌍 国外网站` 链式引用。
- `pnpm test` 现同时运行 parser + builder 测试（24 case）。

---

## [1.1.0] — 2026-07-04

- HTTP 订阅服务模式（`-p`）：本地 `/clash.yaml` 供 Verge Rev 定时拉取。
- SS / VMess / Trojan / Hysteria2 四协议解析。
- parser 22 case + server 6 case 集成测试。
