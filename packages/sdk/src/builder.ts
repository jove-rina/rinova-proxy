import { dump } from 'js-yaml';
import type { ClashConfig, ProxyNode } from './types.js';

/** 内置规则集 */
const BUILTIN_RULES: string[] = [
  'DOMAIN-SUFFIX,ad.com,🛑 广告拦截',
  'DOMAIN-SUFFIX,doubleclick.net,🛑 广告拦截',
  'DOMAIN-SUFFIX,google.com,🌍 国外网站',
  'DOMAIN-SUFFIX,youtube.com,🌍 国外网站',
  'DOMAIN-SUFFIX,github.com,🌍 国外网站',
  'DOMAIN-SUFFIX,twitter.com,🌍 国外网站',
  'DOMAIN-SUFFIX,x.com,🌍 国外网站',
  'DOMAIN-SUFFIX,telegram.org,🌍 国外网站',
  'DOMAIN-SUFFIX,steampowered.com,🌍 国外网站',
  'DOMAIN-SUFFIX,openai.com,🌍 国外网站',
  'DOMAIN-SUFFIX,anthropic.com,🌍 国外网站',
  'DOMAIN-SUFFIX,claude.ai,🌍 国外网站',
  'DOMAIN-SUFFIX,cursor.com,🌍 国外网站',
  'DOMAIN-SUFFIX,cloudflare.com,🌍 国外网站',
  'DOMAIN-SUFFIX,netflix.com,🌍 国外网站',
  'DOMAIN-SUFFIX,spotify.com,🌍 国外网站',
  'DOMAIN-SUFFIX,disneyplus.com,🌍 国外网站',
  'DOMAIN-SUFFIX,cn,🇨🇳 国内网站',
  'DOMAIN-SUFFIX,baidu.com,🇨🇳 国内网站',
  'DOMAIN-SUFFIX,qq.com,🇨🇳 国内网站',
  'DOMAIN-SUFFIX,weixin.com,🇨🇳 国内网站',
  'DOMAIN-SUFFIX,alipay.com,🇨🇳 国内网站',
  'GEOIP,CN,🎯 直连',
  'MATCH,🌍 国外网站',
];

const EXT_RULES: string[] = [
  'RULE-SET,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanEasyAD.list,🛑 广告拦截',
  'RULE-SET,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list,🌍 国外网站',
  'RULE-SET,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list,🇨🇳 国内网站',
  'GEOIP,CN,🎯 直连',
  'MATCH,🌍 国外网站',
];

/**
 * 组装 Clash 配置对象
 */
export const buildConfig = (nodes: ProxyNode[], ruleMode: 'builtin' | 'external' = 'builtin'): ClashConfig => {
  const names = nodes.map((n) => n.name);
  const foreignProxies = ['🚀 节点选择', '♻️ 自动选择', '🎯 直连', 'DIRECT', ...names];

  return {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': true,
    mode: 'Rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    proxies: nodes,
    'proxy-groups': [
      { name: '🚀 节点选择', type: 'select', proxies: ['♻️ 自动选择', '🎯 直连', 'DIRECT', ...names] },
      { name: '♻️ 自动选择', type: 'url-test', proxies: names, url: 'http://www.gstatic.com/generate_204', interval: 300 },
      { name: '🎯 直连', type: 'select', proxies: ['DIRECT', ...names] },
      { name: '🛑 广告拦截', type: 'select', proxies: ['REJECT', 'DIRECT', ...names] },
      { name: '🌍 国外网站', type: 'select', proxies: foreignProxies },
      { name: '🇨🇳 国内网站', type: 'select', proxies: ['🎯 直连', ...names] },
    ],
    rules: ruleMode === 'external' ? EXT_RULES : BUILTIN_RULES,
  };
};

/**
 * 序列化为 YAML 字符串
 */
export const toYaml = (config: ClashConfig): string =>
  dump(config as unknown as Record<string, unknown>, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
