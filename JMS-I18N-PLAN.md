# CLI I18N 方案

## 现状

当前日志分布：

| 位置 | 语言 | 示例 |
|------|------|------|
| `packages/cli/src/index.ts` | 英文 | `Fetching subscription:`, `Config written:` |
| `packages/sdk/src/server.ts` | **中文** | `刷新订阅...`, `刷新成功`, `端口已被占用` |
| `packages/sdk/src/parser.ts` | **中文** | `跳过无法解析的节点` |
| Commander help | 英文 | `output path`, `serve mode` |

## 方案：轻量 i18n 模块

零依赖，JSON 键值对 + 语言检测。

### 新增文件

```
packages/
├── sdk/
│   └── src/
│       ├── i18n.ts           ← 新增：t() 函数 + 语言检测
│       └── locales/
│           ├── en.json       ← 英文
│           └── zh.json       ← 中文
```

### i18n.ts 设计

```typescript
// packages/sdk/src/i18n.ts

import en from './locales/en.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };

const locales = { en, zh };

/** 检测系统语言 */
function detectLang(): 'en' | 'zh' {
  const lang = process.env.LANG || process.env.LC_ALL || '';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

const lang = detectLang();

/** 翻译函数 */
export const t = (key: string, fallback?: string): string => {
  return (locales[lang] as Record<string, string>)[key]
    ?? locales.en[key as keyof typeof en]
    ?? fallback
    ?? key;
};
```

### locales/en.json

```json
{
  "fetching": "Fetching subscription:",
  "decoded": "Decoded: {count} lines",
  "parsed": "Parsed: {count} nodes",
  "config_written": "Config written: {path}",
  "merged": "Merged into: {path}",
  "refreshing": "Refreshing subscription...",
  "refresh_ok": "Refreshed — {count} nodes",
  "refresh_skip": "Refresh already in progress, skipped",
  "refresh_fail": "Refresh failed, using cached config: {msg}",
  "port_in_use": "Port {port} is already in use",
  "skip_node": "Skipping unparseable node: {msg}",
  "mode_requires_url": "Serve mode requires -u",
  "no_nodes": "No valid nodes found",
  "shutting_down": "Shutting down..."
}
```

### locales/zh.json

```json
{
  "fetching": "拉取订阅：",
  "decoded": "解码完成，共 {count} 行",
  "parsed": "解析成功：{count} 个节点",
  "config_written": "配置已生成：{path}",
  "merged": "已合并到：{path}",
  "refreshing": "刷新订阅...",
  "refresh_ok": "刷新成功 — {count} 个节点",
  "refresh_skip": "刷新已在进行中，跳过",
  "refresh_fail": "刷新失败，保留上次缓存：{msg}",
  "port_in_use": "端口 {port} 已被占用",
  "skip_node": "跳过无法解析的节点：{msg}",
  "mode_requires_url": "服务模式需要 -u 参数",
  "no_nodes": "未找到有效节点",
  "shutting_down": "关闭服务..."
}
```

### 使用示例

```typescript
// 之前
console.log(`📍 Fetching subscription: ${maskUrl(url)}`);

// 之后
console.log(`📍 ${t('fetching')} ${maskUrl(url)}`);
```

```typescript
// 之前
console.log(`  ✅ 刷新成功 — ${nodes.length} 个节点`);

// 之后
console.log(`  ✅ ${t('refresh_ok', { count: nodes.length })}`);
```

### Commander help 本地化

Commander 默认英文，要支持中文 help 需要手动切换：

```typescript
if (lang === 'zh') {
  program
    .description('JMS 订阅链接 → Clash 配置文件')
    .option('-u, --url <url>', 'JMS 订阅链接')
    .option('-o, --output <path>', '输出文件路径')
    .option('-p, --port <port>', '服务模式：监听端口')
    .option('-i, --interval <min>', '刷新间隔（分钟）')
    .option('--rules <mode>', '规则模式: builtin（内置）| external（外部）')
    .option('--merge <file>', '合并到现有配置');
}
```

## 改动量

| 文件 | 操作 | 行数 |
|------|------|------|
| `packages/sdk/src/i18n.ts` | 新增 | ~30 |
| `packages/sdk/src/locales/en.json` | 新增 | ~30 |
| `packages/sdk/src/locales/zh.json` | 新增 | ~30 |
| `packages/sdk/src/server.ts` | 替换 console.log | ~15 |
| `packages/sdk/src/parser.ts` | 替换 console.warn | ~2 |
| `packages/cli/src/index.ts` | 替换 console.log + help | ~20 |
| **合计** | | **~130 行** |

## 关键决策

| 问题 | 决定 | 原因 |
|------|------|------|
| 依赖 | 零依赖（纯 JSON + 函数） | CLI 工具不需要 i18next 这种重型库 |
| 语言检测 | 环境变量 `LANG` / `LC_ALL` | 标准 *nix 约定，macOS/Linux 都支持 |
| JSON vs TS | JSON 文件 | 非开发者也能翻译，CI 可校验 |
| 参数插值 | `{count}` 模板字符串替换 | 简单，无需 sprintf |
| Commander help | 手动 if/else | Commander 无原生 i18n 支持 |
