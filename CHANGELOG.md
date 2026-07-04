# Changelog

## [2.0.0] — 2026-07-04

Initial release of **Rinova Proxy** — subscription link to Clash configuration converter.

### Packages

- **`@rinova/proxy-sdk@2.0.0`** — Node.js SDK
- **`@rinova/proxy-cli@2.0.0`** — CLI tool (`proxy-cli`)

### Features

- **Protocol parsing**: Shadowsocks (SIP002 + Legacy), VMess (ws / tcp / grpc / h2 / quic / kcp), Trojan, Hysteria2 (`hysteria2://` + `hy2://`)
- **SDK API**: `convert(url)`, `convertFromLines(lines)`, submodule imports (`/parser`, `/fetch`, `/builder`, `/server`)
- **CLI**: Single-shot conversion (`-u`), HTTP subscription service (`-p`), merge mode (`--merge`), builtin/external rules
- **Policy groups**: ACL4SSR-style chained routing (`🌍 国外网站` → `🚀 节点选择`)
- **HTTP service**: `/clash.yaml`, `/health` (with `lastError`), `POST /refresh`
- **i18n**: en/zh via `LANG`/`LC_ALL`; SDK exports `t()`, `getLang()`
- **Utilities**: Node name deduplication, subscription URL masking, Base64/URL decode tolerance

### Architecture

- pnpm workspace monorepo (`rinova-proxy`)
- SDK: axios + js-yaml (no Commander)
- CLI: `@rinova/proxy-sdk` + commander + js-yaml

### Tests

- **40 cases** total: parser 22 + builder 2 + sdk 10 + server 6

### Docs

- Root README (en/zh), SDK README (323-line API reference), CLI README
- MIT License

### Install

```bash
pnpm add -g @rinova/proxy-cli
pnpm add @rinova/proxy-sdk
```
