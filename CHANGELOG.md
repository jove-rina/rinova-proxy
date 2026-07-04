# Changelog

## [1.2.0] — 2026-07-04

### Added

- **Monorepo split**: SDK (`@rinova/jms-sdk`) and CLI (`@rinova/jms-cli`) separated as two packages under pnpm workspace.
  - SDK depends on axios + js-yaml, **no Commander**
  - CLI depends on `@rinova/jms-sdk` + commander + js-yaml
  - Root scripts (`pnpm build` / `pnpm test` / `pnpm typecheck`) cover both packages
- **SDK (`@rinova/jms-sdk`)**: Programmatic API for Node.js projects.
  - `convert(url)` — one-shot: fetch → parse → Clash config
  - `convertFromLines(lines)` — offline conversion (no network)
  - Submodule imports: `@rinova/jms-sdk/parser`, `/fetch`, `/builder`, `/server`
  - Package renamed to scoped `@rinova/jms-sdk`
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

- Published to npm: `@rinova/jms-sdk@1.2.0` + `@rinova/jms-cli@1.2.0`
- Usage: `pnpm add -g @rinova/jms-cli` or `pnpm add @rinova/jms-sdk`

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
