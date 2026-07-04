# Changelog

## [1.2.0] — 2026-07-04

### Added

- **Monorepo split**: SDK (`@rinova/proxy-sdk`) and CLI (`@rinova/proxy-cli`) separated as two packages under pnpm workspace.
  - SDK depends on axios + js-yaml, **no Commander**
  - CLI depends on `@rinova/proxy-sdk` + commander + js-yaml
  - Root scripts (`pnpm build` / `pnpm test` / `pnpm typecheck`) cover both packages
- **SDK (`@rinova/proxy-sdk`)**: Programmatic API for Node.js projects.
  - `convert(url)` — one-shot: fetch → parse → Clash config
  - `convertFromLines(lines)` — offline conversion (no network)
  - Submodule imports: `@rinova/proxy-sdk/parser`, `/fetch`, `/builder`, `/server`
  - Package renamed to scoped `@rinova/proxy-sdk`
- **i18n**: Zero-dependency localization module with en/zh support.
  - `t(key, params?)` — translate by `LANG`/`LC_ALL` env
  - `getLang()` — get current language code (`'en'` | `'zh'`)
  - `locales/en.json` + `locales/zh.json` covering all logs, errors, and Commander help
- **`package.json` exports**: Main entry + 4 submodules, full type declarations.
- **Empty node protection**: `convert()` / `convertFromLines()` throw `Error` on empty results.
- **`publishConfig`**: `"access": "public"` + `files` whitelist, ready for npm publish.

### Fixed

- **CLI bin renamed**: `jms-convert` → `jms-cli` (package.json bin + Commander name)
- **CLI uses `convert()`**: `runConvert` now calls SDK high-level API instead of manual fetch→parse→build pipeline
- **Server SDK-safe**: Port conflict uses `throw` instead of `process.exit(1)`; global `process.on('SIGINT')` removed, CLI handles shutdown.

### Tests

- New `src/__tests__/sdk.test.ts` (10 cases): convertFromLines, empty node throw, dedup, rule mode.
- Total tests: **40 cases** (parser 22 + builder 2 + sdk 10 + server 6).

### Docs

- README: new "SDK Usage" section with install, examples, submodule table.
- README: project structure updated with `sdk.ts` / `sdk.test.ts`.
- README: added "Internationalization (i18n)" section with `LANG` usage.
- README: installation now shows npm publish commands first.
- CHANGELOG: first recording of SDK and package rename.

### Release

- Published to npm: `@rinova/proxy-sdk@1.2.0` + `@rinova/proxy-cli@1.2.0`
- Usage: `pnpm add -g @rinova/proxy-cli` or `pnpm add @rinova/proxy-sdk`

---

## [1.2.1] — 2026-07-04

### Added

- **`getLang()`**: New SDK export, returns current language code (`'en'` | `'zh'`).
- **Server title i18n**: Startup banner uses `t('server_title')` key; zh locale now shows `"JMS 转换服务"`.
- **License**: Changed from ISC to MIT. Added `LICENSE` file to root.
- **Package READMEs**: Four new files — `packages/sdk/README(.zh).md` and `packages/cli/README(.zh).md`.

### Fixed

- **Graceful shutdown**: `srv.close(() => process.exit(0))` ensures the port is fully released before exit, preventing "port in use" on restart.
- **User-Agent**: Updated to `@rinova/proxy-sdk/1.2.1` (was `1.2.0`).
- **CLI imports**: Removed unused `fileURLToPath` and `dirname` imports.
- **README.zh.md**: Added i18n section and updated project structure tree.
- **README.md**: Structure tree root directory changed from `jms-convert-tool/` to `rinova-jms/`.

### Docs

- CHANGELOG: First recording of v1.2.1 polish release.

---

## [1.1.1] — 2026-07-04

### Fixed

- **Policy group chain**: `🌍 Foreign Websites` default changed from `♻️ Auto Select` to `🚀 Node Select`, matching ACL4SSR / jmspro.cc template.
  - **Issue**: Switching nodes in `🚀 Node Select` always showed the same IP (the url-test winner).
  - **Root cause**: Rules (including `MATCH`) pointed to `🌍 Foreign Websites`, which defaulted to `♻️ Auto Select` instead of chaining to `🚀 Node Select`.
  - **Fixed traffic path**: `Rule → 🌍 Foreign Websites → 🚀 Node Select → User selected node`.

### Tests

- New `src/__tests__/builder.test.ts` (2 cases): validates `🌍 Foreign Websites` chained reference.
- `pnpm test` now runs parser + builder tests (24 cases).

---

## [1.1.0] — 2026-07-04

- HTTP subscription service mode (`-p`): local `/clash.yaml` for Verge Rev auto-refresh.
- SS / VMess / Trojan / Hysteria2 protocol parsing.
- parser 22 cases + server 6 cases integration tests.
