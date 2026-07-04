# @rinova/proxy-sdk

代理订阅链接 → Clash 配置文件转换工具 — Node.js SDK。

> **v2.0.0**

## 安装

```bash
pnpm add @rinova/proxy-sdk
npm install @rinova/proxy-sdk
```

## 快速开始

```typescript
import { convert } from '@rinova/proxy-sdk';
import { writeFileSync } from 'fs';

// 一键转换：拉取订阅 → 解析 → 生成 Clash 配置 → 保存
const { yaml, nodes } = await convert('https://jms-subscription-url');
console.log(`解析了 ${nodes.length} 个节点`);
writeFileSync('clash.yaml', yaml);
```

---

## API 参考

### `convert(url, opts?)`

拉取 代理订阅链接，解析所有代理节点，生成完整的 Clash 配置文件。

```typescript
import { convert } from '@rinova/proxy-sdk';

// 基础用法
const result = await convert('https://jms-api.example.com/sub?token=xxx');

// 带选项
const result = await convert('https://...', {
  rules: 'external',      // 使用 ACL4SSR 外部规则（默认: 'builtin'）
  deduplicate: false,     // 跳过节点名去重（默认: true）
});

// 解构结果
const { yaml, config, nodes } = result;

// yaml  → string — 可直接写入 clash.yaml
// nodes → ProxyNode[] — 解析出的代理节点列表
// config → ClashConfig — 完整配置对象（proxies, groups, rules）
```

**参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | (必填) | 代理订阅链接 |
| `opts.rules` | `'builtin' \| 'external'` | `'builtin'` | 规则模式：内置或 ACL4SSR |
| `opts.deduplicate` | `boolean` | `true` | 是否去重节点名（追加 -2, -3） |

**返回值** `Promise<ConvertResult>`

| 字段 | 类型 | 说明 |
|------|------|------|
| `yaml` | `string` | Clash 配置 YAML 字符串 |
| `config` | `ClashConfig` | 完整配置对象（proxies, groups, rules） |
| `nodes` | `ProxyNode[]` | 解析后的代理节点列表 |

**抛出** `Error` 如果订阅为空或全部解析失败。

---

### `convertFromLines(lines, opts?)`

从已有的 URI 行列表直接转换 Clash 配置，**不发起网络请求**。

```typescript
import { convertFromLines } from '@rinova/proxy-sdk';

const lines = [
  'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#美国-01',
  'vmess://eyJ2Ij...QifQ==',
  'trojan://my-password@sg.example.com:443?sni=sg.example.com#新加坡-01',
  'hysteria2://pass@jp.example.com:443?insecure=1&sni=jp.example.com&alpn=h3#日本-Hy2',
];

const { yaml, config, nodes } = convertFromLines(lines, {
  rules: 'external',
});
```

**参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lines` | `string[]` | (必填) | 代理 URI 字符串数组 |
| `opts.rules` | `'builtin' \| 'external'` | `'builtin'` | 同 `convert()` |
| `opts.deduplicate` | `boolean` | `true` | 同 `convert()` |

**返回值** `ConvertResult`（同 `convert()`）

**抛出** `Error` 如果输入中未找到有效节点。

---

### `parseURI(uri)`

将单个代理 URI 字符串解析为 `ProxyNode` 对象。

```typescript
import { parseURI } from '@rinova/proxy-sdk/parser';

// SS
const node = parseURI('ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@host:8388#MyNode');
console.log(node);
// → { name: 'MyNode', type: 'ss', server: 'host', port: 8388, cipher: 'aes-256-gcm', password: '...' }

// VMess
const node2 = parseURI('vmess://eyJ2Ij...MifQ==');
console.log(node2.type);    // 'vmess'
console.log(node2.network); // 'ws'

// Trojan
const node3 = parseURI('trojan://pass@sg.example.com:443?sni=sg.example.com#SG');
console.log(node3.type);     // 'trojan'
console.log(node3.password); // 'pass'

// Hysteria2
const node4 = parseURI('hysteria2://pass@jp.example.com:443?insecure=1&alpn=h3#JP');
console.log(node4.type);     // 'hysteria2'
console.log(node4.alpn);     // ['h3']
```

**返回值** `ProxyNode`

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 节点名称（取自 URI fragment 或 server） |
| `type` | `'ss' \| 'vmess' \| 'trojan' \| 'hysteria2'` | 协议类型 |
| `server` | `string` | 服务器地址或 IP |
| `port` | `number` | 服务器端口 |
| `cipher` | `string` | 加密方式（SS/VMess） |
| `password` | `string` | 密码（SS/Trojan/Hysteria2） |
| `uuid` | `string` | VMess UUID（仅 VMess） |
| `tls` | `boolean` | 是否启用 TLS |
| `network` | `string` | 传输层（`ws`, `grpc`, `h2`, `quic`, `kcp`） |
| `sni` | `string` | TLS SNI |
| `alpn` | `string[]` | ALPN 协议列表 |
| `udp` | `boolean` | UDP 支持 |

> 其他协议特定字段（`ws-opts`、`grpc-opts`、`skip-cert-verify` 等）通过 `node['字段名']` 访问。

---

### `parseLines(lines)`

批量解析 URI 数组为 `ProxyNode[]`。无效 URI 会被跳过并打印警告。

```typescript
import { parseLines } from '@rinova/proxy-sdk/parser';

const nodes = parseLines([
  'ss://YWVz...@host1:8388#节点1',
  '无效的-uri-字符串',          // ← 被跳过，打印警告
  'trojan://pass@host2:443#节点2',
]);
console.log(nodes.length); // 2
```

---

### `fetchSubscription(url)`

拉取 代理订阅链接并 Base64 解码为 URI 字符串数组。

```typescript
import { fetchSubscription } from '@rinova/proxy-sdk/fetch';

const lines = await fetchSubscription('https://jms-api.example.com/sub?token=xxx');
console.log(lines);
// → ['ss://...', 'vmess://...', 'trojan://...']
```

**抛出** `Error` 如果订阅返回空结果或无法解析。

---

### `deduplicateNames(nodes)`

就地修改节点名称，避免重复。首个保留原名，后续追加 `-2`、`-3` 后缀。

```typescript
import { deduplicateNames } from '@rinova/proxy-sdk/fetch';

const nodes = [
  { name: '日本' },
  { name: '日本' },
  { name: '日本' },
];
deduplicateNames(nodes);
console.log(nodes.map(n => n.name));
// → ['日本', '日本-2', '日本-3']
```

---

### `buildConfig(nodes, ruleMode?)`

从解析后的节点构建完整的 Clash 配置对象。

```typescript
import { buildConfig } from '@rinova/proxy-sdk/builder';

const config = buildConfig(parsedNodes, 'builtin');
// config.proxies        → ProxyNode[]
// config['proxy-groups'] → ProxyGroup[]
// config.rules           → string[]
```

内置链式策略组结构：
```
🚀 节点选择 → 用户选择节点
♻️ 自动选择 → url-test 测速，最低延迟
🎯 直连      → 直连或代理
🌍 国外网站  → 默认跟随 🚀 节点选择
🇨🇳 国内网站  → 国内分流
🛑 广告拦截  → REJECT
```

---

### `toYaml(config)`

将 `ClashConfig` 对象序列化为 YAML 字符串。

```typescript
import { toYaml } from '@rinova/proxy-sdk/builder';

const yaml = toYaml(config);
writeFileSync('clash.yaml', yaml);
```

---

### `startServer(opts)`

启动 HTTP 服务，按定时刷新订阅并提供 Clash 配置。

```typescript
import { startServer } from '@rinova/proxy-sdk/server';

const server = await startServer({
  url: 'https://jms-api.example.com/sub',
  port: 25500,
  intervalMin: 60,          // 每 60 分钟自动刷新
  ruleMode: 'builtin',
});

// 端点：
//   GET /clash.yaml  → Clash 配置
//   GET /health      → JSON 状态
//   POST /refresh    → 手动触发刷新

// 关闭服务：
server.close();
```

---

### `t(key, params?, fallback?)` / `getLang()`

国际化辅助函数。详见下方 [国际化](#国际化) 章节。

---

## 国际化

消息文本根据 `LANG` 或 `LC_ALL` 环境变量自动切换。以 `zh` 开头显示中文，其余默认英文。

```typescript
import { t, getLang } from '@rinova/proxy-sdk';

// 获取当前语言
console.log(getLang());   // 'en' 或 'zh'

// 翻译
console.log(t('refreshing'));              // "刷新订阅..."
console.log(t('parsed', { count: 5 }));    // "解析成功：5 个节点"

// CLI 中使用
// LANG=zh_CN.UTF-8 node app.js   → 中文输出
// LANG=en_US.UTF-8 node app.js   → 英文输出
```

---

## 类型定义

```typescript
import type { ProxyNode, ProxyGroup, ClashConfig, ConvertOptions, ConvertResult } from '@rinova/proxy-sdk';
```

| 类型 | 说明 |
|------|------|
| `ProxyNode` | 单个代理节点（name, type, server, port + 协议字段） |
| `ProxyGroup` | 策略组（name, type, proxies, url, interval） |
| `ClashConfig` | 完整 Clash 配置（proxies, proxy-groups, rules, ports） |
| `ConvertOptions` | `{ rules, deduplicate }` |
| `ConvertResult` | `{ config, yaml, nodes }` |

---

## 支持协议

| 协议 | URI 前缀 | 格式 | 额外字段 |
|------|----------|------|----------|
| Shadowsocks | `ss://` | SIP002, Legacy, JMS 扩展 | `cipher`, `password` |
| VMess | `vmess://` | ws, tcp, grpc, h2, quic, kcp | `uuid`, `alterId`, `tls`, `network`, `ws-opts` |
| Trojan | `trojan://` | 标准 | `password`, `sni`, `skip-cert-verify` |
| Hysteria2 | `hysteria2://`, `hy2://` | 标准 | `password`, `sni`, `alpn`, `up/down` 带宽 |

## License

MIT
