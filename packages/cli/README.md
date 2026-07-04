# @rinova/proxy-cli

Proxy subscription to Clash config converter — CLI tool.

## Install

```bash
pnpm add -g @rinova/proxy-cli
# or: npm install -g @rinova/proxy-cli
```

## Usage

```bash
# Single-shot conversion
jms-cli -u "https://jms-subscription-url"

# Output to specific path
jms-cli -u "https://..." -o ~/Downloads/clash.yaml

# Rule mode
jms-cli -u "https://..." --rules builtin   # built-in rules (default)
jms-cli -u "https://..." --rules external   # ACL4SSR RuleSet

# Merge into existing Clash config
jms-cli -u "https://..." --merge ~/.config/clash/config.yaml

# HTTP subscription service (for Verge Rev auto-refresh)
jms-cli -p 25500 -u "https://..." -i 60
```

## Internationalization

Set `LANG` environment variable to switch language:

```bash
LANG=zh_CN.UTF-8 jms-cli -u "https://..."   # Chinese
LANG=en_US.UTF-8 jms-cli --help               # English help
```

## License

MIT
