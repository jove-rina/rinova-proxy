import type { ProxyNode } from './types.js';
import { padBase64, safeDecodeURI } from './utils.js';
import { t } from './i18n.js';

// ============================================================
//  SS 解析
// ============================================================

const parseSS = (uri: string): ProxyNode => {
  const withoutScheme = uri.slice(5);

  const hashIdx = withoutScheme.lastIndexOf('#');
  const rawName = hashIdx >= 0 ? safeDecodeURI(withoutScheme.slice(hashIdx + 1)) : '';
  const body = hashIdx >= 0 ? withoutScheme.slice(0, hashIdx) : withoutScheme;

  const atIdx = body.indexOf('@');

  if (atIdx >= 0) {
    const b64Part = body.slice(0, atIdx);
    const hostPort = body.slice(atIdx + 1);
    const [server, portStr] = hostPort.split(':');
    const port = parseInt(portStr, 10);
    if (!server || isNaN(port)) throw new Error(t('err_ss_address', { host: hostPort }));

    const decoded = Buffer.from(padBase64(b64Part), 'base64').toString('utf-8');
    const atInDecoded = decoded.indexOf('@');
    if (atInDecoded >= 0) {
      const [method, ...pwdParts] = decoded.slice(0, atInDecoded).split(':');
      return { name: rawName || server, type: 'ss', server, port, cipher: method || 'none', password: pwdParts.join(':') };
    }
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) throw new Error(t('err_ss_sip002_credentials', { raw: decoded }));
    return { name: rawName || server, type: 'ss', server, port, cipher: decoded.slice(0, colonIdx), password: decoded.slice(colonIdx + 1) };
  }

  const decoded = Buffer.from(padBase64(body), 'base64').toString('utf-8');
  const atInDecoded = decoded.indexOf('@');
  if (atInDecoded === -1) throw new Error(t('err_ss_legacy_no_at', { raw: decoded }));

  const cred = decoded.slice(0, atInDecoded);
  const hostPort = decoded.slice(atInDecoded + 1);
  const [server, portStr] = hostPort.split(':');
  const port = parseInt(portStr, 10);
  if (!server || isNaN(port)) throw new Error(t('err_ss_legacy_address', { host: hostPort }));

  const [method, ...pwdParts] = cred.split(':');
  if (!method) throw new Error(t('err_ss_legacy_no_method', { raw: cred }));

  return { name: rawName || server, type: 'ss', server, port, cipher: method, password: pwdParts.join(':') };
};

// ============================================================
//  VMess 解析
// ============================================================

interface VmessConfig {
  v?: string; ps?: string; remarks?: string; add?: string; host?: string;
  port?: string; id?: string; aid?: string; net?: string; type?: string;
  header?: Record<string, unknown>; path?: string; tls?: string; sni?: string;
  scy?: string; alpn?: string; fp?: string; 'skip-cert-verify'?: string;
  allowInsecure?: string; serviceName?: string; key?: string; security?: string;
}

const parseVMess = (uri: string): ProxyNode => {
  const b64 = uri.slice(8);
  const jsonStr = Buffer.from(padBase64(b64), 'base64').toString('utf-8');

  let obj: VmessConfig;
  try { obj = JSON.parse(jsonStr); } catch { throw new Error(t('err_vmess_parse')); }

  const node: ProxyNode = {
    name: safeDecodeURI(obj.ps || obj.remarks) || 'Unnamed',
    type: 'vmess',
    server: obj.add || obj.host || '',
    port: parseInt(obj.port || '0', 10),
    uuid: obj.id,
    alterId: parseInt(obj.aid || '0', 10),
    cipher: obj.scy || 'auto',
  };

  if (!node.server || !node.port) throw new Error(t('err_vmess_no_server'));

  const net = obj.net || 'tcp';

  if (net === 'ws') {
    node.network = 'ws';
    const wsOpts: Record<string, unknown> = { path: obj.path || '/' };
    if (obj.host) wsOpts.headers = { Host: obj.host };
    node['ws-opts'] = wsOpts;
  } else if (net === 'grpc') {
    node.network = 'grpc';
    const grpcOpts: Record<string, unknown> = {};
    grpcOpts['grpc-service-name'] = obj.serviceName || '';
    node['grpc-opts'] = grpcOpts;
  } else if (net === 'h2') {
    node.network = 'h2';
    const h2Opts: Record<string, unknown> = { path: obj.path || '/' };
    if (obj.host) h2Opts.host = obj.host;
    node['h2-opts'] = h2Opts;
  } else if (net === 'quic') {
    node.network = 'quic';
    const quicOpts: Record<string, unknown> = { security: obj.security || 'none', key: obj.key || '' };
    node['quic-opts'] = quicOpts;
  } else if (net === 'kcp') {
    node.network = 'kcp';
    node['kcp-opts'] = { mtu: 1350, 'mptcp': false };
  }

  if (obj.tls === 'tls') {
    node.tls = true;
    if (obj.sni) node['sni'] = obj.sni;
    if (obj.alpn) node.alpn = obj.alpn?.split(',').map((s) => s.trim());
    if (obj.fp) node['client-fingerprint'] = obj.fp;
    if (obj['skip-cert-verify'] === 'true' || obj.allowInsecure === 'true' || obj.allowInsecure === '1') {
      node['skip-cert-verify'] = true;
    }
  } else if (obj.tls === 'none') {
    node.tls = false;
    node['skip-cert-verify'] = true;
  }

  return node;
};

// ============================================================
//  Trojan 解析
// ============================================================

const parseTrojan = (uri: string): ProxyNode => {
  const u = new URL(uri);
  const node: ProxyNode = {
    name: safeDecodeURI(u.hash.replace('#', '')) || u.hostname,
    type: 'trojan', server: u.hostname,
    port: parseInt(u.port || '443', 10),
    password: u.username || u.password,
    sni: u.searchParams.get('sni') || u.hostname,
  };
  const allowInsecure = u.searchParams.get('allowInsecure') ?? u.searchParams.get('allow_insecure');
  if (allowInsecure === '1' || allowInsecure === 'true') node['skip-cert-verify'] = true;
  return node;
};

// ============================================================
//  Hysteria2 解析
// ============================================================

const parseHysteria2 = (uri: string): ProxyNode => {
  const u = new URL(uri);
  const node: ProxyNode = {
    name: safeDecodeURI(u.hash.replace('#', '')) || u.hostname,
    type: 'hysteria2', server: u.hostname,
    port: parseInt(u.port || '443', 10),
    password: u.username || u.password,
  };

  const sni = u.searchParams.get('sni') || u.searchParams.get('peer');
  if (sni) node.sni = sni;

  const insecure = u.searchParams.get('insecure') ?? u.searchParams.get('allowInsecure') ?? u.searchParams.get('skip-cert-verify');
  if (insecure === '1' || insecure === 'true') node['skip-cert-verify'] = true;

  const alpn = u.searchParams.get('alpn');
  if (alpn) node.alpn = alpn.split(',').map((s) => s.trim());

  const up = u.searchParams.get('up') || u.searchParams.get('upload');
  const down = u.searchParams.get('down') || u.searchParams.get('download');
  if (up) node.up = parseInt(up, 10);
  if (down) node.down = parseInt(down, 10);

  return node;
};

// ============================================================
//  入口
// ============================================================

export const parseURI = (uri: string): ProxyNode => {
  if (uri.startsWith('ss://')) return parseSS(uri);
  if (uri.startsWith('vmess://')) return parseVMess(uri);
  if (uri.startsWith('trojan://')) return parseTrojan(uri);
  if (uri.startsWith('hysteria2://') || uri.startsWith('hy2://')) return parseHysteria2(uri);
  throw new Error(t('err_unsupported_protocol', { prefix: uri.slice(0, 10) }));
};

export const parseLines = (lines: string[]): ProxyNode[] => {
  const nodes: ProxyNode[] = [];
  for (const line of lines) {
    try { nodes.push(parseURI(line)); } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️  ${t('skip_node', { msg })}`);
    }
  }
  return nodes;
};
