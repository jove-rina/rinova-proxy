/**
 * server 单元测试
 * 运行: pnpm tsx --test src/server.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { startServer } from '../server.js';

const SUB_PORT = 25519;
const CONVERT_PORT = 25520;
const SUB_URL = `http://127.0.0.1:${SUB_PORT}/sub`;

// 模拟订阅数据（base64 编码）
const proxyData = Buffer.from(
  'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#美国-01\n' +
  'trojan://pass@sg1.example.com:443?security=tls&sni=sg1.example.com#新加坡-01'
).toString('base64');

let mockServer: http.Server;
let convertServer: http.Server;

describe('server', () => {
  before(async () => {
    // 启动模拟订阅源
    mockServer = http.createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(proxyData);
    });
    await new Promise<void>((resolve) => mockServer.listen(SUB_PORT, '127.0.0.1', resolve));

    // 启动 jms-convert 服务（首次拉取成功才启动 HTTP）
    convertServer = await startServer({
      url: SUB_URL,
      port: CONVERT_PORT,
      intervalMin: 999, // 定时刷新几乎不会触发
      ruleMode: 'builtin',
    });
  });

  after(() => {
    convertServer.close();
    mockServer.close();
    // 强制退出（setInterval 阻止进程自然退出）
    setTimeout(() => process.exit(0), 50);
  });

  it('/health 返回正确状态', async () => {
    const res = await fetch(`http://127.0.0.1:${CONVERT_PORT}/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');

    const body = await res.json() as Record<string, unknown>;
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.nodes, 2);
    assert.ok(body.updatedAt);
    assert.strictEqual(body.lastError, null);
  });

  it('/clash.yaml 返回 YAML 配置', async () => {
    const res = await fetch(`http://127.0.0.1:${CONVERT_PORT}/clash.yaml`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/yaml; charset=utf-8');

    const yaml = await res.text();
    assert.ok(yaml.includes('proxies:'));
    assert.ok(yaml.includes('proxy-groups:'));
    assert.ok(yaml.includes('rules:'));
    assert.ok(yaml.includes('美国-01'));
    assert.ok(yaml.includes('新加坡-01'));
  });

  it('/clash.yaml?t=123 带 query 参数也能正确响应', async () => {
    const res = await fetch(`http://127.0.0.1:${CONVERT_PORT}/clash.yaml?t=${Date.now()}`);
    assert.strictEqual(res.status, 200);
    const yaml = await res.text();
    assert.ok(yaml.includes('美国-01'));
  });

  it('POST /refresh 返回 { ok: true, skipped: false }', async () => {
    const res = await fetch(`http://127.0.0.1:${CONVERT_PORT}/refresh`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');

    const body = await res.json() as Record<string, unknown>;
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.skipped, false);
    assert.strictEqual(body.nodes, 2);
  });

  it('GET /refresh 返回 405', async () => {
    const res = await fetch(`http://127.0.0.1:${CONVERT_PORT}/refresh`);
    assert.strictEqual(res.status, 405);
  });

  it('不存在的路径返回 404', async () => {
    const res = await fetch(`http://127.0.0.1:${CONVERT_PORT}/unknown`);
    assert.strictEqual(res.status, 404);
  });
});
