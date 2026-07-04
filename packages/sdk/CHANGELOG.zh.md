# 变更记录

## [1.2.1] — 2026-07-04

### 新增

- **`getLang()`**: 新增导出，返回当前语言代码（`'en'` | `'zh'`）。
- **服务横幅 i18n**: 启动横幅使用 `t('server_title')`。霓虹渐变 ANSI 显示，`RINOVA` 渐变色 + URL 高亮。
- **许可证**: ISC → MIT。

### 修复

- **优雅关闭**: `srv.close(() => process.exit(0))` 确保端口释放后再退出。
- **User-Agent**: 更新为 `@rinova/proxy-sdk/1.2.1`。
- **`server_title` 中文**: zh.json 显示 `"Rinova JMS Server"`。

---

## [1.2.0] — 2026-07-04

### 新增

- **Monorepo 拆分**: SDK 与 CLI 分离，pnpm workspace 管理。
- **程序化 API**: `convert(url, opts?)`, `convertFromLines(lines, opts?)`。
- **国际化**: 零依赖 i18n，`t(key, params?)` + `getLang()`。`locales/en.json` + `locales/zh.json` 覆盖全部 SDK 消息和错误。
- **`publishConfig`**: `"access": "public"`, `files: ["dist"]`。
- **包导出**: `@rinova/proxy-sdk`, `./parser`, `./fetch`, `./builder`, `./server`。

### 修复

- **Server SDK 安全**: 端口冲突抛 Error 而非 `process.exit(1)`。移除全局 `process.on('SIGINT')`。
- **空节点保护**: `convert()` / `convertFromLines()` 在无有效节点时抛 `Error`。

### 变更

- 包名: `jms-convert-tool` → `@rinova/proxy-sdk`。
- 许可证: ISC → MIT（1.2.1）。

---

## [1.1.1] — 2026-07-04

### 修复

- **策略组链路**: `🌍 国外网站` 默认项从 `♻️ 自动选择` 改为 `🚀 节点选择`，对齐 ACL4SSR 模板。

---

## [1.1.0] — 2026-07-04

### 新增

- HTTP 订阅服务: `startServer()`。
- SS / VMess / Trojan / Hysteria2 四协议解析。
- Parser 22 case + server 6 case 集成测试。
