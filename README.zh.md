# Rinova Proxy

订阅链接 → Clash 配置文件转换工具。

> **v2.0.0** — `@rinova/proxy-sdk` + `@rinova/proxy-cli`

## 安装

### 从 npm 安装（已发布）

```bash
# CLI（全局安装）
pnpm add -g @rinova/proxy-cli
npm install -g @rinova/proxy-cli

# SDK（作为库引用）
pnpm add @rinova/proxy-sdk
npm install @rinova/proxy-sdk
```

### 从源码构建

```bash
git clone git@github.com:jove-rina/rinova-proxy.git
cd rinova-proxy
pnpm install
pnpm build
```

## 使用（CLI）

**注意**：直接传参，**不加 `--`**。

### 全局安装（发布后）

```bash
pnpm add -g @rinova/proxy-cli

proxy-cli -u "https://your-jms-subscription-url"
proxy-cli -u "https://..." -o ~/Downloads/my-clash.yaml
proxy-cli -u "https://..." --rules builtin
proxy-cli -u "https://..." --merge ~/.config/clash-verge-rev/profiles/current.yaml
proxy-cli -p 25500 -u "https://..." -i 60
```

### 本地开发

```bash
pnpm dev -u "https://..."                    # 同 proxy-cli -u ...
pnpm dev -p 25500 -u "https://..." -i 60    # 服务模式
```

### 本地订阅服务

Verge Rev → Profiles → Import → 远程订阅：

```
URL: http://127.0.0.1:25500/clash.yaml
更新间隔: 60
```

**HTTP 端点**：

| 路径 | 用途 |
|------|------|
| `/clash.yaml` | Clash 配置（YAML） |
| `/health` | 健康检查（JSON：status、nodes、updatedAt、nextRefreshMin、lastError） |
| `/refresh` | POST 手动刷新（返回 JSON：`{ ok, skipped, nodes }`） |

### 编译运行

```bash
pnpm --filter @rinova/proxy-cli start -u "https://..."
# 或
node packages/cli/dist/index.js -u "https://..."
```

## SDK 使用

`@rinova/proxy-sdk` 可以在 Node.js 项目中 import 使用：

```bash
pnpm add @rinova/proxy-sdk
```

```typescript
import { convert } from '@rinova/proxy-sdk';

// 一键转换：拉取订阅 → 解析 → 生成 Clash 配置
const { yaml, nodes } = await convert('https://jms-sub-url');
console.log(`Parsed ${nodes.length} nodes`);
writeFileSync('clash.yaml', yaml);
```

从已有 URI 行离线转换：

```typescript
import { convertFromLines } from '@rinova/proxy-sdk';

const { config } = convertFromLines([
  'ss://YWVz...@host:8388#US-01',
  'trojan://pass@sg.example.com:443#SG-01',
], { rules: 'external' });
```

子模块按需导入：

```typescript
import { parseURI } from '@rinova/proxy-sdk/parser';
import { startServer } from '@rinova/proxy-sdk/server';
```

| 导入路径 | 可用 API |
|----------|---------|
| `@rinova/proxy-sdk` | `convert()`, `convertFromLines()`, 类型, 子模块 re-export |
| `@rinova/proxy-sdk/parser` | `parseURI()`, `parseLines()` |
| `@rinova/proxy-sdk/fetch` | `fetchSubscription()`, `deduplicateNames()` |
| `@rinova/proxy-sdk/builder` | `buildConfig()`, `toYaml()` |
| `@rinova/proxy-sdk/server` | `startServer()` |

## 支持协议

| 协议 | 格式 | 状态 |
|------|------|------|
| Shadowsocks (SS) | SIP002 + Legacy | ✅ |
| V2Ray (VMess) | ws / tcp / grpc / h2 / quic / kcp + tls | ✅ |
| Trojan | 标准格式 | ✅ |
| Hysteria2 | `hysteria2://` + `hy2://` | ✅ |

## 功能

- 自动识别 SS / VMess / Trojan / Hysteria2 四种协议
- HTTP 订阅服务模式（`-p`），支持 Verge 定时拉取
- 节点名去重（同名自动追加 -2, -3）
- 策略组：节点选择、自动测速、直连、广告拦截、国内外分流（**链式引用，见下节**）
- 合并到现有配置（保留规则和策略组）
- 订阅 URL 掩码打印，避免 token 泄露
- URL 编码 / Base64 解码 / 错误容错

## 策略组与分流

生成的 Clash 配置采用 ACL4SSR 风格的**链式策略组**，确保 Verge 主界面「节点选择」能控制实际流量：

```
规则 MATCH / 国外域名
    ↓
🌍 国外网站（默认第一项）
    ↓
🚀 节点选择 ← 在 Verge 中切换节点
    ↓
具体 JMS 节点
```

| 策略组 | 作用 |
|--------|------|
| `🚀 节点选择` | 主选节点，Verge 默认展示此组 |
| `♻️ 自动选择` | url-test 测速，选延迟最低节点 |
| `🎯 直连` | 直连或经节点代理 |
| `🌍 国外网站` | 规则引用的国外分流组，**默认跟随 `🚀 节点选择`** |
| `🇨🇳 国内网站` | 国内域名分流 |
| `🛑 广告拦截` | 广告域名 REJECT |

> **注意**：切换节点请在 `🚀 节点选择` 中进行；`🌍 国外网站` 保持默认即可。

## 国际化（i18n）

CLI 和 SDK 的消息文本根据 `LANG` 或 `LC_ALL` 环境变量自动切换。以 `zh` 开头显示中文，其余默认英文。

```bash
# 英文（大多数系统默认）
proxy-cli -u "https://..."

# 中文
LANG=zh_CN.UTF-8 proxy-cli -u "https://..."
```

SDK 提供翻译函数供程序化使用：

```typescript
import { t, getLang } from '@rinova/proxy-sdk';

console.log(t('refreshing'));              // "刷新订阅..."
console.log(t('parsed', { count: 5 }));    // "解析成功：5 个节点"
console.log(getLang());                    // "en" 或 "zh"
```

Commander 帮助文本同样支持双语：

```bash
LANG=en_US.UTF-8 proxy-cli --help   # 英文帮助
LANG=zh_CN.UTF-8 proxy-cli --help   # 中文帮助
```

## 测试

```bash
pnpm test               # SDK 全部测试（34 + 6 = 40 case）
pnpm --filter @rinova/proxy-sdk test:all
```

| 套件 | 位置 | case 数 |
|------|------|---------|
| parser | `packages/sdk/src/__tests__/parser.test.ts` | 22 |
| builder | `packages/sdk/src/__tests__/builder.test.ts` | 2 |
| sdk | `packages/sdk/src/__tests__/sdk.test.ts` | 10 |
| server | `packages/sdk/src/__tests__/server.test.ts` | 6 |
| **合计** | | **40** |

## 项目结构

```
rinova-proxy/
├── pnpm-workspace.yaml         workspace 配置
├── package.json                根：dev / build / test / typecheck 快捷脚本
├── LICENSE                     MIT 协议
├── CHANGELOG.md / CHANGELOG.zh.md
├── README.md / README.zh.md
├── MILESTONE-2.0.0-ARCHIVE.md   v2.0.0 里程碑归档（英文主文档）
├── MILESTONE-2.0.0-ARCHIVE.zh.md
├── packages/
│   ├── sdk/                    → @rinova/proxy-sdk
│   │   ├── package.json       依赖：axios + js-yaml
│   │   ├── tsconfig.json
│   │   ├── README.md / README.zh.md
│   │   └── src/
│   │       ├── index.ts        convert / convertFromLines
│   │       ├── i18n.ts         国际化：t(), getLang()
│   │       ├── locales/
│   │       │   ├── en.json     英文翻译
│   │       │   └── zh.json     中文翻译
│   │       ├── parser.ts       SS / VMess / Trojan / Hysteria2 解析
│   │       ├── fetch.ts        拉取 + Base64 解码 + 去重
│   │       ├── builder.ts      Clash YAML 组装
│   │       ├── server.ts       HTTP 订阅服务
│   │       ├── utils.ts        工具函数
│   │       ├── types.ts        类型定义
│   │       └── __tests__/      40 case
│   └── cli/                    → @rinova/proxy-cli
│       ├── package.json       依赖：@rinova/proxy-sdk + commander
│       ├── tsconfig.json
│       ├── README.md / README.zh.md
│       └── src/index.ts        CLI 入口（bin: proxy-cli）
```

## 变更记录

见 [CHANGELOG.md](./CHANGELOG.md)（英文）/ [CHANGELOG.zh.md](./CHANGELOG.zh.md)（中文）。

## License

MIT
