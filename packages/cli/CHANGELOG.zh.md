# 变更记录

## [1.2.1] — 2026-07-04

### 新增

- **`getLang()`**: CLI 改用 SDK 的 `getLang()`，消除重复语言检测。
- **优雅关闭**: `srv.close(() => process.exit(0))` 防止重启时端口被占用。
- **霓虹启动横幅**: 样式化启动界面，渐变色 `RINOVA` 标题 + 可复制 URL。
- **许可证**: ISC → MIT。

### 修复

- **CLI 导入清理**: 移除未使用的 `fileURLToPath`。
- **Commander 版本**: 同步为 `1.2.1`。

### 变更

- **Commander 帮助**: 中文分支现在正确显示中文选项描述。

---

## [1.2.0] — 2026-07-04

### 新增

- **Monorepo 拆分**: CLI 与 SDK 分离，pnpm workspace 管理。
- **SDK 消费**: `runConvert` 使用 SDK 高层 API `convert()`。
- **国际化**: 全部 CLI 消息使用 SDK 的 `t()`。Commander 帮助通过 `LANG` 环境变量支持中英文。
- **`publishConfig`**: `"access": "public"`, `files: ["dist"]`。

### 修复

- **CLI bin 更名**: `jms-convert` → `jms-cli`（package.json bin + Commander name）。

---

## [1.1.1] — 2026-07-04

### 修复

- **策略组链路**: `🌍 国外网站` 默认项从 `♻️ 自动选择` 改为 `🚀 节点选择`。

---

## [1.1.0] — 2026-07-04

### 新增

- HTTP 订阅服务模式（`-p` 参数）。
- SS / VMess / Trojan / Hysteria2 协议支持。
- 订阅 URL 掩码。
- 合并模式（`--merge`）合并到已有 Clash 配置。
