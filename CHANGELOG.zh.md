# 变更记录

## [2.0.0] — 2026-07-04

**Rinova Proxy** 首次发布 — 代理订阅链接 → Clash 配置文件转换工具。

### 包

- **`@rinova/proxy-sdk@2.0.0`** — Node.js SDK
- **`@rinova/proxy-cli@2.0.0`** — CLI 工具（`proxy-cli`）

### 功能

- **协议解析**：Shadowsocks（SIP002 + Legacy）、VMess（ws / tcp / grpc / h2 / quic / kcp）、Trojan、Hysteria2（`hysteria2://` + `hy2://`）
- **SDK API**：`convert(url)`、`convertFromLines(lines)`、子模块按需导入（`/parser`、`/fetch`、`/builder`、`/server`）
- **CLI**：单次转换（`-u`）、HTTP 订阅服务（`-p`）、合并模式（`--merge`）、内置/外部规则
- **策略组**：ACL4SSR 风格链式引用（`🌍 国外网站` → `🚀 节点选择`）
- **HTTP 服务**：`/clash.yaml`、`/health`（含 `lastError`）、`POST /refresh`
- **国际化**：通过 `LANG`/`LC_ALL` 自动 en/zh 切换；SDK 导出 `t()`、`getLang()`
- **工具**：节点名去重、订阅 URL 掩码、Base64/URL 解码容错

### 架构

- pnpm workspace monorepo（`rinova-proxy`）
- SDK：axios + js-yaml（不含 Commander）
- CLI：`@rinova/proxy-sdk` + commander + js-yaml

### 测试

- **40 case**：parser 22 + builder 2 + sdk 10 + server 6

### 文档

- 根 README（中英文）、SDK README（323 行 API 参考）、CLI README
- MIT 许可证

### 安装

```bash
pnpm add -g @rinova/proxy-cli
pnpm add @rinova/proxy-sdk
```
