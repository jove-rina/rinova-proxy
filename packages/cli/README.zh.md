# @rinova/proxy-cli

代理订阅链接 → Clash 配置文件转换工具 — 命令行工具。

> **v2.0.0**

## 安装

```bash
pnpm add -g @rinova/proxy-cli
# 或：npm install -g @rinova/proxy-cli
```

## 使用

```bash
# 单次转换
proxy-cli -u "https://jms-subscription-url"

# 指定输出路径
proxy-cli -u "https://..." -o ~/Downloads/clash.yaml

# 规则模式
proxy-cli -u "https://..." --rules builtin   # 内置规则（默认）
proxy-cli -u "https://..." --rules external   # ACL4SSR 外部规则

# 合并到现有配置
proxy-cli -u "https://..." --merge ~/.config/clash/config.yaml

# HTTP 订阅服务（供 Verge Rev 自动刷新）
proxy-cli -p 25500 -u "https://..." -i 60
```

## 国际化

设置 `LANG` 环境变量切换语言：

```bash
LANG=zh_CN.UTF-8 proxy-cli -u "https://..."   # 中文
LANG=en_US.UTF-8 proxy-cli --help               # 英文帮助
```

## License

MIT
