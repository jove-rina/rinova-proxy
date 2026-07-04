# JMS 订阅转 Clash — 可行性方案

## 一、架构概览

```
JMS 订阅 URL
      ↓ HTTP GET (axios)
Base64 编码的文本
      ↓ Buffer.from(..., 'base64').toString()
多行代理 URI（每行一个节点）
      ↓ 按格式分类解析
{ SS, VMess, Trojan } 结构化对象数组
      ↓ 组装 Clash YAML
proxies + proxy-groups + rules
      ↓ js-yaml 输出
clash-config.yaml
```

## 二、输入格式分析

JMS 订阅解码后，每行是一个 URI，三种类型：

### SS (Shadowsocks)
```
ss://base64(method:password)@host:port#Remark
ss://base64(method:password@host:port)#Remark  // 旧格式
```
→ Clash: `type: ss`

### VMess (V2Ray)
```
vmess://base64({
  "v": "2",
  "ps": "日本-01",
  "add": "jp1.example.com",
  "port": "443",
  "id": "uuid",
  "aid": "0",
  "net": "ws",
  "type": "none",
  "host": "example.com",
  "path": "/ws",
  "tls": "tls"
})
```
→ Clash: `type: vmess` + `ws-opts` / `tls`

### Trojan
```
trojan://password@host:port?security=tls&sni=example.com#Remark
```
→ Clash: `type: trojan`

## 三、Node.js 依赖

最小依赖（3 个）：

| 包 | 用途 |
|---|---|
| `axios` | HTTP 请求拉取订阅 |
| `js-yaml` | 输出 Clash YAML 配置文件 |
| `commander` | CLI 参数解析（可选，先硬编码） |

零框架，纯逻辑脚本。

## 四、项目文件结构

```
jms-convert-tool/
├── package.json
├── src/
│   ├── index.js          ← 入口：CLI + 主流程编排
│   ├── fetch.js          ← 拉取订阅 + Base64 解码
│   ├── parser.js         ← URI 解析（SS / VMess / Trojan）
│   ├── builder.js        ← 组装 Clash YAML 结构
│   └── utils.js          ← 通用工具（Base64 补齐等）
├── output/
│   └── clash-config.yaml ← 生成的配置文件
└── JMS-CONVERT-PLAN.md
```

## 五、核心模块设计

### 5.1 fetch.js — 拉取和解码

```js
async function fetchSubscription(url) {
  const { data } = await axios.get(url);
  // JMS 订阅是 Base64 编码的纯文本
  const decoded = Buffer.from(data, 'base64').toString('utf-8');
  // 按行分割，过滤空行和注释
  return decoded.split('\n').filter(line => line && !line.startsWith('#'));
}
```

- JMS 订阅返回的 `data` 可能不带换行，是长 Base64 字符串
- 个别订阅可能 URL Encode 了，需要先 `decodeURIComponent`
- 解码后每行一条代理 URI

### 5.2 parser.js — URI 解析

**SS 解析**：提取 `method`、`password`、`host`、`port`、`name`

```js
function parseSS(uri) {
  // ss://base64(method:password)@host:port#name
  const [_, b64, hostPort, name] = uri.match(/ss:\/\/([^@]+)@([^#]+)(?:#(.+))?/);
  const [method, password] = Buffer.from(b64, 'base64').toString().split(':');
  const [server, port] = hostPort.split(':');
  return { type: 'ss', name: decodeURI(name || ''), server, port, cipher: method, password };
}
```

**VMess 解析**：解 Base64 JSON → 映射 Clash 字段

```js
function parseVMess(uri) {
  const b64 = uri.replace('vmess://', '');
  const obj = JSON.parse(Buffer.from(b64, 'base64').toString());
  const node = { type: 'vmess', name: obj.ps, server: obj.add, port: +obj.port, uuid: obj.id, alterId: +obj.aid, cipher: 'auto' };
  if (obj.net === 'ws') {
    node.network = 'ws';
    node['ws-opts'] = { path: obj.path || '/', headers: { Host: obj.host || '' } };
  }
  if (obj.tls === 'tls') node.tls = true;
  if (obj.sni) node['sni'] = obj.sni;
  return node;
}
```

**Trojan 解析**：URL 格式，用 `URL` 原生对象

```js
function parseTrojan(uri) {
  const u = new URL(uri);
  return {
    type: 'trojan',
    name: decodeURIComponent(u.hash.replace('#', '')),
    server: u.hostname,
    port: u.port || 443,
    password: u.password,
    udp: true,
    sni: u.searchParams.get('sni') || u.hostname,
    skipCertVerify: true,
  };
}
```

### 5.3 builder.js — 组装 Clash YAML

完整输出：

```yaml
port: 7890
socks-port: 7891
allow-lan: false
mode: rule
log-level: info
external-controller: 127.0.0.1:9090

proxies:
  - { ... 解析后的节点列表 ... }

proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
      - 🎯 直连
      - DIRECT
      - ...所有节点...
  - name: ♻️ 自动选择
    type: url-test
    proxies: [...所有节点...]
    url: http://www.gstatic.com/generate_204
    interval: 300
  - name: 🎯 直连
    type: select
    proxies: [DIRECT]
  - name: 🛑 广告拦截
    type: select
    proxies: [REJECT, DIRECT]
  - name: 🌍 国外网站
    type: select
    proxies:
      - 🚀 节点选择
      - ♻️ 自动选择
      - 🎯 直连
  - name: 🇨🇳 国内网站
    type: select
    proxies: [🎯 直连, 🚀 节点选择]

rules:
  - DOMAIN-SUFFIX,google.com,🌍 国外网站
  - DOMAIN-SUFFIX,youtube.com,🌍 国外网站
  - DOMAIN-SUFFIX,github.com,🌍 国外网站
  - DOMAIN-SUFFIX,cn,🇨🇳 国内网站
  - GEOIP,CN,🎯 直连
  - MATCH,🌍 国外网站
```

规则部分支持两种模式：
- **内置规则**：内置常用规则集（Google、GitHub、国内 CDN）
- **外部规则**：引用 geosite/geoip 或 RuleSet 链接

> **实现说明（v1.1.1）**：Plan 中 `🌍 国外网站` 首项为 `🚀 节点选择` 的设计在 v1.1.0 实现时误写为 `♻️ 自动选择`，导致 Verge 切换节点不生效；已于 v1.1.1 修复，详见 [CHANGELOG.md](./CHANGELOG.md)。

## 六、CLI 使用方式

```bash
# 最简模式
node src/index.js -u "https://jms-sub-url"

# 指定输出路径
node src/index.js -u "https://..." -o ./my-clash.yaml

# 指定规则类型 (内置/外部)
node src/index.js -u "https://..." --rules builtin
```

## 七、边界情况与容错

| 问题 | 处理方式 |
|---|---|
| 订阅链接失效/返回 4xx | 捕获 axios 异常，打印友好错误 |
| Base64 解码失败（填充不足） | `Buffer.from` 前补 `=` 或 `try/catch` |
| VMess JSON 字段缺失 | 逐个字段 `?.` 操作，缺省填默认值 |
| URI 格式不符合预期 | `try/catch` + `console.warn` 跳过该节点 |
| 订阅返回空结果 | 检查节点数，为 0 时提示并退出 |
| 节点名重复 | 自动追加 `-1`、`-2` 后缀去重 |
| 链接包含中文（URL 编码） | `decodeURIComponent` 解码 name |

## 八、后续扩展方向

- **Hermes 插件化**：包装成 Hermes skill，通过 `hermes` 命令直接转换
- **多订阅源合并**：支持多个 JMS 订阅 URL 合并输出
- **定时更新**：配合 `cronjob` 定时拉取最新配置，自动通知
- **自定义规则模板**：用户提供自己的 rules.yaml 模板，只替换 proxies 部分
- **本地订阅缓存**：订阅失败时使用上次成功拉取的缓存

## 九、总结

纯 Node.js + 3 个 npm 包，**约 150~200 行核心代码**就能完成 JMS 到 Clash 的转换。开发周期预计 1~2 小时出 MVP。自主可控、不依赖外部二进制，完全契合这个项目名 `jms-convert-tool` 的定位。
