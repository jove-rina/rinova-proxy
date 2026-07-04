#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { dump, load } from 'js-yaml';
import { convert, t, getLang } from '@rinova/proxy-sdk';
import { startServer } from '@rinova/proxy-sdk/server';

interface CliOptions {
  url: string;
  output: string;
  rules: 'builtin' | 'external';
}

const lang = getLang();

const program = new Command();

if (lang === 'zh') {
  program
    .name('proxy-cli')
    .description('代理订阅链接 → Clash 配置文件')
    .version('2.0.0')
    .option('-u, --url <url>', '代理订阅链接')
    .option('-o, --output <path>', '输出文件路径', '')
    .option('-p, --port <port>', '服务模式：监听端口（默认 25500）')
    .option('-i, --interval <min>', '服务模式：刷新间隔（分钟）', '60')
    .option('--rules <mode>', '规则模式: builtin（内置）| external（外部）', 'builtin')
    .option('--merge <file>', '合并到现有配置', '');
} else {
  program
    .name('proxy-cli')
    .description('Proxy subscription → Clash config')
    .version('2.0.0')
    .option('-u, --url <url>', 'Proxy subscription URL')
    .option('-o, --output <path>', 'output path', '')
    .option('-p, --port <port>', 'serve mode: HTTP port (default 25500)')
    .option('-i, --interval <min>', 'serve mode: refresh interval (minutes)', '60')
    .option('--rules <mode>', 'rule mode: builtin | external', 'builtin')
    .option('--merge <file>', 'merge into existing Clash config', '');
}

program.parse(process.argv);

const opts = program.opts() as CliOptions & { merge?: string; port?: string; interval?: string };

const maskUrl = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.searchParams.size > 0) u.searchParams.forEach((_, key) => u.searchParams.set(key, '***'));
    return u.href;
  } catch {
    return url.replace(/([?&](?:token|key|pass|id|service)=)[^&]+/gi, '$1***');
  }
};

const BUILTIN_GROUP_MEMBERS = new Set(['🎯 直连', '♻️ 自动选择', '🚀 节点选择', '🌍 国外网站', '🇨🇳 国内网站', '🛑 广告拦截', 'DIRECT', 'REJECT', 'PASS']);

const runConvert = async (url: string, output: string, rules: string, merge?: string): Promise<void> => {
  console.log(`🔗 ${t('fetching')} ${maskUrl(url)}`);
  const { yaml, config, nodes } = await convert(url, { rules: rules as 'builtin' | 'external' });
  console.log(`✅ ${t('parsed', { count: nodes.length })}`);
  nodes.forEach((n, i) => console.log(`   ${t('node_list', { index: i + 1, type: n.type, server: n.server, port: n.port, name: n.name })}`));

  const newNodeNames = new Set(nodes.map((n) => n.name));

  if (merge && existsSync(merge)) {
    const existingRaw = readFileSync(merge, 'utf-8');
    const existing = load(existingRaw) as Record<string, unknown>;
    existing.proxies = nodes as unknown as unknown[];
    if (Array.isArray(existing['proxy-groups'])) {
      for (const group of existing['proxy-groups'] as Record<string, unknown>[]) {
        if (Array.isArray(group.proxies)) {
          group.proxies = (group.proxies as string[]).map((name) => {
            if (BUILTIN_GROUP_MEMBERS.has(name)) return name;
            if (newNodeNames.has(name)) return name;
            console.warn(`  ⚠️  ${t('group_fallback', { group: group.name as string, name, fallback: nodes[0]?.name ?? name })}`);
            return nodes[0]?.name ?? name;
          });
        }
      }
    }
    const mergedYaml = dump(existing, { indent: 2, lineWidth: -1, noRefs: true });
    writeFileSync(merge, mergedYaml, 'utf-8');
    console.log(`\n📝 ${t('merged', { path: merge })}`);
  } else {
    const outputPath = output || join(process.cwd(), 'clash-config.yaml');
    const outDir = dirname(outputPath);
    if (outDir) mkdirSync(outDir, { recursive: true });
    writeFileSync(outputPath, yaml, 'utf-8');
    console.log(`\n✅ ${t('config_written', { path: outputPath })}`);
    console.log(`📊 ${t('config_summary', { nodes: nodes.length, groups: config['proxy-groups'].length })}`);
  }
};

const main = async (): Promise<void> => {
  if (opts.port) {
    if (!opts.url) { console.error(`❌ ${t('mode_requires_url')}`); program.help(); process.exit(1); }
    const port = parseInt(opts.port, 10) || 25500;
    const srv = await startServer({ url: opts.url, port, intervalMin: parseInt(opts.interval || '60', 10), ruleMode: opts.rules as 'builtin' | 'external' });
    const shutdown = (): void => {
      console.log(`\n🛑 ${t('shutting_down')}`);
      srv.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else if (opts.url) {
    await runConvert(opts.url!, opts.output, opts.rules, opts.merge);
  } else {
    program.help();
  }
};

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
