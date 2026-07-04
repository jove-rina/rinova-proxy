# JMS Convert Tool — SDK Design

## 1. Current State

The project already has a usable SDK foundation:

```
package.json  →  "type": "module", "main": "dist/index.js"
tsconfig.json →  declaration: true, declarationMap: true
dist/         →  .d.ts + .js for every .ts source
```

Existing exports (all usable via import):

| Function | Module | Description |
|----------|--------|-------------|
| `fetchSubscription(url)` | fetch | Fetch + Base64 decode |
| `parseURI(uri)` | parser | Single URI → ProxyNode |
| `parseLines(lines)` | parser | Batch parse |
| `deduplicateNames(nodes)` | fetch | Deduplicate node names |
| `buildConfig(nodes, mode)` | builder | Assemble Clash config |
| `toYaml(config)` | builder | Serialize to YAML |
| `startServer(opts)` | server | HTTP subscription service |

Missing: a **high-level one-shot API** and **clean SDK entry point**.

## 2. SDK Design

### 2.1 New `src/sdk.ts` — Unified Entry

```typescript
// One-shot: subscription URL → Clash config
import { convert } from '@rinova/jms-sdk';

const result = await convert('https://jms-sub-url');
// → { config: ClashConfig, yaml: string, nodes: ProxyNode[] }

// Or from existing URI lines (no network)
const result2 = convertFromLines([
  'ss://...',
  'vmess://...',
]);
```

### 2.2 API

```typescript
// src/sdk.ts

export interface ConvertOptions {
  /** Rule mode: built-in or external ACL4SSR */
  rules?: 'builtin' | 'external';
  /** Deduplicate node names (default: true) */
  deduplicate?: boolean;
}

export interface ConvertResult {
  config: ClashConfig;
  yaml: string;
  nodes: ProxyNode[];
}

/** Fetch subscription URL and convert to Clash config */
export async function convert(
  url: string,
  options?: ConvertOptions,
): Promise<ConvertResult>;

/** Convert from pre-parsed URI lines (no network request) */
export function convertFromLines(
  lines: string[],
  options?: ConvertOptions,
): ConvertResult;
```

### 2.3 Usage Examples

```typescript
import { convert, convertFromLines, parseURI } from '@rinova/jms-sdk';

// One-shot: fetch → parse → build
const { yaml, nodes } = await convert('https://jms-sub-url');
console.log(`Parsed ${nodes.length} nodes`);
writeFileSync('clash.yaml', yaml);

// Parse only, no config generation
const node = parseURI('ss://YWVz...@host:443#node');

// With custom rules
const { config } = await convert(url, { rules: 'external' });
```

### 2.4 Package Entry Points

```json
{
  "exports": {
    ".": {
      "import": "./dist/sdk.js",
      "types": "./dist/sdk.d.ts"
    },
    "./parser": {
      "import": "./dist/parser.js",
      "types": "./dist/parser.d.ts"
    },
    "./fetch": {
      "import": "./dist/fetch.js",
      "types": "./dist/fetch.d.ts"
    },
    "./server": {
      "import": "./dist/server.js",
      "types": "./dist/server.d.ts"
    }
  }
}
```

Users can `import { convert } from '@rinova/jms-sdk'` or import submodules directly.

### 2.5 Error Handling

```typescript
import { convert } from '@rinova/jms-sdk';

try {
  const result = await convert('https://invalid-url');
} catch (err) {
  // Network error, parse error, or config build error
  console.error('Conversion failed:', err.message);
}
```

All errors propagate naturally — no `process.exit()` in SDK code.

## 3. Implementation Scope

| File | Change | Lines |
|------|--------|-------|
| `src/sdk.ts` | **New** | ~40 |
| `package.json` | Add `exports` field | ~15 |
| `src/index.ts` | No change | — |
| `src/server.ts` | Already SDK-safe (throws, no process.exit) | — |
| Tests | New `__tests__/sdk.test.ts` | ~30 |

**~70 new lines total, zero new dependencies.**

## 4. Design Decisions

| Question | Decision | Reason |
|----------|----------|--------|
| `convert()` includes network? | Yes (calls `fetchSubscription`) | One-shot is the most common use case |
| Export granularity | Main entry + submodules | Main for most users, submodules for power users |
| Class or functions? | Pure functions | Stateless, tree-shakable, simpler |
| Depends on CLI code? | No | SDK users don't need Commander |

## 5. Future

- **NPM publish**: `pnpm publish --access public` under `@rinova/jms-sdk`
- **Browser support**: Replace axios with native fetch for Edge Workers
- **Streaming parse**: Chunk large subscriptions (currently fine for typical sizes)
