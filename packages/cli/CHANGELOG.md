# Changelog

## [2.0.0] — 2026-07-04

Initial release of `@rinova/proxy-cli`.

### Added

- **CLI command**: `proxy-cli` (global install via `pnpm add -g @rinova/proxy-cli`)
- **Single-shot conversion**: `-u` fetch and convert, `-o` output path
- **HTTP subscription service**: `-p` port, `-i` refresh interval (minutes)
- **Merge mode**: `--merge <file>` into existing Clash config
- **Rule modes**: `--rules builtin | external`
- **i18n**: All messages via SDK `t()`; Commander help in en/zh via `LANG`
- **URL masking**: Subscription tokens masked in logs
- **Graceful shutdown**: `srv.close()` on SIGINT/SIGTERM

### Architecture

- Depends on `@rinova/proxy-sdk@2.0.0` + commander + js-yaml
- Commander version: 2.0.0
