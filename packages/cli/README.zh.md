# @rinova/jms-cli

JMS 订阅链接 → Clash 配置文件转换工具 — 命令行工具。

## 安装

```bash
pnpm add -g @rinova/jms-cli
# 或：npm install -g @rinova/jms-cli
```

## 使用

```bash
# 单次转换
jms-cli -u "https://jms-subscription-url"

# 指定输出路径
jms-cli -u "https://..." -o ~/Downloads/clash.yaml

# 规则模式
jms-cli -u "https://..." --rules builtin   # 内置规则（默认）
jms-cli -u "https://..." --rules external   # ACL4SSR 外部规则

# 合并到现有配置
jms-cli -u "https://..." --merge ~/.config/clash/config.yaml

# HTTP 订阅服务（供 Verge Rev 自动刷新）
jms-cli -p 25500 -u "https://..." -i 60
```

## 国际化

设置 `LANG` 环境变量切换语言：

```bash
LANG=zh_CN.UTF-8 jms-cli -u "https://..."   # 中文
LANG=en_US.UTF-8 jms-cli --help               # 英文帮助
```

## License

MIT
