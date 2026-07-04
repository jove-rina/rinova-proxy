# JMS Convert Tool — CLI 分离方案

## 一、当前问题

CLI 与 SDK 在同一包里：

```
@rinova/jms-sdk      ← npm install 时附带 Commander
  ├── dist/sdk.js     (SDK 用户需要的)
  ├── dist/index.js   (CLI，含 Commander)
  └── bin: jms-convert
```

**问题**：
- SDK 用户被迫安装 Commander（`pnpm add @rinova/jms-sdk` 会拉 Commander）
- CLI 的 Commander 依赖与 SDK 无关，增加了 install size
- 版本号耦合：CLI 修了一个日志格式 → SDK 也得发新版本

## 二、方案：pnpm workspace 单仓双包

```
jms-convert-tool/
├── pnpm-workspace.yaml
├── package.json          (根目录，仅 workspace)
├── packages/
│   ├── sdk/              → @rinova/jms-sdk
│   │   ├── package.json  (仅 axios + js-yaml)
│   │   └── src/
│   └── cli/              → @rinova/jms-cli (或 @rinova/jms-convert)
│       ├── package.json  (depends on @rinova/jms-sdk + commander)
│       ├── bin/
│       │   └── jms-convert
│       └── src/
│           └── index.ts
├── src/                  (移入 packages/sdk/src)
└── __tests__/            (移入 packages/sdk/__tests__)
```

### 2.1 依赖关系

```
@rinova/jms-cli
  ├── @rinova/jms-sdk     (工作区引用 "workspace:*")
  ├── commander           (仅 CLI 需要)
  └── js-yaml             (--merge 需要)

@rinova/jms-sdk
  ├── axios               (HTTP 拉订阅)
  └── js-yaml             (序列化 YAML)
```

### 2.2 目录迁移

| 当前路径 | 移入 |
|----------|------|
| `src/sdk.ts` | `packages/sdk/src/index.ts` |
| `src/parser.ts` | `packages/sdk/src/parser.ts` |
| `src/fetch.ts` | `packages/sdk/src/fetch.ts` |
| `src/builder.ts` | `packages/sdk/src/builder.ts` |
| `src/server.ts` | `packages/sdk/src/server.ts` |
| `src/utils.ts` | `packages/sdk/src/utils.ts` |
| `src/types.ts` | `packages/sdk/src/types.ts` |
| `src/index.ts` (CLI) | `packages/cli/src/index.ts` |
| `src/__tests__/` | `packages/sdk/__tests__/` |

### 2.3 CLI 的逻辑变化

CLI 不再自己调用 `fetchSubscription` / `parseLines`，改为调用 SDK 的 `convert()`：

```typescript
// packages/cli/src/index.ts
import { convert } from '@rinova/jms-sdk';
import { Command } from 'commander';

const program = new Command();
program
  .name('jms-convert')
  .option('-u, --url <url>', 'JMS subscription URL')
  // ...

async function main() {
  if (opts.port) {
    const { startServer } = await import('@rinova/jms-sdk/server');
    // 启动服务...
  } else {
    const { yaml } = await convert(url, { rules });
    // 写文件...
  }
}
```

这样 CLI 是 SDK 的一个**消费者**，而不是重复实现。

### 2.4 开发体验

```bash
# 安装所有包
pnpm install

# 开发 CLI
pnpm --filter @rinova/jms-cli dev -u "https://..."

# 开发 SDK
pnpm --filter @rinova/jms-sdk test

# 全部测试
pnpm -r test

# 发布
pnpm -r publish
```

根目录 `package.json` 加 shortcut：

```json
{
  "scripts": {
    "dev": "pnpm --filter @rinova/jms-cli dev",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "publish:all": "pnpm -r publish"
  }
}
```

## 三、改动量

| 工作 | 估算 |
|------|------|
| 创建 `pnpm-workspace.yaml` | 5 分钟 |
| 创建 `packages/sdk/` + `packages/cli/` | 15 分钟 |
| 迁移 SDK 源码 + 调整 import 路径 | 15 分钟 |
| 迁移测试 + 调整 import | 10 分钟 |
| CLI 改用 SDK `convert()` | 15 分钟 |
| 验证 build + test | 10 分钟 |
| **合计** | **~70 分钟** |

## 四、备选方案

### 方案 B：不拆包，仅抽离 CLI 命令

不建 monorepo，只在 `package.json` 里加 `"bin"`：

```
@rinova/jms-sdk (当前结构)
├── bin: jms-convert → dist/index.js
```

**优点**：零改造成本
**缺点**：SDK 用户仍被拖入 Commander 依赖

### 方案 C：完全独立仓库

`rina-coding/jms-cli` 单独仓库，从 npm 引用 `@rinova/jms-sdk`。

**优点**：版本完全解耦
**缺点**：多一个仓库维护成本；本地开发需要 link

## 五、推荐

**方案 A（单仓双包）**：

- 最干净的依赖隔离
- 本地开发零配置（pnpm workspace 自动 link）
- 版本可同步发也可单独发
- 社区常见模式（Vue、Vite、Next.js 都是这样）
