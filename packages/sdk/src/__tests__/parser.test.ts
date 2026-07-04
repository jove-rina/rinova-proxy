/**
 * parser 单元测试
 * 运行: pnpm tsx --test src/parser.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseURI, parseLines } from '../parser.js';
import { deduplicateNames } from '../fetch.js';

// ============================================================
//  SS 解析
// ============================================================

describe('parseSS', () => {
  it('SIP002 标准格式: method:password 在 b64 内', () => {
    const uri = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#美国-01';
    const node = parseURI(uri);
    assert.strictEqual(node.type, 'ss');
    assert.strictEqual(node.name, '美国-01');
    assert.strictEqual(node.server, 'us1.example.com');
    assert.strictEqual(node.port, 8388);
    assert.strictEqual(node.cipher, 'aes-256-gcm');
    assert.strictEqual(node.password, 'password');
  });

  it('Legacy 格式: 整个 b64 含 method:password@host:port', () => {
    // b64 of "chacha20-ietf-poly1305:secret123@jp1.example.com:443"
    const b64 = Buffer.from('chacha20-ietf-poly1305:secret123@jp1.example.com:443').toString('base64');
    const uri = `ss://${b64}#日本-01`;
    const node = parseURI(uri);
    assert.strictEqual(node.type, 'ss');
    assert.strictEqual(node.name, '日本-01');
    assert.strictEqual(node.server, 'jp1.example.com');
    assert.strictEqual(node.port, 443);
    assert.strictEqual(node.cipher, 'chacha20-ietf-poly1305');
    assert.strictEqual(node.password, 'secret123');
  });

  it('无 name 时回退到 server', () => {
    const uri = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@sg1.example.com:443';
    const node = parseURI(uri);
    assert.strictEqual(node.name, 'sg1.example.com');
  });

  it('密码含冒号（如 AEAD 2022 格式）', () => {
    // method:password:part2  — 冒号后全部算 password
    const b64 = Buffer.from('2022-blake3-aes-256-gcm:long:password:with:colons').toString('base64');
    const uri = `ss://${b64}@hk1.example.com:443#香港`;
    const node = parseURI(uri);
    assert.strictEqual(node.cipher, '2022-blake3-aes-256-gcm');
    assert.strictEqual(node.password, 'long:password:with:colons');
  });

  it('SIP002 但 b64 内含 method:password@host:port（非标准扩展）', () => {
    // 模拟实际 JMS 的 bug: 外部有 @，但 b64 解码后也有 @
    const full = 'aes-256-gcm:RealPassword@extra.example.com:8443';
    const b64 = Buffer.from(full).toString('base64');
    const uri = `ss://${b64}@extra.example.com:8443#测试`;
    const node = parseURI(uri);
    assert.strictEqual(node.cipher, 'aes-256-gcm');
    assert.strictEqual(node.password, 'RealPassword');
    // 应该取 URI 层面的 host:port，而不是 b64 内的
    assert.strictEqual(node.server, 'extra.example.com');
    assert.strictEqual(node.port, 8443);
  });
});

// ============================================================
//  VMess 解析
// ============================================================

describe('parseVMess', () => {
  const sampleVMess = {
    v: '2',
    ps: '日本-01',
    add: 'jp1.example.com',
    port: '443',
    id: '550e8400-e29b-41d4-a716-446655440000',
    aid: '0',
    net: 'ws',
    type: 'none',
    host: 'cloudflare.com',
    path: '/ws?ed=2048',
    tls: 'tls',
    sni: 'cloudflare.com',
  };

  it('标准 ws + tls', () => {
    const b64 = Buffer.from(JSON.stringify(sampleVMess)).toString('base64');
    const uri = `vmess://${b64}`;
    const node = parseURI(uri);
    assert.strictEqual(node.type, 'vmess');
    assert.strictEqual(node.name, '日本-01');
    assert.strictEqual(node.server, 'jp1.example.com');
    assert.strictEqual(node.port, 443);
    assert.strictEqual(node.uuid, '550e8400-e29b-41d4-a716-446655440000');
    assert.strictEqual(node.alterId, 0);
    assert.strictEqual(node.network, 'ws');
    const ws1 = node['ws-opts'] as any;
    assert.strictEqual(ws1?.path, '/ws?ed=2048');
    assert.strictEqual(ws1?.headers?.Host, 'cloudflare.com');
    assert.strictEqual(node.tls, true);
    assert.strictEqual(node['sni'], 'cloudflare.com');
  });

  it('grpc 传输层', () => {
    const cfg = { ...sampleVMess, net: 'grpc', path: '', host: '', serviceName: 'my-service' };
    const b64 = Buffer.from(JSON.stringify(cfg)).toString('base64');
    const node = parseURI(`vmess://${b64}`);
    assert.strictEqual(node.network, 'grpc');
    const grpc1 = node['grpc-opts'] as any;
    assert.strictEqual(grpc1?.['grpc-service-name'], 'my-service');
  });

  it('h2 传输层', () => {
    const cfg = { ...sampleVMess, net: 'h2', path: '/api', host: 'example.com' };
    const b64 = Buffer.from(JSON.stringify(cfg)).toString('base64');
    const node = parseURI(`vmess://${b64}`);
    assert.strictEqual(node.network, 'h2');
    const h2 = node['h2-opts'] as any;
    assert.strictEqual(h2?.path, '/api');
    assert.strictEqual(h2?.host, 'example.com');
  });

  it('无 tls 的 tcp', () => {
    const cfg = { ...sampleVMess, net: 'tcp', tls: 'none' };
    const b64 = Buffer.from(JSON.stringify(cfg)).toString('base64');
    const node = parseURI(`vmess://${b64}`);
    assert.strictEqual(node.network, undefined);
    assert.strictEqual(node.tls, false);
  });

  it('字段别名: remarks / host', () => {
    const cfg = { v: '2', remarks: '香港-01', add: 'hk.example.com', port: '80', id: 'uuid', aid: '0', net: 'tcp' };
    const b64 = Buffer.from(JSON.stringify(cfg)).toString('base64');
    const node = parseURI(`vmess://${b64}`);
    assert.strictEqual(node.name, '香港-01');
    assert.strictEqual(node.server, 'hk.example.com');
  });

  it('client-fingerprint / alpn', () => {
    const cfg = { ...sampleVMess, fp: 'chrome', alpn: 'h2,http/1.1' };
    const b64 = Buffer.from(JSON.stringify(cfg)).toString('base64');
    const node = parseURI(`vmess://${b64}`);
    assert.strictEqual(node['client-fingerprint'], 'chrome');
    assert.deepStrictEqual(node.alpn, ['h2', 'http/1.1']);
  });
});

// ============================================================
//  Trojan 解析
// ============================================================

describe('parseTrojan', () => {
  it('标准格式', () => {
    const uri = 'trojan://my-password@sg1.example.com:443?security=tls&sni=sg1.example.com#新加坡-01';
    const node = parseURI(uri);
    assert.strictEqual(node.type, 'trojan');
    assert.strictEqual(node.name, '新加坡-01');
    assert.strictEqual(node.server, 'sg1.example.com');
    assert.strictEqual(node.port, 443);
    assert.strictEqual(node.password, 'my-password');
    assert.strictEqual(node.sni, 'sg1.example.com');
    assert.strictEqual(node['skip-cert-verify'], undefined);
  });

  it('allowInsecure', () => {
    const uri = 'trojan://pass@us1.example.com:443?allowInsecure=1&sni=us1.example.com#美国';
    const node = parseURI(uri);
    assert.strictEqual(node['skip-cert-verify'], true);
  });

  it('无 name 时回退到 hostname', () => {
    const uri = 'trojan://pass@jp1.example.com:443';
    const node = parseURI(uri);
    assert.strictEqual(node.name, 'jp1.example.com');
  });
});

// ============================================================
//  去重
// ============================================================

describe('deduplicateNames', () => {
  it('同名节点追加 -2, -3', () => {
    const nodes = [
      { name: '日本-01', type: 'ss', server: 'a.com', port: 443 },
      { name: '日本-01', type: 'ss', server: 'b.com', port: 443 },
      { name: '日本-01', type: 'ss', server: 'c.com', port: 443 },
    ] as any[];
    deduplicateNames(nodes);
    assert.strictEqual(nodes[0].name, '日本-01');
    assert.strictEqual(nodes[1].name, '日本-2');
    assert.strictEqual(nodes[2].name, '日本-3');
  });

  it('不同名节点不受影响', () => {
    const nodes = [
      { name: '日本-01', type: 'ss', server: 'a.com', port: 443 },
      { name: '新加坡-01', type: 'ss', server: 'b.com', port: 443 },
    ] as any[];
    deduplicateNames(nodes);
    assert.strictEqual(nodes[0].name, '日本-01');
    assert.strictEqual(nodes[1].name, '新加坡-01');
  });
});

// ============================================================
//  Hysteria2 解析
// ============================================================

describe('parseHysteria2', () => {
  it('标准格式: hysteria2://', () => {
    const uri = 'hysteria2://my-password@jp1.example.com:443?insecure=1&sni=jp1.example.com&alpn=h3#日本-Hy2';
    const node = parseURI(uri);
    assert.strictEqual(node.type, 'hysteria2');
    assert.strictEqual(node.name, '日本-Hy2');
    assert.strictEqual(node.server, 'jp1.example.com');
    assert.strictEqual(node.port, 443);
    assert.strictEqual(node.password, 'my-password');
    assert.strictEqual(node.sni, 'jp1.example.com');
    assert.strictEqual(node['skip-cert-verify'], true);
    assert.deepStrictEqual(node.alpn, ['h3']);
  });

  it('简写 hy2:// 前缀', () => {
    const uri = 'hy2://pass@sg1.example.com:8443?insecure=1&alpn=h3,h2#新加坡-Hy2';
    const node = parseURI(uri);
    assert.strictEqual(node.type, 'hysteria2');
    assert.strictEqual(node.server, 'sg1.example.com');
    assert.strictEqual(node.port, 8443);
    assert.deepStrictEqual((node as any).alpn, ['h3', 'h2']);
  });

  it('带宽参数 up / down', () => {
    const uri = 'hysteria2://pass@us1.example.com:443?up=50&down=150&insecure=1#美国';
    const node = parseURI(uri);
    assert.strictEqual(node.up, 50);
    assert.strictEqual(node.down, 150);
  });

  it('无 name 时回退到 hostname', () => {
    const uri = 'hysteria2://pass@hk1.example.com:443';
    const node = parseURI(uri);
    assert.strictEqual(node.name, 'hk1.example.com');
    assert.strictEqual(node['skip-cert-verify'], undefined);
  });
});

// ============================================================
//  批量解析
// ============================================================

describe('parseLines', () => {
  it('混合协议批量解析', () => {
    const lines = [
      'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#美国-01',
      'trojan://pass@sg1.example.com:443?security=tls&sni=sg1.example.com#新加坡-01',
    ];
    const nodes = parseLines(lines);
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(nodes[0].type, 'ss');
    assert.strictEqual(nodes[1].type, 'trojan');
  });

  it('无法解析的行被跳过并有 warn', () => {
    const lines = [
      'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#美国',
      'unknown://bad-line',
      'trojan://pass@sg.example.com:443?sni=sg.example.com#新加坡',
    ];
    const nodes = parseLines(lines);
    assert.strictEqual(nodes.length, 2);
  });
});
