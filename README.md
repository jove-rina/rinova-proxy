# Rinova Proxy

Convert subscription links to Clash configuration files.

> **v2.0.0** — `@rinova/proxy-sdk` + `@rinova/proxy-cli`

## Installation

### From npm (published)

```bash
# CLI (global)
pnpm add -g @rinova/proxy-cli
npm install -g @rinova/proxy-cli

# SDK (as a library)
pnpm add @rinova/proxy-sdk
npm install @rinova/proxy-sdk
```

### From source

```bash
git clone git@github.com:jove-rina/rinova-proxy.git
cd rinova-proxy
pnpm install
pnpm build
```

## Usage (CLI)

> **Note**: Pass arguments directly, **do not use `--`** with `pnpm dev`.

### Global install (after npm publish)

```bash
pnpm add -g @rinova/proxy-cli

proxy-cli -u "https://your-jms-subscription-url"
proxy-cli -u "https://..." -o ~/Downloads/my-clash.yaml
proxy-cli -u "https://..." --rules builtin
proxy-cli -u "https://..." --merge ~/.config/clash-verge-rev/profiles/current.yaml
proxy-cli -p 25500 -u "https://..." -i 60
```

### Local development

```bash
pnpm dev -u "https://..."                    # same as proxy-cli -u ...
pnpm dev -p 25500 -u "https://..." -i 60    # serve mode
```

### Local subscription service

Verge Rev → Profiles → Import → Remote subscription:

```
URL: http://127.0.0.1:25500/clash.yaml
Update interval: 60
```

**HTTP endpoints**:

| Path | Description |
|------|-------------|
| `/clash.yaml` | Clash config (YAML) |
| `/health` | Health check JSON (status, nodes, updatedAt, nextRefreshMin, lastError) |
| `/refresh` | POST to trigger manual refresh (response: `{ ok, skipped, nodes }`) |

### Build and run

```bash
pnpm --filter @rinova/proxy-cli start -u "https://..."
# or
node packages/cli/dist/index.js -u "https://..."
```

## SDK Usage

Use `@rinova/proxy-sdk` as a library in your project:

```bash
pnpm add @rinova/proxy-sdk
```

```typescript
import { convert } from '@rinova/proxy-sdk';

// One-shot: fetch → parse → build Clash config
const { yaml, nodes } = await convert('https://jms-sub-url');
console.log(`Parsed ${nodes.length} nodes`);
writeFileSync('clash.yaml', yaml);
```

Offline conversion from pre-existing URI lines:

```typescript
import { convertFromLines } from '@rinova/proxy-sdk';

const { config } = convertFromLines([
  'ss://YWVz...@host:8388#US-01',
  'trojan://pass@sg.example.com:443#SG-01',
], { rules: 'external' });
```

Import submodules as needed:

```typescript
import { parseURI } from '@rinova/proxy-sdk/parser';
import { startServer } from '@rinova/proxy-sdk/server';
```

| Import path | Available API |
|-------------|---------------|
| `@rinova/proxy-sdk` | `convert()`, `convertFromLines()`, types, submodule re-exports |
| `@rinova/proxy-sdk/parser` | `parseURI()`, `parseLines()` |
| `@rinova/proxy-sdk/fetch` | `fetchSubscription()`, `deduplicateNames()` |
| `@rinova/proxy-sdk/builder` | `buildConfig()`, `toYaml()` |
| `@rinova/proxy-sdk/server` | `startServer()` |

## Supported Protocols

| Protocol | Format | Status |
|----------|--------|--------|
| Shadowsocks (SS) | SIP002 + Legacy | ✅ |
| V2Ray (VMess) | ws / tcp / grpc / h2 / quic / kcp + tls | ✅ |
| Trojan | Standard | ✅ |
| Hysteria2 | `hysteria2://` + `hy2://` | ✅ |

## Features

- Parse SS / VMess / Trojan / Hysteria2 protocols
- HTTP subscription service (`-p` flag) for Verge Rev auto-refresh
- Node name deduplication (`-2`, `-3` suffixes)
- Policy groups: select, url-test, direct, ad blocking, domestic/foreign routing (**chained routing, see below**)
- Merge into existing Clash config (preserves rules & groups)
- Subscription URL masking to avoid token leaks
- URL encoding / Base64 decoding / error tolerance

## Chained Policy Groups

The generated Clash config uses ACL4SSR-style **chained policy groups** to ensure Verge's node selector controls actual traffic:

```
Rule MATCH / foreign domains
    ↓
🌍 国外网站 (default: first item)
    ↓
🚀 节点选择 ← Switch nodes in Verge
    ↓
Specific proxy node
```

| Group | Purpose |
|-------|---------|
| `🚀 节点选择` | Main node selector, shown by default in Verge |
| `♻️ 自动选择` | url-test, picks lowest latency node |
| `🎯 直连` | Direct connection or proxy |
| `🌍 国外网站` | Referenced by rules, **defaults to follow `🚀 节点选择`** |
| `🇨🇳 国内网站` | Domestic domain routing |
| `🛑 广告拦截` | Ad domain REJECT |

> **Note**: Group names are Chinese emoji labels (ACL4SSR-style). Switch nodes in `🚀 节点选择`; keep `🌍 国外网站` at its default.

## Internationalization (i18n)

CLI and SDK messages automatically adapt to your system language based on the `LANG` or `LC_ALL` environment variable. If the value starts with `zh`, Chinese is used; otherwise English is the default.

```bash
# English (default on most systems)
proxy-cli -u "https://..."

# Chinese
LANG=zh_CN.UTF-8 proxy-cli -u "https://..."
```

The translation function `t(key, params?)` is available from the SDK:

```typescript
import { t, getLang } from '@rinova/proxy-sdk';

console.log(t('refreshing'));              // "Refreshing subscription..."
console.log(t('parsed', { count: 5 }));    // "Parsed: 5 nodes"
console.log(getLang());                    // "en" or "zh"
```

Commander help text also switches language:

```bash
LANG=en_US.UTF-8 proxy-cli --help   # English options
LANG=zh_CN.UTF-8 proxy-cli --help   # Chinese options
```

## Testing

```bash
pnpm test               # SDK all tests (34 + 6 = 40 cases)
pnpm --filter @rinova/proxy-sdk test:all
```

| Suite | Location | Cases |
|-------|----------|-------|
| parser | `packages/sdk/src/__tests__/parser.test.ts` | 22 |
| builder | `packages/sdk/src/__tests__/builder.test.ts` | 2 |
| sdk | `packages/sdk/src/__tests__/sdk.test.ts` | 10 |
| server | `packages/sdk/src/__tests__/server.test.ts` | 6 |
| **Total** | | **40** |

## Project Structure

```
rinova-proxy/
├── pnpm-workspace.yaml         workspace config
├── package.json                root: dev / build / test / typecheck shortcuts
├── CHANGELOG.md
├── README.md
├── README.zh.md
├── MILESTONE-2.0.0-ARCHIVE.md   v2.0.0 milestone archive (plans + review)
├── MILESTONE-2.0.0-ARCHIVE.zh.md
├── packages/
│   ├── sdk/                    → @rinova/proxy-sdk
│   │   ├── package.json        deps: axios + js-yaml
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts        convert / convertFromLines
│   │       ├── parser.ts       SS / VMess / Trojan / Hysteria2 parsing
│   │       ├── fetch.ts        fetch + Base64 decode + dedup
│   │       ├── builder.ts      Clash YAML assembly
│   │       ├── server.ts       HTTP subscription service
│   │       ├── i18n.ts        i18n: t(), getLang()
│   │       ├── locales/
│   │       │   ├── en.json    英文翻译
│   │       │   └── zh.json    中文翻译
│   │       ├── utils.ts        utilities
│   │       ├── types.ts        type definitions
│   │       └── __tests__/      40 test cases
│   └── cli/                    → @rinova/proxy-cli
│       ├── package.json        deps: @rinova/proxy-sdk + commander
│       ├── tsconfig.json
│       └── src/index.ts        CLI entry (bin: proxy-cli)
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) / [CHANGELOG.zh.md](./CHANGELOG.zh.md).

## License

MIT
