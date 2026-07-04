# @rinova/jms-sdk

JMS 订阅链接 → Clash 配置文件转换工具 — Node.js SDK。

## 安装

```bash
pnpm add @rinova/jms-sdk
```

## 快速开始

```typescript
import { convert } from '@rinova/jms-sdk';

const { yaml, nodes } = await convert('https://jms-subscription-url');
writeFileSync('clash.yaml', yaml);
```

## API

### 高层函数

| 函数 | 说明 |
|------|------|
| `convert(url, opts?)` | 拉取订阅 → 解析 → Clash 配置 |
| `convertFromLines(lines, opts?)` | 离线转换（无网络请求） |

**选项**：`{ rules?: 'builtin' | 'external', deduplicate?: boolean }`

### 子模块

```typescript
import { parseURI } from '@rinova/jms-sdk/parser';
import { startServer } from '@rinova/jms-sdk/server';
import { fetchSubscription } from '@rinova/jms-sdk/fetch';
import { buildConfig, toYaml } from '@rinova/jms-sdk/builder';
import { t, getLang } from '@rinova/jms-sdk';
```

### 国际化

消息文本随 `LANG`/`LC_ALL` 环境变量自动切换。`zh*` → 中文，其余默认英文。

```typescript
console.log(t('refreshing'));           // "刷新订阅..."
console.log(t('parsed', { count: 5 })); // "解析成功：5 个节点"
console.log(getLang());                 // "en" 或 "zh"
```

## 支持协议

SS（SIP002 + Legacy）、VMess（ws/tcp/grpc/h2/quic/kcp）、Trojan、Hysteria2

## License

MIT
