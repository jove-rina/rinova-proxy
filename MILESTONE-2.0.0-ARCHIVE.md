# Rinova Proxy — Milestone Archive (v2.0.0)

> **Archived**: 2026-07-04  
> **Milestone**: `@rinova/proxy-sdk@2.0.0` · `@rinova/proxy-cli@2.0.0`  
> **Purpose**: Proxy subscription link → Clash configuration converter (CLI + SDK)  
> **License**: MIT  
> **Verified**: typecheck ✅ · build ✅ · test **40/40** ✅

> 🇨🇳 [中文版](./MILESTONE-2.0.0-ARCHIVE.zh.md)

This document consolidates the former `JMS-CONVERT-PLAN`, `JMS-CONVERT-SERVE-PLAN`, `JMS-CONVERT-SDK-PLAN`, `JMS-CONVERT-CLI-PLAN`, `JMS-I18N-PLAN`, and `JMS-CONVERT-REVIEW` into a complete archive for the **2.0.0 initial release milestone**.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Evolution Timeline](#2-project-evolution-timeline)
3. [Final Architecture](#3-final-architecture)
4. [Core Conversion (CONVERT)](#4-core-conversion-convert)
5. [HTTP Subscription Service (SERVE)](#5-http-subscription-service-serve)
6. [SDK Design (SDK)](#6-sdk-design-sdk)
7. [CLI & Monorepo Split (CLI)](#7-cli--monorepo-split-cli)
8. [Internationalization (I18N)](#8-internationalization-i18n)
9. [Policy Groups & Routing](#9-policy-groups--routing)
10. [Plan vs Implementation](#10-plan-vs-implementation)
11. [Quality Review Conclusion](#11-quality-review-conclusion)
12. [Test Coverage](#12-test-coverage)
13. [Security](#13-security)
14. [Documentation & Release](#14-documentation--release)
15. [Future Extensions](#15-future-extensions)
16. [Appendix: Source Structure](#appendix-source-structure)

---

## 1. Executive Summary

### 1.1 One-liner

**Rinova Proxy 2.0.0** is a zero-framework, minimal-dependency Node.js tool that fetches Base64-encoded proxy subscriptions, parses SS / VMess / Trojan / Hysteria2 nodes, and generates Clash configs with ACL4SSR-style chained policy groups. It ships as a CLI (`proxy-cli`) and a programmable SDK (`@rinova/proxy-sdk`), plus an HTTP local subscription service for Clash Verge Rev auto-refresh.

### 1.2 Milestone Deliverables

| Deliverable | Package / Command | Version |
|-------------|-------------------|---------|
| Node.js SDK | `@rinova/proxy-sdk` | 2.0.0 |
| CLI tool | `@rinova/proxy-cli` / `proxy-cli` | 2.0.0 |
| Monorepo root | `rinova-proxy` (private) | — |

### 1.3 Plan Completion

| Original Plan | Topic | Status |
|---------------|-------|--------|
| JMS-CONVERT-PLAN | MVP conversion: fetch → parse → build | ✅ 100% (+ Hysteria2) |
| JMS-CONVERT-SERVE-PLAN | HTTP local subscription service | ✅ 100% |
| JMS-CONVERT-SDK-PLAN | Programmatic SDK API | ✅ 100% |
| JMS-CONVERT-CLI-PLAN | pnpm workspace dual-package split | ✅ 100% |
| JMS-I18N-PLAN | en/zh internationalization | ✅ ~98% (no i18n unit tests) |
| JMS-CONVERT-REVIEW | Full review | ✅ Passed |

---

## 2. Project Evolution Timeline

```
Phase 0 — Feasibility (JMS-CONVERT-PLAN)
  └─ axios + js-yaml + commander; pure-function SS/VMess/Trojan parsing

Phase 1 — MVP CLI
  └─ Single-shot -u, builtin/external rules, Clash YAML output

Phase 2 — HTTP subscription service (JMS-CONVERT-SERVE-PLAN)
  └─ -p serve mode, /clash.yaml /health /refresh, Verge Rev remote subscription

Phase 3 — Policy group chain fix
  └─ 🌍 国外网站 defaults to 🚀 节点选择 (ACL4SSR template alignment)

Phase 4 — SDK extraction (JMS-CONVERT-SDK-PLAN)
  └─ convert() / convertFromLines(), submodule exports

Phase 5 — Monorepo split (JMS-CONVERT-CLI-PLAN)
  └─ @rinova/proxy-sdk + @rinova/proxy-cli; SDK without Commander

Phase 6 — i18n (JMS-I18N-PLAN)
  └─ t() / getLang(), locales/en.json + zh.json, bilingual Commander help

Phase 7 — Generic naming + documentation
  └─ jms-* → proxy-*, neon server banner, 323-line SDK API docs

Phase 8 — 2.0.0 initial release milestone ← current
  └─ Version unified at 2.0.0, CHANGELOG reset, full review passed
```

### Naming Evolution

| Phase | SDK package | CLI package | CLI command |
|-------|-------------|-------------|-------------|
| Early | `jms-convert-tool` | same package bin | `jms-convert` |
| Mid | `@rinova/jms-sdk` | `@rinova/jms-cli` | `jms-cli` |
| **2.0.0** | `@rinova/proxy-sdk` | `@rinova/proxy-cli` | `proxy-cli` |

---

## 3. Final Architecture

### 3.1 End-to-End Data Flow

```
Proxy subscription URL
      ↓  HTTP GET (axios, User-Agent: @rinova/proxy-sdk/2.0.0)
Base64-encoded text (possibly URL-encoded)
      ↓  padBase64 + Buffer.from + decodeURIComponent tolerance
Multi-line proxy URIs (one node per line)
      ↓  parseURI / parseLines (invalid lines warn + skip)
ProxyNode[] structured objects
      ↓  deduplicateNames (append -2, -3 for duplicates)
      ↓  buildConfig (policy groups + rules)
ClashConfig object
      ↓  toYaml (js-yaml)
clash.yaml string
      ↓
  ┌─ CLI: write file / merge into existing config
  └─ Server: in-memory cache → GET /clash.yaml
```

### 3.2 Monorepo Layout

```
rinova-proxy/                         private · MIT · LICENSE
├── pnpm-workspace.yaml
├── package.json                      dev / build / test / typecheck / publish:*
├── README.md · README.zh.md
├── CHANGELOG.md · CHANGELOG.zh.md
├── MILESTONE-2.0.0-ARCHIVE.md        ← this document (English)
├── MILESTONE-2.0.0-ARCHIVE.zh.md     ← Chinese version
└── packages/
    ├── sdk/  → @rinova/proxy-sdk@2.0.0
    │   ├── package.json              axios + js-yaml (no Commander)
    │   ├── README.md · README.zh.md  323-line API reference
    │   └── src/
    │       ├── index.ts              convert / convertFromLines + re-exports
    │       ├── parser.ts             SS / VMess / Trojan / Hysteria2
    │       ├── fetch.ts              fetch + Base64 + dedup
    │       ├── builder.ts            Clash config assembly
    │       ├── server.ts             HTTP subscription service
    │       ├── i18n.ts               t() / getLang()
    │       ├── locales/en.json · zh.json
    │       ├── utils.ts · types.ts
    │       └── __tests__/            40 test cases
    └── cli/  → @rinova/proxy-cli@2.0.0
        ├── package.json              @rinova/proxy-sdk + commander + js-yaml
        ├── README.md · README.zh.md
        └── src/index.ts              bin: proxy-cli (118 lines)
```

### 3.3 Dependency Isolation

| Package | Runtime deps | Commander |
|---------|--------------|-----------|
| `@rinova/proxy-sdk` | axios, js-yaml | ❌ |
| `@rinova/proxy-cli` | `@rinova/proxy-sdk`, commander, js-yaml | ✅ |

---

## 4. Core Conversion (CONVERT)

> Source: `JMS-CONVERT-PLAN.md`

### 4.1 Supported Protocols

| Protocol | URI prefix | Format | Clash type | 2.0.0 |
|----------|------------|--------|------------|-------|
| Shadowsocks | `ss://` | SIP002, Legacy, JMS extension (b64 with @) | `ss` | ✅ |
| VMess | `vmess://` | Base64 JSON | `vmess` | ✅ |
| Trojan | `trojan://` | URL format | `trojan` | ✅ |
| Hysteria2 | `hysteria2://` / `hy2://` | URL + alpn/bandwidth | `hysteria2` | ✅ (post-plan) |

#### SS parsing notes

- SIP002: `ss://base64(method:password)@host:port#name`
- Legacy: `ss://base64(method:password@host:port)#name`
- Passwords with colons (AEAD 2022): `split(':')` keeps remainder
- No name → fallback to `server`

#### VMess parsing notes

- Transports: `ws` / `tcp` / `grpc` / `h2` / `quic` / `kcp`
- TLS: `tls` / `none`; supports `sni`, `alpn`, `client-fingerprint`, `skip-cert-verify`
- Field aliases: `ps`/`remarks`, `add`/`host`

#### Trojan / Hysteria2 notes

- Native `URL` parsing
- Supports `allowInsecure` / `insecure` / `skip-cert-verify`
- Hysteria2 supports `up`/`down` bandwidth params

### 4.2 fetch module

```typescript
fetchSubscription(url: string): Promise<string[]>
```

- axios GET, 15s timeout, `responseType: 'text'`
- Auto `decodeURIComponent` for URL-encoded responses
- Base64 decode failure falls back to plain text
- Split by line, filter empty lines and `#` comments
- Empty result throws localized Error

### 4.3 Node deduplication

```typescript
deduplicateNames(nodes: { name: string }[]): void  // in-place
```

- First occurrence keeps original name; duplicates get `-2`, `-3`
- Strips existing `-N` suffix before counting

### 4.4 Rule modes

| Mode | Description |
|------|-------------|
| `builtin` (default) | Built-in domain rules (Google, GitHub, OpenAI, domestic CDN, etc.) |
| `external` | ACL4SSR RuleSet remote URLs (BanEasyAD, ProxyMedia, ChinaDomain) |

### 4.5 Edge cases & tolerance (Plan → 2.0.0)

| Issue | Handling | Status |
|-------|----------|--------|
| Subscription 4xx / network error | axios exception propagates | ✅ |
| Base64 padding | `padBase64()` adds `=` | ✅ |
| Missing VMess JSON fields | Defaults + optional chaining | ✅ |
| Unparseable URI | warn + skip, no abort | ✅ |
| Empty subscription | throw localized Error | ✅ |
| Duplicate node names | deduplicateNames | ✅ |
| URL-encoded Chinese names | `safeDecodeURI` / decodeURIComponent | ✅ |

---

## 5. HTTP Subscription Service (SERVE)

> Source: `JMS-CONVERT-SERVE-PLAN.md`

### 5.1 Purpose

Run a local HTTP server; configure Clash Verge Rev as a "remote subscription" source that periodically fetches `/clash.yaml` for automatic node updates. **No external relay required.**

### 5.2 Architecture

```
proxy-cli -p 25500 -u "subscription-url" -i 60
      │
      ├─ Timer (intervalMin minutes)
      │    └─ fetch → parse → dedup → build → in-memory cache
      │
      └─ HTTP Server (127.0.0.1:25500)
           ├─ GET  /clash.yaml  → cached YAML
           ├─ GET  /health      → JSON status
           └─ POST /refresh     → manual refresh
```

Verge Rev configuration:

```
URL: http://127.0.0.1:25500/clash.yaml
Update interval: 60
```

### 5.3 HTTP endpoints

| Path | Method | Content-Type | Response |
|------|--------|--------------|----------|
| `/clash.yaml` | GET | `text/yaml` | Latest YAML; 503 if no cache |
| `/health` | GET | `application/json` | `{ status, nodes, updatedAt, nextRefreshMin, lastError }` |
| `/refresh` | POST | `application/json` | `{ ok, skipped, nodes }`; GET returns 405 |
| Other | * | — | 404 |

### 5.4 Edge cases

| Scenario | Handling |
|----------|----------|
| Initial fetch fails | No HTTP start; throw and exit |
| Refresh fails at runtime | Keep last cache; record `lastError`; warn log |
| Concurrent refresh | `refreshing` flag; return `{ skipped: true }` |
| Port in use | `EADDRINUSE` → throw localized Error |
| Client polling | Return in-memory cache; zero IO |

### 5.5 Beyond the Plan

- Bind to `127.0.0.1` (not `0.0.0.0`)
- Neon-gradient ANSI startup banner + i18n title
- CLI graceful shutdown on `SIGINT`/`SIGTERM` (`srv.close()`)
- No `process.exit()` in SDK

---

## 6. SDK Design (SDK)

> Source: `JMS-CONVERT-SDK-PLAN.md`

### 6.1 Design principles

| Decision | Choice | Reason |
|----------|--------|--------|
| API style | Pure functions | Stateless, tree-shakeable |
| `convert()` includes network | Yes | Most common one-shot use case |
| Export granularity | Main entry + 4 submodules | Casual vs power users |
| CLI dependency | No | SDK users don't need Commander |
| Error handling | throw Error, no process.exit | Library-safe |

### 6.2 High-level API

```typescript
import { convert, convertFromLines } from '@rinova/proxy-sdk';

// Online: fetch → parse → build → YAML
const { yaml, config, nodes } = await convert('https://sub-url', {
  rules: 'builtin',      // 'builtin' | 'external'
  deduplicate: true,     // default true
});

// Offline: from URI lines, no network
const result = convertFromLines(['ss://...', 'trojan://...'], {
  rules: 'external',
});
```

### 6.3 Submodule exports

| Import path | Exports |
|-------------|---------|
| `@rinova/proxy-sdk` | `convert`, `convertFromLines`, `parseURI`, `parseLines`, `buildConfig`, `toYaml`, `fetchSubscription`, `deduplicateNames`, `startServer`, `t`, `getLang`, types |
| `@rinova/proxy-sdk/parser` | `parseURI`, `parseLines` |
| `@rinova/proxy-sdk/fetch` | `fetchSubscription`, `deduplicateNames` |
| `@rinova/proxy-sdk/builder` | `buildConfig`, `toYaml` |
| `@rinova/proxy-sdk/server` | `startServer` |

### 6.4 Types

```typescript
ProxyNode      // name, type, server, port + protocol-specific fields
ProxyGroup     // name, type, proxies, url?, interval?
ClashConfig    // port, proxies, proxy-groups, rules, ...
ConvertOptions // { rules?, deduplicate? }
ConvertResult  // { config, yaml, nodes }
```

### 6.5 startServer API

```typescript
const server = await startServer({
  url: 'https://sub-url',
  port: 25500,
  intervalMin: 60,
  ruleMode: 'builtin',
});
server.close();
```

---

## 7. CLI & Monorepo Split (CLI)

> Source: `JMS-CONVERT-CLI-PLAN.md`

### 7.1 Motivation

When CLI and SDK lived in one package, SDK users were forced to install Commander; versions were coupled; install size grew.

### 7.2 Option comparison

| Option | Description | Outcome |
|--------|-------------|---------|
| A Single-repo dual-package | pnpm workspace | ✅ **Chosen** |
| B No split | Same package + bin | ❌ SDK still pulls Commander |
| C Separate repos | Two git repositories | ❌ Higher maintenance cost |

### 7.3 CLI command reference

```bash
# Single-shot conversion
proxy-cli -u "https://sub-url"
proxy-cli -u "https://..." -o ~/Downloads/clash.yaml
proxy-cli -u "https://..." --rules external
proxy-cli -u "https://..." --merge ~/.config/clash/config.yaml

# HTTP subscription service
proxy-cli -p 25500 -u "https://..." -i 60

# Local development
pnpm dev -u "https://..."
pnpm dev -p 25500 -u "https://..." -i 60
```

### 7.4 CLI implementation notes

- `runConvert` calls SDK `convert()` — no manual fetch→parse→build pipeline
- `--merge`: read existing YAML, replace `proxies`, fix stale proxy-group references
- `maskUrl()`: mask query tokens in logs
- Commander version synced with package.json: **2.0.0**

### 7.5 Root scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | CLI dev mode (tsx) |
| `pnpm build` | Compile SDK + CLI |
| `pnpm test` | All 40 SDK test cases |
| `pnpm typecheck` | TypeScript check both packages |
| `pnpm publish:sdk` / `publish:cli` | npm publish per package |
| `pnpm publish:all-dry-run` | Pre-release dry-run |

---

## 8. Internationalization (I18N)

> Source: `JMS-I18N-PLAN.md`

### 8.1 Approach

Zero-dependency i18n: `locales/en.json` + `locales/zh.json` + `t()` function.

### 8.2 Language detection

```typescript
// LANG or LC_ALL starting with 'zh' → Chinese; otherwise English
getLang(): 'en' | 'zh'
t(key: string, params?: Record<string, string | number>, fallback?: string): string
```

### 8.3 Coverage

| Area | Content |
|------|---------|
| CLI logs | fetching, parsed, config_written, merged, shutting_down, etc. |
| Server logs | refreshing, refresh_ok, refresh_skip, refresh_fail, port_in_use |
| Parser warn | skip_node |
| Error messages | err_* series (empty sub, unsupported protocol, SS/VMess format errors) |
| Commander help | en/zh option descriptions |
| Server banner | server_title, server_banner_clash, server_banner_health |

### 8.4 Examples

```bash
LANG=zh_CN.UTF-8 proxy-cli -u "https://..."
LANG=en_US.UTF-8 proxy-cli --help
```

```typescript
import { t, getLang } from '@rinova/proxy-sdk';
console.log(getLang());              // 'en' | 'zh'
console.log(t('parsed', { count: 5 }));
```

### 8.5 Known gaps (P4)

- No i18n unit tests
- No automated locale key ↔ TS reference validation

---

## 9. Policy Groups & Routing

### 9.1 Chained reference (core design)

Ensures Verge's main "node selector" controls actual traffic:

```
Rule MATCH / foreign domains
    ↓
🌍 国外网站 (default first item = 🚀 节点选择)
    ↓
🚀 节点选择 ← user switches nodes in Verge
    ↓
Specific proxy node
```

> **Historical issue**: If `🌍 国外网站` defaulted to `♻️ 自动选择`, switching `🚀 节点选择` in Verge did not change IP (always the url-test winner). Fixed in 2.0.0 per ACL4SSR / jmspro.cc template.

> **Note**: Policy group names use Chinese emoji labels (ACL4SSR-style) in generated configs.

### 9.2 Policy group list

| Group | Type | Purpose |
|-------|------|---------|
| 🚀 节点选择 | select | Main node selector, Verge default |
| ♻️ 自动选择 | url-test | Latency test (gstatic 204) |
| 🎯 直连 | select | Direct or proxied |
| 🌍 国外网站 | select | Rule target; **defaults to 🚀 节点选择** |
| 🇨🇳 国内网站 | select | Domestic routing |
| 🛑 广告拦截 | select | REJECT |

### 9.3 Default Clash ports

| Setting | Value |
|---------|-------|
| HTTP proxy | 7890 |
| SOCKS | 7891 |
| external-controller | 127.0.0.1:9090 |
| allow-lan | true |
| mode | Rule |

---

## 10. Plan vs Implementation

| Plan design | 2.0.0 implementation | Notes |
|-------------|------------------------|-------|
| Project name `jms-convert-tool` | `rinova-proxy` | Repo renamed |
| Package `@rinova/jms-*` | `@rinova/proxy-*` | Generic naming |
| CLI command `jms-convert` | `proxy-cli` | Final command |
| `serve` subcommand | `-p` flag | Avoid Commander subcommand option conflicts |
| 3 protocols (SS/VMess/Trojan) | + Hysteria2 | Feature extension |
| Separate `src/sdk.ts` | Merged into `index.ts` | Simpler structure, same functionality |
| Plan ~150–200 lines | ~765 lines TS (~1200+ with tests) | i18n, server, Hy2, tests included |
| Server hardcoded Chinese | Full i18n | I18N-PLAN delivered |
| No SDK exports field | 5 export paths + .d.ts | Full type declarations |
| allow-lan: false (Plan) | allow-lan: true | Actual config adjustment |

---

## 11. Quality Review Conclusion

> Source: `JMS-CONVERT-REVIEW.md` (multi-round review, 2.0.0 final state)

### 11.1 Review dimensions

| Dimension | 2.0.0 status |
|-----------|--------------|
| Feature completeness | ✅ 4 protocols + CLI + SDK + HTTP service + merge + i18n |
| Architecture | ✅ monorepo dual-package, dependency isolation |
| Code quality | ✅ pure functions, no SDK process.exit, localized errors |
| Tests | ✅ 40/40 |
| Documentation | ✅ root README + SDK 323-line API + CLI README + CHANGELOG |
| Security | ✅ 127.0.0.1 bind, URL masking, MIT |
| npm readiness | ✅ publishConfig + files whitelist |

### 11.2 Final rating

**Passed — 2.0.0 initial release meets feature, test, and documentation standards. Ready for npm publish.**

### 11.3 Non-blocking improvements (P4)

1. CLI integration tests
2. i18n / locale key completeness unit tests
3. `convert()` network path mock tests
4. Single source of truth for version (package.json → CLI / User-Agent)
5. Export `/health` response type to SDK types

---

## 12. Test Coverage

```
pnpm test  → 40/40 ✅
```

| Suite | File | Cases | Focus |
|-------|------|-------|-------|
| parser | `parser.test.ts` | 22 | SS SIP002/Legacy, VMess transports, Trojan, Hy2, dedup, parseLines |
| builder | `builder.test.ts` | 2 | 🌍→🚀 chain, node select includes all nodes |
| sdk | `sdk.test.ts` | 10 | convertFromLines, dedup toggle, rules mode, empty throw, re-exports |
| server | `server.test.ts` | 6 | /health, /clash.yaml, query params, POST /refresh, 405, 404 |

---

## 13. Security

| Item | Status | Notes |
|------|--------|-------|
| HTTP bind | ✅ | 127.0.0.1 only |
| Subscription token leak | ✅ | CLI maskUrl in logs |
| SDK process control | ✅ | No process.exit |
| allow-lan: true | ⚠️ | Clash default; LAN accessible |
| Generated yaml gitignore | ✅ | `*.yaml` ignored |
| Dependencies | ✅ | axios, js-yaml, commander (CLI only) |

---

## 14. Documentation & Release

### 14.1 Document index

| Document | Path | Description |
|----------|------|-------------|
| Project README | `README.md` / `README.zh.md` | Install, CLI, SDK, policy groups, i18n, tests |
| SDK API | `packages/sdk/README.md` | 323-line API reference |
| CLI usage | `packages/cli/README.md` | Command examples |
| Changelog | `CHANGELOG.md` × 6 files | [2.0.0] initial release only |
| **Milestone archive** | `MILESTONE-2.0.0-ARCHIVE.md` / `.zh.md` | This document |

### 14.2 Install

```bash
# CLI global
pnpm add -g @rinova/proxy-cli
npm install -g @rinova/proxy-cli

# SDK project dependency
pnpm add @rinova/proxy-sdk
```

### 14.3 Release process

```bash
pnpm install
pnpm build && pnpm test && pnpm typecheck
pnpm publish:all-dry-run
pnpm publish:sdk && pnpm publish:cli   # @rinova/proxy-*@2.0.0
```

---

## 15. Future Extensions

> Source: JMS-CONVERT-PLAN §8 + SDK-PLAN Future

| Direction | Description | Priority |
|-----------|-------------|----------|
| Multi-subscription merge | Combine multiple URLs | P3 |
| Custom rule templates | User rules.yaml template, replace proxies only | P3 |
| Hermes plugin | Wrap as Hermes skill | P4 |
| Browser / Edge Workers | axios → native fetch | P4 |
| Streaming parse | Chunk large subscriptions | P4 |
| CLI integration tests | mock convert / startServer | P4 |
| Version auto-sync | Single package.json source | P4 |

---

## Appendix: Source Structure

### SDK modules (~647 lines TS)

| File | Lines | Responsibility |
|------|-------|----------------|
| `parser.ts` | 194 | SS / VMess / Trojan / Hysteria2 URI parsing |
| `server.ts` | 126 | HTTP service, timed refresh, cache, neon banner |
| `index.ts` | 84 | convert / convertFromLines + re-exports |
| `builder.ts` | 75 | Clash config assembly, rule sets |
| `fetch.ts` | 63 | Subscription fetch, Base64, dedup |
| `i18n.ts` | 48 | Language detection, t() |
| `types.ts` | 40 | TypeScript types |
| `utils.ts` | 17 | padBase64, safeDecodeURI |

### CLI (118 lines)

- Commander argument parsing (bilingual help)
- `runConvert`: convert + write file / merge
- Serve mode: startServer + graceful shutdown

---

## Archive Notes

This document replaces the following original files (content consolidated; originals deleted):

- `JMS-CONVERT-PLAN.md` — MVP conversion plan
- `JMS-CONVERT-SERVE-PLAN.md` — HTTP subscription service plan
- `JMS-CONVERT-SDK-PLAN.md` — SDK design plan
- `JMS-CONVERT-CLI-PLAN.md` — Monorepo split plan
- `JMS-I18N-PLAN.md` — Internationalization plan
- `JMS-CONVERT-REVIEW.md` — Full review report

**Milestone**: Rinova Proxy **v2.0.0** — initial release, 2026-07-04.

---

*Archive generated from rinova-proxy monorepo, based on 40/40 tests passing and dual-package typecheck/build verification.*
