# Rinova JMS 

Convert JMS (Just My Sockets) subscription links to Clash configuration files.

## Installation

### From npm (published)

```bash
# CLI (global)
pnpm add -g @rinova/jms-cli
# or: npm install -g @rinova/jms-cli

# SDK (as a library)
pnpm add @rinova/jms-sdk
```

### From source

```bash
git clone git@github.com:jove-rina/rinova-jms.git
cd rinova-jms
pnpm install
pnpm build
```

## Usage (CLI)

> **Note**: Pass arguments directly, **do not use `--`** with `pnpm dev`.

### Global install (after npm publish)

```bash
pnpm add -g @rinova/jms-cli

jms-cli -u "https://your-jms-subscription-url"
jms-cli -u "https://..." -o ~/Downloads/my-clash.yaml
jms-cli -u "https://..." --rules builtin
jms-cli -u "https://..." --merge ~/.config/clash-verge-rev/profiles/current.yaml
jms-cli -p 25500 -u "https://..." -i 60
```

### Local development

```bash
pnpm dev -u "https://..."                    # same as jms-cli -u ...
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
| `/health` | Health check JSON (status, nodes, updatedAt, nextRefreshMin) |
| `/refresh` | POST to trigger manual refresh (response: `{ ok, skipped, nodes }`) |

### Build and run

```bash
pnpm --filter @rinova/jms-cli start -u "https://..."
# or
node packages/cli/dist/index.js -u "https://..."
```

## SDK Usage

Use `@rinova/jms-sdk` as a library in your project:

```bash
pnpm add @rinova/jms-sdk
```

```typescript
import { convert } from '@rinova/jms-sdk';

// One-shot: fetch → parse → build Clash config
const { yaml, nodes } = await convert('https://jms-sub-url');
console.log(`Parsed ${nodes.length} nodes`);
writeFileSync('clash.yaml', yaml);
```

Offline conversion from pre-existing URI lines:

```typescript
import { convertFromLines } from '@rinova/jms-sdk';

const { config } = convertFromLines([
  'ss://YWVz...@host:8388#US-01',
  'trojan://pass@sg.example.com:443#SG-01',
], { rules: 'external' });
```

Import submodules as needed:

```typescript
import { parseURI } from '@rinova/jms-sdk/parser';
import { startServer } from '@rinova/jms-sdk/server';
```

| Import path | Available API |
|-------------|---------------|
| `@rinova/jms-sdk` | `convert()`, `convertFromLines()`, types, submodule re-exports |
| `@rinova/jms-sdk/parser` | `parseURI()`, `parseLines()` |
| `@rinova/jms-sdk/fetch` | `fetchSubscription()`, `deduplicateNames()` |
| `@rinova/jms-sdk/builder` | `buildConfig()`, `toYaml()` |
| `@rinova/jms-sdk/server` | `startServer()` |

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
Rule MATCH / Foreign domains
    ↓
🌍 Foreign Websites (default: first item)
    ↓
🚀 Node Select ← Switch nodes in Verge
    ↓
Specific JMS node
```

| Group | Purpose |
|-------|---------|
| `🚀 Node Select` | Main node selector, shown by default in Verge |
| `♻️ Auto Select` | url-test, picks lowest latency node |
| `🎯 Direct` | Direct connection or proxy |
| `🌍 Foreign Websites` | Referenced by rules, **defaults to follow `🚀 Node Select`** |
| `🇨🇳 Domestic Websites` | Domestic domain routing |
| `🛑 Ad Blocking` | Ad domain REJECT |

> **Note**: Switch nodes in `🚀 Node Select`; keep `🌍 Foreign Websites` at its default.

## Internationalization (i18n)

CLI and SDK messages automatically adapt to your system language based on the `LANG` or `LC_ALL` environment variable. If the value starts with `zh`, Chinese is used; otherwise English is the default.

```bash
# English (default on most systems)
jms-cli -u "https://..."

# Chinese
LANG=zh_CN.UTF-8 jms-cli -u "https://..."
```

The translation function `t(key, params?)` is available from the SDK:

```typescript
import { t, getLang } from '@rinova/jms-sdk';

console.log(t('refreshing'));              // "Refreshing subscription..."
console.log(t('parsed', { count: 5 }));    // "Parsed: 5 nodes"
console.log(getLang());                    // "en" or "zh"
```

Commander help text also switches language:

```bash
LANG=en_US.UTF-8 jms-cli --help   # English options
LANG=zh_CN.UTF-8 jms-cli --help   # Chinese options
```

## Testing

```bash
pnpm test               # SDK all tests (34 + 6 = 40 cases)
pnpm --filter @rinova/jms-sdk test:all
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
jms-convert-tool/
├── pnpm-workspace.yaml         workspace config
├── package.json                root: dev / build / test / typecheck shortcuts
├── CHANGELOG.md
├── README.md
├── README.zh.md
├── packages/
│   ├── sdk/                    → @rinova/jms-sdk
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
│   └── cli/                    → @rinova/jms-cli
│       ├── package.json        deps: @rinova/jms-sdk + commander
│       ├── tsconfig.json
│       └── src/index.ts        CLI entry (bin: jms-cli)
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) / [CHANGELOG.zh.md](./CHANGELOG.zh.md).

## License

MIT
