# @rinova/jms-sdk

JMS subscription to Clash config converter — Node.js SDK.

## Install

```bash
pnpm add @rinova/jms-sdk
```

## Quick Start

```typescript
import { convert } from '@rinova/jms-sdk';

const { yaml, nodes } = await convert('https://jms-subscription-url');
writeFileSync('clash.yaml', yaml);
```

## API

### High-level

| Function | Description |
|----------|-------------|
| `convert(url, opts?)` | Fetch subscription → parse → build Clash config |
| `convertFromLines(lines, opts?)` | Offline conversion from URI lines (no network) |

**Options**: `{ rules?: 'builtin' | 'external', deduplicate?: boolean }`

### Submodules

```typescript
import { parseURI } from '@rinova/jms-sdk/parser';
import { startServer } from '@rinova/jms-sdk/server';
import { fetchSubscription } from '@rinova/jms-sdk/fetch';
import { buildConfig, toYaml } from '@rinova/jms-sdk/builder';
import { t, getLang } from '@rinova/jms-sdk';
```

### i18n

Messages adapt to `LANG`/`LC_ALL` env. `zh*` → Chinese, otherwise English.

```typescript
console.log(t('refreshing'));           // "Refreshing subscription..."
console.log(t('parsed', { count: 5 })); // "Parsed: 5 nodes"
console.log(getLang());                 // "en" or "zh"
```

## Supported Protocols

SS (SIP002 + Legacy), VMess (ws/tcp/grpc/h2/quic/kcp), Trojan, Hysteria2

## License

MIT
