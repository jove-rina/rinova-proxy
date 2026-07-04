# 变更记录

## [2.0.0] — 2026-07-04

`@rinova/proxy-cli` 首次发布。

### 新增

- **CLI 命令**：`proxy-cli`（`pnpm add -g @rinova/proxy-cli` 全局安装）
- **单次转换**：`-u` 拉取并转换，`-o` 指定输出路径
- **HTTP 订阅服务**：`-p` 端口，`-i` 刷新间隔（分钟）
- **合并模式**：`--merge <file>` 合并到已有 Clash 配置
- **规则模式**：`--rules builtin | external`
- **国际化**：全部消息使用 SDK `t()`；Commander 帮助通过 `LANG` 切换中英文
- **URL 掩码**：日志中掩码订阅 token
- **优雅关闭**：SIGINT/SIGTERM 时 `srv.close()` 释放端口

### 架构

- 依赖 `@rinova/proxy-sdk@2.0.0` + commander + js-yaml
- Commander 版本：2.0.0
