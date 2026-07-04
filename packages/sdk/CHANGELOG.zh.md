# 变更记录

## [2.0.0] — 2026-07-04

`@rinova/proxy-sdk` 首次发布。

### 新增

- **高层 API**：`convert(url, opts?)`、`convertFromLines(lines, opts?)`
- **协议解析**：SS（SIP002 + Legacy）、VMess、Trojan、Hysteria2
- **子模块导出**：`@rinova/proxy-sdk/parser`、`/fetch`、`/builder`、`/server`
- **HTTP 服务**：`startServer()`，提供 `/clash.yaml`、`/health`、`POST /refresh`
- **策略组**：ACL4SSR 风格链式引用（`🌍 国外网站` → `🚀 节点选择`）
- **国际化**：`t(key, params?)`、`getLang()`，`locales/en.json` + `locales/zh.json`
- **工具函数**：`fetchSubscription()`、`deduplicateNames()`、`buildConfig()`、`toYaml()`
- **空节点保护**：无有效节点时抛出本地化 `Error`
- **服务横幅**：霓虹渐变 ANSI 启动界面，i18n 标题

### 架构

- ESM，完整 TypeScript 类型声明
- 依赖：axios + js-yaml（不含 Commander）
- User-Agent：`@rinova/proxy-sdk/2.0.0`

### 测试

- 34 单元测试（parser 22 + builder 2 + sdk 10）+ 6 server 集成测试
