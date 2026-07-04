# @rinova/proxy-sdk

JMS (Just My Sockets) subscription to Clash configuration converter — Node.js SDK.

## Install

```bash
pnpm add @rinova/proxy-sdk
```

## Quick Start

```typescript
import { convert } from '@rinova/proxy-sdk';
import { writeFileSync } from 'fs';

// One-shot: fetch subscription → parse → build Clash config → save
const { yaml, nodes } = await convert('https://jms-subscription-url');
console.log(`Parsed ${nodes.length} nodes`);
writeFileSync('clash.yaml', yaml);
```

---

## API Reference

### `convert(url, opts?)`

Fetch a Proxy subscription URL, parse all proxy nodes, and generate a complete Clash configuration.

```typescript
import { convert } from '@rinova/proxy-sdk';

// Basic usage
const result = await convert('https://jms-api.example.com/sub?token=xxx');

// With options
const result = await convert('https://...', {
  rules: 'external',     // Use ACL4SSR RuleSet (default: 'builtin')
  deduplicate: false,    // Skip node name dedup (default: true)
});

// Destructure the result
const { yaml, config, nodes } = result;

// yaml  → string — ready to write to clash.yaml
// nodes → ProxyNode[] — parsed proxy list
// config → ClashConfig — full configuration object
```

**Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `string` | (required) | Proxy subscription URL |
| `opts.rules` | `'builtin' \| 'external'` | `'builtin'` | Rule mode: built-in or ACL4SSR RuleSet |
| `opts.deduplicate` | `boolean` | `true` | Deduplicate node names (suffixes `-2`, `-3`) |

**Returns** `Promise<ConvertResult>`

| Field | Type | Description |
|-------|------|-------------|
| `yaml` | `string` | Clash config as YAML string |
| `config` | `ClashConfig` | Full configuration object (proxies, groups, rules) |
| `nodes` | `ProxyNode[]` | Parsed proxy nodes |

**Throws** `Error` if the subscription is empty or all nodes fail to parse.

---

### `convertFromLines(lines, opts?)`

Convert pre-existing URI lines to a Clash configuration **without making any network requests**.

```typescript
import { convertFromLines } from '@rinova/proxy-sdk';

const lines = [
  'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#US-01',
  'vmess://eyJ2IjoiMiIsInBzIjoiSlAtMDEiLCJhZGQiOiJqcC5leGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6InV1aWQifQ==',
  'trojan://my-password@sg.example.com:443?sni=sg.example.com#SG-01',
  'hysteria2://pass@jp.example.com:443?insecure=1&sni=jp.example.com&alpn=h3#JP-Hy2',
];

const { yaml, config, nodes } = convertFromLines(lines, {
  rules: 'external',
});
```

**Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `lines` | `string[]` | (required) | Array of proxy URI strings |
| `opts.rules` | `'builtin' \| 'external'` | `'builtin'` | Same as `convert()` |
| `opts.deduplicate` | `boolean` | `true` | Same as `convert()` |

**Returns** `ConvertResult` (same shape as `convert()`)

**Throws** `Error` if no valid nodes are found in the input lines.

---

### `parseURI(uri)`

Parse a single proxy URI string into a `ProxyNode` object.

```typescript
import { parseURI } from '@rinova/proxy-sdk/parser';

// SS
const node = parseURI('ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@host:8388#MyNode');
console.log(node);
// → { name: 'MyNode', type: 'ss', server: 'host', port: 8388, cipher: 'aes-256-gcm', password: '...' }

// VMess
const node2 = parseURI('vmess://eyJ2IjoiMiIsInBzIjoiVk0iLCJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6InV1aWQiLCJhaWQiOiIwIiwibmV0Ijoid3MiLCJ0bHMiOiJ0bHMifQ==');
console.log(node2.type);    // 'vmess'
console.log(node2.network); // 'ws'

// Trojan
const node3 = parseURI('trojan://pass@sg.example.com:443?sni=sg.example.com#SG');
console.log(node3.type);     // 'trojan'
console.log(node3.password); // 'pass'

// Hysteria2
const node4 = parseURI('hysteria2://pass@jp.example.com:443?insecure=1&alpn=h3#JP');
console.log(node4.type);     // 'hysteria2'
console.log(node4.alpn);     // ['h3']
```

**Returns** `ProxyNode`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Node name (from URI fragment or server) |
| `type` | `'ss' \| 'vmess' \| 'trojan' \| 'hysteria2'` | Protocol type |
| `server` | `string` | Server hostname or IP |
| `port` | `number` | Server port |
| `cipher` | `string` | Encryption method (SS/VMess) |
| `password` | `string` | Password (SS/Trojan/Hysteria2) |
| `uuid` | `string` | VMess UUID (VMess only) |
| `tls` | `boolean` | TLS enabled |
| `network` | `string` | Transport layer (`ws`, `grpc`, `h2`, `quic`, `kcp`) |
| `sni` | `string` | TLS SNI |
| `alpn` | `string[]` | ALPN protocols |
| `udp` | `boolean` | UDP support |

> Additional protocol-specific fields (`ws-opts`, `grpc-opts`, `skip-cert-verify`, etc.) are available as `node['field-name']`.

---

### `parseLines(lines)`

Parse an array of URI strings into `ProxyNode[]`. Invalid URIs are skipped with a warning.

```typescript
import { parseLines } from '@rinova/proxy-sdk/parser';

const nodes = parseLines([
  'ss://YWVz...@host1:8388#Node1',
  'invalid-uri-string',     // ← skipped, warning printed
  'trojan://pass@host2:443#Node2',
]);
console.log(nodes.length); // 2
```

---

### `fetchSubscription(url)`

Fetch a Proxy subscription URL and Base64-decode it into an array of URI strings.

```typescript
import { fetchSubscription } from '@rinova/proxy-sdk/fetch';

const lines = await fetchSubscription('https://jms-api.example.com/sub?token=xxx');
console.log(lines);
// → ['ss://...', 'vmess://...', 'trojan://...']
```

**Throws** `Error` if the subscription returns an empty result or is unreadable.

---

### `deduplicateNames(nodes)`

Modify node names in-place to avoid duplicates. The first occurrence keeps its original name, subsequent duplicates get `-2`, `-3` suffixes.

```typescript
import { deduplicateNames } from '@rinova/proxy-sdk/fetch';

const nodes = [
  { name: 'Japan' },
  { name: 'Japan' },
  { name: 'Japan' },
];
deduplicateNames(nodes);
console.log(nodes.map(n => n.name));
// → ['Japan', 'Japan-2', 'Japan-3']
```

---

### `buildConfig(nodes, ruleMode?)`

Build a complete Clash configuration object from parsed proxy nodes.

```typescript
import { buildConfig } from '@rinova/proxy-sdk/builder';

const config = buildConfig(parsedNodes, 'builtin');
// config.proxies        → ProxyNode[]
// config['proxy-groups'] → ProxyGroup[]
// config.rules           → string[]
```

The config includes chained policy groups:
```
🚀 Node Select → user picks node
♻️ Auto Select → url-test, lowest latency
🎯 Direct      → direct connection
🌍 Foreign     → follows 🚀 Node Select (default)
🇨🇳 Domestic    → domestic routing
🛑 Ad Blocking → REJECT
```

---

### `toYaml(config)`

Serialize a `ClashConfig` object to a YAML string.

```typescript
import { toYaml } from '@rinova/proxy-sdk/builder';

const yaml = toYaml(config);
writeFileSync('clash.yaml', yaml);
```

---

### `startServer(opts)`

Start an HTTP server that serves the latest Clash config on demand. The server automatically refreshes the subscription on a timer.

```typescript
import { startServer } from '@rinova/proxy-sdk/server';

const server = await startServer({
  url: 'https://jms-api.example.com/sub',
  port: 25500,
  intervalMin: 60,          // refresh every 60 minutes
  ruleMode: 'builtin',
});

// Endpoints:
//   GET /clash.yaml  → Clash config
//   GET /health      → JSON status
//   POST /refresh    → trigger manual refresh

// Shutdown:
server.close();
```

---

### `t(key, params?, fallback?)` / `getLang()`

i18n helper functions. See [Internationalization](#internationalization) below.

---

## Internationalization

Messages adapt to the `LANG` or `LC_ALL` environment variable. Values starting with `zh` use Chinese; everything else uses English.

```typescript
import { t, getLang } from '@rinova/proxy-sdk';

// Get current language
console.log(getLang());   // 'en' or 'zh'

// Translate a key
console.log(t('refreshing'));              // "Refreshing subscription..."
console.log(t('parsed', { count: 5 }));    // "Parsed: 5 nodes"

// Use in CLI
// LANG=zh_CN.UTF-8 node app.js   → Chinese output
// LANG=en_US.UTF-8 node app.js   → English output
```

---

## Types

```typescript
import type { ProxyNode, ProxyGroup, ClashConfig, ConvertOptions, ConvertResult } from '@rinova/proxy-sdk';
```

| Type | Description |
|------|-------------|
| `ProxyNode` | A single proxy node (name, type, server, port, + protocol fields) |
| `ProxyGroup` | A policy group (name, type, proxies, url, interval) |
| `ClashConfig` | Full Clash config (proxies, proxy-groups, rules, ports) |
| `ConvertOptions` | `{ rules, deduplicate }` |
| `ConvertResult` | `{ config, yaml, nodes }` |

---

## Supported Protocols

| Protocol | URI Prefix | Formats | Extras |
|----------|-----------|---------|--------|
| Shadowsocks | `ss://` | SIP002, Legacy, JMS extension | `cipher`, `password` |
| VMess | `vmess://` | ws, tcp, grpc, h2, quic, kcp | `uuid`, `alterId`, `tls`, `network`, `ws-opts` |
| Trojan | `trojan://` | Standard | `password`, `sni`, `skip-cert-verify` |
| Hysteria2 | `hysteria2://`, `hy2://` | Standard | `password`, `sni`, `alpn`, `up/down` bandwidth |

## License

MIT
