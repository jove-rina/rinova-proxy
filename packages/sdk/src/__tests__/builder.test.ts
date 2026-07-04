/**
 * builder 单元测试
 * 运行: pnpm tsx --test src/__tests__/builder.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildConfig } from '../builder.js';
import type { ProxyNode } from '../types.js';

const sampleNodes: ProxyNode[] = [
  { name: '节点-A', type: 'ss', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'p' },
  { name: '节点-B', type: 'ss', server: '5.6.7.8', port: 443, cipher: 'aes-256-gcm', password: 'p' },
];

describe('buildConfig', () => {
  it('🌍 国外网站 默认跟随 🚀 节点选择（链式引用）', () => {
    const config = buildConfig(sampleNodes);
    const foreign = config['proxy-groups'].find((g) => g.name === '🌍 国外网站');
    assert.ok(foreign);
    assert.strictEqual(foreign!.proxies[0], '🚀 节点选择');
    assert.notStrictEqual(foreign!.proxies[0], '♻️ 自动选择');
  });

  it('🚀 节点选择 包含全部节点', () => {
    const config = buildConfig(sampleNodes);
    const select = config['proxy-groups'].find((g) => g.name === '🚀 节点选择');
    assert.ok(select);
    assert.ok(select!.proxies.includes('节点-A'));
    assert.ok(select!.proxies.includes('节点-B'));
  });
});
