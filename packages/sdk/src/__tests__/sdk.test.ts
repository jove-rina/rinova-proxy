import { describe, it } from 'node:test';
import assert from 'node:assert';
import { convertFromLines, parseURI, buildConfig, toYaml } from '../index.js';

describe('sdk', () => {
  describe('convertFromLines', () => {
    const lines = [
      'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@us1.example.com:8388#US-01',
      'trojan://pass@sg.example.com:443?security=tls&sni=sg.example.com#SG-01',
    ];

    it('returns yaml, config, and nodes', () => {
      const result = convertFromLines(lines);
      assert.ok(result.yaml);
      assert.ok(result.config);
      assert.ok(result.nodes);
      assert.strictEqual(result.nodes.length, 2);
    });

    it('yaml contains proxies, groups, and rules', () => {
      const { yaml } = convertFromLines(lines);
      assert.ok(yaml.includes('proxies:'));
      assert.ok(yaml.includes('proxy-groups:'));
      assert.ok(yaml.includes('rules:'));
      assert.ok(yaml.includes('US-01'));
      assert.ok(yaml.includes('SG-01'));
    });

    it('deduplicates by default', () => {
      const dups = [
        'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@a.com:443#Node',
        'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@b.com:443#Node',
      ];
      const { nodes } = convertFromLines(dups);
      assert.strictEqual(nodes[0].name, 'Node');
      assert.strictEqual(nodes[1].name, 'Node-2');
    });

    it('skips dedup when deduplicate: false', () => {
      const dups = [
        'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@a.com:443#Node',
        'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@b.com:443#Node',
      ];
      const { nodes } = convertFromLines(dups, { deduplicate: false });
      assert.strictEqual(nodes[0].name, 'Node');
      assert.strictEqual(nodes[1].name, 'Node');
    });

    it('supports external rules mode', () => {
      const { config } = convertFromLines(lines, { rules: 'external' });
      assert.ok(config.rules[0].startsWith('RULE-SET'));
    });

    it('defaults to builtin rules', () => {
      const { config } = convertFromLines(lines);
      assert.ok(config.rules[0].startsWith('DOMAIN-SUFFIX'));
    });

    it('throws on empty lines', () => {
      assert.throws(() => convertFromLines([]));
    });

    it('throws when all lines are unparseable', () => {
      assert.throws(() => convertFromLines(['invalid://line']));
    });
  });

  describe('re-exports', () => {
    it('parseURI is accessible from SDK entry', () => {
      const node = parseURI('ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@host:8388#Test');
      assert.strictEqual(node.type, 'ss');
      assert.strictEqual(node.name, 'Test');
    });

    it('buildConfig and toYaml work together', () => {
      const node = parseURI('ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@host:8388#Test');
      const config = buildConfig([node], 'builtin');
      const yaml = toYaml(config);
      assert.ok(yaml.includes('Test'));
    });
  });
});
