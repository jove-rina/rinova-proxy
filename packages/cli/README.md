# @rinova/proxy-cli

Proxy subscription to Clash config converter — CLI tool.

> **v2.0.0**

## Install

```bash
pnpm add -g @rinova/proxy-cli
# or: npm install -g @rinova/proxy-cli
```

## Usage

```bash
# Single-shot conversion
proxy-cli -u "https://jms-subscription-url"

# Output to specific path
proxy-cli -u "https://..." -o ~/Downloads/clash.yaml

# Rule mode
proxy-cli -u "https://..." --rules builtin   # built-in rules (default)
proxy-cli -u "https://..." --rules external   # ACL4SSR RuleSet

# Merge into existing Clash config
proxy-cli -u "https://..." --merge ~/.config/clash/config.yaml

# HTTP subscription service (for Verge Rev auto-refresh)
proxy-cli -p 25500 -u "https://..." -i 60
```

## Internationalization

Set `LANG` environment variable to switch language:

```bash
LANG=zh_CN.UTF-8 proxy-cli -u "https://..."   # Chinese
LANG=en_US.UTF-8 proxy-cli --help               # English help
```

## License

MIT
