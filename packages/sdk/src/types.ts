/** 代理节点类型 */
export type ProxyType = 'ss' | 'vmess' | 'trojan' | 'hysteria2';

/** 解析后的代理节点 */
export interface ProxyNode {
  name: string;
  type: ProxyType;
  server: string;
  port: number;
  [key: string]: unknown;
}

/** Clash 代理组 */
export interface ProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance' | 'relay';
  proxies: string[];
  url?: string;
  interval?: number;
}

/** Clash 完整配置 */
export interface ClashConfig {
  port: number;
  'socks-port': number;
  'allow-lan': boolean;
  mode: 'Rule' | 'rule' | 'global' | 'direct';
  'log-level': string;
  'external-controller': string;
  proxies: ProxyNode[];
  'proxy-groups': ProxyGroup[];
  rules: string[];
}

/** CLI 选项 */
export interface CliOptions {
  url: string;
  output?: string;
  rules: 'builtin' | 'external';
}
