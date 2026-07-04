# Changelog

## [2.0.0] — 2026-07-04

Initial release of `@rinova/proxy-sdk`.

### Added

- **High-level API**: `convert(url, opts?)`, `convertFromLines(lines, opts?)`
- **Protocol parsing**: SS (SIP002 + Legacy), VMess, Trojan, Hysteria2
- **Submodule exports**: `@rinova/proxy-sdk/parser`, `/fetch`, `/builder`, `/server`
- **HTTP service**: `startServer()` with `/clash.yaml`, `/health`, `POST /refresh`
- **Policy groups**: ACL4SSR-style chained routing (`🌍 国外网站` → `🚀 节点选择`)
- **i18n**: `t(key, params?)`, `getLang()` with `locales/en.json` + `locales/zh.json`
- **Utilities**: `fetchSubscription()`, `deduplicateNames()`, `buildConfig()`, `toYaml()`
- **Empty node protection**: throws localized `Error` on empty results
- **Server banner**: Neon-gradient ANSI startup display with i18n title

### Architecture

- ESM, full TypeScript declarations
- Dependencies: axios + js-yaml (no Commander)
- User-Agent: `@rinova/proxy-sdk/2.0.0`

### Tests

- 34 unit tests (parser 22 + builder 2 + sdk 10) + 6 server integration tests
