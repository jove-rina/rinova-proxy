# Changelog

## [1.2.1] — 2026-07-04

### Added

- **Package renamed**: `@rinova/proxy-sdk` (was `@rinova/jms-sdk`).
- **`getLang()`**: New export, returns current language code (`'en'` | `'zh'`).
- **Server banner i18n**: Startup banner uses `t('server_title')`. Stylish neon-gradient ANSI display with `RINOVA` gradient and URL highlights.
- **License**: Changed from ISC to MIT.

### Fixed

- **Graceful shutdown**: `srv.close(() => process.exit(0))` ensures port is released before exit, preventing "port in use" on restart.
- **User-Agent**: Updated to `@rinova/proxy-sdk/1.2.1`.
- **`server_title` locale**: zh.json now shows `"Rinova JMS Server"`.

---

## [1.2.0] — 2026-07-04

### Added

- **Monorepo split**: SDK separated from CLI under pnpm workspace.
- **Programmatic API**: `convert(url, opts?)`, `convertFromLines(lines, opts?)`.
- **i18n**: Zero-dependency localization with `t(key, params?)` and `getLang()`. `locales/en.json` + `locales/zh.json` covering all SDK messages and errors.
- **`publishConfig`**: `"access": "public"`, `files: ["dist"]`.
- **Package exports**: `@rinova/proxy-sdk`, `./parser`, `./fetch`, `./builder`, `./server`.

### Fixed

- **Server SDK-safe**: Port conflict throws instead of `process.exit(1)`. Removed global `process.on('SIGINT')`.
- **Empty node protection**: `convert()` / `convertFromLines()` throw `Error` on empty results.

### Changed

- Package name: `jms-convert-tool` → `@rinova/proxy-sdk`.
- License: ISC → MIT (1.2.1).

---

## [1.1.1] — 2026-07-04

### Fixed

- **Policy group chain**: `🌍 Foreign Websites` default changed from `♻️ Auto Select` to `🚀 Node Select`, matching ACL4SSR template.

---

## [1.1.0] — 2026-07-04

### Added

- HTTP subscription service: `startServer()`.
- SS / VMess / Trojan / Hysteria2 protocol parsing.
- Parser 22 cases + server 6 cases integration tests.
