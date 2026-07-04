# Changelog

## [1.2.1] — 2026-07-04

### Added

- **Package renamed**: `@rinova/proxy-cli` (was `@rinova/jms-cli`). CLI command changed from `jms-cli` to `proxy-cli`.
- **`getLang()`**: CLI now uses SDK's `getLang()` instead of duplicating language detection.
- **Graceful shutdown**: `srv.close(() => process.exit(0))` prevents "port in use" on restart.
- **Neon server banner**: Styled startup banner with gradient `RINOVA Proxy Server` title and copyable URLs.
- **License**: Changed from ISC to MIT.

### Fixed

- **CLI imports**: Removed unused `fileURLToPath`.
- **Commander version**: Synced to `1.2.1`.

### Changed

- **Commander help**: Chinese branch now correctly shows Chinese option descriptions.

---

## [1.2.0] — 2026-07-04

### Added

- **Monorepo split**: CLI separated from SDK under pnpm workspace.
- **SDK consumption**: `runConvert` now uses `convert()` high-level API from `@rinova/proxy-sdk`.
- **i18n**: All CLI messages use `t()` from SDK. Commander help supports zh/en via `LANG` env.
- **`publishConfig`**: `"access": "public"`, `files: ["dist"]`.

### Fixed

- **CLI bin renamed**: `jms-convert` → `jms-cli` (package.json bin + Commander name).

---

## [1.1.1] — 2026-07-04

### Fixed

- **Policy group chain**: `🌍 Foreign Websites` default changed from `♻️ Auto Select` to `🚀 Node Select`.

---

## [1.1.0] — 2026-07-04

### Added

- HTTP subscription service mode (`-p` flag).
- SS / VMess / Trojan / Hysteria2 protocol support.
- URL masking for subscription tokens.
- Merge mode (`--merge`) for existing Clash configs.
